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
    department?: string;
    homeDepartment?: string;
    zone?: string;
    hasSubmittedBetaFeedback?: boolean;
    isActive?: boolean;
    lastLoginTimestamp?: number;
    lastWarningTimestamp?: number;
    deactivationReason?: string;
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
        clockOutLimitSeconds: number;
        clockOutAccrualWindowSeconds: number;
        dinnerLimitSeconds: number;
        dinnerAccrualWindowSeconds: number;
        postDinnerLimitSeconds: number;
        postDinnerAccrualWindowSeconds: number;
    };
    subscriptionStatus: 'active' | 'past_due' | 'canceled';
    tierLevel: SubscriptionTier;
    subscriptionBillingCycle: 'monthly' | 'yearly';
    customDeptTargets?: {
        [deptId: string]: number;
    };
}

export interface ShiftData {
    shiftCode?: string;
    totalCases: number;
    firstStartTime: number | null;
    firstPickTime?: number | null;
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
    pickPhaseEndTime?: number | null;
    tempGap: string;
    caseCount: string;
    pickStartTime: number | null;
    isPicking: boolean;
    breakStartTime: number | null;
    isOnBreak: boolean;
    breakTimeDuringCurrentPick: number;
    hasAlerted: boolean;
    hasGapAlerted: boolean;
    dinnerExcessTime?: number;
    hasAlertedBreak?: boolean;
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
    listeningTo?: string;
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

export type InteractionType = 'poke' | 'thumbs_up' | 'congrats' | 'tease';

export interface SocialInteraction {
  id: string;
  senderName: string;
  receiverName: string;
  type: InteractionType;
  message: string;
  createdAt: string;
  isRead?: boolean;
}

export interface LiveUser {
    name: string;
    department?: string;
    zone?: string;
    xp?: number;
    cases?: number;
    rate?: number;
    listeningTo?: string;
    [key: string]: any;
}

export interface OrderHistoryRecord {
  id?: string;
  orderNumber?: string;
  cases: number | string;
  start: string;
  finish: string;
  rate: number;
  durationSeconds?: number;
  department?: string;
  zone?: string;
  storeLabel?: string;
  timestamp?: number;
}

export interface DepartmentMetricDetail {
  name: string;
  cases: number;
  ordersCount: number;
  activeSeconds: number;
  rate: number;
}

export interface PerformanceStatsSummary {
  totalCases: number;
  activeSeconds: number;
  totalShiftSeconds: number;
  totalBreakSeconds: number;
  currentRate: number;
  targetRate: number;
  totalOrders: number;
  avgOrderDurationSeconds: number;
  avgCasesPerOrder: number;
  departmentBreakdown: DepartmentMetricDetail[];
  consistencyScore: number;
  consecutiveTargetOrders: number;
  steps: number;
  estimatedCalories: number;
  waterIntakeMl: number;
}

export interface ShiftPerformanceMetrics {
  totalCases: number;
  currentRate: number;
  targetRate: number;
  activeTimeFormatted: string;
  breakTimeFormatted: string;
  totalTimeFormatted: string;
  avgOrderDurationFormatted: string;
  avgCasesFormatted: string;
  efficiencyPercent: number;
}

export interface ShiftSummary {
  id?: string;
  shiftCode?: string;
  userId?: string;
  userName: string;
  department: string;
  zone: string;
  totalCases: number;
  finalRate: number;
  activeSeconds: number;
  totalSeconds: number;
  breakSeconds?: number;
  date?: string;
  clockInTime?: number;
  clockOutTime?: number;
  history?: OrderHistoryRecord[];
  steps?: number;
  storeLabel?: string;
  notes?: string;
  operatorNote?: string;
  timestamp?: any;
}


export type NotificationCategory = 'peer' | 'milestone' | 'broadcast' | 'system';

export interface ShiftNotification {
  id: string;
  operator: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  interactionType?: InteractionType;
  senderName?: string;
  data?: Record<string, any>;
}
