/**
 * PickApp Native IndexedDB Service
 * Light-weight, high-performance on-device storage for non-live data:
 * - Shift Rotas & Rota Configurations
 * - Shift History Summaries
 * - Offline User Profiles & Stats
 * - System Configs & Targets
 */

const DB_NAME = 'PickAppLocalDB';
const DB_VERSION = 5;

export const STORES = {
  ROTAS: 'rotas',
  USER_PROFILES: 'userProfiles',
  SYSTEM_CONFIG: 'systemConfig',
  SHIFT_HISTORY: 'shiftHistory',
  LABEL_PHOTOS: 'labelPhotos',
  ACTIVE_SHIFTS: 'activeShifts',
  NOTIFICATIONS: 'notifications'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export const initLocalDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('IndexedDB not supported in this environment');
      return reject(new Error('IndexedDB not supported'));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction;

      // 1. Shift Rotas
      if (!db.objectStoreNames.contains(STORES.ROTAS)) {
        db.createObjectStore(STORES.ROTAS, { keyPath: 'key' });
      }

      // 2. User Profiles
      if (!db.objectStoreNames.contains(STORES.USER_PROFILES)) {
        db.createObjectStore(STORES.USER_PROFILES, { keyPath: 'username' });
      }

      // 3. System Config
      if (!db.objectStoreNames.contains(STORES.SYSTEM_CONFIG)) {
        db.createObjectStore(STORES.SYSTEM_CONFIG, { keyPath: 'key' });
      }

      // 4. Shift History (Supports multi-week offline shift records)
      let shiftStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.SHIFT_HISTORY)) {
        shiftStore = db.createObjectStore(STORES.SHIFT_HISTORY, { keyPath: 'id' });
      } else {
        shiftStore = tx!.objectStore(STORES.SHIFT_HISTORY);
      }
      if (!shiftStore.indexNames.contains('userName')) {
        shiftStore.createIndex('userName', 'userName', { unique: false });
      }
      if (!shiftStore.indexNames.contains('date')) {
        shiftStore.createIndex('date', 'date', { unique: false });
      }

      // 5. Label Photos (High capacity storage without localStorage limits)
      let photoStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.LABEL_PHOTOS)) {
        photoStore = db.createObjectStore(STORES.LABEL_PHOTOS, { keyPath: 'id' });
      } else {
        photoStore = tx!.objectStore(STORES.LABEL_PHOTOS);
      }
      if (!photoStore.indexNames.contains('userName')) {
        photoStore.createIndex('userName', 'userName', { unique: false });
      }
      if (!photoStore.indexNames.contains('date')) {
        photoStore.createIndex('date', 'date', { unique: false });
      }

      // 6. Active Shift State (Protects in-flight shift from quota errors)
      if (!db.objectStoreNames.contains(STORES.ACTIVE_SHIFTS)) {
        db.createObjectStore(STORES.ACTIVE_SHIFTS, { keyPath: 'operator' });
      }

      // 7. Shift Notifications & Peer Interactions
      let notifStore: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.NOTIFICATIONS)) {
        notifStore = db.createObjectStore(STORES.NOTIFICATIONS, { keyPath: 'id' });
      } else {
        notifStore = tx!.objectStore(STORES.NOTIFICATIONS);
      }
      if (!notifStore.indexNames.contains('operator')) {
        notifStore.createIndex('operator', 'operator', { unique: false });
      }
      if (!notifStore.indexNames.contains('timestamp')) {
        notifStore.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!notifStore.indexNames.contains('category')) {
        notifStore.createIndex('category', 'category', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      console.error('PickAppLocalDB open error:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
};

/**
 * Save single item into an object store
 */
export async function saveLocalItem(storeName: string, item: any): Promise<void> {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(item);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to save to local DB [${storeName}]:`, err);
  }
}

/**
 * Bulk save items into an object store in a single transaction
 */
export async function saveLocalItems(storeName: string, items: any[]): Promise<void> {
  if (!items || items.length === 0) return;
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      for (const item of items) {
        if (item) store.put(item);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error(`Failed bulk save to local DB [${storeName}]:`, err);
  }
}

/**
 * Retrieve a single item by key
 */
export async function getLocalItem<T = any>(storeName: string, key: IDBValidKey): Promise<T | null> {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to get from local DB [${storeName}]:`, err);
    return null;
  }
}

