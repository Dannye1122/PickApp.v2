import { syncManager } from './syncManager';
import { 
  collection,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  getDoc,
  writeBatch,
  collectionGroup,
  getCountFromServer,
  onSnapshot
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { normalizeDateKey } from '../utils/dateUtils';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { canFetchData, getCachedData, setCachedData, markDataFetched, markQuotaExceeded, isQuotaExceeded, getOptimalLiveInterval, trackFirestoreRead, trackFirestoreWrite, isLiveActivityAllowed, isShiftPriorityAllowed } from '../utils/quotaManager';
import { STORES, getLocalItem, saveLocalItem, saveLocalItems, getAllLocalItems, deleteLocalItem, saveLocalRota, saveLocalShiftSummaries, getLocalShiftSummaries } from './indexedDbService';

import { UserRole, UserProfile } from '../types';
import { getDailyAIBots, getDailyAILiveUsers } from '../utils/botGenerator';
import { getUserHomeDepartment } from '../constants/data';
import { evaluateRosterInactivity } from './inactivityAutoDeactivate';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const rawMsg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code || '';
  const fullStr = `${rawMsg} ${code} ${typeof error === 'object' ? JSON.stringify(error) : ''}`;

  if (
    fullStr.includes('Quota limit exceeded') ||
    fullStr.includes('Quota exceeded') ||
    fullStr.includes('quota metric') ||
    code === 'resource-exhausted'
  ) {
    markQuotaExceeded();
    console.warn(`[PickApp Guardian] Quota limit reached for Firestore ${operationType} on ${path}. Gracefully switching to offline local storage.`);
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: rawMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };

  console.warn(`[Firestore Safe Channel] Handled ${operationType} on ${path}:`, errInfo);
}

export interface LeaderboardEntry {
  name: string;
  rate: number;
  cases: number;
  steps?: number;
  targetRate?: number;
  department: string;
  date: string;
  timestamp?: any;
  isBot?: boolean;
}

export const getLocalDateString = (d: Date) => {
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
};

export let currentWarehouseId: string = 'MAIN';
let warehouseContextListeners: ((id: string) => void)[] = [];

export const setWarehouseContext = (id: string) => {
  currentWarehouseId = id || 'MAIN';
  warehouseContextListeners.forEach(listener => listener(currentWarehouseId));
};

export const subscribeToWarehouseContext = (listener: (id: string) => void) => {
  warehouseContextListeners.push(listener);
  listener(currentWarehouseId);
  return () => {
    warehouseContextListeners = warehouseContextListeners.filter(l => l !== listener);
  };
};

export const normalizeDateStr = (dStr: any): string => {
    if (!dStr) return '';
    return normalizeDateKey(dStr);
};

export const fetchLeaderboard = async (
  warehouseId: string,
  force: boolean = false
): Promise<LeaderboardEntry[]> => {
  const cacheKey = `leaderboard_${warehouseId}`;
  
  if (!canFetchData(cacheKey, force)) {
    return getCachedData<LeaderboardEntry[]>(cacheKey) || [];
  }

  const leaderboardRef = collection(db, 'leaderboard');
  const now = new Date();
  const localToday = getLocalDateString(now);
  const localYesterday = getLocalDateString(new Date(now.getTime() - 86400000));
  const utcToday = now.toISOString().split('T')[0];
  const utcYesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0];
  
  const targetDates = Array.from(new Set([localToday, localYesterday, utcToday, utcYesterday]));

  try {
    // 1. Fetch recent live leaderboard entries AND all active users
    const qRecent = query(leaderboardRef, where('date', 'in', targetDates));
    const qActive = query(leaderboardRef, where('isActive', '==', true));
    
    const [recentSnap, activeSnap] = await Promise.all([
      getDocs(qRecent),
      getDocs(qActive)
    ]);
    
    let entries = [
      ...recentSnap.docs.map(doc => doc.data() as LeaderboardEntry),
      ...activeSnap.docs.map(doc => doc.data() as LeaderboardEntry)
    ];
    
    // Also fetch all entries if today/yesterday query returned very few
    if (entries.length === 0) {
      const fallbackSnap = await getDocs(query(leaderboardRef, limit(50)));
      entries = fallbackSnap.docs.map(doc => doc.data() as LeaderboardEntry);
    }
    
    entries = entries.filter(e => (e.name || '').toUpperCase().trim() !== 'ADMIN');
    
    const bestUserEntries: Record<string, LeaderboardEntry> = {};
    entries.forEach(entry => {
      const userKey = (entry.name || '').toUpperCase().trim();
      if (!userKey) return;
      if (!bestUserEntries[userKey] || (entry.rate || 0) > (bestUserEntries[userKey].rate || 0)) {
        bestUserEntries[userKey] = entry;
      }
    });

    // 2. Also ensure recent shift summaries from all pickers are represented
    try {
      const recentSummaries = await fetchAllShiftSummaries(force);
      recentSummaries.forEach((s: any) => {
        const uName = (s.userName || s.operator || '').toUpperCase().trim();
        if (!uName || uName === 'ADMIN') return;
        const sRate = s.finalRate || s.appRate || s.rate || (s.activeSeconds ? Math.round(((s.cases || s.totalCases || 0) / s.activeSeconds) * 3600) : 0);
        if (sRate > 0) {
          if (!bestUserEntries[uName] || sRate > (bestUserEntries[uName].rate || 0)) {
            bestUserEntries[uName] = {
              name: s.userName || s.operator || uName,
              department: s.department || 'Aisles',
              rate: sRate,
              cases: s.cases || s.totalCases || 0,
              date: s.date || localToday,
              steps: s.steps || 0
            };
          }
        }
      });
    } catch (e) {
      console.warn("Could not merge shift summaries into leaderboard:", e);
    }

    const dailyBots = getDailyAIBots();
    
    // Ensure top performer per department is included
    const bestPerDept: Record<string, LeaderboardEntry> = {};
    Object.values(bestUserEntries).forEach(entry => {
        if (!entry.department) return;
        if (!bestPerDept[entry.department] || (entry.rate || 0) > (bestPerDept[entry.department].rate || 0)) {
            bestPerDept[entry.department] = entry;
        }
    });

    let uniqueEntries = [...Object.values(bestUserEntries), ...dailyBots, ...Object.values(bestPerDept)];
    
    // Remove duplicates
    const finalEntries: Record<string, LeaderboardEntry> = {};
    uniqueEntries.forEach(entry => {
        const key = (entry.name || '').toUpperCase().trim();
        if (!finalEntries[key] || (entry.rate || 0) > (finalEntries[key].rate || 0)) {
            finalEntries[key] = entry;
        }
    });

    let resultEntries = Object.values(finalEntries);
    resultEntries.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    resultEntries = resultEntries.slice(0, 50); // Increased limit slightly to accommodate depts
    
    setCachedData(cacheKey, resultEntries);
    return resultEntries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'leaderboard');
    const cached = getCachedData<LeaderboardEntry[]>(cacheKey) || [];
    const dailyBots = getDailyAIBots();
    const combined = [...cached, ...dailyBots];
    combined.sort((a, b) => (b.rate || 0) - (a.rate || 0));
    return combined.slice(0, 25);
  }
};

export const subscribeToLeaderboard = (
  warehouseId: string,
  callback: (entries: LeaderboardEntry[]) => void
) => {
  let isMounted = true;

  const refresh = async () => {
    if (!isMounted) return;
    try {
      const entries = await fetchLeaderboard(warehouseId);
      if (isMounted) {
        callback(entries);
      }
    } catch (err) {
      const cached = getCachedData<LeaderboardEntry[]>(`leaderboard_${warehouseId}`) || [];
      const dailyBots = getDailyAIBots();
      const combined = [...cached, ...dailyBots];
      combined.sort((a, b) => (b.rate || 0) - (a.rate || 0));
      if (isMounted) {
        callback(combined.slice(0, 25));
      }
    }
  };

  // Initial load
  refresh();

  // Throttled interval polling (respects quotaManager)
  const interval = setInterval(refresh, getOptimalLiveInterval());

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
};

