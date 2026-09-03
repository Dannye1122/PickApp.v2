/**
 * PickApp Quota Guardian
 * Enforces a 10-minute read-lock on all database requests to stay within free-tier limits.
 */

const TEN_MINUTES_MS = 20 * 60 * 1000;

/**
 * Retrieves the count of currently active/live users from the local cache.
 * Defaults to 1 if no cached live users list is found.
 */
const getLiveUsersCount = (): number => {
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cache_liveusers_')) {
                const cached = localStorage.getItem(key);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (parsed && Array.isArray(parsed.data)) {
                        return Math.max(1, parsed.data.length);
                    }
                }
            }
        }
    } catch (e) {
        // Ignore and fallback gracefully
    }
    return 1;
};

/**
 * Calculates the dynamically optimized polling interval for live updates.
 * Adapts to the number of live users to keep total daily reads safely under the 50,000 Free Tier limit.
 * 1 user  -> 60s (1m)
 * 2 users -> 90s (1.5m)
 * 3 users -> 120s (2m)
 * 4 users -> 180s (3m)
 * 5 users -> 240s (4m)
 * >5 users -> scales up to 10 minutes max (600s)
 */
export const getOptimalLiveInterval = (): number => {
    const liveUsers = getLiveUsersCount();
    
    let intervalSec = 60;
    if (liveUsers === 2) {
        intervalSec = 90;
    } else if (liveUsers === 3) {
        intervalSec = 120;
    } else if (liveUsers === 4) {
        intervalSec = 180;
    } else if (liveUsers === 5) {
        intervalSec = 240;
    } else if (liveUsers > 5) {
        intervalSec = Math.min(600, liveUsers * 60);
    }
    
    return intervalSec * 1000;
};

export const DAILY_READ_LIMIT = 50000;
export const DAILY_WRITE_LIMIT = 20000;
export const QUOTA_CAP_RATIO = 0.80; // 80% strict cap for non-essential traffic

export const BUDGETED_READ_MAX = Math.floor(DAILY_READ_LIMIT * QUOTA_CAP_RATIO); // 40,000 reads
export const BUDGETED_WRITE_MAX = Math.floor(DAILY_WRITE_LIMIT * QUOTA_CAP_RATIO); // 16,000 writes

let globalQuotaExceeded = false;

const getTodayUtcKey = (): string => {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
};

/**
 * Returns current daily read/write usage metrics against the 80% threshold.
 */
export const getQuotaUsage = (): { reads: number; writes: number; readPercent: number; writePercent: number; isPreservationMode: boolean } => {
    try {
        const key = `quota_usage_${getTodayUtcKey()}`;
        const raw = localStorage.getItem(key);
        if (raw) {
            const data = JSON.parse(raw);
            const reads = Number(data.reads || 0);
            const writes = Number(data.writes || 0);
            const readPercent = Math.min(100, Math.round((reads / DAILY_READ_LIMIT) * 100));
            const writePercent = Math.min(100, Math.round((writes / DAILY_WRITE_LIMIT) * 100));
            const isPreservationMode = reads >= BUDGETED_READ_MAX || writes >= BUDGETED_WRITE_MAX || isQuotaExceeded();
            return { reads, writes, readPercent, writePercent, isPreservationMode };
        }
    } catch (e) {
        // Fallback
    }
    return { reads: 0, writes: 0, readPercent: 0, writePercent: 0, isPreservationMode: isQuotaExceeded() };
};

/**
 * Tracks an outbound Firestore read operation.
 */
export const trackFirestoreRead = (count: number = 1) => {
    try {
        const key = `quota_usage_${getTodayUtcKey()}`;
        const cur = getQuotaUsage();
        const updated = { reads: cur.reads + count, writes: cur.writes };
        localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}
};

/**
 * Tracks an outbound Firestore write operation.
 */
