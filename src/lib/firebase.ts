import { initializeApp } from 'firebase/app';
import { initializeAuth, signOut, onAuthStateChanged, User, browserLocalPersistence, browserSessionPersistence, indexedDBLocalPersistence } from 'firebase/auth';
import { 
    initializeFirestore, 
    getFirestore,
    persistentLocalCache, 
    memoryLocalCache,
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    orderBy, 
    limit, 
    serverTimestamp, 
    Timestamp 
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export { app };

export const auth = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence]
});

// Gracefully handle IndexedDB blockages in sandboxed iframe environments
let localCacheSetting: any;
try {
    if (typeof window !== 'undefined' && window.indexedDB) {
        localCacheSetting = persistentLocalCache();
    } else {
        localCacheSetting = memoryLocalCache();
    }
} catch (e) {
    console.warn("Storage/IndexedDB is restricted in this environment. Falling back to memory cache.");
    localCacheSetting = memoryLocalCache();
}

let tempDb: any;
try {
    tempDb = initializeFirestore(app, { 
        localCache: localCacheSetting,
        experimentalForceLongPolling: true
    }, (firebaseConfig as any).firestoreDatabaseId);
} catch (e) {
    console.warn("Failed first-tier Firestore initialization, trying memory cache fallback:", e);
    try {
        tempDb = initializeFirestore(app, {
            localCache: memoryLocalCache({}),
            experimentalForceLongPolling: true
        }, (firebaseConfig as any).firestoreDatabaseId);
    } catch (e2) {
        console.warn("Failed second-tier Firestore initialization, using classic getFirestore fallback:", e2);
        try {
            tempDb = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
        } catch (e3) {
            console.error("Firestore loading completely blocked, using standalone app configuration:", e3);
            tempDb = getFirestore(app);
        }
    }
}

export const db = tempDb;

export const storage = getStorage(app);

export const logout = () => signOut(auth);

export { onAuthStateChanged };
export type { User };
