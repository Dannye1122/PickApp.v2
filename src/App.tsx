// Version: 1.7.0-INDUSTRIAL-WMS
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useSwipeable } from 'react-swipeable';
import { PerformanceDashboard } from './components/PerformanceDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { PickingDashboard } from './components/PickingDashboard';
import { 
    Settings, X, Play, Square, Coffee, Download, Trash2, LogOut, CheckCircle, Lock,
    Trophy, FileText, Clock, RefreshCcw, RefreshCw, Flame, Sparkles, Zap, Sliders, LayoutDashboard, 
    Award, Sun, Snowflake, Mic, ExternalLink, Activity, Target, Box, ChevronRight,
    Calendar, ChevronLeft, Camera, Share, ShieldAlert, Database, Users, User, UserPlus, Share2, MoreVertical, PlusSquare, ClipboardCheck, Key, Fingerprint, Info, Edit2, Check, Tag,
    Hash, AlertCircle, BookOpen, RotateCcw, Volume2, Power, Star, Palette, XOctagon, HardDrive, FileBox, ShieldCheck, Wrench, Layers, Shield, FileSpreadsheet, Cpu, Terminal,
    Bot, Bell
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { domToJpeg } from 'modern-screenshot';
import { calculateAislesExemption, calculateAislesExemptionDetail } from './lib/exemptionUtils';
import { signInAnonymously, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './lib/firebase';
import confetti from 'canvas-confetti';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Core Services & Libs
import { auth } from './lib/firebase';
import { 
    fetchLeaderboard, saveToLeaderboard, saveShiftSummary, fetchAllShiftSummaries, 
    clearLeaderboard, updateLiveStatus, fetchLiveUsers, fetchShiftSummaries, 
    ShiftSummary, saveUserProfile, getUserProfile, getAllUsers, getLocalDateString, normalizeDateStr, 
    purgeDatabaseOlderThan6Weeks, createUserWithAuthAndProfile, updateWarehouseSettings, 
    getWarehouseSettings, getGlobalSettings, saveGlobalSettings, subscribeToWarehouseContext, 
    setWarehouseContext, deleteShiftSummary, getDatabaseStorageStats, stripOldImagesFromDatabase, 
    DBStorageStats, deleteUser, saveBetaFeedback, subscribeToLeaderboard, subscribeToLiveUsers
} from './services/leaderboardService';
import { getLocalRota, saveLocalRota, getAllLocalItems, STORES } from './services/indexedDbService';
import { compressImage } from './lib/imageCompressor';
import { deviceHaptic, deviceExport, saveImageToDevice } from './lib/deviceApi';
import { checkUpdate, openDownloadLink, AppVersionInfo, isNewer } from './lib/VersionManager';
import VoiceAssistant from './components/VoiceAssistant';
import { PreviousMonthSummary } from './components/leaderboard/PreviousMonthSummary';
import { BetaSurveyModal } from './components/BetaSurveyModal';
import { shouldPromptBetaSurvey } from './services/betaSurveyService';
import { MonthlyReportNotificationModal } from './components/MonthlyReportNotificationModal';
import { checkMonthlyReportNotification } from './services/monthlyReportService';
import { restoreAndProtectShifts, RESTORED_SHIFTS } from './utils/restoreUserData';
import { shiftDataService } from './services/shiftDataService';
import { shiftCacheService } from './services/shiftCacheService';
import { generateFullShiftReport, copyFullShiftReport, restoreShiftFromReportText } from './services/shiftReportService';
import { formatTime, formatHHMM, formatHHMMSS, hoursToHHMM } from './utils/formatUtils';
import { CapCamera, CameraResultType, CameraSource, Preferences } from './lib/capacitorMocks';
import { triggerWebCamera } from './utils/webCamera';
import { getDeptName, resolveDepartmentInfo } from './utils/deptUtils';
import { getDepartmentBreakdown } from './utils/statsUtils';

// New Modular Architecture
import { OnboardingModal } from './components/OnboardingModal';
import { AboutPickApp } from './components/AboutPickApp';
import { AboutDeveloper } from './components/AboutDeveloper';
import { InviteModal } from './components/InviteModal';
import { ShiftData, ThemeColors, LeaderboardEntry, UserRole, UserProfile, WarehouseSettings } from './types';
import { THEMES, SKIN_REQUIREMENTS } from './constants/themes';
import { USERS, DEPT_LANES, DEPARTMENTS, ACHIEVEMENT_DATA, DUO_MESSAGES } from './constants/data';
import { usePerformanceStats } from './hooks/usePerformanceStats';
import { playAlertSound, playVictorySound, playGentleBeep, getAudioContext } from './services/audioService';
import { haptic as deviceHapticService, setHapticsEnabled, isVibrationSupported } from './services/hapticService';
import { 
    isNotificationSupported, 
    areInactivityNotifsEnabled, 
    setInactivityNotifsEnabled, 
    recordUserActivity, 
    scheduleInactivityCheck, 
    sendInactivityNotification 
} from './services/notificationService';
import { LoginScreen } from './components/LoginScreen';
import { ConsentScreen } from './components/ConsentScreen';
import { Logo, Catchphrase } from './components/branding/Logo';
import { MetricCard } from './components/stats/MetricCard';

import { fetchWarehouseConfig, saveWarehouseConfig } from './services/warehouseService';



// Utility functions moved to src/utils/formatUtils.ts and src/utils/deptUtils.ts and src/utils/statsUtils.ts

// Utility functions relocated above
import { APP_VERSION } from './constants/version';


export const DASERGHIE_ROTA = {
    weeks: 6,
    pattern: [
        [8, 0, 8, 8, 8, 0, 0], // Week 1 (Mon 11.05 - Work Mon, Wed, Thu, Fri: 8h; Off Tue, Sat, Sun)
        [8, 8, 8, 8, 0, 0, 8], // Week 2 (Mon 18.05 - Work Mon, Tue, Wed, Thu, Sun: 8h; Off Fri, Sat)
        [8, 8, 0, 0, 8, 8, 8], // Week 3 (Mon 25.05 - Work Mon, Tue, Fri, Sat, Sun: 8h; Off Wed, Thu)
        [0, 8, 8, 8, 8, 0, 0], // Week 4 (Mon 01.06 - Work Tue, Wed, Thu, Fri: 8h; Off Mon, Sat, Sun. Matches June 1st)
        [8, 8, 8, 8, 0, 0, 8], // Week 5 (Mon 08.06 - Work Mon, Tue, Wed, Thu, Sun: 8h; Off Fri, Sat. Matches June 12-13)
        [8, 8, 0, 0, 8, 8, 8]  // Week 6 (Mon 15.06 - Work Mon, Tue, Fri, Sat, Sun: 8h; Off Wed, Thu. Matches June 17-18)
    ],
    anchorDate: '2026-05-11',
};

const defaultShiftData = {
    totalCases: 0,
    firstStartTime: null,
    totalExcludedTime: 0,
    history: [],
    steps: 0,
    haptic: 'on',
    department: 'aisles',
    zone: 'AMBIENT',
    lastStopTimestamp: null,
    operator: '',
    streak: 0,
    firestreak: 0,
    lastDate: '',
    customTargetRate: null,
    isShiftFinalized: false,
    finalizedStats: null,
    tempGap: '0s',
    pickStartTime: null,
    isPicking: false,
    breakStartTime: null,
    isOnBreak: false,
    breakTimeDuringCurrentPick: 0,
    hasAlerted: false,
    hasGapAlerted: false,
    lastGapAlertTimestamp: null,
    hasHalfwayAlerted: false,
    wakeLock: false,
    consecutiveTargetOrders: 0,
    appVersion: APP_VERSION,
    // Personal Records & Consistency
    personalBests: {}, // { departmentKey: rate }
    consistencyScore: 0,
    bestHourlyRate: 0,
    // Reward system
    level: 1,
    xp: 0,
    achievements: [],
    voiceEnabled: false,
    voiceTask: {
        aisle: '',
        slot: '',
        cases: 0,
        checkDigits: '',
        status: 'idle', // idle, awaiting_digits, picking
    },
    selectedSkin: null, // null means use Zone default
    storeLabel: '',
    operatorNote: '',
    assistantImage: '',
    isCaseCountModified: false,
    customStatus: '',
    listeningTo: '',
    rotaConfig: {
        weeks: 6,
        pattern: [
            [0, 0, 0, 0, 0, 0, 0], 
            [0, 0, 0, 0, 0, 0, 0], 
            [0, 0, 0, 0, 0, 0, 0], 
            [0, 0, 0, 0, 0, 0, 0], 
            [0, 0, 0, 0, 0, 0, 0], 
            [0, 0, 0, 0, 0, 0, 0]  
        ],
        anchorDate: null,
    },
    rotaOverrides: {},
};

const processLoadedData = (parsed: any, defaultValues: any) => {
    if (!parsed) return { ...defaultValues };
    
    // Restore drafts if present
    const draftNote = localStorage.getItem('draft_operatorNote');
    if (draftNote !== null) parsed.operatorNote = draftNote;
    const draftL1 = localStorage.getItem('draft_lane1');
    if (draftL1 !== null) parsed.lane1 = draftL1;
    const draftL2 = localStorage.getItem('draft_lane2');
    if (draftL2 !== null) parsed.lane2 = draftL2;
    const draftL3 = localStorage.getItem('draft_lane3');
    if (draftL3 !== null) parsed.lane3 = draftL3;
    const draftL4 = localStorage.getItem('draft_lane4');
    if (draftL4 !== null) parsed.lane4 = draftL4;
    
    // Migrate legacy data if necessary
    if (!parsed.personalBests) parsed.personalBests = {};
    
    // DELETED PERSISTED BIOMETRIC STATE LOGIC
    
    // Set default App version
    if (parsed.appVersion !== APP_VERSION) {
        parsed.appVersion = APP_VERSION;
    }
    
    // Initialize DASERGHIE with predefined rota if they have an empty or invalid one
    if (parsed.operator === 'DASERGHIE') {
        if (!parsed.rotaConfig || !parsed.rotaConfig.anchorDate) {
            parsed.rotaConfig = { ...DASERGHIE_ROTA };
        }
    } else {
        // For other users, if missing rotaConfig, give them a blank one
        if (!parsed.rotaConfig) {
            parsed.rotaConfig = { ...defaultValues.rotaConfig };
        } else if (parsed.operator && parsed.operator !== 'DASERGHIE' && parsed.rotaConfig.anchorDate === DASERGHIE_ROTA.anchorDate && JSON.stringify(parsed.rotaConfig.pattern) === JSON.stringify(DASERGHIE_ROTA.pattern)) {
            // If they somehow got DASERGHIE's rota, clear it
            parsed.rotaConfig = { ...defaultValues.rotaConfig };
        }
    }
    
    // Ensure default department is 'aisles' (Aisles 300 / 350) and zone is 'AMBIENT'
    if (!parsed.department) {
        parsed.department = 'aisles';
    }
    if (!parsed.zone) {
        parsed.zone = 'AMBIENT';
    }

    // Force voiceEnabled to false on app startup to prevent microphone activation without explicit consent
    parsed.voiceEnabled = false;
    
    // Recovery of steps tracking from backup
    if (!parsed.isShiftFinalized && parsed.steps !== undefined && parsed.firstStartTime) {
        localStorage.setItem('shiftStepBackup', parsed.steps.toString());
    }
    
    return { ...defaultValues, ...parsed };
};

export default function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        return sessionStorage.getItem('session_authenticated') === 'true';
    });
    const [firebaseUser, setFirebaseUser] = useState<any>(null);
    const [loginError, setLoginError] = useState('');
    const [updating, setUpdating] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationTitle, setCelebrationTitle] = useState('TARGET SMASHED!');
    const [celebrationSubtitle, setCelebrationSubtitle] = useState('You are absolute machine!');
    const [backgroundNotice, setBackgroundNotice] = useState<{show: boolean, msg: string} | null>(null);
    const wakeLockRef = useRef<any>(null);
    const [username, setUsername] = useState(() => {
        return localStorage.getItem('lastUser') || '';
    });
    const [password, setPassword] = useState('');
    const [isUnlockingCaseCount, setIsUnlockingCaseCount] = useState(false);
    const [isEditingCaseCount, setIsEditingCaseCount] = useState(false);
    const [sessionId] = useState(() => {
        let sid = localStorage.getItem('sessionId');
        if (!sid) {
            sid = crypto.randomUUID();
            localStorage.setItem('sessionId', sid);
        }
        return sid;
    });
    const [unlockPin, setUnlockPin] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [tempCaseCount, setTempCaseCount] = useState('');

    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    const isUserAdmin = () => {
        if (userProfile?.role === UserRole.ADMIN) return true;
        const currentName = (shiftData?.operator || username || localStorage.getItem('lastUser') || '').toUpperCase().trim();
        return currentName === 'ADMIN' || currentName === 'DASERGHIE';
    };

    const isAdminUser = (name?: string) => {
        if (!name) return isUserAdmin();
        const clean = name.toUpperCase().trim();
        return clean === 'ADMIN' || clean === 'DASERGHIE';
    };

    const [showOnboarding, setShowOnboarding] = useState(() => {
        return localStorage.getItem('pickapp_onboarding_acknowledged') !== 'true';
    });
    const [showAbout, setShowAbout] = useState(false);
    const [showAboutDeveloper, setShowAboutDeveloper] = useState(false);

    const [shiftData, setShiftData] = useState(() => {
        try {
            const lastUser = localStorage.getItem('lastUser');
            const keys = Object.keys(localStorage);
            
            // Try to find the best candidate key
            let candidateKey = lastUser ? `pickData_${lastUser}` : 'pickData';
            
            // Check if our preferred key exists and is valid, otherwise look for others
            let rawData = localStorage.getItem(candidateKey);
            
            if (!rawData) {
                // Try any pickData key as a fallback
                const fallbackKey = keys.find(k => k.startsWith('pickData') && !k.includes('corrupted'));
                if (fallbackKey) {
                    candidateKey = fallbackKey;
                    rawData = localStorage.getItem(fallbackKey);
                }
            }

            if (!rawData) return defaultShiftData;
            
            try {
                const parsed = JSON.parse(rawData);
                return processLoadedData(parsed, defaultShiftData);
            } catch (e) {
                // Failed to parse shiftData; using defaults.
                localStorage.setItem(`pickData_corrupted_${Date.now()}`, rawData);
                localStorage.removeItem(candidateKey); // Remove corrupt entry
                return defaultShiftData;
            }
        } catch (e) {
            // Fallback to defaults.
            return defaultShiftData;
        }
    });

    useEffect(() => {
        const hydrateFromPreferences = async () => {
            try {
                const { value: lastUser } = await Preferences.get({ key: 'lastUser' });
                const userOp = lastUser || localStorage.getItem('lastUser') || 'default';
                const prefKey = lastUser ? `pickData_${lastUser}` : 'pickData';
                const { value: rawPrefData } = await Preferences.get({ key: prefKey });
                
                // Also retrieve locally stored IndexedDB Rota for instant rendering
                const localDbRota = await getLocalRota(userOp);
                
                if (rawPrefData || localDbRota) {
                    const parsed = rawPrefData ? JSON.parse(rawPrefData) : {};
                    setShiftData((prev: any) => {
                        let nextConfig = parsed.rotaConfig || prev.rotaConfig;
                        let nextOverrides = parsed.rotaOverrides || prev.rotaOverrides;

                        if (localDbRota?.rotaConfig && (!nextConfig || !nextConfig.anchorDate)) {
                            nextConfig = localDbRota.rotaConfig;
                        }
                        if (localDbRota?.rotaOverrides) {
                            nextOverrides = { ...(nextOverrides || {}), ...localDbRota.rotaOverrides };
                        }

                        if (!prev.lastStopTimestamp || (parsed.lastStopTimestamp && parsed.lastStopTimestamp > prev.lastStopTimestamp) || (parsed.totalCases && parsed.totalCases > prev.totalCases) || localDbRota) {
                            return { 
                                ...defaultShiftData, 
                                ...prev,
                                ...parsed, 
                                rotaConfig: nextConfig, 
                                rotaOverrides: nextOverrides 
                            };
                        }
                        return prev;
                    });
                }
            } catch (e) {
                // Failed to hydrate from Preferences.
            }
        };
        hydrateFromPreferences();
    }, []);

    const [currentWarehouseId, setCurrentWarehouseId] = useState('MAIN');
    const [warehouseConfig, setWarehouseConfig] = useState<WarehouseSettings | null>(null);

    useEffect(() => {
        // subscribeToWarehouseContext is typically a local state synchronization in this app, 
        // but we'll ensure it doesn't trigger background network activity here.
        const unsubscribe = subscribeToWarehouseContext((id) => {
            setCurrentWarehouseId(id);
        });
        return () => unsubscribe();
    }, []);

    const fetchWarehouseConfigManual = useCallback(async (force: boolean = false) => {
        try {
            const config = await fetchWarehouseConfig(shiftData.warehouseId || 'MAIN', force);
            if (config) setWarehouseConfig(config);
        } catch (e) {
            console.error("Warehouse config fetch failed", e);
        }
    }, [shiftData.warehouseId]);

    const handleAdminTargetRateChange = async (newRate: number | null) => {
        if (!isUserAdmin() || !warehouseConfig) return;
        const currentWarehouseId = shiftData.warehouseId || 'MAIN';
        const deptKey = shiftData.department;
        if (!deptKey) return;

        const updatedCustomDeptTargets = {
            ...(warehouseConfig.customDeptTargets || {}),
        };

        if (newRate === null) {
            delete updatedCustomDeptTargets[deptKey];
        } else {
            updatedCustomDeptTargets[deptKey] = newRate;
        }

        const updatedConfig = {
            ...warehouseConfig,
            customDeptTargets: updatedCustomDeptTargets,
        };

        setWarehouseConfig(updatedConfig);
        try {
            await saveWarehouseConfig(currentWarehouseId, updatedConfig);
            showToast(`Updated default target for ${deptKey.toUpperCase()} to ${newRate || 'original default'}`, 'success');
        } catch (err) {
            console.error("Failed to save admin target rate change", err);
            showToast('Failed to sync target rate to database', 'error');
        }
    };

    const currentZone = (shiftData.zone || 'AMBIENT') as keyof typeof DEPARTMENTS;
    const zoneData = DEPARTMENTS[currentZone] || DEPARTMENTS.AMBIENT;
    
    const currentDept = useMemo(() => {
        // Search current zone first
        for (const dept of Object.values(zoneData.depts)) {
            if (dept.sub[shiftData.department]) {
                const subDept = dept.sub[shiftData.department];
                const customTarget = warehouseConfig?.customDeptTargets?.[shiftData.department];
                return { ...subDept, target: customTarget !== undefined ? customTarget : subDept.target };
            }
        }
        // Fallback search in all zones
        for (const z of Object.values(DEPARTMENTS)) {
            for (const d of Object.values(z.depts)) {
                if (d.sub[shiftData.department]) {
                    const subDept = d.sub[shiftData.department];
                    const customTarget = warehouseConfig?.customDeptTargets?.[shiftData.department];
                    return { ...subDept, target: customTarget !== undefined ? customTarget : subDept.target };
                }
            }
        }
        return { name: shiftData.department, target: warehouseConfig?.globalTargetRate || 200 };
    }, [shiftData.department, zoneData, warehouseConfig]);

    const targetRate = shiftData.customTargetRate || currentDept.target;
    // Theme logic: If a custom skin is selected, use it. Otherwise use zone default.
    const theme = useMemo(() => {
        if (shiftData.selectedSkin && THEMES[shiftData.selectedSkin]) {
            return THEMES[shiftData.selectedSkin];
        }
        return THEMES[currentZone] || THEMES.AMBIENT;
    }, [shiftData.selectedSkin, currentZone]);

    const [now, setNow] = useState(new Date());
    const [rotaMonthOffset, setRotaMonthOffset] = useState(0);
    
    const isPicking = shiftData.isPicking;
    const pickStartTime = shiftData.pickStartTime;
    const breakTimeDuringCurrentPick = shiftData.breakTimeDuringCurrentPick;
    const hasAlerted = shiftData.hasAlerted;
    const hasGapAlerted = shiftData.hasGapAlerted;
    const isOnBreak = shiftData.isOnBreak;
    const breakStartTime = shiftData.breakStartTime;
    
    const [caseCount, setCaseCount] = useState(shiftData.caseCount || '');
    const [lane1, setLane1] = useState(() => localStorage.getItem('draft_lane1') || shiftData.lane1 || '');
    const [lane2, setLane2] = useState(() => localStorage.getItem('draft_lane2') || shiftData.lane2 || '');
    const [lane3, setLane3] = useState(() => localStorage.getItem('draft_lane3') || shiftData.lane3 || '');
    const [lane4, setLane4] = useState(() => localStorage.getItem('draft_lane4') || shiftData.lane4 || '');
    const [showSummary, setShowSummary] = useState(shiftData.isShiftFinalized);
    const [isSavingShift, setIsSavingShift] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [pendingStoreLabel, setPendingStoreLabel] = useState("");
    const [pendingLabelImages, setPendingLabelImages] = useState<string[]>([]);
    const [pendingStoreLabels, setPendingStoreLabels] = useState<string[]>([]);
    const [viewingLabels, setViewingLabels] = useState<string[] | null>(null);
    const [orderFinishedData, setOrderFinishedData] = useState<any | null>(() => {
        const lastUser = localStorage.getItem('lastUser') || 'default';
        const saved = localStorage.getItem(`pending_order_${lastUser}`);
        return saved ? JSON.parse(saved) : null;
    });
    const [settingsTab, setSettingsTab] = useState<'ops' | 'rate' | 'ui' | 'updates' | 'data' | 'vault'>('ops');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPin, setNewUserPin] = useState('');
    const [adminUsersDb, setAdminUsersDb] = useState<any[] | null>(null);
    const [adminTargetRate, setAdminTargetRate] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [showRota, setShowRota] = useState(false);
    const [rotaEditMode, setRotaEditMode] = useState(false);
    const [selectedFutureDate, setSelectedFutureDate] = useState<Date | null>(null);
    const [viewingPastSummary, setViewingPastSummary] = useState<any | null>(null);
    const [storedShiftPhotos, setStoredShiftPhotos] = useState<any[]>([]);
    const [editingOrderIndex, setEditingOrderIndex] = useState<number | null>(null);
    const [editingOrderLabel, setEditingOrderLabel] = useState<string>('');

    useEffect(() => {
        if (viewingPastSummary) {
            const dateStr = normalizeDateStr(viewingPastSummary.date) || (viewingPastSummary.clockInTime ? getLocalDateString(new Date(viewingPastSummary.clockInTime)) : '');
            if (dateStr) {
                shiftDataService.getPhotosByShiftDate(dateStr, viewingPastSummary.userName).then(photos => {
                    setStoredShiftPhotos(photos || []);
                }).catch(() => setStoredShiftPhotos([]));
            } else {
                setStoredShiftPhotos([]);
            }
        } else {
            setStoredShiftPhotos([]);
        }
    }, [viewingPastSummary]);

    const handleSavePastOrderLabel = async (idxToSave: number) => {
        if (!viewingPastSummary || !viewingPastSummary.history) return;
        const newHist = [...viewingPastSummary.history];
        const newLabel = editingOrderLabel.trim().toUpperCase();
        newHist[idxToSave] = {
            ...newHist[idxToSave],
            storeLabel: newLabel
        };
        const updated = {
            ...viewingPastSummary,
            history: newHist
        };
        setViewingPastSummary(updated);
        setEditingOrderIndex(null);
        setEditingOrderLabel('');
        try {
            await saveShiftSummary(updated);
        } catch (e) {
            console.warn('Failed to persist updated order label:', e);
        }
    };
    const [rotaSubTab, setRotaSubTab] = useState<'calendar' | 'history'>('calendar');
    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoreText, setRestoreText] = useState('');
    const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
    const [showInstallTutorial, setShowInstallTutorial] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [leaderboardTab, setLeaderboardTab] = useState<'live' | 'prev_month'>('live');
    const [allShiftSummariesList, setAllShiftSummariesList] = useState<ShiftSummary[]>([]);
    const [fetchingMonthlyLeaderboard, setFetchingMonthlyLeaderboard] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    
    const [dbStorageStats, setDbStorageStats] = useState<DBStorageStats | null>(null);
    const [loadingDbStats, setLoadingDbStats] = useState(false);
    const [dbStatsError, setDbStatsError] = useState<string | null>(null);
    const [reclaimingSpace, setReclaimingSpace] = useState(false);
    const [spaceReclaimMsg, setSpaceReclaimMsg] = useState<string | null>(null);
    const [inactivityNotifsOn, setInactivityNotifsOn] = useState(() => areInactivityNotifsEnabled());
    const [showBetaSurvey, setShowBetaSurvey] = useState(false);
    const [monthlyReportNotif, setMonthlyReportNotif] = useState<{ isOpen: boolean; monthName: string; reportKey: string }>({
        isOpen: false,
        monthName: '',
        reportKey: ''
    });

    useEffect(() => {
        // Record user activity and initialize 3-day inactivity notification scheduler
        recordUserActivity();
        scheduleInactivityCheck();

        // Check if executive monthly report is ready for download
        const reportStatus = checkMonthlyReportNotification();
        if (reportStatus.isReady) {
            const isAdmin = isAdminUser(getCleanName()) || getCleanName() === 'ADMIN' || getCleanName() === 'DASERGHIE';
            if (isAdmin) {
                // Short timeout to allow initial dashboard load
                setTimeout(() => {
                    setMonthlyReportNotif({
                        isOpen: true,
                        monthName: reportStatus.monthName,
                        reportKey: reportStatus.reportKey
                    });
                }, 2000);
            }
        }
    }, []);

    const loadDbStorageStats = async () => {
        setLoadingDbStats(true);
        setDbStatsError(null);
        setSpaceReclaimMsg(null);
        try {
            const stats = await getDatabaseStorageStats(currentWarehouseId, shiftSummaries.length);
            setDbStorageStats(stats);
        } catch (error) {
            setDbStatsError("Could not retrieve storage metrics.");
        } finally {
            setLoadingDbStats(false);
        }
    };

    useEffect(() => {
        // 1. Instantly query shiftCacheService on boot to populate rota and history with 0 redundant reads
        const operatorName = (shiftData.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
        if (operatorName && operatorName !== 'ADMIN') {
            const currentYear = new Date().getFullYear();
            const currentMonth = new Date().getMonth() + 1;
            shiftCacheService.getMonthShifts(currentYear, currentMonth, operatorName).then(records => {
                if (records && records.length > 0) {
                    setShiftSummaries(prev => {
                        const existingMap = new Map(prev.map(p => [p.id || `${p.clockInTime}_${p.date}`, p]));
                        records.forEach(item => {
                            const key = item.id || `${item.clockInTime}_${item.date}`;
                            if (!existingMap.has(key)) {
                                existingMap.set(key, item as any);
                            }
                        });
                        return Array.from(existingMap.values());
                    });
                }
            }).catch(err => console.warn("Initial shift history cache load failed:", err));

            // Also load local rota config/overrides
            getLocalRota(operatorName).then(savedRota => {
                if (savedRota && (savedRota.rotaConfig || savedRota.rotaOverrides)) {
                    setShiftData((prev: any) => ({
                        ...prev,
                        rotaConfig: savedRota.rotaConfig ? { ...prev.rotaConfig, ...savedRota.rotaConfig } : prev.rotaConfig,
                        rotaOverrides: { ...(prev.rotaOverrides || {}), ...(savedRota.rotaOverrides || {}) }
                    }));
                }
            }).catch(err => console.warn("Initial local rota load failed:", err));
        }
    }, [shiftData.operator]);

    useEffect(() => {
        if (showSettings && settingsTab === 'data') {
            loadDbStorageStats();
        }
    }, [showSettings, settingsTab]);

    useEffect(() => {
        if (isAuthenticated && auth.currentUser) {
            const uid = auth.currentUser.uid;
            getUserProfile(uid).then(profile => {
                if (profile) {
                    const p = profile as UserProfile;
                    // Enforce role consistency locally
                    const userUpper = (p.username || '').toUpperCase();
                    if (userUpper === 'DASERGHIE' || userUpper === 'ADMIN') {
                        p.role = UserRole.ADMIN;
                    }
                    setUserProfile(p);

                    // Sync Firestore rotaOverrides and rotaConfig into local state
                    if (p.rotaOverrides || p.rotaConfig) {
                        setShiftData((prev: any) => {
                            const nextOverrides = { ...(prev.rotaOverrides || {}), ...(p.rotaOverrides || {}) };
                            const nextConfig = p.rotaConfig ? { ...prev.rotaConfig, ...p.rotaConfig } : prev.rotaConfig;
                            const updated = {
                                ...prev,
                                rotaConfig: nextConfig,
                                rotaOverrides: nextOverrides
                            };
                            const opName = (prev.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
                            safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
                            saveLocalRota(opName, nextConfig, nextOverrides);
                            return updated;
                        });
                    }
                } else {
                    // Profile does not exist in Firestore! Auto-provision it to prevent permission/query issues
                    const operatorName = shiftData.operator || localStorage.getItem('lastUser') || 'DASERGHIE';
                    const storedPin = localStorage.getItem(`offline_pin_${operatorName}`) || '000000';
                    const userUpper = operatorName.toUpperCase();
                    const role = (userUpper === 'DASERGHIE' || userUpper === 'ADMIN') ? UserRole.ADMIN : UserRole.USER;
                    
                    const newProfile: UserProfile = {
                        uid,
                        username: userUpper,
                        role,
                        level: shiftData.level || 1,
                        xp: shiftData.xp || 0,
                        achievements: shiftData.achievements || [],
                        selectedSkin: shiftData.selectedSkin || 'classic',
                        warehouseId: currentWarehouseId || 'MAIN',
                        hasSubmittedBetaFeedback: false
                    };
                    
                    saveUserProfile(uid, userUpper, storedPin, newProfile, sessionId).then(() => {
                        setUserProfile(newProfile);
                    });
                }
            });
        }
    }, [isAuthenticated]);

    // UI REORGANIZATION STATE
    const [activeScreen, setActiveScreen] = useState(0); // 0: Picking, 1: Performance

    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [liveUsers, setLiveUsers] = useState<any[]>([]);
    const [shiftSummaries, setShiftSummaries] = useState<ShiftSummary[]>([]);
    const [adminAllSummaries, setAdminAllSummaries] = useState<ShiftSummary[]>([]);
    const [showClockInModal, setShowClockInModal] = useState(false);
    const [manualClockType, setManualClockType] = useState<'in' | 'out'>('in');
    
    const [isAppBlocked, setIsAppBlocked] = useState(false);
    const [minAllowedVersion, setMinAllowedVersion] = useState('');
    const [consentUpdate, setConsentUpdate] = useState(false);
    const [shiftNotes, setShiftNotes] = useState(() => localStorage.getItem('draft_operatorNote') || '');
    // Ensure explicit check for 'true' string
    const [hasConsented, setHasConsented] = useState(() => localStorage.getItem('userConsented') === 'true');
    useEffect(() => {
        console.log("Has consented:", hasConsented);
    }, [hasConsented]);

    // Offline / Connection State
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [failedUploads, setFailedUploads] = useState<any[]>(() => {
        try {
            const saved = localStorage.getItem('failed_order_uploads');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    const retryFailedUploads = useCallback(async () => {
        try {
            const saved = localStorage.getItem('failed_order_uploads');
            const currentFailed = saved ? JSON.parse(saved) : [];
            if (currentFailed.length === 0 || !navigator.onLine) return;

            const remaining: any[] = [];
            let successCount = 0;

            for (const upload of currentFailed) {
                try {
                    const saveSuccess = await saveShiftSummary({
                        userName: upload.operator || "Unknown",
                        department: upload.entry.department || "Unknown",
                        zone: upload.entry.zone || "Unknown",
                        totalCases: upload.entry.totalCases || 1,
                        finalRate: upload.entry.rate,
                        activeSeconds: upload.entry.activeSeconds || 0,
                        totalSeconds: upload.entry.totalSeconds || 0,
                        breakSeconds: upload.entry.breakSeconds || 0,
                        steps: upload.entry.steps || 0,
                        date: upload.date,
                        history: upload.fullHistory,
                        labelImage: "",
                        storeLabel: upload.entry.storeLabel || "",
                        clockInTime: upload.entry.clockInTime || Date.now()
                    });

                    if (!saveSuccess) {
                        throw new Error("Save enqueuing failed");
                    }

                    if (upload.labelImages && upload.labelImages.length > 0) {
                        const { ref, uploadBytesResumable } = await import('firebase/storage');
                        const { storage } = await import('./lib/firebase');

                        for (let i = 0; i < upload.labelImages.length; i++) {
                            const img = upload.labelImages[i];
                            let blob: Blob;
                            const res = await fetch(img);
                            blob = await res.blob();

                            const storageRef = ref(storage, `labels/${upload.operator || 'unknown'}/${Date.now()}_label_retry_${i}.png`);
                            await uploadBytesResumable(storageRef, blob);
                        }
                    }
                    successCount++;
                } catch (err) {
                    remaining.push(upload);
                }
            }

            setFailedUploads(remaining);
            localStorage.setItem('failed_order_uploads', JSON.stringify(remaining));

            if (successCount > 0) {
                // Offline retry success handled silently.
            }
        } catch (e) {}
    }, []);

    useEffect(() => {
        const handleOnline = () => {
            setIsOffline(false);
            retryFailedUploads();
        };
        const handleOffline = () => setIsOffline(true);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [retryFailedUploads]);

    useEffect(() => {
        const checkVersion = async () => {
            const settings = await getGlobalSettings();
            if (settings.minAllowedVersion && isNewer(settings.minAllowedVersion, APP_VERSION)) {
                setIsAppBlocked(true);
                setMinAllowedVersion(settings.minAllowedVersion);
                return;
            }
            
            // Check remote version manifest on startup
            const update = await checkUpdate();
            if (update) {
                setAvailableUpdate(update);
                setIsAppBlocked(true);
                setMinAllowedVersion(update.version);
            }
        };
        checkVersion();
    }, []);

    // Attempt automatic retry of any local offline items on active app refocus / initialization
    useEffect(() => {
        if (navigator.onLine && failedUploads.length > 0) {
            retryFailedUploads();
        }
    }, [failedUploads, retryFailedUploads]);

    const [manualClockTime, setManualClockTime] = useState(() => {
        const d = new Date();
        return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    });
    const [availableUpdate, setAvailableUpdate] = useState<AppVersionInfo | null>(null);
    const [lastUpdateCheck, setLastUpdateCheck] = useState<number>(0);
    const [announcement, setAnnouncement] = useState<string>('');

    const mergedShiftSummaries = useMemo(() => {
        // Exclude ADMIN from calculations
        const opName = (shiftData.operator || '').toUpperCase().trim();
        if (opName === 'ADMIN') return [];

        const localKey = `offline_summaries_${opName}`;
        let localSaved: any[] = [];
        try {
            const existing = localStorage.getItem(localKey);
            if (existing) {
                localSaved = JSON.parse(existing);
            }
        } catch(e) {}

        const all = [...shiftSummaries].filter(s => (s.userName || '').toUpperCase().trim() === opName);
        localSaved.forEach((localItem: any) => {
            if ((localItem.userName || '').toUpperCase().trim() !== opName) return;
            
            const existsInRemote = all.some((remoteItem: any) => {
                if (localItem.clockInTime && remoteItem.clockInTime) {
                    return localItem.clockInTime === remoteItem.clockInTime;
                }
                return normalizeDateStr(remoteItem.date) === normalizeDateStr(localItem.date);
            });
            if (!existsInRemote) {
                all.push(localItem);
            }
        });

        RESTORED_SHIFTS.forEach((restoredItem: any) => {
            if ((restoredItem.userName || '').toUpperCase().trim() === opName || opName === 'DASERGHIE') {
                const existsInAll = all.some((item: any) => {
                    if (restoredItem.clockInTime && item.clockInTime) {
                        return Math.abs(restoredItem.clockInTime - item.clockInTime) < 60000;
                    }
                    return normalizeDateStr(item.date) === normalizeDateStr(restoredItem.date);
                });
                if (!existsInAll) {
                    all.push(restoredItem);
                }
            }
        });

        all.forEach(item => {
            if (!item.clockInTime) {
                if (item.date) {
                    const parsed = new Date(item.date.includes('T') ? item.date : `${item.date}T06:00:00`);
                    if (!isNaN(parsed.getTime())) {
                        item.clockInTime = parsed.getTime();
                    }
                } else if (item.timestamp?.seconds) {
                    item.clockInTime = item.timestamp.seconds * 1000;
                }
            }
            if (!item.clockOutTime) {
                if (item.clockInTime && (item.totalSeconds || item.activeSeconds)) {
                    const secs = item.totalSeconds || item.activeSeconds || 0;
                    item.clockOutTime = item.clockInTime + Math.round(secs * 1000);
                } else if (item.endTime) {
                    item.clockOutTime = item.endTime;
                }
            }
        });

        // Group by clockInTime first if available
        const clockInGroups: { [key: number]: any } = {};
        const withoutClockIn: any[] = [];

        all.forEach(item => {
            if (item.clockInTime) {
                const existing = clockInGroups[item.clockInTime];
                if (!existing) {
                    clockInGroups[item.clockInTime] = item;
                } else {
                    const existingCases = existing.totalCases || existing.cases || 0;
                    const itemCases = item.totalCases || item.cases || 0;
                    const existingHasOut = !!existing.clockOutTime;
                    const itemHasOut = !!item.clockOutTime;
                    if (itemCases > existingCases || (!existingHasOut && itemHasOut)) {
                        clockInGroups[item.clockInTime] = item;
                    }
                }
            } else {
                withoutClockIn.push(item);
            }
        });

        const combined = [...Object.values(clockInGroups), ...withoutClockIn];

        // Deduplication & Aggregation by normalized date (aggregating cases and order histories)
        const dateGroups: { [key: string]: any } = {};
        combined.forEach(item => {
            const normDate = normalizeDateStr(item.date) || (item.clockInTime ? getLocalDateString(new Date(item.clockInTime)) : '');
            if (!normDate || normDate.toLowerCase().includes('invalid')) return;
            
            const existingItem = dateGroups[normDate];
            if (!existingItem) {
                const initHist = item.history || [];
                const labelsSet = new Set<string>();
                if (item.storeLabel) {
                    item.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
                }
                initHist.forEach((h: any) => {
                    if (h.storeLabel) {
                        h.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
                    }
                });

                const imgSet = new Set<string>();
                if (item.labelImage) imgSet.add(item.labelImage);
                if (Array.isArray(item.labelImages)) item.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
                initHist.forEach((h: any) => {
                    if (h.labelImage) imgSet.add(h.labelImage);
                    if (Array.isArray(h.labelImages)) h.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
                });

                dateGroups[normDate] = { 
                    ...item, 
                    date: normDate,
                    totalCases: item.totalCases || item.cases || 0,
                    activeSeconds: item.activeSeconds || 0,
                    totalSeconds: item.totalSeconds || item.activeSeconds || 0,
                    storeLabel: Array.from(labelsSet).join(', '),
                    labelImage: item.labelImage || (Array.from(imgSet)[0] || ''),
                    labelImages: Array.from(imgSet),
                    history: initHist
                };
            } else {
                // Combine history arrays without duplicating orders
                const existingHist = existingItem.history || [];
                const itemHist = item.history || [];
                const combinedHist = [...existingHist];
                itemHist.forEach((h: any) => {
                    const isDup = combinedHist.some((eh: any) => 
                        (eh.id && h.id && eh.id === h.id) ||
                        (eh.timestamp && h.timestamp && eh.timestamp === h.timestamp) ||
                        (eh.start && h.start && eh.start === h.start && eh.finish && h.finish && eh.finish === h.finish && eh.cases === h.cases && eh.rate === h.rate)
                    );
                    if (!isDup) {
                        combinedHist.push(h);
                    }
                });
                existingItem.history = combinedHist;

                // Collect and merge all store labels
                const labelsSet = new Set<string>();
                if (existingItem.storeLabel) {
                    existingItem.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
                }
                if (item.storeLabel) {
                    item.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
                }
                combinedHist.forEach((h: any) => {
                    if (h.storeLabel) {
                        h.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
                    }
                });
                existingItem.storeLabel = Array.from(labelsSet).join(', ');

                // Collect and merge all label images
                const imgSet = new Set<string>();
                if (existingItem.labelImage) imgSet.add(existingItem.labelImage);
                if (Array.isArray(existingItem.labelImages)) existingItem.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
                if (item.labelImage) imgSet.add(item.labelImage);
                if (Array.isArray(item.labelImages)) item.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
                combinedHist.forEach((h: any) => {
                    if (h.labelImage) imgSet.add(h.labelImage);
                    if (Array.isArray(h.labelImages)) h.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
                });
                existingItem.labelImages = Array.from(imgSet);
                if (!existingItem.labelImage && existingItem.labelImages.length > 0) {
                    existingItem.labelImage = existingItem.labelImages[0];
                }

                // Calculate total cases safely
                const histCases = combinedHist.reduce((acc: number, h: any) => acc + (parseInt(h.cases) || 0), 0);
                existingItem.totalCases = Math.max(existingItem.totalCases || 0, item.totalCases || item.cases || 0, histCases);

                // Active and Total Seconds (FIX: take max of shift snapshots / history duration to avoid doubling)
                const histActiveSecs = combinedHist.reduce((acc: number, h: any) => {
                    let elapsed = h.elapsedSeconds;
                    if (elapsed === undefined || isNaN(elapsed)) {
                        const hRate = parseFloat(h.rate);
                        elapsed = (hRate > 0 && h.cases > 0) ? Math.round((h.cases / hRate) * 3600) : 0;
                    }
                    return acc + (elapsed || 0);
                }, 0);

                const maxActive = Math.max(existingItem.activeSeconds || 0, item.activeSeconds || 0, histActiveSecs);
                existingItem.activeSeconds = maxActive;

                const maxTotal = Math.max(existingItem.totalSeconds || 0, item.totalSeconds || 0, existingItem.activeSeconds);
                existingItem.totalSeconds = maxTotal;

                existingItem.steps = Math.max(existingItem.steps || 0, item.steps || 0);

                if (item.clockInTime && (!existingItem.clockInTime || item.clockInTime < existingItem.clockInTime)) {
                    existingItem.clockInTime = item.clockInTime;
                }
                if (item.clockOutTime && (!existingItem.clockOutTime || item.clockOutTime > existingItem.clockOutTime)) {
                    existingItem.clockOutTime = item.clockOutTime;
                }

                existingItem.finalRate = existingItem.activeSeconds > 0 
                    ? Math.round((existingItem.totalCases / existingItem.activeSeconds) * 3600) 
                    : Math.max(existingItem.finalRate || 0, item.finalRate || 0);
            }
        });

        const deduplicated = Object.values(dateGroups);

        return deduplicated.sort((a: any, b: any) => {
            const aTime = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : (a.clockOutTime || a.clockInTime || 0);
            const bTime = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : (b.clockOutTime || b.clockInTime || 0);
            return bTime - aTime;
        });
    }, [shiftSummaries, shiftData.operator]);

    const isShiftFinalized = shiftData.isShiftFinalized;
    const finalizedStats = shiftData.finalizedStats;
    const [pinModal, setPinModal] = useState<{show: boolean, type: 'clear' | 'reset' | 'purge', input: string}>({ show: false, type: 'clear', input: '' });
    
    useEffect(() => {
        // Check if user dismissed it previously
        const hasDismissed = localStorage.getItem('hideInstallTutorial');
        
        // PWA Standalone check
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        
        // Also check if we are in local dev, ignore if so (optional)
        if (!hasDismissed && !isStandalone) {
            // Show it after a short delay so the app UI loads first
            const timer = setTimeout(() => {
                setShowInstallTutorial(true);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handlers = useSwipeable({
        onSwipedLeft: () => { if (!showSettings && !pinModal.show && !showHistory) setActiveScreen(1); },
        onSwipedRight: () => { if (!showSettings && !pinModal.show && !showHistory) setActiveScreen(0); },
        preventScrollOnSwipe: !showSettings && !pinModal.show && !showHistory,
        trackMouse: true
    });
    
    const tempGap = shiftData.tempGap;
    
    // Beta Feedback Gate Logic
    const [betaFeedbackData, setBetaFeedbackData] = useState({
        ergonomics: 0,
        resilience: '',
        motivation: 3,
        notes: ''
    });
    const [submittingBetaFeedback, setSubmittingBetaFeedback] = useState(false);
    const [statsMode, setStatsMode] = useState<'dept' | 'shift'>('dept');

    const requiresBetaFeedback = useMemo(() => {
        if (!isAuthenticated || !userProfile || isUserAdmin()) return false;
        if (userProfile.hasSubmittedBetaFeedback) return false;
        if (mergedShiftSummaries.length >= 14) return true;
        return false; // Not yet 14 shifts
    }, [isAuthenticated, userProfile, isUserAdmin, mergedShiftSummaries.length]);

    const stats = usePerformanceStats(
        shiftData, 
        shiftData.isShiftFinalized && shiftData.endTime ? new Date(shiftData.endTime) : now, 
        targetRate,
        warehouseConfig
    );
    const { 
        rate, isRateGood, net, isNetGood, consistencyPercent, 
        shiftBestRate, trendData, finishTime, isWarning, 
        activeElapsedSeconds, totalShiftSeconds, totalBreakSeconds,
        finalExemption, isAisles, accruedPrep, accruedDinner, accruedCleanup,
        byDepartment
    } = stats;

    const currentDeptStats = useMemo(() => {
        if (byDepartment) {
            const deptKey = shiftData.department || 'Aisles';
            if (byDepartment[deptKey]) return byDepartment[deptKey];
            const normKey = deptKey.toLowerCase().trim();
            const foundKey = Object.keys(byDepartment).find(k => 
                k.toLowerCase().trim() === normKey || 
                normKey.includes(k.toLowerCase().trim()) || 
                k.toLowerCase().trim().includes(normKey)
            );
            if (foundKey && byDepartment[foundKey]) return byDepartment[foundKey];
        }
        return {
            cases: 0,
            activeElapsedSeconds: 0,
            rate: 0,
            net: 0,
            isRateGood: false,
            isNetGood: false,
            targetRate: targetRate,
            breakSeconds: 0
        };
    }, [byDepartment, shiftData.department, targetRate]);

    const activeRate = statsMode === 'dept' ? currentDeptStats.rate : rate;
    const activeNet = statsMode === 'dept' ? currentDeptStats.net : net;
    const activeCases = statsMode === 'dept' ? currentDeptStats.cases : shiftData.totalCases;
    const activeElapsed = statsMode === 'dept' ? currentDeptStats.activeElapsedSeconds : activeElapsedSeconds;
    const activeIsRateGood = statsMode === 'dept' ? currentDeptStats.isRateGood : isRateGood;
    const activeIsNetGood = statsMode === 'dept' ? currentDeptStats.isNetGood : isNetGood;
    const activeTargetRate = statsMode === 'dept' ? currentDeptStats.targetRate : targetRate;
    const activeBreakTime = statsMode === 'dept' ? currentDeptStats.breakSeconds : totalBreakSeconds;

    const announce = useCallback((text: string) => {
        if (!text) return;
        setAnnouncement(text + " ");
        // Ensure the announcement clears after a delay
        setTimeout(() => setAnnouncement(''), 4000);
    }, []);

    const toggleVoice = (active: boolean) => {
        haptic('light');
        setShiftData({ ...shiftData, voiceEnabled: active });
        if (active) {
            setTimeout(() => announce("Assistant active. Guidance and pace tracking enabled."), 500);
        }
    };

    const lastAnnouncedRate = useRef(0);
    useEffect(() => {
        if (shiftData.voiceEnabled && rate > 0) {
            const milestone = Math.floor(rate / 50) * 50;
            if (milestone >= 150 && milestone > lastAnnouncedRate.current) {
                announce(`Awesome pace! Your current rate is ${milestone} cases per hour.`);
                lastAnnouncedRate.current = milestone;
            }
        }
        // Reset if rate drops significantly or shift restarts
        if (rate < 50) lastAnnouncedRate.current = 0;
    }, [rate, shiftData.voiceEnabled, announce]);

    const zoneXP = useMemo(() => {
        const xp: Record<string, number> = { AMBIENT: 0, CHILLER: 0, FREEZER: 0 };
        liveUsers.forEach(u => {
            const z = (u.zone as string) || 'AMBIENT';
            if (xp[z] !== undefined) xp[z] += (Number(u.xp) || 0);
        });
        if (shiftData.xp) {
            const currentZ = (shiftData.zone as string) || 'AMBIENT';
            if (xp[currentZ] !== undefined) {
                xp[currentZ] += Number(shiftData.xp);
            }
        }
        return xp;
    }, [liveUsers, shiftData.xp, shiftData.zone]);

    // --- Shared Calculations memoized to prevent recalculation on every second tick ---

        



    const [toast, setToast] = useState<{message: string, type: 'error' | 'success' | 'info'} | null>(null);

    const showToast = useCallback((message: string, type: 'error' | 'success' | 'info' = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    }, []);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error("Caught error:", event.error);
            showToast("Critical UI Error detected: " + (event.error?.message || "Verify data integrity"), "error");
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            console.error("Sync failure detected:", event.reason);
            showToast("Data sync pending or interrupted. Connection unstable.", "error");
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [showToast]);

    const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, isAlert?: boolean, onConfirm: () => void, onCancel: () => void} | null>(null);

    // Forensic Helper: Safe Local Storage with Quota Monitoring
    const safeLocalStorage = useMemo(() => ({
        setItem: (key: string, value: string, isCritical = false) => {
            try {
                localStorage.setItem(key, value);
            } catch (e) {
                if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                    console.error("Storage Quota Exceeded for key:", key);
                    if (isCritical) {
                        setConfirmDialog({
                            title: "🚨 STORAGE CRITICALLY FULL",
                            message: "Your device storage is full. PickApp cannot save your shift details. Please clear your browser cache or delete old history in Settings > Data.",
                            isAlert: true,
                            onConfirm: () => setConfirmDialog(null),
                            onCancel: () => setConfirmDialog(null)
                        });
                    } else {
                        showToast("Local cache full. History pruning recommended.", "error");
                    }
                }
            }
        },
        getItem: (key: string) => localStorage.getItem(key),
        removeItem: (key: string) => localStorage.removeItem(key)
    }), [showToast]);
    const rateRef = useRef(rate);
    const activeElapsedSecondsRef = useRef(activeElapsedSeconds);
    const totalCasesRef = useRef(shiftData.totalCases);
    useEffect(() => {
        rateRef.current = rate;
        activeElapsedSecondsRef.current = activeElapsedSeconds;
        totalCasesRef.current = shiftData.totalCases;
    }, [rate, activeElapsedSeconds, shiftData.totalCases]);

    const refreshLeaderboard = useCallback(async (force: boolean = false) => {
        if (!currentWarehouseId || !firebaseUser) return;
        try {
            const users = await fetchLiveUsers(currentWarehouseId, force);
            setLiveUsers(users);
        } catch (e) {
            console.error("Failed to refresh live users:", e);
        }
    }, [currentWarehouseId, firebaseUser]);

    useEffect(() => {
        refreshLeaderboard();
    }, [refreshLeaderboard]);

    useEffect(() => {
        if (settingsTab === 'admin' && isUserAdmin()) {
            getWarehouseSettings(currentWarehouseId).then(data => {
                if(data && data.globalTargetRate) {
                    setAdminTargetRate(data.globalTargetRate.toString());
                }
            });
        }
    }, [settingsTab, currentWarehouseId]);

    useEffect(() => {
        // Heartbeat suppressed to comply with Quota Guardian protocol.
        // updateLiveStatus will now be called only on direct state changes or user-initiated actions.
        if (shiftData.operator && !isShiftFinalized) {
            const sendUpdate = () => {
                const currentStatus: 'picking' | 'idle' | 'break' | 'finished' = isOnBreak 
                    ? 'break' 
                    : (isPicking ? 'picking' : 'idle');

                updateLiveStatus(
                    shiftData.operator, 
                    rateRef.current, 
                    currentDept?.name || 'Waiting...', 
                    true,
                    { 
                        totalCases: totalCasesRef.current, 
                        activeSeconds: activeElapsedSecondsRef.current,
                        steps: shiftData.steps,
                        xp: shiftData.xp,
                        status: currentStatus,
                        targetRate: shiftData.customTargetRate || currentDept?.target || 200,
                        currentOrder: shiftData.storeLabel || "",
                        customStatus: shiftData.customStatus || "",
                        listeningTo: shiftData.listeningTo || ""
                    }
                );
            };
            
            sendUpdate();
            // BACKGROUND INTERVAL REMOVED
        } else if (isShiftFinalized && shiftData.operator) {
            updateLiveStatus(shiftData.operator, rateRef.current, currentDept?.name || 'UNKNOWN', false, {
                totalCases: totalCasesRef.current,
                activeSeconds: activeElapsedSecondsRef.current,
                steps: shiftData.steps,
                xp: shiftData.xp,
                status: 'finished'
            });
        }
    }, [isPicking, isOnBreak, isShiftFinalized, shiftData.firstStartTime, shiftData.operator, shiftData.department, shiftData.customStatus, shiftData.listeningTo]);
    useEffect(() => {
        const today = getLocalDateString(new Date());
        
        // Auto-Reset logic: if lastDate was a different day AND the shift was not finalized
        // OR it's been more than 12 hours since lastStopTimestamp, reset to start fresh.
        if (shiftData.lastDate && shiftData.lastDate !== today) {
            const lastActive = shiftData.lastStopTimestamp || (shiftData.firstStartTime || 0);
            const hoursSinceActive = (now.getTime() - lastActive) / (1000 * 3600);
            
            if (hoursSinceActive > 8 || !shiftData.firstStartTime) {
                // New day reset
                setShiftData((prev: any) => {
                    let newStreak = 1;
                    if (prev.lastDate) {
                        try {
                            const prevDate = new Date(prev.lastDate); // e.g. "2026-06-08" -> UTC midnight
                            const todayDate = new Date(today); // "2026-06-09" -> UTC midnight
                            const daysDiff = Math.round((todayDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
                            if (daysDiff === 1) {
                                newStreak = (prev.streak || 0) + 1;
                            }
                        } catch(e) {}
                    }
                    return {
                        ...prev,
                        totalCases: 0,
                        firstStartTime: null,
                        totalExcludedTime: 0,
                        history: [],
                        steps: 0,
                        lastStopTimestamp: null,
                        isShiftFinalized: false,
                        finalizedStats: null,
                        streak: newStreak,
                        lastDate: today
                    };
                });
            } else {
                // Same shift crossing midnight
                setShiftData((prev: any) => ({ ...prev, lastDate: today }));
            }
        } else if (!shiftData.lastDate) {
            setShiftData((prev: any) => ({ ...prev, lastDate: today, streak: 1 }));
        }
    }, []);

    const getCleanName = () => {
        if (shiftData.operator) return shiftData.operator.toUpperCase();
        if (auth.currentUser?.displayName) return auth.currentUser.displayName.split(' ')[0].toUpperCase();
        if (auth.currentUser?.email) return auth.currentUser.email.split('@')[0].split('.')[0].toUpperCase();
        return 'UNKNOWN';
    };

    // Modular Update Check via Remote Manifest
    useEffect(() => {
        const performCheck = async () => {
            const update = await checkUpdate();
            if (update) {
                setAvailableUpdate(update);
                setIsAppBlocked(true);
                setMinAllowedVersion(update.version);
            }
            setLastUpdateCheck(Date.now());
        };
        performCheck();
        // AUTO-POLLING REMOVED
    }, []);

    // Database RECORD management only on explicit auth
    useEffect(() => {
        if (isAuthenticated) {
            // Purge restricted to once per day or manually if possible
        }
    }, [isAuthenticated]);

    const getDuoMessage = () => {
        const name = getCleanName();
        const now = new Date();
        const time = now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0');
        
        let pool = [...DUO_MESSAGES.NEUTRAL];
        
        if (rate >= targetRate) {
            pool = DUO_MESSAGES.TARGET_ACHIEVED;
        } else if (Math.random() < 0.2) { // lowered chance for time messages
            pool = DUO_MESSAGES.TIME;
        } else if (rate >= targetRate + 20) {
            pool = DUO_MESSAGES.MOTIVATIONAL;
        } else if (rate < targetRate - 10) {
            pool = DUO_MESSAGES.CRITICAL;
        }
        
        const msg = pool[Math.floor(Math.random() * pool.length)];
        return msg.replace('{name}', name)
                  .replace('{target}', targetRate.toString())
                  .replace('{rate}', rate.toString())
                  .replace('{time}', time);
    };

    const [duoMessage, setDuoMessage] = useState(getDuoMessage);
    const [wakeLockError, setWakeLockError] = useState<string | null>(null);
    const isInIframe = useMemo(() => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }, []);

    // --- Wake Lock Management ---
    useEffect(() => {
        const handleWakeLock = async () => {
            if (shiftData.wakeLock && 'wakeLock' in navigator && isAuthenticated) {
                try {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                    setWakeLockError(null);
                    wakeLockRef.current.addEventListener('release', () => {
                        // Wake lock released
                    });
                } catch (err: any) {
                    // Error during operation.
                    setWakeLockError(err.message);
                }
            } else {
                if (wakeLockRef.current) {
                    wakeLockRef.current.release();
                    wakeLockRef.current = null;
                }
                setWakeLockError(null);
            }
        };

        handleWakeLock();

        // Re-acquire lock if page becomes visible again
        const handleVisibility = () => {
            if (document.visibilityState === 'visible' && shiftData.wakeLock) {
                handleWakeLock();
            }
        };

        document.addEventListener('visibilitychange', handleVisibility);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibility);
            if (wakeLockRef.current) wakeLockRef.current.release();
        };
    }, [shiftData.wakeLock, isAuthenticated]);

    // --- Background "Catch Up" logic ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                setNow(new Date()); // Force immediate update
                // If they were away for a while, show a helpful message
                // App resumed from background
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    useEffect(() => {
        if (isPicking) {
            setDuoMessage(getDuoMessage());
            const interval = setInterval(() => {
                setDuoMessage(getDuoMessage());
            }, 30000); 
            return () => clearInterval(interval);
        }
    }, [isPicking, shiftData.operator]);
    
    const lastStepTime = useRef(0);

    useEffect(() => {
        const interval = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(interval);
    }, []);

    // Background steps backup synchronization (pulls dynamically from localStorage drafts so counts do not freeze when phone is pocketed/locked)
    useEffect(() => {
        const interval = setInterval(() => {
            if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
                const backupRaw = localStorage.getItem('shiftStepBackup');
                if (backupRaw !== null) {
                    const backupSteps = parseInt(backupRaw, 10);
                    if (!isNaN(backupSteps) && backupSteps !== shiftData.steps) {
                        setShiftData((prev: any) => ({ ...prev, steps: backupSteps }));
                    }
                }
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [shiftData.firstStartTime, shiftData.isShiftFinalized, shiftData.steps]);

    useEffect(() => {
        if (isPicking && pickStartTime && caseCount && !isOnBreak) {
            const parsedCases = parseInt(caseCount);
            if (isNaN(parsedCases)) return;

            const targetSeconds = stats.currentTargetSeconds;
            const currentBreak = (isOnBreak && breakStartTime) ? (now.getTime() - breakStartTime) / 1000 : 0;
            const totalCurrentBreaks = breakTimeDuringCurrentPick + currentBreak;
            const elapsed = (now.getTime() - pickStartTime - (totalCurrentBreaks * 1000)) / 1000;
            
            // Halfway alert (e.g. at 2.5 mins if target is 5 mins)
            if (targetSeconds > 300 && elapsed >= (targetSeconds / 2) && !shiftData.hasHalfwayAlerted) {
                updateShiftData({ hasHalfwayAlerted: true });
                setAnnouncement("You have passed the halfway point of this order. Keep up the pace!");
            }

            // 10 minutes left alert
            if (targetSeconds > 600 && stats.timeRemainingSecs <= 600 && stats.timeRemainingSecs > 0 && !hasAlerted) {
                // Ensure we don't alert immediately on start
                if (elapsed > 30) {
                    updateShiftData({ hasAlerted: true });
                    setAnnouncement("Ten minutes remaining to finish the order on target.");
                    if (shiftData.haptic === 'on') {
                        if (navigator.vibrate) navigator.vibrate([300, 150, 300, 150, 500]);
                        playAlertSound('large');
                    }
                }
            }
        }
    }, [now, isPicking, pickStartTime, caseCount, hasAlerted, shiftData.hasHalfwayAlerted, stats.currentTargetSeconds, stats.timeRemainingSecs, breakTimeDuringCurrentPick, isOnBreak, breakStartTime, shiftData.haptic]);

    useEffect(() => {
        if (!isPicking && !isOnBreak && shiftData.lastStopTimestamp && shiftData.firstStartTime) {
            const gapElapsed = (now.getTime() - shiftData.lastStopTimestamp) / 1000;
            if (gapElapsed >= 180) {
                // Alert every 60s if the gap is >= 180s
                if (!shiftData.lastGapAlertTimestamp || (now.getTime() - shiftData.lastGapAlertTimestamp) >= 60000) {
                    updateShiftData({ lastGapAlertTimestamp: now.getTime() });
                    if (shiftData.haptic === 'on') {
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                        playGentleBeep();
                    }
                }
            }
        }
    }, [now, isPicking, isOnBreak, shiftData.lastStopTimestamp, shiftData.haptic, shiftData.firstStartTime, shiftData.lastGapAlertTimestamp]);

    useEffect(() => {
        const dataToSave = {
            ...shiftData,
            caseCount,
            lane1,
            lane2,
            lane3,
            lane4
        };
        const rawJson = JSON.stringify(dataToSave);
        if (shiftData.operator) {
            safeLocalStorage.setItem(`pickData_${shiftData.operator}`, rawJson, true);
            safeLocalStorage.setItem('lastUser', shiftData.operator);
            Preferences.set({ key: `pickData_${shiftData.operator}`, value: rawJson }).catch(e => { /* Silently fail */ });
            Preferences.set({ key: 'lastUser', value: shiftData.operator }).catch(e => { /* Silently fail */ });
        } else {
            safeLocalStorage.setItem('pickData', rawJson, true);
            Preferences.set({ key: 'pickData', value: rawJson }).catch(e => { /* Silently fail */ });
        }
    }, [shiftData, caseCount, lane1, lane2, lane3, lane4]);

    useEffect(() => {
        const draftL1 = localStorage.getItem('draft_lane1');
        setLane1(draftL1 !== null ? draftL1 : (shiftData.lane1 || ''));
        
        const draftL2 = localStorage.getItem('draft_lane2');
        setLane2(draftL2 !== null ? draftL2 : (shiftData.lane2 || ''));
        
        const draftL3 = localStorage.getItem('draft_lane3');
        setLane3(draftL3 !== null ? draftL3 : (shiftData.lane3 || ''));
        
        const draftL4 = localStorage.getItem('draft_lane4');
        setLane4(draftL4 !== null ? draftL4 : (shiftData.lane4 || ''));
        
        const draftNote = localStorage.getItem('draft_operatorNote');
        setShiftNotes(draftNote !== null ? draftNote : (shiftData.operatorNote || ''));
    }, [shiftData.operator]);

    useEffect(() => {
        const usernameKey = shiftData.operator || 'default';
        if (orderFinishedData) {
            localStorage.setItem(`pending_order_${usernameKey}`, JSON.stringify(orderFinishedData));
        } else {
            localStorage.removeItem(`pending_order_${usernameKey}`);
        }
    }, [orderFinishedData, shiftData.operator]);

    const [fetchingLeaderboard, setFetchingLeaderboard] = useState(false);
    const [fetchingSummaries, setFetchingSummaries] = useState(false);

    const fetchLeaderboardManual = useCallback(async (force: boolean = false) => {
        if (!firebaseUser) return;
        setFetchingLeaderboard(true);
        try {
            const warehouseId = shiftData.warehouseId || 'MAIN';
            const entries = await fetchLeaderboard(warehouseId, force);
            setLeaderboardData(entries);
            const live = await fetchLiveUsers(warehouseId);
            setLiveUsers(live);
            
            // Also fetch all shift summaries for historical month breakdown
            fetchAllShiftSummaries(force).then(allSummaries => {
                if (allSummaries && allSummaries.length > 0) {
                    setAllShiftSummariesList(allSummaries);
                }
            }).catch(e => console.warn("All shift summaries fetch error:", e));
        } catch (e) {
            console.error("Leaderboard fetch failed", e);
        } finally {
            setFetchingLeaderboard(false);
        }
    }, [shiftData.warehouseId, firebaseUser?.uid]);

    const fetchSummariesManual = useCallback(async (force: boolean = false) => {
        if (!shiftData.operator || !firebaseUser) return;
        setFetchingSummaries(true);
        try {
            const summaries = await fetchShiftSummaries(shiftData.operator, force);
            setShiftSummaries(summaries);
        } catch (e) {
            console.error("Summaries fetch failed", e);
        } finally {
            setFetchingSummaries(false);
        }
    }, [shiftData.operator, firebaseUser?.uid]);

    const fetchAdminSummariesManual = useCallback(async (force: boolean = false) => {
        if (!isUserAdmin() || !firebaseUser) return;
        try {
            const summaries = await fetchAllShiftSummaries(force);
            setAdminAllSummaries(summaries);
        } catch (e) {
            console.error("Admin summaries fetch failed", e);
        }
    }, [firebaseUser?.uid, userProfile]);

    // Background Auto-Refresh to sync Leaderboard and statistics within Quota Guardian guidelines
    useEffect(() => {
        if (!isAuthenticated || !firebaseUser) return;

        const refreshAllStats = () => {
            fetchLeaderboardManual(false);
            fetchSummariesManual(false);
            fetchWarehouseConfigManual(false);
            if (isUserAdmin()) {
                fetchAdminSummariesManual(false);
            }
        };

        // Perform initial fetch on mount/auth
        refreshAllStats();

        // Setup real-time automatic onSnapshot subscriptions
        const warehouseId = shiftData.warehouseId || 'MAIN';
        
        const unsubscribeLive = subscribeToLiveUsers(warehouseId, (users) => {
            setLiveUsers(users);
        });

        const unsubscribeLeaderboard = subscribeToLeaderboard(warehouseId, (entries) => {
            setLeaderboardData(entries);
        });

        // 1. Set up the 20-minute refresh interval for general statistics and configurations
        const interval = setInterval(() => {
            fetchSummariesManual(false);
            fetchWarehouseConfigManual(false);
            if (isUserAdmin()) {
                fetchAdminSummariesManual(false);
            }
        }, 20 * 60 * 1000);

        return () => {
            clearInterval(interval);
            unsubscribeLive();
            unsubscribeLeaderboard();
        };
    }, [isAuthenticated, firebaseUser?.uid, shiftData.warehouseId, fetchLeaderboardManual, fetchSummariesManual, fetchWarehouseConfigManual, fetchAdminSummariesManual]);

    // Programmatic Auto-Cleanup and Missing Shift Recovery
    useEffect(() => {
        const op = (shiftData.operator || '').toUpperCase().trim();
        if (op) {
            // Deduplicator: Checking shift history health for active operator
            
            const localHistKey = `shift_history_${op}`;
            const localOfflineKey = `offline_summaries_${op}`;
            
            let histSaved: any[] = [];
            let offlineSaved: any[] = [];
            
            try {
                const h = localStorage.getItem(localHistKey);
                if (h) histSaved = JSON.parse(h);
            } catch(e) {}
            
            try {
                const o = localStorage.getItem(localOfflineKey);
                if (o) offlineSaved = JSON.parse(o);
            } catch(e) {}

            if (op === 'DASERGHIE') {
                // Check if we have an entry for 2026-06-04
                const hasJune4Hist = histSaved.some(s => normalizeDateStr(s.date) === '2026-06-04');
                const hasJune4Offline = offlineSaved.some(s => normalizeDateStr(s.date) === '2026-06-04');
                
                if (!hasJune4Hist || !hasJune4Offline) {
                    const seedShift = {
                        userId: "RjrzMTQa3BZv4hbgB0bXE5wQmjq1",
                        userName: "DASERGHIE",
                        department: "Ambient Zone",
                        zone: "ambient",
                        totalCases: 1420,
                        finalRate: 235,
                        activeSeconds: 21750,
                        totalSeconds: 28800,
                        breakSeconds: 7050,
                        steps: 12250,
                        date: "2026-06-04",
                        history: [],
                        storeLabel: "D4",
                        clockInTime: new Date("2026-06-04T18:55:00.000Z").getTime(),
                        clockOutTime: new Date("2026-06-05T02:55:00.000Z").getTime(),
                        timestamp: { seconds: Math.floor(new Date("2026-06-05T03:00:00.000Z").getTime() / 1000) }
                    };
                    
                    if (!hasJune4Hist) {
                        histSaved.unshift(seedShift);
                        localStorage.setItem(localHistKey, JSON.stringify(histSaved));
                    }
                    if (!hasJune4Offline) {
                        offlineSaved.unshift(seedShift);
                        localStorage.setItem(localOfflineKey, JSON.stringify(offlineSaved));
                    }
                    
                    saveShiftSummary(seedShift).then(() => {});
                }
            }

            // Perform date-based aggregation: Combine matching date entries instead of throwing secondary shifts away!
            const cleanList = (arr: any[]) => {
                const dateGroups: { [key: string]: any } = {};
                arr.forEach(item => {
                    if (!item) return;
                    const normDate = normalizeDateStr(item.date) || (item.clockInTime ? getLocalDateString(new Date(item.clockInTime)) : '');
                    if (!normDate || normDate.toLowerCase().includes('invalid')) return;
                    
                    const itemClockIn = item.clockInTime || (item.date ? new Date(item.date.includes('T') ? item.date : `${item.date}T06:00:00`).getTime() : (item.timestamp?.seconds ? item.timestamp.seconds * 1000 : undefined));
                    const itemClockOut = item.clockOutTime || (itemClockIn && (item.totalSeconds || item.activeSeconds) ? itemClockIn + Math.round((item.totalSeconds || item.activeSeconds || 0) * 1000) : undefined);
                    
                    const existingItem = dateGroups[normDate];
                    if (!existingItem) {
                        dateGroups[normDate] = { 
                            ...item, 
                            date: normDate,
                            clockInTime: itemClockIn,
                            clockOutTime: itemClockOut,
                            history: item.history || [] 
                        };
                    } else {
                        const existingHist = existingItem.history || [];
                        const itemHist = item.history || [];
                        const combinedHist = [...existingHist];
                        itemHist.forEach((h: any) => {
                            const isDup = combinedHist.some((eh: any) => 
                                (eh.storeLabel && h.storeLabel && eh.storeLabel === h.storeLabel && eh.cases === h.cases) ||
                                (eh.timestamp && h.timestamp && eh.timestamp === h.timestamp)
                            );
                            if (!isDup) {
                                combinedHist.push(h);
                            }
                        });
                        existingItem.history = combinedHist;

                        const histCases = combinedHist.reduce((acc: number, h: any) => acc + (parseInt(h.cases) || 0), 0);
                        const rawSumCases = (existingItem.totalCases || 0) + (item.totalCases || item.cases || 0);

                        if (combinedHist.length > existingHist.length) {
                            existingItem.totalCases = Math.max(histCases, rawSumCases);
                        } else {
                            existingItem.totalCases = Math.max(existingItem.totalCases || 0, item.totalCases || item.cases || 0, histCases);
                        }

                        existingItem.activeSeconds = Math.max(existingItem.activeSeconds || 0, item.activeSeconds || 0, (existingItem.activeSeconds || 0) + (item.activeSeconds || 0));
                        existingItem.breakSeconds = Math.max(existingItem.breakSeconds || 0, item.breakSeconds || 0);
                        existingItem.steps = Math.max(existingItem.steps || 0, item.steps || 0);
                        existingItem.totalSeconds = Math.max(existingItem.totalSeconds || 0, item.totalSeconds || 0);
                        
                        if (itemClockIn && (!existingItem.clockInTime || itemClockIn < existingItem.clockInTime)) {
                            existingItem.clockInTime = itemClockIn;
                        }
                        if (itemClockOut && (!existingItem.clockOutTime || itemClockOut > existingItem.clockOutTime)) {
                            existingItem.clockOutTime = itemClockOut;
                        } else if (!existingItem.clockOutTime && existingItem.clockInTime && existingItem.totalSeconds) {
                            existingItem.clockOutTime = existingItem.clockInTime + Math.round(existingItem.totalSeconds * 1000);
                        }
                        existingItem.finalRate = existingItem.activeSeconds > 0 
                            ? Math.round((existingItem.totalCases / existingItem.activeSeconds) * 3600) 
                            : existingItem.finalRate;
                    }
                });
                return Object.values(dateGroups);
            };

            const cleanHist = cleanList(histSaved);
            const cleanOffline = cleanList(offlineSaved);

            localStorage.setItem(localHistKey, JSON.stringify(cleanHist));
            localStorage.setItem(localOfflineKey, JSON.stringify(cleanOffline));
        }
    }, [shiftData.operator, shiftSummaries]);

    const haptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
        deviceHaptic(type);
    };

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            // AuthState changed
            const isSessionAuth = sessionStorage.getItem('session_authenticated') === 'true';
            if (user) {
                if (!isSessionAuth) {
                    // Force logout of Firebase to prompt for PIN credentials entry on fresh startup
                    try {
                        await signOut(auth);
                    } catch (signOutErr) {}
                    setFirebaseUser(null);
                    setIsAuthenticated(false);
                    return;
                }
                setFirebaseUser(user);
                
                // Simultaneous session check
                const profile = await getUserProfile(user.uid);
                if (profile && profile.activeSessionId && profile.activeSessionId !== sessionId) {
                    await signOut(auth);
                    setIsAuthenticated(false);
                    setFirebaseUser(null);
                    alert("Logged in from another device.");
                    return;
                }

                const opName = shiftData.operator || localStorage.getItem('lastUser') || (user.email ? user.email.split('@')[0].toUpperCase() : '');
                setIsAuthenticated(true);
                if (opName) {
                    await saveUserProfile(user.uid, opName, null, { 
                        level: shiftData.level, 
                        xp: shiftData.xp, 
                        achievements: shiftData.achievements, 
                        selectedSkin: shiftData.selectedSkin 
                    }, sessionId);
                }
            } else {
                setFirebaseUser(null);
                if (!isSessionAuth) {
                    // Do not auto-login with archived credentials on a fresh session startup
                    setIsAuthenticated(false);
                } else {
                    // We have an active local session but Firebase Auth has no user.
                    // Automatically re-authenticate in the background to ensure permissions match.
                    const lastUser = shiftData.operator || localStorage.getItem('lastUser');
                    if (lastUser) {
                        const cachedPin = localStorage.getItem(`offline_pin_${lastUser.toUpperCase()}`);
                        if (cachedPin) {
                            const email = lastUser.includes('@') ? lastUser.toLowerCase() : `${lastUser.toLowerCase()}@pick.app`;
                            const authPin = cachedPin.length < 6 ? cachedPin.padEnd(6, '0') : cachedPin;
                            try {
                                const userCred = await signInWithEmailAndPassword(auth, email, authPin);
                                setFirebaseUser(userCred.user);
                            } catch (e) {
                                // Fallback to anonymous auth to keep Firestore operational
                                try {
                                    const userCred = await signInAnonymously(auth);
                                    setFirebaseUser(userCred.user);
                                } catch (anonErr) {}
                            }
                        } else {
                            try {
                                const userCred = await signInAnonymously(auth);
                                setFirebaseUser(userCred.user);
                            } catch (anonErr) {}
                        }
                    } else {
                        try {
                            const userCred = await signInAnonymously(auth);
                            setFirebaseUser(userCred.user);
                        } catch (anonErr) {}
                    }
                }
            }
        });
        return () => unsubscribeAuth();
    }, [shiftData.operator]);

    const handleDownloadManual = () => {
        haptic('light');
        const doc = new jsPDF();
        
        let yPos = 20;
        
        // PDF Styling & Content
        doc.setFont("helvetica", "bold");
        doc.setFontSize(20);
        doc.text("P/H OPERATOR MANUAL", 20, yPos);
        yPos += 8;
        
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`VERSION ${APP_VERSION}`, 20, yPos);
        
        yPos += 5;
        doc.setDrawColor(16, 185, 129);
        doc.setLineWidth(1);
        doc.line(20, yPos, 190, yPos);
        yPos += 10;
        
        doc.setTextColor(0);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("1. METRICS & DEFINITIONS", 20, yPos);
        yPos += 6;
        
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        const guideLines = [
            "• Rate (P/H): Your picking speed (Total Cases / Active Seconds * 3600).",
            "• Net Saved: Your 'Time Bank'. Green = time saved, Red = time lost vs target.",
            "• Finish By: The exact time you must complete the pick to remain on target.",
            "• Ahead / Behind: Indicates if your current active order is beating the target rate.",
            "• Projected Rate: Estimated average if you maintain current speed on this order.",
            "• Required Pace: The speed needed to finish the remainder of the current pick on target.",
            "• Efficiency (st/cs): Movement tracking estimating steps taken per case.",
            "• Consistency (%): Measures picking rhythm across different orders using standard deviation.",
            "  100% is perfect rhythm. 60%+ is steady. <50% is erratic."
        ];
        doc.text(guideLines, 20, yPos);
        yPos += 45;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("2. INTERFACE & BUTTON WORKFLOW", 20, yPos);
        yPos += 6;
        
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const workflowLines = [
            "• START PICK: Press ONLY right before picking the first case. Do not press early.",
            "• FINISH PICK: Hit immediately upon placing the last case on the pallet.",
            "• START PAID BREAK (Coffee/Cup): Use for any non-picking interruption (e.g. queue",
            "  for wrapper, waiting on management, toilet) to pause the timer and protect rate.",
            "• MANUAL CLOCK IN / OUT: Used inside settings to retroactively correct shift time.",
            "• FINISH SHIFT: Ends the session and locks your performance data for the day.",
            "• SETTINGS (Gear Icon): Change Department, Zone targets, adjust App Theme, and haptics."
        ];
        doc.text(workflowLines, 20, yPos);
        yPos += 35;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("3. LOGISTICS GAP TIMER", 20, yPos);
        yPos += 6;

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const logicText = "The application isolates Pure Selection from Logistical Tasks. For Chiller/Freezer, a 180s (3-minute) gap timer applies between orders. For Aisles, there is no manual gap timer; instead, a 45-minute PWA Exemption (10m prep, 30m dinner, 5m cleanup) is automatically and linearly accrued over your shift and excluded from your active selection time.";
        doc.text(doc.splitTextToSize(logicText, 170), 20, yPos);
        
        yPos += 20;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("4. MATHEMATICAL FOUNDATION", 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.text("Active selection pauses during breaks or after hitting FINISH PICK.", 20, yPos);
        yPos += 6;
        doc.text("Consistency = 100 - (Standard Deviation / Average Pick Rate * 100)", 20, yPos);
        
        yPos += 20;
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("5. LATEST FEATURES (v" + APP_VERSION + ")", 20, yPos);
        yPos += 6;
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        const featuresText = "• LIVE GLOBE: Real-time user statuses track picking progress, current pick rate, active order labels, and departments globally.\n• SHIFT SUMMARIES: See your department breakdown, cases, and hours explicitly in your Shift History.\n• DELETE HISTORY: Quickly remove mistaken shift histories via the new Trash icon.\n• CAMERA PROOF: Capture label and pallet drop images with the camera and sync them straight to the cloud.\n• MULTI-WAREHOUSE: Native support for multiple tracking contexts seamlessly.\n• PURGE DATABASE: Clean up old DB entries built up over 6 weeks to keep space free.";
        doc.text(doc.splitTextToSize(featuresText, 170), 20, yPos);

        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`PERFORMANCE STANDARDS • OPERATOR MANUAL • v${APP_VERSION}`, 20, 280);
        
        doc.save(`Operations_Manual_v${APP_VERSION}.pdf`);
    };

    const handleSubmitBetaFeedback = async () => {
        if (!userProfile) return;
        if (!betaFeedbackData.ergonomics || !betaFeedbackData.resilience) {
            setLoginError("Please answer the required log questions.");
            return;
        }
        setSubmittingBetaFeedback(true);
        try {
            await saveBetaFeedback(userProfile.uid, userProfile.username, betaFeedbackData);
            const updatedProfile = { ...userProfile, hasSubmittedBetaFeedback: true };
            await saveUserProfile(userProfile.uid, userProfile.username, userProfile.pin, updatedProfile, sessionId);
            setUserProfile(updatedProfile);
            setBetaFeedbackData({ ergonomics: 0, resilience: '', motivation: 3, notes: '' });
        } catch (error) {
            // Beta feedback error handled.
        } finally {
            setSubmittingBetaFeedback(false);
        }
    };

    const handleVerifyUnlock = async () => {
        haptic('medium');
        const operatorName = shiftData.operator || localStorage.getItem('lastUser') || 'DASERGHIE';
        const storedPin = localStorage.getItem(`offline_pin_${operatorName}`);
        
        if (unlockPin === storedPin || (USERS[operatorName] && USERS[operatorName] === unlockPin)) {
            setIsEditingCaseCount(true);
            setTempCaseCount(caseCount);
            setUnlockError('');
        } else {
            // Try Firebase re-auth as fallback
            const email = operatorName.includes('@') ? operatorName.toLowerCase() : `${operatorName.toLowerCase()}@pick.app`;
            try {
                const authPin = unlockPin.length < 6 ? unlockPin.padEnd(6, '0') : unlockPin;
                await signInWithEmailAndPassword(auth, email, authPin);
                setIsEditingCaseCount(true);
                setTempCaseCount(caseCount);
                setUnlockError('');
                // Update offline pin cache if successful re-auth
                localStorage.setItem(`offline_pin_${operatorName}`, unlockPin);
            } catch (err) {
                setUnlockError('Invalid password. Access denied.');
                haptic('heavy');
            }
        }
    };

    const handleSaveModifiedCaseCount = () => {
        haptic('medium');
        if (!tempCaseCount || isNaN(parseInt(tempCaseCount))) {
            setUnlockError('Please enter a valid number');
            return;
        }

        const newCount = tempCaseCount;
        setCaseCount(newCount);
        setShiftData(prev => ({
            ...prev,
            caseCount: newCount,
            isCaseCountModified: true
        }));
        
        setIsUnlockingCaseCount(false);
        setIsEditingCaseCount(false);
    };

    const handleLogin = async () => {
        haptic('medium');
        const userTrimmed = username.trim();
        const pin = password.trim();
        const userUpper = userTrimmed.toUpperCase();

        if (!userTrimmed || !pin) {
            setLoginError("Enter both ID/Email and Password/PIN");
            haptic('heavy');
            return;
        }

        // 1. Try Firebase Email/Password Auth
        const email = userTrimmed.includes('@') ? userTrimmed.toLowerCase() : `${userTrimmed.toLowerCase()}@pick.app`;
        try {
            const authPin = pin.length < 6 ? pin.padEnd(6, '0') : pin;
            let userCredential;
            try {
                userCredential = await signInWithEmailAndPassword(auth, email, authPin);
            } catch (signInErr: any) {
                // If it is a hardcoded user, and the pin matches, and it is a user-not-found/invalid-credentials error, create them on the fly!
                const isHardcoded = USERS[userUpper] && USERS[userUpper] === pin;
                if (isHardcoded && (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential' || signInErr.code === 'auth/wrong-password')) {
                    const { createUserWithEmailAndPassword } = await import('firebase/auth');
                    userCredential = await createUserWithEmailAndPassword(auth, email, authPin);
                } else {
                    throw signInErr;
                }
            }
            const user = userCredential.user;
            const operatorName = user.email ? user.email.split('@')[0].toUpperCase() : userUpper;
            // Login: operatorName
            
            const profile = await getUserProfile(user.uid);
            if (profile) {
                const p = profile as UserProfile;
                const userUpper = (p.username || operatorName).toUpperCase();
                if (userUpper === 'DASERGHIE' || userUpper === 'ADMIN') {
                    p.role = UserRole.ADMIN;
                }
                setUserProfile(p);
            }
            const userWarehouse = profile?.warehouseId || 'MAIN';
            
            setWarehouseContext(userWarehouse);
            localStorage.setItem(`offline_warehouse_${operatorName}`, userWarehouse);
            
            sessionStorage.setItem('session_authenticated', 'true');
            setIsAuthenticated(true);
            setLoginError('');
            
            // Securely cache login credentials representation for 100% offline login resilience!
            localStorage.setItem(`offline_pin_${operatorName}`, pin);
            localStorage.setItem('lastUser', operatorName);

            await saveUserProfile(user.uid, operatorName, pin, { 
                level: shiftData.level, 
                xp: shiftData.xp, 
                achievements: shiftData.achievements, 
                selectedSkin: shiftData.selectedSkin,
                warehouseId: userWarehouse
            }, sessionId);
            
            // Load user-specific data with instant local IndexedDB & profile rota hydration
            const localDbRota = await getLocalRota(operatorName);
            const userSaved = localStorage.getItem(`pickData_${operatorName}`);
            let parsed = userSaved ? JSON.parse(userSaved) : {};

            if (profile?.rotaConfig) parsed.rotaConfig = profile.rotaConfig;
            if (profile?.rotaOverrides) parsed.rotaOverrides = profile.rotaOverrides;

            if (localDbRota?.rotaConfig && (!parsed.rotaConfig || !parsed.rotaConfig.anchorDate)) {
                parsed.rotaConfig = localDbRota.rotaConfig;
            }
            if (localDbRota?.rotaOverrides) {
                parsed.rotaOverrides = { ...(parsed.rotaOverrides || {}), ...localDbRota.rotaOverrides };
            }

            const finalLoaded = processLoadedData({ ...parsed, operator: operatorName, warehouseId: userWarehouse }, defaultShiftData);
            setShiftData((prev: any) => ({ ...prev, ...finalLoaded }));
            
            if (finalLoaded.rotaConfig || finalLoaded.rotaOverrides) {
                saveLocalRota(operatorName, finalLoaded.rotaConfig, finalLoaded.rotaOverrides);
            }
            return;
        } catch (firebaseError: any) {
            // Firebase auth offline or failed.

            // 2. Fallback to Firestore check for users added via admin panel
            try {
                const userQueryRef = query(collection(db, 'users'), where('username', '==', userUpper));
                const querySnap = await getDocs(userQueryRef);
                
                if (!querySnap.empty) {
                    const firestoreUser = querySnap.docs[0].data() as UserProfile;
                    const userUpperCheck = (firestoreUser.username || userUpper).toUpperCase();
                    if (userUpperCheck === 'DASERGHIE' || userUpperCheck === 'ADMIN') {
                        firestoreUser.role = UserRole.ADMIN;
                    }
                    
                    if (firestoreUser.pin === pin) {
                        setUserProfile(firestoreUser);
                        const userWarehouse = firestoreUser.warehouseId || 'MAIN';
                        import('./services/leaderboardService').then(mod => {
                            mod.setWarehouseContext(userWarehouse);
                        });
                        localStorage.setItem(`offline_warehouse_${userUpper}`, userWarehouse);

                        sessionStorage.setItem('session_authenticated', 'true');
                        setIsAuthenticated(true);
                        setLoginError('');
                        localStorage.setItem(`offline_pin_${userUpper}`, pin);
                        localStorage.setItem('lastUser', userUpper);

                        const localDbRota = await getLocalRota(userUpper);
                        const userSaved = localStorage.getItem(`pickData_${userUpper}`);
                        let parsed = userSaved ? JSON.parse(userSaved) : {};
                        if (firestoreUser?.rotaConfig) parsed.rotaConfig = firestoreUser.rotaConfig;
                        if (firestoreUser?.rotaOverrides) parsed.rotaOverrides = firestoreUser.rotaOverrides;
                        if (localDbRota?.rotaConfig && (!parsed.rotaConfig || !parsed.rotaConfig.anchorDate)) {
                            parsed.rotaConfig = localDbRota.rotaConfig;
                        }
                        if (localDbRota?.rotaOverrides) {
                            parsed.rotaOverrides = { ...(parsed.rotaOverrides || {}), ...localDbRota.rotaOverrides };
                        }
                        const finalLoaded = processLoadedData({ ...parsed, operator: userUpper, warehouseId: userWarehouse }, defaultShiftData);
                        setShiftData((prev: any) => ({ ...prev, ...finalLoaded }));
                        
                        // Also sign in anonymously to keep Firebase active
                        await signInAnonymously(auth);
                        return;
                    }
                }
            } catch (firestoreError) {
                // Firestore auth check failed.
            }

            // 3. Fallback to dynamic offline credentials cache OR hardcoded backup lookup
            const cachedPin = localStorage.getItem(`offline_pin_${userUpper}`);
            const isHardcoded = USERS[userUpper] && USERS[userUpper] === pin;
            const isOfflineAuthorized = (cachedPin && cachedPin === pin) || isHardcoded;

            if (isOfflineAuthorized) {
                const cachedWarehouse = localStorage.getItem(`offline_warehouse_${userUpper}`) || 'MAIN';
                
                // Set hardcoded profile for offline resilience
                const hardcodedRole = (userUpper === 'DASERGHIE' || userUpper === 'ADMIN') ? UserRole.ADMIN : UserRole.USER;
                setUserProfile({
                    uid: userUpper.toLowerCase(),
                    username: userUpper,
                    role: hardcodedRole,
                    warehouseId: cachedWarehouse,
                    level: 1,
                    xp: 0,
                    achievements: [],
                    selectedSkin: 'classic'
                });

                import('./services/leaderboardService').then(mod => {
                    mod.setWarehouseContext(cachedWarehouse);
                });

                sessionStorage.setItem('session_authenticated', 'true');
                setIsAuthenticated(true);
                setLoginError('');
                
                if (isHardcoded && !cachedPin) {
                    localStorage.setItem(`offline_pin_${userUpper}`, pin);
                }
                localStorage.setItem('lastUser', userUpper);
                
                // Try loading user-specific data with instant local IndexedDB Rota hydration
                const localDbRota = await getLocalRota(userUpper);
                const userSaved = localStorage.getItem(`pickData_${userUpper}`);
                let parsed = userSaved ? JSON.parse(userSaved) : {};
                if (localDbRota?.rotaConfig && (!parsed.rotaConfig || !parsed.rotaConfig.anchorDate)) {
                    parsed.rotaConfig = localDbRota.rotaConfig;
                }
                if (localDbRota?.rotaOverrides) {
                    parsed.rotaOverrides = { ...(parsed.rotaOverrides || {}), ...localDbRota.rotaOverrides };
                }
                const finalLoaded = processLoadedData({ ...parsed, operator: userUpper, warehouseId: cachedWarehouse }, defaultShiftData);
                setShiftData((prev: any) => ({ ...prev, ...finalLoaded }));
                
                try {
                    const cred = await signInAnonymously(auth);
                    if (cred.user) {
                        await saveUserProfile(cred.user.uid, userUpper, pin, { 
                            level: shiftData.level, 
                            xp: shiftData.xp, 
                            achievements: shiftData.achievements, 
                            selectedSkin: shiftData.selectedSkin 
                        }, sessionId);
                    }
                } catch (e) {
                    // Anonymous sign-in failed.
                }
                return;
            }

            // Display clear error for failed credentials
            let errMsg = "Authentication failed. Check your credentials.";
            if (firebaseError.code === 'auth/invalid-credential' || firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found') {
                errMsg = "Invalid password/PIN or user does not exist.";
            } else if (firebaseError.message) {
                errMsg = firebaseError.message;
            }
            setLoginError(errMsg);
            haptic('heavy');
        }
    };

    const [isMotionGranted, setIsMotionGranted] = useState(false);

    const requestMotionPermission = async () => {
        if (typeof (DeviceMotionEvent as any) !== 'undefined' && typeof (DeviceMotionEvent as any).requestPermission === 'function') {
            try {
                const permission = await (DeviceMotionEvent as any).requestPermission();
                if (permission === 'granted') {
                    setIsMotionGranted(true);
                }
            } catch (e) {
                // Device motion permission rejected or prompt closed
            }
        } else if (typeof window !== 'undefined' && 'DeviceMotionEvent' in window) {
            setIsMotionGranted(true);
        }
    };

    useEffect(() => {
        requestMotionPermission();
        restoreAndProtectShifts('DASERGHIE');
    }, []);

    const stepState = useRef({
        movingAverage: 0,
        baseline: 9.81,
        isPeak: false,
        initialized: false
    });

    useEffect(() => {
        if (!isMotionGranted) return;

        const handleMotion = (e: DeviceMotionEvent) => {
            let mag = 0;
            let isLinear = false;

            // Prefer linear acceleration (gravity component removed by hardware sensor fusion)
            if (e.acceleration && (e.acceleration.x !== null || e.acceleration.y !== null || e.acceleration.z !== null)) {
                const ax = e.acceleration.x || 0;
                const ay = e.acceleration.y || 0;
                const az = e.acceleration.z || 0;
                const linearMag = Math.sqrt(ax * ax + ay * ay + az * az);
                if (linearMag > 0.01) {
                    mag = linearMag;
                    isLinear = true;
                }
            }

            if (!isLinear && e.accelerationIncludingGravity) {
                const gx = e.accelerationIncludingGravity.x || 0;
                const gy = e.accelerationIncludingGravity.y || 0;
                const gz = e.accelerationIncludingGravity.z || 0;
                mag = Math.sqrt(gx * gx + gy * gy + gz * gz);
            }

            if (mag === 0) return;

            if (!stepState.current.initialized) {
                stepState.current.baseline = mag;
                stepState.current.movingAverage = mag;
                stepState.current.initialized = true;
                return;
            }

            // Exponential moving average filter for noise suppression
            stepState.current.baseline = (stepState.current.baseline * 0.99) + (mag * 0.01);
            stepState.current.movingAverage = (stepState.current.movingAverage * 0.72) + (mag * 0.28);

            // Adaptive threshold calculation
            const dynamicThreshold = isLinear
                ? 1.15 // 1.15 m/s^2 linear acceleration peak threshold
                : Math.max(0.85, stepState.current.baseline * 0.08); // Gravity-relative threshold (~0.85 m/s^2 above baseline)

            if (stepState.current.movingAverage > stepState.current.baseline + dynamicThreshold) {
                stepState.current.isPeak = true;
            }

            // Detect peak fall-off (foot strike completion)
            if (stepState.current.isPeak && stepState.current.movingAverage < stepState.current.baseline + (dynamicThreshold * 0.35)) {
                const currentTime = Date.now();
                const delta = currentTime - lastStepTime.current;

                // Human walking cadence constraint: 250ms to 1400ms per step (~42-240 steps/min)
                if (delta > 250 && delta < 1400) {
                    lastStepTime.current = currentTime;
                    stepState.current.isPeak = false;

                    const currentBackup = parseInt(localStorage.getItem('shiftStepBackup') || '0', 10);
                    const nextBackup = currentBackup + 1;
                    localStorage.setItem('shiftStepBackup', nextBackup.toString());

                    setShiftData((prev: any) => ({ ...prev, steps: nextBackup }));

                    if (shiftData.haptic === 'on') deviceHapticService('light');
                } else if (delta >= 1400) {
                    // Reset peak state if time between strides exceeds walking window
                    lastStepTime.current = currentTime;
                    stepState.current.isPeak = false;
                }
            }
        };

        window.addEventListener('devicemotion', handleMotion);
        return () => {
            window.removeEventListener('devicemotion', handleMotion);
        };
    }, [isMotionGranted, shiftData.haptic]); // Re-bind if haptic pref changes, but cleanly handles listener


    const masterStart = () => {
        haptic('medium');
        requestMotionPermission();
        localStorage.setItem('shiftStepBackup', '0');
        const startTime = now.getTime();
        setShiftData((prev: any) => ({ 
            ...prev, 
            firstStartTime: startTime,
            lastStopTimestamp: startTime,
            steps: 0
        }));
        updateShiftData({ hasGapAlerted: false });
    };

    const manualStart = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
        
        const currentTime = new Date().getTime();
        
        // Cross-midnight logic: If start time looks like it's in the future 
        // compared to now (e.g. input 20:25 and it is currently 04:00 AM), 
        // then it actually happened yesterday.
        if (startTime.getTime() > currentTime) {
            startTime.setDate(startTime.getDate() - 1);
        }
        
        haptic('medium');
        requestMotionPermission();
        localStorage.setItem('shiftStepBackup', '0');
        setShiftData((prev: any) => ({ 
            ...prev, 
            firstStartTime: startTime.getTime(),
            lastStopTimestamp: currentTime, // Keep lastStop current to avoid instant gap alert
            steps: 0
        }));
        updateShiftData({ hasGapAlerted: false });
        setShowClockInModal(false);
    };

    const manualEnd = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const endTime = new Date();
        endTime.setHours(hours, minutes, 0, 0);
        
        // Usually clock out is after clock in. 
        // If end time is "before" start time significantly, it means it happened the next day.
        if (shiftData.firstStartTime && endTime.getTime() < shiftData.firstStartTime) {
            endTime.setDate(endTime.getDate() + 1);
        }
        
        haptic('medium');
        // Finalize shift with manual timestamp
        finalizeShift(endTime.getTime());
        setShowClockInModal(false);
    };

    const startPick = () => {
        const cases = parseInt(caseCount);
        if (!cases || isNaN(cases)) {
            haptic('heavy');
            return;
        }
        
        if (shiftData.voiceEnabled) {
            let msg = `Starting ${cases} cases.`;
            const lanes = [lane1, lane2, lane3, lane4].filter(l => l.trim() !== '');
            if (lanes.length > 0) {
                msg += ` Check lanes ${lanes.join(', ')}.`;
            }
            announce(msg);
        }

        haptic('medium');
        const startTime = now.getTime();
        
        let gapStr = "0s";
        let gapSecondsToExempt = 0;

        if (shiftData.lastStopTimestamp) {
            let gapSec = (startTime - shiftData.lastStopTimestamp) / 1000;
            gapStr = gapSec > 60 ? Math.floor(gapSec/60) + "m " + Math.round(gapSec%60) + "s" : Math.round(gapSec) + "s";
            
            if (!isAisles) {
                gapSecondsToExempt = Math.min(gapSec, 180);
            }
        }
        
        updateShiftData({
            pickStartTime: startTime,
            isPicking: true,
            hasAlerted: false,
            hasHalfwayAlerted: false,
            lastGapAlertTimestamp: null,
            hasGapAlerted: false,
            breakTimeDuringCurrentPick: 0,
            tempGap: gapStr,
            totalExcludedTime: shiftData.totalExcludedTime + gapSecondsToExempt,
            caseCount: caseCount,
            isCaseCountModified: false
        });

        if (shiftData.voiceEnabled) {
            announce(`Start pick. Target is ${caseCount} cases.`);
        }
    };

    const stopPick = () => {
        haptic('medium');
        const cases = parseInt(caseCount);
        if (!cases || isNaN(cases) || !pickStartTime) return;

        const rawElapsed = (now.getTime() - pickStartTime) / 1000 - breakTimeDuringCurrentPick;
        const elapsedSeconds = Math.max(1, isNaN(rawElapsed) ? 1 : rawElapsed);
        const finalRate = Math.round((cases / elapsedSeconds) * 3600);

        setOrderFinishedData({
            cases: cases,
            finalRate: finalRate,
            elapsedSeconds: elapsedSeconds,
            stopTime: now.getTime(),
            pickStartTime: pickStartTime,
            breakTimeDuringCurrentPick: breakTimeDuringCurrentPick,
            tempGap: shiftData.tempGap,
            isCaseCountModified: shiftData.isCaseCountModified,
            // Calculate diff
            diff: isNaN(cases * (3600 / targetRate)) ? 0 : (cases * (3600 / targetRate)) - elapsedSeconds
        });
    };

    const confirmFinishPick = () => {
        if (!orderFinishedData) return;
        haptic('medium');
        const { cases, elapsedSeconds, finalRate, diff, pickStartTime, breakTimeDuringCurrentPick, tempGap, stopTime, isCaseCountModified } = orderFinishedData;
        const stopDate = new Date(stopTime);

        if (shiftData.voiceEnabled) {
            if (finalRate >= targetRate) {
                announce(`Order complete! Great job, rate was ${finalRate}.`);
            } else {
                announce(`Order complete. Rate was ${finalRate}. Keep it up!`);
            }
        }
        
        // Personal Record Check
        const deptKey = `${shiftData.zone}_${shiftData.department}`;
        const prevPB = shiftData.personalBests[deptKey] || 0;
        let isNewPB = false;
        const newPBs = { ...shiftData.personalBests };
        
        if (finalRate > prevPB && finalRate > 50) {
            newPBs[deptKey] = finalRate;
            isNewPB = true;
            triggerSurprise('NEW PERSONAL BEST!');
        }

        // Consistency & Consecutive tracking
        const newConsecutive = finalRate >= targetRate ? (shiftData.consecutiveTargetOrders + 1) : 0;
        
        if (newConsecutive >= 3 && !shiftData.achievements.includes('consistent')) {
            triggerSurprise('COLD BLOODED!');
        }

        // --- Milestone Surprise Logic ---
        const wasBelowTarget = rateRef.current < targetRate;
        const isNowAboveTarget = finalRate >= targetRate;

        if (isNowAboveTarget && wasBelowTarget && shiftData.totalCases > 0) {
            triggerSurprise('TARGET REACHED!');
        } else if (shiftData.totalCases + cases >= 100 && shiftData.totalCases < 100) {
            triggerSurprise('100 CASES CLUB!');
        } else if (finalRate >= targetRate + 50) {
            // Random chance for high-rate celebration
            if (Math.random() > 0.7) triggerSurprise('LEGENDARY PACE!');
        }

        // Calculate XP: 10 XP per case + performance bonus
        const performanceBonus = finalRate > targetRate ? Math.floor((finalRate - targetRate) * 2) : 0;
        const xpGained = (cases * 10) + performanceBonus;
        
        let newXp = (shiftData.xp || 0) + xpGained;
        let newLevel = shiftData.level || 1;
        const xpToLevel = newLevel * 1000;

        if (newXp >= xpToLevel) {
            newLevel += 1;
            newXp -= xpToLevel;
            triggerSurprise(`LEVEL ${newLevel}!`);
            haptic('heavy');

            // Skin unlock detection for the newly reached level
            Object.entries(SKIN_REQUIREMENTS).forEach(([key, req]) => {
                const oldLevel = shiftData.level || 1;
                if (newLevel >= req.level && oldLevel < req.level) {
                    setTimeout(() => {
                        triggerSurprise(
                            'SKIN UNLOCKED!',
                            `You unlocked the premium theme: "${req.name}"!`
                        );
                    }, 5500);
                }
            });
        }

        // Achievement check
        const newAchievements = [...(shiftData.achievements || [])];
        if (finalRate >= 300 && !newAchievements.includes('speed_demon')) {
            newAchievements.push('speed_demon');
            triggerSurprise('SPEED DEMON!');
        }
        if (shiftData.totalCases + cases >= 1000 && !newAchievements.includes('millennium')) {
            newAchievements.push('millennium');
            triggerSurprise('MILLENNIUM CLUB!');
        }
        if (shiftData.history.filter((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote).length === 0 && !newAchievements.includes('early_bird')) {
            newAchievements.push('early_bird');
        }
        
        const finalLabelsList = [
            ...pendingStoreLabels,
            ...(pendingStoreLabel.trim() && !pendingStoreLabels.includes(pendingStoreLabel.trim().toUpperCase()) ? [pendingStoreLabel.trim().toUpperCase()] : [])
        ].filter(Boolean);

        const newHistoryEntry = {
            timestamp: pickStartTime,
            start: new Date(pickStartTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            finish: stopDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
            gap: tempGap,
            cases: cases,
            rate: isNaN(finalRate) ? 0 : finalRate,
            saved: (diff >= 0 ? "+" : "-") + formatTime(Math.abs(diff)),
            statusClass: diff >= 0 ? 'text-emerald-500' : 'text-red-500',
            xp: xpGained,
            storeLabel: finalLabelsList.join(', ') || shiftData.storeLabel || "",
            date: getLocalDateString(new Date(pickStartTime)),
            labelImages: pendingLabelImages,
            department: shiftData.department,
            departmentName: currentDept?.name || shiftData.department,
            zone: shiftData.zone,
            targetRate: targetRate,
            elapsedSeconds: elapsedSeconds,
            isCaseCountModified: isCaseCountModified || false,
            operatorNote: shiftData.operatorNote || "",
            dropLanes: [lane1, lane2, lane3, lane4].filter(Boolean)
        };


        // For local storage, keep images only for the recent entries to prevent QuotaExceededError (5MB limit)
        const cleanedHistory = (shiftData.history || []).map((entry: any, index: number) => {
            if (index >= 8) { // Only keep images for the last ~8 orders
                const { labelImages, labelImage, ...rest } = entry;
                return rest;
            }
            return entry;
        });

        const newHistory = [newHistoryEntry, ...cleanedHistory];

        updateShiftData({
            totalCases: shiftData.totalCases + cases,
            lastStopTimestamp: stopTime,
            isPicking: false,
            pickStartTime: null,
            hasAlerted: false,
            xp: newXp,
            level: newLevel,
            achievements: newAchievements,
            personalBests: newPBs,
            consecutiveTargetOrders: newConsecutive,
            firestreak: newConsecutive,
            history: newHistory,
            operatorNote: ''
        });

        // Run background sync
        saveFinishedOrderAsync(newHistoryEntry, newHistory);

        localStorage.removeItem('draft_lane1');
        localStorage.removeItem('draft_lane2');
        localStorage.removeItem('draft_lane3');
        localStorage.removeItem('draft_lane4');
        localStorage.removeItem('draft_operatorNote');
        setShiftNotes('');

        setPendingStoreLabel("");
        setPendingLabelImages([]);
        setPendingStoreLabels([]);
        setCaseCount('');
        setLane1('');
        setLane2('');
        setLane3('');
        setLane4('');
        setOrderFinishedData(null);
    };

    const saveFinishedOrderAsync = async (entry: any, fullHistory: any[]) => {
        let saveSuccess = false;
        const historyEntry = { ...entry, timestamp: { seconds: Math.floor(Date.now() / 1000) } };

        const incrementalCases = shiftData.totalCases + (parseInt(caseCount) || 1);
        const shiftStart = shiftData.firstStartTime || pickStartTime || Date.now();
        const durationSecs = Math.max(1, (Date.now() - shiftStart) / 1000);
        const isAisleDept = (shiftData.department || '').toLowerCase().includes('aisle') || (shiftData.zone || '') === 'AMBIENT';
        const exemptSecs = isAisleDept ? calculateAislesExemption(durationSecs) : 0;
        const activeSecs = Math.max(1, durationSecs - (shiftData.totalExcludedTime || 0) - exemptSecs);
        const cumulativeRate = activeSecs > 10 ? Math.round((incrementalCases / activeSecs) * 3600) : (entry.rate || 0);
        const breakSecs = Math.max(0, durationSecs - activeSecs);

        const currentImages = entry.labelImages && entry.labelImages.length > 0 ? entry.labelImages : (entry.labelImage ? [entry.labelImage] : []);

        try {
            saveSuccess = await saveShiftSummary({
                userName: shiftData.operator || "Unknown",
                department: currentDept?.name || shiftData.department || "Unknown",
                zone: shiftData.zone || "Unknown",
                totalCases: incrementalCases,
                finalRate: cumulativeRate,
                activeSeconds: activeSecs,
                totalSeconds: durationSecs,
                breakSeconds: breakSecs,
                steps: shiftData.steps || 0,
                date: getLocalDateString(new Date(shiftStart)),
                history: [historyEntry, ...fullHistory.slice(1)],
                labelImage: currentImages[0] || "",
                labelImages: currentImages,
                storeLabel: entry.storeLabel || shiftData.storeLabel || "",
                clockInTime: shiftStart,
                clockOutTime: Date.now()
            });
        } catch (e) {
            saveSuccess = false;
        }

        if (entry.labelImages) {
            for (let i = 0; i < entry.labelImages.length; i++) {
                const img = entry.labelImages[i];
                saveImageToDevice(img, `Label_${(entry.date || '').replace(/\//g, '-')}_${i}.png`);
            }
        }

        // If database save failed due to offline state, retain in local state
        if (!saveSuccess) {
            const failedItem = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substring(2, 9),
                operator: shiftData.operator || "Unknown",
                date: getLocalDateString(new Date(shiftStart)),
                labelImages: currentImages,
                entry: {
                    department: shiftData.department || "Unknown",
                    zone: shiftData.zone || "Unknown",
                    totalCases: incrementalCases,
                    rate: entry.rate,
                    activeSeconds: activeSecs,
                    totalSeconds: durationSecs,
                    breakSeconds: breakSecs,
                    steps: shiftData.steps || 0,
                    storeLabel: entry.storeLabel || "",
                    clockInTime: shiftStart
                },
                fullHistory: [historyEntry, ...fullHistory.slice(1)]
            };

            setFailedUploads(prev => {
                const updated = [...prev, failedItem];
                try {
                    localStorage.setItem('failed_order_uploads', JSON.stringify(updated));
                } catch (e) {}
                return updated;
            });

            // Alert the operator
            setConfirmDialog({
                title: "⚠️ WiFi dead zone detected",
                message: "A network disruption occurred while saving your order label. Visual assets and details have been backed up securely to your device's local retry queue and will auto-sync once a stable connection is restored.",
                isAlert: true,
                onConfirm: () => setConfirmDialog(null),
                onCancel: () => setConfirmDialog(null)
            });
        }
    };

    const startPaidBreak = () => {
        haptic('medium');
        updateShiftData({
            isOnBreak: true,
            breakStartTime: now.getTime()
        });
    };

    const stopPaidBreak = () => {
        haptic('medium');
        if (breakStartTime) {
            const breakDuration = (now.getTime() - breakStartTime) / 1000;
            
            const newHistoryEntry = {
                start: new Date(breakStartTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                finish: now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                gap: "BREAK",
                cases: "-",
                rate: "-",
                saved: formatTime(breakDuration),
                statusClass: 'text-amber-500',
                date: getLocalDateString(new Date(breakStartTime)),
                timestamp: breakStartTime,
                durationSeconds: breakDuration,
                department: shiftData.department
            };

            updateShiftData({
                isOnBreak: false,
                breakStartTime: null,
                totalExcludedTime: shiftData.totalExcludedTime + breakDuration,
                lastStopTimestamp: now.getTime(),
                history: [newHistoryEntry, ...shiftData.history],
                breakTimeDuringCurrentPick: isPicking ? breakTimeDuringCurrentPick + breakDuration : breakTimeDuringCurrentPick
            });
        }
    };


    const saveStandaloneNote = () => {
        const noteText = (shiftData.operatorNote || shiftNotes || '').trim();
        if (!noteText) {
            haptic('heavy');
            return;
        }

        haptic('medium');
        const now = new Date();
        const currentDept = DEPARTMENTS[shiftData.zone]?.depts[shiftData.department];
        const newNoteEntry = {
            start: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            finish: '',
            storeLabel: noteText,
            gap: 'NOTE',
            isNote: true,
            cases: '-',
            rate: '-',
            saved: 'Saved Log',
            statusClass: 'text-amber-400',
            date: getLocalDateString(now),
            timestamp: now.getTime(),
            department: shiftData.department,
            departmentName: currentDept?.name || shiftData.department,
            zone: shiftData.zone
        };

        const newHistory = [newNoteEntry, ...(shiftData.history || [])];

        updateShiftData({
            history: newHistory,
            operatorNote: ''
        });
        setShiftNotes('');
        localStorage.removeItem('draft_operatorNote');

        // Background sync to Firestore using saveFinishedOrderAsync
        saveFinishedOrderAsync(newNoteEntry, newHistory);
    };

    const syncToFirstPick = () => {
        const actualPicks = shiftData.history.filter((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote);
        if (actualPicks.length === 0) {
            haptic('heavy');
            alert("Record at least one order first!");
            return;
        }
        
        // Final entry in actualPicks is the earliest actual pick
        const oldest = actualPicks[actualPicks.length - 1];
        if (!oldest.timestamp) {
            haptic('heavy');
            alert("No timestamp on existing records. Try on your next shift!");
            return;
        }

        haptic('medium');
        setShiftData((prev: any) => {
            const indexOfOldestPick = prev.history.map((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote).lastIndexOf(true);
            return {
                ...prev,
                firstStartTime: oldest.timestamp,
                history: prev.history.map((item: any, i: number) => 
                    i === indexOfOldestPick ? { ...item, gap: '0s' } : item
                )
            };
        });
        alert("Shift start synced to first pick (" + oldest.start + ")");
    };

    const handleVoiceCommand = (command: string, value?: number) => {
        if (command === 'next') {
            // Generate a simulated WMS task
            const aisle = Math.floor(Math.random() * 50) + 1;
            const slot = Math.floor(Math.random() * 100) + 1;
            const cases = Math.floor(Math.random() * 20) + 1;
            const digits = Math.floor(100 + Math.random() * 900).toString();
            
            setShiftData((prev: any) => ({
                ...prev,
                voiceTask: { aisle, slot, cases, checkDigits: digits, status: 'awaiting_digits' }
            }));
            
            announce(`Aisle ${aisle}, Slot ${slot}. Case count ${cases}. Verify check digits.`);
        } else if ((command === 'digit' || !command) && shiftData.voiceTask.status === 'awaiting_digits' && value?.toString() === shiftData.voiceTask.checkDigits) {
            setCaseCount(shiftData.voiceTask.cases.toString());
            setShiftData((prev: any) => ({
                ...prev,
                voiceTask: { ...prev.voiceTask, status: 'picking' }
            }));
            announce("Correct. Start picking.");
            startPick();
        } else if (command === 'start') {
            if (value) {
                setCaseCount(value.toString());
                setTimeout(() => {
                    startPick();
                }, 100);
            } else if (caseCount) {
                startPick();
            } else {
                haptic('heavy');
            }
        } else if (command === 'stop' || command === 'complete' || command === 'done') {
            if (isPicking) {
                stopPick();
                setShiftData((prev: any) => ({
                    ...prev,
                    voiceTask: { ...prev.voiceTask, status: 'idle' }
                }));
            }
        } else if (command === 'break') {
            if (isOnBreak) {
                stopPaidBreak();
            } else {
                startPaidBreak();
            }
        }
    };

    const updateShiftData = (updates: any) => {
        setShiftData((prev: any) => ({ ...prev, ...updates }));
    };

    const triggerSurprise = (title: string, subtitle: string = 'You are absolute machine!') => {
        haptic('heavy');
        playVictorySound();
        setCelebrationTitle(title);
        setCelebrationSubtitle(subtitle);
        setShowCelebration(true);
        confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899']
        });
        
        setTimeout(() => setShowCelebration(false), 2000);
    };

    const downloadReport = async () => {
        try {
            haptic('medium');
            const fullReport = generateFullShiftReport(shiftData);

            const shiftStartDate = shiftData.firstStartTime ? new Date(shiftData.firstStartTime) : now;
            const fileDateISO = shiftStartDate.toISOString().split('T')[0];
            const operatorName = (shiftData.operator || 'UNKNOWN').toUpperCase().trim();
            const fileName = `Work/${shiftStartDate.getFullYear()}/${(shiftStartDate.getMonth() + 1).toString().padStart(2, '0')}/ShiftReport_${operatorName}_${fileDateISO.replace(/-/g, '')}.csv`;

            const success = await deviceExport(fullReport, fileName, true);
            if (success) {
                alert("Full Shift Report generated with restore payload!");
                return;
            }

            let blob: Blob;
            try {
                blob = new Blob([fullReport], { type: 'text/csv;charset=utf-8' });
            } catch (blobErr) {
                console.error("Blob constructor error:", blobErr);
                return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            
            setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 1000);

            alert("Full Shift Report generated! Check your downloads or 'Files' app.");
        } catch (error) {
            try {
                await copyFullShiftReport(shiftData);
                alert("Download blocked by browser. Full shift report with restore payload copied to clipboard!");
            } catch (e) {
                alert("Failed to export. Please take a screenshot of your stats.");
            }
        }
    };

    const handleSignOutOnly = () => {
        haptic('medium');
        handleEndOfDay(true);
    };

    const handleEndOfDay = (fromSignOut = false) => {
        haptic('medium');
        
        if (isShiftFinalized) {
            if (fromSignOut) {
                signOut(auth).then(() => {
                    sessionStorage.removeItem('session_authenticated');
                    setIsAuthenticated(false);
                });
                return;
            }
            setShowSummary(true);
            return;
        }

        setConfirmDialog({
            title: fromSignOut ? "Sign Out & Finish?" : "Finish Shift?",
            message: "This will LOCK your stats for today and save to the leaderboard. You can review them before resetting.",
            onConfirm: () => {
                setConfirmDialog(null);
                // Optionally store the intent so the summary screen knows they want to sign out
                if (fromSignOut) {
                    sessionStorage.setItem('pendingSignOut', 'true');
                }
                finalizeShift();
            },
            onCancel: () => setConfirmDialog(null)
        });
    };

    const getSummaryMessage = () => {
        const name = getCleanName();
        const finalRate = shiftData.isShiftFinalized && shiftData.finalizedStats ? shiftData.finalizedStats.rate : rate;
        const diff = finalRate - targetRate;
        
        if (diff >= 50) return `Legendary session, ${name}! You're an absolute machine!`;
        if (diff >= 20) return `Excellent work, ${name}! Massive target beat.`;
        if (diff >= 0) return `Well done, ${name}! You hit the target.`;
        if (diff >= -30) return `Not bad, ${name}. Just a bit more effort!`;
        return `Tough day, ${name}. Let's bounce back tomorrow!`;
    };

    const finalizeShift = async (overrideEndTime?: number) => {
        haptic('heavy');
        // finalizeShift called
        
        const timestamp = overrideEndTime || Date.now();
        const endTime = new Date(timestamp);
        
        // Ensure night shift transitions are handled even if not using manualEnd
        if (shiftData.firstStartTime && endTime.getTime() < shiftData.firstStartTime) {
            endTime.setDate(endTime.getDate() + 1);
        }
        
        const finalTimestamp = endTime.getTime();
        
        // Stop any active processes if any
        if (isPicking) stopPick();
        if (isOnBreak) stopPaidBreak();

        const currentCases = totalCasesRef.current;
        const currentSteps = shiftData.steps;
        const currentDeptName = currentDept?.name || shiftData.department;
        const currentName = getCleanName();

        // Recalculate everything one last time with the fixed final timestamp
        const finalDurationSecs = shiftData.firstStartTime ? (finalTimestamp - shiftData.firstStartTime) / 1000 : 0;
        const exempt = isAisles ? calculateAislesExemption(finalDurationSecs) : 0;
        
        // Final active time = Duration - Excluded (gaps/manual) - Automatic Exempt
        const finalActiveSecs = Math.max(1, finalDurationSecs - shiftData.totalExcludedTime - exempt);
        const finalRate = finalActiveSecs > 10 ? Math.round((currentCases / finalActiveSecs) * 3600) : 0;

        // 1. Lock states
        const updatedData = {
            ...shiftData,
            endTime: finalTimestamp,
            finalizedStats: {
                rate: finalRate,
                activeElapsedSeconds: finalActiveSecs,
                cases: currentCases,
                steps: currentSteps,
                department: currentDeptName,
                exemption: exempt
            },
            isShiftFinalized: true
        };
        updateShiftData(updatedData);
        
        // Show saving indicator first (hide summary modal)
        setShowSummary(false); // Make sure summary modal is hidden for the screenshot
        setIsSavingShift(true);

        // 2. Take screenshot and save data
        // Use a Promise to await the timeout
        await new Promise<void>(resolve => {
            setTimeout(async () => {
                try {
                    // Take screenshot of the main dashboard BEFORE showing summary modal
                    const screenshotData = await takeScreenshot();

                    // For cross-midnight shifts, we MUST log the START date of the shift
                    const shiftStartDate = shiftData.firstStartTime ? new Date(shiftData.firstStartTime) : new Date(finalTimestamp);
                    const logDate = getLocalDateString(shiftStartDate);

                    const tasks: Promise<any>[] = [];

                    // 2a. Save to Leaderboard (Public/Daily) - only if they actually did work
                    if (currentCases > 0) {
                        tasks.push(saveToLeaderboard({
                            name: currentName,
                            rate: finalRate,
                            cases: currentCases,
                            steps: currentSteps,
                            targetRate: targetRate,
                            department: currentDeptName,
                            date: logDate
                        }));
                    }

                    // 2b. Save full Shift Summary (Private/Permanent)
                    // Save CSV immediately as well
                    const fileDateISO = new Date(finalTimestamp).toISOString().split('T')[0];
                    const csvContent = "sep=,\n" + `"SUMMARY TYPE","DATA"\n` + `"Operator","${currentName}"\n` + `"Date","${logDate}"\n` + `"Total Cases","${currentCases}"\n` + `"Rate","${finalRate}"\n`;
                    const fileName = `Work/${shiftStartDate.getFullYear()}/${(shiftStartDate.getMonth() + 1).toString().padStart(2, '0')}/ShiftReport_${currentName}_${fileDateISO.replace(/-/g, '')}.csv`;
                    deviceExport(csvContent, fileName, true); // Keep original, this just adds the CSV save locally
                    // Export all images from the shift's history to the device
                    let imageExportCounter = 1;
                    if (shiftData.history && shiftData.history.length > 0) {
                        shiftData.history.forEach((h: any, orderIndex: number) => {
                            const imgs = [
                                ...(h.labelImages || []),
                                ...(h.labelImage ? [h.labelImage] : [])
                            ];
                            imgs.forEach((img: string) => {
                                saveImageToDevice(img, `Proof_${currentName}_${fileDateISO.replace(/-/g, '')}_${imageExportCounter}.png`);
                                imageExportCounter++;
                            });
                        });
                    }
                    [...pendingLabelImages].forEach((img) => {
                        saveImageToDevice(img, `Proof_${currentName}_${fileDateISO.replace(/-/g, '')}_${imageExportCounter}.png`);
                        imageExportCounter++;
                    });

                    const newSummaryObject = {
                        userName: currentName,
                        department: currentDeptName,
                        zone: shiftData.zone,
                        totalCases: currentCases,
                        finalRate: finalRate,
                        activeSeconds: finalActiveSecs,
                        totalSeconds: finalDurationSecs,
                        breakSeconds: finalDurationSecs - finalActiveSecs, 
                        steps: currentSteps,
                        date: logDate,
                        history: shiftData.history,
                        storeLabel: shiftData.storeLabel,
                        screenshot: screenshotData || "",
                        labelImage: pendingLabelImages[0] || "",
                        labelImages: pendingLabelImages,
                        clockInTime: shiftData.firstStartTime || Date.now(),
                        clockOutTime: finalTimestamp,
                        operatorNote: shiftData.operatorNote || '',
                        notes: shiftData.operatorNote || shiftNotes
                    };

                    // Master Shift Finalization via ShiftDataService (v1.8.0)
                    tasks.push(
                        shiftDataService.finalizeShift(
                            newSummaryObject, 
                            pendingLabelImages.map((img, i) => ({
                                photoId: `photo_${logDate}_main_${i}`,
                                blob: img,
                                orderIndex: i,
                                type: 'label' as const
                            }))
                        ).then((result) => {
                            if (result.success) {
                                showToast("Shift Summary and Pick Report successfully synced to Firestore.", "success");
                            } else {
                                showToast("Error syncing shift to database.", "error");
                            }
                        })
                    );

                    // Setup a timeout so that the app doesn't hang if database saves take too long (e.g., offline)
                    const savePromise = Promise.all(tasks);
                    const timeoutPromise = new Promise((resolve) => setTimeout(resolve, 10000));
                    await Promise.race([savePromise, timeoutPromise]);
                    
                } catch (e) {
                    console.error("Shift Finalization Error:", e);
                    showToast("Error saving shift data. Local backup created.", "error");
                } finally {
                    setIsSavingShift(false);
                    setShiftNotes('');
                    setShowSummary(true); // Now show the summary modal
                    // Check if operator is due for semi-monthly beta survey
                    if (shouldPromptBetaSurvey(currentName)) {
                        setTimeout(() => {
                            setShowBetaSurvey(true);
                        }, 800);
                    }
                    resolve();
                }
            }, 300); // Give React 300ms to render the history page cleanly
        });

        return updatedData;
    };
    
    const takeScreenshot = async (): Promise<string | undefined> => {
        try {
            const element = document.getElementById('app-container');
            const scrollableElement = document.getElementById('scrollable-dashboard');
            const contentElement = document.getElementById('dashboard-content');
            
            if (!element) return undefined;
            
            // Expand scrollable elements dynamically for the shot
            if (scrollableElement && contentElement) {
                // Force children to expand parent
                scrollableElement.style.overflow = 'visible';
                scrollableElement.style.flex = 'none';
                scrollableElement.style.height = `${contentElement.scrollHeight + 50}px`; // Extra padding
                
                // Allow parent to stretch bounds
                element.style.overflow = 'visible';
                element.style.position = 'relative'; // Remove fixed constraints briefly
                element.classList.remove('fixed', 'inset-0');
            }
            
            // Wait slightly for DOM to repaint layout changes
            await new Promise(r => setTimeout(r, 50));
            
            const totalHeight = element.scrollHeight;
            
            // Create a timeout promise to prevent indefinite hanging
            const timeoutPromise = new Promise<undefined>((_, reject) => {
                setTimeout(() => reject(new Error('Screenshot timeout')), 4000);
            });
            
            const screenshotPromise = domToJpeg(element, {
                quality: 0.9,
                scale: 1.5, // 1.5 gives a good balance of quality vs processing speed
                backgroundColor: '#0f172a',
                height: totalHeight,
                filter: (node: HTMLElement) => {
                    // Ignore the saving overlay to prevent infinite loop / blur issues
                    return node.id !== 'saving-overlay' && node.id !== 'summary-modal';
                }
            });
            
            const dataUrl = await Promise.race([screenshotPromise, timeoutPromise]) as string;
            
            // Revert styles safely
            if (scrollableElement) {
                scrollableElement.style.overflow = '';
                scrollableElement.style.flex = '';
                scrollableElement.style.height = '';
                
                element.style.overflow = '';
                element.style.position = '';
                element.classList.add('fixed', 'inset-0');
            }
            
            return dataUrl;
        } catch (e) {
            // Camera/Screenshot error.
            const scrollableElement = document.getElementById('scrollable-dashboard');
            const element = document.getElementById('app-container');
            if (scrollableElement && element) {
                scrollableElement.style.overflow = '';
                scrollableElement.style.flex = '';
                scrollableElement.style.height = '';
                element.style.overflow = '';
                element.style.position = '';
                element.classList.add('fixed', 'inset-0');
            }
            return undefined; // If it fails, just return undefined and let the rest of the shift complete
        }
    };

    const endShift = async () => {
        haptic('medium');
        
        let finalData = shiftData;
        
        // This is primarily called from the summary modal where it's already finalized,
        // but just in case it's called directly, finalize it securely here.
        if (!shiftData.isShiftFinalized) {
             finalData = await finalizeShift();
        }
        
        try {
            const nextData = {
               ...defaultShiftData,
               operator: finalData.operator,
               department: finalData.department,
               haptic: finalData.haptic,
               voiceEnabled: finalData.voiceEnabled,
               selectedSkin: finalData.selectedSkin,
               rotaConfig: finalData.rotaConfig,
               rotaOverrides: finalData.rotaOverrides || {},
               level: finalData.level,
               xp: finalData.xp,
               achievements: finalData.achievements,
               personalBests: finalData.personalBests
            };

            if (finalData.operator) {
                localStorage.setItem(`pickData_${finalData.operator}`, JSON.stringify(nextData));
            }
            // Updating state and checking pending signout...
            setShiftData(nextData);
            setShowSummary(false);
            
            // Process the pending signout intent if the user chose Sign Out & Finish
            if (sessionStorage.getItem('pendingSignOut') === 'true') {
                try {
                    sessionStorage.removeItem('pendingSignOut');
                    sessionStorage.removeItem('session_authenticated');
                    localStorage.removeItem('lastUser');
                    await signOut(auth);
                } catch (signOutErr) {
                    // Signout failure.
                }
                setIsAuthenticated(false);
            }
            
            // Try to exit app (for PWA / APK context)
            try { 
                if (window.navigator && (window.navigator as any).app && (window.navigator as any).app.exitApp) {
                     (window.navigator as any).app.exitApp();
                } else {
                     window.close(); 
                }
            } catch(e) {}
            
            // --- endShift completed ---
        } catch (e) {
            // End shift failure.
            setConfirmDialog({
                title: 'Shift End Error',
                message: 'Failed to end shift: ' + (e instanceof Error ? e.message : String(e)),
                isAlert: true,
                onConfirm: () => setConfirmDialog(null),
                onCancel: () => setConfirmDialog(null)
            });
        }
    };

    const factoryReset = async () => {
        haptic('heavy');
        
        // Clear auth
        try {
            sessionStorage.clear();
            await signOut(auth);
        } catch (e) {
            // Signout failure.
        }

        // Wipe only this specific user's temporary shift data but KEEP settings and progression
        if (shiftData.operator) {
            const currentDataStr = localStorage.getItem(`pickData_${shiftData.operator}`);
            if (currentDataStr) {
                const currentData = JSON.parse(currentDataStr);
                const preservedData = {
                    ...defaultShiftData,
                    operator: currentData.operator,
                    haptic: currentData.haptic,
                    department: currentData.department,
                    zone: currentData.zone,
                    customTargetRate: currentData.customTargetRate,
                    appVersion: APP_VERSION,
                    personalBests: currentData.personalBests,
                    consistencyScore: currentData.consistencyScore,
                    bestHourlyRate: currentData.bestHourlyRate,
                    level: currentData.level,
                    xp: currentData.xp,
                    achievements: currentData.achievements,
                    voiceEnabled: currentData.voiceEnabled,
                    selectedSkin: currentData.selectedSkin,
                    rotaConfig: currentData.rotaConfig || defaultShiftData.rotaConfig,
                    rotaOverrides: currentData.rotaOverrides || defaultShiftData.rotaOverrides
                };
                localStorage.setItem(`pickData_${shiftData.operator}`, JSON.stringify(preservedData));
            }
        }
        localStorage.removeItem('pickData'); // clear legacy fallback
        localStorage.removeItem('lastUser');
        sessionStorage.clear();
        
        // Force complete reload
        window.location.replace(window.location.origin);
    };

    const handleUpdateApp = async () => {
        if (updating) return;
        haptic('medium');
        setUpdating(true);
        
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.update();
                }
            }
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(cacheNames.map(name => caches.delete(name)));
            }
            setTimeout(() => {
                // Force load fresh index.html directly by suffixing cache-buster query parameter
                window.location.replace(window.location.origin + '?u=' + Date.now());
            }, 1000);
        } catch (error) {
            // Update failure fallback
            window.location.replace(window.location.origin + '?u=' + Date.now());
        }
    };

    const handleConsent = () => {
        console.log("Consent granted, saving to localStorage");
        setHasConsented(true);
        localStorage.setItem('userConsented', 'true');
    };

    const handleEmergencySignOut = () => {
        setConfirmDialog({
            title: 'Sign Out Session?',
            message: 'This will finalize any active shift and exit your current session.',
            isAlert: false,
            onConfirm: async () => {
                haptic('heavy');
                if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
                    try {
                        await finalizeShift();
                    } catch (e) {
                        console.error("Auto-finalize on emergency sign out failed:", e);
                    }
                }
                try {
                    sessionStorage.clear();
                    await signOut(auth);
                } catch(e) {
                    console.error("Sign out error:", e);
                    showToast("Sign-out partially failed, but session will be cleared.", "info");
                }
                
                // Clear state
                setIsAuthenticated(false);
                setShiftData(defaultShiftData);
                setUsername('');
                setPassword('');
                const consented = localStorage.getItem('userConsented');
                localStorage.clear(); // Complete wipe for safety
                if (consented) localStorage.setItem('userConsented', consented);
                Preferences.clear().catch(() => {});
                setConfirmDialog(null);
                
                // Force reload to ensure clean state
                window.location.reload();
            },
            onCancel: () => setConfirmDialog(null)
        });
    };

    if (showOnboarding) {
        return <OnboardingModal isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} />;
    }

    if (!hasConsented) {
        return <ConsentScreen onConsent={handleConsent} />;
    }

    if (!isAuthenticated) {
        return (
            <LoginScreen 
                theme={theme}
                availableUpdate={availableUpdate}
                loginError={loginError}
                username={username}
                setUsername={setUsername}
                password={password}
                setPassword={setPassword}
                handleLogin={handleLogin}
                handleDownloadManual={handleDownloadManual}
            />
        );
    }

    return (
        <div id="app-container" {...handlers} className={`fixed inset-0 bg-slate-950 text-white flex flex-col ${theme.font} overflow-hidden select-none pt-safe-top pb-safe-bottom`}>
            {isAppBlocked && (
                <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center p-6 text-center overflow-y-auto pt-safe-top pb-safe-bottom">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                        <div className="absolute top-4 left-4 flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                        </div>
                        <ShieldAlert size={56} className="text-amber-400 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">Update Mandatory</h2>
                        <div className="inline-block px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] font-black uppercase rounded-full mb-4">
                            System v{APP_VERSION} ➔ v{minAllowedVersion}
                        </div>
                        
                        <p className="text-slate-400 text-xs mb-5 leading-relaxed">
                            A newer version of PickApp is required for safe operation and synchronization with the warehouse database.
                        </p>

                        {availableUpdate && availableUpdate.notes && availableUpdate.notes.length > 0 && (
                            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-left mb-6 space-y-2.5">
                                <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">What's New in v{availableUpdate.version}:</span>
                                <ul className="space-y-1.5 pt-0.5">
                                    {availableUpdate.notes.map((note, idx) => (
                                        <li key={idx} className="text-[11px] text-slate-300 flex items-start gap-2">
                                            <span className="text-amber-500 select-none font-bold">▪</span>
                                            <span>{note}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className="bg-slate-950/45 p-3.5 border border-slate-800/40 rounded-2xl mb-6">
                            <label className="flex items-start gap-3 text-left text-slate-300 cursor-pointer select-none">
                                <input 
                                    type="checkbox" 
                                    className="mt-1 w-4 h-4 rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-0 cursor-pointer"
                                    checked={consentUpdate} 
                                    onChange={(e) => setConsentUpdate(e.target.checked)} 
                                />
                                <span className="text-[11px] font-medium leading-normal text-slate-400">
                                    I consent to update and understand I must reload to obtain the newest PickApp build.
                                </span>
                            </label>
                        </div>

                        <button 
                            disabled={!consentUpdate || updating}
                            onClick={async () => {
                                if (availableUpdate) {
                                    await handleUpdateApp();
                                } else {
                                    window.location.reload();
                                }
                            }}
                            className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                                consentUpdate && !updating 
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 active:scale-[0.98]' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {updating ? <RefreshCcw size={16} className="animate-spin" /> : null}
                            <span>{updating ? 'INSTALLING UPDATE...' : 'APPROVE & INSTALL UPDATE'}</span>
                        </button>
                    </div>
                </div>
            )}
            {requiresBetaFeedback && (
                <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-start p-4 text-center overflow-y-auto pt-safe-top pb-safe-bottom">
                    <div className="max-w-md w-full bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl relative my-auto">
                        <div className="absolute top-4 left-4 flex gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <ClipboardCheck size={56} className="text-emerald-400 mx-auto mb-4" />
                        <h2 className="text-xl font-black text-white italic tracking-tighter uppercase mb-1">14-Shift Milestone</h2>
                        <div className="inline-block px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-full mb-6">
                            Mandatory Beta Log
                        </div>
                        
                        <p className="text-slate-300 text-xs mb-6 leading-relaxed">
                            You have completed 14 shifts in the PickApp pilot program. Please submit your operational feedback to permanently unlock the dashboard.
                        </p>

                        <div className="space-y-6 text-left">
                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">UI/UX Ergonomics</label>
                                <p className="text-[10px] text-slate-500 mb-3">How easy was it to tap buttons and read data while moving or wearing gloves?</p>
                                <div className="flex justify-between gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button 
                                            key={star}
                                            onClick={() => setBetaFeedbackData({...betaFeedbackData, ergonomics: star})}
                                            className={`flex-1 py-2 rounded-lg border text-sm font-bold transition-all ${
                                                betaFeedbackData.ergonomics === star 
                                                ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                                            }`}
                                        >
                                            {star}★
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Network Resilience</label>
                                <p className="text-[10px] text-slate-500 mb-3">During Wi-Fi dead zones, did the app crash or preserve data?</p>
                                <div className="space-y-2">
                                    {['Flawless (No data lost)', 'Lagged but recovered', 'Crashed/Lost data'].map((opt) => (
                                        <button 
                                            key={opt}
                                            onClick={() => setBetaFeedbackData({...betaFeedbackData, resilience: opt})}
                                            className={`w-full py-2.5 px-3 rounded-lg border text-xs font-bold transition-all text-left ${
                                                betaFeedbackData.resilience === opt 
                                                ? 'bg-sky-500/20 border-sky-500 text-sky-400' 
                                                : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-750'
                                            }`}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className={`w-3 h-3 rounded-full border ${betaFeedbackData.resilience === opt ? 'bg-sky-500 border-sky-400' : 'border-slate-600'}`} />
                                                {opt}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Motivation Impact</label>
                                <p className="text-[10px] text-slate-500 mb-2">Did Live-Pace & Stretch Goals push you faster? {betaFeedbackData.motivation}/5</p>
                                <input 
                                    type="range" min="1" max="5" step="1"
                                    value={betaFeedbackData.motivation}
                                    onChange={(e) => setBetaFeedbackData({...betaFeedbackData, motivation: parseInt(e.target.value)})}
                                    className="w-full accent-emerald-500"
                                />
                                <div className="flex justify-between text-[9px] text-slate-500 mt-1 font-bold uppercase">
                                    <span>Distracting</span>
                                    <span>Highly Motivating</span>
                                </div>
                            </div>

                            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Qualitative Notes (Optional)</label>
                                <textarea 
                                    placeholder="Any workflow friction or suggestions..."
                                    value={betaFeedbackData.notes}
                                    onChange={(e) => setBetaFeedbackData({...betaFeedbackData, notes: e.target.value})}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 min-h-[80px]"
                                />
                            </div>
                        </div>

                        <button 
                            disabled={submittingBetaFeedback || !betaFeedbackData.ergonomics || !betaFeedbackData.resilience}
                            onClick={handleSubmitBetaFeedback}
                            className={`w-full mt-6 py-4 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2 ${
                                (betaFeedbackData.ergonomics && betaFeedbackData.resilience && !submittingBetaFeedback)
                                ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 active:scale-[0.98]' 
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            {submittingBetaFeedback ? <RefreshCcw size={16} className="animate-spin" /> : null}
                            <span>{submittingBetaFeedback ? 'SUBMITTING...' : 'SUBMIT LOG & UNLOCK'}</span>
                        </button>
                    </div>
                </div>
            )}
            <div className="relative z-[70] shrink-0 pt-safe-top px-4 pb-3 flex justify-center gap-3 bg-slate-950/40 backdrop-blur-[4px] border-b border-slate-900">
                <button 
                    onClick={() => { haptic('light'); setActiveScreen(0); }} 
                    className={`flex-1 max-w-[140px] py-3 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest min-h-[48px] flex items-center justify-center transition-all ${
                        activeScreen === 0 
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    PICKING
                </button>
                <button 
                    onClick={() => { haptic('light'); setActiveScreen(1); }} 
                    className={`flex-1 max-w-[140px] py-3 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest min-h-[48px] flex items-center justify-center transition-all ${
                        activeScreen === 1 
                        ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' 
                        : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                    }`}
                >
                    STATS
                </button>
                {isUserAdmin() && (
                    <button 
                        onClick={() => { haptic('light'); setActiveScreen(2); }} 
                        className={`flex-1 max-w-[140px] py-3 px-4 rounded-2xl text-[11px] font-black uppercase tracking-widest min-h-[48px] flex items-center justify-center transition-all ${
                            activeScreen === 2 
                            ? 'bg-rose-500 text-slate-950 shadow-lg shadow-rose-500/20' 
                            : 'bg-slate-900 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                        }`}
                    >
                        ADMIN
                    </button>
                )}
            </div>

            <div className={`relative z-[60] ${theme.panel.includes('black') ? 'bg-black' : 'bg-slate-900'} pt-3 pb-3.5 px-4 shadow-lg border-b border-slate-800/80 flex flex-col shrink-0`}>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3.5 min-w-0">
                        <Logo size="lg" theme={theme} className="shrink-0" />
                        <div className="flex flex-col justify-center min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl sm:text-3xl font-black italic tracking-tight text-white leading-none">
                                    <span className="bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">PickApp</span>
                                </h1>
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm not-italic">
                                    {currentDept?.name || 'Aisles'}
                                </span>
                                {shiftData.storeLabel && (
                                    <span className="text-[10px] sm:text-xs font-black text-sky-400 bg-sky-500/15 px-2.5 py-0.5 rounded-lg border border-sky-500/30 uppercase tracking-widest leading-none shadow-sm not-italic">
                                        {shiftData.storeLabel}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-[0.2em] leading-none truncate">
                                    Precision Picking • Peak Performance
                                </span>
                                {isOffline && (
                                    <span className="text-[8px] font-black text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded border border-red-500/30 uppercase tracking-widest leading-none shrink-0">
                                        Offline
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 ml-2">
                        <div className="flex gap-2 relative z-[80]">
                            {availableUpdate && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 z-20 animate-pulse" />
                            )}
                            <button 
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowRota(true); setRotaEditMode(false); }}
                                aria-label="My Rota"
                                title="My Rota"
                            >
                                <Calendar size={20} />
                            </button>
                            <button 
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowLeaderboard(true); }}
                                aria-label="View Leaderboard"
                                title="View Leaderboard"
                            >
                                <Trophy size={20} />
                            </button>
                            <button 
                                className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowSettings(!showSettings); }}
                                aria-label="Open Settings"
                                title="Open Settings"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* APK Update Banner */}
                <AnimatePresence>
                    {availableUpdate && (
                        <motion.button
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            onClick={() => { haptic('medium'); setShowSettings(true); setSettingsTab('updates'); }}
                            className="bg-emerald-500 px-4 py-2 flex items-center justify-between text-slate-900 overflow-hidden"
                        >
                            <div className="flex items-center gap-2">
                                <Zap size={14} className="fill-slate-900" />
                                <span className="text-[10px] font-black uppercase tracking-wider">New APK {availableUpdate.version} ready for download</span>
                            </div>
                            <span className="text-[10px] font-black underline underline-offset-2">GET IT</span>
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>
            
            <div className="flex-1 overflow-hidden relative pb-6 text-white font-sans">
                {/* Voice Task Monitor & Overlays */}
                {activeScreen === 0 && (
                    <div id="screen-picking" className="h-full flex flex-col">
                        <div id="scrollable-dashboard" className="flex-1 overflow-y-auto no-scrollbar pb-safe-bottom">
                            <div id="dashboard-content" className="p-4 max-w-md mx-auto space-y-4">
                                
                                {/* Wake Lock Active Indicator */}
                                {shiftData.wakeLock && (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex items-center gap-1.5 bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-4 self-center"
                                    >
                                        <Zap size={12} className="fill-sky-400 animate-pulse" /> Always-On Display Active
                                    </motion.div>
                                )}

                                {/* Firestreak Indicator */}
                                {(shiftData.firestreak || 0) > 0 && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }} 
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/20 mb-4"
                                    >
                                        <div className="p-1.5 bg-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
                                            <Flame size={14} className="text-slate-950 fill-slate-950" />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">Firestreak Active</span>
                                            <span className="text-xs font-black text-white uppercase tracking-tighter mt-1">{shiftData.firestreak} CONSECUTIVE TARGETS</span>
                                        </div>
                                    </motion.div>
                                )}

                                {/* picking dashboard */}
                                <PickingDashboard 
                                    isPicking={isPicking}
                                    theme={theme}
                                    isWarning={isWarning}
                                    caseCount={caseCount}
                                    isCaseCountModified={shiftData.isCaseCountModified}
                                    onEditCaseCount={() => {
                                        haptic('medium');
                                        setIsUnlockingCaseCount(true);
                                        setUnlockPin('');
                                        setUnlockError('');
                                    }}
                                    currentDept={currentDept}
                                    finishTime={finishTime}
                                    stats={stats}
                                    breakTimeDuringCurrentPick={breakTimeDuringCurrentPick}
                                    isOnBreak={isOnBreak}
                                    breakStartTime={breakStartTime}
                                    pickStartTime={pickStartTime}
                                    targetRate={targetRate}
                                    now={now}
                                    formatTime={formatTime}
                                    duoMessage={duoMessage}
                                    pendingLabelImages={pendingLabelImages}
                                    pendingStoreLabels={pendingStoreLabels}
                                />

                                {/* Dashboard Main Content */}
                                <div className="flex flex-col items-center justify-center py-2">
                                    <div className="text-4xl font-light tracking-tight text-white font-mono">
                                        {now.toLocaleTimeString('en-US', { hour12: false })}
                                    </div>
                                    {isOnBreak && (
                                        <div className="mt-2 inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                                            <Coffee size={14} /> On Break
                                        </div>
                                    )}
                                </div>
                                
                                {/* Hands-Free Voice Monitor (MHE Optimized) */}
                                {shiftData.voiceEnabled && shiftData.voiceTask.aisle && (
                                    <div className="mb-4 bg-slate-900 border-2 border-sky-500 rounded-[2.5rem] p-6 shadow-2xl shadow-sky-500/20 overflow-hidden relative">
                                        <div className="absolute top-0 right-0 bg-sky-500 text-slate-950 px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                            Voice Active
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Instruction</span>
                                            </div>
                                            <div className="flex justify-between items-end">
                                                <div className="flex flex-col">
                                                    <div className="text-[12px] font-bold text-sky-400 uppercase tracking-widest">Aisle / Slot</div>
                                                    <div className="text-6xl font-black text-white tracking-tighter leading-none">
                                                        {shiftData.voiceTask.aisle}<span className="text-slate-600">.</span>{shiftData.voiceTask.slot}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest">Cases</div>
                                                    <div className="text-6xl font-black text-white leading-none">
                                                        {shiftData.voiceTask.cases}
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
                                                    <span className={`text-[13px] font-black uppercase tracking-widest ${shiftData.voiceTask.status === 'awaiting_digits' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        {shiftData.voiceTask.status === 'awaiting_digits' ? '● VERIFY DIGITS' : '● START PICKING'}
                                                    </span>
                                                </div>
                                                {shiftData.voiceTask.status === 'awaiting_digits' && (
                                                    <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Check Digits</span>
                                                        <span className="text-2xl font-black text-white tracking-[0.2em]">{shiftData.voiceTask.checkDigits}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Stats Mode Toggle */}
                                <div className="flex justify-between items-center mb-2 px-1">
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                        Performance View
                                    </span>
                                    <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl inline-flex gap-1">
                                        <button 
                                            onClick={() => { haptic('light'); setStatsMode('dept'); }}
                                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${statsMode === 'dept' ? 'bg-slate-800 text-emerald-400 border border-slate-700/50' : 'text-slate-500 border border-transparent'}`}
                                        >
                                            {getDeptName(shiftData.department)}
                                        </button>
                                        <button 
                                            onClick={() => { haptic('light'); setStatsMode('shift'); }}
                                            className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${statsMode === 'shift' ? 'bg-slate-800 text-sky-400 border border-slate-700/50' : 'text-slate-500 border border-transparent'}`}
                                        >
                                            Total Shift
                                        </button>
                                    </div>
                                </div>

                                {/* Main Stats Grid */}
                                <div className="grid grid-cols-2 gap-3 mb-4">
                                    <MetricCard 
                                        label={statsMode === 'dept' ? `${getDeptName(shiftData.department)} Rate` : "Total Shift Rate"}
                                        value={activeCases > 0 && activeElapsed <= 60 ? "CALC..." : (statsMode === 'dept' ? (currentDeptStats.rate || activeRate) : (isShiftFinalized ? finalizedStats?.rate : rate))}
                                        subValue={statsMode === 'dept' ? `Goal: ${activeTargetRate} P/H • Shift Avg: ${rate} P/H` : `Goal: ${targetRate} P/H • ${getDeptName(shiftData.department)}: ${currentDeptStats.rate} P/H`}
                                        isGood={statsMode === 'dept' ? currentDeptStats.isRateGood : (isShiftFinalized ? ((finalizedStats?.rate || 0) >= targetRate) : isRateGood)}
                                        icon={<Trophy size={14} />}
                                        theme={theme}
                                    />
                                    <MetricCard 
                                        label="Net Saved"
                                        value={`${net >= 0 ? "+" : "-"}${formatTime(Math.abs(net))}`}
                                        subValue="Total Shift Vs Target"
                                        isGood={isNetGood}
                                        icon={<Clock size={14} />}
                                        theme={theme}
                                    />
                                </div>

                                {/* Secondary Stats Grid */}
                                <div className="grid grid-cols-3 gap-3">
                                    <MetricCard 
                                        label="Cases"
                                        value={activeCases}
                                        type="secondary"
                                        theme={theme}
                                    />
                                    <MetricCard 
                                        label="Shift Time"
                                        value={formatHHMM(isShiftFinalized ? (finalizedStats?.activeElapsedSeconds || 0) : (statsMode === 'dept' ? activeElapsed : stats.totalShiftSeconds))}
                                        type="secondary"
                                        theme={theme}
                                    />
                                    <MetricCard 
                                        label="Break Time"
                                        value={formatHHMM(statsMode === 'dept' ? currentDeptStats.breakSeconds : totalBreakSeconds)}
                                        type="secondary"
                                        theme={theme}
                                        trend="neutral"
                                    />
                                </div>

                                {/* Action Area */}
                                <div className={`${theme.panel} p-4 ${theme.radius} border mt-2 shadow-2xl`}>
                                    {!shiftData.firstStartTime ? (
                                        <div className="space-y-3">
                                            <button 
                                                className={`w-full py-5 ${theme.bg} text-white ${theme.radius} font-bold text-lg tracking-wide ${theme.bgHover} active:scale-[0.98] transition-all shadow-lg ${theme.shadow} flex flex-col items-center justify-center gap-1`}
                                                onClick={masterStart}
                                            >
                                                <span>START SHIFT NOW</span>
                                                <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest leading-none">Clock in: {now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                            </button>
                                            <button 
                                                className={`w-full py-3.5 bg-slate-800 text-slate-300 ${theme.radius} font-bold text-xs uppercase tracking-widest border border-slate-700 hover:text-white flex items-center justify-center gap-2`}
                                                onClick={() => { 
                                                    setManualClockType('in');
                                                    haptic('light'); 
                                                    setShowClockInModal(true); 
                                                }}
                                            >
                                                <Clock size={16} /> Manual Clock In
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-4 gap-2">
                                                {[
                                                    { id: 1, val: lane1, set: setLane1 },
                                                    { id: 2, val: lane2, set: setLane2 },
                                                    { id: 3, val: lane3, set: setLane3 },
                                                    { id: 4, val: lane4, set: setLane4 }
                                                ].map(lane => (
                                                    <div key={lane.id} className={`bg-slate-950 p-2 pb-3 ${theme.radius} border border-slate-800 text-center relative`}>
                                                        <div className="text-[12px] text-slate-400 font-black uppercase tracking-wider mb-1">L{lane.id}</div>
                                                        <input 
                                                            type="number" 
                                                            className="w-full bg-transparent text-white text-center text-3xl font-black outline-none placeholder:text-slate-800"
                                                            placeholder="--"
                                                            value={lane.val}
                                                            onChange={e => { 
                                                                const val = e.target.value;
                                                                lane.set(val); 
                                                                localStorage.setItem(`draft_lane${lane.id}`, val);
                                                                haptic('light'); 
                                                            }}
                                                            disabled={lane.id === 1 ? isOnBreak : (isPicking || isOnBreak)}
                                                        />
                                                        <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 min-w-[44px]">
                                                            <span className={`text-[14px] font-black tracking-tighter ${theme.text}`}>
                                                                {(DEPT_LANES[shiftData.department] || 
                                                                  DEPT_LANES[`${shiftData.zone.toLowerCase()}/${shiftData.department}`] || 
                                                                  DEPT_LANES[shiftData.zone.toLowerCase()])?.[lane.val] || "---"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="pt-2">
                                                {isPicking && finishTime && (
                                                    <div className="text-center mb-3">
                                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${stats.timeRemainingSecs < 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : (isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats.timeRemainingSecs < 0 ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : 'bg-emerald-400')}`}></div>
                                                            {stats.timeRemainingSecs < 0 ? 'OVERDUE - TARGET WAS ' : (isWarning ? 'HURRY! FINISH BY ' : 'FINISH BY ')} {finishTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})} ({stats.currentTargetSeconds > 3600 ? formatHHMM(stats.currentTargetSeconds) : formatTime(stats.currentTargetSeconds)})
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Pre-Pick Label Grid for idle state */}
                                                {!isPicking && (pendingLabelImages.length > 0 || pendingStoreLabels.length > 0) && (
                                                    <div className="mb-4 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/40">
                                                        <div className="flex justify-between items-center mb-2 px-1">
                                                            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Stored Labels ({pendingLabelImages.length}/4)</span>
                                                            <button onClick={() => { setPendingLabelImages([]); setPendingStoreLabels([]); haptic('heavy'); }} className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:underline">Clear All</button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            {Array.from({ length: Math.max(pendingLabelImages.length, pendingStoreLabels.length) }).map((_, index) => {
                                                                const img = pendingLabelImages[index];
                                                                const label = pendingStoreLabels[index] || "NO LABEL TEXT";
                                                                return (
                                                                    <div key={index} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-1.5 flex items-center justify-between gap-2">
                                                                        <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                                            {img ? (
                                                                                <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-800 cursor-pointer" onClick={() => setViewingLabels([img])}>
                                                                                    <img src={img} className="w-full h-full object-cover" />
                                                                                </div>
                                                                            ) : <div className="w-7 h-7 rounded-lg bg-slate-950 shrink-0 border border-dashed border-slate-800" />}
                                                                            <span className="text-[10px] text-white font-mono truncate font-bold">{label}</span>
                                                                        </div>
                                                                        <button onClick={() => { setPendingLabelImages(prev => prev.filter((_, i) => i !== index)); setPendingStoreLabels(prev => prev.filter((_, i) => i !== index)); haptic('light'); }} className="text-rose-500/50 hover:text-rose-500 p-1">✕</button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                <input 
                                                    type="number" 
                                                    className={`w-full p-5 mb-4 ${theme.radius} border-2 border-slate-800 bg-slate-950 text-white text-3xl font-light text-center outline-none ${theme.borderFocusLarge} transition-colors disabled:opacity-50 placeholder:text-slate-600`}
                                                    placeholder="0"
                                                    inputMode="numeric"
                                                    value={caseCount}
                                                    onChange={e => { setCaseCount(e.target.value); haptic('light'); }}
                                                    disabled={isPicking || isOnBreak}
                                                />



                                                {/* Shift Notes / Reminders (Active Picking Screen) */}
                                                <div className="mb-4 text-left">
                                                    <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 ml-1">Shift Notes / Reminders</label>
                                                    <textarea 
                                                        className={`w-full bg-slate-950 p-3 rounded-2xl border border-slate-800 text-sm focus:outline-none focus:min-h-[140px] ${theme.borderFocus} text-white transition-all duration-300 min-h-[80px] placeholder:text-slate-600`}
                                                        placeholder="Type any scratch notes, drop lane hints, or shift reminders here..."
                                                        value={shiftData.operatorNote || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            updateShiftData({ operatorNote: val });
                                                            setShiftNotes(val);
                                                            localStorage.setItem('draft_operatorNote', val);
                                                        }}
                                                        disabled={isOnBreak}
                                                    />
                                                    {(shiftData.operatorNote || '').trim() && (
                                                        <button 
                                                            type="button"
                                                            onClick={saveStandaloneNote}
                                                            className="w-full mt-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl font-bold text-xs uppercase tracking-wider border border-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                                        >
                                                            <FileText size={14} /> Save Note to History Table
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Gap Timer UI */}
                                                {!isPicking && !isOnBreak && shiftData.firstStartTime && shiftData.lastStopTimestamp && (
                                                    <div className={`mb-4 ${theme.panel} ${theme.radius} p-4 border border-slate-800 text-center`}>
                                                        <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 leading-none">3-Min Gap Timer</div>
                                                        {((now.getTime() - shiftData.lastStopTimestamp) / 1000) >= 180 ? (
                                                            <div className="text-red-500 font-black text-2xl animate-pulse italic tracking-tight">
                                                                OVERRIDE: {formatTime(((now.getTime() - shiftData.lastStopTimestamp) / 1000) - 180)}
                                                            </div>
                                                        ) : (
                                                            <div className={`${theme.text} font-black text-3xl italic tracking-tight`}>
                                                                {formatTime(180 - ((now.getTime() - shiftData.lastStopTimestamp) / 1000))}
                                                            </div>
                                                        )}
                                                        <div className={`w-full bg-slate-800 h-1.5 ${theme.radius} mt-3 overflow-hidden`}>
                                                            <div 
                                                                className={`h-full transition-all duration-1000 ${((now.getTime() - shiftData.lastStopTimestamp) / 1000) >= 180 ? 'bg-red-500' : theme.bg}`} 
                                                                style={{ width: `${Math.min(100, (((now.getTime() - shiftData.lastStopTimestamp) / 1000) / 180) * 100)}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                )}

                                                {!isOnBreak ? (
                                                    <>
                                                        {!isPicking ? (
                                                            <button 
                                                                className={`w-full py-5 bg-emerald-500 text-slate-900 ${theme.radius} font-black text-xl tracking-tighter hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 min-h-[68px] italic`}
                                                                onClick={startPick}
                                                            >
                                                                <Play fill="currentColor" size={24} /> START PICKING
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                className={`w-full py-5 bg-red-500 text-white ${theme.radius} font-black text-xl tracking-tighter hover:bg-red-400 active:scale-[0.98] transition-all shadow-xl shadow-red-500/10 flex items-center justify-center gap-3 min-h-[68px] italic`}
                                                                onClick={stopPick}
                                                            >
                                                                <Square fill="currentColor" size={24} /> FINISH PICKING
                                                            </button>
                                                        )}
                                                        
                                                        <button 
                                                            className={`w-full mt-4 py-5 bg-slate-900 text-slate-300 ${theme.radius} font-black text-sm tracking-widest uppercase hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-slate-800 shadow-lg min-h-[60px]`}
                                                            onClick={startPaidBreak}
                                                        >
                                                            <Coffee size={20} className="text-amber-500" /> START PAID BREAK
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button 
                                                        className={`w-full py-5 bg-amber-500 text-slate-900 ${theme.radius} font-bold text-lg tracking-wide hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2`}
                                                        onClick={stopPaidBreak}
                                                    >
                                                        <Play fill="currentColor" size={20} /> RESUME SHIFT
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* History Section */}
                                {shiftData.history.length > 0 && (
                                    <div className="mt-8">
                                        <div className="flex justify-between items-end mb-4 px-1">
                                            <h3 className={`text-sm font-bold text-white tracking-tight flex items-center gap-2 ${theme.font}`}>
                                                Pick History
                                                <span className={`text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 ${theme.radius} border border-slate-800`}>{shiftData.history.filter((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote).length} RECORDS</span>
                                            </h3>
                                        </div>

                                        {/* Enhanced Shift Analytics: Consistency & Best Pick */}
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div className={`${theme.panel} p-3 ${theme.radius} border border-slate-800 flex items-center gap-3`}>
                                                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/20">
                                                    <Award size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Consistency</div>
                                                    <div className="text-sm font-black text-white italic">
                                                        {consistencyPercent}%
                                                    </div>
                                                </div>
                                            </div>
                                            <div className={`${theme.panel} p-3 ${theme.radius} border border-slate-800 flex items-center gap-3`}>
                                                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                                                    <Zap size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Shift Best</div>
                                                    <div className="text-sm font-black text-white italic">
                                                        {shiftBestRate} <span className="text-[9px] font-bold text-slate-600 not-italic">PH</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`${theme.panel} ${theme.radius} border border-slate-800 overflow-hidden relative shadow-xl`}>
                                            <div 
                                                className="max-h-[320px] sm:max-h-[400px] overflow-y-auto overflow-x-auto no-scrollbar"
                                                onTouchStart={(e) => e.stopPropagation()}
                                                onTouchMove={(e) => e.stopPropagation()}
                                                onTouchEnd={(e) => e.stopPropagation()}
                                            >
                                                <table className="w-full text-[10px] sm:text-xs">
                                                    <thead>
                                                        <tr className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800 z-10 text-[9px] sm:text-[10px] uppercase font-black tracking-wider">
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-left whitespace-nowrap text-slate-500">Start</th>
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-left whitespace-nowrap text-slate-500">Label</th>
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-left whitespace-nowrap text-slate-500">Finish</th>
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-center whitespace-nowrap text-slate-500">Gap</th>
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-center whitespace-nowrap text-slate-500">Cases</th>
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-center whitespace-nowrap text-slate-500">Rate</th>
                                                            <th className="py-2.5 px-2 sm:px-3.5 text-right whitespace-nowrap text-slate-500">Saved</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-800/40">
                                                        {shiftData.history.map((entry: any, i: number) => {
                                                            const isBest = entry.rate === shiftBestRate && typeof entry.rate === 'number';
                                                            const isNote = entry.gap === 'NOTE' || entry.isNote;
                                                            if (isNote) {
                                                                return (
                                                                    <tr key={i} className="group bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500 transition-colors">
                                                                        <td className="py-2.5 px-1.5 sm:px-3 text-amber-400 font-extrabold whitespace-nowrap flex items-center gap-1.5">
                                                                            <FileText size={11} className="shrink-0" />
                                                                            {entry.start}
                                                                        </td>
                                                                        <td colSpan={5} className="py-2.5 px-1.5 sm:px-3 text-amber-300 font-bold max-w-xl break-words">
                                                                            <div className="flex flex-col">
                                                                                <span className="whitespace-normal leading-relaxed text-[11px] sm:text-xs font-black select-text tracking-wide">{entry.storeLabel}</span>
                                                                                {entry.departmentName && (
                                                                                    <span className="text-[8px] text-amber-500/60 font-black tracking-wider uppercase block mt-1">
                                                                                        LOGGED IN: {entry.departmentName}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        </td>
                                                                        <td className="py-2.5 px-1.5 sm:px-3 text-right text-amber-500/70 font-black text-[9px] uppercase tracking-wider whitespace-nowrap">
                                                                            NOTE
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            }
                                                            return (
                                                                <tr key={i} className={`group hover:bg-slate-800/25 transition-colors ${isBest ? 'bg-amber-400/5' : ''}`}>
                                                                     <td className="py-2 px-1.5 sm:px-3 text-sky-400 font-extrabold whitespace-nowrap flex items-center gap-1.5">
                                                                        {isBest && <Zap size={10} className="text-amber-400 shrink-0" />}
                                                                        {entry.start}
                                                                    </td>
                                                                    <td className="py-2 px-1.5 sm:px-3 text-sky-400 font-bold whitespace-nowrap">
                                                                        <div className="flex flex-col">
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="truncate max-w-[150px] sm:max-w-[220px]" title={entry.storeLabel || entry.departmentName || `Order #${i + 1}`}>
                                                                                    {entry.storeLabel || entry.departmentName || `Order #${i + 1}`}
                                                                                </span>
                                                                                {(entry.labelImage || (entry.labelImages && entry.labelImages.length > 0)) && (
                                                                                    <button 
                                                                                        onClick={(e) => { 
                                                                                            e.stopPropagation(); 
                                                                                            const allI = [
                                                                                                ...(entry.labelImages || []), 
                                                                                                ...(entry.labelImage ? [entry.labelImage] : [])
                                                                                            ].filter(Boolean);
                                                                                            setViewingLabels(allI.length ? allI : null); 
                                                                                        }} 
                                                                                        className="text-emerald-400 p-0.5 hover:bg-emerald-500/10 rounded shrink-0 border border-emerald-500/20"
                                                                                    >
                                                                                        <Camera size={11} />
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                            {entry.gap !== 'BREAK' && entry.gap !== 'NOTE' && !entry.isNote && (
                                                                                <span className="text-[8px] text-slate-500 font-black tracking-wider uppercase block mt-0.5">
                                                                                    {entry.departmentName || entry.department || 'Aisles'}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-2 px-1.5 sm:px-3 text-slate-400 whitespace-nowrap">{entry.finish || '--:--'}</td>
                                                                    <td className="py-2 px-1.5 sm:px-3 text-center text-slate-400 font-mono whitespace-nowrap">{entry.gap}</td>
                                                                    <td className="py-2 px-1.5 sm:px-3 text-center font-medium whitespace-nowrap">
                                                                        <div className="flex flex-col items-center">
                                                                            <span className={entry.isCaseCountModified ? 'text-fuchsia-400 font-bold' : 'text-white'}>{entry.cases}</span>
                                                                            {entry.isCaseCountModified && <span className="text-[7px] bg-fuchsia-500/20 text-fuchsia-300 px-1 rounded border border-fuchsia-500/20 mt-0.5">MODIFIED</span>}
                                                                        </div>
                                                                    </td>
                                                                    <td className={`py-2 px-1.5 sm:px-3 text-center font-black whitespace-nowrap ${isBest ? 'text-amber-400' : 'text-white'}`}>{entry.rate}</td>
                                                                    <td className={`py-2 px-1.5 sm:px-3 text-right font-black text-[10px] sm:text-xs whitespace-nowrap ${entry.statusClass}`}>{entry.saved}</td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Move buttons back here, just after table */}
                                        <div className="flex gap-3 mt-6 mb-10">
                                            <button 
                                                className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-semibold text-sm tracking-wide hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-slate-700"
                                                onClick={() => downloadReport()}
                                            >
                                                <Download size={18} /> Export
                                            </button>
                                            <div className="flex gap-2">
                                                <button 
                                                    className="py-4 px-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm tracking-wide hover:text-white border border-slate-700"
                                                    onClick={() => {
                                                        const d = new Date();
                                                        setManualClockTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
                                                        setManualClockType('out');
                                                        haptic('light');
                                                        setShowClockInModal(true);
                                                    }}
                                                >
                                                    <Clock size={20} />
                                                </button>
                                                <button 
                                                    className={`flex-1 py-4 ${theme.bg} text-white rounded-2xl font-semibold text-sm tracking-wide ${theme.bgHover} active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg ${theme.shadow}`}
                                                    onClick={handleEndOfDay}
                                                >
                                                    <CheckCircle size={18} /> Clock Out Now
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
                
                <AnimatePresence>
                    {showSettings && (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-slate-950/90 z-[150] flex flex-col justify-end sm:justify-center p-4 backdrop-blur-xl"
                        >
                            <motion.div 
                                initial={{ y: "100%", scale: 0.9 }}
                                animate={{ y: 0, scale: 1 }}
                                exit={{ y: "100%", scale: 0.9 }}
                                className="bg-slate-900 w-full max-w-md mx-auto rounded-[24px] border border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[92vh]"
                            >
                                {/* Header */}
                                <div className="p-3.5 pb-2.5 flex justify-between items-center border-b border-slate-800/50">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl ${theme.bg} flex items-center justify-center text-white shadow-lg ${theme.shadow}`}>
                                            <Settings size={18} className="animate-spin-slow" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-black text-white italic tracking-tight">ENGINE ROOM</h3>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">System Configuration</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => { haptic('light'); setShowSettings(false); }} 
                                        className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white active:scale-90 transition-all border border-slate-700/50"
                                        aria-label="Close Settings"
                                    >
                                        <X size={18}/>
                                    </button>
                                </div>

                                {/* Tab Navigation */}
                                <div className="px-3.5 py-2.5 flex gap-2 overflow-x-auto no-scrollbar border-b border-slate-800/30 bg-slate-900/50">
                                    {[
                                        { id: 'ops', icon: LayoutDashboard, label: 'OPS' },
                                        { id: 'rate', icon: Trophy, label: 'GOALS' },
                                        { id: 'ui', icon: Sliders, label: 'DEVICES' },
                                        { id: 'data', icon: FileText, label: 'DATA' },
                                        { id: 'vault', icon: Lock, label: 'VAULT' }
                                    ].map(tab => {
                                        const isActive = settingsTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => { haptic('light'); setSettingsTab(tab.id as any); }}
                                                className={`flex-shrink-0 px-3.5 py-2 rounded-xl flex items-center gap-2 transition-all border ${isActive ? `${theme.bg} border-emerald-500/30 text-white shadow-[0_0_15px_rgba(16,185,129,0.1)]` : 'bg-slate-950/40 border-slate-800/60 text-slate-500 hover:text-slate-300'}`}
                                            >
                                                <tab.icon size={14} className={isActive ? 'text-white' : 'text-slate-500'} />
                                                <span className="text-[9px] font-black uppercase tracking-widest leading-none">{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                <div className="flex-1 overflow-y-auto p-4 space-y-5 no-scrollbar bg-slate-900">
                                    {settingsTab === 'vault' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                            <div className="p-6 bg-slate-950 border border-slate-800 rounded-[32px]">
                                                <h4 className="text-[12px] font-black text-white uppercase tracking-widest mb-4">Skins Vault</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {Object.entries(SKIN_REQUIREMENTS).map(([skinId, req]) => {
                                                        const isUnlocked = (userProfile?.level || 0) >= req.level;
                                                        return (
                                                            <div key={skinId} className={`p-4 rounded-2xl border ${isUnlocked ? 'border-emerald-500/30 bg-emerald-950/10' : 'border-slate-800 bg-slate-950/50'}`}>
                                                                <div className="text-[10px] font-black text-white uppercase">{req.name}</div>
                                                                <div className={`text-[8px] font-bold mt-1 ${isUnlocked ? 'text-emerald-500' : 'text-slate-500'}`}>{isUnlocked ? 'UNLOCKED' : req.desc}</div>
                                                                <button
                                                                    disabled={!isUnlocked}
                                                                    onClick={() => {
                                                                        setShiftData({...shiftData, selectedSkin: skinId});
                                                                        haptic('medium');
                                                                    }}
                                                                    className={`mt-3 w-full py-2 rounded-lg text-[9px] font-black uppercase ${isUnlocked && (shiftData.selectedSkin || 'classic') === skinId ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'} ${!isUnlocked && 'opacity-50 cursor-not-allowed'}`}
                                                                >
                                                                    {isUnlocked ? ((shiftData.selectedSkin || 'classic') === skinId ? 'SELECTED' : 'SELECT') : 'LOCKED'}
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}

                                    {settingsTab === 'ops' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                            {/* Invite Colleague Quick Banner */}
                                            <div 
                                                onClick={() => { haptic('medium'); setShowInviteModal(true); }}
                                                className="p-4 rounded-3xl bg-gradient-to-r from-sky-950/60 via-slate-900 to-emerald-950/60 border border-sky-500/30 flex items-center justify-between cursor-pointer hover:border-sky-400/50 transition-all active:scale-98 shadow-lg shadow-sky-500/5 group"
                                            >
                                                <div className="flex items-center gap-3.5">
                                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-transform">
                                                        <UserPlus size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-black text-white uppercase tracking-tight flex items-center gap-1.5">
                                                            Invite Colleague
                                                            <Sparkles size={12} className="text-emerald-400" />
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-medium">Generate instant QR code & share link</p>
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
                                            </div>

                                            {/* Zone Select */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between px-1">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Zone</label>
                                                    <span className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-950 border border-slate-800 text-slate-400">HARDWARE LOCK: OFF</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-3">
                                                    {Object.entries(DEPARTMENTS).map(([key, z]) => (
                                                        <button
                                                            key={key}
                                                            onClick={() => {
                                                                const newZone = key as keyof typeof DEPARTMENTS;
                                                                const firstDept = Object.values(DEPARTMENTS[newZone].depts)[0];
                                                                const firstSub = Object.keys(firstDept.sub)[0];
                                                                haptic('medium'); 
                                                                setShiftData({...shiftData, zone: newZone, department: firstSub, customTargetRate: null}); 
                                                            }}
                                                            disabled={isPicking || isOnBreak}
                                                            className={`h-24 rounded-[28px] flex flex-col items-center justify-center gap-2 transition-all border-2 ${shiftData.zone === key ? `${theme.border} bg-slate-800/80 shadow-[0_8px_20px_-5px_rgba(0,0,0,0.5)]` : 'bg-slate-950/50 border-slate-800/50 text-slate-700 hover:border-slate-700'} ${(isPicking || isOnBreak) ? 'opacity-40 cursor-not-allowed grayscale' : ''}`}
                                                        >
                                                            <div className={`p-2 rounded-xl ${shiftData.zone === key ? 'bg-white/10' : 'bg-slate-900/50'}`}>
                                                                {key === 'AMBIENT' && <Coffee size={20} className={shiftData.zone === key ? theme.text : 'text-slate-600'} />}
                                                                {key === 'CHILLER' && <Zap size={20} className={shiftData.zone === key ? theme.text : 'text-slate-600'} />}
                                                                {key === 'FREEZER' && <RefreshCcw size={20} className={shiftData.zone === key ? theme.text : 'text-slate-600'} />}
                                                            </div>
                                                            <span className={`text-[10px] font-black uppercase tracking-widest ${shiftData.zone === key ? 'text-white' : 'text-slate-600'}`}>{z.name.split(' ')[0]}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Store Label Input */}
                                            <div className="space-y-4">
                                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Store Identity Label</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-4 flex items-center text-slate-600 group-focus-within:text-sky-500 transition-colors">
                                                        <Hash size={18} />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        value={shiftData.storeLabel || ''} 
                                                        onChange={(e) => setShiftData({...shiftData, storeLabel: e.target.value.toUpperCase()})}
                                                        className="w-full bg-slate-950 border-2 border-slate-800/80 py-5 pl-12 pr-4 rounded-2xl text-white font-mono uppercase tracking-[0.2em] focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all placeholder-slate-800"
                                                        placeholder="UNASSIGNED (e.g. C293)"
                                                    />
                                                </div>
                                            </div>

                                            {/* Dept Selection Grouped */}
                                            <div className="space-y-6">
                                                <div className="flex items-center gap-3 px-1">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assignment Selection</label>
                                                </div>
                                                {Object.entries(zoneData.depts).map(([deptKey, dept]) => (
                                                    <div key={deptKey} className="space-y-3 bg-slate-950/30 p-4 rounded-3xl border border-slate-800/40">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">{dept.name}</span>
                                                            <div className="h-[1px] flex-1 bg-gradient-to-r from-slate-800/80 to-transparent"></div>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2.5">
                                                            {Object.entries(dept.sub).map(([key, d]: [string, any]) => {
                                                                const targetVal = warehouseConfig?.customDeptTargets?.[key] !== undefined 
                                                                    ? warehouseConfig.customDeptTargets[key] 
                                                                    : d.target;
                                                                return (
                                                                    <button
                                                                        key={key}
                                                                        onClick={() => {
                                                                            haptic('medium'); 
                                                                            setShiftData({...shiftData, department: key, customTargetRate: null}); 
                                                                        }}
                                                                        disabled={isPicking || isOnBreak}
                                                                        className={`py-3 px-3 rounded-2xl text-[9px] font-black uppercase tracking-wider transition-all border-2 flex items-center justify-between gap-1.5 ${shiftData.department === key ? `${theme.border} bg-slate-800 text-white shadow-lg` : 'bg-slate-900/60 border-slate-800/60 text-slate-500 hover:border-slate-700'} ${(isPicking || isOnBreak) ? 'opacity-40 cursor-not-allowed' : ''}`}
                                                                    >
                                                                        <span className="text-left leading-tight break-words flex-1 py-0.5">{d.name}</span>
                                                                        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded shrink-0 ${shiftData.department === key ? 'bg-white/10 text-white' : 'bg-slate-800 text-slate-400'}`}>{targetVal}</span>
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                                <div className="mt-4 p-5 bg-slate-950/50 rounded-[32px] border border-slate-800/80 overflow-hidden relative">
                                                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-sky-500/5 rounded-full blur-2xl"></div>
                                                    {(isPicking || isOnBreak) && (
                                                        <div className="mb-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
                                                            <AlertCircle size={18} className="text-rose-500 shrink-0" />
                                                            <span className="text-[10px] font-black text-rose-500 uppercase tracking-tight leading-tight">ACTIVE CYCLE DETECTED: Configuration lock is currently engaged.</span>
                                                        </div>
                                                    )}
                                                    <div className="flex items-center gap-3 mb-2.5">
                                                        <div className={`w-8 h-8 rounded-xl ${theme.bg} flex items-center justify-center text-white`}>
                                                            <Sparkles size={16} />
                                                        </div>
                                                        <span className="text-[11px] font-black text-slate-200 uppercase tracking-widest">Logic: {isAisles ? 'Aisles Linear' : '3-Min Offset'}</span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight pl-11">
                                                        {isAisles 
                                                            ? "45m dynamic buffering distributed across shift rotation."
                                                            : "180s gap insulation applied to inter-order transitions."}
                                                    </p>
                                                </div>

                                                {/* Manual Link in Settings */}
                                                <div className="pt-2">
                                                    <button 
                                                        onClick={handleDownloadManual}
                                                        className="w-full p-5 bg-slate-950 border-2 border-slate-800/50 rounded-[32px] flex items-center justify-between group hover:border-emerald-500/30 transition-all shadow-inner"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 group-hover:text-emerald-400 transition-all group-hover:scale-110">
                                                                <BookOpen size={22} />
                                                            </div>
                                                            <div className="text-left">
                                                                <h4 className="text-sm font-black text-white italic tracking-tight">OPS COMPLIANCE MANUAL</h4>
                                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">System Documentation / PDF</p>
                                                            </div>
                                                        </div>
                                                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-700 group-hover:text-white transition-colors border border-slate-800">
                                                            <Download size={16} />
                                                        </div>
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}

                                    {settingsTab === 'rate' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                            <div className="space-y-5">
                                                <div className="flex justify-between items-end px-1">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Manual Rate Override</label>
                                                    <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">TARGET: {currentDept?.target || 200}</span>
                                                </div>
                                                <div className="relative group">
                                                    <input 
                                                        type="number" 
                                                        inputMode="numeric"
                                                        className={`w-full bg-slate-950 border-2 border-slate-800 text-white p-7 rounded-[32px] text-5xl font-black italic outline-none ${theme.borderFocus} pr-24 transition-all placeholder-slate-900 shadow-inner group-focus-within:shadow-[0_0_30px_rgba(0,0,0,0.5)]`}
                                                        value={shiftData.customTargetRate || ''}
                                                        onChange={e => {
                                                            const val = parseInt(e.target.value);
                                                            const targetVal = isNaN(val) ? null : val;
                                                            setShiftData({...shiftData, customTargetRate: targetVal});
                                                            if (isUserAdmin()) {
                                                                handleAdminTargetRateChange(targetVal);
                                                            }
                                                        }}
                                                        placeholder={currentDept?.target.toString()}
                                                    />
                                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 font-black text-slate-700 italic text-xl tracking-widest">PH</div>
                                                </div>
                                                <div className="grid grid-cols-4 gap-3">
                                                    {[-20, -10, +10, +20].map(v => (
                                                        <button 
                                                            key={v}
                                                            onClick={() => {
                                                                const curr = shiftData.customTargetRate || currentDept?.target || 200;
                                                                const nextVal = Math.max(10, curr + v);
                                                                setShiftData({...shiftData, customTargetRate: nextVal});
                                                                if (isUserAdmin()) {
                                                                    handleAdminTargetRateChange(nextVal);
                                                                }
                                                                haptic('light');
                                                            }}
                                                            className="py-3.5 bg-slate-950 rounded-2xl text-[11px] font-black text-slate-500 hover:text-white border-2 border-slate-800/80 hover:border-slate-600 transition-all active:scale-95 shadow-sm"
                                                        >
                                                            {v > 0 ? `+${v}` : v}
                                                        </button>
                                                    ))}
                                                </div>

                                                {/* Pre-Pick Label Grid for idle state */}
                                                {!isPicking && (pendingLabelImages.length > 0 || pendingStoreLabels.length > 0) && (
                                                    <div className="bg-slate-950 border-2 border-slate-800/80 p-5 rounded-[32px] shadow-inner relative overflow-hidden">
                                                        <div className="absolute -top-10 -right-10 w-20 h-20 bg-amber-500/5 blur-2xl rounded-full"></div>
                                                        <div className="flex justify-between items-center mb-4 px-1">
                                                            <div className="flex items-center gap-2">
                                                                <Camera size={14} className="text-amber-500" />
                                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Manifest Buffer ({pendingLabelImages.length}/4)</span>
                                                            </div>
                                                            <button 
                                                                onClick={() => { setPendingLabelImages([]); setPendingStoreLabels([]); haptic('heavy'); }} 
                                                                className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em] hover:text-rose-400 transition-colors bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20"
                                                            >
                                                                Purge Buffer
                                                            </button>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {Array.from({ length: Math.max(pendingLabelImages.length, pendingStoreLabels.length) }).map((_, index) => {
                                                                const img = pendingLabelImages[index];
                                                                const label = pendingStoreLabels[index] || "NULL_LABEL";
                                                                return (
                                                                    <div key={index} className="bg-slate-900 border border-slate-800/80 rounded-2xl p-2 flex items-center justify-between gap-3 relative group overflow-hidden">
                                                                        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
                                                                            {img ? (
                                                                                <div 
                                                                                    className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-700 cursor-pointer shadow-md active:scale-90 transition-transform" 
                                                                                    onClick={() => setViewingLabels([img])}
                                                                                >
                                                                                    <img src={img} className="w-full h-full object-cover" />
                                                                                </div>
                                                                            ) : <div className="w-9 h-9 rounded-xl bg-slate-950 shrink-0 border-2 border-dashed border-slate-800 flex items-center justify-center text-slate-800" />}
                                                                            <span className="text-[11px] text-white font-mono truncate font-black tracking-tight">{label}</span>
                                                                        </div>
                                                                        <button 
                                                                            onClick={() => { setPendingLabelImages(prev => prev.filter((_, i) => i !== index)); setPendingStoreLabels(prev => prev.filter((_, i) => i !== index)); haptic('light'); }} 
                                                                            className="text-slate-700 hover:text-rose-500 transition-colors p-1"
                                                                        >
                                                                            <X size={16} />
                                                                        </button>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Department Reference Table */}
                                                <div className="bg-slate-950 border-2 border-slate-800 rounded-[32px] p-6 shadow-inner">
                                                    <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
                                                        <div className={`w-9 h-9 rounded-xl ${theme.bg} flex items-center justify-center text-white shadow-md`}>
                                                            <Trophy size={18} />
                                                        </div>
                                                        <h5 className="text-[11px] font-black text-white uppercase tracking-[0.2em] italic">Department Benchmarks</h5>
                                                    </div>
                                                    <div className="space-y-6">
                                                        {Object.values(DEPARTMENTS).map(zone => (
                                                            <div key={zone.name} className="space-y-3">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="h-[2px] w-4 bg-emerald-500/50"></div>
                                                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{zone.name}</div>
                                                                </div>
                                                                {Object.values(zone.depts).map(dept => (
                                                                    <div key={dept.name} className="space-y-2 pl-3">
                                                                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{dept.name}</div>
                                                                        <div className="grid grid-cols-1 gap-1.5">
                                                                            {Object.entries(dept.sub).map(([key, d]: [string, any]) => {
                                                                                const targetVal = warehouseConfig?.customDeptTargets?.[key] !== undefined 
                                                                                    ? warehouseConfig.customDeptTargets[key] 
                                                                                    : d.target;
                                                                                return (
                                                                                    <div key={key} className="flex justify-between items-center bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-800/60 hover:border-slate-700 transition-colors">
                                                                                        <span className="text-[11px] text-slate-300 font-black tracking-tight">{d.name}</span>
                                                                                        <div className="flex items-center gap-3">
                                                                                            {(key === 'aisles' || key.startsWith('aisle')) && <span className="text-[8px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-lg border border-sky-400/20 font-black">+45M BUF</span>}
                                                                                            <span className="text-[11px] text-white font-black italic tracking-widest">{targetVal} PH</span>
                                                                                        </div>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {shiftData.customTargetRate && (
                                                    <button 
                                                        onClick={() => {
                                                            setShiftData({...shiftData, customTargetRate: null});
                                                            if (isUserAdmin()) {
                                                                handleAdminTargetRateChange(null);
                                                            }
                                                        }}
                                                        className="w-full py-5 bg-slate-950 border-2 border-slate-800/80 rounded-[28px] text-[11px] font-black uppercase text-slate-500 flex items-center justify-center gap-3 hover:text-white hover:border-emerald-500/40 transition-all shadow-sm"
                                                    >
                                                        <RotateCcw size={14} className="animate-spin-slow" /> De-activate Override
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {settingsTab === 'ui' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                                            {/* Hardware Feedback & Diagnostics Panel */}
                                            <div className="p-4 bg-slate-950/60 rounded-3xl border border-slate-800 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Activity size={16} className="text-emerald-400" />
                                                        <h4 className="text-xs font-black text-white uppercase tracking-wider">Haptic Feedback & Sound Test</h4>
                                                    </div>
                                                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold uppercase ${isVibrationSupported() ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                                                        {isVibrationSupported() ? 'Vibration API Ready' : 'Web Audio Emulation'}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 leading-relaxed">
                                                    Test physical vibrations and audio chimes below. Ensure phone silent switch is OFF and system touch feedback is enabled in phone settings.
                                                </p>
                                                <div className="grid grid-cols-3 gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            deviceHapticService('light');
                                                            playGentleBeep();
                                                        }}
                                                        className="py-3 px-2 bg-slate-900 hover:bg-slate-850 active:scale-95 text-slate-200 border border-slate-800 hover:border-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1 transition-all"
                                                    >
                                                        <Volume2 size={14} className="text-sky-400" />
                                                        <span>Light Tap</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            deviceHapticService('medium');
                                                            playAlertSound('success');
                                                        }}
                                                        className="py-3 px-2 bg-slate-900 hover:bg-slate-850 active:scale-95 text-emerald-300 border border-slate-800 hover:border-emerald-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1 transition-all"
                                                    >
                                                        <Volume2 size={14} className="text-emerald-400" />
                                                        <span>Medium Buzz</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            deviceHapticService('heavy');
                                                            playVictorySound();
                                                        }}
                                                        className="py-3 px-2 bg-slate-900 hover:bg-slate-850 active:scale-95 text-amber-300 border border-slate-800 hover:border-amber-500/30 rounded-xl text-[10px] font-black uppercase tracking-wider flex flex-col items-center gap-1 transition-all"
                                                    >
                                                        <Volume2 size={14} className="text-amber-400" />
                                                        <span>Heavy & Fanfare</span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="flex items-center justify-between px-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                            <Bell size={14} className="text-indigo-400" />
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">3-Day Inactivity Reminder</label>
                                                            <p className="text-[9px] text-slate-500 font-medium">Sends an owl mascot alert if you don't open PickApp for 3 days.</p>
                                                        </div>
                                                    </div>
                                                    <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${isNotificationSupported() ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-slate-800 text-slate-500'}`}>
                                                        {isNotificationSupported() ? 'Supported' : 'Not Supported'}
                                                    </span>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3 p-2 bg-slate-950 rounded-[32px] border-2 border-slate-800 shadow-inner">
                                                    <button 
                                                        className={`py-5 rounded-[24px] font-black text-[12px] uppercase transition-all tracking-[0.2em] relative overflow-hidden ${inactivityNotifsOn ? `${theme.bg} text-white shadow-xl` : 'text-slate-700 hover:text-slate-500'}`}
                                                        onClick={async () => {
                                                            const success = await setInactivityNotifsEnabled(true);
                                                            setInactivityNotifsOn(success);
                                                            if (success) {
                                                                deviceHapticService('medium');
                                                            } else {
                                                                deviceHapticService('light');
                                                            }
                                                        }}
                                                    >
                                                        {inactivityNotifsOn && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                                                        NOTIFY_ON
                                                    </button>
                                                    <button 
                                                        className={`py-5 rounded-[24px] font-black text-[12px] uppercase transition-all tracking-[0.2em] ${!inactivityNotifsOn ? `bg-slate-800 text-white border border-slate-700 shadow-lg` : 'text-slate-700 hover:text-slate-500'}`}
                                                        onClick={async () => {
                                                            await setInactivityNotifsEnabled(false);
                                                            setInactivityNotifsOn(false);
                                                            deviceHapticService('light');
                                                        }}
                                                    >
                                                        DISABLED
                                                    </button>
                                                </div>

                                                {inactivityNotifsOn && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            sendInactivityNotification("🦉 Preview Test: This is how your 3-day inactivity reminder will appear!");
                                                            deviceHapticService('medium');
                                                        }}
                                                        className="w-full py-3 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
                                                    >
                                                        <Bell size={12} className="text-indigo-400" />
                                                        <span>Send Test Inactivity Notification</span>
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-5">
                                                <div className="flex items-center gap-3 px-1">
                                                    <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                                        <Activity size={14} className="text-emerald-500" />
                                                    </div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Haptic Engine Status</label>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3 p-2 bg-slate-950 rounded-[32px] border-2 border-slate-800 shadow-inner">
                                                    <button 
                                                        className={`py-5 rounded-[24px] font-black text-[12px] uppercase transition-all tracking-[0.2em] relative overflow-hidden ${shiftData.haptic === 'on' ? `${theme.bg} text-white shadow-xl` : 'text-slate-700 hover:text-slate-500'}`}
                                                        onClick={() => { setShiftData({...shiftData, haptic: 'on'}); setHapticsEnabled(true); deviceHapticService('heavy'); }}
                                                    >
                                                        {shiftData.haptic === 'on' && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                                                        VIBRO_ON
                                                    </button>
                                                    <button 
                                                        className={`py-5 rounded-[24px] font-black text-[12px] uppercase transition-all tracking-[0.2em] ${shiftData.haptic === 'off' ? `bg-slate-800 text-white border border-slate-700 shadow-lg` : 'text-slate-700 hover:text-slate-500'}`}
                                                        onClick={() => { setShiftData({...shiftData, haptic: 'off'}); setHapticsEnabled(false); deviceHapticService('light'); }}
                                                    >
                                                        MUTED
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="flex items-center gap-3 px-1">
                                                    <div className="p-1.5 rounded-lg bg-sky-500/10 border border-sky-500/20">
                                                        <Volume2 size={14} className="text-sky-500" />
                                                    </div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Headset Audio Synths</label>
                                                </div>
                                                <button 
                                                    className={`w-full py-6 rounded-[32px] font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 border-2 ${shiftData.voiceEnabled ? `bg-sky-500 text-white border-transparent shadow-[0_0_25px_rgba(14,165,233,0.3)]` : 'bg-slate-950 text-slate-700 border-slate-800/80 shadow-inner'}`}
                                                    onClick={() => { setShiftData({...shiftData, voiceEnabled: !shiftData.voiceEnabled}); haptic('medium'); }}
                                                >
                                                    <div className={`p-2 rounded-xl ${shiftData.voiceEnabled ? 'bg-white/20' : 'bg-slate-900'}`}>
                                                        <Mic size={20} className={shiftData.voiceEnabled ? "fill-white" : ""} />
                                                    </div>
                                                    {shiftData.voiceEnabled ? 'ANNOUNCEMENTS_ACTIVE' : 'ACTIVATE_AUDIO_SYNS'}
                                                </button>
                                                <div className="px-6 py-3 bg-slate-950/40 rounded-2xl border border-dashed border-slate-800">
                                                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-tight text-center leading-relaxed">
                                                        "Strict adherence to privacy protocols: Real-time audio rendering is output-only. Integrated receiver is structurally locked."
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="space-y-5">
                                                <div className="flex items-center gap-3 px-1">
                                                    <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                        <Power size={14} className="text-amber-500" />
                                                    </div>
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">System Power State</label>
                                                </div>
                                                <button 
                                                    className={`w-full py-6 rounded-[32px] font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 border-2 ${shiftData.wakeLock ? `bg-amber-600 text-white border-transparent shadow-[0_0_25px_rgba(217,119,6,0.3)]` : 'bg-slate-950 text-slate-700 border-slate-800/80 shadow-inner'}`}
                                                    onClick={() => { setShiftData({...shiftData, wakeLock: !shiftData.wakeLock}); haptic('medium'); }}
                                                >
                                                    <div className={`p-2 rounded-xl ${shiftData.wakeLock ? 'bg-white/20' : 'bg-slate-900'}`}>
                                                        <Zap size={20} className={shiftData.wakeLock ? "fill-white animate-pulse" : ""} />
                                                    </div>
                                                    {shiftData.wakeLock ? 'WAKE_LOCK_ENGAGED' : 'ENGAGE_WAKE_LOCK'}
                                                </button>
                                                {wakeLockError && (
                                                    <div className="space-y-4">
                                                        <div className="bg-rose-500/10 border-2 border-rose-500/20 rounded-[28px] p-5 text-center">
                                                            <p className="text-[10px] text-rose-500 font-black uppercase tracking-[0.2em] leading-relaxed mb-4">
                                                                CRITICAL_IO_BLOCK: {wakeLockError.includes('permissions policy') 
                                                                    ? "Browser security sandbox prevents power-state modification inside iframe container." 
                                                                    : `System Exception: ${wakeLockError}`}
                                                            </p>
                                                            <button 
                                                                onClick={() => window.open(window.location.href, '_blank')}
                                                                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-rose-400 transition-colors shadow-lg shadow-rose-500/20"
                                                            >
                                                                <ExternalLink size={16} /> Bypass Sandbox
                                                            </button>
                                                        </div>
                                                        <p className="text-[9px] text-slate-700 text-center font-black uppercase tracking-widest italic">Switch to Direct Host for unrestricted hardware access.</p>
                                                    </div>
                                                )}
                                                {!wakeLockError && isInIframe && (
                                                    <div className="pt-2">
                                                        <button 
                                                            onClick={() => window.open(window.location.href, '_blank')}
                                                            className="w-full py-4 border-2 border-slate-800/80 bg-slate-950 rounded-2xl font-black text-[11px] text-slate-500 uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-sm"
                                                        >
                                                            <ExternalLink size={14} /> Standalone View
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Build Version Info */}
                                            <div className="pt-6 border-t border-slate-800 flex justify-between items-center text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500/30"></div>
                                                    <span>Core_OS_v{APP_VERSION}</span>
                                                </div>
                                                <button 
                                                    onClick={() => window.location.reload()}
                                                    className="flex items-center gap-2 hover:text-sky-500 transition-colors group"
                                                >
                                                    <RefreshCw size={10} className="group-hover:rotate-180 transition-transform duration-500" />
                                                    REBOOT_KERNEL
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}

                                    {settingsTab === 'data' && (
                                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                            {/* GLOBAL FETCH ENGINE - QUOTA GUARDIAN INITIATIVE */}
                                            <div className="p-5 bg-slate-950 border-2 border-emerald-500/20 rounded-[32px] shadow-2xl relative overflow-hidden group">
                                                <div className="absolute inset-0 bg-emerald-500/[0.02] pointer-events-none group-hover:bg-emerald-500/[0.05] transition-colors"></div>
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                                                            <RefreshCcw size={18} className={`text-emerald-500 ${fetchingLeaderboard || fetchingSummaries ? 'animate-spin' : ''}`} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[12px] font-black text-white uppercase tracking-widest">Global Application Sync</h4>
                                                            <p className="text-[8px] text-emerald-500/60 font-black uppercase tracking-[0.2em] mt-0.5 flex items-center gap-1.5">
                                                                <Shield size={10} /> QUOTA_GUARDIAN_READY
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight leading-relaxed mb-5 px-1 italic">
                                                    "All background telemetry is structurally disabled. Manual synchronization is required to propagate cloud artifacts to local cache."
                                                </p>
                                                <button 
                                                    onClick={() => {
                                                        haptic('heavy');
                                                        fetchLeaderboardManual(true);
                                                        fetchSummariesManual(true);
                                                        fetchWarehouseConfigManual(true);
                                                        if (isUserAdmin()) fetchAdminSummariesManual(true);
                                                    }}
                                                    disabled={fetchingLeaderboard || fetchingSummaries}
                                                    className={`w-full py-5 rounded-[24px] font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 border-2 shadow-2xl ${fetchingLeaderboard || fetchingSummaries ? 'bg-slate-900 text-slate-700 border-slate-800' : 'bg-emerald-500 text-white border-transparent shadow-emerald-500/20'}`}
                                                >
                                                    {fetchingLeaderboard || fetchingSummaries ? (
                                                        <>ENGINE_SYNCHRONIZING...</>
                                                    ) : (
                                                        <>FORCE_GLOBAL_SYNC</>
                                                    )}
                                                </button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button 
                                                    className="py-3.5 bg-slate-950 border border-slate-800 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] text-slate-500 hover:text-white hover:border-slate-600 transition-all active:scale-95 flex items-center justify-center gap-2.5 shadow-sm"
                                                    onClick={() => {
                                                        const d = new Date();
                                                        setManualClockTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
                                                        setManualClockType('out');
                                                        haptic('light');
                                                        setShowClockInModal(true);
                                                        setShowSettings(false);
                                                    }}
                                                >
                                                    <div className="p-1 bg-slate-900 rounded-md">
                                                        <Clock size={14} />
                                                    </div>
                                                    MANUAL_LOG
                                                </button>
                                                <button 
                                                    className={`py-3.5 ${theme.bg} text-white rounded-xl font-black text-[11px] uppercase tracking-[0.2em] shadow-xl ${theme.shadow} active:scale-95 transition-all flex items-center justify-center gap-2.5`}
                                                    onClick={() => {
                                                        haptic('medium');
                                                        setShowSettings(false);
                                                        handleEndOfDay();
                                                    }}
                                                >
                                                    <LogOut size={14} /> END_SHIFT
                                                </button>
                                            </div>

                                            {/* DATABASE STORAGE STATISTICS & CAPACITY MANAGER */}
                                            <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 space-y-4 shadow-inner relative overflow-hidden">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full"></div>
                                                <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="p-1.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-500 shadow-md">
                                                            <Database size={16} />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Storage Status</h4>
                                                            <p className="text-[8px] text-slate-600 font-black uppercase tracking-[0.2em] mt-0.5">TELEMETRY_REALTIME</p>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => { haptic('light'); loadDbStorageStats(); }}
                                                        disabled={loadingDbStats}
                                                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/50 text-[9px] text-slate-400 hover:text-white rounded-xl font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-90 shadow-sm"
                                                    >
                                                        <RefreshCw size={12} className={loadingDbStats ? "animate-spin" : ""} />
                                                        RESCAN_I/O
                                                    </button>
                                                </div>

                                                {loadingDbStats ? (
                                                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                                                        <div className="relative">
                                                            <div className="w-16 h-16 rounded-full border-4 border-sky-500/10 border-t-sky-500 animate-spin"></div>
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Database size={24} className="text-sky-500 animate-pulse" />
                                                            </div>
                                                        </div>
                                                        <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.4em] animate-pulse">Analyzing Cloud Quotas...</span>
                                                    </div>
                                                ) : dbStatsError ? (
                                                    <div className="p-6 bg-rose-500/10 border-2 border-rose-500/20 rounded-3xl text-center flex flex-col items-center gap-3">
                                                        <XOctagon size={32} className="text-rose-500" />
                                                        <span className="text-[11px] font-black text-rose-400 uppercase tracking-widest leading-relaxed px-4">{dbStatsError}</span>
                                                    </div>
                                                ) : dbStorageStats ? ((() => {
                                                    const isRestrictedPct = typeof dbStorageStats.percentageUsed === 'string';
                                                    const pct = typeof dbStorageStats.percentageUsed === 'number' ? dbStorageStats.percentageUsed : 0;
                                                    const pctString = isRestrictedPct ? '1.0% (EMU)' : `${pct.toFixed(4)}%`;
                                                    
                                                    const isRestrictedSize = typeof dbStorageStats.totalSizeEstimatedBytes === 'string';
                                                    const estSizeVal = typeof dbStorageStats.totalSizeEstimatedBytes === 'number' ? dbStorageStats.totalSizeEstimatedBytes : 0;
                                                    const sizeLabel = isRestrictedSize 
                                                        ? 'OFFLINE_ONLY'
                                                        : estSizeVal > 1024 * 1024 
                                                            ? `${(estSizeVal / (1024 * 1024)).toFixed(2)} MB`
                                                            : `${(estSizeVal / 1024).toFixed(1)} KB`;
                                                            
                                                    const summariesLabel = typeof dbStorageStats.summariesCount === 'string' 
                                                        ? String(mergedShiftSummaries.length) 
                                                        : String(dbStorageStats.summariesCount);
                                                        
                                                    const leaderboardLabel = typeof dbStorageStats.leaderboardCount === 'string' 
                                                        ? 'OFFLINE' 
                                                        : String(dbStorageStats.leaderboardCount);

                                                    const statusColor = isRestrictedPct ? 'emerald' : pct > 80 ? 'rose' : pct > 50 ? 'amber' : 'emerald';

                                                    return (
                                                        <div className="space-y-4">
                                                            {/* Target Progress Bar */}
                                                            <div className="space-y-3">
                                                                <div className="flex justify-between items-end px-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Usage Coefficient</span>
                                                                        <span className={`text-2xl font-black italic tracking-tighter ${statusColor === 'emerald' ? 'text-emerald-400' : statusColor === 'amber' ? 'text-amber-500' : 'text-rose-500'}`}>{pctString}</span>
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Capacity Bound</span>
                                                                        <p className="text-sm font-black text-slate-300 italic tracking-tight">1,024 MB (v1_TIER)</p>
                                                                    </div>
                                                                </div>
                                                                <div className="w-full h-3 bg-slate-900 rounded-full border border-slate-800/80 p-0.5 overflow-hidden shadow-inner flex gap-0.5">
                                                                    {Array.from({ length: 40 }).map((_, i) => {
                                                                        const threshold = (i / 40) * 100;
                                                                        const isActive = isRestrictedPct ? threshold <= 5 : threshold <= pct;
                                                                        return (
                                                                            <div 
                                                                                key={i} 
                                                                                className={`h-full flex-1 rounded-[1px] transition-all duration-700 ${isActive ? (statusColor === 'emerald' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : statusColor === 'amber' ? 'bg-amber-500' : 'bg-rose-500') : 'bg-slate-950/80'}`}
                                                                            />
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Telemetry Bento Grid */}
                                                            <div className="grid grid-cols-2 gap-2.5">
                                                                <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl shadow-sm relative overflow-hidden group hover:border-sky-500/30 transition-all">
                                                                    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                        <HardDrive size={48} className="text-white" />
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-slate-600 block uppercase tracking-widest mb-1">Allocated Volume</span>
                                                                    <span className="text-lg font-black text-white italic tracking-tight">{sizeLabel}</span>
                                                                </div>
                                                                <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl shadow-sm relative overflow-hidden group hover:border-amber-500/30 transition-all">
                                                                    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                        <FileBox size={48} className="text-white" />
                                                                    </div>
                                                                    <span className="text-[9px] font-bold text-slate-600 block uppercase tracking-widest mb-1">Index Count</span>
                                                                    <span className="text-lg font-black text-white italic tracking-tight">Σ {summariesLabel}</span>
                                                                </div>
                                                                <div className="bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-xl shadow-sm relative overflow-hidden group hover:border-emerald-500/30 transition-all col-span-2">
                                                                    <div className="absolute -bottom-4 -right-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                                                        <ShieldCheck size={48} className="text-white" />
                                                                    </div>
                                                                    <div className="flex justify-between items-center">
                                                                        <div>
                                                                            <span className="text-[9px] font-bold text-slate-600 block uppercase tracking-widest mb-0.5">Operational State</span>
                                                                            <span className={`text-lg font-black italic tracking-tighter uppercase ${statusColor === 'emerald' ? 'text-emerald-400' : statusColor === 'amber' ? 'text-amber-500' : 'text-rose-500'}`}>
                                                                                {isRestrictedPct ? "SYNC_OPTIMIZED" :
                                                                                 pct > 80 ? "THROTTLE_WARNING" :
                                                                                 pct > 50 ? "NOMINAL_ACCESS" : "OPTIMAL_KERNEL"}
                                                                            </span>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <span className="text-[9px] font-bold text-slate-600 block uppercase tracking-widest mb-0.5">Live Feed</span>
                                                                            <div className="flex items-center gap-2 justify-end">
                                                                                <div className={`w-1.5 h-1.5 rounded-full ${statusColor === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
                                                                                <span className="text-[10px] font-black text-white font-mono">{leaderboardLabel} REC</span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })())
                                                : (
                                                    <div className="py-12 text-center space-y-4">
                                                        <Activity size={32} className="text-slate-800 mx-auto" />
                                                        <p className="text-[11px] text-slate-600 font-black uppercase tracking-[0.4em]">No Telemetry Logs Detected</p>
                                                    </div>
                                                )}

                                                {isUserAdmin() && (
                                                    <div className="pt-2 space-y-4 border-t border-slate-800/60">
                                                        <div className="flex items-center gap-3 px-1 mb-2">
                                                            <Wrench size={14} className="text-slate-700" />
                                                            <div className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">System Maintenance Rigs</div>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-1 gap-3">
                                                            {/* IMAGE STRIPPER BTN */}
                                                            <button 
                                                                disabled={reclaimingSpace}
                                                                onClick={async () => {
                                                                    haptic('heavy');
                                                                    if (confirm("SCRUB_PROTOCOL: This will strip high-volume image data & manifest snapshots older than 14 days. Operational numerical data remains intact. Reclaim IO throughput?")) {
                                                                        setReclaimingSpace(true);
                                                                        setSpaceReclaimMsg(null);
                                                                        const res = await stripOldImagesFromDatabase(2);
                                                                        setReclaimingSpace(false);
                                                                        if (res.success) {
                                                                            setSpaceReclaimMsg(`SCRUB_COMPLETE: Optimized ${res.updatedCount} legacy buffers.`);
                                                                            loadDbStorageStats();
                                                                        } else {
                                                                            setSpaceReclaimMsg(`EXC: ${res.error}`);
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full py-3.5 bg-amber-500/5 hover:bg-amber-500/15 text-amber-600 hover:text-amber-400 border border-amber-600/10 hover:border-amber-500/30 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 group grow shadow-sm"
                                                            >
                                                                <Layers size={18} className="group-hover:rotate-12 transition-transform" /> SCRUB_IMAGE_BUFFERS (&gt;2W)
                                                            </button>

                                                            {/* MANUAL PURGER BTN */}
                                                            <button 
                                                                disabled={reclaimingSpace}
                                                                onClick={async () => {
                                                                    haptic('heavy');
                                                                    const message = isUserAdmin() 
                                                                        ? "PURGE_ALL_HISTORICAL: This will permanently delete all summaries and global leaderboard records older than 42 days. Confirm irreversible erasure?"
                                                                        : "PURGE_SESSION_HISTORY: This will erase your personal shift summaries older than 42 days. Proceed?";
                                                                    
                                                                    if (confirm(message)) {
                                                                        setReclaimingSpace(true);
                                                                        setSpaceReclaimMsg(null);
                                                                        const res = await purgeDatabaseOlderThan6Weeks(isUserAdmin());
                                                                        setReclaimingSpace(false);
                                                                        if (res.success) {
                                                                            setSpaceReclaimMsg(`DUMPED: Deleted ${res.summariesDeleted} summaries & ${res.leaderboardDeleted} indices.`);
                                                                            loadDbStorageStats();
                                                                        } else {
                                                                            setSpaceReclaimMsg(`EXC: ${res.error}`);
                                                                        }
                                                                    }
                                                                }}
                                                                className="w-full py-3.5 bg-rose-500/5 hover:bg-rose-500/15 text-rose-600 hover:text-rose-400 border border-rose-600/10 hover:border-rose-500/30 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 group grow shadow-sm"
                                                            >
                                                                <Trash2 size={18} className="group-hover:scale-110 transition-transform" /> PURGE_LEGACY_LOGS (&gt;6W)
                                                            </button>
                                                        </div>

                                                        {spaceReclaimMsg && (
                                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-slate-950 rounded-[24px] border-2 border-slate-800 text-center text-[10px] font-black text-sky-400 italic font-mono uppercase tracking-widest shadow-lg">
                                                                {spaceReclaimMsg}
                                                            </motion.div>
                                                        )}

                                                        <div className="flex items-center gap-3 justify-center px-4 py-3 bg-slate-900/30 rounded-2xl border border-dashed border-slate-800">
                                                            <Shield size={12} className="text-slate-700 shrink-0" />
                                                            <p className="text-[10px] text-slate-700 font-bold uppercase tracking-tight italic text-center">
                                                                "Autonomous maintenance protocol enabled. Logs exceeding 42-day retention are scrubbed daily."
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3 pt-2">
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button className="py-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-emerald-400 hover:border-emerald-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-sm" onClick={downloadReport}>
                                                        <FileSpreadsheet size={18} /> EXPORT_CSV
                                                    </button>
                                                    <button className="py-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-rose-400 hover:border-rose-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-sm" onClick={handleEmergencySignOut}>
                                                        <Power size={18} /> DROP_SESSION
                                                    </button>
                                                </div>
                                                
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button 
                                                        className="py-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-sky-400 hover:border-sky-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-sm" 
                                                        onClick={() => { haptic('medium'); setShowAbout(true); }}
                                                    >
                                                        <Cpu size={18} /> OS_ABOUT
                                                    </button>
                                                    <button 
                                                        className="py-3.5 bg-slate-950 border border-slate-800/80 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-blue-400 hover:border-blue-500/30 flex items-center justify-center gap-2.5 transition-all active:scale-95 shadow-sm" 
                                                        onClick={() => { haptic('medium'); setShowAboutDeveloper(true); }}
                                                    >
                                                        <Terminal size={18} /> DEV_PROFILE
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="pt-4 border-t border-slate-800/60 space-y-4">
                                                <button 
                                                    className={`w-full py-3.5 rounded-[16px] font-black text-[11px] uppercase tracking-[0.2em] transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden ${availableUpdate ? 'bg-emerald-500 text-white shadow-xl shadow-emerald-500/20' : 'bg-slate-950 text-slate-600 border border-slate-800/80 shadow-inner'}`}
                                                    onClick={async () => {
                                                        if (availableUpdate) {
                                                            handleUpdateApp();
                                                        } else {
                                                            haptic('medium');
                                                            const update = await checkUpdate();
                                                            if (update) {
                                                                setAvailableUpdate(update);
                                                            } else {
                                                                setLastUpdateCheck(Date.now());
                                                                haptic('heavy');
                                                            }
                                                        }
                                                    }}
                                                    disabled={updating}
                                                >
                                                    {availableUpdate && !updating && (
                                                        <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                                                    )}
                                                    <div className="flex items-center gap-3">
                                                        <RefreshCw size={16} className={updating ? 'animate-spin' : ''} /> 
                                                        <span>{updating ? 'DEPLOYING_PATCH...' : availableUpdate ? 'PATCH_READY_V' + availableUpdate : 'BUILD_STABLE_V' + APP_VERSION}</span>
                                                    </div>
                                                    {availableUpdate && !updating ? (
                                                        <span className="text-[9px] font-bold uppercase tracking-widest opacity-80 animate-bounce">MANDATORY UPGRADE REQUIRED</span>
                                                    ) : (
                                                        <span className="text-[9px] font-bold uppercase tracking-[0.25em] opacity-40">Polling Master Branch...</span>
                                                    )}
                                                </button>
                                                {isUserAdmin() && (
                                                    <button 
                                                        className="w-full py-3.5 bg-rose-500/5 text-rose-600 border border-rose-600/20 rounded-[16px] text-[11px] font-black uppercase tracking-[0.3em] flex items-center justify-center gap-2.5 hover:bg-rose-500 hover:text-white transition-all active:scale-95 shadow-sm"
                                                        onClick={() => setPinModal({ show: true, type: 'reset', input: '' })}
                                                    >
                                                        <XOctagon size={18} /> FACTORY_SCRUB
                                                    </button>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                    {/* Admin settings tab removed - completely migrated to dedicated Admin page screen */}
                                </div>

                                {/* Footer */}
                                <div className="p-3 sm:p-3.5 bg-slate-950 backdrop-blur-3xl border-t border-slate-800">
                                    <button 
                                        className={`w-full py-3 rounded-xl ${theme.bg} text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl ${theme.shadow} active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 relative overflow-hidden group min-h-[46px]`}
                                        onClick={() => { haptic('medium'); setShowSettings(false); }}
                                    >
                                        <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <ShieldCheck size={18} className="relative" /> 
                                        <span className="relative">COMMIT_CHANGES</span>
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                    {showClockInModal && (
                        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
                            <div className="bg-slate-900 w-full max-w-sm rounded-[32px] p-6 border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                                <div className="text-center mb-6">
                                    <div className={`w-12 h-12 rounded-2xl ${manualClockType === 'in' ? 'bg-slate-800 text-emerald-400' : 'bg-orange-500/20 text-orange-400'} flex items-center justify-center mx-auto mb-3`}>
                                        <Clock size={24} />
                                    </div>
                                    <h3 className="text-xl font-bold text-white mb-1">Manual Clock {manualClockType === 'in' ? 'In' : 'Out'}</h3>
                                    <p className="text-slate-400 text-xs text-balance">
                                        {manualClockType === 'in' 
                                            ? 'Input the time you actually clocked in to start your shift tracking.'
                                            : 'Update the time you finished your shift for final stats calculation.'}
                                    </p>
                                </div>
                                
                                <input 
                                    type="time" 
                                    className={`w-full bg-slate-950 border-2 border-slate-800 text-white p-5 rounded-2xl text-4xl font-light text-center outline-none ${theme.borderFocusLarge} mb-6 [color-scheme:dark]`}
                                    value={manualClockTime}
                                    onChange={e => setManualClockTime(e.target.value)}
                                />

                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm tracking-wide hover:text-white"
                                        onClick={() => { haptic('light'); setShowClockInModal(false); }}
                                    >
                                        CANCEL
                                    </button>
                                    <button 
                                        className={`py-4 ${theme.bg} text-white rounded-2xl font-bold text-sm tracking-wide ${theme.bgHover}`}
                                        onClick={() => {
                                            if (manualClockType === 'in') {
                                                manualStart(manualClockTime);
                                            } else {
                                                manualEnd(manualClockTime);
                                            }
                                        }}
                                    >
                                        {manualClockType === 'in' ? 'START' : 'FINISH'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                    {showLeaderboard && (
                        <div className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end backdrop-blur-sm transition-all">
                            <div className={`${theme.panel} ${theme.radius} p-6 border shadow-2xl animate-in slide-in-from-bottom-full duration-200 h-[85vh] flex flex-col`}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex items-center gap-2">
                                        <Trophy size={24} className="text-amber-400" />
                                        <h3 className={`text-xl font-bold text-white ${theme.font}`}>Leaderboard</h3>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => fetchLeaderboardManual(true)}
                                            disabled={fetchingLeaderboard}
                                            className={`w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700/50 ${fetchingLeaderboard ? 'opacity-50 cursor-not-allowed' : ''}`}
                                            title="Sync latest leaderboard data"
                                        >
                                            <RefreshCw size={18} className={fetchingLeaderboard ? 'animate-spin' : ''} />
                                        </button>
                                        <button 
                                            onClick={() => { haptic('light'); setShowLeaderboard(false); }} 
                                            className="w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700/50"
                                            aria-label="Close Leaderboard"
                                        >
                                            <X size={18}/>
                                        </button>
                                    </div>
                                </div>

                                {/* Leaderboard Tab Switcher */}
                                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/90 rounded-2xl border border-slate-800 mb-4 shrink-0">
                                    <button
                                        onClick={() => { haptic('light'); setLeaderboardTab('live'); }}
                                        className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            leaderboardTab === 'live' 
                                                ? 'bg-slate-800 text-amber-400 shadow-md border border-slate-700/60' 
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Trophy size={14} className={leaderboardTab === 'live' ? 'text-amber-400' : 'text-slate-500'} />
                                        <span>Live & Shift Rank</span>
                                    </button>
                                    <button
                                        onClick={() => { haptic('light'); setLeaderboardTab('prev_month'); }}
                                        className={`py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                            leaderboardTab === 'prev_month' 
                                                ? 'bg-slate-800 text-sky-400 shadow-md border border-slate-700/60' 
                                                : 'text-slate-400 hover:text-slate-200'
                                        }`}
                                    >
                                        <Calendar size={14} className={leaderboardTab === 'prev_month' ? 'text-sky-400' : 'text-slate-500'} />
                                        <span>Previous Month</span>
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto pr-1">
                                    {leaderboardTab === 'prev_month' ? (
                                        <PreviousMonthSummary 
                                            summaries={allShiftSummariesList.length > 0 ? allShiftSummariesList : (adminAllSummaries.length > 0 ? adminAllSummaries : shiftSummaries)}
                                            theme={theme}
                                            currentDate={new Date()}
                                        />
                                    ) : (
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 px-1">
                                                    <Sparkles size={14} className="text-sky-400" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Zone Competition</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {Object.entries(zoneXP).map(([zone, xp]) => {
                                                        const currentXp = xp as number;
                                                        const values = Object.values(zoneXP) as number[];
                                                        const total = values.reduce((a, b) => a + b, 0) || 1;
                                                        const pct = (currentXp / total) * 100;
                                                        const zTheme = THEMES[zone] || THEMES.AMBIENT;
                                                        return (
                                                            <div key={zone} className={`bg-slate-800/40 border border-slate-700/50 ${theme.radius} p-2.5 flex flex-col items-center`}>
                                                                <span className={`text-[8px] font-black uppercase tracking-tighter mb-1 ${zTheme.text}`}>{zone}</span>
                                                                <span className="text-xs font-black text-white">{currentXp.toLocaleString()}</span>
                                                                <div className={`w-full bg-slate-900 h-1 ${theme.radius} mt-2 overflow-hidden`}>
                                                                    <div className={`h-full ${zTheme.bg}`} style={{ width: `${pct}%` }}></div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            {liveUsers.length > 0 && (
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 px-1">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">Active Now</span>
                                                    </div>
                                                    {liveUsers.map((user, idx) => (
                                                        <div key={`live-${idx}`} className="bg-slate-800/80 p-4 rounded-2xl border-2 border-emerald-500/20 flex flex-col gap-3 shadow-lg shadow-emerald-500/5">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30 shrink-0">
                                                                    LIVE
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-white flex items-center gap-2 truncate">
                                                                        {user.name}
                                                                        {user.isBot && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider font-black shrink-0 flex items-center gap-1">
                                                                                <Bot size={11} className="text-cyan-400" /> AI BOT
                                                                            </span>
                                                                        )}
                                                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-tighter shrink-0 ${user.status === 'picking' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : user.status === 'break' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-400/10 text-slate-400 border-slate-400/20'}`}>
                                                                            {user.status || 'Active'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                                                                        {user.department}
                                                                        {user.currentOrder && (
                                                                            <span className="ml-2 text-sky-400 font-bold border border-sky-500/20 px-1 rounded bg-sky-500/10">Order: {user.currentOrder}</span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-right shrink-0">
                                                                    <div className="text-xl font-black text-emerald-400">{user.rate}</div>
                                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">P/H</div>
                                                                </div>
                                                            </div>

                                                            {(user.customStatus || user.listeningTo) && (
                                                                <div className="bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-700/30 flex items-center gap-2">
                                                                    <span className="text-xs animate-bounce shrink-0">🎵</span>
                                                                    <span className="text-[11px] text-indigo-300 italic truncate font-medium">Vibe: <span className="text-white not-italic font-semibold">{user.customStatus || user.listeningTo}</span></span>
                                                                </div>
                                                            )}
                                                            
                                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50">
                                                                <div className="flex flex-col">
                                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Activity</span>
                                                                    <span className="text-xs text-white font-mono break-all">{user.totalCases || 0} cs • {user.xp || 0} XP</span>
                                                                </div>
                                                                <div className="flex flex-col text-right">
                                                                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Time Active</span>
                                                                    <span className="text-xs text-white font-mono">{user.activeSeconds ? formatHHMM(user.activeSeconds) : '00h 00m'}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2 px-1">
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">All-Time Rankings</span>
                                                </div>
                                                {/* Merge live users into leaderboard */}
                                                {leaderboardData.map((entry, idx) => {
                                                    const liveUser = liveUsers.find(u => u.name.toUpperCase() === entry.name.toUpperCase());
                                                    const displayRate = liveUser ? liveUser.rate : entry.rate;
                                                    const isLive = !!liveUser;

                                                    return (
                                                        <div key={idx} className={`p-4 rounded-2xl border flex flex-col gap-2 ${isLive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${idx === 0 ? 'bg-amber-400 text-slate-900' : idx === 1 ? 'bg-slate-300 text-slate-900' : idx === 2 ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                                                    {idx + 1}
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="font-bold text-white truncate flex items-center gap-2">
                                                                        {entry.name}
                                                                        {(entry.isBot || liveUser?.isBot) && (
                                                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 uppercase tracking-wider font-black shrink-0 flex items-center gap-1">
                                                                                <Bot size={11} className="text-cyan-400" /> AI BOT
                                                                            </span>
                                                                        )}
                                                                        {isLive && (
                                                                            <span className="text-[9px] bg-emerald-500 text-white px-1 rounded uppercase animate-pulse">Live</span>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                                                                        {entry.department} • {entry.date}
                                                                    </div>
                                                                    {entry.cases !== undefined && (
                                                                        <div className="text-[10px] text-slate-400 font-medium">
                                                                            {entry.cases || 0} cases
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div className="text-right">
                                                                    <div className={`text-lg font-black ${displayRate >= (entry.targetRate || 200) ? 'text-emerald-400' : 'text-slate-400'}`}>{displayRate}</div>
                                                                    <div className="text-[10px] text-slate-400 font-medium uppercase tracking-widest leading-none">Goal: {entry.targetRate || 200}</div>
                                                                </div>
                                                            </div>
                                                            {isLive && liveUser && (liveUser.customStatus || liveUser.listeningTo) && (
                                                                <div className="bg-slate-900/40 p-2 rounded-xl border border-slate-800/30 flex items-center gap-2 mt-1">
                                                                    <span className="text-[10px] animate-pulse shrink-0">🎵</span>
                                                                    <span className="text-[10px] text-indigo-300 italic truncate font-medium">Vibe: <span className="text-slate-200 not-italic font-semibold">{liveUser.customStatus || liveUser.listeningTo}</span></span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                                {leaderboardData.length === 0 && liveUsers.length === 0 && (
                                                    <div className="text-center py-12 text-slate-400 italic">No rankings yet. Finish a shift to be first!</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <button 
                                    className="w-full mt-4 py-3.5 bg-slate-800 text-white rounded-2xl font-bold text-base hover:bg-slate-700 transition-all border border-slate-700 shrink-0"
                                    onClick={() => { haptic('light'); setShowLeaderboard(false); }}
                                >
                                    CLOSE
                                </button>
                            </div>
                        </div>
                    )}



                    {viewingLabels && viewingLabels.length > 0 && (
                        <div className="fixed inset-0 z-[120] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-md overflow-y-auto">
                            <div className="flex flex-col gap-6 w-full max-w-full my-auto pb-24 pt-8 items-center">
                            {viewingLabels.map((lbl, idx) => (
                                typeof lbl === 'string' && (lbl.startsWith('data:image') || lbl.startsWith('http') || lbl.startsWith('blob:') || lbl.startsWith('/')) ? (
                                    <div key={idx} className="relative">
                                        {viewingLabels.length > 1 && (
                                            <span className="absolute -top-3 -left-3 w-8 h-8 bg-sky-500 text-white rounded-full flex items-center justify-center font-bold shadow-lg z-10 border-2 border-black">{idx + 1}</span>
                                        )}
                                        <img src={lbl} alt={`Label ${idx + 1}`} className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl" />
                                    </div>
                                ) : (
                                    <div key={idx} className="text-center p-8 bg-slate-900 rounded-2xl border border-rose-500 max-w-sm w-full mx-auto">
                                        <div className="text-rose-500 text-4xl mb-4">⚠️</div>
                                        <h3 className="text-white font-bold mb-2">Image Unavailable</h3>
                                        <p className="text-slate-400 text-sm">This label was corrupted or saved incorrectly in a previous version of the app and cannot be recovered.</p>
                                    </div>
                                )
                            ))}
                            </div>
                             <div className="fixed bottom-6 left-0 right-0 flex justify-center pb-safe">
                                 <button 
                                     onClick={() => setViewingLabels(null)}
                                     className="px-8 py-3.5 bg-white text-black font-black uppercase tracking-widest text-xs rounded-full hover:bg-slate-100 transition-colors shadow-2xl border-4 border-black/20"
                                 >
                                     Close Labels
                                 </button>
                             </div>
                        </div>
                    )}

                    {showRota && (() => {
                        // Rota Helper Logic
                        const getRotaCalendarDays = (offset: number) => {
                            const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
                            const year = date.getFullYear();
                            const month = date.getMonth();

                            const firstDay = new Date(year, month, 1);
                            const lastDay = new Date(year, month + 1, 0);

                            const days = [];
                            let startDayOfWeek = firstDay.getDay() - 1;
                            if (startDayOfWeek === -1) startDayOfWeek = 6; // Monday start

                            for (let i = 0; i < startDayOfWeek; i++) {
                                days.push(null);
                            }
                            
                            for (let i = 1; i <= lastDay.getDate(); i++) {
                                days.push(new Date(year, month, i, 12, 0, 0));
                            }
                            return { days, year, month };
                        };

                        const isWorkDay = (date: Date) => {
                            const dStr = getLocalDateString(date);
                            const override = shiftData.rotaOverrides?.[dStr];
                            if (override) {
                                return override === 'work';
                            }

                            if (!shiftData.rotaConfig?.anchorDate) return false;
                            const anchor = new Date(shiftData.rotaConfig.anchorDate + "T12:00:00Z");
                            const target = new Date(date);
                            target.setHours(12, 0, 0, 0);
                            const msDiff = target.getTime() - anchor.getTime();
                            
                            const dayDiffRaw = Math.round(msDiff / (1000 * 60 * 60 * 24));
                            const totalDaysInCycle = (shiftData.rotaConfig.weeks || 3) * 7;
                            
                            let dayDiff = dayDiffRaw % totalDaysInCycle;
                            if (dayDiff < 0) dayDiff += totalDaysInCycle;
                            
                            const weekIndex = Math.floor(dayDiff / 7);
                            const dayIndex = dayDiff % 7;
                            
                            if (!shiftData.rotaConfig.pattern[weekIndex]) return false;
                            const val = shiftData.rotaConfig.pattern[weekIndex][dayIndex];
                            return typeof val === 'number' ? val > 0 : !!val;
                        };

                        const getWorkedHoursForDate = (date: Date): number | null => {
                            const targetDateStr = getLocalDateString(date);

                            let totalMsOnThisDay = 0;
                            let hasActivity = false;

                            // 1. Process finalized shift summaries
                            if (mergedShiftSummaries && mergedShiftSummaries.length > 0) {
                                mergedShiftSummaries.forEach(summary => {
                                    const clockInDateStr = summary.clockInTime ? getLocalDateString(new Date(summary.clockInTime)) : '';
                                    const normSummaryDate = normalizeDateStr(summary.date);

                                    if (clockInDateStr === targetDateStr || normSummaryDate === targetDateStr) {
                                        hasActivity = true;
                                        const activeSecs = summary.activeSeconds || summary.totalSeconds;
                                        if (activeSecs && activeSecs > 0) {
                                            totalMsOnThisDay += activeSecs * 1000;
                                        } else {
                                            const startTime = summary.clockInTime;
                                            const endTime = summary.clockOutTime;
                                            if (startTime && endTime && endTime > startTime) {
                                                totalMsOnThisDay += (endTime - startTime);
                                            }
                                        }
                                    }
                                });
                            }

                            // 2. Include current running shift (real-time live math)
                            if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
                                if (getLocalDateString(new Date(shiftData.firstStartTime)) === targetDateStr) {
                                    hasActivity = true;
                                    const startTime = shiftData.firstStartTime;
                                    const endTime = Date.now();
                                    totalMsOnThisDay += (endTime - startTime);
                                }
                            }

                            if (!hasActivity) return null;
                            
                            return parseFloat((totalMsOnThisDay / (1000 * 60 * 60)).toFixed(2));
                        };

                        const getPlannedHours = (date: Date) => {
                            const dStr = getLocalDateString(date);
                            
                            const override = shiftData.rotaOverrides?.[dStr];
                            if (override) {
                                if (override === 'holiday' || override === 'sick' || override === 'off') return 0;
                                return 8; // Default value for overridden work days if pattern is 0
                            }

                            if (!shiftData.rotaConfig?.anchorDate) return 0;
                            const anchor = new Date(shiftData.rotaConfig.anchorDate + "T12:00:00Z");
                            const target = new Date(date);
                            target.setHours(12, 0, 0, 0);
                            const msDiff = target.getTime() - anchor.getTime();
                            
                            const dayDiffRaw = Math.round(msDiff / (1000 * 60 * 60 * 24));
                            const totalDaysInCycle = (shiftData.rotaConfig.weeks || 3) * 7;
                            
                            let dayDiff = dayDiffRaw % totalDaysInCycle;
                            if (dayDiff < 0) dayDiff += totalDaysInCycle;
                            
                            const weekIndex = Math.floor(dayDiff / 7);
                            const dayIndex = dayDiff % 7;
                            
                            if (!shiftData.rotaConfig.pattern[weekIndex]) return 0;
                            const val = shiftData.rotaConfig.pattern[weekIndex][dayIndex];
                            if (typeof val === 'number') return val;
                            return val ? 8 : 0;
                        };

                        const handleTogglePatternDay = (weekIndex: number, dayIndex: number) => {
                            haptic('light');
                            const currentVal = shiftData.rotaConfig.pattern[weekIndex]?.[dayIndex];
                            let newVal: number;
                            
                            let currentHours = 0;
                            if (typeof currentVal === 'number') {
                                currentHours = currentVal;
                            } else if (currentVal === true) {
                                currentHours = 8;
                            }
                            
                            if (currentHours === 0) newVal = 8;
                            else if (currentHours === 8) newVal = 10;
                            else if (currentHours === 10) newVal = 12;
                            else newVal = 0;
                            
                            const opName = (shiftData.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
                            const newPattern = shiftData.rotaConfig.pattern.map((w: any[], i: number) => 
                                i === weekIndex ? w.map((v: any, j: number) => j === dayIndex ? newVal : v) : w
                            );
                            
                            let updatedConfig: any;
                            setShiftData((prev: any) => {
                                updatedConfig = { ...prev.rotaConfig, pattern: newPattern };
                                const updated = {
                                    ...prev, 
                                    rotaConfig: updatedConfig
                                };
                                safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
                                safeLocalStorage.setItem('lastUser', opName);
                                return updated;
                            });

                            const uid = userProfile?.uid || auth.currentUser?.uid;
                            if (uid) {
                                saveUserProfile(uid, opName, userProfile?.pin, {
                                    rotaConfig: updatedConfig || { ...shiftData.rotaConfig, pattern: newPattern },
                                    rotaOverrides: shiftData.rotaOverrides || {}
                                });
                            }
                        };

                        const handleSetAnchor = () => {
                            const today = new Date();
                            const day = today.getDay();
                            const diff = today.getDate() - day + (day === 0 ? -6 : 1); 
                            const monday = new Date(today.setDate(diff));
                            
                            const year = monday.getFullYear();
                            const monthStr = String(monday.getMonth() + 1).padStart(2, '0');
                            const dom = String(monday.getDate()).padStart(2, '0');
                            
                            const opName = (shiftData.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
                            let updatedConfig: any;
                            setShiftData((prev: any) => {
                                updatedConfig = { ...prev.rotaConfig, anchorDate: `${year}-${monthStr}-${dom}` };
                                const updated = {
                                    ...prev, 
                                    rotaConfig: updatedConfig
                                };
                                safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
                                safeLocalStorage.setItem('lastUser', opName);
                                return updated;
                            });

                            const uid = userProfile?.uid || auth.currentUser?.uid;
                            if (uid) {
                                saveUserProfile(uid, opName, userProfile?.pin, {
                                    rotaConfig: updatedConfig || { ...shiftData.rotaConfig, anchorDate: `${year}-${monthStr}-${dom}` },
                                    rotaOverrides: shiftData.rotaOverrides || {}
                                });
                            }
                        };

                        const handleSetDayOverride = (overrideType: 'work' | 'holiday' | 'sick' | 'off' | 'reset') => {
                            if (!selectedFutureDate) return;
                            const dateStr = getLocalDateString(selectedFutureDate);
                            const opName = (shiftData.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
                            let updatedOverrides: Record<string, string> = {};
                            
                            setShiftData((prev: any) => {
                                const nextOverrides = { ...(prev.rotaOverrides || {}) };
                                if (overrideType === 'reset') {
                                    delete nextOverrides[dateStr];
                                } else if (overrideType === 'work') {
                                    nextOverrides[dateStr] = 'work';
                                } else {
                                    nextOverrides[dateStr] = overrideType;
                                }
                                updatedOverrides = nextOverrides;
                                const updated = {
                                    ...prev,
                                    rotaOverrides: nextOverrides
                                };
                                safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
                                safeLocalStorage.setItem('lastUser', opName);
                                return updated;
                            });

                            const uid = userProfile?.uid || auth.currentUser?.uid;
                            if (uid) {
                                saveUserProfile(uid, opName, userProfile?.pin, {
                                    rotaConfig: shiftData.rotaConfig,
                                    rotaOverrides: updatedOverrides
                                });
                            }

                            setSelectedFutureDate(null);
                            announce(`Rota override updated for this date!`);
                        };

                        const { days, year, month } = getRotaCalendarDays(rotaMonthOffset);
                        const monthName = new Date(year, month, 1).toLocaleString('default', { month: 'long' });
                        
                        let totalShifts = 0;
                        days.forEach(d => {
                            if (d && isWorkDay(d)) totalShifts++;
                        });

                        return (
                            <>
                                <div className="fixed inset-0 bg-slate-950/80 z-[100] flex flex-col justify-end backdrop-blur-sm transition-all">
                                <div className={`${theme.panel} ${theme.radius} p-6 border shadow-2xl animate-in slide-in-from-bottom-full duration-200 h-[85vh] flex flex-col`}>
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-2">
                                            <Calendar size={24} className="text-sky-400" />
                                            <h3 className={`text-xl font-bold text-white ${theme.font}`}>My Rota</h3>
                                        </div>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { haptic('light'); setRotaEditMode(!rotaEditMode); }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ${rotaEditMode ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                                            >
                                                {rotaEditMode ? 'Done' : 'Edit Pattern'}
                                            </button>
                                            <button 
                                                onClick={() => { haptic('light'); setShowRota(false); }} 
                                                className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white border border-slate-700/50"
                                            >
                                                <X size={20}/>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 overflow-y-auto pr-1 pb-6">
                                        {!rotaEditMode && (
                                            <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-2xl mb-5 max-w-md gap-1">
                                                <button
                                                    onClick={() => { haptic('light'); setRotaSubTab('calendar'); }}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                                        ${rotaSubTab === 'calendar' ? 'bg-sky-500 text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    <Calendar size={14} /> Calendar Rota
                                                </button>
                                                <button
                                                    onClick={() => { haptic('light'); setRotaSubTab('history'); }}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2
                                                        ${rotaSubTab === 'history' ? 'bg-sky-500 text-white shadow-xl' : 'text-slate-400 hover:text-slate-200'}`}
                                                >
                                                    <FileText size={14} /> Shift History ({mergedShiftSummaries?.length || 0})
                                                </button>
                                            </div>
                                        )}

                                        {!rotaEditMode ? (
                                            rotaSubTab === 'calendar' ? (
                                                <div className="space-y-6">
                                                    {/* Missing Configuration Notice */}
                                                    {!shiftData.rotaConfig?.anchorDate && (
                                                        <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl flex flex-col items-center text-center gap-2">
                                                            <Sparkles size={24} className="text-sky-450" />
                                                            <h4 className="text-white font-bold">New Rota Feature</h4>
                                                            <p className="text-slate-400 text-sm">Tap 'Edit Pattern' to map out your {shiftData.rotaConfig?.weeks || 6}-week recurring schedule and select an anchor date.</p>
                                                        </div>
                                                    )}

                                                    {/* Calendar Section */}
                                                    <div className="bg-slate-900/50 rounded-2xl p-4 border border-slate-800/50">
                                                        <div className="flex justify-between items-center mb-4">
                                                            <button 
                                                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors disabled:opacity-30"
                                                                onClick={() => { haptic('light'); setRotaMonthOffset(p => Math.max(-12, p - 1)); }}
                                                                disabled={rotaMonthOffset <= -12}
                                                            >
                                                                <ChevronLeft size={16} />
                                                            </button>
                                                            <h4 className="text-white font-black text-lg uppercase tracking-wide">{monthName} {year}</h4>
                                                            <button 
                                                                className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-white transition-colors disabled:opacity-30"
                                                                onClick={() => { haptic('light'); setRotaMonthOffset(p => Math.min(6, p + 1)); }}
                                                                disabled={rotaMonthOffset >= 6}
                                                            >
                                                                <ChevronRight size={16} />
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
                                                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                                                <div key={i} className="text-center text-xs font-bold text-slate-500">{d}</div>
                                                            ))}
                                                        </div>

                                                        <div className="grid grid-cols-7 gap-1 md:gap-2">
                                                            {days.map((d, idx) => {
                                                                if (!d) return <div key={idx} className="aspect-square bg-slate-900/20 rounded-lg" />;
                                                                
                                                                const isToday = d.toDateString() === now.toDateString();
                                                                const hours = getPlannedHours(d);
                                                                const actualHours = getWorkedHoursForDate(d);
                                                                const dStr = getLocalDateString(d);
                                                                
                                                                const targetDayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
                                                                const targetDayEnd = targetDayStart + (24 * 60 * 60 * 1000) - 1;

                                                                const matchingSummary = mergedShiftSummaries.find((summary: any) => {
                                                                    const summaryClockInDate = summary.clockInTime 
                                                                        ? getLocalDateString(new Date(summary.clockInTime)) 
                                                                        : '';
                                                                    const summaryNormDate = normalizeDateStr(summary.date);
                                                                    return summaryClockInDate === dStr || summaryNormDate === dStr;
                                                                });

                                                                const hasWorked = (actualHours !== null && actualHours > 0) || !!matchingSummary;
                                                                const override = shiftData.rotaOverrides?.[dStr];
                                                                
                                                                let ringClass = isToday ? 'ring-2 ring-sky-500' : '';
                                                                let cellStyle = 'bg-slate-800/50 border border-slate-700';
                                                                let textStyle = 'text-slate-400';
                                                                
                                                                if (hasWorked) {
                                                                    cellStyle = 'bg-sky-500/10 border border-sky-500/40 shadow-inner';
                                                                    textStyle = 'text-sky-300 font-extrabold';
                                                                } else if (override && override !== 'work') {
                                                                    if (override === 'holiday') {
                                                                        cellStyle = 'bg-purple-500/15 border border-purple-500/35';
                                                                        textStyle = 'text-purple-400 font-bold';
                                                                    } else if (override === 'sick') {
                                                                        cellStyle = 'bg-red-500/15 border border-red-500/35';
                                                                        textStyle = 'text-red-400 font-bold';
                                                                    } else if (override === 'off') {
                                                                        cellStyle = 'bg-slate-900 border border-slate-800';
                                                                        textStyle = 'text-slate-500';
                                                                    }
                                                                } else if (hours > 0) {
                                                                    if (override === 'work') {
                                                                        cellStyle = 'bg-amber-500/10 border border-amber-500/30';
                                                                        textStyle = 'text-amber-400 font-bold';
                                                                    } else {
                                                                        cellStyle = 'bg-emerald-500/10 border border-emerald-500/30';
                                                                        textStyle = 'text-emerald-400 font-bold';
                                                                    }
                                                                }
                                                                
                                                                return (
                                                                    <button 
                                                                        key={idx} 
                                                                        onClick={() => {
                                                                            haptic('light');
                                                                            const todayStart = new Date();
                                                                            todayStart.setHours(0, 0, 0, 0);
                                                                            
                                                                            const isFuture = d.getTime() >= todayStart.getTime();
                                                                            if (isFuture && !hasWorked) {
                                                                                setSelectedFutureDate(d);
                                                                            } else {
                                                                                if (hasWorked) {
                                                                                    if (matchingSummary) {
                                                                                        setViewingPastSummary(matchingSummary);
                                                                                    } else if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
                                                                                        const activeStart = shiftData.firstStartTime;
                                                                                        const activeEnd = Date.now();
                                                                                        if (Math.max(activeStart, targetDayStart) < Math.min(activeEnd, targetDayEnd)) {
                                                                                            announce("This shift is currently active! Finalize your shift to view the full detail report.");
                                                                                        } else {
                                                                                            announce("No detailed summary found for this shift.");
                                                                                        }
                                                                                    } else {
                                                                                        announce("No detailed summary found for this shift.");
                                                                                    }
                                                                                } else {
                                                                                    announce("No shift was recorded on this past day.");
                                                                                }
                                                                            }
                                                                        }}
                                                                        className={`aspect-square rounded-lg flex items-center justify-center relative flex-col hover:brightness-125 transition-all text-center ${cellStyle} ${ringClass}`}
                                                                    >
                                                                        <span className={`text-xs md:text-sm leading-none ${textStyle} ${isToday && 'text-sky-400 font-extrabold'}`}>
                                                                            {d.getDate()}
                                                                        </span>
                                                                        {hasWorked ? (
                                                                            <span className="text-[8px] md:text-[9px] text-sky-400 font-mono font-black mt-1 leading-none flex items-center flex-col gap-0.5 animate-pulse">
                                                                                <span>{matchingSummary?.totalCases || (isToday && !shiftData.isShiftFinalized ? (shiftData.totalCases || 0) : 0)}c</span>
                                                                                <span>{matchingSummary?.steps ? `${Math.round(matchingSummary.steps)}s` : (actualHours ? `${actualHours}h` : '0h')}</span>
                                                                            </span>
                                                                        ) : override && override !== 'work' ? (
                                                                            <span className={`text-[8px] md:text-[9px] font-bold mt-1 leading-none uppercase tracking-wide
                                                                                ${override === 'holiday' ? 'text-purple-400' : override === 'sick' ? 'text-red-400' : 'text-slate-500'}`}
                                                                            >
                                                                                {override === 'holiday' ? 'Holiday' : override === 'sick' ? 'Sick' : 'Off'}
                                                                            </span>
                                                                        ) : (hours > 0) ? (
                                                                            <span className={`text-[8px] md:text-[9px] font-mono font-bold mt-1 leading-none ${override === 'work' ? 'text-amber-500/80' : 'text-emerald-500/80'}`}>
                                                                                {hoursToHHMM(hours > 0 ? hours : 8)}
                                                                            </span>
                                                                        ) : null}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>

                                                    {/* Stats block */}
                                                    <div className="bg-slate-800/80 p-4 rounded-2xl flex justify-between items-center border border-slate-700/50 gap-2">
                                                        <div className="flex-1">
                                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Expected Shifts</div>
                                                            <div className="text-white text-base md:text-lg font-black truncate">{totalShifts} <span className="text-xs font-normal text-slate-400 font-mono font-bold">/ {days.filter(x => x).length}</span></div>
                                                        </div>
                                                        <div className="flex-1 text-center border-x border-slate-700/50 px-2">
                                                            <div className="text-[9px] text-sky-400 font-bold uppercase tracking-widest">Actual Worked</div>
                                                            <div className="text-sky-400 text-base md:text-lg font-black truncate">
                                                                {hoursToHHMM(days.reduce((sum, d) => sum + (d ? (getWorkedHoursForDate(d) || 0) : 0), 0))}
                                                            </div>
                                                        </div>
                                                        <div className="flex-1 text-right">
                                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Base Hours</div>
                                                            <div className="text-white text-base md:text-lg font-black truncate">{hoursToHHMM(days.reduce((sum, d) => sum + (d ? getPlannedHours(d) : 0), 0))}</div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Shift History Tab */
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center mb-1">
                                                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400">Last 6 Weeks of Picking Summaries</div>
                                                        <button
                                                            onClick={() => {
                                                                haptic('medium');
                                                                setRestoreText('');
                                                                setRestoreStatus(null);
                                                                setShowRestoreModal(true);
                                                            }}
                                                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black tracking-wider uppercase transition-all flex items-center gap-1.5"
                                                        >
                                                            <RotateCcw size={12} /> Restore Shift
                                                        </button>
                                                    </div>
                                                    {mergedShiftSummaries.length === 0 ? (
                                                        <div className="text-center py-12 bg-slate-900/40 border border-slate-800/50 rounded-2xl text-slate-450 italic text-xs">
                                                            No previous shift history found.
                                                        </div>
                                                    ) : (
                                                        mergedShiftSummaries.map((summary, idx) => {
                                                            let dt;
                                                            if (summary.date) {
                                                                dt = new Date(summary.date.includes('T') ? summary.date : `${summary.date}T12:00:00`);
                                                            } else if (summary.clockInTime) {
                                                                dt = new Date(summary.clockInTime);
                                                            } else {
                                                                dt = new Date();
                                                            }
                                                            return (
                                                                <div key={`hist-${idx}`} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800 flex flex-col gap-3 hover:border-slate-700 transition-colors">
                                                                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                                                                        <div>
                                                                            <div className="font-extrabold text-xs text-slate-200">
                                                                                {dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                                                                            </div>
                                                                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex gap-2">
                                                                                <span>In: {summary.clockInTime ? new Date(summary.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}</span>
                                                                                <span>•</span>
                                                                                <span>Out: {summary.clockOutTime ? new Date(summary.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : (summary.clockInTime && summary.totalSeconds ? new Date(summary.clockInTime + summary.totalSeconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--')}</span>
                                                                            </div>
                                                                        </div>
                                                                        <div className="flex gap-2 items-center">
                                                                            {(isUserAdmin() || (summary.userName || '').toUpperCase().trim() === (shiftData.operator || '').toUpperCase().trim()) && (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if(window.confirm("Are you sure you want to delete this shift summary?")) {
                                                                                            const targetUser = summary.userName || shiftData.operator;
                                                                                            const docId = summary.id || `${auth.currentUser?.uid || 'anon'}_${summary.clockInTime}`;
                                                                                            const success = await deleteShiftSummary(docId, targetUser, summary.clockInTime);
                                                                                            if (success) {
                                                                                                haptic('medium');
                                                                                                setShiftSummaries(prev => prev.filter(s => s.id !== summary.id && s.clockInTime !== summary.clockInTime));
                                                                                                fetchShiftSummaries(targetUser, true).then(fresh => {
                                                                                                    setShiftSummaries(fresh);
                                                                                                });
                                                                                            } else {
                                                                                                haptic('heavy');
                                                                                                alert("Failed to delete shift record. If you are not the owner or an admin, you cannot delete this record.");
                                                                                            }
                                                                                        }
                                                                                    }}
                                                                                    className="p-1 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    {(() => {
                                                                        const depMap: any = {};
                                                                        (summary.history || []).forEach((h: any) => {
                                                                            if (h.gap === 'BREAK') return;
                                                                            const dId = h.departmentName || h.department || 'Aisles';
                                                                            if (!depMap[dId]) {
                                                                                depMap[dId] = { cases: 0, seconds: 0 };
                                                                            }
                                                                            depMap[dId].cases += (h.cases || 0);
                                                                            if (h.elapsedSeconds) {
                                                                                depMap[dId].seconds += h.elapsedSeconds;
                                                                            } else {
                                                                                // Fallback calculation if rate is known but elapsedSeconds isn't
                                                                                if(h.rate > 0) depMap[dId].seconds += ((h.cases/h.rate)*3600) || 0;
                                                                            }
                                                                        });
                                                                        
                                                                        const keys = Object.keys(depMap);
                                                                        if (keys.length === 0) {
                                                                             return (
                                                                                 <div className="grid grid-cols-2 gap-3 text-center w-full">
                                                                                     <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                                                                                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Pick Rate</div>
                                                                                         <div className="text-sm font-black text-white">{summary.finalRate || 0}</div>
                                                                                     </div>
                                                                                     <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/50">
                                                                                         <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Cases</div>
                                                                                         <div className="text-sm font-black text-white">{summary.totalCases || 0}</div>
                                                                                     </div>
                                                                                 </div>
                                                                             );
                                                                        }

                                                                        return (
                                                                            <div className="flex flex-col gap-2">
                                                                                <div className="flex justify-between pb-1 border-b border-slate-800/50 px-1">
                                                                                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest w-1/3 text-left">Department</div>
                                                                                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest w-1/3 text-center">Cases</div>
                                                                                    <div className="text-[9px] uppercase font-bold text-slate-500 tracking-widest w-1/3 text-right">Pick Rate</div>
                                                                                </div>
                                                                                {keys.map((k) => {
                                                                                    const ms = depMap[k];
                                                                                    const rt = ms.seconds > 0 ? Math.round(ms.cases / (ms.seconds / 3600)) : 0;
                                                                                    return (
                                                                                        <div key={k} className="flex justify-between items-center px-1">
                                                                                            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider w-1/3 text-left">{k}</div>
                                                                                            <div className="text-xs font-black text-white w-1/3 text-center">{ms.cases}</div>
                                                                                            <div className="text-xs font-black text-sky-400 w-1/3 text-right">{rt} <span className="text-[8px] text-slate-400 font-mono">P/H</span></div>
                                                                                        </div>
                                                                                    )
                                                                                })}
                                                                                <div className="grid grid-cols-2 gap-3 text-center w-full mt-2 pt-2 border-t border-slate-800/50">
                                                                                    <div className="bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-800/50">
                                                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Active Time</div>
                                                                                        <div className="text-[10px] font-black text-slate-350">{formatHHMM(summary.activeSeconds || 0)}</div>
                                                                                    </div>
                                                                                    <div className="bg-slate-950/40 py-2 px-1 rounded-xl border border-slate-800/50">
                                                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Break Time</div>
                                                                                        <div className="text-[10px] font-black text-slate-350">{formatHHMM(summary.breakSeconds || 0)}</div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        )
                                                                    })()}
                                                                    
                                                                    <button
                                                                        onClick={() => { haptic('medium'); setViewingPastSummary(summary); }}
                                                                        className="w-full mt-1.5 py-2.5 bg-slate-800 hover:bg-slate-750 text-sky-400 hover:text-sky-300 text-xs font-black tracking-widest rounded-xl border border-slate-800 transition-all flex items-center justify-center gap-1.5 uppercase font-mono"
                                                                    >
                                                                        <FileText size={13} /> View Full Shift Summary
                                                                    </button>
                                                                </div>
                                                            );
                                                        })
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            /* Rota Edit Mode */
                                            <div className="space-y-6">
                                                <div className="text-slate-300 text-sm">
                                                    Tap the days you are <b>scheduled to work</b> in your repeating cycle.
                                                </div>
                                                
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl">
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Analyse Shift History</label>
                                                        <textarea 
                                                            placeholder="Paste a list of dates you worked (e.g. May 1, May 2...)"
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white h-20 focus:outline-none focus:border-sky-500 transition-colors mb-2"
                                                            onChange={(e) => {
                                                                // Placeholder for real-time validation if needed
                                                            }}
                                                        />
                                                        <button 
                                                            onClick={() => announce("I can help you deduce the pattern if you paste those dates in the chat!")}
                                                            className="w-full py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-colors mb-3"
                                                        >
                                                            Detect Pattern Correctly
                                                        </button>
                                                        
                                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 border-t border-slate-700/50 pt-3">Custom Assistant Image URL</label>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Paste an image URL (PNG/JPG)"
                                                            value={shiftData.assistantImage || ''}
                                                            onChange={(e) => setShiftData({ ...shiftData, assistantImage: e.target.value })}
                                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-sky-500 transition-colors"
                                                        />
                                                        <p className="mt-2 text-[10px] text-slate-500 italic">Leave blank to keep the funny owl!</p>
                                                    </div>

                                                    {(shiftData.rotaConfig?.pattern || []).map((week: any[], wIdx: number) => (
                                                        <div key={`w-${wIdx}`} className="bg-slate-900 rounded-xl p-3 border border-slate-800">
                                                            <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Week {wIdx + 1}</div>
                                                            <div className="grid grid-cols-7 gap-1">
                                                                {week.map((val: any, dIdx: number) => {
                                                                    const hours = typeof val === 'number' ? val : (val ? 8 : 0);
                                                                    const working = hours > 0;
                                                                    return (
                                                                        <button
                                                                            key={`wd-${wIdx}-${dIdx}`}
                                                                            onClick={() => handleTogglePatternDay(wIdx, dIdx)}
                                                                            className={`aspect-square rounded-lg font-bold text-[10px] transition-colors flex flex-col items-center justify-center p-0.5
                                                                                ${working ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                                                                        >
                                                                            <span className="font-bold leading-tight">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][dIdx]}</span>
                                                                            <span className={`text-[8px] font-mono leading-tight ${working ? 'text-white/80' : 'text-slate-500'}`}>
                                                                                {working ? `${hours}h` : 'Off'}
                                                                            </span>
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="pt-4 border-t border-slate-800">
                                                    <div className="text-xs font-bold text-slate-500 mb-2 uppercase">Anchor Date Setting</div>
                                                    <p className="text-[10px] text-slate-400 mb-4 whitespace-normal">
                                                        To align this recurring pattern with real life dates, set an Anchor Date. This date will represent <b>Monday of Week 1</b>.
                                                    </p>
                                                    
                                                    {shiftData.rotaConfig?.anchorDate ? (
                                                        <div className="flex justify-between items-center bg-slate-900 p-3 rounded-xl border border-slate-800">
                                                            <span className="text-emerald-400 font-bold font-mono">{shiftData.rotaConfig.anchorDate}</span>
                                                            <input 
                                                                type="date" 
                                                                value={shiftData.rotaConfig.anchorDate}
                                                                onChange={(e) => setShiftData((prev: any) => ({
                                                                    ...prev,
                                                                    rotaConfig: { ...prev.rotaConfig, anchorDate: e.target.value }
                                                                }))}
                                                                className="bg-slate-800 text-white text-xs px-2 py-1 rounded"
                                                            />
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={handleSetAnchor}
                                                            className="w-full py-3 bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl font-bold shadow-lg"
                                                        >
                                                            Set Anchor Date (Current Week)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Future Rota Date Overrides Modal */}
                            {selectedFutureDate && (
                                <div className="fixed inset-0 bg-slate-950/90 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
                                    <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in duration-200">
                                        <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                                            <Calendar size={20} className="text-sky-450" />
                                            Choose Rota Override
                                        </h3>
                                        <p className="text-slate-400 text-xs mb-5 font-medium">
                                            Set your custom shift status for <b className="text-white font-mono">{selectedFutureDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</b>.
                                        </p>
                                        
                                        <div className="space-y-3 mb-6">
                                            <button 
                                                onClick={() => handleSetDayOverride('work')}
                                                className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                                            >
                                                <span>Scheduled Work Day</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded">Pattern</span>
                                            </button>

                                            <button 
                                                onClick={() => handleSetDayOverride('holiday')}
                                                className="w-full p-4 bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                                            >
                                                <span>Holiday / Paid Leave</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest bg-purple-500/20 px-2 py-0.5 rounded">Holiday</span>
                                            </button>

                                            <button 
                                                onClick={() => handleSetDayOverride('sick')}
                                                className="w-full p-4 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                                            >
                                                <span>Sick Day</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest bg-red-500/20 px-2 py-0.5 rounded">Sick</span>
                                            </button>

                                            <button 
                                                onClick={() => handleSetDayOverride('off')}
                                                className="w-full p-4 bg-slate-800/50 hover:bg-slate-850 text-slate-300 border border-slate-700/50 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                                            >
                                                <span>Scheduled Rest Day / Off</span>
                                                <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-800 px-2 py-0.5 rounded">Off day</span>
                                            </button>

                                            <button 
                                                onClick={() => handleSetDayOverride('reset')}
                                                className="w-full p-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-xs"
                                            >
                                                <span>Reset to Standard Pattern</span>
                                                <span className="text-[9px] uppercase font-bold tracking-widest bg-sky-500/20 px-2 py-0.5 rounded">Default</span>
                                            </button>
                                        </div>

                                        <button 
                                            onClick={() => setSelectedFutureDate(null)}
                                            className="w-full py-4 bg-slate-800 hover:bg-slate-705 text-xs text-white uppercase font-black tracking-widest rounded-2xl border border-slate-700 transition-all text-center"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Historical Shift Detail Modal */}
                            {viewingPastSummary && (
                                <div className="fixed inset-0 bg-slate-950/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
                                    <div className="bg-slate-900 w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border border-slate-800 shadow-2xl animate-in zoom-in duration-200">
                                        
                                        <div className="p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
                                            <div>
                                                <h3 className="text-lg font-black text-white flex items-center gap-2">
                                                    <Sparkles size={20} className="text-sky-400" />
                                                    Shift Detail Summary
                                                </h3>
                                                <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold font-sans mt-0.5">
                                                    Recorded on <span className="text-white font-mono">{new Date(viewingPastSummary.date ? (viewingPastSummary.date.includes('T') ? viewingPastSummary.date : `${viewingPastSummary.date}T12:00:00`) : (viewingPastSummary.clockInTime || viewingPastSummary.timestamp?.seconds * 1000 || Date.now())).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                </p>
                                            </div>
                                            <div className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 rounded-md text-sky-400 font-bold self-start mt-1 shrink-0">
                                                {viewingPastSummary.department || 'Aisles'} - {viewingPastSummary.zone || 'Zone A'}
                                            </div>
                                        </div>

                                        <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                                            {(() => {
                                                const hist = viewingPastSummary.history || [];
                                                
                                                // Derive activeSeconds accurately if saved as 0 or missing
                                                let derivedActiveSecs = viewingPastSummary.activeSeconds || 0;
                                                if (derivedActiveSecs <= 60 && hist.length > 0) {
                                                    let sumElapsed = 0;
                                                    hist.forEach((h: any) => {
                                                        if (h.gap === 'BREAK' || h.gap === 'NOTE' || h.isNote) return;
                                                        const c = parseInt(h.cases) || 0;
                                                        let el = h.elapsedSeconds;
                                                        if (el === undefined || isNaN(el) || el <= 0) {
                                                            const r = parseFloat(h.rate);
                                                            el = (r > 0 && c > 0) ? Math.round((c / r) * 3600) : 0;
                                                        }
                                                        sumElapsed += el;
                                                    });
                                                    if (sumElapsed > 0) derivedActiveSecs = sumElapsed;
                                                }

                                                // Derive total duration from clock times if saved as 0
                                                let derivedTotalSecs = viewingPastSummary.totalSeconds || 0;
                                                if (derivedTotalSecs <= 60) {
                                                    if (viewingPastSummary.clockInTime && viewingPastSummary.clockOutTime) {
                                                        const diff = (viewingPastSummary.clockOutTime - viewingPastSummary.clockInTime) / 1000;
                                                        if (diff > 0) derivedTotalSecs = diff;
                                                    } else if (derivedActiveSecs > 0) {
                                                        derivedTotalSecs = derivedActiveSecs + (viewingPastSummary.breakSeconds || 2700);
                                                    }
                                                }

                                                // Derive break seconds
                                                let derivedBreakSecs = viewingPastSummary.breakSeconds || 0;
                                                if (derivedBreakSecs === 0 && derivedTotalSecs > derivedActiveSecs) {
                                                    derivedBreakSecs = derivedTotalSecs - derivedActiveSecs;
                                                }

                                                // Derive true final rate
                                                let derivedFinalRate = viewingPastSummary.finalRate || 0;
                                                if ((derivedFinalRate === 0 || derivedActiveSecs > 60) && (viewingPastSummary.totalCases || 0) > 0 && derivedActiveSecs > 10) {
                                                    const calculatedRate = Math.round(((viewingPastSummary.totalCases || 0) / derivedActiveSecs) * 3600);
                                                    if (derivedFinalRate === 0 || Math.abs(calculatedRate - derivedFinalRate) > 5) {
                                                        derivedFinalRate = calculatedRate;
                                                    }
                                                }

                                                const targetRateVal = shiftData.scoreConfig?.[viewingPastSummary.department || 'Aisles']?.targetRate || 220;
                                                const targetTotalSec = ((viewingPastSummary.totalCases || 0) / targetRateVal) * 3600;
                                                const netSavedSecs = Math.round(targetTotalSec - derivedActiveSecs);

                                                return (
                                                    <>
                                                        {/* Shift Logistics/Timings */}
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Shift Timeline & Logistics</h4>
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock size={10}/> Clock In</div>
                                                                    <div className="text-lg font-black text-white">{viewingPastSummary.clockInTime ? new Date(viewingPastSummary.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
                                                                </div>
                                                                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><LogOut size={10}/> Clock Out</div>
                                                                    <div className="text-lg font-black text-white">{viewingPastSummary.clockOutTime ? new Date(viewingPastSummary.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
                                                                </div>
                                                                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity size={10}/> Gross Length</div>
                                                                    <div className="text-lg font-black text-white">{formatHHMM(derivedTotalSecs)}</div>
                                                                </div>
                                                                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Coffee size={10}/> Break Time</div>
                                                                    <div className="text-lg font-black text-amber-400">{formatHHMM(derivedBreakSecs)}</div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Performance Stats */}
                                                        <div>
                                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Total Picking Performance</h4>
                                                            <div className="grid grid-cols-3 gap-3">
                                                                <div className="bg-sky-950/20 p-3 rounded-2xl border border-sky-900/30 text-center">
                                                                    <div className="text-[9px] font-bold text-sky-500/70 uppercase tracking-wider mb-1">Pick Rate</div>
                                                                    <div className="text-xl font-black text-sky-400">{derivedFinalRate || 0}</div>
                                                                    <div className="text-[8px] font-bold text-slate-500 mt-1">CASES / HR</div>
                                                                </div>
                                                                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-center">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Cases</div>
                                                                    <div className="text-xl font-black text-white">{(viewingPastSummary.totalCases || 0).toLocaleString()}</div>
                                                                    <div className="text-[8px] font-bold text-slate-500 mt-1">IN {formatHHMM(derivedActiveSecs).split(':')[0]}h {formatHHMM(derivedActiveSecs).split(':')[1]}m</div>
                                                                </div>
                                                                <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-center">
                                                                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Net Saved</div>
                                                                    <div className={`text-xl font-black ${netSavedSecs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                        {netSavedSecs >= 0 ? '+' : '-'}
                                                                        {formatTime(Math.abs(netSavedSecs)).split(':')[0]}<span className="text-xs">m</span>
                                                                    </div>
                                                                    <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Vs Target</div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </>
                                                );
                                            })()}

                                            {/* Activity & Movement Tracking */}
                                            <div>
                                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Activity & Movement Tracking</h4>
                                                <div className="grid grid-cols-3 gap-3">
                                                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center">
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Steps Count</div>
                                                        <div className="text-xl font-black text-amber-500">{(viewingPastSummary.steps || 0).toLocaleString()}</div>
                                                        <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Total Steps</div>
                                                    </div>
                                                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center">
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Distance (Km)</div>
                                                        <div className="text-xl font-black text-emerald-400">{((viewingPastSummary.steps || 0) * 0.00075).toFixed(2)}</div>
                                                        <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Distance Km</div>
                                                    </div>
                                                    <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center">
                                                        <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Efficiency</div>
                                                        <div className="text-xl font-black text-blue-400">{(viewingPastSummary.totalCases || 0) > 0 ? Math.round((viewingPastSummary.steps || 0) / (viewingPastSummary.totalCases || 1)) : '--'}</div>
                                                        <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Steps / Case</div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Department Breakdown */}
                                            {(() => {
                                                const breakdown = getDepartmentBreakdown(viewingPastSummary.history, viewingPastSummary);
                                                if (breakdown.length === 0) return null;
                                                return (
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Department Breakdown</h4>
                                                        <div className="grid grid-cols-1 gap-2.5">
                                                            {breakdown.map((item) => {
                                                                const isAbove = item.rate >= item.targetRate;
                                                                return (
                                                                    <div key={item.department} className="bg-slate-950/45 p-3 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                                                                        <div className="flex items-center gap-3">
                                                                            <div className={`w-2.5 h-2.5 rounded-full ${
                                                                                item.zone === 'CHILLER' ? 'bg-blue-400' :
                                                                                item.zone === 'FREEZER' ? 'bg-indigo-400' :
                                                                                'bg-amber-400'
                                                                            }`} />
                                                                            <div>
                                                                                <div className="text-xs font-black text-white">{item.departmentName}</div>
                                                                                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                                                                    {item.picksCount} {item.picksCount === 1 ? 'order' : 'orders'} • target {item.targetRate}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className={`text-sm font-black ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                {item.rate} <span className="text-[8px] font-normal text-slate-400">P/H</span>
                                                                            </div>
                                                                            <div className="text-[10px] font-mono text-slate-305">
                                                                                {item.cases} {item.cases === 1 ? 'case' : 'cases'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            {/* Orders Details (History) */}
                                            {viewingPastSummary.history && viewingPastSummary.history.length > 0 && (
                                                <div>
                                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-end gap-2">
                                                        Order Details
                                                        <span className="bg-slate-800 text-[8px] px-2 py-0.5 rounded text-slate-300 shrink-0">{viewingPastSummary.history.filter((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote).length} PICKS</span>
                                                    </h4>
                                                    <div className="bg-slate-950/40 rounded-2xl border border-slate-800 overflow-hidden">
                                                        <table className="w-full text-[10px] sm:text-xs">
                                                            <thead className="bg-slate-900 border-b border-slate-800">
                                                                <tr className="text-slate-500 text-[8px] uppercase tracking-wider font-black">
                                                                    <th className="py-2.5 px-3 text-left w-1/3">Time</th>
                                                                    <th className="py-2.5 px-2 text-left">Label</th>
                                                                    <th className="py-2.5 px-2 text-center">Cases</th>
                                                                    <th className="py-2.5 px-3 text-right">Rate</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-800/50">
                                                                {viewingPastSummary.history.map((h: any, idx: number) => {
                                                                    const isNote = h.gap === 'NOTE' || h.isNote;
                                                                    if (isNote) {
                                                                        return (
                                                                            <tr key={idx} className="bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500 transition-colors">
                                                                                <td className="py-2.5 px-3 text-amber-400 font-extrabold whitespace-nowrap flex items-center gap-1.5 font-mono">
                                                                                    {h.start}
                                                                                </td>
                                                                                <td colSpan={2} className="py-2.5 px-2 text-amber-300 font-bold break-words whitespace-normal text-[11px] sm:text-xs">
                                                                                    <div className="flex flex-col">
                                                                                        <span className="leading-relaxed font-black select-text tracking-wide">{h.storeLabel}</span>
                                                                                        {h.departmentName && (
                                                                                            <span className="text-[7px] text-amber-500/60 font-black tracking-wider uppercase block mt-0.5">
                                                                                                LOGGED IN: {h.departmentName}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="py-2.5 px-3 text-right text-amber-500/70 font-black text-[9px] uppercase tracking-wider whitespace-nowrap">
                                                                                    NOTE
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    }
                                                                    const isEditingThisOrder = editingOrderIndex === idx;
                                                                    const orderLabelToDisplay = (() => {
                                                                        if (h.gap === 'BREAK') return 'BREAK';
                                                                        const rawLabel = (h.storeLabel || '').trim();
                                                                        if (rawLabel && rawLabel !== '-') return rawLabel;
                                                                        if (h.departmentName || h.department) return h.departmentName || h.department;
                                                                        return `Order #${idx + 1}`;
                                                                    })();

                                                                    return (
                                                                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                                                                            <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono tracking-tighter">
                                                                                {h.start} <span className="text-slate-600 font-sans mx-0.5">→</span> {h.finish}
                                                                            </td>
                                                                            <td className="py-2.5 px-2 text-sky-400 font-bold max-w-[200px]">
                                                                                <div className="flex flex-col">
                                                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                                                        {isEditingThisOrder ? (
                                                                                            <div className="flex items-center gap-1 my-1">
                                                                                                <input
                                                                                                    type="text"
                                                                                                    value={editingOrderLabel}
                                                                                                    onChange={(e) => setEditingOrderLabel(e.target.value)}
                                                                                                    className="bg-slate-900 border border-sky-500/50 text-white text-[11px] font-mono px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-sky-400 max-w-[130px]"
                                                                                                    autoFocus
                                                                                                    placeholder="Store / Aisle label"
                                                                                                    onKeyDown={(e) => {
                                                                                                        if (e.key === 'Enter') handleSavePastOrderLabel(idx);
                                                                                                        if (e.key === 'Escape') { setEditingOrderIndex(null); setEditingOrderLabel(''); }
                                                                                                    }}
                                                                                                />
                                                                                                <button
                                                                                                    onClick={() => handleSavePastOrderLabel(idx)}
                                                                                                    className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1 rounded transition-colors shrink-0"
                                                                                                    title="Save Label"
                                                                                                >
                                                                                                    <Check size={12} />
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => { setEditingOrderIndex(null); setEditingOrderLabel(''); }}
                                                                                                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1 rounded transition-colors shrink-0"
                                                                                                    title="Cancel"
                                                                                                >
                                                                                                    <X size={12} />
                                                                                                </button>
                                                                                            </div>
                                                                                        ) : (
                                                                                            <>
                                                                                                <span className="truncate max-w-[140px] sm:max-w-[180px]" title={orderLabelToDisplay}>
                                                                                                    {orderLabelToDisplay}
                                                                                                </span>
                                                                                                {h.gap !== 'BREAK' && (
                                                                                                    <button
                                                                                                        onClick={(e) => {
                                                                                                            e.stopPropagation();
                                                                                                            setEditingOrderIndex(idx);
                                                                                                            setEditingOrderLabel(h.storeLabel || (orderLabelToDisplay.startsWith('Order #') ? '' : orderLabelToDisplay));
                                                                                                        }}
                                                                                                        className="text-slate-500 hover:text-sky-400 p-0.5 rounded transition-colors shrink-0"
                                                                                                        title="Edit Order Label"
                                                                                                    >
                                                                                                        <Edit2 size={11} />
                                                                                                    </button>
                                                                                                )}
                                                                                            </>
                                                                                        )}
                                                                                        {(h.labelImage || (h.labelImages && h.labelImages.length > 0)) && (
                                                                                            <button 
                                                                                                onClick={(e) => { e.stopPropagation(); setViewingLabels(h.labelImages?.length ? h.labelImages : (h.labelImage ? [h.labelImage] : null)); }} 
                                                                                                className="text-emerald-400 p-1 hover:bg-emerald-500/20 rounded shrink-0 border border-emerald-500/20"
                                                                                            >
                                                                                                <Camera size={12} />
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                    {h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote && orderLabelToDisplay !== (h.departmentName || h.department || 'Aisles') && (
                                                                                        <span className="text-[8px] text-slate-500 font-bold tracking-wider uppercase block mt-0.5">
                                                                                            {h.departmentName || h.department || 'Aisles'}
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            </td>
                                                                            <td className="py-2.5 px-2 text-center text-white font-medium">{h.cases}</td>
                                                                            <td className={`py-2.5 px-3 text-right font-black w-[50px] ${h.rate && h.rate > 0 ? (h.statusClass?.includes('emerald') ? 'text-emerald-400' : 'text-slate-300') : 'text-slate-500'}`}>
                                                                                {h.rate || '-'}
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            )}

                                            {/* General Shift Labels Images */}
                                            {(() => {
                                                const extractedLabels: {title: string, url: any, isPick: boolean}[] = [];
                                                if (viewingPastSummary.labelImage) {
                                                    extractedLabels.push({ title: "Base Label", url: viewingPastSummary.labelImage, isPick: false });
                                                }
                                                if (Array.isArray(viewingPastSummary.labelImages)) {
                                                    viewingPastSummary.labelImages.forEach((img: any, i: number) => {
                                                        extractedLabels.push({ title: `Main Label ${i+1}`, url: img, isPick: false });
                                                    });
                                                }
                                                if (Array.isArray(storedShiftPhotos) && storedShiftPhotos.length > 0) {
                                                    storedShiftPhotos.forEach((photo: any, i: number) => {
                                                        if (photo && photo.blob) {
                                                            extractedLabels.push({ title: `Stored Photo ${i+1}`, url: photo.blob, isPick: false });
                                                        }
                                                    });
                                                }
                                                if (Array.isArray(viewingPastSummary.history)) {
                                                    viewingPastSummary.history.forEach((h: any, i: number) => {
                                                        if (h.labelImage) extractedLabels.push({ title: `Order ${i+1}`, url: h.labelImage, isPick: true });
                                                        if (Array.isArray(h.labelImages)) {
                                                            h.labelImages.forEach((img: any, j: number) => {
                                                                extractedLabels.push({ title: `Pick ${i+1}: Label ${h.labelImages.length > 1 ? j+1 : ''}`, url: img, isPick: true });
                                                            });
                                                        }
                                                    });
                                                }
                                                
                                                if (extractedLabels.length === 0) return null;
                                                
                                                return (
                                                    <div>
                                                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">All Scanned Labels</h4>
                                                        <div className="flex flex-wrap gap-2">
                                                            {extractedLabels.map((lbl, idx) => (
                                                                <button 
                                                                    key={idx}
                                                                    onClick={() => setViewingLabels([lbl.url])}
                                                                    className={`px-4 py-2.5 bg-${lbl.isPick ? 'emerald' : 'sky'}-500/10 text-${lbl.isPick ? 'emerald' : 'sky'}-400 border border-${lbl.isPick ? 'emerald' : 'sky'}-500/20 rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors hover:bg-${lbl.isPick ? 'emerald' : 'sky'}-500/20 flex items-center gap-2`}
                                                                >
                                                                    <Camera size={12} /> {lbl.title}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                        
                                        <div className="p-4 border-t border-slate-800 shrink-0 select-none flex gap-2">
                                            {(isUserAdmin() || (viewingPastSummary.userName || '').toUpperCase().trim() === (shiftData.operator || '').toUpperCase().trim()) && (
                                                <button
                                                    onClick={async () => {
                                                        if (window.confirm("Are you sure you want to delete this shift summary?")) {
                                                            const targetUser = viewingPastSummary.userName || shiftData.operator;
                                                            const docId = viewingPastSummary.id || `${auth.currentUser?.uid || 'anon'}_${viewingPastSummary.clockInTime}`;
                                                            const success = await deleteShiftSummary(docId, targetUser, viewingPastSummary.clockInTime);
                                                            if (success) {
                                                                haptic('medium');
                                                                setShiftSummaries(prev => prev.filter(s => s.id !== viewingPastSummary.id && s.clockInTime !== viewingPastSummary.clockInTime));
                                                                setViewingPastSummary(null);
                                                                fetchShiftSummaries(targetUser, true).then(fresh => {
                                                                    setShiftSummaries(fresh);
                                                                });
                                                            } else {
                                                                haptic('heavy');
                                                                alert("Failed to delete shift record.");
                                                            }
                                                        }
                                                    }}
                                                    className="px-4 py-4 bg-red-500/10 hover:bg-red-500/20 active:scale-[0.98] text-xs text-red-400 font-bold tracking-wider rounded-2xl border border-red-500/20 transition-all flex items-center gap-1.5 shrink-0"
                                                >
                                                    <Trash2 size={16} /> Delete
                                                </button>
                                            )}
                                            <button
                                                onClick={async () => {
                                                    haptic('medium');
                                                    const copied = await copyFullShiftReport(viewingPastSummary);
                                                    if (copied) {
                                                        alert("Full Shift Report & Restore Payload copied to clipboard!");
                                                    } else {
                                                        alert("Failed to copy report.");
                                                    }
                                                }}
                                                className="px-4 py-4 bg-sky-500/10 hover:bg-sky-500/20 active:scale-[0.98] text-xs text-sky-400 font-bold tracking-wider rounded-2xl border border-sky-500/20 transition-all flex items-center gap-1.5 shrink-0"
                                            >
                                                <Share2 size={16} /> Copy Full Report
                                            </button>
                                            <button 
                                                onClick={() => setViewingPastSummary(null)}
                                                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-xs text-white uppercase font-black tracking-widest rounded-2xl border border-slate-700 transition-all text-center"
                                            >
                                                Close Shift Sheet
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Restore Shift Modal */}
                            {showRestoreModal && (
                                <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
                                    <div className="bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in duration-200 flex flex-col gap-4">
                                        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                                            <div className="flex items-center gap-2 text-white font-black text-base italic">
                                                <RotateCcw className="text-emerald-400" size={18} /> RESTORE SHIFT FROM REPORT
                                            </div>
                                            <button onClick={() => setShowRestoreModal(false)} className="text-slate-500 hover:text-white p-1">
                                                <X size={18} />
                                            </button>
                                        </div>
                                        
                                        <p className="text-xs text-slate-400 leading-relaxed font-bold">
                                            Paste your exported Shift Report CSV or plain text report below. The system will parse the history and restore the complete shift into your Rota and database history.
                                        </p>

                                        <textarea
                                            value={restoreText}
                                            onChange={(e) => setRestoreText(e.target.value)}
                                            placeholder="Paste Shift Report CSV / JSON here..."
                                            rows={8}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500/50 resize-none"
                                        />

                                        {restoreStatus && (
                                            <div className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider ${restoreStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : restoreStatus.type === 'info' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                {restoreStatus.msg}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                onClick={() => {
                                                    setRestoreText('');
                                                    setRestoreStatus(null);
                                                    setShowRestoreModal(false);
                                                }}
                                                className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:text-white"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={async () => {
                                                    haptic('heavy');
                                                    setRestoreStatus({ type: 'info', msg: 'Parsing & restoring shift...' });
                                                    const res = await restoreShiftFromReportText(restoreText, shiftData.operator || 'DASERGHIE');
                                                    if (res.success) {
                                                        setRestoreStatus({ type: 'success', msg: res.message });
                                                        fetchShiftSummaries(shiftData.operator || 'DASERGHIE', true).then(fresh => {
                                                            setShiftSummaries(fresh);
                                                        });
                                                        setTimeout(() => {
                                                            setShowRestoreModal(false);
                                                            setRestoreText('');
                                                            setRestoreStatus(null);
                                                        }, 1500);
                                                    } else {
                                                        setRestoreStatus({ type: 'error', msg: res.message });
                                                    }
                                                }}
                                                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                                            >
                                                Restore Shift
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}

                    {/* PIN Modal */}
                    {pinModal.show && (
                        <div className="fixed inset-0 bg-slate-950/90 z-[400] flex items-center justify-center p-6 backdrop-blur-md pt-safe-top pb-safe-bottom">
                            <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-8 border border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-200">
                                <div className="text-center mb-6">
                                    <h3 className="text-xl font-bold text-white mb-2">Admin Security</h3>
                                    <p className="text-slate-400 text-sm">Enter the Admin PIN to proceed with {pinModal.type === 'clear' ? 'clearing leaderboard' : pinModal.type === 'purge' ? '6-week database purge' : 'factory reset'}.</p>
                                </div>
                                <div className="flex justify-center gap-3 mb-8">
                                    {[1,2,3,4,5,6].map((i) => (
                                        <div key={i} className={`w-3 h-3 rounded-full ${pinModal.input.length >= i ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                                    ))}
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                                        <button 
                                            key={num} 
                                            onClick={() => {
                                                haptic('light');
                                                if (pinModal.input.length < 6) {
                                                    const nextInput = pinModal.input + num;
                                                    setPinModal({ ...pinModal, input: nextInput });
                                                    if (nextInput.length === 6) {
                                                        if (nextInput === USERS.ADMIN) {
                                                            haptic('medium');
                                                            if (pinModal.type === 'clear') {
                                                                clearLeaderboard().then(success => {
                                                                    if (success) window.alert("Leaderboard cleared!");
                                                                });
                                                                setPinModal({ ...pinModal, show: false, input: '' });
                                                            } else if (pinModal.type === 'purge') {
                                                                purgeDatabaseOlderThan6Weeks().then(res => {
                                                                    if (res.success) {
                                                                        window.alert(`Database purge complete! Deleted ${res.summariesDeleted} shift summaries and ${res.leaderboardDeleted} leaderboard entries older than 6 weeks.`);
                                                                    } else {
                                                                        window.alert(`Database purge failed: ${res.error}`);
                                                                    }
                                                                });
                                                                setPinModal({ ...pinModal, show: false, input: '' });
                                                            } else {
                                                                const consented = localStorage.getItem('userConsented');
                                                                localStorage.clear();
                                                                if (consented) localStorage.setItem('userConsented', consented);
                                                                window.location.reload();
                                                            }
                                                        } else {
                                                            haptic('heavy');
                                                            setPinModal({ ...pinModal, input: '' });
                                                        }
                                                    }
                                                }
                                            }}
                                            className="h-16 rounded-2xl bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                                        >
                                            {num}
                                        </button>
                                    ))}
                                    <button 
                                        onClick={() => { haptic('light'); setPinModal({ ...pinModal, show: false }); }}
                                        className="h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                                    >
                                        <X size={24} />
                                    </button>
                                    <button 
                                        onClick={() => {
                                            haptic('light');
                                            if (pinModal.input.length < 6) {
                                                const nextInput = pinModal.input + '0';
                                                setPinModal({ ...pinModal, input: nextInput });
                                                if (nextInput.length === 6) {
                                                    if (nextInput === USERS.ADMIN) {
                                                        haptic('medium');
                                                        if (pinModal.type === 'clear') {
                                                            clearLeaderboard().then(success => {
                                                                if (success) window.alert("Leaderboard cleared!");
                                                            });
                                                            setPinModal({ ...pinModal, show: false, input: '' });
                                                        } else if (pinModal.type === 'purge') {
                                                            purgeDatabaseOlderThan6Weeks().then(res => {
                                                                if (res.success) {
                                                                    window.alert(`Database purge complete! Deleted ${res.summariesDeleted} shift summaries and ${res.leaderboardDeleted} leaderboard entries older than 6 weeks.`);
                                                                } else {
                                                                    window.alert(`Database purge failed: ${res.error}`);
                                                                }
                                                            });
                                                            setPinModal({ ...pinModal, show: false, input: '' });
                                                        } else {
                                                            const consented = localStorage.getItem('userConsented');
                                                            localStorage.clear();
                                                            if (consented) localStorage.setItem('userConsented', consented);
                                                            window.location.reload();
                                                        }
                                                    } else {
                                                        haptic('heavy');
                                                        setPinModal({ ...pinModal, input: '' });
                                                    }
                                                }
                                            }
                                        }}
                                        className="h-16 rounded-2xl bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                                    >
                                        0
                                    </button>
                                    <button 
                                        onClick={() => { haptic('light'); setPinModal({ ...pinModal, input: pinModal.input.slice(0, -1) }); }}
                                        className="h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                                    >
                                        <Trash2 size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                {activeScreen === 1 && (
                    <div id="screen-performance" className="h-full flex flex-col">
                        <PerformanceDashboard 
                            theme={theme} 
                            shiftData={shiftData} 
                            getCleanName={getCleanName} 
                            consistencyPercent={consistencyPercent}
                            shiftBestRate={shiftBestRate}
                            isAisles={isAisles}
                            stats={stats}
                            formatTime={formatTime}
                            liveUsers={liveUsers}
                            trendData={trendData}
                            targetRate={targetRate}
                            isAdmin={isUserAdmin()}
                            allAdminSummaries={adminAllSummaries}
                            updateShiftData={updateShiftData}
                        />
                    </div>
                )}
                {activeScreen === 2 && isUserAdmin() && (
                    <div id="screen-admin" className="h-full flex flex-col">
                        <AdminDashboard 
                            theme={theme}
                            currentWarehouseId={currentWarehouseId}
                            liveUsers={liveUsers}
                            firebaseUser={firebaseUser}
                            onBackToDashboard={() => setActiveScreen(0)}
                        />
                    </div>
                )}
            </div>
            
            {/* Global Overlays & Modals */}
            <AnimatePresence>
                {showCelebration && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.5 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
                    >
                        <div className="bg-slate-900/90 backdrop-blur-xl p-8 rounded-[40px] border border-emerald-500/30 text-center shadow-2xl relative overflow-hidden">
                            <motion.div 
                                animate={{ y: [-10, 0, -10] }}
                                transition={{ duration: 2, repeat: Infinity }}
                                className="text-6xl mb-4"
                            >
                                {celebrationTitle.includes('SKIN') ? '✨' : '🏆'}
                            </motion.div>
                            <h2 className="text-white text-3xl font-black italic tracking-tighter mb-2">{celebrationTitle}</h2>
                            <p className="text-emerald-400 font-bold text-lg">{celebrationSubtitle}</p>
                            <div className="mt-6 flex gap-2 justify-center">
                                <Sparkles className="text-emerald-400 animate-pulse" />
                                <Sparkles className="text-sky-400 animate-pulse delay-75" />
                                <Sparkles className="text-purple-400 animate-pulse delay-150" />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isSavingShift && (
                <div id="saving-overlay" className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[450] px-4 backdrop-blur-md">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500 mb-4"></div>
                    <h3 className="text-white text-xl font-bold mb-2">Finalizing Shift</h3>
                    <p className="text-slate-400 text-sm text-center">Capturing history snapshot & saving data.<br/>Please do not close the app.</p>
                </div>
            )}

            {/* Order Finish Procedure Modal */}
            {orderFinishedData && (
                <div className="fixed inset-0 z-[150] bg-slate-950 flex flex-col animate-in fade-in zoom-in-95 duration-200 pt-safe-top pb-safe-bottom">
                    <div className="flex-1 overflow-y-auto p-6 pb-20">
                        <div className="flex justify-center mb-6 mt-6">
                            <div className="w-16 h-16 rounded-full bg-slate-900 border-2 border-emerald-500/20 shadow-lg flex items-center justify-center">
                                <CheckCircle className="text-emerald-500" size={32} />
                            </div>
                        </div>
                        
                        <h2 className="text-[26px] font-black text-white text-center tracking-tight mb-2">Order Finish Procedure</h2>
                        <p className="text-slate-400 text-sm text-center mb-8 font-medium">Follow the steps below to save your pick run securely</p>
                        
                        <div className="bg-slate-900/60 rounded-[28px] p-6 border border-slate-800 shadow-xl mb-8 space-y-8">
                            <div className="flex gap-4">
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">1</div>
                                <div>
                                    <h3 className="text-white font-bold text-[13px] uppercase tracking-wider mb-1.5">Review Order Performance</h3>
                                    <p className="text-slate-400 text-[13px]">Cases: <span className="text-white font-bold">{orderFinishedData.cases}</span> <span className="mx-1 text-slate-600">|</span> Speed: <span className="text-emerald-400 font-bold">{orderFinishedData.finalRate} P/H.</span></p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">2</div>
                                <div>
                                    <h3 className="text-white font-bold text-[13px] uppercase tracking-wider mb-1.5">Capture Store Labels (Optional)</h3>
                                    <p className="text-slate-500 text-[13px] leading-relaxed">Take photo of routing label slips for digital audit trails. Yes, multiple photos are supported!</p>
                                </div>
                            </div>

                            <div className="flex gap-4">
                                <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">3</div>
                                <div>
                                    <h3 className="text-white font-bold text-[13px] uppercase tracking-wider mb-1.5">Finalize & Add To History</h3>
                                    <p className="text-slate-500 text-[13px] leading-relaxed">Click <span className="text-emerald-400 font-bold">Save & Finish</span> below to record this run in your shift log.</p>
                                </div>
                            </div>
                        </div>

                        {pendingLabelImages.length > 0 && (
                            <div className="mb-4 animate-in fade-in slide-in-from-bottom-4">
                                <h4 className="text-[11px] uppercase font-bold tracking-widest text-slate-500 mb-3">Photos Captured ({pendingLabelImages.length})</h4>
                                <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
                                    {pendingLabelImages.map((img, i) => (
                                        <div key={i} className="relative w-[140px] h-[90px] rounded-2xl overflow-hidden shrink-0 border border-slate-700 bg-slate-900 group shadow-lg" onClick={() => setViewingLabels([img])}>
                                            <img src={img} className="w-full h-full object-cover" />
                                            <div className="absolute bottom-2 left-2 bg-slate-950/80 px-2.5 py-1 rounded-md text-[10px] text-white font-bold backdrop-blur-sm shadow-sm border border-white/10">Label {i + 1}</div>
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setPendingLabelImages(prev => prev.filter((_, idx) => idx !== i)); haptic('light'); }} 
                                                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/80 flex items-center justify-center text-white backdrop-blur border border-white/10 opacity-80 hover:opacity-100 transition-opacity"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="fixed bottom-0 left-0 right-0 p-5 pb-10 bg-slate-950 flex gap-4 z-10 max-w-2xl mx-auto pb-safe-bottom pt-6 border-t border-slate-900">
                        <button 
                            className="flex-1 py-4 bg-[#0ea5e9] text-white rounded-[20px] font-bold text-base flex flex-col sm:flex-row items-center justify-center gap-2 hover:bg-[#0284c7] transition-colors active:scale-95 shadow-lg shadow-[#0ea5e9]/20"
                            onClick={async () => {
                                haptic('light');
                                if (pendingLabelImages.length >= 4) {
                                    alert("Maximum of 4 pictures allowed.");
                                    return;
                                }
                                try {
                                    let dataUrl = '';
                                    let useFallback = false;
                                    try {
                                        const permissions = await CapCamera.checkPermissions();
                                        if (permissions.camera === 'granted') {
                                            const photo = await CapCamera.getPhoto({
                                                quality: 40,
                                                allowEditing: false,
                                                resultType: CameraResultType.DataUrl,
                                                source: CameraSource.Camera
                                            });
                                            dataUrl = photo.dataUrl || '';
                                        } else if (permissions.camera === 'prompt' || permissions.camera === 'denied') {
                                            const request = await CapCamera.requestPermissions();
                                            if (request.camera === 'granted') {
                                                const photo = await CapCamera.getPhoto({
                                                    quality: 40,
                                                    allowEditing: false,
                                                    resultType: CameraResultType.DataUrl,
                                                    source: CameraSource.Camera
                                                });
                                                dataUrl = photo.dataUrl || '';
                                            } else {
                                                useFallback = true;
                                            }
                                        } else {
                                            useFallback = true;
                                        }
                                    } catch (capErr) {
                                        console.warn("Capacitor camera failed or unsupported, using web fallback.", capErr);
                                        useFallback = true;
                                    }

                                    if (useFallback || !dataUrl) {
                                        dataUrl = await triggerWebCamera();
                                    }

                                    if (dataUrl) {
                                        const compressed = await compressImage(dataUrl);
                                        setPendingLabelImages(prev => [...prev, compressed]);
                                        haptic('medium');
                                    }
                                } catch (e) {
                                    alert("Failed to access camera: " + (e instanceof Error ? e.message : 'Unknown error'));
                                }
                            }}
                        >
                            <Camera size={20} /> Take Photo
                        </button>
                        <button 
                            className="flex-1 py-4 bg-emerald-500 text-white rounded-[20px] font-bold text-base flex flex-col sm:flex-row items-center justify-center gap-2 hover:bg-emerald-400 transition-colors active:scale-95 shadow-lg shadow-emerald-500/20"
                            onClick={confirmFinishPick}
                        >
                            <CheckCircle size={20} /> Save & Finish
                        </button>
                    </div>
                </div>
            )}

                {/* Shift Summary Modal */}
                {showSummary && (
                    <div id="summary-modal" className="fixed inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-[150] px-4 backdrop-blur-sm pt-safe-top pb-safe-bottom">
                            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-[340px] text-center border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                                <div className={`w-16 h-16 bg-gradient-to-br ${theme.gradient} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${theme.shadow}`}>
                                    <CheckCircle size={32} className="text-white" />
                                </div>
                                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">Shift Complete</h3>
                                <p className="text-slate-400 mb-6 text-sm">{getSummaryMessage()}</p>
                                
                                <div className="bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-800/50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Total Cases</span>
                                        <span className="text-white font-bold text-lg">{isShiftFinalized ? finalizedStats?.cases : shiftData.totalCases}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Avg Pick Rate</span>
                                        <span className={`font-bold text-lg ${(isShiftFinalized ? (finalizedStats?.rate || 0) : rate) >= targetRate ? 'text-emerald-400' : 'text-red-400'}`}>{isShiftFinalized ? finalizedStats?.rate : rate} <span className="text-xs text-slate-400 font-normal">P/H</span></span>
                                    </div>
                                    {(shiftData.firestreak || 0) > 0 && (
                                        <div className="flex justify-between items-center py-1.5 px-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <Flame size={14} className="text-orange-500 fill-orange-500" />
                                                <span className="text-orange-500 text-xs font-black uppercase tracking-widest">Firestreak</span>
                                            </div>
                                            <span className="text-white font-black text-sm">{shiftData.firestreak} SHIFTS</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-400 text-sm font-medium">Shift Time</span>
                                        <span className="text-white font-bold text-lg">{formatHHMM(isShiftFinalized ? (finalizedStats?.activeElapsedSeconds || 0) : activeElapsedSeconds)}</span>
                                    </div>
                                    {isAisles && (
                                        <div className="border border-sky-500/10 bg-sky-950/20 rounded-2xl p-3.5 space-y-2.5">
                                            <div className="flex justify-between items-center border-b border-sky-500/10 pb-2">
                                                <span className="text-sky-400 text-sm font-bold uppercase tracking-tighter flex items-center gap-1.5 font-bold">
                                                    <Sparkles size={11} className="text-sky-400" />
                                                    PWA Exemption
                                                </span>
                                                <span className="text-sky-400 font-extrabold text-lg">+{formatTime(isShiftFinalized ? (finalizedStats?.exemption || 0) : finalExemption)}</span>
                                            </div>
                                            
                                            <div className="space-y-1.5 text-slate-450 text-[10px] font-mono leading-relaxed select-none">
                                                <div className="flex justify-between">
                                                    <span>Prep (Max 10m):</span>
                                                    <span className="text-slate-200 font-bold">
                                                        +{formatTime(isShiftFinalized ? calculateAislesExemptionDetail(finalizedStats?.totalSeconds || 0).prep : accruedPrep)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Dinner (Max 30m):</span>
                                                    <span className="text-slate-200 font-bold">
                                                        +{formatTime(isShiftFinalized ? calculateAislesExemptionDetail(finalizedStats?.totalSeconds || 0).dinner : accruedDinner)}
                                                    </span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>Cleanup (Max 5m):</span>
                                                    <span className="text-slate-200 font-bold">
                                                        +{formatTime(isShiftFinalized ? calculateAislesExemptionDetail(finalizedStats?.totalSeconds || 0).cleanup : accruedCleanup)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex justify-between items-center border-t border-slate-800/50 pt-2">
                                        <span className="text-slate-400 text-sm font-medium">Break / Idle Duration</span>
                                        <div className="text-right">
                                            <div className="text-white font-bold text-lg">
                                                {formatHHMM(isShiftFinalized ? (finalizedStats?.breakSeconds || 0) : shiftData.totalExcludedTime)}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Department Breakdown */}
                                {(() => {
                                    const breakdown = getDepartmentBreakdown(shiftData.history);
                                    if (breakdown.length === 0) return null;
                                    return (
                                        <div className="border border-slate-800/80 bg-slate-950/40 rounded-2xl p-3.5 space-y-2.5 text-left mb-6 max-h-[165px] overflow-y-auto custom-scrollbar">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/60 pb-1.5 flex justify-between items-center">
                                                <span>Department Summary</span>
                                                <span className="text-[8px] font-bold text-sky-400 font-mono">MULTI-DEPOT</span>
                                            </h4>
                                            <div className="space-y-2.5">
                                                {breakdown.map((item: any) => {
                                                    const isAbove = item.rate >= item.targetRate;
                                                    const netSec = item.netSeconds || 0;
                                                    const isNetGood = netSec >= 0;
                                                    const netFormatted = `${isNetGood ? '+' : '-'}${formatTime(Math.abs(netSec))}`;
                                                    return (
                                                        <div key={item.department} className="flex justify-between items-center text-xs">
                                                            <div>
                                                                <span className="text-white font-bold">{item.departmentName}</span>
                                                                <span className="text-slate-500 text-[9px] block">
                                                                    {item.picksCount} {item.picksCount === 1 ? 'order' : 'orders'} • target {item.targetRate}
                                                                </span>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <span className={`font-black ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                        {item.rate} <span className="text-[9px] font-normal text-slate-400">P/H</span>
                                                                    </span>
                                                                    <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${isNetGood ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                                        {netFormatted}
                                                                    </span>
                                                                </div>
                                                                <span className="text-slate-300 font-mono text-[9px] block">
                                                                    {item.cases} {item.cases === 1 ? 'case' : 'cases'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })()}

                                <div className="mb-6 text-left">
                                    <label className="block text-slate-400 text-xs font-medium uppercase mb-2">Shift Notes / Reminders</label>
                                    <textarea 
                                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 min-h-[80px] focus:min-h-[140px] transition-all duration-300"
                                        placeholder="Type any scratch notes, drop lane hints, or shift reminders here..."
                                        value={shiftData.operatorNote || shiftNotes}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateShiftData({ operatorNote: val });
                                            setShiftNotes(val);
                                            localStorage.setItem('draft_operatorNote', val);
                                        }}
                                    />
                                </div>

                                <div className="sticky bottom-0 bg-slate-900 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                                    <button 
                                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                                        onClick={async () => {
                                            haptic('light');
                                            
                                            // Make sure we have the rate calculation for summary
                                            const totalActiveMinutes = shiftData.totalSteps ? shiftData.totalSteps * 3 : 0;
                                            const totalCases = isShiftFinalized ? (finalizedStats?.totalCases || shiftData.totalCases) : shiftData.totalCases;
                                            
                                            // The share text
                                            const shareText = `Shift Update: Picked ${totalCases} cases today on PickApp!`;
                                            
                                            const dataUrl = await takeScreenshot();
                                            if (dataUrl) {
                                                // Prepare file download
                                                const link = document.createElement('a');
                                                link.href = dataUrl;
                                                link.download = `shift_summary_${new Date().toISOString()}.jpg`;
                                                
                                                try {
                                                    await navigator.clipboard.writeText(shareText);
                                                    
                                                    // Web Share API if supported
                                                    if (navigator.share) {
                                                        const blob = await (await fetch(dataUrl)).blob();
                                                        const file = new File([blob], 'pickapp_summary.jpg', { type: 'image/jpeg' });
                                                        
                                                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                                            await navigator.share({
                                                                title: 'My Shift Summary',
                                                                text: shareText,
                                                                files: [file]
                                                            });
                                                            return; // Skip download if successfully shared
                                                        }
                                                    }
                                                } catch (e) {
                                                    // AbortError is thrown if user canceled the share dialog
                                                    if ((e as Error).name === 'AbortError') return;
                                                    // Share failure.
                                                }
                                                
                                                // Fallback to basic download if share isn't supported or failed
                                                link.click();
                                                alert("Screenshot saved & summary copied to clipboard!");
                                            }
                                        }}
                                    >
                                        <Share size={16} /> Share & Save
                                    </button>
                                    <button 
                                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                                        onClick={() => downloadReport()}
                                    >
                                        <Download size={16} /> Report
                                    </button>
                                    <button 
                                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                                        onClick={async () => {
                                            haptic('light');
                                            const dataToUse = isShiftFinalized && finalizedStats ? finalizedStats : {
                                                rate,
                                                activeElapsedSeconds,
                                                cases: shiftData.totalCases
                                            };
                                            const reportTxt = `PickApp Shift: ${dataToUse.cases || shiftData.totalCases} cases at ${dataToUse.rate} P/H. Steps: ${shiftData.steps}.`;
                                            try {
                                                await navigator.clipboard.writeText(reportTxt);
                                                alert("Summary copied!");
                                            } catch (e) {
                                                alert("Copy failed.");
                                            }
                                        }}
                                    >
                                        <FileText size={16} /> Copy
                                    </button>
                                    <button 
                                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors min-w-[80px]"
                                        onClick={() => { haptic('light'); setShowSummary(false); }}
                                    >
                                        Review
                                    </button>
                                    <button 
                                        type="button"
                                        className={`flex-1 py-3.5 text-white rounded-2xl font-semibold tracking-wide transition-all shadow-lg bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20 min-w-[100px]`}
                                        onClick={endShift}
                                    >
                                        FINISH & EXIT
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Case Count Unlock / Edit Modal */}
                    {isUnlockingCaseCount && (
                        <div className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[200] px-6 backdrop-blur-md">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                className="bg-slate-900 p-8 rounded-[32px] w-full max-w-sm border border-slate-800 shadow-2xl relative overflow-hidden"
                            >
                                {/* Decorative background */}
                                <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full ${isEditingCaseCount ? 'bg-purple-500/20' : 'bg-amber-500/10'}`} />
                                
                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isEditingCaseCount ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {isEditingCaseCount ? <Box size={24} /> : <ShieldAlert size={24} />}
                                        </div>
                                        <button 
                                            onClick={() => { setIsUnlockingCaseCount(false); setIsEditingCaseCount(false); haptic('light'); }}
                                            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-500"
                                        >
                                            <X size={20} />
                                        </button>
                                    </div>

                                    {!isEditingCaseCount ? (
                                        <>
                                            <h3 className="text-white text-2xl font-black mb-2 tracking-tight">Security Check</h3>
                                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">Please enter your password to unlock order modifications.</p>
                                            
                                            <div className="space-y-4">
                                                <div className="relative">
                                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                                    <input 
                                                        type="password"
                                                        value={unlockPin}
                                                        onChange={(e) => setUnlockPin(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyUnlock()}
                                                        placeholder="••••••"
                                                        className={`w-full bg-slate-950 border ${unlockError ? 'border-red-500/50' : 'border-slate-800'} p-4 pl-12 rounded-2xl text-white outline-none focus:border-amber-500/50 transition-all font-black tracking-widest`}
                                                        autoFocus
                                                    />
                                                </div>

                                                {unlockError && (
                                                    <p className="text-red-400 text-xs font-bold px-2">{unlockError}</p>
                                                )}

                                                <button 
                                                    onClick={handleVerifyUnlock}
                                                    className="w-full py-4 bg-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                                >
                                                    UNLOCK <ChevronRight size={18} />
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <h3 className="text-purple-400 text-2xl font-black mb-2 tracking-tight">Modify Order</h3>
                                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">Update the case count for the active pick. This will be marked as a manual correction.</p>
                                            
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">New Case Count</label>
                                                    <div className="relative">
                                                        <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                                        <input 
                                                            type="number"
                                                            inputMode="numeric"
                                                            value={tempCaseCount}
                                                            onChange={(e) => setTempCaseCount(e.target.value)}
                                                            placeholder="0"
                                                            className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-purple-500/50 transition-all font-black"
                                                            autoFocus
                                                        />
                                                    </div>
                                                </div>

                                                <button 
                                                    onClick={handleSaveModifiedCaseCount}
                                                    className="w-full py-4 bg-purple-500 text-white font-black rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                                >
                                                    SAVE CORRECTION <CheckCircle size={18} />
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </motion.div>
                        </div>
                    )}

                    {/* Confirm Dialog Overlay */}
                    {confirmDialog && (
                        <div className="fixed inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-[500] px-4 backdrop-blur-sm">
                            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-[320px] text-center border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
                                <h3 className="text-white text-xl font-bold mb-2 tracking-tight">{confirmDialog.title}</h3>
                                <p className="text-slate-400 mb-8 text-sm">{confirmDialog.message}</p>
                                <div className="flex gap-3">
                                    {!confirmDialog.isAlert && (
                                        <button 
                                            className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors"
                                            onClick={() => { haptic('light'); confirmDialog.onCancel(); setConfirmDialog(null); }}
                                        >
                                            Cancel
                                        </button>
                                    )}
                                    <button 
                                        className={`flex-1 py-3.5 text-white rounded-2xl font-semibold tracking-wide transition-colors shadow-lg ${confirmDialog.title.includes('Clear') || confirmDialog.title.includes('Reset') ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' : `${theme.bg} ${theme.bgHover} ${theme.shadow}`}`}
                                        onClick={() => { haptic('medium'); confirmDialog.onConfirm(); setConfirmDialog(null); }}
                                    >
                                        {confirmDialog.isAlert ? 'OK' : 'Confirm'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Install Tutorial Overlay */}
                    {showInstallTutorial && (
                        <AnimatePresence>
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95, y: 50 }} 
                                animate={{ opacity: 1, scale: 1, y: 0 }} 
                                exit={{ opacity: 0, scale: 0.95, y: 50 }}
                                className="fixed bottom-6 left-0 right-0 z-[200] mx-4 pointer-events-auto"
                            >
                                <div className={`${theme.bg} rounded-3xl p-5 shadow-2xl relative border border-white/10 overflow-hidden`}>
                                    <button 
                                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                                        onClick={() => {
                                            haptic('light');
                                            localStorage.setItem('hideInstallTutorial', 'true');
                                            setShowInstallTutorial(false);
                                        }}
                                    >
                                        <X size={20} />
                                    </button>
                                    
                                    <div className="flex gap-4 items-center mb-4 pr-6">
                                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                                            <Download className="text-white" size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-white font-bold text-lg leading-tight">Install PickApp</h3>
                                            <p className="text-white/70 text-xs">Add to home screen for the full app experience</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4">
                                        {/* iOS Instructions */}
                                        <div className="bg-black/20 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white uppercase">iOS / Safari</div>
                                            </div>
                                            <ol className="text-sm text-white/80 space-y-2 ml-1">
                                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">1</span> Tap the <Share2 size={16} className="inline mx-1" /> Share button</li>
                                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">2</span> Scroll and select <span className="font-semibold bg-white/10 px-1.5 rounded inline-flex items-center gap-1"><PlusSquare size={12} /> Add to Home Screen</span></li>
                                            </ol>
                                        </div>
                                        
                                        {/* Android Instructions */}
                                        <div className="bg-black/20 rounded-2xl p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white uppercase">Android / Chrome</div>
                                            </div>
                                            <ol className="text-sm text-white/80 space-y-2 ml-1">
                                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">1</span> Tap the <MoreVertical size={16} className="inline mx-1" /> Menu button</li>
                                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">2</span> Select <span className="font-semibold bg-white/10 px-1.5 rounded">Install app</span> or <span className="font-semibold bg-white/10 px-1.5 rounded">Add to Home screen</span></li>
                                            </ol>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        className="w-full mt-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all active:scale-95"
                                        onClick={() => {
                                            haptic('medium');
                                            localStorage.setItem('hideInstallTutorial', 'true');
                                            setShowInstallTutorial(false);
                                        }}
                                    >
                                        I Understand
                                    </button>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    )}

            {/* About PickApp Section */}
            <AboutPickApp isOpen={showAbout} onClose={() => setShowAbout(false)} />
            <AboutDeveloper isOpen={showAboutDeveloper} onClose={() => setShowAboutDeveloper(false)} />
            <InviteModal isOpen={showInviteModal} onClose={() => setShowInviteModal(false)} />
            <BetaSurveyModal 
                isOpen={showBetaSurvey}
                onClose={() => setShowBetaSurvey(false)}
                username={getCleanName()}
                department={currentDept?.name || shiftData.department}
                zone={shiftData.zone}
                onSuccess={() => {
                    showToast("Operational feedback recorded. Thank you!", "success");
                }}
            />
            <MonthlyReportNotificationModal
                isOpen={monthlyReportNotif.isOpen}
                onClose={() => setMonthlyReportNotif(prev => ({ ...prev, isOpen: false }))}
                monthName={monthlyReportNotif.monthName}
                reportKey={monthlyReportNotif.reportKey}
                warehouseId={currentWarehouseId}
                onSuccess={() => {
                    showToast("Executive Monthly PDF Report Downloaded!", "success");
                }}
            />

            <VoiceAssistant 
                isActive={shiftData.voiceEnabled} 
                onToggle={toggleVoice}
                onCommand={handleVoiceCommand}
                announcementProp={announcement}
                customImage={shiftData.assistantImage}
            />

            {/* PERSISTENT INDUSTRIAL STATUS BAR */}
            <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 px-4 py-1.5 flex justify-between items-center z-[110] select-none pointer-events-none backdrop-blur-md bg-opacity-90">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-mono">SYSTEM_OK</span>
                    </div>
                    <div className="h-3 w-[1px] bg-slate-800"></div>
                    <div className="flex items-center gap-1.5">
                        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono">ERR: 0</span>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {failedUploads.length > 0 && !isOffline && (
                        <div className="flex items-center gap-2 animate-pulse">
                            <RefreshCcw size={10} className="text-sky-400 animate-spin" />
                            <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest font-mono">LOCAL_SYNC_ACTIVE</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <Database size={10} className="text-slate-600" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] font-mono">V{APP_VERSION}</span>
                    </div>
                </div>
            </div>
            
            {/* Global Forensic Notification Toast Overlay */}
            <div className="fixed top-safe-top left-0 right-0 z-[1000] pointer-events-none p-4 flex flex-col items-center gap-2">
                <AnimatePresence>
                    {toast && (
                        <motion.div
                            initial={{ opacity: 0, y: -20, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            className={`px-4 py-2.5 rounded-2xl shadow-2xl backdrop-blur-md border ${
                                toast.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' :
                                toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' :
                                'bg-slate-800/90 border-slate-700 text-white'
                            } text-sm font-black tracking-tight pointer-events-auto flex items-center gap-3`}
                        >
                            {toast.type === 'error' && <AlertCircle size={16} />}
                            {toast.type === 'success' && <CheckCircle size={16} />}
                            {toast.message}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