/**
 * Retrieve all items from a store, optionally filtered by index
 */
export async function getAllLocalItems<T = any>(
  storeName: string, 
  indexName?: string, 
  queryValue?: IDBValidKey
): Promise<T[]> {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      
      let req: IDBRequest;
      let usedIndex = false;

      if (indexName && queryValue !== undefined && store.indexNames && store.indexNames.contains(indexName)) {
        try {
          const index = store.index(indexName);
          req = index.getAll(queryValue);
          usedIndex = true;
        } catch {
          req = store.getAll();
        }
      } else {
        req = store.getAll();
      }

      req.onsuccess = () => {
        let results = req.result || [];
        // If we queried by index key but couldn't use index or need exact filtering
        if (indexName && queryValue !== undefined && !usedIndex) {
          results = results.filter((item: any) => {
            if (!item) return false;
            const val = item[indexName];
            if (typeof val === 'string' && typeof queryValue === 'string') {
              return val.toUpperCase() === (queryValue as string).toUpperCase();
            }
            return val === queryValue;
          });
        }
        resolve(results);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to get all from local DB [${storeName}]:`, err);
    return [];
  }
}

/**
 * Delete single item by key
 */
export async function deleteLocalItem(storeName: string, key: IDBValidKey): Promise<void> {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to delete from local DB [${storeName}]:`, err);
  }
}

/**
 * Clear entire store
 */
export async function clearLocalStore(storeName: string): Promise<void> {
  try {
    const db = await initLocalDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error(`Failed to clear store [${storeName}]:`, err);
  }
}

/**
 * Save user shift rota and overrides locally
 */
export async function saveLocalRota(userName: string, rotaConfig: any, rotaOverrides: any): Promise<void> {
  if (!userName) return;
  const key = `rota_${userName.toUpperCase().trim()}`;
  await saveLocalItem(STORES.ROTAS, {
    key,
    userName: userName.toUpperCase().trim(),
    rotaConfig,
    rotaOverrides,
    updatedAt: Date.now()
  });
}

/**
 * Get user shift rota and overrides from local device store
 */
export async function getLocalRota(userName: string): Promise<{ rotaConfig?: any; rotaOverrides?: any } | null> {
  if (!userName) return null;
  const key = `rota_${userName.toUpperCase().trim()}`;
  return getLocalItem<{ rotaConfig?: any; rotaOverrides?: any }>(STORES.ROTAS, key);
}

/**
 * Save full 6-week shift history to IndexedDB (Bypasses localStorage 5MB limit)
 */
export async function saveLocalShiftSummaries(userName: string, summaries: any[]): Promise<void> {
  if (!userName || !summaries) return;
  const safeName = userName.toUpperCase().trim();
  const items = summaries.map((s, idx) => ({
    ...s,
    id: s.id || s.docId || `${safeName}_${s.date || s.clockInTime || idx}`,
    userName: safeName,
    updatedAt: Date.now()
  }));
  await saveLocalItems(STORES.SHIFT_HISTORY, items);
}

/**
 * Retrieve shift summaries for a user from IndexedDB
 */
export async function getLocalShiftSummaries(userName: string): Promise<any[]> {
  if (!userName) return [];
  const safeName = userName.toUpperCase().trim();
  const items = await getAllLocalItems(STORES.SHIFT_HISTORY, 'userName', safeName);
  return items.sort((a, b) => {
    const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.clockInTime || new Date(a.date || 0).getTime());
    const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.clockInTime || new Date(b.date || 0).getTime());
    return bTime - aTime;
  });
}

/**
 * Save active ongoing shift safely into IndexedDB
 */
export async function saveLocalActiveShift(operator: string, shiftData: any): Promise<void> {
  if (!operator || !shiftData) return;
  await saveLocalItem(STORES.ACTIVE_SHIFTS, {
    operator: operator.toUpperCase().trim(),
    shiftData,
    updatedAt: Date.now()
  });
}

/**
 * Get active ongoing shift from IndexedDB
 */
export async function getLocalActiveShift(operator: string): Promise<any | null> {
  if (!operator) return null;
  const item = await getLocalItem<{ operator: string; shiftData: any }>(
    STORES.ACTIVE_SHIFTS, 
    operator.toUpperCase().trim()
  );
  return item ? item.shiftData : null;
}

/**
 * Save label photo to IndexedDB
 */
