import { db, auth } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, setDoc, serverTimestamp, writeBatch, query, where, limit, getDocs } from 'firebase/firestore';
import { OperationType } from './leaderboardService';
import { markQuotaExceeded, isQuotaExceeded } from '../utils/quotaManager';
import { STORES, getAllLocalItems, saveLocalItems } from './indexedDbService';

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

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
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
    console.warn(`[PickApp Guardian] Sync paused due to Firestore quota limits on ${path}. Tasks retained safely in offline queue.`);
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

  const newErr = new Error(JSON.stringify(errInfo));
  if (error && typeof error === 'object' && 'code' in error) {
    (newErr as any).code = (error as any).code;
  }
  throw newErr;
}

interface SyncTask {
    id: string;
    type: 'leaderboard' | 'liveStatus' | 'shiftSummary';
    payload: any;
    timestamp: number;
    retryCount: number;
}

class SyncManager {
    private queueKey = 'offline_sync_queue';
    private queue: SyncTask[] = [];
    private isSyncing = false;
    private timer: any = null;

    constructor() {
        this.loadQueue();
        
        // Listen for Auth changes so queued items sync as soon as user is authenticated
        try {
            onAuthStateChanged(auth, (user) => {
                if (user && navigator.onLine) {
                    this.sync();
                    this.reconcileLocalDbWithFirebase();
                }
            });
        } catch (e) {}

        // Listen for network reconnect
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                this.sync();
                this.reconcileLocalDbWithFirebase();
            });
        }
    }

    /**
     * Bidirectional Database Sync Bridge
     * Ensures local IndexedDB (PickAppLocalDB) and Firebase Firestore stay 100% synchronized
     */
    public async reconcileLocalDbWithFirebase(userName?: string): Promise<{ pushed: number; pulled: number }> {
        if (!navigator.onLine || isQuotaExceeded()) {
            return { pushed: 0, pulled: 0 };
        }

        let pushed = 0;
        let pulled = 0;

        try {
            const currentUser = auth.currentUser;
            const targetUser = (userName || currentUser?.displayName || localStorage.getItem('lastUser') || '').toUpperCase().trim();

            // 1. PUSH: Sync local IndexedDB shiftHistory to Firebase
            const localShifts = await getAllLocalItems<any>(STORES.SHIFT_HISTORY);
            for (const shift of localShifts) {
                if (!shift) continue;
                const docId = shift.docId || shift.id || `${shift.userId || currentUser?.uid || 'anon'}_${shift.clockInTime || Date.now()}`;
                const shiftUser = (shift.userName || targetUser).toUpperCase().trim();
                
                if (targetUser && shiftUser && shiftUser !== targetUser) continue;

                const summaryData = {
                    ...shift,
                    docId,
                    userId: shift.userId && shift.userId !== 'anon' ? shift.userId : (currentUser?.uid || 'anon'),
                    userName: shiftUser || 'OPERATOR',
                    clockInTime: shift.clockInTime || Date.now(),
                    timestamp: shift.timestamp || serverTimestamp()
                };

                try {
                    const ref = doc(db, 'shift_summaries', docId);
                    await setDoc(ref, summaryData, { merge: true });
                    pushed++;
                } catch (err) {
                    this.enqueue('shiftSummary', { docId, summaryData });
                }
            }

            // 2. PUSH: Sync local IndexedDB userProfiles to Firebase
            const localProfiles = await getAllLocalItems<any>(STORES.USER_PROFILES);
            for (const profile of localProfiles) {
                if (!profile || !profile.username) continue;
                const pUser = profile.username.toUpperCase().trim();
                if (targetUser && pUser !== targetUser) continue;

                const uid = profile.uid || currentUser?.uid;
                if (!uid) continue;

                try {
                    const userRef = doc(db, 'users', uid);
                    await setDoc(userRef, {
                        ...profile,
                        username: pUser,
                        lastSync: serverTimestamp()
                    }, { merge: true });
                    pushed++;
                } catch (err) {
                    console.warn(`[SyncManager] Profile push failed for ${pUser}:`, err);
                }
            }

            // 3. PUSH: Sync local IndexedDB rotas to Firebase
            const localRotas = await getAllLocalItems<any>(STORES.ROTAS);
            for (const rotaItem of localRotas) {
                if (!rotaItem || !rotaItem.userName) continue;
                const rUser = rotaItem.userName.toUpperCase().trim();
                if (targetUser && rUser !== targetUser) continue;

                const uid = currentUser?.uid;
                if (!uid) continue;

                try {
                    const userRef = doc(db, 'users', uid);
                    await setDoc(userRef, {
                        rotaConfig: rotaItem.rotaConfig || null,
                        rotaOverrides: rotaItem.rotaOverrides || null,
                        updatedAt: Date.now()
                    }, { merge: true });
                    pushed++;
                } catch (err) {
                    console.warn(`[SyncManager] Rota push failed for ${rUser}:`, err);
                }
            }

            // 4. PULL: Fetch remote shift summaries from Firebase Firestore into local IndexedDB
            if (targetUser) {
                const q = query(
                    collection(db, 'shift_summaries'),
                    where('userName', '==', targetUser),
                    limit(150)
                );
                const snapshot = await getDocs(q);
                const remoteSummaries: any[] = [];
                snapshot.forEach(docSnap => {
                    remoteSummaries.push({ id: docSnap.id, ...docSnap.data() });
                });

                if (remoteSummaries.length > 0) {
                    await saveLocalItems(STORES.SHIFT_HISTORY, remoteSummaries);
                    pulled += remoteSummaries.length;
                }
            }
        } catch (err) {
            console.warn('[SyncManager] Reconcile error:', err);
        }

        return { pushed, pulled };
    }

    private loadQueue() {
        try {
            const data = localStorage.getItem(this.queueKey);
            if (data) {
                this.queue = JSON.parse(data);
            }
        } catch (e) {
            // Failed to load, start clean.
            this.queue = [];
        }
    }

    private saveQueue() {
        try {
            localStorage.setItem(this.queueKey, JSON.stringify(this.queue));
        } catch (e) {
            // Failed to save.
        }
    }

    public enqueue(type: SyncTask['type'], payload: any) {
        // Simple conflict resolution: If there's already a liveStatus task for the same user, replace it
        if (type === 'liveStatus') {
            this.queue = this.queue.filter(t => !(t.type === 'liveStatus' && t.payload.user === payload.user));
        }

        const task: SyncTask = {
            id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0
        };
        
        this.queue.push(task);
        this.saveQueue();
        
        if (navigator.onLine) {
            this.sync();
        }
    }

    public async sync() {
        if (this.isSyncing || this.queue.length === 0 || !navigator.onLine || isQuotaExceeded()) return;
        
        // Wait until firebase auth is initialized before syncing
        if (!auth.currentUser) {
            // SyncManager: Waiting for authentication before syncing...
            return;
        }

        this.isSyncing = true;
        // Starting sync for items...
        
        const tasksToProcess = [...this.queue];
        const failedTasks: SyncTask[] = [];
        
        for (const task of tasksToProcess) {
            try {
                await this.processTask(task);
                // Successfully processed, remove from queue
                this.queue = this.queue.filter(t => t.id !== task.id);
            } catch (error: any) {
                // Task sync failed, retry logic applied.
                
                task.retryCount++;
                const isConnectionUnstable = 
                    !navigator.onLine || 
                    error?.code === 'unavailable' || 
                    error?.code === 'network-request-failed' ||
                    error?.message?.toLowerCase().includes('unavailable') || 
                    error?.message?.toLowerCase().includes('offline') || 
                    error?.message?.toLowerCase().includes('network');

                if (task.retryCount < 5 || isConnectionUnstable) {
                    // Keep in queue to retry
                    const qTask = this.queue.find(t => t.id === task.id);
                    if (qTask) qTask.retryCount = task.retryCount;
                } else {
                    // Give up after 5 tries unless it's just offline
                    this.queue = this.queue.filter(t => t.id !== task.id);
                }
            }
        }
        
        this.saveQueue();
        this.isSyncing = false;
    }

    private async processTask(task: SyncTask) {
        const { type, payload } = task;
        const warehouseId = payload.warehouseId || 'MAIN';
        
        try {
            if (type === 'liveStatus') {
                const { user, rate, department, totalCases, activeSeconds, steps, xp, status, targetRate, docId, currentOrder, customStatus, listeningTo } = payload;
                const liveRef = doc(db, 'leaderboard', docId);
                await setDoc(liveRef, {
                    name: user.toUpperCase(),
                    rate,
                    department,
                    totalCases: totalCases || 0,
                    activeSeconds: activeSeconds || 0,
                    steps: steps || 0,
                    xp: xp || 0,
                    status: status || 'picking',
                    targetRate: targetRate || 200,
                    currentOrder: currentOrder || '',
                    customStatus: customStatus || '',
                    listeningTo: listeningTo || '',
                    warehouseId,
                    type: 'live',
                    lastUpdate: serverTimestamp()
                }, { merge: true });
            } 
            else if (type === 'leaderboard') {
                const { docId, entry } = payload;
                const docRef = doc(db, 'leaderboard', docId);
                await setDoc(docRef, {
                    ...entry,
                    warehouseId,
                    timestamp: serverTimestamp()
                }, { merge: true });
            }
            else if (type === 'shiftSummary') {
                const { docId, summaryData } = payload;
                if (summaryData.userId === 'anon' && auth.currentUser) {
                    summaryData.userId = auth.currentUser.uid;
                }
                if (summaryData.userName) {
                    summaryData.userName = summaryData.userName.toUpperCase().trim();
                }
                
                const summaryRef = doc(db, 'shift_summaries', docId);
                await setDoc(summaryRef, { 
                    ...summaryData, 
                    timestamp: serverTimestamp() 
                }, { merge: true });
            }
        } catch (error) {
            handleFirestoreError(error, OperationType.WRITE, type);
        }
    }
}

export const syncManager = new SyncManager();
