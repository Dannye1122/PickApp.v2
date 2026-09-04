import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Settings, X, LayoutDashboard, Trophy, Sliders, FileText, Lock, UserPlus, Sparkles, ChevronRight,
    Coffee, Zap, RefreshCcw, Hash, AlertCircle, BookOpen, Download, RotateCcw, Activity, Volume2,
    Bell, Mic, Power, ExternalLink, Shield, Clock, LogOut, Database, RefreshCw, XOctagon, HardDrive,
    FileBox, ShieldCheck, Wrench, Layers, Trash2, FileSpreadsheet, Cpu, Terminal, Camera, ShieldAlert,
    Cloud, Check, Languages, VolumeX, HelpCircle, Award, CheckCircle2, Play, Battery
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { APP_VERSION } from '../../constants/version';
import { SKIN_REQUIREMENTS } from '../../constants/themes';
import { DEPARTMENTS } from '../../constants/data';
import { ITALIAN_LESSONS } from '../../constants/italianLessons';
import { voiceService } from '../../services/voiceService';
import { haptic } from '../../services/hapticService';
import { deviceHaptic as deviceHapticService } from '../../lib/deviceApi';
import { playGentleBeep, playAlertSound, playVictorySound } from '../../services/audioService';
import { isNotificationSupported, setInactivityNotifsEnabled, sendInactivityNotification } from '../../services/notificationService';
import { isVibrationSupported } from '../../services/hapticService';
import { syncUserProfileToCloud, restoreUserProfileByUsername, fetchCloudUserProfile } from '../../services/authSyncService';
import { ShiftData, UserProfile } from '../../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: any;
    settingsTab: 'ops' | 'rate' | 'ui' | 'data' | 'vault' | 'coach';
    setSettingsTab: (tab: 'ops' | 'rate' | 'ui' | 'data' | 'vault' | 'coach') => void;
    userProfile: UserProfile | null;
    shiftData: ShiftData;
    setShiftData: React.Dispatch<React.SetStateAction<ShiftData>>;
    setShowInviteModal: (show: boolean) => void;
    isPicking: boolean;
    isOnBreak: boolean;
    zoneData: any;
    warehouseConfig: any;
    isAisles: boolean;
    handleDownloadManual: () => void;
    currentDept: any;
    isUserAdmin: () => boolean;
    handleAdminTargetRateChange: (rate: number | null) => void;
    pendingLabelImages: string[];
    setPendingLabelImages: React.Dispatch<React.SetStateAction<string[]>>;
    pendingStoreLabels: string[];
    setPendingStoreLabels: React.Dispatch<React.SetStateAction<string[]>>;
    setViewingLabels: (imgs: string[]) => void;
    inactivityNotifsOn: boolean;
    setInactivityNotifsOn: (val: boolean) => void;
    wakeLockError: string | null;
    isInIframe: boolean;
    fetchingLeaderboard: boolean;
    fetchingSummaries: boolean;
    fetchLeaderboardManual: (force: boolean) => void;
    fetchSummariesManual: (force: boolean) => void;
    fetchWarehouseConfigManual: (force: boolean) => void;
    fetchAdminSummariesManual: (force: boolean) => void;
    setManualClockTime: (time: string) => void;
    setManualClockType: (type: 'in' | 'out') => void;
    setShowClockInModal: (show: boolean) => void;
    handleEndOfDay: () => void;
    loadDbStorageStats: () => void;
    loadingDbStats: boolean;
    dbStatsError: string | null;
    dbStorageStats: any;
    mergedShiftSummaries: any[];
    reclaimingSpace: boolean;
    setReclaimingSpace: (val: boolean) => void;
    spaceReclaimMsg: string | null;
    setSpaceReclaimMsg: (val: string | null) => void;
    stripOldImagesFromDatabase: (days: number) => Promise<any>;
    purgeDatabaseOlderThan6Weeks: (isAdmin: boolean) => Promise<any>;
    downloadReport: () => void;
    handleEmergencySignOut: () => void;
    setShowAbout: (show: boolean) => void;
    setShowAboutDeveloper: (show: boolean) => void;
    availableUpdate: string | null;
    updating: boolean;
    handleUpdateApp: () => void;
    checkUpdate: () => Promise<string | null>;
    setAvailableUpdate: (val: string | null) => void;
    setLastUpdateCheck: (val: number) => void;
    setPinModal: (val: any) => void;
    setHapticsEnabled: (val: boolean) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    theme,
    settingsTab,
    setSettingsTab,
    userProfile,
    shiftData,
    setShiftData,
    setShowInviteModal,
    isPicking,
    isOnBreak,
    zoneData,
    warehouseConfig,
    isAisles,
    handleDownloadManual,
    currentDept,
    isUserAdmin,
    handleAdminTargetRateChange,
    pendingLabelImages,
    setPendingLabelImages,
    pendingStoreLabels,
    setPendingStoreLabels,
    setViewingLabels,
    inactivityNotifsOn,
    setInactivityNotifsOn,
    wakeLockError,
    isInIframe,
    fetchingLeaderboard,
    fetchingSummaries,
    fetchLeaderboardManual,
    fetchSummariesManual,
    fetchWarehouseConfigManual,
    fetchAdminSummariesManual,
    setManualClockTime,
    setManualClockType,
    setShowClockInModal,
    handleEndOfDay,
    loadDbStorageStats,
    loadingDbStats,
    dbStatsError,
    dbStorageStats,
    mergedShiftSummaries,
    reclaimingSpace,
    setReclaimingSpace,
    spaceReclaimMsg,
    setSpaceReclaimMsg,
    stripOldImagesFromDatabase,
    purgeDatabaseOlderThan6Weeks,
    downloadReport,
    handleEmergencySignOut,
    setShowAbout,
    setShowAboutDeveloper,
    availableUpdate,
    updating,
    handleUpdateApp,
    checkUpdate,
    setAvailableUpdate,
    setLastUpdateCheck,
    setPinModal,
    setHapticsEnabled
}) => {
    const [cloudBackupStatus, setCloudBackupStatus] = useState<string | null>(null);
    const [cloudRestoreLoading, setCloudRestoreLoading] = useState(false);
    const [searchUsername, setSearchUsername] = useState(shiftData.operator || '');
    const [globalSyncing, setGlobalSyncing] = useState(false);
    const [globalSyncStatus, setGlobalSyncStatus] = useState<string | null>(null);

    const handleForceGlobalSync = async () => {
        haptic('heavy');
        setGlobalSyncing(true);
        setGlobalSyncStatus('Synchronizing cloud & local database...');
        
        try {
            await Promise.allSettled([
                Promise.resolve(fetchLeaderboardManual(true)),
                Promise.resolve(fetchSummariesManual(true)),
                Promise.resolve(fetchWarehouseConfigManual(true)),
                isUserAdmin() ? Promise.resolve(fetchAdminSummariesManual(true)) : Promise.resolve()
            ]);
            
            if (typeof loadDbStorageStats === 'function') {
                loadDbStorageStats();
            }
            setGlobalSyncStatus('✓ Global Synchronization Complete! Cache & Cloud Refreshed');
            setTimeout(() => setGlobalSyncStatus(null), 4000);
        } catch (e: any) {
            setGlobalSyncStatus('✓ Local Cache Synchronized');
            setTimeout(() => setGlobalSyncStatus(null), 4000);
        } finally {
            setGlobalSyncing(false);
        }
    };

    // Italian Language Coach Settings
    const [coachEnabled, setCoachEnabled] = useState<boolean>(() => {
        return localStorage.getItem('italian_coach_enabled') === 'true';
    });
    const [coachLessonId, setCoachLessonId] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_lesson_id') || '1', 10);
    });
    const [coachIntervalMin, setCoachIntervalMin] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_interval_min') || '10', 10);
    });
    const [coachVolume, setCoachVolume] = useState<number>(() => {
        return parseFloat(localStorage.getItem('italian_coach_volume') || '1.0');
    });
    const [coachRepCount, setCoachRepCount] = useState<number>(() => {
        return parseInt(localStorage.getItem('italian_coach_rep_count') || '0', 10);
    });

    // Coach Panel UI Tab
    const [coachActiveTab, setCoachActiveTab] = useState<'study' | 'quiz' | 'settings'>('study');
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);
    const [quizScore, setQuizScore] = useState<number | null>(null);
    const [isPlayingAudio, setIsPlayingAudio] = useState(false);

    const activeCoachLesson = ITALIAN_LESSONS.find(l => l.id === coachLessonId) || ITALIAN_LESSONS[0];

    const speakItalian = (text: string, englishTranslation?: string) => {
        setIsPlayingAudio(true);
        if (englishTranslation) {
            voiceService.speakItalianVocab(text, englishTranslation, coachVolume, () => {
                setIsPlayingAudio(false);
            });
        } else {
            voiceService.speak(text, {
                lang: 'it-IT',
                rate: 0.85,
                volume: coachVolume,
                onEnd: () => setIsPlayingAudio(false)
            });
        }
    };

    const handleAddXP = (xpGained: number) => {
        setShiftData((prev: any) => {
            let newXp = (prev.xp || 0) + xpGained;
            let newLevel = prev.level || 1;
            const xpToLevel = newLevel * 1000;
            if (newXp >= xpToLevel) {
                newLevel += 1;
                newXp -= xpToLevel;
            }
            return {
                ...prev,
                xp: newXp,
                level: newLevel
            };
        });
    };

    const handleSubmitQuiz = () => {
        let score = 0;
        activeCoachLesson.quiz.forEach((q, idx) => {
            if (quizAnswers[idx] === q.correctIndex) {
                score += 1;
            }
        });
        setQuizScore(score);
        setQuizSubmitted(true);

        if (score === activeCoachLesson.quiz.length) {
            handleAddXP(150); // reward genuine XP
            playVictorySound();
            haptic('heavy');
        } else {
            playAlertSound();
            haptic('medium');
        }
    };

    const handleResetQuiz = () => {
        setQuizAnswers({});
        setQuizSubmitted(false);
        setQuizScore(null);
    };

    // Save preferences
    React.useEffect(() => {
        localStorage.setItem('italian_coach_enabled', coachEnabled.toString());
        localStorage.setItem('italian_coach_lesson_id', coachLessonId.toString());
        localStorage.setItem('italian_coach_interval_min', coachIntervalMin.toString());
        localStorage.setItem('italian_coach_volume', coachVolume.toString());
        localStorage.setItem('italian_coach_rep_count', coachRepCount.toString());
    }, [coachEnabled, coachLessonId, coachIntervalMin, coachVolume, coachRepCount]);

    const handleBackupProfile = async () => {
        if (!shiftData.operator) {
            setCloudBackupStatus('Operator name required');
            return;
        }
        setCloudRestoreLoading(true);
        setCloudBackupStatus('Backing up profile to cloud...');
        const success = await syncUserProfileToCloud(shiftData.operator, {
            username: shiftData.operator,
            level: userProfile?.level || 1,
            xp: userProfile?.xp || 0,
            currentWarehouseId: shiftData.warehouseId || 'MAIN',
            unlockedSkins: userProfile?.unlockedSkins || [],
            totalShiftsCompleted: mergedShiftSummaries.length
        });
        setCloudRestoreLoading(false);
        if (success) {
            haptic('heavy');
            setCloudBackupStatus('✓ Profile backed up successfully to Cloud!');
            setTimeout(() => setCloudBackupStatus(null), 4000);
        } else {
            setCloudBackupStatus('Cloud backup pending network connection');
        }
    };

    const handleRestoreProfile = async () => {
        if (!searchUsername.trim()) return;
        setCloudRestoreLoading(true);
        setCloudBackupStatus(`Searching profile for ${searchUsername.toUpperCase()}...`);
        const found = await restoreUserProfileByUsername(searchUsername.trim());
        setCloudRestoreLoading(false);
        if (found) {
            haptic('heavy');
            setShiftData(prev => ({
                ...prev,
                operator: found.username,
                warehouseId: found.currentWarehouseId || prev.warehouseId
            }));
            setCloudBackupStatus(`✓ Restored: Level ${found.level} (${found.xp} XP)`);
            setTimeout(() => setCloudBackupStatus(null), 5000);
        } else {
            setCloudBackupStatus('No remote profile found for this username.');
            setTimeout(() => setCloudBackupStatus(null), 4000);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
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
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-white italic tracking-tight">ENGINE ROOM</h3>
                                    <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700/60">
                                        v{APP_VERSION}
                                    </span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">System Configuration</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => { haptic('light'); onClose(); }} 
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
                            { id: 'vault', icon: Lock, label: 'VAULT' },
                            ...((isUserAdmin() || auth.currentUser?.email === 'SERGHIE.DANIEL@gmail.com' || userProfile?.username?.toUpperCase() === 'DASERGHIE') ? [
                                { id: 'coach', icon: Languages, label: 'COACH' }
                            ] : [])
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

                                {/* Custom Operational Status */}
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Live Custom Status</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-600 group-focus-within:text-sky-500 transition-colors">
                                            <Terminal size={18} />
                                        </div>
                                        <input 
                                            type="text" 
                                            maxLength={30}
                                            value={shiftData.customStatus || ''} 
                                            onChange={(e) => setShiftData({...shiftData, customStatus: e.target.value})}
                                            className="w-full bg-slate-950 border-2 border-slate-800/80 py-5 pl-12 pr-4 rounded-2xl text-white tracking-wide focus:ring-1 focus:ring-sky-500/50 focus:border-sky-500/50 outline-none transition-all placeholder-slate-800"
                                            placeholder="What are you up to? (e.g., ⚡ Picking Fast)"
                                        />
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                                        {[
                                            { label: '⚡ Picking Fast', val: '⚡ Picking Fast' },
                                            { label: '🛒 Loading Cart', val: '🛒 Loading Cart' },
                                            { label: '☕ Short Break', val: '☕ Short Break' },
                                            { label: '🇮🇹 Learning Italian', val: '🇮🇹 Learning Italian' },
                                        ].map((preset) => (
                                            <button
                                                key={preset.val}
                                                onClick={() => {
                                                    haptic('light');
                                                    setShiftData({ ...shiftData, customStatus: preset.val });
                                                }}
                                                className={`px-3 py-1.5 rounded-full text-[9px] font-bold uppercase tracking-wider border whitespace-nowrap transition-all ${
                                                    shiftData.customStatus === preset.val
                                                        ? 'bg-sky-500/20 border-sky-400 text-sky-400'
                                                        : 'bg-slate-950/60 border-slate-800 text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {preset.label}
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
                                    {Object.entries(zoneData.depts).map(([deptKey, dept]: [string, any]) => (
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
                                        <span className="text-[11px] font-black text-slate-200 uppercase tracking-widest">Logic: Standard Active Rate</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-bold uppercase tracking-tight pl-11">
                                        100% break exclusion applied consistently across all departments.
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
                                                                        <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
                                                    {Object.values(zone.depts).map((dept: any) => (
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
                                                                                {(key === 'aisles' || key.toLowerCase().startsWith('aisle')) && <span className="text-[8px] bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded-lg border border-sky-400/20 font-black">+45M BUF</span>}
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

                                    <button 
                                        className={`w-full py-6 rounded-[32px] font-black text-[12px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-4 border-2 ${shiftData.batterySaver ? `bg-emerald-600 text-white border-transparent shadow-[0_0_25px_rgba(16,185,129,0.3)]` : 'bg-slate-950 text-slate-700 border-slate-800/80 shadow-inner'}`}
                                        onClick={() => { setShiftData({...shiftData, batterySaver: !shiftData.batterySaver}); haptic('medium'); }}
                                    >
                                        <div className={`p-2 rounded-xl ${shiftData.batterySaver ? 'bg-white/20' : 'bg-slate-900'}`}>
                                            <Battery size={20} className={shiftData.batterySaver ? "fill-white animate-pulse" : ""} />
                                        </div>
                                        {shiftData.batterySaver ? 'BATTERY_SAVER_ACTIVE' : 'ACTIVATE_BATTERY_SAVER'}
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
                                        onClick={handleForceGlobalSync}
                                        disabled={globalSyncing || fetchingLeaderboard || fetchingSummaries}
                                        className={`w-full py-5 rounded-[24px] font-black text-[12px] uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-4 border-2 shadow-2xl active:scale-[0.98] ${globalSyncing || fetchingLeaderboard || fetchingSummaries ? 'bg-slate-900 text-slate-500 border-slate-800' : 'bg-emerald-500 text-white border-transparent hover:bg-emerald-400 shadow-emerald-500/20'}`}
                                    >
                                        <RefreshCcw size={16} className={globalSyncing || fetchingLeaderboard || fetchingSummaries ? 'animate-spin' : ''} />
                                        {globalSyncing || fetchingLeaderboard || fetchingSummaries ? (
                                            <>ENGINE_SYNCHRONIZING...</>
                                        ) : (
                                            <>FORCE_GLOBAL_SYNC</>
                                        )}
                                    </button>
                                    {globalSyncStatus && (
                                        <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center text-[10px] font-mono text-emerald-400 font-bold">
                                            {globalSyncStatus}
                                        </div>
                                    )}
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
                                            onClose();
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
                                            onClose();
                                            handleEndOfDay();
                                        }}
                                    >
                                        <LogOut size={14} /> END_SHIFT
                                    </button>
                                </div>

                                {/* MULTI-DEVICE CLOUD PROFILE BACKUP & RESTORE */}
                                <div className="p-4 bg-slate-950 border border-indigo-500/30 rounded-2xl space-y-3.5 shadow-lg relative overflow-hidden">
                                    <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                                                <Cloud size={16} />
                                            </div>
                                            <div>
                                                <h4 className="text-[11px] font-black text-white uppercase tracking-widest">Cloud Profile Restore</h4>
                                                <p className="text-[8px] text-indigo-400/80 font-black uppercase tracking-[0.2em]">Cross-Device Sync</p>
                                            </div>
                                        </div>
                                        <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full font-bold">
                                            Level {userProfile?.level || 1} • {userProfile?.xp || 0} XP
                                        </span>
                                    </div>

                                    <p className="text-[9px] text-slate-400 leading-relaxed">
                                        Switching scanners or using a new phone? Back up your unlocked themes, levels, and badges to Firebase, or restore from your username.
                                    </p>

                                    <div className="flex gap-2">
                                        <input 
                                            type="text"
                                            value={searchUsername}
                                            onChange={(e) => setSearchUsername(e.target.value)}
                                            placeholder="OPERATOR NAME"
                                            className="flex-1 bg-slate-900 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-mono font-bold uppercase focus:outline-none focus:border-indigo-500"
                                        />
                                        <button
                                            onClick={handleRestoreProfile}
                                            disabled={cloudRestoreLoading || !searchUsername.trim()}
                                            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shrink-0"
                                        >
                                            <RefreshCw size={12} className={cloudRestoreLoading ? 'animate-spin' : ''} />
                                            Restore
                                        </button>
                                    </div>

                                    <button
                                        onClick={handleBackupProfile}
                                        disabled={cloudRestoreLoading}
                                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-850 border border-indigo-500/40 text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                    >
                                        <Cloud size={14} />
                                        Back Up Current Profile to Cloud
                                    </button>

                                    {cloudBackupStatus && (
                                        <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-center text-[10px] font-mono text-indigo-300 font-bold">
                                            {cloudBackupStatus}
                                        </div>
                                    )}
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
                        {settingsTab === 'coach' && (
                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                {/* Coach Title Header */}
                                <div className="p-5 bg-gradient-to-r from-emerald-950/40 via-slate-950 to-slate-950 border border-emerald-500/20 rounded-[32px] relative overflow-hidden">
                                    <div className="absolute -top-12 -right-12 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full"></div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                                <Languages size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
                                                    Italian Shift Coach
                                                    <Sparkles size={12} className="text-emerald-400 animate-pulse" />
                                                </h4>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Acoustic Audio Learning</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => {
                                                setCoachEnabled(!coachEnabled);
                                                haptic('medium');
                                            }}
                                            className={`px-3 py-1.5 rounded-xl font-extrabold text-[9px] tracking-widest transition-all border ${
                                                coachEnabled 
                                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                                                    : 'bg-slate-950 border-slate-800 text-slate-500'
                                            }`}
                                        >
                                            {coachEnabled ? 'ENABLED' : 'MUTED'}
                                        </button>
                                    </div>
                                    
                                    <p className="text-[10px] text-slate-400 leading-relaxed font-bold uppercase tracking-tight pl-13">
                                        Active unit: <span className="text-white italic">Unit {activeCoachLesson.id} - {activeCoachLesson.title}</span>. Micro-whisper prompts delivered straight to your headset during picking cycles.
                                    </p>
                                </div>

                                {/* Headset Command Filtering Informational Banner */}
                                <div className="p-3 bg-slate-950 border border-sky-500/20 rounded-2xl flex items-start gap-2.5">
                                    <VolumeX size={14} className="text-sky-400 mt-0.5 shrink-0" />
                                    <div>
                                        <div className="text-[9px] font-black text-white uppercase tracking-wider">Acoustic Interference Shield</div>
                                        <p className="text-[8px] text-slate-400 font-medium leading-relaxed mt-0.5">
                                            System ignores headset control inputs like <span className="font-mono text-sky-400 font-bold">"1 ready", "2 ready", "ready", "say again"</span> to avoid interrupting active pick flows.
                                        </p>
                                    </div>
                                </div>

                                {/* Segmented Tab Controls */}
                                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-950 border border-slate-800/80 rounded-2xl">
                                    {[
                                        { id: 'study', label: 'Study' },
                                        { id: 'quiz', label: 'Quiz' },
                                        { id: 'settings', label: 'Intervals' }
                                    ].map(tab => {
                                        const isTabActive = coachActiveTab === tab.id;
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => {
                                                    setCoachActiveTab(tab.id as any);
                                                    haptic('light');
                                                }}
                                                className={`py-2 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all ${
                                                    isTabActive 
                                                        ? 'bg-slate-900 border border-slate-800 text-white shadow-inner' 
                                                        : 'text-slate-500 hover:text-slate-300'
                                                }`}
                                            >
                                                {tab.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* SUB-TAB 1: STUDY */}
                                {coachActiveTab === 'study' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Vocabulary • Unit {activeCoachLesson.id}</span>
                                            <span className="text-[9px] font-black text-slate-400 bg-slate-950 px-2.5 py-0.5 rounded-full border border-slate-800/80 font-mono">
                                                {activeCoachLesson.vocabulary.length} Words
                                            </span>
                                        </div>

                                        <div className="space-y-3">
                                            {activeCoachLesson.vocabulary.map((vocab, vIdx) => (
                                                <div 
                                                    key={vocab.id}
                                                    onClick={() => {
                                                        speakItalian(vocab.italian, vocab.english);
                                                        haptic('light');
                                                    }}
                                                    className="p-4 bg-slate-950 border border-slate-850 hover:border-slate-700/80 rounded-2xl flex items-center justify-between gap-4 cursor-pointer group transition-all duration-200"
                                                >
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-extrabold text-white group-hover:text-emerald-400 transition-colors">{vocab.italian}</span>
                                                            <span className="text-[9px] font-mono text-slate-500 font-bold">[{vocab.phonetic}]</span>
                                                        </div>
                                                        <div className="text-[11px] text-slate-300 font-semibold">{vocab.english}</div>
                                                        <div className="text-[9px] text-slate-500 font-medium italic mt-1 leading-normal">
                                                            "{vocab.exampleItalian}" → "{vocab.exampleEnglish}"
                                                        </div>
                                                    </div>
                                                    <div className="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-slate-600 group-hover:text-emerald-400 group-hover:bg-emerald-950/20 border border-slate-850 group-hover:border-emerald-500/30 transition-all">
                                                        <Volume2 size={14} className={isPlayingAudio ? 'animate-pulse' : ''} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* SUB-TAB 2: QUIZ */}
                                {coachActiveTab === 'quiz' && (
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center px-1">
                                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Unit {activeCoachLesson.id} Quiz</span>
                                            {quizSubmitted && (
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    quizScore === activeCoachLesson.quiz.length 
                                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                }`}>
                                                    Score: {quizScore} / {activeCoachLesson.quiz.length}
                                                </span>
                                            )}
                                        </div>

                                        <div className="space-y-3">
                                            {activeCoachLesson.quiz.map((q, qIdx) => (
                                                <div key={qIdx} className="bg-slate-950 border border-slate-850 p-4 rounded-2xl space-y-2.5">
                                                    <div className="text-[11px] font-bold text-slate-200">
                                                        {qIdx + 1}. {q.question}
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-1.5">
                                                        {q.options.map((opt, optIdx) => {
                                                            const isSelected = quizAnswers[qIdx] === optIdx;
                                                            let optStyle = 'bg-slate-900 border-slate-850 text-slate-400 hover:bg-slate-800';

                                                            if (quizSubmitted) {
                                                                if (optIdx === q.correctIndex) {
                                                                    optStyle = 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 font-bold';
                                                                } else if (isSelected && optIdx !== q.correctIndex) {
                                                                    optStyle = 'bg-rose-950/50 border-rose-500/40 text-rose-300';
                                                                }
                                                            } else if (isSelected) {
                                                                optStyle = 'bg-emerald-600 border-emerald-400 text-white font-bold';
                                                            }

                                                            return (
                                                                <button
                                                                    key={optIdx}
                                                                    disabled={quizSubmitted}
                                                                    onClick={() => {
                                                                        setQuizAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
                                                                        haptic('light');
                                                                    }}
                                                                    className={`p-2.5 rounded-xl text-left text-[11px] border transition-all ${optStyle}`}
                                                                >
                                                                    {opt}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                    {quizSubmitted && (
                                                        <div className="text-[9px] text-slate-400 bg-slate-900/50 p-2.5 rounded-xl border border-slate-850 mt-1">
                                                            💡 {q.explanation}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>

                                        <div className="pt-2 flex justify-between items-center">
                                            {quizSubmitted ? (
                                                <button 
                                                    onClick={() => {
                                                        handleResetQuiz();
                                                        haptic('medium');
                                                    }}
                                                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 font-black text-[10px] uppercase tracking-widest rounded-xl flex items-center justify-center gap-1.5"
                                                >
                                                    <RotateCcw size={14} />
                                                    Retake Quiz
                                                </button>
                                            ) : (
                                                <button 
                                                    onClick={() => {
                                                        handleSubmitQuiz();
                                                    }}
                                                    disabled={Object.keys(quizAnswers).length < activeCoachLesson.quiz.length}
                                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-emerald-600/10 transition-all"
                                                >
                                                    Submit & Verify Answers (+150 XP)
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* SUB-TAB 3: SETTINGS & PRACTICE CALCULATION */}
                                {coachActiveTab === 'settings' && (
                                    <div className="space-y-4">
                                        {/* Lesson Selector */}
                                        <div className="space-y-2">
                                            <label className="text-slate-500 font-black uppercase text-[9px] tracking-wider px-1">Active Lesson Unit</label>
                                            <div className="space-y-2">
                                                {ITALIAN_LESSONS.map(lesson => (
                                                    <button
                                                        key={lesson.id}
                                                        onClick={() => {
                                                            setCoachLessonId(lesson.id);
                                                            handleResetQuiz();
                                                            haptic('medium');
                                                        }}
                                                        className={`w-full p-4 rounded-2xl border text-left flex justify-between items-center transition-all ${
                                                            coachLessonId === lesson.id 
                                                                ? 'bg-emerald-950/40 border-emerald-500 text-white' 
                                                                : 'bg-slate-950 border-slate-850 text-slate-400 hover:bg-slate-900'
                                                        }`}
                                                    >
                                                        <div>
                                                            <div className="font-extrabold text-[11px] text-white">Unit {lesson.id}: {lesson.title}</div>
                                                            <div className="text-[9px] text-slate-500 mt-0.5">{lesson.theme} • {lesson.vocabulary.length} Words • {lesson.level}</div>
                                                        </div>
                                                        {coachLessonId === lesson.id && (
                                                            <CheckCircle2 size={16} className="text-emerald-400" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Practice Repetition Statistics Card */}
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3.5 shadow-inner">
                                            <div className="flex justify-between items-center border-b border-slate-900 pb-2">
                                                <div className="flex items-center gap-1.5">
                                                    <Clock size={14} className="text-emerald-400" />
                                                    <span className="font-black text-slate-300 uppercase text-[9px] tracking-wider">Acoustic Repetition Engine</span>
                                                </div>
                                                <span className="text-emerald-400 font-mono font-black text-[11px]">
                                                    Every {coachIntervalMin} minutes
                                                </span>
                                            </div>

                                            <input 
                                                type="range"
                                                min="3"
                                                max="30"
                                                step="1"
                                                value={coachIntervalMin}
                                                onChange={(e) => {
                                                    setCoachIntervalMin(parseInt(e.target.value, 10));
                                                    haptic('light');
                                                }}
                                                className="w-full accent-emerald-500 cursor-pointer"
                                            />
                                            <div className="flex justify-between text-[8px] text-slate-500 font-mono uppercase tracking-wider">
                                                <span>3 min (Max Reps)</span>
                                                <span>15 min</span>
                                                <span>30 min (Relaxed)</span>
                                            </div>

                                            {/* Repetition calculation tailored to the user's specific 5-7 hour shift duration */}
                                            <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-850/60 text-[9.5px] text-slate-400 leading-normal space-y-1.5">
                                                <div className="font-bold text-slate-300 uppercase text-[8px] tracking-widest text-emerald-400">Repetition Outlook For Your Shift:</div>
                                                <p>
                                                    • Over a <strong>5-hour shift</strong>: approx <strong className="text-white font-mono">{Math.round(300 / coachIntervalMin)} vocabulary iterations</strong>.
                                                </p>
                                                <p>
                                                    • Over a <strong>7-hour shift</strong>: approx <strong className="text-white font-mono">{Math.round(420 / coachIntervalMin)} vocabulary iterations</strong>.
                                                </p>
                                                <p className="text-slate-500 text-[8px] italic uppercase mt-1">
                                                    Highly repetitive cycles help reinforce speech recognition pathways automatically while picking!
                                                </p>
                                            </div>
                                        </div>

                                        {/* Audio Volume Controls */}
                                        <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 space-y-3 shadow-inner">
                                            <div className="flex justify-between items-center">
                                                <span className="font-black text-slate-300 uppercase text-[9px] tracking-wider">Whisper Voice Volume</span>
                                                <span className="text-emerald-400 font-mono font-black text-[10px]">
                                                    {Math.round(coachVolume * 100)}%
                                                </span>
                                            </div>
                                            <input 
                                                type="range"
                                                min="0.1"
                                                max="1.0"
                                                step="0.05"
                                                value={coachVolume}
                                                onChange={(e) => {
                                                    setCoachVolume(parseFloat(e.target.value));
                                                    haptic('light');
                                                }}
                                                className="w-full accent-emerald-500 cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}
                        {/* Admin settings tab removed - completely migrated to dedicated Admin page screen */}
                    </div>

                    {/* Footer */}
                    <div className="p-3 sm:p-3.5 bg-slate-950 backdrop-blur-3xl border-t border-slate-800">
                        <button 
                            className={`w-full py-3 rounded-xl ${theme.bg} text-white font-black text-xs uppercase tracking-[0.4em] shadow-2xl ${theme.shadow} active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 relative overflow-hidden group min-h-[46px]`}
                            onClick={() => { haptic('medium'); onClose(); }}
                        >
                            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                            <ShieldCheck size={18} className="relative" /> 
                            <span className="relative">COMMIT_CHANGES</span>
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
