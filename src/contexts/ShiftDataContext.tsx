import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useMemo } from 'react';
import { ShiftData } from '../types';
import { Preferences } from '../lib/capacitorMocks';
import { migrateLocalStorageToIndexedDB, getLocalRota } from '../services/indexedDbService';
import { APP_VERSION } from '../constants/version';
import { getUserHomeDepartment } from '../constants/data';

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

export const defaultShiftData = {
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

interface ShiftDataContextType {
    shiftData: ShiftData;
    setShiftData: React.Dispatch<React.SetStateAction<ShiftData>>;
    caseCount: string;
    setCaseCount: React.Dispatch<React.SetStateAction<string>>;
    lane1: string;
    setLane1: React.Dispatch<React.SetStateAction<string>>;
    lane2: string;
    setLane2: React.Dispatch<React.SetStateAction<string>>;
    lane3: string;
    setLane3: React.Dispatch<React.SetStateAction<string>>;
    lane4: string;
    setLane4: React.Dispatch<React.SetStateAction<string>>;
    shiftNotes: string;
    setShiftNotes: React.Dispatch<React.SetStateAction<string>>;
}

const ShiftDataContext = createContext<ShiftDataContextType | undefined>(undefined);

export const safeLocalStorage = {
    setItem: (key: string, value: string, isCritical = false) => {
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                try {
                    const keysToRemove: string[] = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const k = localStorage.key(i);
                        if (!k) continue;
                        if (
                            k.startsWith('draft_') ||
                            k.startsWith('pickData_corrupted_') ||
                            k.startsWith('last_fetch_') ||
                            k.startsWith('cache_') ||
                            k.startsWith('failed_order_uploads') ||
                            k.startsWith('temp_') ||
                            k.includes('_corrupted_') ||
                            k === 'cached_leaderboard'
                        ) {
                            keysToRemove.push(k);
                        }
                    }
                    keysToRemove.forEach(k => localStorage.removeItem(k));
                    localStorage.setItem(key, value);
                } catch {}
            }
        }
    },
    getItem: (key: string) => localStorage.getItem(key),
    removeItem: (key: string) => localStorage.removeItem(key)
};

export const processLoadedData = (parsed: any, defaultValues: any) => {
    if (!parsed) return defaultValues;
    if (!Array.isArray(parsed.history)) parsed.history = [];
    if (!Array.isArray(parsed.achievements)) parsed.achievements = [];
    
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
    
    if (!parsed.personalBests) parsed.personalBests = {};
    
    if (parsed.appVersion !== APP_VERSION) {
        parsed.appVersion = APP_VERSION;
    }
    
    if (parsed.operator === 'DASERGHIE') {
        if (!parsed.rotaConfig || !parsed.rotaConfig.anchorDate) {
            parsed.rotaConfig = { ...DASERGHIE_ROTA };
        }
    } else {
        if (!parsed.rotaConfig) {
            parsed.rotaConfig = { ...defaultValues.rotaConfig };
        } else if (parsed.operator && parsed.operator !== 'DASERGHIE' && parsed.rotaConfig.anchorDate === DASERGHIE_ROTA.anchorDate && JSON.stringify(parsed.rotaConfig.pattern) === JSON.stringify(DASERGHIE_ROTA.pattern)) {
            parsed.rotaConfig = { ...defaultValues.rotaConfig };
        }
    }
    
    const op = parsed.operator || defaultValues.operator || '';
    const homeDept = getUserHomeDepartment(op);

    const isActivelyPicking = Boolean(parsed.isPicking);
    if (!isActivelyPicking && (!parsed.history || parsed.history.length === 0 || parsed.isShiftFinalized)) {
        parsed.department = homeDept.department;
        parsed.zone = homeDept.zone;
    } else {
        if (!parsed.department) {
            parsed.department = homeDept.department;
        }
        if (!parsed.zone) {
            parsed.zone = homeDept.zone;
        }
    }

    parsed.voiceEnabled = false;
    
    if (!parsed.isShiftFinalized && parsed.steps !== undefined && parsed.firstStartTime) {
        localStorage.setItem('shiftStepBackup', parsed.steps.toString());
    }
    
    return { ...defaultValues, ...parsed };
};


export function ShiftDataProvider({ children }: { children: ReactNode }) {
    const [shiftData, setShiftData] = useState<ShiftData>(() => {
        try {
            const lastUser = localStorage.getItem('lastUser');
            const keys = Object.keys(localStorage);
            let candidateKey = lastUser ? `pickData_${lastUser}` : 'pickData';
            let rawData = localStorage.getItem(candidateKey);
            
            if (!rawData) {
                const fallbackKey = keys.find(k => k.startsWith('pickData') && !k.includes('corrupted'));
                if (fallbackKey) {
                    candidateKey = fallbackKey;
                    rawData = localStorage.getItem(fallbackKey);
                }
            }

            if (!rawData) return defaultShiftData as any;
            
            try {
                const parsed = JSON.parse(rawData);
                return processLoadedData(parsed, defaultShiftData) as any;
            } catch (e) {
                localStorage.setItem(`pickData_corrupted_${Date.now()}`, rawData);
                localStorage.removeItem(candidateKey);
                return defaultShiftData as any;
            }
        } catch (e) {
            return defaultShiftData as any;
        }
    });

    const [caseCount, setCaseCount] = useState(shiftData.caseCount || '');
    const [lane1, setLane1] = useState(() => localStorage.getItem('draft_lane1') || shiftData.lane1 || '');
    const [lane2, setLane2] = useState(() => localStorage.getItem('draft_lane2') || shiftData.lane2 || '');
    const [lane3, setLane3] = useState(() => localStorage.getItem('draft_lane3') || shiftData.lane3 || '');
    const [lane4, setLane4] = useState(() => localStorage.getItem('draft_lane4') || shiftData.lane4 || '');
    const [shiftNotes, setShiftNotes] = useState(() => localStorage.getItem('draft_operatorNote') || '');

    useEffect(() => {
        const hydrateFromPreferences = async () => {
            try {
                migrateLocalStorageToIndexedDB().catch(() => {});
                const { value: lastUser } = await Preferences.get({ key: 'lastUser' });
                const userOp = lastUser || localStorage.getItem('lastUser') || 'default';
                const prefKey = lastUser ? `pickData_${lastUser}` : 'pickData';
                const { value: rawPrefData } = await Preferences.get({ key: prefKey });
                
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
            } catch (e) {}
        };
        hydrateFromPreferences();
    }, []);

    const value = {
        shiftData, setShiftData,
        caseCount, setCaseCount,
        lane1, setLane1,
        lane2, setLane2,
        lane3, setLane3,
        lane4, setLane4,
        shiftNotes, setShiftNotes
    };

    return (
        <ShiftDataContext.Provider value={value}>
            {children}
        </ShiftDataContext.Provider>
    );
}

export function useShiftData() {
    const context = useContext(ShiftDataContext);
    if (context === undefined) {
        throw new Error('useShiftData must be used within a ShiftDataProvider');
    }
    return context;
}