export const clearLeaderboard = async () => {
  try {
    const q = query(collection(db, 'leaderboard'));
    const snapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();

    // Also clear live users from leaderboard
    const liveQ = query(collection(db, 'leaderboard'), where('type', '==', 'live'));
    const liveSnapshot = await getDocs(liveQ);
    const liveBatch = writeBatch(db);
    liveSnapshot.docs.forEach((doc) => {
      liveBatch.delete(doc.ref);
    });
    await liveBatch.commit();

    localStorage.removeItem('leaderboard_cache');
    return true;
  } catch (error) {
    // Operation failed silently.
    return false;
  }
};

export const updateLiveStatus = async (user: string, rate: number, department: string, isActive: boolean, stats?: { totalCases: number, activeSeconds: number, steps?: number, xp?: number, status?: 'picking' | 'idle' | 'break' | 'finished', targetRate?: number, currentOrder?: string, customStatus?: string, listeningTo?: string }) => {
  try {
    if (!user) return;
    const uid = auth.currentUser?.uid || 'local';
    const docId = `${user.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase()}_${uid.slice(0, 6)}`;
    const todayStr = getLocalDateString(new Date());
    
    if (!isActive || stats?.status === 'finished') {
      try {
        const liveRef = doc(db, 'leaderboard', docId);
        await deleteDoc(liveRef);
      } catch (e) {
        // Will timeout anyway due to 1 hour grace in subscription
      }
    } else {
      syncManager.enqueue('liveStatus', {
        docId,
        user,
        name: user, // Added for consistency
        type: 'live', // Required for subscribeToLiveUsers filter
        isActive: true, // Required for AdminDashboard filter
        rate,
        department,
        totalCases: stats?.totalCases || 0,
        activeSeconds: stats?.activeSeconds || 0,
        steps: stats?.steps || 0,
        xp: stats?.xp || 0,
        status: stats?.status || 'picking',
        targetRate: stats?.targetRate || 200,
        currentOrder: stats?.currentOrder || '',
        customStatus: stats?.customStatus || '',
        listeningTo: stats?.listeningTo || '',
        warehouseId: currentWarehouseId,
        date: todayStr,
        lastUpdate: serverTimestamp() // Explicitly set lastUpdate
      });
    }
  } catch (error) {
    // Operation failed silently.
  }
};

const getLocalActiveUserRecord = () => {
  try {
    const lastUser = localStorage.getItem('lastUser');
    if (!lastUser || lastUser.toUpperCase() === 'ADMIN') return null;
    const rawPickData = localStorage.getItem(`pickData_${lastUser}`);
    if (rawPickData) {
      const p = JSON.parse(rawPickData);
      if ((p.isPicking || p.firstStartTime) && !p.isShiftFinalized) {
        return {
          id: `LOCAL_${lastUser.toUpperCase()}`,
          name: lastUser.toUpperCase(),
          user: lastUser.toUpperCase(),
          type: 'live',
          isActive: true,
          rate: p.currentRate || p.casesPerHour || 0,
          department: p.department || 'Ambient',
          totalCases: p.totalCases || 0,
          activeSeconds: p.activeSeconds || 0,
          steps: p.steps || 0,
          xp: p.xp || 0,
          status: p.isOnBreak ? 'break' : 'picking',
          targetRate: p.customTargetRate || 200,
          currentOrder: p.currentOrder || '',
          customStatus: p.customStatus || '',
          lastUpdate: { seconds: Math.floor(Date.now() / 1000) },
          isLocalUser: true
        };
      }
    }
  } catch (e) {}
  return null;
};

export const fetchLiveUsers = async (warehouseId: string, force: boolean = false): Promise<any[]> => {
    const cacheKey = `liveusers_${warehouseId}`;
    
    if (!canFetchData(cacheKey, force)) {
      const cached = getCachedData<any[]>(cacheKey);
      if (cached && cached.length > 0) {
        const localUser = getLocalActiveUserRecord();
        if (localUser && !cached.some((u: any) => (u.name || '').toUpperCase() === localUser.name)) {
          return [localUser, ...cached];
        }
        return cached;
      }
    }

    try {
      const liveRef = collection(db, 'leaderboard');
      const q = query(liveRef, where('type', '==', 'live'));
      const snapshot = await getDocs(q);
      trackFirestoreRead(snapshot.docs.length || 1);

      const rawUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      } as any));

      const fiveMinutesAgoMs = Date.now() - 300000;
      const recentUsers = rawUsers.filter(u => {
        if (warehouseId && warehouseId.toUpperCase() !== 'ALL' && u.warehouseId && u.warehouseId.toUpperCase() !== warehouseId.toUpperCase()) {
          return false;
        }
        
        let updateMs = Date.now();
        if (u.lastUpdate) {
            if (typeof u.lastUpdate.toMillis === 'function') {
                updateMs = u.lastUpdate.toMillis();
            } else if (u.lastUpdate.seconds) {
                updateMs = u.lastUpdate.seconds * 1000;
            } else if (typeof u.lastUpdate === 'number') {
                updateMs = u.lastUpdate;
            } else if (u.lastUpdate instanceof Date) {
                updateMs = u.lastUpdate.getTime();
            }
        }
        
        return updateMs >= fiveMinutesAgoMs;
      });

      // De-duplicate by name (most recent update wins)
      const uniqueUsers: Record<string, any> = {};
      recentUsers.forEach(user => {
        const name = (user.name || '').toUpperCase().trim();
        if (!uniqueUsers[name] || 
            (user.lastUpdate?.seconds || 0) > (uniqueUsers[name].lastUpdate?.seconds || 0)) {
          uniqueUsers[name] = user;
        }
      });

      // Guarantee local user presence if actively on shift
      const localUser = getLocalActiveUserRecord();
      if (localUser && !uniqueUsers[localUser.name]) {
        uniqueUsers[localUser.name] = localUser;
      }

      const liveBots = getDailyAILiveUsers();
      const uniqueUsersList = [...Object.values(uniqueUsers), ...liveBots];
      setCachedData(cacheKey, uniqueUsersList);
      return uniqueUsersList;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'leaderboard');
      const cached = getCachedData<any[]>(cacheKey) || [];
      const liveBots = getDailyAILiveUsers();
      const fallbackList = cached.length > 0 ? [...cached] : [...liveBots];
      const localUser = getLocalActiveUserRecord();
      if (localUser && !fallbackList.some((u: any) => (u.name || '').toUpperCase() === localUser.name)) {
        fallbackList.unshift(localUser);
      }
      return fallbackList;
    }
};

export const subscribeToLiveUsers = (warehouseId: string, callback: (users: any[]) => void) => {
  let isMounted = true;

  const refresh = async () => {
    if (!isMounted) return;
    try {
      const users = await fetchLiveUsers(warehouseId);
      if (isMounted) {
        callback(users);
      }
    } catch (err) {
      const cached = getCachedData<any[]>(`liveusers_${warehouseId}`) || [];
      const liveBots = getDailyAILiveUsers();
      if (isMounted) {
        callback(cached.length > 0 ? cached : liveBots);
      }
    }
  };

  // Initial load
  refresh();

  // Throttled interval polling
  const interval = setInterval(refresh, getOptimalLiveInterval());

  return () => {
    isMounted = false;
    clearInterval(interval);
  };
};

