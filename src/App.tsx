// Version: 1.7.0-INDUSTRIAL-WMS
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
    DBStorageStats, deleteUser, saveBetaFeedback, subscribeToLeaderboard, subscribeToLiveUsers,
    sendSocialInteraction, handleFirestoreError, OperationType
} from './services/leaderboardService';
import { 
    getLocalRota, saveLocalRota, getAllLocalItems, STORES, migrateLocalStorageToIndexedDB, 
    saveLocalActiveShift, saveLocalNotification, getLocalNotifications, 
    markNotificationAsRead, markAllNotificationsAsRead, clearLocalNotifications,
    deleteLocalNotification
} from './services/indexedDbService';
import { compressImage } from './lib/imageCompressor';
import { deviceHaptic, deviceExport, saveImageToDevice } from './lib/deviceApi';
import { checkUpdate, openDownloadLink, AppVersionInfo, isNewer } from './lib/VersionManager';
import { PreviousMonthSummary } from './components/leaderboard/PreviousMonthSummary';
import { shouldPromptBetaSurvey } from './services/betaSurveyService';
import { BreakPolicyModal } from './components/modals/BreakPolicyModal';
import { checkMonthlyReportNotification } from './services/monthlyReportService';
import { shiftDataService } from './services/shiftDataService';
import { shiftCacheService } from './services/shiftCacheService';
import { generateFullShiftReport, copyFullShiftReport, restoreShiftFromReportText } from './services/shiftReportService';
import { formatTime, formatHHMM, formatHHMMSS, hoursToHHMM } from './utils/formatUtils';
import { CapCamera, CameraResultType, CameraSource, Preferences } from './lib/capacitorMocks';
import { triggerWebCamera } from './utils/webCamera';
import { getDeptName, resolveDepartmentInfo } from './utils/deptUtils';
import { getDepartmentBreakdown, isBreakEntry, isNoteEntry, isPickEntry } from './utils/statsUtils';
import { generateShiftCode } from './lib/shiftCodeUtils';

// New Modular Architecture
import { OnboardingModal } from './components/OnboardingModal';
import { PickingDashboardMain } from './components/PickingDashboardMain';
import { 
    AppModalsContainer,
    SettingsModal,
    HistoryLeaderboardOverlays,
    MandatoryUpdateOverlay,
    MandatoryBetaFeedbackOverlay
} from './components/modals';
import { ItalianCoachModal } from './components/modals/ItalianCoachModal';
import { isWorkHeadsetPhrase } from './constants/italianLessons';
import { ShiftData, ThemeColors, LeaderboardEntry, UserRole, UserProfile, WarehouseSettings, ShiftNotification, InteractionType } from './types';
import { THEMES, SKIN_REQUIREMENTS } from './constants/themes';
import { USERS, DEPT_LANES, DEPARTMENTS, ACHIEVEMENT_DATA, DUO_MESSAGES, getUserHomeDepartment } from './constants/data';
import { usePerformanceStats, useDeviceMotion, useWakeLock } from './hooks';
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
import { initRemoteConfig, WarehouseRemoteConfig } from './services/remoteConfigService';
import { uploadShiftReceiptToCloud, uploadLabelImageToCloud } from './services/cloudStorageService';
import { BroadcastBanner } from './components/BroadcastBanner';
import { voiceService } from './services/voiceService';



// Utility functions moved to src/utils/formatUtils.ts and src/utils/deptUtils.ts and src/utils/statsUtils.ts

// Utility functions relocated above
import { APP_VERSION } from './constants/version';
import { LeaderboardInteractions } from './components/leaderboard/LeaderboardInteractions';
import { InteractionToast } from './components/leaderboard/InteractionToast';
import { subscribeToIncomingInteractions } from './services/leaderboardService';
import { SocialInteraction } from './types';
import { useAppUI } from './contexts/AppUIContext';
import { useAuth } from './contexts/AuthContext';
import { useShiftData, safeLocalStorage, DASERGHIE_ROTA, defaultShiftData, processLoadedData } from './contexts/ShiftDataContext';

