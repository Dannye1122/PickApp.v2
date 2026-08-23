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

let globalQuotaExceeded = false;

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
    // If quota is already marked as exceeded, strictly block remote calls and rely on cache
    if (isQuotaExceeded()) {
        return false;
    }

    if (force) return true;
    
    // Water-tight optimization: strictly block background/inactive tabs from triggering database reads.
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return false;
    }

    const lastFetch = localStorage.getItem(`last_fetch_${cacheKey}`);
    if (!lastFetch) return true;
    
    // Dynamic throttling for highly frequent live paths
    const isLiveKey = cacheKey.startsWith('leaderboard_') || cacheKey.startsWith('liveusers_');
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

/**
 * Retrieves cached data for a given key.
 */
export const getCachedData = <T>(cacheKey: string): T | null => {
    try {
        const cached = localStorage.getItem(`cache_${cacheKey}`);
        if (cached) {
            const parsed = JSON.parse(cached);
            return parsed.data as T;
        }
    } catch (e) {
        console.warn(`Failed to retrieve cached data for ${cacheKey}:`, e);
    }
    return null;
};

/**
 * Saves data to cache and updates the fetch timestamp.
 */
export const setCachedData = (cacheKey: string, data: any) => {
    const key = `cache_${cacheKey}`;
    const serialized = JSON.stringify({ timestamp: Date.now(), data });
    
    try {
        localStorage.setItem(key, serialized);
        markDataFetched(cacheKey);
    } catch (e: any) {
        console.warn(`QuotaExceededError when setting cache for key: ${key}. Attempting cache eviction...`, e);
        try {
            // Find all cache keys to remove to free up space
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('cache_') && k !== key) {
                    keysToRemove.push(k);
                }
            }
            
            // Remove older caches to clear space
            for (const k of keysToRemove) {
                localStorage.removeItem(k);
                const baseKey = k.replace(/^cache_/, '');
                localStorage.removeItem(`last_fetch_${baseKey}`);
            }
            
            // Try saving again
            localStorage.setItem(key, serialized);
            markDataFetched(cacheKey);
            console.log(`Cache eviction succeeded. Saved ${key}.`);
        } catch (retryError) {
            console.error(`Failed to cache data even after evicting other cache entries:`, retryError);
            // Fallback: Proceed gracefully without local cache storage.
            // Still mark the request as fetched to respect the rate limiting of backend queries.
            markDataFetched(cacheKey);
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
