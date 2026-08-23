import { SubscriptionTier } from '../types';

export const TIER_LIMITS = {
    free: {
        maxWorkers: 10,
        maxHistoryDays: 30,
        enableAdvancedAnalytics: false,
    },
    pro: {
        maxWorkers: 50,
        maxHistoryDays: 365,
        enableAdvancedAnalytics: true,
    },
    enterprise: {
        maxWorkers: Infinity,
        maxHistoryDays: Infinity,
        enableAdvancedAnalytics: true,
    },
};

export const canAccessFeature = (tier: SubscriptionTier, feature: keyof typeof TIER_LIMITS['free']): boolean => {
    return true; // placeholder for now or actual logic
};
