/**
 * PickApp Native IndexedDB Service
 * Light-weight, high-performance on-device storage for non-live data:
 * - Shift Rotas & Rota Configurations
 * - Shift History Summaries
 * - Offline User Profiles & Stats
 * - System Configs & Targets
 */

const DB_NAME = 'PickAppLocalDB';
const DB_VERSION = 3;

export const STORES = {
  ROTAS: 'rotas',
  USER_PROFILES: 'userProfiles',
  SYSTEM_CONFIG: 'systemConfig',
  SHIFT_HISTORY: 'shiftHistory',
  LABEL_PHOTOS: 'labelPhotos',
  ACTIVE_SHIFTS: 'activeShifts'
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
      if (!db.objectStoreNames.contains(STORES.SHIFT_HISTORY)) {
        const shiftStore = db.createObjectStore(STORES.SHIFT_HISTORY, { keyPath: 'id' });
        shiftStore.createIndex('userName', 'userName', { unique: false });
        shiftStore.createIndex('date', 'date', { unique: false });
      }

      // 5. Label Photos (High capacity storage without localStorage limits)
      if (!db.objectStoreNames.contains(STORES.LABEL_PHOTOS)) {
        const photoStore = db.createObjectStore(STORES.LABEL_PHOTOS, { keyPath: 'id' });
        photoStore.createIndex('userName', 'userName', { unique: false });
        photoStore.createIndex('date', 'date', { unique: false });
      }

      // 6. Active Shift State (Protects in-flight shift from quota errors)
      if (!db.objectStoreNames.contains(STORES.ACTIVE_SHIFTS)) {
        db.createObjectStore(STORES.ACTIVE_SHIFTS, { keyPath: 'operator' });
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
      if (indexName && queryValue !== undefined) {
        const index = store.index(indexName);
        req = index.getAll(queryValue);
      } else {
        req = store.getAll();
      }

      req.onsuccess = () => resolve(req.result || []);
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

    // Clean up bloated legacy items from localStorage
    const keysToPrune = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('pickData_corrupted_') || k.startsWith('failed_order_uploads') || k.startsWith('draft_'))) {
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