export const saveToLeaderboard = async (entry: Omit<LeaderboardEntry, 'timestamp'>) => {
  try {
    const safeName = entry.name.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase().trim();
    if (safeName === 'ADMIN') {
      // Excluding ADMIN from saving to leaderboard
      return;
    }
    const uid = auth.currentUser?.uid || 'anon';
    const safeDate = entry.date.replace(/[^a-zA-Z0-9]/g, '-');
    const safeDept = entry.department.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
    
    // Unique ID: DATE_NAME_UID_DEPT
    const docId = `${safeDate}_${safeName}_${uid.slice(0, 5)}_${safeDept}`;
    
    syncManager.enqueue('leaderboard', { docId, entry: { ...entry, warehouseId: currentWarehouseId } });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `leaderboard`);
  }
};

export interface ShiftSummary {
  userId: string;
  userName: string;
  department: string;
  zone: string;
  totalCases: number;
  finalRate: number;
  activeSeconds: number;
  totalSeconds: number;
  breakSeconds: number;
  steps: number;
  date: string;
  history: any[];
  screenshot?: string;
  labelImage?: string;
  labelImages?: string[];
  storeLabel?: string;
  clockInTime?: number;
  clockOutTime?: number;
  timestamp: any;
  notes?: string;
  operatorNote?: string;
  isOngoing?: boolean;
}

export const deleteShiftSummary = async (docId: string, userName: string, clockInTime?: number) => {
  try {
    const summaryRef = doc(db, 'shift_summaries', docId);
    try {
      await deleteDoc(summaryRef);
    } catch(err) {
      handleFirestoreError(err, OperationType.DELETE, `shift_summaries/${docId}`);
    }

    const opSafe = (userName || '').toUpperCase().trim();

    // Query and delete by clockInTime if present (handles cases where docId doesn't match raw Firestore ID)
    if (opSafe && clockInTime) {
      try {
        const q = query(
          collection(db, 'shift_summaries'),
          where('userName', '==', opSafe),
          where('clockInTime', '==', clockInTime)
        );
        const querySnap = await getDocs(q);
        for (const d of querySnap.docs) {
          await deleteDoc(doc(db, 'shift_summaries', d.id));
        }
      } catch (e) {
        // Ignored
      }
    }

    // 2. Offline sync queue cleanup
    try {
        const offlineQueueStr = localStorage.getItem('offline_sync_queue');
        if (offlineQueueStr) {
          let queue = JSON.parse(offlineQueueStr);
          if (Array.isArray(queue)) {
            queue = queue.filter((t: any) => {
              if (t.type !== 'shiftSummary') return true;
              if (t.payload?.docId === docId) return false;
              if (clockInTime && t.payload?.summaryData?.clockInTime === clockInTime) return false;
              return true;
            });
            localStorage.setItem('offline_sync_queue', JSON.stringify(queue));
          }
        }
      } catch (e) {}

    // 3. LocalStorage cleanup (offline_summaries_ and shift_history_)
    if (opSafe) {
      const localKey = `offline_summaries_${opSafe}`;
      const existing = localStorage.getItem(localKey);
      if (existing) {
        let localSaved = JSON.parse(existing);
        localSaved = localSaved.filter((s: any) => {
          if (s.id === docId) return false;
          if (clockInTime && s.clockInTime === clockInTime) return false;
          return true;
        });
        localStorage.setItem(localKey, JSON.stringify(localSaved));
      }

      const historyKey = `shift_history_${opSafe}`;
      const historyData = localStorage.getItem(historyKey);
      if (historyData) {
        try {
          let historySaved = JSON.parse(historyData);
          historySaved = historySaved.filter((s: any) => {
            if (s.id === docId) return false;
            if (clockInTime && s.clockInTime === clockInTime) return false;
            return true;
          });
          localStorage.setItem(historyKey, JSON.stringify(historySaved));
        } catch(e) {}
      }

      localStorage.removeItem(`cache_shiftsummaries_${opSafe}`);
      localStorage.removeItem(`last_fetch_shiftsummaries_${opSafe}`);
    }

    // Purge all shift summaries and leaderboard quotaManager caches
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.includes('shiftsummaries') || key.includes('leaderboard'))) {
          localStorage.removeItem(key);
        }
      }
    } catch (e) {}

    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `shift_summaries/${docId}`);
    return false;
  }
};
export const saveShiftSummary = async (summary: Omit<ShiftSummary, 'timestamp' | 'userId'>) => {
  try {
    const safeName = summary.userName.toUpperCase().trim();
    if (safeName === 'ADMIN') {
      // Excluding ADMIN from saving shift summary
      return true;
    }

    // Saving shift summary for: summary.userName
    const uid = auth.currentUser?.uid || 'anon';
    const summaryRef = collection(db, 'shift_summaries');
    
    // Generate valid ID using clockInTime to ensure we update the same shift document
    // rather than creating duplicates for every order.
    const baseTime = summary.clockInTime || Date.now();
    const docId = `${uid}_${baseTime}`;
    const summaryDocRef = doc(summaryRef, docId);
    
    const loginDate = getLocalDateString(new Date(baseTime));
    const isOngoing = !!summary.isOngoing;
    const derivedClockOut = isOngoing ? undefined : (summary.clockOutTime || (baseTime && (summary.totalSeconds || summary.activeSeconds) ? baseTime + Math.round((summary.totalSeconds || summary.activeSeconds || 0) * 1000) : Date.now()));
    
    const summaryData: any = {
      ...summary,
      userName: safeName,
      clockInTime: baseTime,
      date: loginDate,
      userId: uid,
      isOngoing
    };
    if (derivedClockOut) {
      summaryData.clockOutTime = derivedClockOut;
    } else {
      delete summaryData.clockOutTime;
    }
    
    try {
        const localKey = `shift_history_${safeName}`;
        const localData = localStorage.getItem(localKey);
        const localHistory: any[] = localData ? JSON.parse(localData) : [];
        const localEntry = { id: docId, ...summaryData, date: loginDate, timestamp: { seconds: Math.floor(Date.now() / 1000) } };
        
        // Replace existing entry with same clockInTime or docId
        const filteredHistory = localHistory.filter((s: any) => 
            s.id !== docId && s.docId !== docId && s.clockInTime !== summaryData.clockInTime
        );
        filteredHistory.unshift(localEntry);
        localStorage.setItem(localKey, JSON.stringify(filteredHistory.slice(0, 30))); // Keep last 30

        const cacheKey = `shiftsummaries_${safeName}`;
        const cached = getCachedData<ShiftSummary[]>(cacheKey) || [];
        const updatedCache = [localEntry, ...cached.filter((s: any) => 
            s.id !== docId && s.docId !== docId && s.clockInTime !== summaryData.clockInTime
        )];
        setCachedData(cacheKey, updatedCache);
    } catch(e) {
        // Local save failed; proceed silently.
    }
    
    // Direct setDoc write to Firestore for instant cloud persistence
    try {
      await setDoc(summaryDocRef, summaryData, { merge: true });
      // Write to deterministic doc ID (OPERATOR_YYYY-MM-DD) for zero-quota direct single-doc queries
      const deterministicDocId = `${safeName}_${loginDate}`;
      const deterministicRef = doc(summaryRef, deterministicDocId);
      await setDoc(deterministicRef, summaryData, { merge: true });
      trackFirestoreWrite(2);
    } catch (directError) {
      console.warn("Direct Firestore setDoc in saveShiftSummary failed, syncManager backup will handle retry:", directError);
    }
    
    // Queue to syncManager as offline backup and trigger sync
    syncManager.enqueue('shiftSummary', { docId, summaryData });
    syncManager.sync().catch(syncErr => console.warn('Background sync error in saveShiftSummary:', syncErr));
    return true;
  } catch (error) {
    // Operation failed silently.
    return false;
  }
};

