import React from 'react';
import { motion } from 'motion/react';
import { 
    Award, 
    Activity, 
    Sparkles, 
    ShieldAlert, 
    Smartphone, 
    X, 
    FileText, 
    Check, 
    RotateCcw, 
    Info, 
    CheckCircle2
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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


    const brands = [
        { id: 'HryFine', label: 'HryFine / Smart Watch' },
        { id: 'Garmin', label: 'Garmin Connect' },
        { id: 'Apple', label: 'Apple Health' },
        { id: 'Samsung', label: 'Galaxy Watch' },
        { id: 'Fitbit', label: 'Fitbit App' }
    ] as const;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`flex-1 overflow-y-auto no-scrollbar pb-safe-bottom ${theme.font}`}
        >
            <div className="p-4 space-y-4 max-w-md mx-auto">
                <div className="flex items-center gap-3 w-full mb-2">
                    <div className="flex flex-1 items-center gap-1 bg-orange-500/10 px-4 py-3 rounded-2xl border border-orange-500/20 justify-center">
                        <span className="text-xl">🔥</span>
                        <div className="flex flex-col ml-2">
                            <span className="text-[11px] text-orange-400/80 font-black uppercase tracking-wider leading-none mb-1">Fire Streak</span>
                            <span className="text-orange-500 font-black text-3xl leading-none">{shiftData?.streak || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Operator & Stats Bar */}
                <div className={`${theme.panel} ${theme.radius} border border-slate-700/50 overflow-hidden`}>
                    <div className={`px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between flex-wrap gap-2 text-xs font-bold text-slate-200`}>
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                            {getCleanName && getCleanName()}
                        </div>
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest leading-none">Shift Activity</div>
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
                                animate={{ width: `${((shiftData?.xp || 0) / ((shiftData?.level || 1) * 1000)) * 100}%` }}
                                className={`h-full bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.4)] ${theme.radius}`}
                            />
                        </div>
                    </div>
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
                                <span className="text-2xl font-black text-white leading-none tracking-tighter">{shiftBestRate}</span>
                                <span className="text-[11px] text-sky-500/80 font-black mb-0.5 italic tracking-tighter uppercase leading-none">Record</span>
                            </div>
                        </div>
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

                {/* Live Exemption Accrual Breakdown (Only shown for Aisles) */}
                {isAisles && (
                    <div className="bg-slate-900 border border-slate-800/80 p-4 rounded-3xl mb-4 shadow-lg shadow-sky-950/20">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 font-bold">
                                <Sparkles size={11} className="text-sky-400" />
                                PWA EXEMPTION BREAKDOWN
                            </h4>
                            <span className="text-xs font-black text-sky-450 font-mono">
                                +{formatTime(stats.finalExemption)}
                            </span>
                        </div>
                        
                        <div className="space-y-3">
                            {/* Prep Accrual */}
                            <div>
                                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                                    <span className="text-slate-500 uppercase tracking-tight">Mandatory Prep (Max 10m)</span>
                                    <span className="text-slate-300 font-bold">
                                        {formatTime(stats.accruedPrep)} / 10:00
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-sky-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (stats.accruedPrep / 600) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Dinner Accrual */}
                            <div>
                                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                                    <span className="text-slate-500 uppercase tracking-tight">Dinner Accrual (Max 30m)</span>
                                    <span className="text-slate-300 font-bold">
                                        {formatTime(stats.accruedDinner)} / 30:00
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (stats.accruedDinner / 1800) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            {/* Cleanup Accrual */}
                            <div>
                                <div className="flex justify-between items-center text-[10px] font-mono mb-1">
                                    <span className="text-slate-500 uppercase tracking-tight">Cleanup Accrual (Max 5m)</span>
                                    <span className="text-slate-300 font-bold">
                                        {formatTime(stats.accruedCleanup)} / 5:00
                                    </span>
                                </div>
                                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                        style={{ width: `${Math.min(100, (stats.accruedCleanup / 300) * 100)}%` }}
                                    />
                                </div>
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
                            const isMe = user.name === getCleanName();
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
                            {/* Table Header */}
                            <div className="flex justify-between items-center p-2 text-[10px] uppercase font-black text-slate-500 bg-slate-900 rounded-lg">
                                <div className="flex-1">User</div>
                                <div className="w-16 text-center">Region</div>
                                <div className="w-16 text-center">Board</div>
                                <div className="w-16 text-right">P/H</div>
                            </div>
                            {/* Table Content */}
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