export const trackFirestoreWrite = (count: number = 1) => {
    try {
        const key = `quota_usage_${getTodayUtcKey()}`;
        const cur = getQuotaUsage();
        const updated = { reads: cur.reads, writes: cur.writes + count };
        localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {}
};

/**
 * Checks if non-essential live activity (presence heartbeats, background live queries) is allowed.
 * Halts strictly when 80% of daily quota is consumed to guarantee headroom for shift saves.
 */
export const isLiveActivityAllowed = (): boolean => {
    if (isQuotaExceeded()) return false;
    const usage = getQuotaUsage();
    if (usage.reads >= BUDGETED_READ_MAX || usage.writes >= BUDGETED_WRITE_MAX) {
        return false;
    }
    return true;
};

/**
 * Checks if shift completion and critical shift saves are permitted.
 * Shift saves have absolute priority over live traffic and are permitted up to 98% of hard limit.
 */
export const isShiftPriorityAllowed = (): boolean => {
    if (globalQuotaExceeded) return false;
    const usage = getQuotaUsage();
    return usage.writes < DAILY_WRITE_LIMIT * 0.98;
};

/**
 * Marks Firestore quota as exceeded to prevent further outbound backend requests.
 */
export const markQuotaExceeded = () => {
    globalQuotaExceeded = true;
    try {
        sessionStorage.setItem('firestore_quota_exceeded', 'true');
    } catch (e) {
        // Ignore storage errors
    }
};

/**
 * Checks if the Firestore free tier quota is currently marked as exceeded.
 */
export const isQuotaExceeded = (): boolean => {
    if (globalQuotaExceeded) return true;
    try {
        return sessionStorage.getItem('firestore_quota_exceeded') === 'true';
    } catch (e) {
        return false;
    }
};

/**
 * Resets quota status (e.g., manually or on a fresh day).
 */
export const resetQuotaStatus = () => {
    globalQuotaExceeded = false;
    try {
        sessionStorage.removeItem('firestore_quota_exceeded');
    } catch (e) {
        // Ignore storage errors
    }
};

/**
 * Checks if a data fetch for the given key is allowed based on the read-lock, quota status, and visibility constraints.
 */
export const canFetchData = (cacheKey: string, force: boolean = false): boolean => {
    // If user explicitly requests a force-sync, we MUST bypass all throttles and locks.
    if (force) return true;

    // If quota is already marked as exceeded, block standard background/throttled calls.
    if (isQuotaExceeded()) {
        return false;
    }

    // Check 80% cap for live/leaderboard keys to protect shift saves
    const isLiveKey = cacheKey.startsWith('leaderboard_') || cacheKey.startsWith('liveusers_');
    if (isLiveKey && !isLiveActivityAllowed()) {
        return false;
    }
    
    // Water-tight optimization: strictly block background/inactive tabs from triggering database reads.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return false;
    }

    const lastFetch = localStorage.getItem(`last_fetch_${cacheKey}`);
    if (!lastFetch) return true;
    
    const interval = isLiveKey ? getOptimalLiveInterval() : TEN_MINUTES_MS;
    
    const elapsed = Date.now() - parseInt(lastFetch);
    return elapsed >= interval;
};

/**
 * Marks a fetch as successful, updating the timestamp.
 */
export const markDataFetched = (cacheKey: string) => {
    try {
        localStorage.setItem(`last_fetch_${cacheKey}`, Date.now().toString());
    } catch (e) {
        console.warn(`Failed to set fetch timestamp for ${cacheKey}:`, e);
    }
};

// Fast in-memory RAM cache to ensure zero-latency reads and zero quota errors
const memoryCache = new Map<string, { timestamp: number; data: any }>();

/**
 * Strips heavy properties (e.g. large history arrays, raw images, label photo blobs)
 * to produce a lightweight storage payload for localStorage.
 */