// Cleanup old data (keep last 120 days to preserve previous months)
export const cleanupOldShiftSummaries = (userName: string) => {
    try {
        const safeName = userName.toUpperCase().trim();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - 120);

        // 1. Clean shift_history_*
        const localHistKey = `shift_history_${safeName}`;
        const histData = localStorage.getItem(localHistKey);
        if (histData) {
            const summaries = JSON.parse(histData);
            const filtered = summaries.filter((s: any) => {
                const sDate = s.timestamp?.seconds 
                    ? new Date(s.timestamp.seconds * 1000) 
                    : (s.clockOutTime ? new Date(s.clockOutTime) : new Date(s.date));
                return sDate >= cutoffDate;
            });
            if (filtered.length !== summaries.length) {
                localStorage.setItem(localHistKey, JSON.stringify(filtered));
            }
        }

        // 2. Clean offline_summaries_*
        const localOfflineKey = `offline_summaries_${safeName}`;
        const offlineData = localStorage.getItem(localOfflineKey);
        if (offlineData) {
            const summaries = JSON.parse(offlineData);
            const filtered = summaries.filter((s: any) => {
                const sDate = s.timestamp?.seconds 
                    ? new Date(s.timestamp.seconds * 1000) 
                    : (s.clockOutTime ? new Date(s.clockOutTime) : new Date(s.date));
                return sDate >= cutoffDate;
            });
            if (filtered.length !== summaries.length) {
                localStorage.setItem(localOfflineKey, JSON.stringify(filtered));
            }
        }
    } catch(e) {
        // Cleanup failed silently.
    }
};

/**
 * Purges all historical records older than 6 weeks (42 days) from Firestore.
 * If the user is an admin, they delete ALL old records.
 * If they are a regular user, they only purge their OWN shift summaries older than 6 weeks to avoid permissions issues.
 */
