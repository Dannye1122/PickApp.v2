import React, { useMemo, useState } from 'react';
import { Calendar, Award, TrendingUp, Clock, Package, ChevronLeft, ChevronRight, User, Sparkles } from 'lucide-react';
import { ShiftSummary } from '../../services/leaderboardService';
import { ThemeColors } from '../../types';

interface PreviousMonthSummaryProps {
    summaries: ShiftSummary[];
    theme: ThemeColors;
    currentDate?: Date;
}

interface MonthlyUserStat {
    userName: string;
    department: string;
    totalCases: number;
    totalActiveSeconds: number;
    shiftCount: number;
    averageRate: number;
    bestRate: number;
    bestDayCases: number;
}

export const PreviousMonthSummary: React.FC<PreviousMonthSummaryProps> = ({
    summaries,
    theme,
    currentDate = new Date()
}) => {
    // Calculate default previous month
    const defaultTarget = useMemo(() => {
        const d = new Date(currentDate);
        d.setDate(1);
        d.setMonth(d.getMonth() - 1);
        return { year: d.getFullYear(), month: d.getMonth() };
    }, [currentDate]);

    const [selectedYear, setSelectedYear] = useState<number>(defaultTarget.year);
    const [selectedMonth, setSelectedMonth] = useState<number>(defaultTarget.month); // 0-indexed

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const handlePrevMonth = () => {
        if (selectedMonth === 0) {
            setSelectedMonth(11);
            setSelectedYear(y => y - 1);
        } else {
            setSelectedMonth(m => m - 1);
        }
    };

    const handleNextMonth = () => {
        if (selectedMonth === 11) {
            setSelectedMonth(0);
            setSelectedYear(y => y + 1);
        } else {
            setSelectedMonth(m => m + 1);
        }
    };

    // Filter summaries belonging to selectedYear and selectedMonth
    const monthlyStats = useMemo(() => {
        const userMap = new Map<string, {
            userName: string;
            departments: Map<string, number>;
            totalCases: number;
            totalActiveSeconds: number;
            shiftCount: number;
            rates: number[];
            bestDayCases: number;
        }>();

        const pad = (n: number) => String(n).padStart(2, '0');
        const targetPrefix = `${selectedYear}-${pad(selectedMonth + 1)}`; // e.g. "2026-07"

        // Deduplicate summaries by user and date to handle multiple fragments per day
        const deduplicatedShifts = new Map<string, any>();
        
        summaries.forEach((s) => {
            if (!s.date || !s.userName) return;
            const name = s.userName.trim().toUpperCase();
            if (name === 'ADMIN') return;

            let normDate = s.date;
            if (s.date.includes('/')) {
                const parts = s.date.split('/');
                if (parts.length === 3) normDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else if (s.date.includes('-')) {
                // Keep YYYY-MM-DD
                normDate = s.date;
            }

            const key = `${name}_${normDate}`;
            const existing = deduplicatedShifts.get(key);
            
            const cases = s.totalCases || s.cases || 0;
            const activeSec = s.activeSeconds || s.totalSeconds || 0;

            if (!existing) {
                deduplicatedShifts.set(key, { ...s, _normDate: normDate, _cases: cases, _activeSec: activeSec });
            } else {
                if (cases > existing._cases || (cases === existing._cases && activeSec > existing._activeSec)) {
                    deduplicatedShifts.set(key, { ...s, _normDate: normDate, _cases: cases, _activeSec: activeSec });
                }
            }
        });

        Array.from(deduplicatedShifts.values()).forEach((s) => {
            const name = s.userName.trim().toUpperCase();
            
            // Check if summary belongs to target month
            // Date format could be YYYY-MM-DD or DD/MM/YYYY
            let shiftYear = 0;
            let shiftMonth = 0; // 1-indexed

            if (s.date.includes('-')) {
                const parts = s.date.split('-');
                if (parts.length >= 2) {
                    shiftYear = parseInt(parts[0], 10);
                    shiftMonth = parseInt(parts[1], 10);
                }
            } else if (s.date.includes('/')) {
                const parts = s.date.split('/');
                if (parts.length === 3) {
                    shiftYear = parseInt(parts[2], 10);
                    shiftMonth = parseInt(parts[1], 10);
                }
            }

            if (shiftYear === selectedYear && shiftMonth === selectedMonth + 1) {
                if (!userMap.has(name)) {
                    userMap.set(name, {
                        userName: s.userName.trim(),
                        departments: new Map(),
                        totalCases: 0,
                        totalActiveSeconds: 0,
                        shiftCount: 0,
                        rates: [],
                        bestDayCases: 0
                    });
                }

                const entry = userMap.get(name)!;
                const cases = s._cases;
                const activeSec = s._activeSec;
                const rate = s.finalRate || (activeSec > 0 ? (cases / activeSec) * 3600 : 0);

                entry.totalCases += cases;
                entry.totalActiveSeconds += activeSec;
                entry.shiftCount += 1;
                if (rate > 0) entry.rates.push(rate);
                if (cases > entry.bestDayCases) entry.bestDayCases = cases;

                const dept = s.department || 'General';
                entry.departments.set(dept, (entry.departments.get(dept) || 0) + 1);
            }
        });

        const list: MonthlyUserStat[] = [];
        userMap.forEach((v) => {
            let primaryDept = 'General';
            let maxCount = 0;
            v.departments.forEach((count, dept) => {
                if (count > maxCount) {
                    maxCount = count;
                    primaryDept = dept;
                }
            });

            const avgRate = v.totalActiveSeconds > 0
                ? Math.round((v.totalCases / v.totalActiveSeconds) * 3600)
                : (v.rates.length > 0 ? Math.round(v.rates.reduce((a, b) => a + b, 0) / v.rates.length) : 0);

            const bestRate = v.rates.length > 0 ? Math.round(Math.max(...v.rates)) : avgRate;

            list.push({
                userName: v.userName,
                department: primaryDept,
                totalCases: v.totalCases,
                totalActiveSeconds: v.totalActiveSeconds,
                shiftCount: v.shiftCount,
                averageRate: avgRate,
                bestRate: bestRate,
                bestDayCases: v.bestDayCases
            });
        });

        // Rank by Total Cases descending
        list.sort((a, b) => b.totalCases - a.totalCases);
        return list;
    }, [summaries, selectedYear, selectedMonth]);

    const totalMonthCases = useMemo(() => {
        return monthlyStats.reduce((sum, u) => sum + u.totalCases, 0);
    }, [monthlyStats]);

    const totalMonthShifts = useMemo(() => {
        return monthlyStats.reduce((sum, u) => sum + u.shiftCount, 0);
    }, [monthlyStats]);

    const formatHours = (seconds: number) => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${hrs}h ${mins}m`;
    };

    return (
        <div className="space-y-4">
            {/* Month Navigator Header */}
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
                <button
                    onClick={handlePrevMonth}
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-slate-700/50"
                    title="Previous Month"
                >
                    <ChevronLeft size={18} />
                </button>

                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-sky-400" />
                    <span className="text-sm font-black text-white uppercase tracking-wider">
                        {monthNames[selectedMonth]} {selectedYear}
                    </span>
                    {selectedMonth === defaultTarget.month && selectedYear === defaultTarget.year && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-bold border border-sky-500/30 uppercase tracking-tight">
                            Previous Month
                        </span>
                    )}
                </div>

                <button
                    onClick={handleNextMonth}
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors border border-slate-700/50"
                    title="Next Month"
                >
                    <ChevronRight size={18} />
                </button>
            </div>

            {/* Monthly Warehouse Overview Banner */}
            <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Package size={13} className="text-emerald-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Total Picked</span>
                    </div>
                    <span className="text-base font-black text-emerald-400 font-mono">
                        {totalMonthCases.toLocaleString()}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tight">Cases</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <User size={13} className="text-sky-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Active Pickers</span>
                    </div>
                    <span className="text-base font-black text-white font-mono">
                        {monthlyStats.length}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tight">Users</span>
                </div>

                <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-3 flex flex-col items-center justify-center">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                        <Clock size={13} className="text-amber-400" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Shifts Run</span>
                    </div>
                    <span className="text-base font-black text-amber-400 font-mono">
                        {totalMonthShifts}
                    </span>
                    <span className="text-[8px] text-slate-500 uppercase font-bold tracking-tight">Shifts</span>
                </div>
            </div>

            {/* User Monthly Breakdown Cards */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                        <Award size={14} className="text-amber-400" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                            Monthly Volume Rankings
                        </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-bold">
                        Sorted by Total Cases
                    </span>
                </div>

                {monthlyStats.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900/30 rounded-2xl border border-slate-800/60 p-6">
                        <Package size={32} className="mx-auto text-slate-600 mb-2 opacity-50" />
                        <p className="text-slate-400 text-sm font-medium">No shift history found for {monthNames[selectedMonth]} {selectedYear}.</p>
                        <p className="text-slate-500 text-xs mt-1">Shifts completed in this month will automatically aggregate here.</p>
                    </div>
                ) : (
                    monthlyStats.map((stat, idx) => {
                        const isTop1 = idx === 0;
                        const isTop2 = idx === 1;
                        const isTop3 = idx === 2;

                        const badgeColor = isTop1 
                            ? 'bg-amber-400 text-slate-950 font-black shadow-lg shadow-amber-500/20' 
                            : isTop2 
                            ? 'bg-slate-300 text-slate-950 font-black' 
                            : isTop3 
                            ? 'bg-orange-500 text-white font-black' 
                            : 'bg-slate-800 text-slate-400 font-bold border border-slate-700';

                        return (
                            <div 
                                key={stat.userName}
                                className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all ${
                                    isTop1 
                                        ? 'bg-gradient-to-r from-amber-500/10 via-slate-900/60 to-slate-900/60 border-amber-500/30 shadow-lg shadow-amber-500/5' 
                                        : 'bg-slate-800/50 border-slate-700/60'
                                }`}
                            >
                                <div className="flex items-center gap-3.5">
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm shrink-0 ${badgeColor}`}>
                                        {idx + 1}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="font-bold text-white text-base truncate">
                                                {stat.userName}
                                            </span>
                                            {isTop1 && (
                                                <span className="text-[9px] px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wider font-black shrink-0 flex items-center gap-1">
                                                    <Sparkles size={11} className="text-amber-400" /> #1 PICKER
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-[10px] text-slate-400 uppercase tracking-wider truncate">
                                            {stat.department} • {stat.shiftCount} {stat.shiftCount === 1 ? 'Shift' : 'Shifts'} Worked
                                        </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                        <div className="text-xl font-black text-emerald-400 font-mono">
                                            {stat.totalCases.toLocaleString()}
                                        </div>
                                        <div className="text-[9px] text-slate-400 font-medium uppercase tracking-widest leading-none">
                                            Total Cases
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2 pt-2.5 border-t border-slate-700/40 text-center">
                                    <div className="bg-slate-900/50 rounded-xl py-1.5 px-2 border border-slate-800/40">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Avg Rate</div>
                                        <div className="text-xs font-black text-white font-mono">{stat.averageRate} <span className="text-[9px] text-slate-400 font-normal">P/H</span></div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl py-1.5 px-2 border border-slate-800/40">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Best Rate</div>
                                        <div className="text-xs font-black text-sky-400 font-mono">{stat.bestRate} <span className="text-[9px] text-slate-400 font-normal">P/H</span></div>
                                    </div>

                                    <div className="bg-slate-900/50 rounded-xl py-1.5 px-2 border border-slate-800/40">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold tracking-tight">Time Active</div>
                                        <div className="text-xs font-black text-slate-300 font-mono">{formatHours(stat.totalActiveSeconds)}</div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
