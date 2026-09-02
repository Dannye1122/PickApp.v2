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
    Calendar, 
    Layers, 
    BarChart3, 
    Hash, 
    History, 
    Zap,
    CheckCircle2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getLocalShiftSummaries } from '../services/indexedDbService';

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

    // Department Breakdown for current shift
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
        return Object.entries(map).map(([dept, data]) => ({
            dept,
            cases: data.cases,
            count: data.count,
            rate: data.totalSecs > 0 ? Math.round((data.cases / data.totalSecs) * 3600) : 0
        }));
    }, [completedOrders, shiftData?.department]);

    // Merged past shift history
    const mergedPastShifts = useMemo(() => {
        const list = [...pastShifts];
        // Add admin summaries matching this user if not already in list
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

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex-1 overflow-y-auto no-scrollbar pb-safe-bottom ${theme.font}`}
        >
            <div className="p-4 space-y-4 max-w-md mx-auto">
                {/* Fire Streak & Watermark Code Banner */}
                <div className="flex items-center gap-2 w-full mb-1">
                    <div className="flex flex-1 items-center gap-1 bg-orange-500/10 px-4 py-2.5 rounded-2xl border border-orange-500/20 justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🔥</span>
                            <div className="flex flex-col">
                                <span className="text-[10px] text-orange-400/80 font-black uppercase tracking-wider leading-none mb-0.5">Fire Streak</span>
                                <span className="text-orange-500 font-black text-2xl leading-none">{shiftData?.streak || 0}</span>
                            </div>
                        </div>
                        {shiftData?.shiftCode && (
                            <div className="flex flex-col items-end">
                                <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Shift Code</span>
                                <span className="text-amber-400 font-mono font-extrabold text-[11px] bg-amber-950/70 border border-amber-800/60 px-2 py-0.5 rounded tracking-wider">
                                    {shiftData.shiftCode}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Operator Profile & Level Progress */}
                <div className={`${theme.panel} ${theme.radius} border border-slate-700/50 overflow-hidden`}>
                    <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-200">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            {userName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">
                            {shiftData?.department || 'Aisles'}
                        </div>
                    </div>
                    {/* XP Progress Bar */}
                    <div className="px-3 pb-3 bg-slate-800/80">
                        <div className="flex justify-between items-end mb-1.5 mt-2">
                            <span className="text-[10px] font-black text-white italic tracking-tighter">LEVEL {shiftData?.level || 1}</span>
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
                    {/* Steps, Distance, Efficiency */}
                    <div className="grid grid-cols-3 divide-x divide-slate-700/50">
                        <div className="p-3 text-center bg-slate-900/40">
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">
                                STEPS
                            </div>
                            <div className="text-amber-400 font-black text-xl italic tracking-tight">{shiftData?.steps ? shiftData.steps.toLocaleString() : 0}</div>
                        </div>
                        <div className="p-3 text-center bg-slate-900/40">
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">DISTANCE</div>
                            <div className="text-emerald-400 font-black text-xl italic tracking-tight">{shiftData?.steps ? (shiftData.steps * 0.00075).toFixed(2) : '0.00'} <span className="text-[10px] font-bold opacity-60 not-italic uppercase ml-0.5">km</span></div>
                        </div>
                        <div className="p-3 text-center bg-slate-900/40">
                            <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">EFFICIENCY</div>
                            <div className="text-sky-400 font-black text-xl italic tracking-tight">{shiftData?.totalCases > 0 ? Math.round(shiftData.steps / shiftData.totalCases) : '--'} <span className="text-[10px] font-bold opacity-60 not-italic uppercase ml-0.5">st/cs</span></div>
                        </div>
                    </div>
                </div>

                {/* Consistency & Peak PH */}
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-4 rounded-3xl mb-4 flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-inner">
                            <Award className="text-emerald-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-slate-400 text-[11px] font-black uppercase tracking-widest leading-none mb-1">Consistency</h4>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white leading-none tracking-tighter">{consistencyPercent}%</span>
                                <span className="text-[11px] text-emerald-500/80 font-black mb-0.5 italic tracking-tighter uppercase leading-none">Nominal</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-8 w-[1px] bg-slate-800"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 flex items-center justify-center border border-sky-500/20 shadow-inner">
                            <Activity className="text-sky-400" size={24} />
                        </div>
                        <div>
                            <h4 className="text-slate-400 text-[11px] font-black uppercase tracking-widest leading-none mb-1">Peak PH</h4>
                            <div className="flex items-end gap-2">
                                <span className="text-2xl font-black text-white leading-none tracking-tighter">{lifetimeMetrics.bestRate}</span>
                                <span className="text-[11px] text-sky-500/80 font-black mb-0.5 italic tracking-tighter uppercase leading-none">Record</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Current Shift Comprehensive Statistics */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <BarChart3 size={13} className="text-emerald-400" />
                            CURRENT SHIFT DEEP METRICS
                        </h4>
                        <span className="text-[10px] text-emerald-400 font-bold uppercase bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded">
                            {completedOrders.length} Orders Logged
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* Active Pick Time */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold mb-1">
                                <Clock size={11} className="text-emerald-400" />
                                Active Pick Time
                            </div>
                            <div className="text-white font-extrabold text-sm font-mono">{formatDuration(activePickSeconds)}</div>
                        </div>

                        {/* Break Time (Excluded 100%) */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold mb-1">
                                <Coffee size={11} className="text-amber-400" />
                                Total Break Time
                            </div>
                            <div className="text-amber-300 font-extrabold text-sm font-mono">{formatDuration(totalBreakSeconds)}</div>
                            <div className="text-[8px] text-emerald-400/90 font-bold uppercase tracking-wider mt-0.5">100% Excluded from Rate</div>
                        </div>

                        {/* Avg Order Time */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold mb-1">
                                <Zap size={11} className="text-sky-400" />
                                Avg Order Time
                            </div>
                            <div className="text-sky-300 font-extrabold text-sm font-mono">{formatDuration(avgOrderDuration)}</div>
                        </div>

                        {/* Avg Cases Per Order */}
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] uppercase font-bold mb-1">
                                <Package size={11} className="text-purple-400" />
                                Avg Cases / Order
                            </div>
                            <div className="text-purple-300 font-extrabold text-sm font-mono">{avgCasesPerOrder} <span className="text-[9px] text-slate-500 font-normal">cs/ord</span></div>
                        </div>
                    </div>

                    {/* Department Breakdown list if available */}
                    {deptStats.length > 0 && (
                        <div className="pt-2 border-t border-slate-800/80">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                                <Layers size={11} className="text-slate-400" /> Department Breakdown
                            </div>
                            <div className="space-y-1.5">
                                {deptStats.map((ds, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-slate-950/70 border border-slate-800/50 px-3 py-1.5 rounded-xl text-xs">
                                        <div className="font-bold text-slate-300 capitalize">{ds.dept}</div>
                                        <div className="flex items-center gap-3 font-mono text-[11px]">
                                            <span className="text-slate-400">{ds.cases} cs ({ds.count} ord)</span>
                                            <span className="text-emerald-400 font-bold">{ds.rate} P/H</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Lifetime & Past Shifts Analytics */}
                <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-3xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                            <History size={13} className="text-sky-400" />
                            HISTORICAL SHIFTS ANALYTICS
                        </h4>
                        <span className="text-[10px] text-sky-400 font-bold uppercase bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded">
                            {lifetimeMetrics.totalShiftCount} Shifts Recorded
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Lifetime Total Cases</div>
                            <div className="text-white font-extrabold text-base font-mono">{lifetimeMetrics.lifetimeTotalCases.toLocaleString()} <span className="text-[9px] text-slate-500">cs</span></div>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                            <div className="text-slate-500 text-[10px] uppercase font-bold mb-1">Historical Avg Rate</div>
                            <div className="text-emerald-400 font-extrabold text-base font-mono">{lifetimeMetrics.avgLifetimeRate} <span className="text-[9px] text-slate-500">P/H</span></div>
                        </div>
                    </div>

                    {/* Past Shifts List */}
                    <div className="pt-2 border-t border-slate-800/80">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                            <span>Past Shift Logs</span>
                            {loadingPastShifts && <span className="text-[9px] text-sky-400 animate-pulse">Loading...</span>}
                        </div>

                        {mergedPastShifts.length > 0 ? (
                            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                                {mergedPastShifts.map((s, idx) => {
                                    const dateDisplay = s.date || (s.clockInTime ? new Date(s.clockInTime).toLocaleDateString() : 'Previous Shift');
                                    const cases = s.cases || s.totalCases || 0;
                                    const rate = s.finalRate || s.rate || 0;
                                    const code = s.shiftCode || s.id || `SHF-${idx + 1}`;

                                    return (
                                        <div key={s.id || idx} className="bg-slate-950/80 border border-slate-800/60 p-2.5 rounded-2xl flex justify-between items-center text-xs">
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
                            <div className="py-4 text-center text-[10px] text-slate-500 uppercase font-bold tracking-wider bg-slate-950/40 rounded-2xl border border-slate-800/40">
                                No past shift summaries archived yet. Finalize shifts to build history log!
                            </div>
                        )}
                    </div>
                </div>

                {/* Performance Trends Chart */}
                {shiftData?.history?.length > 1 && (
                    <div className={`${theme.panel} p-6 ${theme.radius} border border-slate-700/50 mt-2`}>
                        <div className="flex items-center justify-between mb-6 px-1">
                            <div className="flex items-center gap-2">
                                <Sparkles size={16} className={theme.text} />
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">Performance Trends</h3>
                            </div>
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">LAST 10 ORDERS</span>
                        </div>
                        <div className="h-[180px] w-full">
                            <ResponsiveContainer width="99%" height="100%">
                                <LineChart data={trendData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#101b30" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        hide 
                                    />
                                    <YAxis 
                                        stroke="#64748b" 
                                        fontSize={10} 
                                        fontWeight="bold"
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => `${val}`}
                                        domain={['dataMin - 20', 'dataMax + 20']}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b', fontSize: '10px' }}
                                        itemStyle={{ fontWeight: 'bold' }}
                                    />
                                    <Line 
                                        type="monotone" 
                                        dataKey="rate" 
                                        stroke={theme.bg.replace('bg-', '') === 'emerald-600' ? '#10b981' : theme.bg.replace('bg-', '') === 'sky-600' ? '#0ea5e9' : '#6366f1'} 
                                        strokeWidth={4} 
                                        dot={{ fill: '#0f172a', strokeWidth: 2, r: 4 }}
                                        activeDot={{ r: 6, strokeWidth: 0 }}
                                        animationDuration={1500}
                                    />
                                    <Line 
                                        type="stepAfter" 
                                        dataKey="target" 
                                        stroke="#ef4444" 
                                        strokeWidth={1} 
                                        strokeDasharray="5 5" 
                                        dot={false}
                                    />
                                    <Line 
                                        type="stepAfter" 
                                        dataKey="stretch" 
                                        stroke="#a855f7" 
                                        strokeWidth={1} 
                                        strokeDasharray="3 3" 
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 flex items-center justify-center gap-6">
                            <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${theme.bg}`} />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Actual Rate</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-red-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Baseline</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-purple-500" />
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Stretch Goal</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* Live Feed Component */}
                <div className="bg-slate-950/50 rounded-3xl p-4 border border-slate-900 mb-6">
                    <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Activity size={10} className="text-emerald-400" />
                            Live Performance
                        </h4>
                        <span className="text-[10px] text-slate-600 font-bold uppercase">{liveUsers.length} Active</span>
                    </div>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
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
                            <div className="py-8 text-center">
                                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">No active peers</p>
                            </div>
                        )}
                    </div>
                </div>

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
        </motion.div>
    );
};