export async function saveLocalPhoto(photoId: string, userName: string, date: string, photoBase64: string): Promise<void> {
  if (!photoId || !photoBase64) return;
  await saveLocalItem(STORES.LABEL_PHOTOS, {
    id: photoId,
    userName: userName.toUpperCase().trim(),
    date,
    blob: photoBase64,
    createdAt: Date.now()
  });
}

/**
 * Retrieve label photos from IndexedDB
 */
export async function getLocalPhotos(userName: string, date?: string): Promise<any[]> {
  if (!userName) return [];
  const safeName = userName.toUpperCase().trim();
  const photos = await getAllLocalItems(STORES.LABEL_PHOTOS, 'userName', safeName);
  if (date) {
    return photos.filter(p => p.date === date);
  }
  return photos;
}

/**
 * Save a shift notification / peer interaction to IndexedDB
 */
export async function saveLocalNotification(notification: any): Promise<void> {
  if (!notification || !notification.id) return;
  const item = {
    ...notification,
    operator: (notification.operator || 'DEFAULT').toUpperCase().trim(),
    timestamp: notification.timestamp || Date.now(),
    isRead: !!notification.isRead
  };
  await saveLocalItem(STORES.NOTIFICATIONS, item);
}

/**
 * Retrieve shift notifications for an operator from IndexedDB
 */
export async function getLocalNotifications(userName: string): Promise<any[]> {
  if (!userName) return [];
  const safeName = userName.toUpperCase().trim();
  const list = await getAllLocalItems<any>(STORES.NOTIFICATIONS, 'operator', safeName);
  // Sort descending by timestamp
  return (list || []).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
}

/**
 * Mark notification as read in IndexedDB
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  if (!id) return;
  const notif = await getLocalItem<any>(STORES.NOTIFICATIONS, id);
  if (notif) {
    notif.isRead = true;
    await saveLocalItem(STORES.NOTIFICATIONS, notif);
  }
}

/**
 * Mark all notifications as read for an operator
 */
export async function markAllNotificationsAsRead(userName: string): Promise<void> {
  if (!userName) return;
  const list = await getLocalNotifications(userName);
  for (const notif of list) {
    if (!notif.isRead) {
      notif.isRead = true;
      await saveLocalItem(STORES.NOTIFICATIONS, notif);
    }
  }
}

/**
 * Clear notifications for an operator
 */
export async function clearLocalNotifications(userName: string): Promise<void> {
  if (!userName) return;
  const list = await getLocalNotifications(userName);
  for (const notif of list) {
    await deleteLocalItem(STORES.NOTIFICATIONS, notif.id);
  }
}

/**
 * Delete a single notification by id from IndexedDB
 */
export async function deleteLocalNotification(id: string): Promise<void> {
  if (!id) return;
  await deleteLocalItem(STORES.NOTIFICATIONS, id);
}

/**
 * One-time silent migration from bloated localStorage to IndexedDB
 */
export async function migrateLocalStorageToIndexedDB(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    const migratedFlag = localStorage.getItem('pickapp_idb_migrated_v3');
    if (migratedFlag === 'true') return;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      // Migrate shift history
      if (key.startsWith('shift_history_')) {
        const userName = key.replace('shift_history_', '');
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              await saveLocalShiftSummaries(userName, parsed);
            }
          }
        } catch (e) {
          console.warn('Migration error for', key, e);
        }
      }

      // Migrate active pickData
      if (key.startsWith('pickData_')) {
        const op = key.replace('pickData_', '');
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            await saveLocalActiveShift(op, parsed);
          }
        } catch (e) {
          console.warn('Active shift migration error for', key, e);
        }
      }
    }

    // Clean up bloated legacy items and historical shift dumps from localStorage now that IndexedDB handles them
    const keysToPrune = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (
        k.startsWith('pickData_corrupted_') ||
        k.startsWith('failed_order_uploads') ||
        k.startsWith('draft_') ||
        k.startsWith('temp_') ||
        k.startsWith('offline_shifts_') ||
        k.includes('_corrupted_')
      )) {
        keysToPrune.push(k);
      }
    }
    keysToPrune.forEach(k => localStorage.removeItem(k));

    localStorage.setItem('pickapp_idb_migrated_v3', 'true');
    console.log('[IndexedDB] LocalStorage data migrated cleanly to IndexedDB.');
  } catch (err) {
    console.warn('[IndexedDB] Migration skipped/failed:', err);
  }
}


