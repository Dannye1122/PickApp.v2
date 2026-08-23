export interface LeaderboardEntry {
    name: string;
    rate: number;
    cases: number;
    steps?: number;
    targetRate?: number;
    department: string;
    date: string;
    timestamp?: any;
    warehouseId?: string;
    isBot?: boolean;
}

export interface Achievement {
    name: string;
    icon: string;
    desc: string;
    color: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export enum UserRole {
    ADMIN = 'admin',
    USER = 'user'
}

export interface UserProfile {
    uid: string;
    username: string;
    role: UserRole;
    pin?: string;
    level: number;
    xp: number;
    achievements: string[];
    selectedSkin: string;
    warehouseId: string;
    hasSubmittedBetaFeedback?: boolean;
    rotaConfig?: any;
    rotaOverrides?: Record<string, string>;
}

export interface WarehouseSettings {
    globalTargetRate: number;
    departments: string[];
    kpiThresholds: {
        excellent: number;
        good: number;
        warning: number;
    };
    shiftTypes: string[];
    exemptionRules: {
        prepLimitSeconds: number;
        prepAccrualWindowSeconds: number;
        dinnerLimitSeconds: number;
        dinnerAccrualWindowSeconds: number;
        cleanupLimitSeconds: number;
        cleanupAccrualWindowSeconds: number;
    };
    subscriptionStatus: 'active' | 'past_due' | 'canceled';
    tierLevel: SubscriptionTier;
    subscriptionBillingCycle: 'monthly' | 'yearly';
    customDeptTargets?: {
        [deptId: string]: number;
    };
}

export interface ShiftData {
    totalCases: number;
    firstStartTime: number | null;
    totalExcludedTime: number;
    history: any[];
    steps: number;
    haptic: 'on' | 'off';
    department: string;
    zone: string;
    lastStopTimestamp: number | null;
    operator: string;
    streak: number;
    lastDate: string;
    customTargetRate: number | null;
    isShiftFinalized: boolean;
    finalizedStats: any | null;
    endTime?: number;
    tempGap: string;
    caseCount: string;
    pickStartTime: number | null;
    isPicking: boolean;
    breakStartTime: number | null;
    isOnBreak: boolean;
    breakTimeDuringCurrentPick: number;
    hasAlerted: boolean;
    hasGapAlerted: boolean;
    lastGapAlertTimestamp: number | null;
    hasHalfwayAlerted: boolean;
    wakeLock: boolean;
    consecutiveTargetOrders: number;
    appVersion: string;
    personalBests: Record<string, number>;
    consistencyScore: number;
    bestHourlyRate: number;
    level: number;
    xp: number;
    achievements: string[];
    voiceEnabled: boolean;
    selectedSkin: string | null;
    storeLabel?: string;
    warehouseId?: string;
    isCaseCountModified?: boolean;
    biometricEnabled?: never; // REMOVED
    watchConnected?: boolean;
    watchName?: string;
    watchSyncMode?: 'bluetooth' | 'file' | '';
    watchBrand?: string;
    watchDeviceId?: string;
    heartRate?: number;
    calories?: number;
    waterIntakeMl?: number;
    waterGoalMl?: number;
    lastConnectedWatch?: {
        watchName: string;
        watchSyncMode?: string;
        watchBrand?: string;
        watchDeviceId?: string;
        connectedAt?: number;
    };
}

export interface ThemeColors {
    gradient: string;
    shadow: string;
    text: string;
    textLight: string;
    bg: string;
    bgHover: string;
    borderFocus: string;
    borderFocusLarge: string;
    radius: string;
    font: string;
    panel: string;
}
