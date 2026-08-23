/**
 * PickApp Native IndexedDB Service
 * Light-weight, high-performance on-device storage for non-live data:
 * - Shift Rotas & Rota Configurations
 * - Shift History Summaries
 * - Offline User Profiles & Stats
 * - System Configs & Targets
 */

const DB_NAME = 'PickAppLocalDB';
const DB_VERSION = 2;

export const STORES = {
  ROTAS: 'rotas',
  USER_PROFILES: 'userProfiles',
  SYSTEM_CONFIG: 'systemConfig'
} as const;

let dbPromise: Promise<IDBDatabase> | null = null;

export const initLocalDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
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