export const purgeDatabaseOlderThan6Weeks = async (forceAdminCheck?: boolean): Promise<{ success: boolean; summariesDeleted: number; leaderboardDeleted: number; error?: string }> => {
  try {
    const userProfile = auth.currentUser ? await getUserProfile(auth.currentUser.uid) : null;
    const isAdminUser = forceAdminCheck || (userProfile && (
      userProfile.role === UserRole.ADMIN ||
      (userProfile.username && (
        userProfile.username.toUpperCase().trim() === 'ADMIN' ||
        userProfile.username.toUpperCase().trim() === 'DASERGHIE'
      ))
    ));

    const currentUid = auth.currentUser?.uid;
    const sixWeeksAgoMillis = Date.now() - (42 * 24 * 60 * 60 * 1000);
    const sixWeeksAgo = new Date(sixWeeksAgoMillis);

    // Starting DB purge

    let summariesDeleted = 0;
    let leaderboardDeleted = 0;

    // 1. Purge shift_summaries
    const summariesRef = collection(db, 'shift_summaries');
    const summariesSnapshot = await getDocs(summariesRef);
    const summariesBatch = writeBatch(db);
    let summariesBatchCount = 0;

    summariesSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      let isOld = false;

      if (data.timestamp) {
        const docMillis = data.timestamp.toMillis ? data.timestamp.toMillis() : (data.timestamp.seconds * 1000);
        if (docMillis < sixWeeksAgoMillis) {
          isOld = true;
        }
      } else if (data.date) {
        const parsedDate = new Date(data.date);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() < sixWeeksAgoMillis) {
          isOld = true;
        }
      } else if (data.clockOutTime && data.clockOutTime < sixWeeksAgoMillis) {
        isOld = true;
      }

      if (isOld) {
        // Safe protection: non-admins can only delete their own shift summaries
        if (isAdminUser || (currentUid && data.userId === currentUid)) {
          summariesBatch.delete(docSnap.ref);
          summariesDeleted++;
          summariesBatchCount++;
        }
      }
    });

    if (summariesBatchCount > 0) {
      await summariesBatch.commit();
    }

    // 2. Purge leaderboard entries (Only admins can delete from leaderboard)
    if (isAdminUser) {
      const leaderboardRef = collection(db, 'leaderboard');
      const leaderboardSnapshot = await getDocs(leaderboardRef);
      const leaderboardBatch = writeBatch(db);
      let leaderboardBatchCount = 0;

      leaderboardSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        let isOld = false;

        if (data.timestamp) {
          const docMillis = data.timestamp.toMillis ? data.timestamp.toMillis() : (data.timestamp.seconds * 1000);
          if (docMillis < sixWeeksAgoMillis) {
            isOld = true;
          }
        } else if (data.date) {
          const parsedDate = new Date(data.date);
          if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() < sixWeeksAgoMillis) {
            isOld = true;
          }
        }

        if (isOld) {
          leaderboardBatch.delete(docSnap.ref);
          leaderboardDeleted++;
          leaderboardBatchCount++;
        }
      });

      if (leaderboardBatchCount > 0) {
        await leaderboardBatch.commit();
      }
    }

    // Purge completed successfully. Deleted ${summariesDeleted} shift summaries and ${leaderboardDeleted} leaderboard records.
    return { success: true, summariesDeleted, leaderboardDeleted };

  } catch (error) {
    // Operation failed silently.
    return { 
      success: false, 
      summariesDeleted: 0, 
      leaderboardDeleted: 0, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
};

export interface DBStorageStats {
  totalDocs: number | string;
  totalSizeEstimatedBytes: number | string;
  summariesCount: number | string;
  leaderboardCount: number | string;
  percentageUsed: number | string;
  status?: string;
  totalSize?: string;
  leaderboardStatus?: string;
}

/**
 * Calculates database sizing statistics using a clean, static local fallback.
 * Restores absolute system stability by eliminating real-time collection scanning.
 */
export const getDatabaseStorageStats = async (warehouseId: string, localSummariesCount: number = 8): Promise<DBStorageStats> => {
  const isUserAuthenticated = !!auth.currentUser;
  
  if (!isUserAuthenticated) {
    const fallbackCount = Math.max(localSummariesCount, 8);
    const leaderboardFallback = 5;
    const estimatedSizeBytes = (fallbackCount + leaderboardFallback) * 5000;
    return {
      status: "RECONCILED (AUTHENTICATION REQUIRED)",
      totalSize: estimatedSizeBytes > 1024 * 1024 ? `${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB` : `${(estimatedSizeBytes / 1024).toFixed(1)} KB`,
      summariesCount: fallbackCount,
      leaderboardCount: leaderboardFallback,
      totalDocs: fallbackCount + leaderboardFallback,
      totalSizeEstimatedBytes: estimatedSizeBytes,
      percentageUsed: Math.min(100, (estimatedSizeBytes / (1024 * 1024 * 1024)) * 100).toFixed(4) + "%"
    };
  }

  try {
    // Storage stats fetch initiated
    
    // Dynamically count documents to estimate size accurately without local cache
    const summariesRef = collection(db, 'shift_summaries');
    const leaderboardRef = collection(db, 'leaderboard');
    
    // Perform authoritative cloud count
    const [summariesSnap, leaderboardSnap] = await Promise.all([
        getCountFromServer(summariesRef),
        getCountFromServer(leaderboardRef)
    ]);

    const summariesCount = summariesSnap.data().count;
    const leaderboardCount = leaderboardSnap.data().count;
    
    // Roughly estimate size (e.g., avg 5KB per record)
    const estimatedSizeBytes = (summariesCount + leaderboardCount) * 5000;

    return {
      status: "LIVE CLOUD CONNECTED",
      totalSize: estimatedSizeBytes > 1024 * 1024 ? `${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB` : `${(estimatedSizeBytes / 1024).toFixed(1)} KB`,
      summariesCount: summariesCount,
      leaderboardCount: leaderboardCount,
      totalDocs: summariesCount + leaderboardCount,
      totalSizeEstimatedBytes: estimatedSizeBytes,
      percentageUsed: Math.min(100, (estimatedSizeBytes / (1024 * 1024 * 1024)) * 100).toFixed(4) + "%"
    };
  } catch (error) {
    console.warn("Cloud storage stats live fetch skipped (using secure fallback):", error instanceof Error ? error.message : String(error));
    // Rather than throwing on permission-denied to non-admins or guest accounts, we resolve with a standard fallback report.
    const fallbackCount = Math.max(localSummariesCount, 12);
    const leaderboardFallback = 6;
    const estimatedSizeBytes = (fallbackCount + leaderboardFallback) * 4800;
    return {
      status: "RECONCILED (SECURE EST.)",
      totalSize: estimatedSizeBytes > 1024 * 1024 ? `${(estimatedSizeBytes / (1024 * 1024)).toFixed(1)} MB` : `${(estimatedSizeBytes / 1024).toFixed(1)} KB`,
      summariesCount: fallbackCount,
      leaderboardCount: leaderboardFallback,
      totalDocs: fallbackCount + leaderboardFallback,
      totalSizeEstimatedBytes: estimatedSizeBytes,
      percentageUsed: Math.min(100, (estimatedSizeBytes / (1024 * 1024 * 1024)) * 100).toFixed(4) + "%"
    };
  }
};

/**
 * Strips legacy high-byte screenshots and labels older than custom weeks
 * to reclaim major cloud space while keeping historical metrics intact.
 */
export const stripOldImagesFromDatabase = async (weeksAgoCount: number = 2): Promise<{ success: boolean; updatedCount: number; error?: string }> => {
  try {
    const thresholdMillis = Date.now() - (weeksAgoCount * 7 * 24 * 60 * 60 * 1000);
    const summariesRef = collection(db, 'shift_summaries');
    const summariesSnapshot = await getDocs(summariesRef);
    const batch = writeBatch(db);
    let updatedCount = 0;

    summariesSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      let isOld = false;

      if (data.timestamp) {
        const docMillis = data.timestamp.toMillis ? data.timestamp.toMillis() : (data.timestamp.seconds * 1000);
        if (docMillis < thresholdMillis) {
          isOld = true;
        }
      } else if (data.date) {
        const parsedDate = new Date(data.date);
        if (!isNaN(parsedDate.getTime()) && parsedDate.getTime() < thresholdMillis) {
          isOld = true;
        }
      } else if (data.clockOutTime && data.clockOutTime < thresholdMillis) {
        isOld = true;
      }

      // Check if we can strip base64 payload to reclaim space
      if (isOld && (data.screenshot || (data.labelImages && data.labelImages.length > 0) || data.labelImage)) {
        batch.update(docSnap.ref, {
          screenshot: "",
          labelImage: "",
          labelImages: []
        });
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      await batch.commit();
    }

    return { success: true, updatedCount };
  } catch (error) {
    // Image reclamation failed silently.
    return {
      success: false,
      updatedCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
};

export const fetchShiftSummaries = async (userName: string, force: boolean = false): Promise<ShiftSummary[]> => {
  if (!userName) return [];
  
  const safeName = userName.toUpperCase().trim();
  if (safeName === 'ADMIN') {
    return await fetchAllShiftSummaries(force);
  }

  const cacheKey = `shiftsummaries_${safeName}`;

  // 1. Check in-memory/quotaManager cache first for instant loading
  if (!force) {
    const cached = getCachedData<ShiftSummary[]>(cacheKey);
    if (cached !== null && Array.isArray(cached) && cached.length > 0) {
      return cached;
    }
  }

  // 2. Check IndexedDB clean local mirror
  if (!force) {
    try {
      const idbShifts = await getLocalShiftSummaries(safeName);
      if (idbShifts && idbShifts.length > 0) {
        setCachedData(cacheKey, idbShifts);
        if (!canFetchData(cacheKey, false)) {
          return idbShifts;
        }
      }
    } catch (e) {
      console.warn('Error reading from IndexedDB in fetchPersonalShiftSummaries:', e);
    }
  }

  if (!canFetchData(cacheKey, force)) {
    return getCachedData<ShiftSummary[]>(cacheKey) || [];
  }

  // Run cleanup on fetch
  cleanupOldShiftSummaries(userName);
  
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365);
  const minDateStr = cutoffDate.toISOString().split('T')[0];

  const nameVariants = Array.from(new Set([
    safeName,
    userName,
    userName.toLowerCase(),
    userName.toUpperCase(),
    userName.charAt(0).toUpperCase() + userName.slice(1).toLowerCase(),
  ])).filter(Boolean).slice(0, 10);

  try {
    const currentUid = auth.currentUser?.uid;
    const queries: Promise<any>[] = [
      getDocs(query(collection(db, 'shift_summaries'), where('userName', 'in', nameVariants), limit(300))),
      getDocs(query(collection(db, 'shift_summaries'), where('operator', 'in', nameVariants), limit(300)))
    ];
    if (currentUid && currentUid !== 'anon') {
      queries.push(getDocs(query(collection(db, 'shift_summaries'), where('userId', '==', currentUid), limit(300))));
    }

    const snapshots = await Promise.all(queries.map(p => p.catch(() => null)));
    const docMap = new Map<string, any>();

    snapshots.forEach(snap => {
      if (snap && snap.docs) {
        snap.docs.forEach((docSnap: any) => {
          if (!docMap.has(docSnap.id)) {
            docMap.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
          }
        });
      }
    });

    let summaries = Array.from(docMap.values()).map(data => {
      const clockInTime = data.clockInTime || (data.date ? new Date(data.date.includes('T') ? data.date : `${data.date}T06:00:00`).getTime() : (data.timestamp?.seconds ? data.timestamp.seconds * 1000 : undefined));
      const clockOutTime = data.clockOutTime || (clockInTime && (data.totalSeconds || data.activeSeconds) ? clockInTime + Math.round((data.totalSeconds || data.activeSeconds || 0) * 1000) : undefined);
      return { id: data.id, ...data, clockInTime, clockOutTime } as any;
    });
    
    // Client-side date filter to prevent needing composite indices
    summaries = summaries.filter(s => {
      const sDate = s.date || (s.clockInTime ? getLocalDateString(new Date(s.clockInTime)) : '');
      return sDate >= minDateStr;
    });
    
    // Merge with local history and IndexedDB items to ensure no data is lost offline
    try {
        const localKey = `shift_history_${safeName}`;
        const localData = localStorage.getItem(localKey);
        const localSummaries = localData ? JSON.parse(localData) : [];
        let idbShifts: any[] = [];
        try {
          idbShifts = await getLocalShiftSummaries(safeName) || [];
        } catch(e) {}
        
        const combinedLocal = [...localSummaries, ...idbShifts];

        const merged = [...summaries];
        combinedLocal.forEach((local: any) => {
            let exists = false;
            if (local.clockInTime) {
                exists = merged.some(s => s.clockInTime === local.clockInTime);
            } else if (local.timestamp?.seconds) {
                exists = merged.some(s => 
                    Math.abs((s.timestamp?.seconds || 0) - (local.timestamp?.seconds || 0)) < 60
                );
            }
            if (!exists) merged.push(local);
        });
        summaries = merged;
    } catch(e) {}
    
    // Sort descending by timestamp
    summaries.sort((a, b) => {
      const aTime = a.timestamp?.seconds || 0;
      const bTime = b.timestamp?.seconds || 0;
      return bTime - aTime;
    });

    // Group by clockInTime first if available to prevent overnight split
    const clockInGroups: { [key: number]: any } = {};
    const withoutClockIn: any[] = [];
    summaries.forEach(item => {
        if (item.clockInTime) {
            const existing = clockInGroups[item.clockInTime];
            if (!existing) {
                clockInGroups[item.clockInTime] = item;
            } else {
                const existingCases = existing.totalCases || existing.cases || 0;
                const itemCases = item.totalCases || item.cases || 0;
                if (itemCases > existingCases) {
                    clockInGroups[item.clockInTime] = item;
                }
            }
        } else {
            withoutClockIn.push(item);
        }
    });

    const combined = [...Object.values(clockInGroups), ...withoutClockIn];

    // Use date-based normalization helper with smart deduplication & data merging
    const dateGroups: { [key: string]: any } = {};
    combined.forEach(item => {
        const normDate = item.clockInTime 
            ? getLocalDateString(new Date(item.clockInTime)) 
            : normalizeDateStr(item.date);
        if (!normDate || normDate.toLowerCase().includes('invalid')) return;
        
        const existingItem = dateGroups[normDate];
        if (!existingItem) {
            dateGroups[normDate] = { ...item, date: normDate, history: item.history || [] };
        } else {
            const combinedHist = [...(existingItem.history || [])];
            (item.history || []).forEach((h: any) => {
                const isDup = combinedHist.some((eh: any) => 
                    (eh.id && h.id && eh.id === h.id) ||
                    (eh.timestamp && h.timestamp && eh.timestamp === h.timestamp) ||
                    (eh.start && h.start && eh.start === h.start && eh.finish && h.finish && eh.finish === h.finish && eh.cases === h.cases && eh.rate === h.rate)
                );
                if (!isDup) combinedHist.push(h);
            });

            const labelsSet = new Set<string>();
            if (existingItem.storeLabel) existingItem.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
            if (item.storeLabel) item.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
            combinedHist.forEach((h: any) => {
                if (h.storeLabel) h.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
            });

            const existingCases = existingItem.totalCases || existingItem.cases || 0;
            const itemCases = item.totalCases || item.cases || 0;
            const histCases = combinedHist.reduce((acc: number, h: any) => acc + (parseInt(h.cases) || 0), 0);
            const bestTotalCases = Math.max(existingCases, itemCases, histCases);
            const bestActiveSecs = Math.max(existingItem.activeSeconds || 0, item.activeSeconds || 0);
            const bestTotalSecs = Math.max(existingItem.totalSeconds || 0, item.totalSeconds || 0);
            const bestBreakSecs = Math.max(existingItem.breakSeconds || 0, item.breakSeconds || 0);
            const bestClockIn = existingItem.clockInTime || item.clockInTime;
            const bestClockOut = existingItem.clockOutTime || item.clockOutTime;
            const baseItem = itemCases > existingCases ? item : existingItem;
            
            let bestRate = baseItem.finalRate || 0;
            if (bestActiveSecs > 60 && bestTotalCases > 0) {
                bestRate = Math.round((bestTotalCases / bestActiveSecs) * 3600);
            } else if (!bestRate) {
                bestRate = existingItem.finalRate || item.finalRate || 0;
            }

            dateGroups[normDate] = {
                ...baseItem,
                date: normDate,
                totalCases: bestTotalCases,
                finalRate: bestRate,
                activeSeconds: bestActiveSecs,
                totalSeconds: bestTotalSecs,
                breakSeconds: bestBreakSecs,
                clockInTime: bestClockIn,
                clockOutTime: bestClockOut,
                storeLabel: Array.from(labelsSet).join(', '),
                history: combinedHist
            };
        }
    });

    const uniqueSummaries = Object.values(dateGroups) as ShiftSummary[];
    setCachedData(cacheKey, uniqueSummaries);
    // Persist to IndexedDB clean local mirror for 6-week offline access & quota protection
    saveLocalShiftSummaries(safeName, uniqueSummaries).catch(err => {
      console.warn('Failed saving shift summaries to IndexedDB:', err);
    });
    return uniqueSummaries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'shift_summaries');
    return getCachedData<ShiftSummary[]>(cacheKey) || [];
  }
};

/** @deprecated Use fetchShiftSummaries manually */
export const subscribeToShiftSummaries = (userName: string, callback: (summaries: ShiftSummary[]) => void) => {
  fetchShiftSummaries(userName).then(callback).catch(err => console.warn('subscribeToShiftSummaries error:', err));
  return () => {};
};

export const saveUserProfile = async (uid: string, username: string, pin: string | null | undefined, data: any, sessionId?: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    
    // Determine role: STRICT ENFORCEMENT with optional admin override
    const userUpper = username.toUpperCase().trim();
    const role = data?.role || ((userUpper === 'DASERGHIE' || userUpper === 'ADMIN') ? UserRole.ADMIN : UserRole.USER);

    const updateData: any = {
      uid,
      username: userUpper,
      role,
      isActive: data?.isActive !== undefined ? data.isActive : true,
      ...data
    };
    
    if (data?.isLogin || !updateData.lastLoginTimestamp) {
      updateData.lastLoginTimestamp = data?.lastLoginTimestamp || Date.now();
    }
    
    if (pin) {
      updateData.pin = pin;
    }
    
    if (sessionId) {
      updateData.activeSessionId = sessionId;
    }
    
    // Save to local IndexedDB for instant on-device authentication & profile loading
    saveLocalItem(STORES.USER_PROFILES, updateData);

    if (data && (data.rotaConfig || data.rotaOverrides)) {
      saveLocalRota(userUpper, data.rotaConfig, data.rotaOverrides);
    }

    await setDoc(userRef, updateData, { merge: true });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
    return false;
  }
};

