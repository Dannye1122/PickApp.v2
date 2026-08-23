// Inactivity and System Notification Service for PickApp

const LAST_ACTIVE_KEY = 'pickapp_last_active_timestamp';
const NOTIF_ENABLED_KEY = 'pickapp_inactivity_notifs_enabled';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds

export const isNotificationSupported = (): boolean => {
    return typeof window !== 'undefined' && 'Notification' in window;
};

export const getNotificationPermission = (): NotificationPermission => {
    if (!isNotificationSupported()) return 'denied';
    return Notification.permission;
};

export const areInactivityNotifsEnabled = (): boolean => {
    if (!isNotificationSupported()) return false;
    const stored = localStorage.getItem(NOTIF_ENABLED_KEY);
    if (stored === 'false') return false;
    return Notification.permission === 'granted';
};

export const setInactivityNotifsEnabled = async (enabled: boolean): Promise<boolean> => {
    if (!enabled) {
        localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
        return false;
    }

    if (!isNotificationSupported()) {
        localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
        return false;
    }

    if (Notification.permission === 'granted') {
        localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
        recordUserActivity();
        return true;
    }

    if (Notification.permission !== 'denied') {
        try {
            const result = await Notification.requestPermission();
            if (result === 'granted') {
                localStorage.setItem(NOTIF_ENABLED_KEY, 'true');
                recordUserActivity();
                return true;
            }
        } catch (e) {
            console.error('Error requesting notification permission:', e);
        }
    }

    localStorage.setItem(NOTIF_ENABLED_KEY, 'false');
    return false;
};

/**
 * Record activity to reset the 3-day inactivity timer
 */
export const recordUserActivity = () => {
    try {
        const now = Date.now();
        localStorage.setItem(LAST_ACTIVE_KEY, now.toString());
        scheduleInactivityCheck();
    } catch (e) {
        console.error('Failed to record user activity:', e);
    }
};

/**
 * Trigger the 3-day inactivity notification
 */
export const sendInactivityNotification = (customText?: string) => {
    if (!isNotificationSupported() || Notification.permission !== 'granted') {
        return;
    }

    const title = '🦉 Hootie misses you in PickApp!';
    const options: NotificationOptions = {
        body: customText || "It's been 3 days since your last shift! Ready to log your picks, boost your XP, and climb the leaderboard?",
        icon: '/icon.svg',
        badge: '/icon.svg',
        tag: 'pickapp-inactivity-reminder',
        requireInteraction: false,
    };

    try {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then(registration => {
                registration.showNotification(title, options);
            }).catch(() => {
                new Notification(title, options);
            });
        } else {
            new Notification(title, options);
        }
    } catch (e) {
        console.error('Failed to trigger notification:', e);
    }
};

/**
 * Check if 3 days have elapsed since last use and notify
 */
export const checkInactivity = (): boolean => {
    if (!areInactivityNotifsEnabled()) return false;

    const lastActiveStr = localStorage.getItem(LAST_ACTIVE_KEY);
    if (!lastActiveStr) {
        recordUserActivity();
        return false;
    }

    const lastActive = parseInt(lastActiveStr, 10);
    const now = Date.now();
    const elapsed = now - lastActive;

    if (elapsed >= THREE_DAYS_MS) {
        sendInactivityNotification();
        recordUserActivity();
        return true;
    }

    return false;
};

let inactivityTimerId: any = null;

/**
 * Schedule in-browser checking loop
 */
export const scheduleInactivityCheck = () => {
    if (inactivityTimerId) {
        clearInterval(inactivityTimerId);
    }

    if (typeof window === 'undefined') return;

    // Check once on launch
    checkInactivity();

    // Check every hour when active in browser tab
    inactivityTimerId = setInterval(() => {
        checkInactivity();
    }, 60 * 60 * 1000);
};
