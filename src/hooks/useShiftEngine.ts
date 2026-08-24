import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ShiftData, WarehouseSettings } from '../types';
import { saveLocalActiveShift, getLocalActiveShift } from '../services/indexedDbService';
import { calculateAislesExemptionDetail } from '../lib/exemptionUtils';
import { DEPARTMENTS } from '../constants/data';

const DEFAULT_SHIFT_DATA: ShiftData = {
  totalCases: 0,
  firstStartTime: null,
  totalExcludedTime: 0,
  history: [],
  steps: 0,
  haptic: 'on',
  department: 'aisles',
  zone: 'ambient',
  lastStopTimestamp: null,
  operator: 'DASERGHIE',
  streak: 1,
  lastDate: new Date().toISOString().split('T')[0],
  customTargetRate: null,
  isShiftFinalized: false,
  finalizedStats: null,
  tempGap: '00:00',
  caseCount: '0',
  pickStartTime: null,
  isPicking: false,
  breakStartTime: null,
  isOnBreak: false,
  breakTimeDuringCurrentPick: 0,
  hasAlerted: false,
  hasGapAlerted: false,
  lastGapAlertTimestamp: null,
  hasHalfwayAlerted: false,
  wakeLock: true,
  consecutiveTargetOrders: 0,
  appVersion: '1.7.0',
  personalBests: {},
  consistencyScore: 100,
  bestHourlyRate: 0,
  level: 1,
  xp: 0,
  achievements: [],
  voiceEnabled: false,
  selectedSkin: 'default'
};

export interface UseShiftEngineOptions {
  operatorName: string;
  warehouseConfig?: WarehouseSettings | null;
  targetRate?: number;
}

export function useShiftEngine({ operatorName, warehouseConfig, targetRate = 220 }: UseShiftEngineOptions) {
  const [shiftData, setShiftData] = useState<ShiftData>(DEFAULT_SHIFT_DATA);
  const [now, setNow] = useState<Date>(() => new Date());
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Load active shift from IndexedDB on operator change
  useEffect(() => {
    let isMounted = true;
    if (!operatorName) return;

    getLocalActiveShift(operatorName).then((saved) => {
      if (isMounted && saved) {
        setShiftData((prev) => ({ ...prev, ...saved, operator: operatorName }));
      }
      if (isMounted) setIsLoaded(true);
    }).catch(() => {
      if (isMounted) setIsLoaded(true);
    });

    return () => {
      isMounted = false;
    };
  }, [operatorName]);

  // 2. Debounced auto-save to IndexedDB
  const persistShift = useCallback((data: ShiftData) => {
    if (!operatorName) return;
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveLocalActiveShift(operatorName, data).catch((e) => {
        console.warn('Auto-save to IndexedDB error:', e);
      });
    }, 400);
  }, [operatorName]);

  // 3. Ticking clock (1 second interval when active or on break)
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 4. Update Shift Data safely with auto-save
  const updateShiftData = useCallback((updater: (prev: ShiftData) => ShiftData) => {
    setShiftData((prev) => {
      const next = updater(prev);
      persistShift(next);
      return next;
    });
  }, [persistShift]);

  // 5. Actions
  const startOrder = useCallback(() => {
    updateShiftData((prev) => {
      const startTime = Date.now();
      return {
        ...prev,
        isPicking: true,
        pickStartTime: startTime,
        firstStartTime: prev.firstStartTime || startTime,
        isTimerRunning: true,
        breakTimeDuringCurrentPick: 0,
        hasAlerted: false,
        hasHalfwayAlerted: false
      };
    });
  }, [updateShiftData]);

  const toggleBreak = useCallback(() => {
    updateShiftData((prev) => {
      const currTime = Date.now();
      if (!prev.isOnBreak) {
        // Starting break
        return {
          ...prev,
          isOnBreak: true,
          breakStartTime: currTime
        };
      } else {
        // Ending break
        const addedBreak = prev.breakStartTime ? (currTime - prev.breakStartTime) / 1000 : 0;
        return {
          ...prev,
          isOnBreak: false,
          breakStartTime: null,
          totalExcludedTime: (prev.totalExcludedTime || 0) + addedBreak,
          breakTimeDuringCurrentPick: prev.isPicking 
            ? (prev.breakTimeDuringCurrentPick || 0) + addedBreak 
            : prev.breakTimeDuringCurrentPick
        };
      }
    });
  }, [updateShiftData]);

  const switchDepartment = useCallback((deptKey: string) => {
    updateShiftData((prev) => ({
      ...prev,
      department: deptKey
    }));
  }, [updateShiftData]);

  const resetShift = useCallback(() => {
    const fresh = {
      ...DEFAULT_SHIFT_DATA,
      operator: operatorName,
      lastDate: new Date().toISOString().split('T')[0]
    };
    setShiftData(fresh);
    persistShift(fresh);
  }, [operatorName, persistShift]);

  // 6. Active Shift Stats computation
  const activeElapsedSeconds = useMemo(() => {
    if (!shiftData.firstStartTime) return 0;
    const totalElapsed = Math.max(0, (now.getTime() - shiftData.firstStartTime) / 1000);
    let currentBreak = 0;
    if (shiftData.isOnBreak && shiftData.breakStartTime) {
      currentBreak = Math.max(0, (now.getTime() - shiftData.breakStartTime) / 1000);
    }
    const totalBreaks = (shiftData.totalExcludedTime || 0) + currentBreak;
    return Math.max(0, totalElapsed - totalBreaks);
  }, [shiftData.firstStartTime, shiftData.totalExcludedTime, shiftData.isOnBreak, shiftData.breakStartTime, now]);

  const currentPickRate = useMemo(() => {
    if (activeElapsedSeconds < 10 || shiftData.totalCases <= 0) return 0;
    return Math.round((shiftData.totalCases / activeElapsedSeconds) * 3600);
  }, [activeElapsedSeconds, shiftData.totalCases]);

  return {
    shiftData,
    setShiftData,
    updateShiftData,
    now,
    isLoaded,
    activeElapsedSeconds,
    currentPickRate,
    startOrder,
    toggleBreak,
    switchDepartment,
    resetShift
  };
}