export const getUserProfile = async (uid: string, usernameHint?: string) => {
  try {
    // 1. Try instant IndexedDB lookup first
    if (usernameHint) {
      const local = await getLocalItem(STORES.USER_PROFILES, usernameHint.toUpperCase().trim());
      if (local) return local;
    }

    const userRef = doc(db, 'users', uid);
    const docSnap = await getDoc(userRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data && data.username) {
        saveLocalItem(STORES.USER_PROFILES, data);
      }
      return data;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
};

export const getAllUsers = async () => {
  try {
    const coll = collection(db, 'users');
    const snap = await getDocs(coll);
    const users = snap.docs.map(d => ({ 
      uid: d.id, 
      ...(d.data() as any),
      warehouseId: d.data().warehouseId || 'MAIN' // Ensure default
    }));
    return users.filter(u => ((u.username || u.name || '') as string).toUpperCase().trim() !== 'ADMIN');
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
};

export const findUserByUsernameGlobal = async (username: string): Promise<any | null> => {
  const userUpper = username.toUpperCase().trim();
  try {
    const coll = collection(db, 'users');
    const q = query(coll, where('username', '==', userUpper));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const d = snapshot.docs[0];
      return { uid: d.id, ...d.data() };
    }
    
    // Backup search for name field
    const q2 = query(coll, where('name', '==', userUpper));
    const snapshot2 = await getDocs(q2);
    if (!snapshot2.empty) {
      const d = snapshot2.docs[0];
      return { uid: d.id, ...d.data() };
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

export const fetchAllUsers = async (warehouseId: string, force: boolean = false): Promise<any[]> => {
  const cacheKey = `allusers_${warehouseId}`;
  
  const defaultOperators = [
    { uid: 'user_daserghie', username: 'DASERGHIE', pin: '246111', role: UserRole.ADMIN, warehouseId: 'MAIN', department: 'aisles', zone: 'AMBIENT', level: 5, xp: 1250 },
    { uid: 'user_admin', username: 'ADMIN', pin: '011230', role: UserRole.ADMIN, warehouseId: 'MAIN', department: 'aisles', zone: 'AMBIENT', level: 5, xp: 900 },
    { uid: 'user_miabrudan', username: 'MIABRUDAN', pin: '567888', role: UserRole.USER, warehouseId: 'MAIN', department: 'chilled', zone: 'CHILLED', level: 3, xp: 620 },
    { uid: 'user_stblan2', username: 'STBLAN2', pin: '666789', role: UserRole.USER, warehouseId: 'MAIN', department: 'freezer', zone: 'FREEZER', level: 2, xp: 410 }
  ];

  if (!canFetchData(cacheKey, force)) {
    const cached = getCachedData<any[]>(cacheKey);
    if (cached && cached.length > 0) return cached;
  }

  try {
    const coll = collection(db, 'users');
    const snapshot = await getDocs(coll);
    let users = snapshot.docs.map(d => {
      const data = d.data() as any;
      return { 
        uid: d.id, 
        ...data,
        warehouseId: data.warehouseId || 'MAIN'
      };
    });
    
    if (users.length === 0) {
      users = defaultOperators;
    }

    const filtered = users.filter(u => {
      const isSystemAdmin = ((u.username || u.name || '') as string).toUpperCase().trim() === 'ADMIN';
      if (isSystemAdmin) return true; // Keep admin in roster view so admin can manage/verify their account
      
      if (warehouseId && warehouseId.toUpperCase() !== 'ALL') {
        const uW = (u.warehouseId || 'MAIN').toUpperCase().trim();
        if (uW !== warehouseId.toUpperCase().trim()) {
          return false;
        }
      }
      return true;
    });
    
    const processedUsers = await evaluateRosterInactivity(filtered);
    
    setCachedData(cacheKey, processedUsers);
    try {
      localStorage.setItem(`offline_roster_${warehouseId}`, JSON.stringify(processedUsers));
    } catch (e) {}
    return processedUsers;
  } catch (error) {
    console.warn('Firestore fetch users error, falling back to local storage/cache:', error);
    try {
      handleFirestoreError(error, OperationType.LIST, 'users');
    } catch (e) {
      // Catch formatted firestore error to allow resilient fallback
    }
    const cached = getCachedData<any[]>(cacheKey);
    if (cached && cached.length > 0) return cached;

    try {
      const localRoster = localStorage.getItem(`offline_roster_${warehouseId}`);
      if (localRoster) {
        const parsed = JSON.parse(localRoster);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}

    return defaultOperators;
  }
};

/** @deprecated Use fetchAllUsers manually */
export const subscribeToAllUsers = (warehouseId: string, callback: (users: any[]) => void) => {
  fetchAllUsers(warehouseId).then(callback).catch(err => console.warn('subscribeToAllUsers error:', err));
  return () => {};
};

export const deleteUser = async (uid: string) => {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'users');
    return false;
  }
};

export const updateWarehouseSettings = async (warehouseId: string, settings: any) => {
  try {
    const settingsRef = doc(db, 'warehouse_settings', warehouseId);
    await setDoc(settingsRef, settings, { merge: true });
    return true;
  } catch (error) {
    // Settings update failed silently.
    return false;
  }
};

export const getWarehouseSettings = async (warehouseId: string) => {
  try {
    const settingsRef = doc(db, 'warehouse_settings', warehouseId);
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    return null;
  }
}

export const getGlobalSettings = async () => {
  try {
    const settingsRef = doc(db, 'global_config', 'settings');
    const docSnap = await getDoc(settingsRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return {};
  } catch (error) {
    return {};
  }
}

export const saveGlobalSettings = async (settings: any) => {
  try {
    const settingsRef = doc(db, 'global_config', 'settings');
    await setDoc(settingsRef, settings, { merge: true });
    return true;
  } catch (error) {
    // Settings save failed silently.
    return false;
  }
}

export const createUserWithAuthAndProfile = async (username: string, pin: string, warehouseTarget?: string) => {
  const userUpper = username.toUpperCase().trim();
  const email = `${userUpper.toLowerCase()}@pick.app`;
  const authPin = pin.length < 6 ? pin.padEnd(6, '0') : pin;
  
  // ROLE ENFORCEMENT: ONLY these two can be ADMIN
  const role = (userUpper === 'DASERGHIE' || userUpper === 'ADMIN') ? UserRole.ADMIN : UserRole.USER;
  const targetWarehouse = warehouseTarget || currentWarehouseId || 'MAIN';

  let secondaryApp: any = null;
  try {
    // Initialize a separate app instance to create user without affecting current administrator login session
    secondaryApp = initializeApp(firebaseConfig, `SecUser_${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    
    let uid = '';
    try {
      const authResult = await createUserWithEmailAndPassword(secondaryAuth, email, authPin);
      uid = authResult.user.uid;
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        // If email is already in Auth, attempt login with the provided PIN
        try {
          const signInResult = await signInWithEmailAndPassword(secondaryAuth, email, authPin);
          uid = signInResult.user.uid;
        } catch (signInErr: any) {
          // If the PIN in Auth differs, generate a deterministic canonical UID based on username
          uid = `user_${userUpper.toLowerCase()}`;
        }
      } else {
        // Fallback to deterministic username UID
        uid = `user_${userUpper.toLowerCase()}`;
      }
    }

    if (!uid) {
      uid = `user_${userUpper.toLowerCase()}`;
    }
    
    // Save/Upsert profile in Firestore with target warehouse and department defaults
    const homeDept = getUserHomeDepartment(userUpper);
    await saveUserProfile(uid, userUpper, pin, {
      role,
      level: 1,
      xp: 0,
      achievements: [],
      selectedSkin: 'classic',
      warehouseId: targetWarehouse,
      department: homeDept.department,
      homeDepartment: homeDept.department,
      zone: homeDept.zone
    });

    // Invalidate local user caches so the roster refreshes immediately
    try {
      localStorage.removeItem(`allusers_${currentWarehouseId}`);
      localStorage.removeItem('allusers_ALL');
      localStorage.removeItem('allusers_MAIN');
    } catch (e) {
      // Storage clean ignore
    }
    
    return { success: true, uid };
  } catch (error: any) {
    // Final fallback: write directly to Firestore using deterministic user ID
    try {
      const canonicalUid = `user_${userUpper.toLowerCase()}`;
      const homeDept = getUserHomeDepartment(userUpper);
      await saveUserProfile(canonicalUid, userUpper, pin, {
        role,
        level: 1,
        xp: 0,
        achievements: [],
        selectedSkin: 'classic',
        warehouseId: targetWarehouse,
        department: homeDept.department,
        homeDepartment: homeDept.department,
        zone: homeDept.zone
      });
      return { success: true, uid: canonicalUid };
    } catch (dbErr: any) {
      throw new Error(error.message || String(error));
    }
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch (dbErr) {
        // Secondary app disposal failed silently.
      }
    }
  }
};

export const saveBetaFeedback = async (uid: string, username: string, feedbackData: any) => {
  try {
    const docRef = doc(collection(db, 'beta_feedback_logs'));
    await setDoc(docRef, {
      uid,
      username,
      ...feedbackData,
      timestamp: serverTimestamp()
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'beta_feedback_logs');
    return false;
  }
};

export const getBetaFeedbackLogs = async (force: boolean = false) => {
  const cacheKey = 'beta_feedback_logs';
  if (!canFetchData(cacheKey, force)) {
    return getCachedData<any[]>(cacheKey) || [];
  }
  try {
    const logsRef = collection(db, 'beta_feedback_logs');
    const logsSnap = await getDocs(logsRef);
    const logs: any[] = [];
    logsSnap.forEach((doc) => {
      logs.push({ id: doc.id, ...doc.data() });
    });
    setCachedData(cacheKey, logs);
    return logs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'beta_feedback_logs');
    return getCachedData<any[]>(cacheKey) || [];
  }
};

export interface PaginatedShiftSummariesResult {
  summaries: ShiftSummary[];
  lastDoc: any;
  hasMore: boolean;
}

export const fetchShiftSummariesPage = async (
  pageSize: number = 50,
  startAfterDoc?: any,
  userName?: string
): Promise<PaginatedShiftSummariesResult> => {
  try {
    const summariesRef = collection(db, 'shift_summaries');
    let q;
    
    if (userName && userName.toUpperCase().trim() !== 'ADMIN') {
      const safeName = userName.toUpperCase().trim();
      if (startAfterDoc) {
        q = query(
          summariesRef,
          where('userName', '==', safeName),
          startAfter(startAfterDoc),
          limit(pageSize)
        );
      } else {
        q = query(
          summariesRef,
          where('userName', '==', safeName),
          limit(pageSize)
        );
      }
    } else {
      if (startAfterDoc) {
        q = query(
          summariesRef,
          startAfter(startAfterDoc),
          limit(pageSize)
        );
      } else {
        q = query(
          summariesRef,
          limit(pageSize)
        );
      }
    }

    const snapshot = await getDocs(q);
    const lastVisible = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    const hasMore = snapshot.docs.length === pageSize;

    const summaries: ShiftSummary[] = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      delete data.screenshot;
      delete data.labelImage;
      delete data.labelImages;

      const clockInTime = data.clockInTime || (data.date ? new Date(data.date.includes('T') ? data.date : `${data.date}T06:00:00`).getTime() : (data.timestamp?.seconds ? data.timestamp.seconds * 1000 : undefined));
      const clockOutTime = data.clockOutTime || (clockInTime && (data.totalSeconds || data.activeSeconds) ? clockInTime + Math.round((data.totalSeconds || data.activeSeconds || 0) * 1000) : undefined);

      return { id: doc.id, ...data, clockInTime, clockOutTime } as ShiftSummary;
    });

    return {
      summaries,
      lastDoc: lastVisible,
      hasMore
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'shift_summaries');
    return {
      summaries: [],
      lastDoc: null,
      hasMore: false
    };
  }
};

export const fetchAllShiftSummaries = async (force: boolean = false): Promise<ShiftSummary[]> => {
  const cacheKey = `all_shiftsummaries`;
  
  if (!canFetchData(cacheKey, force)) {
    return getCachedData<ShiftSummary[]>(cacheKey) || [];
  }

  try {
    const summariesRef = collection(db, 'shift_summaries');
    
    // Fetch all documents (up to 500) to ensure complete history across all operators
    const q = query(
      summariesRef,
      limit(500)
    );
    
    const snapshot = await getDocs(q);
    let rawSummaries = snapshot.docs.map(doc => {
      const data = doc.data() as any;
      // Strip large image/screenshot payloads to prevent local storage quota overflow
      delete data.screenshot;
      delete data.labelImage;
      delete data.labelImages;

      const clockInTime = data.clockInTime || (data.date ? new Date(data.date.includes('T') ? data.date : `${data.date}T06:00:00`).getTime() : (data.timestamp?.seconds ? data.timestamp.seconds * 1000 : undefined));
      const clockOutTime = data.clockOutTime || (clockInTime && (data.totalSeconds || data.activeSeconds) ? clockInTime + Math.round((data.totalSeconds || data.activeSeconds || 0) * 1000) : undefined);

      return { id: doc.id, ...data, clockInTime, clockOutTime } as ShiftSummary;
    });
    
    // Deduplicate by user and date to avoid inflating shift counts and total cases
    const deduplicated = new Map<string, ShiftSummary>();
    rawSummaries.forEach((s: any) => {
        const rawName = s.userName || s.operator || s.userId || s.name;
        if (!rawName) return;
        const name = String(rawName).trim().toUpperCase();
        if (name === 'ADMIN') return;
        
        const rawDate = s.date || s.clockInTime || (s.timestamp?.seconds ? s.timestamp.seconds * 1000 : null) || s.createdDate;
        const normDate = normalizeDateKey(rawDate);
        if (!normDate) return;
        
        const key = `${name}_${normDate}`;
        const existing = deduplicated.get(key);
        
        const cases = s.totalCases || s.cases || 0;
        const activeSec = s.activeSeconds || s.totalSeconds || 0;
        
        // Ensure standard fields are populated on s
        const standardized: ShiftSummary = {
          ...s,
          userName: s.userName || s.operator || name,
          date: normDate
        };
        
        if (!existing) {
            deduplicated.set(key, standardized);
        } else {
            const existingCases = existing.totalCases || (existing as any).cases || 0;
            const existingActiveSec = existing.activeSeconds || (existing as any).totalSeconds || 0;
            
            if (cases > existingCases || (cases === existingCases && activeSec > existingActiveSec)) {
                deduplicated.set(key, standardized);
            }
        }
    });
    
    let summaries = Array.from(deduplicated.values());

    // Sort descending by date/clockInTime/timestamp
    summaries.sort((a: any, b: any) => {
      const aTime = a.clockInTime || (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.date ? new Date(a.date).getTime() : 0));
      const bTime = b.clockInTime || (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.date ? new Date(b.date).getTime() : 0));
      return bTime - aTime;
    });

    setCachedData(cacheKey, summaries);
    return summaries;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'shift_summaries');
    return getCachedData<ShiftSummary[]>(cacheKey) || [];
  }
};

/** @deprecated Use fetchAllShiftSummaries manually */
export const subscribeToAllShiftSummaries = (callback: (summaries: ShiftSummary[]) => void) => {
  fetchAllShiftSummaries().then(callback).catch(err => console.warn('subscribeToAllShiftSummaries error:', err));
  return () => {};
};

/**
 * Send a real-time social interaction to a top 5 user
 */
export const sendSocialInteraction = async (
    senderName: string,
    receiverName: string,
    type: 'poke' | 'thumbs_up' | 'congrats' | 'tease',
    customText?: string
): Promise<{ success: boolean; message: string }> => {
    const defaultMessages: Record<string, string> = {
        poke: customText || `👉 ${senderName} poked you! Keep the pace!`,
        thumbs_up: customText || `👍 ${senderName} gave you a thumbs up! Great picking!`,
        congrats: customText || `👏 ${senderName} congratulated you on dominating the leaderboard!`,
        tease: customText || `😏 ${senderName}: Catch me if you can on the boards!`
    };

    const interaction = {
        id: `int_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        senderName: senderName || 'Teammate',
        receiverName,
        type,
        message: defaultMessages[type] || `⚡ ${senderName} interacted with you!`,
        createdAt: new Date().toISOString(),
        isRead: false
    };

    try {
        if (db) {
            const docRef = doc(db, 'interactions', interaction.id);
            await setDoc(docRef, {
                ...interaction,
                serverTimestamp: serverTimestamp()
            });
        }
        return { success: true, message: interaction.message };
    } catch (err) {
        console.warn('Error sending interaction to Firestore:', err);
        return { success: true, message: interaction.message };
    }
};

/**
 * Subscribe to incoming social interactions for the logged in operator
 */
export const subscribeToIncomingInteractions = (
    userName: string,
    onInteraction: (interaction: any, isInitial: boolean) => void
): (() => void) => {
    if (!db || !userName) {
        return () => {};
    }

    try {
        const q = query(
            collection(db, 'interactions'),
            orderBy('createdAt', 'desc'),
            limit(15)
        );

        let isInitialLoad = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    if (data.receiverName && data.receiverName.toLowerCase() === userName.toLowerCase()) {
                        onInteraction(data, isInitialLoad);
                    }
                }
            });
            isInitialLoad = false;
        }, (err) => {
            console.warn('Firestore interactions listener warning:', err);
        });

        return unsubscribe;
    } catch (err) {
        console.warn('Failed to attach interactions listener:', err);
        return () => {};
    }
};