const stripHeavyFields = (val: any): any => {
    if (!val) return val;
    if (Array.isArray(val)) {
        return val.map(item => stripHeavyFields(item));
    }
    if (typeof val === 'object') {
        const copy: any = {};
        for (const k of Object.keys(val)) {
            if (k === 'rawPhotoBlobs' || k === 'labelPhotos' || k === 'rawImages') {
                continue;
            }
            if (k === 'history' && Array.isArray(val[k]) && val[k].length > 10) {
                // Keep only the last 5 entries for local storage cache, full history is in IndexedDB
                copy[k] = val[k].slice(-5);
                copy['historyCount'] = val[k].length;
                continue;
            }
            copy[k] = val[k];
        }
        return copy;
    }
    return val;
};

/**
 * Retrieves cached data for a given key.
 * Uses in-memory cache first, falling back to localStorage.
 */
export const getCachedData = <T>(cacheKey: string): T | null => {
    // 1. Check in-memory RAM cache first
    const memEntry = memoryCache.get(cacheKey);
    if (memEntry) {
        return memEntry.data as T;
    }

    // 2. Fallback to localStorage
    try {
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed && parsed.data !== undefined) {
                memoryCache.set(cacheKey, { timestamp: parsed.timestamp || Date.now(), data: parsed.data });
                return parsed.data as T;
            }
        }
    } catch (e) {
        console.warn(`Failed to retrieve cached data for ${cacheKey}:`, e);
    }
    return null;
};

/**
 * Saves data to cache and updates the fetch timestamp.
 * Resilient against localStorage quota limits with memory cache fallback.
 */
export const setCachedData = (cacheKey: string, data: any) => {
    const key = `cache_${cacheKey}`;
    const timestamp = Date.now();

    // Always store full un-truncated data in RAM memory cache first
    memoryCache.set(cacheKey, { timestamp, data });

    // Mark fetch timestamp so backend is protected
    markDataFetched(cacheKey);

    // Save lightweight version to localStorage to prevent QuotaExceededError
    try {
        const storageData = stripHeavyFields(data);
        const serialized = JSON.stringify({ timestamp, data: storageData });
        localStorage.setItem(key, serialized);
    } catch (e: any) {
        console.warn(`QuotaExceededError when setting cache for key: ${key}. Evicting old keys...`);
        try {
            // Find non-critical cache keys to remove
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (!k) continue;
                if (k.startsWith('cache_') && k !== key) {
                    keysToRemove.push(k);
                } else if (k.startsWith('pickData_corrupted_') || k.startsWith('draft_')) {
                    keysToRemove.push(k);
                }
            }
            
            for (const k of keysToRemove) {
                localStorage.removeItem(k);
                if (k.startsWith('cache_')) {
                    const baseKey = k.replace(/^cache_/, '');
                    localStorage.removeItem(`last_fetch_${baseKey}`);
                }
            }
            
            // Re-attempt saving ultra-slim version
            const ultraSlim = Array.isArray(data)
                ? data.map(item => {
                    if (item && typeof item === 'object') {
                        const { history, rawPhotoBlobs, labelPhotos, rawImages, ...rest } = item;
                        return rest;
                    }
                    return item;
                })
                : stripHeavyFields(data);

            const slimSerialized = JSON.stringify({ timestamp, data: ultraSlim });
            localStorage.setItem(key, slimSerialized);
        } catch (retryError) {
            // Graceful non-blocking fallback: memoryCache and IndexedDB already hold data
            console.warn(`LocalStorage quota full for ${key}. Operating safely with memory cache and IndexedDB.`);
        }
    }
};

/**
 * Returns the time remaining until the next allowed fetch in minutes.
 */
export const getMinutesUntilNextFetch = (cacheKey: string): number => {
    const lastFetch = localStorage.getItem(`last_fetch_${cacheKey}`);
    if (!lastFetch) return 0;
    
    const isLiveKey = cacheKey.startsWith('leaderboard_') || cacheKey.startsWith('liveusers_');
    const interval = isLiveKey ? getOptimalLiveInterval() : TEN_MINUTES_MS;
    
    const elapsed = Date.now() - parseInt(lastFetch);
    const remainingMs = Math.max(0, interval - elapsed);
    return Math.ceil(remainingMs / (60 * 1000));
};
