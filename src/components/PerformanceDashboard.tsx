import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
    Award, 
    Activity, 
    Sparkles, 
    ShieldAlert, 
    Clock, 
    Coffee, 
    Package, 
    TrendingUp, 
    Layers, 
    BarChart3, 
    History, 
    Zap,
    CheckCircle2,
    Scale,
    Timer,
    Flame,
    Users,
    ChevronRight,
    PieChart as PieIcon
} from 'lucide-react';
import { 
    LineChart, 
    Line, 
    BarChart, 
    Bar, 
    AreaChart,
    Area,
    PieChart,
    Pie,
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    ResponsiveContainer, 
    ReferenceLine,
    Cell
} from 'recharts';
import { getLocalShiftSummaries } from '../services/indexedDbService';
import { AnimatedNumber } from './ui/AnimatedNumber';
import { calculateEstimatedWeightKg, formatWeightTonnes } from '../constants/weightBaselines';

export const PerformanceDashboard = ({ 
    theme, 
    shiftData, 
    getCleanName,
    consistencyPercent,
    shiftBestRate,
    isAisles,
    stats,
    formatTime,
    liveUsers,
    trendData,
    targetRate,
    isAdmin,
    allAdminSummaries,
    updateShiftData
}: { 
    theme: any, 
    shiftData: any, 
    getCleanName: () => string,
    consistencyPercent: number,
    shiftBestRate: number,
    isAisles: boolean,
    stats: any,
    formatTime: (ms: number) => string,
    liveUsers: any[],
    trendData: any[],
    targetRate: number,
    isAdmin: boolean,
    allAdminSummaries: any[],
    updateShiftData?: (updates: any) => void
}) => {
    const [pastShifts, setPastShifts] = useState<any[]>([]);
    const [loadingPastShifts, setLoadingPastShifts] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'charts' | 'history'>('overview');

    const userName = getCleanName ? getCleanName() : 'Operator';

    useEffect(() => {
        let isMounted = true;
        if (userName) {
            setLoadingPastShifts(true);
            getLocalShiftSummaries(userName)
                .then((res) => {
                    if (isMounted && res && Array.isArray(res)) {
                        setPastShifts(res);
                    }
                })
                .catch((err) => console.error('Failed to load past shifts:', err))
                .finally(() => {
                    if (isMounted) setLoadingPastShifts(false);
                });
        }
        return () => { isMounted = false; };
    }, [userName]);

    // Format duration in HH:MM:SS or MM:SS
    const formatDuration = (seconds: number) => {
        if (!seconds || isNaN(seconds) || seconds < 0) return '00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) {
            return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
        }
        return `${m}m ${s.toString().padStart(2, '0')}s`;
    };

    // Current shift calculations
    const activePickSeconds = stats?.activeElapsedSeconds || 0;
    const totalBreakSeconds = stats?.totalBreakSeconds || 0;
    const totalShiftSeconds = stats?.totalShiftSeconds || 0;
    const totalCases = shiftData?.totalCases || 0;

    const completedOrders = useMemo(() => {
        return (shiftData?.history || []).filter((item: any) => item.cases && item.cases !== '-' && !item.gap);
    }, [shiftData?.history]);

    const orderCount = completedOrders.length;
    const avgOrderDuration = orderCount > 0 ? Math.round(activePickSeconds / orderCount) : 0;
    const avgCasesPerOrder = orderCount > 0 ? (totalCases / orderCount).toFixed(1) : '0';
    const currentPickRate = stats?.activeElapsedHours > 0 ? Math.round(totalCases / stats.activeElapsedHours) : 0;

    // Department Breakdown for current shift with estimated weights
    const deptStats = useMemo(() => {
        const map: Record<string, { cases: number; count: number; totalSecs: number }> = {};
        completedOrders.forEach((item: any) => {
            const d = item.department || shiftData?.department || 'Aisles';
            const c = typeof item.cases === 'number' ? item.cases : parseInt(item.cases) || 0;
            const dur = item.durationSeconds || 0;
            if (!map[d]) map[d] = { cases: 0, count: 0, totalSecs: 0 };
            map[d].cases += c;
            map[d].count += 1;
            map[d].totalSecs += dur;
        });
        return Object.entries(map).map(([dept, data]) => {
            const kg = calculateEstimatedWeightKg([{ dept, cases: data.cases }]);
            const formatted = formatWeightTonnes(kg);
            return {
                dept,
                cases: data.cases,
                count: data.count,
                rate: data.totalSecs > 0 ? Math.round((data.cases / data.totalSecs) * 3600) : 0,
                weightKg: kg,
                tonnes: formatted.tonnes,
                weightDisplay: `${formatted.value} ${formatted.unit}`
            };
        });
    }, [completedOrders, shiftData?.department]);

    // Hourly Distribution Calculation for Bar Chart
    const hourlyOutputData = useMemo(() => {
        if (!completedOrders || completedOrders.length === 0) {
            return [];
        }
        const hourMap: Record<string, { hour: string; cases: number; orders: number }> = {};
        
        completedOrders.forEach((order: any) => {
            const ts = order.timestamp || order.completedAt || Date.now();
            const dateObj = new Date(ts);
            const hourLabel = `${dateObj.getHours().toString().padStart(2, '0')}:00`;
            const c = typeof order.cases === 'number' ? order.cases : parseInt(order.cases) || 0;

            if (!hourMap[hourLabel]) {
                hourMap[hourLabel] = { hour: hourLabel, cases: 0, orders: 0 };
            }
            hourMap[hourLabel].cases += c;
            hourMap[hourLabel].orders += 1;
        });

        return Object.values(hourMap).sort((a, b) => a.hour.localeCompare(b.hour));
    }, [completedOrders]);

    // Merged past shift history
    const mergedPastShifts = useMemo(() => {
        const list = [...pastShifts];
        if (allAdminSummaries && allAdminSummaries.length > 0) {
            allAdminSummaries.forEach((adminItem: any) => {
                if (adminItem.userName?.toUpperCase() === userName.toUpperCase()) {
                    const exists = list.some(s => s.id === adminItem.id || (s.date === adminItem.date && s.shiftCode === adminItem.shiftCode));
                    if (!exists) {
                        list.push(adminItem);
                    }
                }
            });
        }
        return list;
    }, [pastShifts, allAdminSummaries, userName]);

    // Lifetime analytics
    const lifetimeMetrics = useMemo(() => {
        let pastTotalCases = 0;
        let pastRateSum = 0;
        let bestRate = shiftBestRate || 0;

        mergedPastShifts.forEach((s: any) => {
            const cases = s.cases || s.totalCases || 0;
            const rate = s.finalRate || s.rate || 0;
            pastTotalCases += cases;
            pastRateSum += rate;
            if (rate > bestRate) bestRate = rate;
        });

        const totalShiftCount = mergedPastShifts.length + (totalCases > 0 ? 1 : 0);
        const lifetimeTotalCases = pastTotalCases + totalCases;
        const avgLifetimeRate = mergedPastShifts.length > 0 ? Math.round(pastRateSum / mergedPastShifts.length) : (currentPickRate || 0);

        return {
            totalShiftCount,
            lifetimeTotalCases,
            avgLifetimeRate,
            bestRate
        };
    }, [mergedPastShifts, totalCases, currentPickRate, shiftBestRate]);

    // Live Physical Workload & Tonnage Calculation
    const weightMetrics = useMemo(() => {
        const estKg = stats?.totalWeightKg ?? calculateEstimatedWeightKg(deptStats);
        const formatted = formatWeightTonnes(estKg);
        const tactSec = stats?.tactTimeSeconds ?? (totalCases > 0 && activePickSeconds > 0 ? parseFloat((activePickSeconds / totalCases).toFixed(1)) : 0);
        const kgPerOrder = orderCount > 0 ? Math.round(estKg / orderCount) : 0;
        return {
            totalKg: estKg,
            displayValue: formatted.value,
            unit: formatted.unit,
            tonnes: formatted.tonnes,
            tactTime: tactSec,
            kgPerOrder
        };
    }, [stats?.totalWeightKg, stats?.tactTimeSeconds, deptStats, totalCases, activePickSeconds, orderCount]);

    // Chart colors
    const DEPT_COLORS = ['#38bdf8', '#34d399', '#f59e0b', '#ec4899', '#a855f7', '#6366f1'];

    const recentShiftsData = useMemo(() => {
        const sorted = [...mergedPastShifts]
            .sort((a, b) => {
                const dateA = a.date || '';
                const dateB = b.date || '';
                return dateA.localeCompare(dateB);
            })
            .slice(-5);
        return sorted.map((s, idx) => {
            const rate = s.finalRate || s.rate || 0;
            const cases = s.cases || s.totalCases || 0;
            let label = s.date || `Shift ${idx + 1}`;
            if (label.includes('-')) {
                const parts = label.split('-');
                if (parts.length === 3) label = `${parts[2]}/${parts[1]}`;
            }
            return {
                name: label,
                rate: rate,
                cases: cases,
                target: targetRate || 180
            };
        });
    }, [mergedPastShifts, targetRate]);

    const pieChartData = useMemo(() => {
        return deptStats.map((ds, idx) => ({
            name: ds.dept,
            value: ds.cases,
            rate: ds.rate,
            color: DEPT_COLORS[idx % DEPT_COLORS.length]
        }));
    }, [deptStats]);

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex-1 overflow-y-auto no-scrollbar pb-safe-bottom ${theme.font}`}
        >
            <div className="p-4 space-y-4 max-w-md mx-auto">
                {/* Top Profile & Fire Streak Header */}
                <div className="flex items-center gap-2 w-full">
                    <div className="flex flex-1 items-center gap-1 bg-orange-500/10 px-3.5 py-2.5 rounded-2xl border border-orange-500/20 justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <div className="flex flex-col">
                                <span className="text-[9px] text-orange-400/80 font-black uppercase tracking-wider leading-none mb-0.5">Fire Streak</span>
                                <span className="text-orange-500 font-black text-xl leading-none">{shiftData?.streak || 0}</span>
                            </div>
                        </div>
                        {shiftData?.shiftCode && (
                            <div className="flex flex-col items-end">
                                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-wider">Shift Code</span>
                                <span className="text-amber-400 font-mono font-extrabold text-[10px] bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded tracking-wider">
                                    {shiftData.shiftCode}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Operator Profile & Level Progress */}
                <div className={`${theme.panel} ${theme.radius} border border-slate-700/50 overflow-hidden shadow-lg`}>
                    <div className="px-4 py-2.5 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            <span className="font-extrabold tracking-wide uppercase">{userName}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">
                            {shiftData?.department || 'Aisles'}
                        </div>
                    </div>
                    {/* XP Progress Bar */}
                    <div className="px-3 pb-2.5 pt-1.5 bg-slate-800/80">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-[9px] font-black text-white italic tracking-tighter">LEVEL {shiftData?.level || 1}</span>
                            <span className="text-[9px] font-mono font-bold text-slate-400">{(shiftData?.xp || 0)} / {(shiftData?.level || 1) * 1000} XP</span>
                        </div>
                        <div className={`h-1.5 w-full bg-slate-950 ${theme.radius} overflow-hidden`}>
                            <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, ((shiftData?.xp || 0) / ((shiftData?.level || 1) * 1000)) * 100)}%` }}
                                className={`h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.4)] ${theme.radius}`}
                            />
                        </div>
                    </div>
                    {/* Steps, Distance, Stride Efficiency */}
                    <div className="grid grid-cols-3 divide-x divide-slate-700/50">
                        <div className="p-2.5 text-center bg-slate-900/40">
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">
                                STEPS
                            </div>
                            <div className="text-amber-400 font-black text-lg italic tracking-tight font-mono">
                                <AnimatedNumber value={shiftData?.steps || 0} />
                            </div>
                        </div>
                        <div className="p-2.5 text-center bg-slate-900/40">
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">DISTANCE</div>
                            <div className="text-emerald-400 font-black text-lg italic tracking-tight font-mono">
                                <AnimatedNumber 
                                    value={shiftData?.steps ? parseFloat((shiftData.steps * 0.00075).toFixed(2)) : 0} 
                                    formatter={(v) => v.toFixed(2)}
                                    suffix="km"
                                />
                            </div>
                        </div>
                        <div className="p-2.5 text-center bg-slate-900/40">
                            <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1 leading-none">EFFICIENCY</div>
                            <div className="text-sky-400 font-black text-lg italic tracking-tight font-mono">
                                {shiftData?.totalCases > 0 ? (
                                    <AnimatedNumber 
                                        value={Math.round(shiftData.steps / shiftData.totalCases)} 
                                        suffix="st/cs"
                                    />
                                ) : (
                                    <span>--</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Interactive Segmented Navigation Tabs */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-2xl border border-slate-800/80">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'overview'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <BarChart3 size={13} />
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('charts')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'charts'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <TrendingUp size={13} />
                        Analytics
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            activeTab === 'history'
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-400 hover:text-white hover:bg-slate-900'
                        }`}
                    >
                        <History size={13} />
                        History
                    </button>
                </div>

                {/* TAB 1: OVERVIEW METRICS */}
                {activeTab === 'overview' && (
                    <div className="space-y-4">
                        {/* Consistency & Peak Rate */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner shrink-0">
                                    <Award className="text-emerald-400" size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-wider leading-none mb-1">Consistency</h4>
                                    <div className="text-xl font-black text-white leading-none font-mono">
                                        <AnimatedNumber value={consistencyPercent} suffix="%" />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-inner shrink-0">
                                    <Activity className="text-sky-400" size={20} />
                                </div>
                                <div className="min-w-0">
                                    <h4 className="text-slate-400 text-[10px] font-black uppercase tracking-wider leading-none mb-1">Peak Rate</h4>
                                    <div className="text-xl font-black text-white leading-none font-mono">
                                        <AnimatedNumber value={lifetimeMetrics.bestRate} suffix=" P/H" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Bento-Style KPI Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Card 1: Active Pick Time */}
                            <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between min-h-[125px] hover:border-slate-700/80 transition-all">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ACTIVE PICK TIME</span>
                                        <Clock className="text-emerald-400" size={16} />
                                    </div>
                                    <div className="text-white font-mono font-black text-lg mt-2 leading-tight">
                                        {formatDuration(activePickSeconds)}
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (activePickSeconds / (7.5 * 3600)) * 100)}%` }}
                                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.3)]"
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase">
                                        <span>Breaks: {formatDuration(totalBreakSeconds)}</span>
                                        <span>Goal: 7.5h</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: Average Cases per Order */}
                            <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between min-h-[125px] hover:border-slate-700/80 transition-all">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">AVG CASES / ORD</span>
                                        <Package className="text-purple-400" size={16} />
                                    </div>
                                    <div className="text-purple-300 font-mono font-black text-lg mt-2 leading-tight">
                                        <AnimatedNumber value={avgCasesPerOrder} suffix=" cs" />
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (parseFloat(avgCasesPerOrder) / 30) * 100)}%` }}
                                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-400 rounded-full shadow-[0_0_8px_rgba(168,85,247,0.3)]"
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase">
                                        <span>Orders: {completedOrders.length}</span>
                                        <span>Pace: {currentPickRate} P/H</span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: Tact Speed per Case */}
                            <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between min-h-[125px] hover:border-slate-700/80 transition-all">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">TACT TIME (SPEED)</span>
                                        <Timer className="text-rose-400" size={16} />
                                    </div>
                                    <div className="text-rose-300 font-mono font-black text-lg mt-2 leading-tight">
                                        {weightMetrics.tactTime > 0 ? (
                                            <AnimatedNumber value={weightMetrics.tactTime} suffix=" s/cs" />
                                        ) : (
                                            <span>--</span>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${weightMetrics.tactTime > 0 ? Math.min(100, Math.max(10, (1 - (weightMetrics.tactTime - 10) / 40) * 100)) : 0}%` }}
                                            className="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full shadow-[0_0_8px_rgba(244,63,94,0.3)]"
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase font-sans">
                                        <span>Target: &lt;20s/cs</span>
                                        <span className={weightMetrics.tactTime > 0 && weightMetrics.tactTime <= 20 ? "text-emerald-400" : "text-rose-400"}>
                                            {weightMetrics.tactTime > 0 && weightMetrics.tactTime <= 20 ? "EXCELLENT" : (weightMetrics.tactTime > 20 ? "PACE UP" : "IDLE")}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: Weight Lifted */}
                            <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-3xl flex flex-col justify-between min-h-[125px] hover:border-slate-700/80 transition-all">
                                <div>
                                    <div className="flex justify-between items-start">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">WEIGHT LIFTED</span>
                                        <Scale className="text-amber-400" size={16} />
                                    </div>
                                    <div className="text-amber-300 font-mono font-black text-lg mt-2 leading-tight">
                                        <AnimatedNumber value={weightMetrics.displayValue} suffix={` ${weightMetrics.unit}`} />
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(100, (weightMetrics.totalKg / 2000) * 100)}%` }}
                                            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]"
                                        />
                                    </div>
                                    <div className="flex justify-between text-[8px] text-slate-500 font-bold uppercase">
                                        <span>~{weightMetrics.kgPerOrder} kg/ord</span>
                                        <span>Goal: 2.0 T</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Live Team Feed */}
                        <div className="bg-slate-950/60 rounded-3xl p-4 border border-slate-900">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Users size={12} className="text-emerald-400" />
                                    Live Warehouse Peers
                                </h4>
                                <span className="text-[10px] text-slate-500 font-bold uppercase">{liveUsers.length} Active</span>
                            </div>
                            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
                                {liveUsers.map((user, idx) => {
                                    const isMe = user.name === userName;
                                    return (
                                        <div key={user.id || idx} className={`flex justify-between items-center bg-slate-900/50 border p-2.5 rounded-2xl ${isMe ? 'border-sky-500/50 bg-sky-500/5' : 'border-slate-800/30'}`}>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${isMe ? 'bg-sky-500/20 border-sky-500/30' : 'bg-slate-800 border-slate-700'}`}>
                                                    <span className={`text-[10px] font-bold ${isMe ? 'text-sky-400' : 'text-slate-400'}`}>{user.name?.charAt(0) || '?'}</span>
                                                </div>
                                                <div>
                                                    <div className="text-[11px] font-black text-slate-200">
                                                        {user.name} {isMe && <span className="text-[9px] text-sky-400 font-bold ml-1 uppercase">(You)</span>}
                                                    </div>
                                                    <div className="text-[8px] text-slate-500 font-bold uppercase tracking-tighter">{user.department}</div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`text-xs font-black ${user.rate >= 200 ? 'text-emerald-400' : 'text-slate-300'}`}>{user.rate} <span className="text-[8px] opacity-70">P/H</span></div>
                                                <div className="text-[8px] text-slate-600 font-mono uppercase tracking-tighter">
                                                    {user.status === 'picking' ? '● Picking' : user.status === 'break' ? '● Break' : user.status === 'finished' ? '● Finished' : '● Idle'}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {liveUsers.length === 0 && (
                                    <div className="py-6 text-center">
                                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No active peers connected</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                 {/* TAB 2: INTERACTIVE CHARTS & VELOCITY */}
                {activeTab === 'charts' && (
                    <div className="space-y-4">
                        {/* Rate Velocity Progression Curve */}
                        <div className={`${theme.panel} p-4.5 ${theme.radius} border border-slate-800/80 shadow-lg`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <TrendingUp size={16} className="text-emerald-400" />
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Pick Rate Velocity</h3>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Rolling Order Performance</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                                    Target: {targetRate || 180} P/H
                                </span>
                            </div>

                            {trendData && trendData.length > 1 ? (
                                <div className="h-[190px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                                            <YAxis 
                                                stroke="#64748b" 
                                                fontSize={9} 
                                                axisLine={false} 
                                                tickLine={false}
                                                domain={['dataMin - 15', 'dataMax + 15']}
                                            />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                            />
                                            <ReferenceLine y={targetRate || 180} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Target', fill: '#ef4444', fontSize: 9, position: 'right' }} />
                                            <Line 
                                                type="monotone" 
                                                dataKey="rate" 
                                                name="Actual Rate"
                                                stroke="#10b981" 
                                                strokeWidth={3} 
                                                dot={{ fill: '#0f172a', stroke: '#10b981', strokeWidth: 2, r: 3 }}
                                                activeDot={{ r: 5, strokeWidth: 0 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                    Complete at least 2 pick runs to view live velocity curve
                                </div>
                            )}
                        </div>

                        {/* Recent Shifts Performance (AreaChart comparison) */}
                        <div className={`${theme.panel} p-4.5 ${theme.radius} border border-slate-800/80 shadow-lg`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <Award size={16} className="text-amber-400" />
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Recent Shifts Performance</h3>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Progression vs Target Threshold</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black font-mono text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full">
                                    Target: {targetRate || 180} P/H
                                </span>
                            </div>

                            {recentShiftsData.length > 0 ? (
                                <div className="h-[180px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={recentShiftsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="rateColor" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.4}/>
                                                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0.0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                                                formatter={(value, name) => [
                                                    name === 'rate' ? `${value} P/H` : `${value} cases`,
                                                    name === 'rate' ? 'Final Rate' : 'Total Cases'
                                                ]}
                                            />
                                            <ReferenceLine y={targetRate || 180} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'Target', fill: '#ef4444', fontSize: 8, position: 'right' }} />
                                            <Area 
                                                type="monotone" 
                                                dataKey="rate" 
                                                stroke="#818cf8" 
                                                strokeWidth={3} 
                                                fillOpacity={1} 
                                                fill="url(#rateColor)" 
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                    No historical shifts recorded yet
                                </div>
                            )}
                        </div>

                        {/* Hourly Volume Output Bar Chart */}
                        <div className={`${theme.panel} p-4.5 ${theme.radius} border border-slate-800/80 shadow-lg`}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <BarChart3 size={16} className="text-sky-400" />
                                    <div>
                                        <h3 className="text-xs font-black text-white uppercase tracking-wider">Hourly Cases Output</h3>
                                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Pacing & Fatigue Tracking</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-black font-mono text-sky-400 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full">
                                    {totalCases} Total Cases
                                </span>
                            </div>

                            {hourlyOutputData.length > 0 ? (
                                <div className="h-[170px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={hourlyOutputData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="hour" stroke="#64748b" fontSize={9} tickLine={false} />
                                            <YAxis stroke="#64748b" fontSize={9} axisLine={false} tickLine={false} />
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                                                formatter={(value) => [`${value} cases`, 'Output']}
                                            />
                                            <Bar dataKey="cases" radius={[6, 6, 0, 0]}>
                                                {hourlyOutputData.map((_, index) => (
                                                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#38bdf8' : '#6366f1'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-slate-500 text-[10px] uppercase font-bold tracking-wider">
                                    Log finished orders to populate hourly distribution
                                </div>
                            )}
                        </div>

                        {/* Department Volume Share Circular Ring */}
                        {deptStats.length > 0 && (
                            <div className={`${theme.panel} p-4.5 ${theme.radius} border border-slate-800/80 shadow-lg space-y-4`}>
                                <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                                    <div className="flex items-center gap-2">
                                        <PieIcon size={16} className="text-amber-400" />
                                        <div>
                                            <h3 className="text-xs font-black text-white uppercase tracking-wider">Chamber Volume Share</h3>
                                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Case distribution across warehouse</p>
                                        </div>
                                    </div>
                                    <span className="text-[9px] font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded">
                                        {weightMetrics.displayValue} {weightMetrics.unit} Total
                                    </span>
                                </div>

                                <div className="flex items-center justify-between gap-4">
                                    {/* Doughnut Chart with Absolute Centered Text */}
                                    <div className="relative w-[130px] h-[130px] flex-shrink-0 mx-auto">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={pieChartData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={42}
                                                    outerRadius={58}
                                                    paddingAngle={3}
                                                    dataKey="value"
                                                >
                                                    {pieChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: '#090d16', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                                                    formatter={(value) => [`${value} cases`, 'Volume']}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none">
                                            <span className="text-[8px] uppercase text-slate-500 font-black tracking-widest leading-none">TOTAL</span>
                                            <span className="text-base font-black text-white font-mono mt-0.5">{totalCases}</span>
                                            <span className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">cases</span>
                                        </div>
                                    </div>

                                    {/* Small inline list summary */}
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                        {pieChartData.slice(0, 3).map((item, idx) => {
                                            const pct = totalCases > 0 ? Math.round((item.value / totalCases) * 100) : 0;
                                            return (
                                                <div key={idx} className="flex items-center justify-between text-[10px] font-bold min-w-0">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                                                        <span className="text-slate-300 truncate capitalize">{item.name}</span>
                                                    </div>
                                                    <span className="text-slate-400 font-mono shrink-0">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                        {pieChartData.length > 3 && (
                                            <div className="text-[8px] text-slate-500 font-black uppercase text-right tracking-wider pt-0.5 border-t border-slate-800/40">
                                                +{pieChartData.length - 3} more chambers
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2 pt-2 border-t border-slate-800/60">
                                    {deptStats.map((ds, idx) => {
                                        const color = DEPT_COLORS[idx % DEPT_COLORS.length];
                                        const pct = totalCases > 0 ? Math.round((ds.cases / totalCases) * 100) : 0;
                                        return (
                                            <div key={idx} className="bg-slate-950 border border-slate-800/80 p-3 rounded-2xl space-y-1.5">
                                                <div className="flex justify-between items-center text-xs">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                                                        <span className="font-extrabold text-white capitalize">{ds.dept}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 font-mono text-xs font-bold">
                                                        <span className="text-slate-400">{ds.cases} cs</span>
                                                        <span className="text-emerald-400">{ds.rate} P/H</span>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                                                    <span>{ds.count} Orders • {ds.weightDisplay}</span>
                                                    <span className="text-slate-400">{pct}% volume</span>
                                                </div>
                                                <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB 3: LIFETIME & HISTORICAL SHIFTS */}
                {activeTab === 'history' && (
                    <div className="space-y-4">
                        {/* Lifetime Aggregate Stats */}
                        <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Lifetime Total Cases</div>
                                <div className="text-white font-extrabold text-base font-mono">
                                    <AnimatedNumber value={lifetimeMetrics.lifetimeTotalCases} suffix=" cs" />
                                </div>
                                <div className="text-[8px] text-slate-500 font-mono mt-0.5">{lifetimeMetrics.totalShiftCount} Shifts Recorded</div>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                                <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Historical Avg Rate</div>
                                <div className="text-emerald-400 font-extrabold text-base font-mono">
                                    <AnimatedNumber value={lifetimeMetrics.avgLifetimeRate} suffix=" P/H" />
                                </div>
                                <div className="text-[8px] text-emerald-400/80 font-mono mt-0.5">Peak Record: {lifetimeMetrics.bestRate} P/H</div>
                            </div>
                        </div>

                        {/* Archived Shift Logs List */}
                        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                    <History size={13} className="text-sky-400" />
                                    ARCHIVED SHIFT LOGS
                                </h4>
                                {loadingPastShifts && <span className="text-[9px] text-sky-400 animate-pulse font-bold">Syncing...</span>}
                            </div>

                            {mergedPastShifts.length > 0 ? (
                                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                                    {mergedPastShifts.map((s, idx) => {
                                        const dateDisplay = s.date || (s.clockInTime ? new Date(s.clockInTime).toLocaleDateString() : 'Previous Shift');
                                        const cases = s.cases || s.totalCases || 0;
                                        const rate = s.finalRate || s.rate || 0;
                                        const code = s.shiftCode || s.id || `SHF-${idx + 1}`;

                                        return (
                                            <div key={s.id || idx} className="bg-slate-950 border border-slate-800/60 p-3 rounded-2xl flex justify-between items-center text-xs">
                                                <div className="space-y-0.5">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-slate-200">{dateDisplay}</span>
                                                        <span className="text-[9px] font-mono text-amber-400/90 bg-amber-950/50 px-1.5 py-0.2 border border-amber-800/40 rounded">
                                                            {code.slice(0, 16)}
                                                        </span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-500 uppercase font-bold flex items-center gap-2">
                                                        <span>{s.department || 'Aisles'}</span>
                                                        {s.breakSeconds && <span>• Break: {formatDuration(s.breakSeconds)}</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-emerald-400 font-black text-sm font-mono">{rate} <span className="text-[9px] font-normal">P/H</span></div>
                                                    <div className="text-[9px] text-slate-400 font-mono">{cases} cases</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="py-8 text-center text-[10px] text-slate-500 uppercase font-bold tracking-wider bg-slate-950/40 rounded-2xl border border-slate-800/40">
                                    No past shift summaries archived yet. Finalize shifts to build history log!
                                </div>
                            )}
                        </div>

                        {/* Admin Shift Global View */}
                        {isAdmin && (
                            <div className="bg-slate-950/50 rounded-3xl p-4 border border-slate-900 mb-6">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                                    <ShieldAlert size={10} className="text-red-400" />
                                    Admin Shift Global View
                                </h4>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                    <div className="flex justify-between items-center p-2 text-[10px] uppercase font-black text-slate-500 bg-slate-900 rounded-lg">
                                        <div className="flex-1">User</div>
                                        <div className="w-16 text-center">Region</div>
                                        <div className="w-16 text-center">Board</div>
                                        <div className="w-16 text-right">P/H</div>
                                    </div>
                                    {allAdminSummaries.map((s: any, index: number) => {
                                        const getBoardDisplay = (dept: string) => {
                                            if (!dept) return '-';
                                            if (dept.includes('/')) {
                                                const parts = dept.split('/');
                                                return parts[parts.length - 1].toUpperCase();
                                            }
                                            return dept.split(' ')[0].toUpperCase();
                                        };

                                        return (
                                            <div key={`${s.id || s.docId || index}_${index}`} className="flex justify-between items-center bg-slate-900/50 border border-slate-800/30 p-2 rounded-xl text-[11px]">
                                                <div className="flex-1 font-bold text-slate-200 truncate pr-2">{s.userName}</div>
                                                <div className="w-16 text-center font-mono text-slate-400">{s.zone || '-'}</div>
                                                <div className="w-16 text-center font-mono text-slate-400">{getBoardDisplay(s.department)}</div>
                                                <div className="w-16 text-right font-mono text-emerald-400 font-bold">{s.finalRate}</div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

