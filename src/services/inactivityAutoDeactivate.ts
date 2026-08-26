import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserRole } from '../types';
import { sendInactivityNotification } from './notificationService';
import { saveLocalNotification } from './indexedDbService';

export const INACTIVITY_WARNING_MS = 4 * 24 * 60 * 60 * 1000; // 4 days (1 day before 5 days)
export const INACTIVITY_DEACTIVATE_MS = 5 * 24 * 60 * 60 * 1000; // 5 days

export interface InactivityCheckResult {
    user: any;
    status: 'active' | 'warning_sent' | 'deactivated';
    daysInactive: number;
}

/**
 * Checks and processes inactivity rules for a single user profile.
 * - If inactive >= 5 days: auto-deactivates account (isActive = false)
 * - If inactive >= 4 days & < 5 days: sends warning notification (1 day before deactivation)
 */
export const processUserInactivity = async (user: any): Promise<InactivityCheckResult> => {
    if (!user) return { user, status: 'active', daysInactive: 0 };
    
    const username = user.username || user.name || user.uid || '';
    const userUpper = username.toUpperCase().trim();
    
    // Super Admins & system accounts are exempt from auto-deactivation
    if (userUpper === 'DASERGHIE' || userUpper === 'ADMIN' || user.role === UserRole.ADMIN) {
        return { user, status: 'active', daysInactive: 0 };
    }

    const now = Date.now();
    // Fallback to current time if lastLoginTimestamp is missing (to prevent deactivating newly created/legacy profiles immediately)
    const lastLogin = user.lastLoginTimestamp || now;
    const elapsed = now - lastLogin;
    const daysInactive = Math.floor(elapsed / (24 * 60 * 60 * 1000));

    // Case 1: 5 or more days inactive -> Auto Deactivate
    if (elapsed >= INACTIVITY_DEACTIVATE_MS) {
        if (user.isActive !== false) {
            console.warn(`[Inactivity Engine] Auto-deactivating user ${username} due to ${daysInactive} days of inactivity.`);
            const updatedUser = {
                ...user,
                isActive: false,
                deactivationReason: `Auto-deactivated after ${daysInactive} days of inactivity`
            };

            try {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, {
                    isActive: false,
                    deactivationReason: `Auto-deactivated after ${daysInactive} days of inactivity`
                }, { merge: true });
            } catch (err) {
                console.error(`Failed to update Firestore deactivation for ${user.uid}`, err);
            }

            // Create notification log
            try {
                await saveLocalNotification({
                    id: `deact_${user.uid}_${now}`,
                    type: 'system',
                    title: '⚠️ Account Auto-Deactivated',
                    message: `Account for ${username} was automatically deactivated due to 5+ days of inactivity.`,
                    timestamp: now,
                    read: false
                });
            } catch (e) {}

            return { user: updatedUser, status: 'deactivated', daysInactive };
        }
        return { user, status: 'deactivated', daysInactive };
    }

    // Case 2: Between 4 and 5 days inactive -> Send 1-Day Warning
    if (elapsed >= INACTIVITY_WARNING_MS && elapsed < INACTIVITY_DEACTIVATE_MS) {
        const lastWarning = user.lastWarningTimestamp || 0;
        const warningAlreadySent = lastWarning > lastLogin;

        if (!warningAlreadySent && user.isActive !== false) {
            console.info(`[Inactivity Engine] Issuing 1-day deactivation warning to ${username} (${daysInactive} days inactive).`);
            
            const warningMessage = `⚠️ Inactivity Warning: You haven't logged in for ${daysInactive} days. Your PickApp account will be automatically deactivated in 24 hours unless you log in!`;
            
            // 1. Browser Push Notification
            sendInactivityNotification(warningMessage);

            // 2. In-App Notification
            try {
                await saveLocalNotification({
                    id: `warn_${user.uid}_${now}`,
                    type: 'system',
                    title: '⚠️ Deactivation Warning (24 Hours Remaining)',
                    message: warningMessage,
                    timestamp: now,
                    read: false
                });
            } catch (e) {}

            // 3. Mark lastWarningTimestamp in Firestore
            const updatedUser = {
                ...user,
                lastWarningTimestamp: now
            };

            try {
                const userRef = doc(db, 'users', user.uid);
                await setDoc(userRef, {
                    lastWarningTimestamp: now
                }, { merge: true });
            } catch (err) {
                console.error(`Failed to record warning timestamp for ${user.uid}`, err);
            }

            return { user: updatedUser, status: 'warning_sent', daysInactive };
        }
    }

    return { user, status: user.isActive === false ? 'deactivated' : 'active', daysInactive };
};

/**
 * Processes inactivity deactivations across a batch of users
 */
export const evaluateRosterInactivity = async (users: any[]): Promise<any[]> => {
    if (!Array.isArray(users) || users.length === 0) return users;

    const updatedUsers = await Promise.all(users.map(async u => {
        const res = await processUserInactivity(u);
        return res.user;
    }));

    return updatedUsers;
};
