import { useMemo } from 'react';
import { ShiftData, WarehouseSettings } from '../types';
import { calculateAislesExemptionDetail } from '../lib/exemptionUtils';
import { DEPARTMENTS } from '../constants/data';

const parseFormattedTimeToSeconds = (str: string): number => {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.split(':').map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return parseFloat(str) || 0;
};

const getTargetRateForDept = (deptKey: string, fallback: number = 220, warehouseConfig?: WarehouseSettings | null): number => {
    if (warehouseConfig?.customDeptTargets && warehouseConfig.customDeptTargets[deptKey] !== undefined) {
        return warehouseConfig.customDeptTargets[deptKey];
    }
    for (const zone of Object.values(DEPARTMENTS)) {
        for (const dept of Object.values(zone.depts)) {
            if (dept.sub && dept.sub[deptKey]) {
                return dept.sub[deptKey].target;
            }
        }
    }
    return fallback;
};

export const usePerformanceStats = (shiftData: ShiftData, now: Date, targetRate: number, warehouseConfig?: WarehouseSettings | null) => {
    
    const isAisles = shiftData.department === 'aisles' || shiftData.department?.startsWith('aisle');

    const statsSummary = useMemo(() => {
        if (!shiftData.firstStartTime) {
            return { totalShiftSeconds: 0, totalBreakSeconds: 0, activeElapsedSeconds: 0, activeElapsedHours: 0, aislesExemptionDetail: calculateAislesExemptionDetail(0, warehouseConfig?.exemptionRules), spans: [] as { dept: string, start: number, end: number }[] };
        }
        
        let currentBreak = 0;
        if (shiftData.isOnBreak && shiftData.breakStartTime) {
            currentBreak = (now.getTime() - shiftData.breakStartTime) / 1000;
        }
        const totalBreaks = shiftData.totalExcludedTime + currentBreak;

        const spans: { dept: string, start: number, end: number }[] = [];
        const chronologicalHistory = [...(shiftData.history || [])]
            .filter(h => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote)
            .reverse();
        
        let currentSpan: { dept: string, start: number, end: number } | null = null;
        const activeDept = shiftData.department || 'aisles';
        
        if (chronologicalHistory.length === 0) {
            currentSpan = { dept: activeDept, start: shiftData.firstStartTime, end: now.getTime() };
            spans.push(currentSpan);
        } else {
            for (const h of chronologicalHistory) {
                const dept = h.department || 'aisles';
                const hStart = h.timestamp || shiftData.firstStartTime;
                const hEnd = hStart + ((h.elapsedSeconds || 0) * 1000);
                
                if (!currentSpan) {
                    currentSpan = { dept, start: shiftData.firstStartTime, end: hEnd };
                } else {
                    if (currentSpan.dept === dept) {
                        currentSpan.end = hEnd;
                    } else {
                        spans.push(currentSpan);
                        currentSpan = { dept, start: currentSpan.end, end: hEnd };
                    }
                }
            }
            
            if (currentSpan) {
                if (currentSpan.dept === activeDept) {
                    currentSpan.end = now.getTime();
                } else {
                    spans.push(currentSpan);
                    currentSpan = { dept: activeDept, start: currentSpan.end, end: now.getTime() };
                }
                spans.push(currentSpan);
            }
        }

        let totalAislesSeconds = 0;
        let totalOtherSeconds = 0;
        
        spans.forEach(span => {
            const sec = Math.max(0, (span.end - span.start) / 1000);
            if (span.dept === 'aisles' || span.dept?.startsWith('aisle')) {
                totalAislesSeconds += sec;
            } else {
                totalOtherSeconds += sec;
            }
        });
        
        const totalClockSeconds = totalAislesSeconds + totalOtherSeconds;
        
        let exempt = totalBreaks;
        const detail = calculateAislesExemptionDetail(totalClockSeconds, warehouseConfig?.exemptionRules);
        exempt += detail.total;

        const active = Math.max(1, totalClockSeconds - exempt);
        
        return {
            totalShiftSeconds: totalClockSeconds,
            totalBreakSeconds: totalBreaks,
            activeElapsedSeconds: active,
            activeElapsedHours: active / 3600,
            aislesExemptionDetail: detail,
            spans
        };
    }, [shiftData.firstStartTime, shiftData.totalExcludedTime, shiftData.isOnBreak, shiftData.breakStartTime, shiftData.department, shiftData.history, shiftData.isPicking, shiftData.pickStartTime, shiftData.isShiftFinalized, shiftData.lastStopTimestamp, now, warehouseConfig]);

    const { totalShiftSeconds, totalBreakSeconds, activeElapsedSeconds, activeElapsedHours, aislesExemptionDetail, spans } = statsSummary;

    const byDepartment = useMemo(() => {
        const result: Record<string, {
            cases: number;
            activeElapsedSeconds: number;
            rate: number;
            net: number;
            isRateGood: boolean;
            isNetGood: boolean;
            targetRate: number;
            breakSeconds: number;
        }> = {};

        // 1. Initialize clock seconds for each department from spans
        const deptClockSeconds: Record<string, number> = {};
        spans.forEach(span => {
            const duration = Math.max(0, (span.end - span.start) / 1000);
            const dept = span.dept || 'aisles';
            deptClockSeconds[dept] = (deptClockSeconds[dept] || 0) + duration;
        });

        // 2. Count completed cases for each department from history
        const deptCases: Record<string, number> = {};
        if (shiftData.history) {
            shiftData.history.forEach((h: any) => {
                if (h.gap === 'BREAK' || h.gap === 'NOTE' || h.isNote) return;
                const dept = h.department || 'aisles';
                const cases = parseInt(h.cases) || 0;
                deptCases[dept] = (deptCases[dept] || 0) + cases;
            });
        }
        // Note: active in-progress order cases are NOT added to finished deptCases until the order is completed,
        // preventing artificial pick rate spikes when starting a new order.

        // 3. Subtract breaks for each department
        const deptBreaks: Record<string, number> = {};
        
        // Handle current active break
        if (shiftData.isOnBreak && shiftData.breakStartTime) {
            const currentBreak = (now.getTime() - shiftData.breakStartTime) / 1000;
            const currentDeptKey = shiftData.department || 'aisles';
            deptBreaks[currentDeptKey] = (deptBreaks[currentDeptKey] || 0) + currentBreak;
        }

        // Handle historical breaks
        if (shiftData.history) {
            shiftData.history.forEach((h: any) => {
                if (h.gap !== 'BREAK') return;
                
                let breakDept = h.department;
                
                if (!breakDept && h.timestamp) {
                    const ts = h.timestamp;
                    const matchedSpan = spans.find(span => ts >= span.start && ts <= span.end);
                    if (matchedSpan) {
                        breakDept = matchedSpan.dept;
                    }
                }
                
                if (!breakDept) {
                    breakDept = 'aisles';
                }

                let duration = h.durationSeconds;
                if (duration === undefined) {
                    duration = parseFormattedTimeToSeconds(h.saved);
                }
                
                deptBreaks[breakDept] = (deptBreaks[breakDept] || 0) + duration;
            });
        }

        // 4. Calculate stats for each worked or active department
        const workedDepts = new Set<string>();
        if (shiftData.history) {
            shiftData.history.forEach((h: any) => {
                if (h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote) workedDepts.add(h.department || 'aisles');
            });
        }
        workedDepts.add(shiftData.department || 'aisles');

        workedDepts.forEach((deptKey) => {
            const cases = deptCases[deptKey] || 0;
            const clockSec = deptClockSeconds[deptKey] || 0;
            const breaksSec = deptBreaks[deptKey] || 0;
            
            let exemptSec = 0;
            const isAislesDept = deptKey.toLowerCase() === 'aisles' || deptKey.toLowerCase().startsWith('aisle');
            if (isAislesDept) {
                const detail = calculateAislesExemptionDetail(totalShiftSeconds, warehouseConfig?.exemptionRules);
                exemptSec = detail.total;
            }

            const activeSec = Math.max(1, clockSec - exemptSec - breaksSec);
            const hours = activeSec / 3600;
            const deptRate = hours > 0 ? Math.round(cases / hours) : 0;
            const tRate = getTargetRateForDept(deptKey, targetRate, warehouseConfig);
            const targetSec = (cases / tRate) * 3600;
            const netSec = targetSec - activeSec;

            result[deptKey] = {
                cases,
                activeElapsedSeconds: activeSec,
                rate: deptRate,
                net: Math.floor(netSec),
                isRateGood: deptRate >= tRate,
                isNetGood: netSec >= 0,
                targetRate: tRate,
                breakSeconds: breaksSec
            };
        });

        return result;
    }, [spans, totalShiftSeconds, shiftData.history, shiftData.isOnBreak, shiftData.breakStartTime, shiftData.department, now, targetRate, warehouseConfig]);

    // Perfect weighted target seconds calculation based on multi-department work history
    const aggregateTargetSeconds = useMemo(() => {
        if (!shiftData.history || shiftData.history.length === 0) {
            return (shiftData.totalCases / targetRate) * 3600;
        }
        
        let totalTargetSec = 0;
        let countedCases = 0;
        
        shiftData.history.forEach((h: any) => {
            if (h.gap === 'BREAK' || h.gap === 'NOTE' || h.isNote) return;
            const cases = parseInt(h.cases) || 0;
            const tRate = h.targetRate || targetRate; // fallback to current target
            totalTargetSec += (cases / tRate) * 3600;
            countedCases += cases;
        });
        
        // If there are extra cases not in history (e.g. initial state), count them with current targetRate
        const diffCases = shiftData.totalCases - countedCases;
        if (diffCases > 0) {
            totalTargetSec += (diffCases / targetRate) * 3600;
        }
        
        return totalTargetSec;
    }, [shiftData.history, shiftData.totalCases, targetRate]);

    // Dynamic, fair weighted target rate for comparison
    const weightedTargetRate = useMemo(() => {
        if (shiftData.totalCases === 0 || aggregateTargetSeconds === 0) return targetRate;
        return Math.round((shiftData.totalCases / aggregateTargetSeconds) * 3600);
    }, [shiftData.totalCases, aggregateTargetSeconds, targetRate]);

    // Rate calculations
    const rate = useMemo(() => {
        if (shiftData.totalCases === 0 || activeElapsedHours === 0) return 0;
        return Math.round(shiftData.totalCases / activeElapsedHours);
    }, [shiftData.totalCases, activeElapsedHours]);

    // Net time saved (in seconds)
    const net = useMemo(() => {
        if (shiftData.totalCases === 0) return 0;
        return Math.floor(aggregateTargetSeconds - activeElapsedSeconds);
    }, [shiftData.totalCases, aggregateTargetSeconds, activeElapsedSeconds]);

    // Performance indicators
    const isRateGood = rate >= weightedTargetRate;
    const isNetGood = net >= 0;

    // Consistency calculation
    const { consistencyPercent, shiftBestRate } = useMemo(() => {
        const historyRates = shiftData.history
            .filter(h => typeof h.rate === 'number' && h.rate > 0)
            .map(h => h.rate as number);
            
        if (historyRates.length === 0) return { consistencyPercent: 0, shiftBestRate: 0 };
        
        const avg = historyRates.reduce((a, b) => a + b, 0) / historyRates.length;
        const variance = historyRates.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / historyRates.length;
        const stdDev = Math.sqrt(variance);
        
        // Simple formula for consistency: 100 - (CV * 100)
        const cv = stdDev / avg;
        const consistency = Math.max(0, Math.min(100, Math.floor(100 * (1 - cv))));
        
        return {
            consistencyPercent: consistency,
            shiftBestRate: Math.max(...historyRates)
        };
    }, [shiftData.history]);

    // Performance Trends (last 10 actual picks)
    const trendData = useMemo(() => {
        return shiftData.history
            .filter((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote)
            .slice(-10)
            .map((entry: any, index: number) => ({
                name: entry.finish || `O${index + 1}`,
                rate: entry.rate,
                target: entry.target || targetRate
            }));
    }, [shiftData.history, targetRate]);

    // Current Order Stats
    const { finishTime, timeRemainingSecs, currentTargetSeconds, isWarning } = useMemo(() => {
        if (!shiftData.pickStartTime || !shiftData.isPicking) return { finishTime: null, timeRemainingSecs: 0, currentTargetSeconds: 0, isWarning: false };
        
        const cases = parseInt(shiftData.caseCount || '0');
        const currentTargetSeconds = cases * (3600 / targetRate);
        
        let currentBreak = 0;
        if (shiftData.isOnBreak && shiftData.breakStartTime) {
            currentBreak = (now.getTime() - shiftData.breakStartTime) / 1000;
        }
        
        const totalBreaks = shiftData.breakTimeDuringCurrentPick + currentBreak;
        const finish = new Date(shiftData.pickStartTime + ((currentTargetSeconds + totalBreaks) * 1000));
        const remaining = (finish.getTime() - now.getTime()) / 1000;
        
        return {
            finishTime: finish,
            timeRemainingSecs: remaining,
            currentTargetSeconds,
            isWarning: remaining <= 600 && remaining > 0 && currentTargetSeconds > 600
        };
    }, [shiftData.pickStartTime, shiftData.isPicking, shiftData.caseCount, shiftData.isOnBreak, shiftData.breakStartTime, shiftData.breakTimeDuringCurrentPick, targetRate, now]);

    // Real-time projected rate and milestones for the active picking dashboard
    const { projectedRate, historicalAvg, isNewPb, personalBest } = useMemo(() => {
        const currentCases = parseInt(shiftData.caseCount || '0') || 0;
        const histAvg = rate > 0 ? rate : targetRate;
        
        let livePace = histAvg;
        if (shiftData.isPicking && shiftData.pickStartTime) {
            const currentBreak = (shiftData.isOnBreak && shiftData.breakStartTime) ? (now.getTime() - shiftData.breakStartTime) / 1000 : 0;
            const totalCurrentBreaks = shiftData.breakTimeDuringCurrentPick + currentBreak;
            const elapsedSec = (now.getTime() - shiftData.pickStartTime - (totalCurrentBreaks * 1000)) / 1000;
            
            if (currentCases > 0) {
                const deptTarget = getTargetRateForDept(shiftData.department || 'aisles', targetRate, warehouseConfig);
                const targetSecs = (currentCases / deptTarget) * 3600;
                // Live pace compares elapsed time against target order time to avoid artificial initial spikes
                const effectiveSecs = Math.max(elapsedSec, targetSecs);
                livePace = Math.round((currentCases / effectiveSecs) * 3600);
            }
        }

        const deptKey = `${shiftData.zone}_${shiftData.department}`;
        const pbRate = (shiftData.personalBests && shiftData.personalBests[deptKey]) || 0;
        const personalBestValue = pbRate > 0 ? pbRate : Math.floor(targetRate * 1.25);
        const newPbActive = livePace > personalBestValue && personalBestValue > 0;

        return {
            projectedRate: livePace,
            historicalAvg: histAvg,
            isNewPb: newPbActive,
            personalBest: personalBestValue
        };
    }, [shiftData.isPicking, shiftData.pickStartTime, shiftData.caseCount, shiftData.isOnBreak, shiftData.breakStartTime, shiftData.breakTimeDuringCurrentPick, shiftData.zone, shiftData.department, shiftData.personalBests, rate, targetRate, now]);

    return {
        totalShiftSeconds,
        totalBreakSeconds,
        activeElapsedSeconds,
        activeElapsedHours,
        rate,
        net,
        isRateGood,
        isNetGood,
        consistencyPercent,
        shiftBestRate,
        trendData,
        finishTime,
        timeRemainingSecs,
        currentTargetSeconds,
        isWarning,
        isAisles,
        accruedPrep: aislesExemptionDetail.prep,
        accruedDinner: aislesExemptionDetail.dinner,
        accruedCleanup: aislesExemptionDetail.cleanup,
        finalExemption: aislesExemptionDetail.total,
        projectedRate,
        historicalAvg,
        isNewPb,
        personalBest,
        byDepartment
    };
};