export default function App() {
    const { 
        showSettings, setShowSettings, 
        showSummary, setShowSummary, 
        showHistory, setShowHistory, 
        showRota, setShowRota, 
        showRestoreModal, setShowRestoreModal,
        showInstallTutorial, setShowInstallTutorial,
        showLeaderboard, setShowLeaderboard,
        showInviteModal, setShowInviteModal,
        showNotificationHub, setShowNotificationHub,
        showClockInModal, setShowClockInModal,
        showBetaSurvey, setShowBetaSurvey,
        toast, showToast
    } = useAppUI();

    const {
        isAuthenticated, setIsAuthenticated,
        username, setUsername,
        password, setPassword,
        loginError, setLoginError,
        userProfile, setUserProfile,
        sessionId,
        hasConsented, setHasConsented,
        firebaseUser, setFirebaseUser
    } = useAuth();

    const [updating, setUpdating] = useState(false);
    const [showItalianCoach, setShowItalianCoach] = useState(false);
    const [showCelebration, setShowCelebration] = useState(false);
    const [celebrationTitle, setCelebrationTitle] = useState('TARGET SMASHED!');
    const [celebrationSubtitle, setCelebrationSubtitle] = useState('You are absolute machine!');
    const [backgroundNotice, setBackgroundNotice] = useState<{show: boolean, msg: string} | null>(null);
    const [isUnlockingCaseCount, setIsUnlockingCaseCount] = useState(false);
    const [isEditingCaseCount, setIsEditingCaseCount] = useState(false);
    const [unlockPin, setUnlockPin] = useState('');
    const [unlockError, setUnlockError] = useState('');
    const [tempCaseCount, setTempCaseCount] = useState('');

    const [activeInteraction, setActiveInteraction] = useState<SocialInteraction | null>(null);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            const msg = event.error?.message || event.message || '';
            if (msg.includes('ResizeObserver') || msg.includes('Script error')) {
                return;
            }
            console.warn("UI Warning caught:", event.error || event.message);
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason;
            const message = reason?.message || String(reason || '');
            const isBenign = 
                message.includes('AbortError') ||
                message.includes('aborted') ||
                message.includes('cancelled') ||
                message.includes('canceled') ||
                message.includes('not supported') ||
                message.includes('permission') ||
                message.includes('quota') ||
                message.includes('QuotaExceeded') ||
                message.includes('Failed to fetch') ||
                message.includes('Load failed') ||
                message.includes('network-request-failed') ||
                message.includes('unavailable') ||
                message.includes('timeout') ||
                message.includes('offline');

            if (isBenign) {
                console.warn("Handled promise rejection (offline/benign):", reason);
                return;
            }

            console.warn("Background task interrupted:", reason);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [showToast]);

    const isUserAdmin = () => {
        if (userProfile?.role === UserRole.ADMIN) return true;
        const currentName = (shiftData?.operator || username || localStorage.getItem('lastUser') || '').toUpperCase().trim();
        return currentName === 'ADMIN' || currentName === 'DASERGHIE' || firebaseUser?.email === 'SERGHIE.DANIEL@gmail.com';
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

    const [showBreakPolicy, setShowBreakPolicy] = useState(() => {
        return localStorage.getItem('pickapp_break_policy_acknowledged') !== 'true';
    });

    const closeBreakPolicy = () => {
        localStorage.setItem('pickapp_break_policy_acknowledged', 'true');
        setShowBreakPolicy(false);
    };

    // Render logic (I will add this to the render section of App)
    // <BreakPolicyModal isOpen={showBreakPolicy} onClose={closeBreakPolicy} />
    

    const { 
        shiftData, setShiftData, 
        caseCount, setCaseCount, 
        lane1, setLane1, 
        lane2, setLane2, 
        lane3, setLane3, 
        lane4, setLane4, 
        shiftNotes, setShiftNotes 
    } = useShiftData();

    const [currentWarehouseId, setCurrentWarehouseId] = useState('MAIN');
    const [warehouseConfig, setWarehouseConfig] = useState<WarehouseSettings | null>(null);
    const [remoteConfig, setRemoteConfig] = useState<WarehouseRemoteConfig | null>(null);
    const [floorBroadcast, setFloorBroadcast] = useState<string>('');

    useEffect(() => {
        // Fetch Remote Config parameters from Firebase
        initRemoteConfig().then((cfg) => {
            setRemoteConfig(cfg);
            if (cfg.broadcastBanner) {
                setFloorBroadcast(cfg.broadcastBanner);
            }
        }).catch((err) => {
            console.warn('RemoteConfig initialization failed:', err);
        });
    }, []);

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
    
    const [isSavingShift, setIsSavingShift] = useState(false);
    const [pendingStoreLabel, setPendingStoreLabel] = useState("");
    const [pendingLabelImages, setPendingLabelImages] = useState<string[]>([]);
    const [pendingStoreLabels, setPendingStoreLabels] = useState<string[]>([]);
    const [viewingLabels, setViewingLabels] = useState<string[] | null>(null);
    const [orderFinishedData, setOrderFinishedData] = useState<any | null>(() => {
        const lastUser = localStorage.getItem('lastUser') || 'default';
        const saved = localStorage.getItem(`pending_order_${lastUser}`);
        return saved ? JSON.parse(saved) : null;
    });
    const [settingsTab, setSettingsTab] = useState<'ops' | 'rate' | 'ui' | 'updates' | 'data' | 'vault' | 'coach'>('ops');
    const [newUserName, setNewUserName] = useState('');
    const [newUserPin, setNewUserPin] = useState('');
    const [adminUsersDb, setAdminUsersDb] = useState<any[] | null>(null);
    const [adminTargetRate, setAdminTargetRate] = useState('');
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
    const [restoreText, setRestoreText] = useState('');
    const [restoreStatus, setRestoreStatus] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
    const [leaderboardTab, setLeaderboardTab] = useState<'live' | 'prev_month'>('live');
    const [allShiftSummariesList, setAllShiftSummariesList] = useState<ShiftSummary[]>([]);
    const [fetchingMonthlyLeaderboard, setFetchingMonthlyLeaderboard] = useState(false);
    
    const [dbStorageStats, setDbStorageStats] = useState<DBStorageStats | null>(null);
    const [loadingDbStats, setLoadingDbStats] = useState(false);
    const [dbStatsError, setDbStatsError] = useState<string | null>(null);
    const [reclaimingSpace, setReclaimingSpace] = useState(false);
    const [spaceReclaimMsg, setSpaceReclaimMsg] = useState<string | null>(null);
    const [inactivityNotifsOn, setInactivityNotifsOn] = useState(() => areInactivityNotifsEnabled());
    const [monthlyReportNotif, setMonthlyReportNotif] = useState<{ isOpen: boolean; monthName: string; reportKey: string }>({
        isOpen: false,
        monthName: '',
        reportKey: ''
    });

    // Shift Notification Hub State
    const [shiftNotifications, setShiftNotifications] = useState<ShiftNotification[]>([]);

    const unreadNotificationsCount = useMemo(() => {
        return shiftNotifications.filter(n => !n.isRead).length;
    }, [shiftNotifications]);

    // Load persisted shift notifications from IndexedDB for the current user
    const loadShiftNotifications = useCallback(async (userName: string) => {
        if (!userName) return;
        try {
            let list = await getLocalNotifications(userName);
            if (!list || list.length === 0) {
                const safeName = userName.toUpperCase().trim();
                const defaultNotifs: ShiftNotification[] = [
                    {
                        id: `init_shift_${Date.now()}_1`,
                        operator: safeName,
                        category: 'milestone',
                        title: '⚡ Shift Engine Active',
                        message: 'Precision picking session active. Warehouse target rate: 200 P/H.',
                        timestamp: Date.now() - 300000,
                        isRead: false
                    },
                    {
                        id: `init_bots_${Date.now()}_2`,
                        operator: safeName,
                        category: 'peer',
                        title: '🤖 Live Benchmark Bots Active',
                        message: 'HyperBot and ApexRobo are live on the floor in Ambient Aisles.',
                        timestamp: Date.now() - 120000,
                        isRead: false
                    }
                ];
                for (const notif of defaultNotifs) {
                    try { await saveLocalNotification(notif); } catch(e) {}
                }
                list = defaultNotifs;
            }
            setShiftNotifications(list || []);
        } catch (err) {
            console.warn('Failed to load notifications from IndexedDB:', err);
        }
    }, []);

    const addShiftNotification = useCallback(async (notif: Omit<ShiftNotification, 'id' | 'timestamp' | 'isRead'> & { id?: string; timestamp?: number; isRead?: boolean }) => {
        const fullNotif: ShiftNotification = {
            id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            operator: notif.operator || shiftData.operator || 'DEFAULT',
            category: notif.category,
            title: notif.title,
            message: notif.message,
            timestamp: notif.timestamp || Date.now(),
            isRead: notif.isRead ?? false,
            interactionType: notif.interactionType,
            senderName: notif.senderName,
            data: notif.data
        };

        setShiftNotifications(prev => [fullNotif, ...prev.filter(p => p.id !== fullNotif.id)]);
        try {
            await saveLocalNotification(fullNotif);
        } catch (e) {
            console.warn('Failed to save notification to IndexedDB:', e);
        }
    }, [shiftData.operator]);

    const handleMarkNotificationAsRead = useCallback(async (id: string) => {
        setShiftNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        try {
            await markNotificationAsRead(id);
        } catch (e) {}
    }, []);

    const handleMarkAllNotificationsAsRead = useCallback(async () => {
        const op = shiftData.operator || userProfile?.username || 'DEFAULT';
        setShiftNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        try {
            await markAllNotificationsAsRead(op);
        } catch (e) {}
    }, [shiftData.operator, userProfile?.username]);

    const handleClearAllNotifications = useCallback(async () => {
        const op = shiftData.operator || userProfile?.username || 'DEFAULT';
        setShiftNotifications([]);
        try {
            await clearLocalNotifications(op);
            showToast("Notification history cleared", "info");
        } catch (e) {}
    }, [shiftData.operator, userProfile?.username, showToast]);

    const handleDeleteNotification = useCallback(async (id: string) => {
        setShiftNotifications(prev => prev.filter(n => n.id !== id));
        try {
            await deleteLocalNotification(id);
            showToast("Notification removed", "info");
        } catch (e) {
            console.warn('Failed to delete notification from IndexedDB:', e);
        }
    }, [showToast]);

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

                    // Sync Firestore profile, home department, and rota into local state
                    const homeDept = getUserHomeDepartment(userUpper, p);
                    setShiftData((prev: any) => {
                        const isActivelyPicking = Boolean(prev.isPicking);
                        const shouldApplyHomeDept = !isActivelyPicking && (!prev.history || prev.history.length === 0 || prev.isShiftFinalized || !prev.department);
                        const nextDept = shouldApplyHomeDept ? homeDept.department : (prev.department || homeDept.department);
                        const nextZone = shouldApplyHomeDept ? homeDept.zone : (prev.zone || homeDept.zone);

                        const nextOverrides = { ...(prev.rotaOverrides || {}), ...(p.rotaOverrides || {}) };
                        const nextConfig = p.rotaConfig ? { ...prev.rotaConfig, ...p.rotaConfig } : prev.rotaConfig;
                        const updated = {
                            ...prev,
                            department: nextDept,
                            zone: nextZone,
                            rotaConfig: nextConfig,
                            rotaOverrides: nextOverrides
                        };
                        const opName = (prev.operator || localStorage.getItem('lastUser') || 'default').toUpperCase().trim();
                        safeLocalStorage.setItem(`pickData_${opName}`, JSON.stringify(updated), true);
                        saveLocalRota(opName, nextConfig, nextOverrides);
                        return updated;
                    });
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
                    }).catch(err => console.warn('Auto-provision user profile save error:', err));
                }
            }).catch(err => console.warn('Initial getUserProfile load error:', err));
        }
    }, [isAuthenticated]);

    // UI REORGANIZATION STATE
    const [activeScreen, setActiveScreen] = useState(0); // 0: Picking, 1: Performance

    const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
    const [liveUsers, setLiveUsers] = useState<any[]>([]);
    const [shiftSummaries, setShiftSummaries] = useState<ShiftSummary[]>([]);
    const [adminAllSummaries, setAdminAllSummaries] = useState<ShiftSummary[]>([]);
    const [manualClockType, setManualClockType] = useState<'in' | 'out' | 'pick_start'>('in');
    
    const [isAppBlocked, setIsAppBlocked] = useState(false);
    const [minAllowedVersion, setMinAllowedVersion] = useState('');
    const [consentUpdate, setConsentUpdate] = useState(false);
    
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
        const opName = (shiftData.operator || userProfile?.username || localStorage.getItem('lastUser') || '').toUpperCase().trim();
        const isCurrentAdmin = opName === 'ADMIN' || userProfile?.role === 'admin';

        const localKey = `offline_summaries_${opName || 'DEFAULT'}`;
        let localSaved: any[] = [];
        try {
            const existing = localStorage.getItem(localKey);
            if (existing) {
                localSaved = JSON.parse(existing);
            }
        } catch(e) {}

        const matchesOperator = (item: any) => {
            if (!item) return false;
            if (isCurrentAdmin) return true;
            const itemUser = (item.userName || item.operator || item.user || '').toUpperCase().trim();
            if (!opName) return true;
            if (itemUser === opName) return true;
            if (firebaseUser?.uid && item.userId === firebaseUser.uid) return true;
            return false;
        };

        const combinedRemote = [...shiftSummaries, ...adminAllSummaries];
        const uniqueRemote = new Map<string, any>();
        combinedRemote.forEach(item => {
            const key = item.id || (item.clockInTime ? `${item.userName || item.operator}_${item.clockInTime}` : `${item.userName || item.operator}_${item.date}`);
            if (!uniqueRemote.has(key)) {
                uniqueRemote.set(key, item);
            }
        });

        const all = Array.from(uniqueRemote.values()).filter(matchesOperator);
        localSaved.forEach((localItem: any) => {
            if (!matchesOperator(localItem)) return;
            
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

        // Deduplication & Selection of Best Record per normalized date
        const dateRawGroups: { [key: string]: any[] } = {};
        combined.forEach(item => {
            const normDate = normalizeDateStr(item.date) || (item.clockInTime ? getLocalDateString(new Date(item.clockInTime)) : '');
            if (!normDate || normDate.toLowerCase().includes('invalid')) return;
            if (!dateRawGroups[normDate]) {
                dateRawGroups[normDate] = [];
            }
            dateRawGroups[normDate].push(item);
        });

        const dateGroups: { [key: string]: any } = {};
        Object.entries(dateRawGroups).forEach(([normDate, items]) => {
            // Sort items to find the single best master shift:
            // 1. Prefer items with larger history log count (fully completed shift)
            // 2. Prefer non-anonymous/named operators
            // 3. Prefer larger case counts
            const sortedItems = [...items].sort((a, b) => {
                const aHistLen = Array.isArray(a.history) ? a.history.length : 0;
                const bHistLen = Array.isArray(b.history) ? b.history.length : 0;
                if (aHistLen !== bHistLen) return bHistLen - aHistLen;

                const aIsAnon = !a.userId || a.userId.startsWith('anon_') || a.id?.startsWith('anon_') || (a.operator || '').toUpperCase().startsWith('ANON');
                const bIsAnon = !b.userId || b.userId.startsWith('anon_') || b.id?.startsWith('anon_') || (b.operator || '').toUpperCase().startsWith('ANON');
                if (aIsAnon !== bIsAnon) return aIsAnon ? 1 : -1;

                const aCases = a.totalCases || a.cases || 0;
                const bCases = b.totalCases || b.cases || 0;
                return bCases - aCases;
            });

            const bestItem = sortedItems[0];
            const initHist = bestItem.history || [];
            
            // Build the sanitized store labels and images lists from the master shift
            const labelsSet = new Set<string>();
            if (bestItem.storeLabel) {
                bestItem.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
            }
            initHist.forEach((h: any) => {
                if (h.storeLabel) {
                    h.storeLabel.split(',').forEach((l: string) => { if (l.trim()) labelsSet.add(l.trim().toUpperCase()); });
                }
            });

            const imgSet = new Set<string>();
            if (bestItem.labelImage) imgSet.add(bestItem.labelImage);
            if (Array.isArray(bestItem.labelImages)) bestItem.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
            initHist.forEach((h: any) => {
                if (h.labelImage) imgSet.add(h.labelImage);
                if (Array.isArray(h.labelImages)) h.labelImages.forEach((img: string) => { if (img) imgSet.add(img); });
            });

            const totalCases = bestItem.totalCases || bestItem.cases || 0;
            const activeSeconds = bestItem.activeSeconds || 0;
            const totalSeconds = bestItem.totalSeconds || bestItem.activeSeconds || 0;

            dateGroups[normDate] = { 
                ...bestItem, 
                date: normDate,
                totalCases,
                activeSeconds,
                totalSeconds,
                storeLabel: Array.from(labelsSet).join(', '),
                labelImage: bestItem.labelImage || (Array.from(imgSet)[0] || ''),
                labelImages: Array.from(imgSet),
                history: initHist,
                finalRate: activeSeconds > 0 
                    ? Math.round((totalCases / activeSeconds) * 3600) 
                    : (bestItem.finalRate || 0)
            };
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
        finalExemption, isAisles, accruedClockOut, accruedDinner, accruedPostDinner,
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

    const handleSetDayOverride = useCallback((overrideType: 'work' | 'holiday' | 'sick' | 'off' | 'reset') => {
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
    }, [selectedFutureDate, shiftData.operator, shiftData.rotaConfig, userProfile, announce]);

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

        





    const [confirmDialog, setConfirmDialog] = useState<{title: string, message: string, isAlert?: boolean, onConfirm: () => void, onCancel: () => void} | null>(null);

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
            }).catch(err => console.warn('Load warehouse settings error:', err));
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
                        customStatus: shiftData.customStatus || ""
                    }
                );
            };
            
            sendUpdate();
            
            // Restore 30s heartbeat to ensure users remain visible in live feed
            const heartbeatInterval = setInterval(sendUpdate, 30000);
            return () => clearInterval(heartbeatInterval);
        } else if (isShiftFinalized && shiftData.operator) {
            updateLiveStatus(shiftData.operator, rateRef.current, currentDept?.name || 'UNKNOWN', false, {
                totalCases: totalCasesRef.current,
                activeSeconds: activeElapsedSecondsRef.current,
                steps: shiftData.steps,
                xp: shiftData.xp,
                status: 'finished'
            });
        }
    }, [isPicking, isOnBreak, isShiftFinalized, shiftData.firstStartTime, shiftData.operator, shiftData.department, shiftData.customStatus]);
    useEffect(() => {
        const today = getLocalDateString(new Date());
        
        // Auto-Reset logic: if lastDate was a different day AND the shift was not finalized
        // OR it's been more than 12 hours since lastStopTimestamp, reset to start fresh.
        if (shiftData.lastDate && shiftData.lastDate !== today) {
            const lastActive = shiftData.lastStopTimestamp || (shiftData.firstStartTime || 0);
            const hoursSinceActive = (now.getTime() - lastActive) / (1000 * 3600);
            
            // Only reset if inactive for over 20 hours or if no active shift was started
            if (hoursSinceActive > 20 || (!shiftData.firstStartTime && hoursSinceActive > 8)) {
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
    const { wakeLockError } = useWakeLock(shiftData.wakeLock || false, isAuthenticated);
    const isInIframe = useMemo(() => {
        try {
            return window.self !== window.top;
        } catch (e) {
            return true;
        }
    }, []);

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

        // Immediate synchronous crash recovery backup if shift is in progress
        if (shiftData.firstStartTime && !shiftData.isShiftFinalized) {
            const opKey = shiftData.operator ? shiftData.operator.toUpperCase().trim() : 'DEFAULT';
            safeLocalStorage.setItem(`ACTIVE_SHIFT_CRASH_BACKUP_${opKey}`, rawJson, true);
            safeLocalStorage.setItem('ACTIVE_SHIFT_CRASH_BACKUP', rawJson, true);
        }

        // Debounce storage writes by 3 seconds to protect mobile devices from high-frequency bridge overhead and disk lag
        const handler = setTimeout(() => {
            if (shiftData.operator) {
                safeLocalStorage.setItem(`pickData_${shiftData.operator}`, rawJson, true);
                safeLocalStorage.setItem('lastUser', shiftData.operator);
                saveLocalActiveShift(shiftData.operator, dataToSave).catch(() => {});
                Preferences.set({ key: `pickData_${shiftData.operator}`, value: rawJson }).catch(e => { /* Silently fail */ });
                Preferences.set({ key: 'lastUser', value: shiftData.operator }).catch(e => { /* Silently fail */ });
            } else {
                safeLocalStorage.setItem('pickData', rawJson, true);
                saveLocalActiveShift('default', dataToSave).catch(() => {});
                Preferences.set({ key: 'pickData', value: rawJson }).catch(e => { /* Silently fail */ });
            }
        }, 3000);

        return () => clearTimeout(handler);
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
            }).catch(e => console.warn('Background fetch all shift summaries:', e));
        } catch (e) {
            console.warn('fetchLeaderboardManual background load:', e);
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
            console.warn('fetchSummariesManual background load:', e);
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
            console.warn('fetchAdminSummariesManual background load:', e);
        }
    }, [firebaseUser?.uid, userProfile]);

    // Background Auto-Refresh to sync Leaderboard and statistics within Quota Guardian guidelines
    useEffect(() => {
        if (!isAuthenticated || !firebaseUser) return;

        const refreshAllStats = () => {
            fetchLeaderboardManual(false).catch(() => {});
            fetchSummariesManual(false).catch(() => {});
            fetchWarehouseConfigManual(false).catch(() => {});
            if (isUserAdmin()) {
                fetchAdminSummariesManual(false).catch(() => {});
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

    // Background Italian Coach loop for Admins during shift
    useEffect(() => {
        if (!isAuthenticated || !isUserAdmin()) return;

        const checkIntervalAndAnnounce = () => {
            const isEnabled = localStorage.getItem('italian_coach_enabled') === 'true';
            if (!isEnabled) return;

            // Only play during active shifts to avoid disturbing user outside shift hours
            if (!shiftData.firstStartTime || shiftData.isShiftFinalized) return;

            const intervalMinutes = parseInt(localStorage.getItem('italian_coach_interval_min') || '10', 10);
            const nowTime = Date.now();
            const lastAnnouncedRaw = localStorage.getItem('italian_coach_last_announced_timestamp');
            const lastAnnounced = lastAnnouncedRaw ? parseInt(lastAnnouncedRaw, 10) : 0;

            if (nowTime - lastAnnounced >= intervalMinutes * 60 * 1000) {
                // Time to announce!
                const selectedLessonId = parseInt(localStorage.getItem('italian_coach_lesson_id') || '1', 10);
                import('./constants/italianLessons').then(({ ITALIAN_LESSONS }) => {
                    const lesson = ITALIAN_LESSONS.find(l => l.id === selectedLessonId) || ITALIAN_LESSONS[0];
                    const currentIndex = parseInt(localStorage.getItem('italian_coach_vocab_index') || '0', 10);
                    const vocabItem = lesson.vocabulary[currentIndex];

                    if (vocabItem) {
                        // Announce vocab item
                        const volume = parseFloat(localStorage.getItem('italian_coach_volume') || '1.0');
                        voiceService.speakItalianVocab(vocabItem.italian, vocabItem.english, volume);

                        // Notify user in system UI
                        showToast(`🇮🇹 Italian Coach: "${vocabItem.italian}" - ${vocabItem.english}`, 'info');

                        // Dynamically update the operator's custom status on the live globe and leaderboard
                        setShiftData((prev: any) => ({
                            ...prev,
                            customStatus: `🇮🇹 ${vocabItem.italian}`
                        }));

                        // Auto-revert status to idle or previous status after 2 minutes (120 seconds)
                        setTimeout(() => {
                            setShiftData((prev: any) => {
                                if (prev.customStatus === `🇮🇹 ${vocabItem.italian}`) {
                                    return { ...prev, customStatus: "" };
                                }
                                return prev;
                            });
                        }, 120000);

                        // Increment repetition & round-robin vocab index
                        const nextIndex = (currentIndex + 1) % lesson.vocabulary.length;
                        localStorage.setItem('italian_coach_vocab_index', nextIndex.toString());
                        
                        const repCount = parseInt(localStorage.getItem('italian_coach_rep_count') || '0', 10);
                        localStorage.setItem('italian_coach_rep_count', (repCount + 1).toString());
                    }

                    // Save last announced timestamp
                    localStorage.setItem('italian_coach_last_announced_timestamp', nowTime.toString());
                }).catch(err => console.warn('Failed to load Italian lessons dynamically:', err));
            }
        };

        // If no timestamp set yet, seed it with current time so it doesn't blast immediately upon login,
        // unless they've already been logged in for a while.
        if (!localStorage.getItem('italian_coach_last_announced_timestamp')) {
            localStorage.setItem('italian_coach_last_announced_timestamp', Date.now().toString());
        }

        // Run check every 30 seconds
        const checkTimer = setInterval(checkIntervalAndAnnounce, 30000);
        return () => clearInterval(checkTimer);
    }, [isAuthenticated, shiftData.firstStartTime, shiftData.isShiftFinalized, userProfile]);

    // Peer Social Interactions Subscription (Pokes, Cheers, Kudos, Banter)
    useEffect(() => {
        const targetOp = (shiftData.operator || userProfile?.username || '').toUpperCase().trim();
        if (!targetOp) return;

        // Load existing notifications from IndexedDB for this operator
        loadShiftNotifications(targetOp);

        const unsubscribe = subscribeToIncomingInteractions(targetOp, (interaction, isInitial) => {
            // Persist peer interaction in Shift Notification Hub
            addShiftNotification({
                id: interaction.id || `peer_${Date.now()}`,
                operator: targetOp,
                category: 'peer',
                title: `${interaction.senderName || 'Teammate'} interacted with you`,
                message: interaction.message,
                interactionType: interaction.type,
                senderName: interaction.senderName,
                timestamp: interaction.createdAt ? new Date(interaction.createdAt).getTime() : Date.now(),
                isRead: isInitial ? true : false
            });

            if (!isInitial) {
                setActiveInteraction(interaction);
                deviceHapticService('medium');
                playAlertSound('success');
                setTimeout(() => setActiveInteraction(null), 6000);
            }
        });

        return () => unsubscribe();
    }, [shiftData.operator, userProfile?.username, loadShiftNotifications, addShiftNotification]);

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
            try {
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
                    const profile = await getUserProfile(user.uid).catch(() => null);
                    if (profile && profile.activeSessionId && profile.activeSessionId !== sessionId) {
                        try {
                            await signOut(auth);
                        } catch (e) {}
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
                        }, sessionId).catch(e => console.warn('Save user profile during auth error:', e));
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
            } catch (authErr) {
                console.warn('Auth state change handler error:', authErr);
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
            "• Required Pace: The speed needed to finish the remainder of the current pick on target.\n• Break Policy: Your 45-minute exempt time (5m clock-out, 30m dinner, 10m post-dinner) is automatically deducted. IMPORTANT: You must press the BREAK button for your dinner; any time exceeding 30 minutes is added back to your working time.",
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
        const logicText = "The application isolates Pure Selection from Logistical Tasks. For Chiller/Freezer, a 180s (3-minute) gap timer applies between orders. For Aisles, there is no manual gap timer between orders. IMPORTANT: You MUST press the BREAK button when going on break; the main dinner break allowance is 30 minutes, and any excess time over 30 minutes is added back to active pick time.";
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
        if (unlockPin.length !== 6) {
            setUnlockError('Security PIN must be exactly 6 digits.');
            haptic('heavy');
            return;
        }
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
                const authPin = unlockPin;
                await signInWithEmailAndPassword(auth, email, authPin);
                setIsEditingCaseCount(true);
                setTempCaseCount(caseCount);
                setUnlockError('');
                // Update offline pin cache if successful re-auth
                localStorage.setItem(`offline_pin_${operatorName}`, unlockPin);
            } catch (err) {
                setUnlockError('Invalid password/PIN. Access denied.');
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

        if (pin.length !== 6) {
            setLoginError("Security PIN must be exactly 6 digits.");
            haptic('heavy');
            return;
        }

        // 1. Try Firebase Email/Password Auth
        const email = userTrimmed.includes('@') ? userTrimmed.toLowerCase() : `${userTrimmed.toLowerCase()}@pick.app`;
        try {
            const authPin = pin;
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
                if (p.isActive === false) {
                    setLoginError("ACCOUNT DEACTIVATED: Contact Administrator");
                    haptic('heavy');
                    return;
                }
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
                    if (firestoreUser.isActive === false) {
                        setLoginError("ACCOUNT DEACTIVATED: Contact Administrator");
                        haptic('heavy');
                        return;
                    }
                    const userUpperCheck = (firestoreUser.username || userUpper).toUpperCase();
                    if (userUpperCheck === 'DASERGHIE' || userUpperCheck === 'ADMIN') {
                        firestoreUser.role = UserRole.ADMIN;
                    }
                    
                    if (firestoreUser.pin === pin) {
                        setUserProfile(firestoreUser);
                        const userWarehouse = firestoreUser.warehouseId || 'MAIN';
                        import('./services/leaderboardService').then(mod => {
                            mod.setWarehouseContext(userWarehouse);
                        }).catch(err => console.warn('Dynamic import leaderboardService error:', err));
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
                        try {
                            await signInAnonymously(auth);
                        } catch (anonErr) {}
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
                }).catch(err => console.warn('Dynamic import leaderboardService error:', err));

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

    const { isMotionGranted, requestMotionPermission } = useDeviceMotion(
        shiftData.haptic === 'on',
        deviceHapticService,
        setShiftData
    );

    const masterStart = () => {
        haptic('medium');
        requestMotionPermission();
        localStorage.setItem('shiftStepBackup', '0');
        const startTime = now.getTime();
        const code = generateShiftCode(shiftData.operator, startTime);
        setShiftData((prev: any) => ({ 
            ...prev, 
            firstStartTime: startTime,
            lastStopTimestamp: startTime,
            shiftCode: prev.shiftCode || code,
            steps: 0
        }));
        updateShiftData({ hasGapAlerted: false, shiftCode: shiftData.shiftCode || code });
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
        const code = generateShiftCode(shiftData.operator, startTime.getTime());
        setShiftData((prev: any) => ({ 
            ...prev, 
            firstStartTime: startTime.getTime(),
            lastStopTimestamp: currentTime, // Keep lastStop current to avoid instant gap alert
            shiftCode: prev.shiftCode || code,
            steps: 0
        }));
        updateShiftData({ hasGapAlerted: false, shiftCode: shiftData.shiftCode || code });
        setShowClockInModal(false);
    };

    const manualPickStart = (timeStr: string) => {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const startTime = new Date();
        startTime.setHours(hours, minutes, 0, 0);
        
        const currentTime = new Date().getTime();
        
        if (startTime.getTime() > currentTime) {
            startTime.setDate(startTime.getDate() - 1);
        }
        
        haptic('medium');
        setShiftData((prev: any) => ({ 
            ...prev, 
            firstPickTime: startTime.getTime(),
        }));
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

    const finishPickPhase = () => {
        haptic('medium');
        updateShiftData({
            pickPhaseEndTime: now.getTime()
        });
    };

    const undoFinishPickPhase = () => {
        haptic('light');
        updateShiftData({
            pickPhaseEndTime: null
        });
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

        if (shiftData.lastStopTimestamp) {
            let gapSec = (startTime - shiftData.lastStopTimestamp) / 1000;
            gapStr = gapSec > 60 ? Math.floor(gapSec/60) + "m " + Math.round(gapSec%60) + "s" : Math.round(gapSec) + "s";
        }
        
        updateShiftData({
            firstPickTime: shiftData.firstPickTime || startTime,
            pickStartTime: startTime,
            isPicking: true,
            hasAlerted: false,
            hasHalfwayAlerted: false,
            lastGapAlertTimestamp: null,
            hasGapAlerted: false,
            breakTimeDuringCurrentPick: 0,
            tempGap: gapStr,
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

        const currentBreak = (isOnBreak && breakStartTime) ? (now.getTime() - breakStartTime) / 1000 : 0;
        const totalCurrentBreaks = (breakTimeDuringCurrentPick || 0) + currentBreak;
        const rawElapsed = (now.getTime() - pickStartTime - (totalCurrentBreaks * 1000)) / 1000;
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
            addShiftNotification({
                operator: shiftData.operator || 'USER',
                category: 'milestone',
                title: '🏆 Achievement Unlocked!',
                message: 'You have become a SPEED DEMON!',
                isRead: false
            });
        }
        if (shiftData.totalCases + cases >= 1000 && !newAchievements.includes('millennium')) {
            newAchievements.push('millennium');
            triggerSurprise('MILLENNIUM CLUB!');
            addShiftNotification({
                operator: shiftData.operator || 'USER',
                category: 'milestone',
                title: '🏆 Achievement Unlocked!',
                message: 'You have entered the MILLENNIUM CLUB!',
                isRead: false
            });
        }
        if (shiftData.history.filter((h: any) => isPickEntry(h)).length === 0 && !newAchievements.includes('early_bird')) {
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
                isOngoing: true
            });
        } catch (e) {
            saveSuccess = false;
        }

        if (entry.labelImages && entry.labelImages.length > 0) {
            const opName = shiftData.operator || "Unknown";
            const shiftDateStr = getLocalDateString(new Date(shiftStart));
            for (let i = 0; i < entry.labelImages.length; i++) {
                const img = entry.labelImages[i];
                uploadLabelImageToCloud(img, opName, `order_${i + 1}`).catch(e => console.warn('Cloud storage label upload fallback:', e));
            }
            import('./services/indexedDbService').then(({ saveLocalPhoto }) => {
                for (let i = 0; i < entry.labelImages.length; i++) {
                    const img = entry.labelImages[i];
                    const photoId = `photo_${shiftDateStr.replace(/-/g, '')}_${opName.toUpperCase().trim()}_${i}_${Date.now()}`;
                    saveLocalPhoto(photoId, opName, shiftDateStr, img).catch(e => console.warn('IndexedDB save photo failed:', e));
                    saveImageToDevice(img, `Label_${(entry.date || '').replace(/\//g, '-')}_${i}.png`);
                }
            }).catch(err => {
                console.warn('Failed to load indexedDbService for photo save:', err);
                for (let i = 0; i < entry.labelImages.length; i++) {
                    saveImageToDevice(entry.labelImages[i], `Label_${(entry.date || '').replace(/\//g, '-')}_${i}.png`);
                }
            });
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
            const isDinner = breakDuration > 600; // Assume dinner if longer than 10 mins, or we could add a toggle.
            const excessDinnerTime = isDinner ? Math.max(0, breakDuration - 1800) : 0; // 30 mins = 1800s

            const newHistoryEntry = {
                start: new Date(breakStartTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                finish: now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
                gap: isDinner ? "DINNER BREAK" : "BREAK",
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
                breakTimeDuringCurrentPick: isPicking ? breakTimeDuringCurrentPick + breakDuration : breakTimeDuringCurrentPick,
                dinnerExcessTime: 0
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
        const actualPicks = shiftData.history.filter((h: any) => isPickEntry(h));
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
            const indexOfOldestPick = prev.history.map((h: any) => isPickEntry(h)).lastIndexOf(true);
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
        if (isWorkHeadsetPhrase(command)) {
            return; // ignore work headset interference phrases
        }
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
        setShiftData((prev: any) => {
            const next = { ...prev, ...updates };
            if (!next.shiftCode && (next.firstStartTime || next.isPicking)) {
                next.shiftCode = generateShiftCode(next.operator, next.firstStartTime || Date.now());
            }
            return next;
        });
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
            const fileName = `ShiftReport_${operatorName}_${fileDateISO.replace(/-/g, '')}.csv`;

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
                }).catch(e => {
                    console.warn('SignOut error:', e);
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
        const exempt = 0;
        
        const pStart = shiftData.firstPickTime || shiftData.firstStartTime;
        const pEnd = shiftData.pickPhaseEndTime || finalTimestamp;
        const finalPickSecs = pStart ? Math.max(0, (pEnd - pStart) / 1000) : finalDurationSecs;
        const finalActiveSecs = Math.max(1, finalPickSecs - shiftData.totalExcludedTime);
        const finalRate = finalActiveSecs > 10 ? Math.round((currentCases / finalActiveSecs) * 3600) : 0;

        // 1. Lock states
        const updatedData = {
            ...shiftData,
            endTime: finalTimestamp,
            finalizedStats: {
                rate: finalRate,
                activeElapsedSeconds: finalActiveSecs,
                totalShiftSeconds: finalDurationSecs,
                cases: currentCases,
                steps: currentSteps,
                department: currentDeptName,
                exemption: 0
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
                    if (screenshotData) {
                        tasks.push(
                            uploadShiftReceiptToCloud(screenshotData, currentName, logDate)
                                .catch(err => console.warn('Cloud storage shift receipt backup fallback:', err))
                        );
                    }
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
                        }).catch(e => {
                            console.warn("Shift and media sync fallback:", e);
                            showToast("Shift stored locally. Cloud sync pending.", "info");
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
            const opName = finalData.operator || shiftData.operator || '';
            const homeDept = getUserHomeDepartment(opName, userProfile);
            const nextData = {
               ...defaultShiftData,
               operator: opName,
               department: homeDept.department,
               zone: homeDept.zone,
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
            
            // Clear draft notes and local store draft storage for fresh shift
            localStorage.removeItem('draft_operatorNote');
            localStorage.removeItem('draft_lane1');
            localStorage.removeItem('draft_lane2');
            localStorage.removeItem('draft_lane3');
            localStorage.removeItem('draft_lane4');

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
            <MandatoryUpdateOverlay 
                isAppBlocked={isAppBlocked}
                minAllowedVersion={minAllowedVersion}
                availableUpdate={availableUpdate}
                consentUpdate={consentUpdate}
                setConsentUpdate={setConsentUpdate}
                updating={updating}
                handleUpdateApp={handleUpdateApp}
            />

            <MandatoryBetaFeedbackOverlay 
                requiresBetaFeedback={requiresBetaFeedback}
                betaFeedbackData={betaFeedbackData}
                setBetaFeedbackData={setBetaFeedbackData}
                submittingBetaFeedback={submittingBetaFeedback}
                handleSubmitBetaFeedback={handleSubmitBetaFeedback}
            />

            {floorBroadcast && (
                <BroadcastBanner 
                    message={floorBroadcast} 
                    onDismiss={() => setFloorBroadcast('')} 
                />
            )}

            <div className="relative z-20 shrink-0 pt-safe-top px-4 pb-3 flex justify-center gap-3 bg-slate-950/40 backdrop-blur-[4px] border-b border-slate-900">
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

            <div className={`relative z-10 ${theme.panel.includes('black') ? 'bg-black' : 'bg-slate-900'} pt-3 pb-3 px-4 shadow-lg border-b border-slate-800/80 flex flex-col shrink-0`}>
                {/* Row 1: Brand & Control Actions */}
                <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <Logo size="md" theme={theme} className="shrink-0" />
                        <div className="flex items-baseline gap-1.5 min-w-0">
                            <h1 className="text-xl sm:text-2xl font-black italic tracking-tight text-white leading-none">
                                <span className="bg-gradient-to-r from-white via-slate-100 to-emerald-400 bg-clip-text text-transparent drop-shadow-sm">PickApp</span>
                            </h1>
                            <span className="text-[8px] font-mono font-black text-slate-500 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700/60 leading-none select-none">
                                v{APP_VERSION}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        <div className="flex gap-1.5 relative z-[80]">
                            {availableUpdate && (
                                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 z-20 animate-pulse" />
                            )}
                            <button 
                                id="open-notification-hub-btn"
                                className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm relative"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowNotificationHub(true); }}
                                aria-label="Shift Notifications"
                                title="Shift Notifications & Interactions"
                            >
                                <Bell size={18} />
                                {unreadNotificationsCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 bg-indigo-500 border border-slate-900 rounded-full text-[9px] font-black text-white flex items-center justify-center shadow-md animate-pulse">
                                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                                    </span>
                                )}
                            </button>
                            <button 
                                className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowRota(true); setRotaEditMode(false); }}
                                aria-label="My Rota"
                                title="My Rota"
                            >
                                <Calendar size={18} />
                            </button>
                            <button 
                                className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowLeaderboard(true); }}
                                aria-label="View Leaderboard"
                                title="View Leaderboard"
                            >
                                <Trophy size={18} />
                            </button>
                            <button 
                                className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 transition-colors active:scale-95 shadow-sm"
                                onClick={(e) => { e.stopPropagation(); haptic('light'); setShowSettings(!showSettings); }}
                                aria-label="Open Settings"
                                title="Open Settings"
                            >
                                <Settings size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Row 2: Status Badges, Context Tags & Taglines */}
                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/40 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 shadow-sm leading-none not-italic">
                            {currentDept?.name || 'Aisles'}
                        </span>
                        {shiftData.storeLabel && (
                            <span className="text-[10px] font-black text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-md border border-sky-500/25 uppercase tracking-widest leading-none shadow-sm not-italic">
                                {shiftData.storeLabel}
                            </span>
                        )}
                        {isOffline && (
                            <span className="text-[9px] font-black text-red-400 bg-red-500/15 px-1.5 py-0.5 rounded border border-red-500/25 uppercase tracking-widest leading-none">
                                Offline
                            </span>
                        )}
                    </div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest leading-none truncate ml-2">
                        Precision Picking
                    </span>
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
                    <PickingDashboardMain
                        shiftData={shiftData}
                        isPicking={isPicking}
                        theme={theme}
                        isWarning={isWarning}
                        caseCount={caseCount}
                        setCaseCount={setCaseCount}
                        setIsUnlockingCaseCount={setIsUnlockingCaseCount}
                        setUnlockPin={setUnlockPin}
                        setUnlockError={setUnlockError}
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
                        setPendingLabelImages={setPendingLabelImages}
                        pendingStoreLabels={pendingStoreLabels}
                        setPendingStoreLabels={setPendingStoreLabels}
                        setViewingLabels={setViewingLabels}
                        statsMode={statsMode}
                        setStatsMode={setStatsMode}
                        getDeptName={getDeptName}
                        activeCases={activeCases}
                        activeElapsed={activeElapsed}
                        currentDeptStats={currentDeptStats}
                        activeRate={activeRate}
                        isShiftFinalized={isShiftFinalized}
                        finalizedStats={finalizedStats}
                        rate={rate}
                        activeTargetRate={activeTargetRate}
                        isRateGood={isRateGood}
                        net={net}
                        isNetGood={isNetGood}
                        formatHHMM={formatHHMM}
                        totalBreakSeconds={totalBreakSeconds}
                        masterStart={masterStart}
                        setManualClockType={setManualClockType}
                        setShowClockInModal={setShowClockInModal}
                        lane1={lane1}
                        lane2={lane2}
                        lane3={lane3}
                        lane4={lane4}
                        setLane1={setLane1}
                        setLane2={setLane2}
                        setLane3={setLane3}
                        setLane4={setLane4}
                        updateShiftData={updateShiftData}
                        setShiftNotes={setShiftNotes}
                        saveStandaloneNote={saveStandaloneNote}
                        startPick={startPick}
                        finishPickPhase={finishPickPhase}
                        undoFinishPickPhase={undoFinishPickPhase}
                        stopPick={stopPick}
                        startPaidBreak={startPaidBreak}
                        stopPaidBreak={stopPaidBreak}
                        consistencyPercent={consistencyPercent}
                        shiftBestRate={shiftBestRate}
                        downloadReport={downloadReport}
                        setManualClockTime={setManualClockTime}
                        handleEndOfDay={handleEndOfDay}
                        haptic={haptic}
                    />
                )}
                
                <BreakPolicyModal isOpen={showBreakPolicy} onClose={closeBreakPolicy} />
                
                <SettingsModal
                    isOpen={showSettings}
                    onClose={() => setShowSettings(false)}
                    theme={theme}
                    settingsTab={settingsTab}
                    setSettingsTab={setSettingsTab}
                    userProfile={userProfile}
                    shiftData={shiftData}
                    setShiftData={setShiftData}
                    setShowInviteModal={setShowInviteModal}
                    isPicking={isPicking}
                    isOnBreak={isOnBreak}
                    zoneData={zoneData}
                    warehouseConfig={warehouseConfig}
                    isAisles={isAisles}
                    handleDownloadManual={handleDownloadManual}
                    currentDept={currentDept}
                    isUserAdmin={isUserAdmin}
                    handleAdminTargetRateChange={handleAdminTargetRateChange}
                    pendingLabelImages={pendingLabelImages}
                    setPendingLabelImages={setPendingLabelImages}
                    pendingStoreLabels={pendingStoreLabels}
                    setPendingStoreLabels={setPendingStoreLabels}
                    setViewingLabels={setViewingLabels}
                    inactivityNotifsOn={inactivityNotifsOn}
                    setInactivityNotifsOn={setInactivityNotifsOn}
                    wakeLockError={wakeLockError}
                    isInIframe={isInIframe}
                    fetchingLeaderboard={fetchingLeaderboard}
                    fetchingSummaries={fetchingSummaries}
                    fetchLeaderboardManual={fetchLeaderboardManual}
                    fetchSummariesManual={fetchSummariesManual}
                    fetchWarehouseConfigManual={fetchWarehouseConfigManual}
                    fetchAdminSummariesManual={fetchAdminSummariesManual}
                    setManualClockTime={setManualClockTime}
                    setManualClockType={setManualClockType}
                    setShowClockInModal={setShowClockInModal}
                    handleEndOfDay={handleEndOfDay}
                    loadDbStorageStats={loadDbStorageStats}
                    loadingDbStats={loadingDbStats}
                    dbStatsError={dbStatsError}
                    dbStorageStats={dbStorageStats}
                    mergedShiftSummaries={mergedShiftSummaries}
                    reclaimingSpace={reclaimingSpace}
                    setReclaimingSpace={setReclaimingSpace}
                    spaceReclaimMsg={spaceReclaimMsg}
                    setSpaceReclaimMsg={setSpaceReclaimMsg}
                    stripOldImagesFromDatabase={stripOldImagesFromDatabase}
                    purgeDatabaseOlderThan6Weeks={purgeDatabaseOlderThan6Weeks}
                    downloadReport={downloadReport}
                    handleEmergencySignOut={handleEmergencySignOut}
                    setShowAbout={setShowAbout}
                    setShowAboutDeveloper={setShowAboutDeveloper}
                    availableUpdate={availableUpdate}
                    updating={updating}
                    handleUpdateApp={handleUpdateApp}
                    checkUpdate={checkUpdate}
                    setAvailableUpdate={setAvailableUpdate}
                    setLastUpdateCheck={setLastUpdateCheck}
                    setPinModal={setPinModal}
                    setHapticsEnabled={setHapticsEnabled}
                />

                    <HistoryLeaderboardOverlays
                        theme={theme}
                        haptic={haptic}
                        showClockInModal={showClockInModal}
                        setShowClockInModal={setShowClockInModal}
                        manualClockType={manualClockType}
                        manualClockTime={manualClockTime}
                        setManualClockTime={setManualClockTime}
                        manualStart={manualStart}
                        manualPickStart={manualPickStart}
                        manualEnd={manualEnd}
                        showLeaderboard={showLeaderboard}
                        setShowLeaderboard={setShowLeaderboard}
                        fetchingLeaderboard={fetchingLeaderboard}
                        fetchLeaderboardManual={fetchLeaderboardManual}
                        leaderboardTab={leaderboardTab}
                        setLeaderboardTab={setLeaderboardTab}
                        allShiftSummariesList={allShiftSummariesList}
                        adminAllSummaries={adminAllSummaries}
                        shiftSummaries={shiftSummaries}
                        zoneXP={zoneXP}
                        liveUsers={liveUsers}
                        leaderboardData={leaderboardData}
                        userProfile={userProfile}
                        showToast={showToast}
                        viewingLabels={viewingLabels}
                        setViewingLabels={setViewingLabels}
                        showRota={showRota}
                        setShowRota={setShowRota}
                        shiftData={shiftData}
                        setShiftData={setShiftData}
                        mergedShiftSummaries={mergedShiftSummaries}
                        setShiftSummaries={setShiftSummaries}
                        fetchShiftSummaries={fetchShiftSummaries}
                        isUserAdmin={isUserAdmin}
                        announce={announce}
                        viewingPastSummary={viewingPastSummary}
                        setViewingPastSummary={setViewingPastSummary}
                        showRestoreModal={showRestoreModal}
                        setShowRestoreModal={setShowRestoreModal}
                        restoreText={restoreText}
                        setRestoreText={setRestoreText}
                        restoreStatus={restoreStatus}
                        setRestoreStatus={setRestoreStatus}
                        selectedFutureDate={selectedFutureDate}
                        setSelectedFutureDate={setSelectedFutureDate}
                        handleSetDayOverride={handleSetDayOverride}
                        storedShiftPhotos={storedShiftPhotos}
                        editingOrderIndex={editingOrderIndex}
                        setEditingOrderIndex={setEditingOrderIndex}
                        editingOrderLabel={editingOrderLabel}
                        setEditingOrderLabel={setEditingOrderLabel}
                        handleSavePastOrderLabel={handleSavePastOrderLabel}
                        pinModal={pinModal}
                        setPinModal={setPinModal}
                    />
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
                            firebaseUser={firebaseUser || auth.currentUser}
                            onBackToDashboard={() => setActiveScreen(0)}
                        />
                    </div>
                )}
            </div>
            
            {/* Global Overlays & Modals Manager */}
            <AppModalsContainer
                theme={theme}
                shiftData={shiftData}
                userProfile={userProfile}
                currentWarehouseId={currentWarehouseId}
                currentDept={currentDept}
                getCleanName={getCleanName}
                showToast={showToast}
                showCelebration={showCelebration}
                celebrationTitle={celebrationTitle}
                celebrationSubtitle={celebrationSubtitle}
                isSavingShift={isSavingShift}
                orderFinishedData={orderFinishedData}
                pendingLabelImages={pendingLabelImages}
                setPendingLabelImages={setPendingLabelImages}
                setViewingLabels={setViewingLabels}
                confirmFinishPick={confirmFinishPick}
                showSummary={showSummary}
                setShowSummary={setShowSummary}
                getSummaryMessage={getSummaryMessage}
                isShiftFinalized={isShiftFinalized}
                finalizedStats={finalizedStats}
                rate={rate}
                targetRate={targetRate}
                activeElapsedSeconds={activeElapsedSeconds}
                isAisles={isAisles}
                finalExemption={finalExemption}
                accruedPostDinner={accruedPostDinner}
                accruedDinner={accruedDinner}
                accruedClockOut={accruedClockOut}
                shiftNotes={shiftNotes}
                setShiftNotes={setShiftNotes}
                updateShiftData={updateShiftData}
                takeScreenshot={takeScreenshot}
                downloadReport={downloadReport}
                endShift={endShift}
                isUnlockingCaseCount={isUnlockingCaseCount}
                isEditingCaseCount={isEditingCaseCount}
                unlockPin={unlockPin}
                setUnlockPin={setUnlockPin}
                unlockError={unlockError}
                tempCaseCount={tempCaseCount}
                setTempCaseCount={setTempCaseCount}
                handleVerifyUnlock={handleVerifyUnlock}
                handleSaveModifiedCaseCount={handleSaveModifiedCaseCount}
                setIsUnlockingCaseCount={setIsUnlockingCaseCount}
                setIsEditingCaseCount={setIsEditingCaseCount}
                confirmDialog={confirmDialog}
                setConfirmDialog={setConfirmDialog}
                showInstallTutorial={showInstallTutorial}
                setShowInstallTutorial={setShowInstallTutorial}
                showAbout={showAbout}
                setShowAbout={setShowAbout}
                showAboutDeveloper={showAboutDeveloper}
                setShowAboutDeveloper={setShowAboutDeveloper}
                showInviteModal={showInviteModal}
                setShowInviteModal={setShowInviteModal}
                showBetaSurvey={showBetaSurvey}
                setShowBetaSurvey={setShowBetaSurvey}
                monthlyReportNotif={monthlyReportNotif}
                setMonthlyReportNotif={setMonthlyReportNotif}
                showNotificationHub={showNotificationHub}
                setShowNotificationHub={setShowNotificationHub}
                shiftNotifications={shiftNotifications}
                handleMarkNotificationAsRead={handleMarkNotificationAsRead}
                handleMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
                handleClearAllNotifications={handleClearAllNotifications}
                handleDeleteNotification={handleDeleteNotification}
                toggleVoice={toggleVoice}
                handleVoiceCommand={handleVoiceCommand}
                announcement={announcement}
                activeInteraction={activeInteraction}
                setActiveInteraction={setActiveInteraction}
                toast={toast}
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
                    {failedUploads.length > 0 && (
                        <button 
                            id="manual-sync-btn"
                            onClick={() => {
                                haptic('medium');
                                if (navigator.onLine) {
                                    showToast("Initiating manual cloud synchronization...", "info");
                                    retryFailedUploads();
                                } else {
                                    showToast("Cannot sync: Device is offline. Reconnect to Wi-Fi first.", "warning");
                                }
                            }}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 hover:bg-sky-500/20 hover:border-sky-400/40 transition-all cursor-pointer ${!isOffline && 'animate-pulse'}`}
                            title={isOffline ? "Sync pending network connection" : "Click to force sync queued shifts now"}
                        >
                            <RefreshCcw size={8} className={`text-sky-400 ${!isOffline && 'animate-spin'}`} />
                            <span className="text-[8px] font-black uppercase tracking-widest font-mono">
                                {isOffline ? 'OFFLINE_PENDING' : 'SYNC_QUEUED'} ({failedUploads.length})
                            </span>
                        </button>
                    )}
                    <div className="flex items-center gap-2">
                        <Database size={10} className="text-slate-600" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] font-mono">V{APP_VERSION}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
