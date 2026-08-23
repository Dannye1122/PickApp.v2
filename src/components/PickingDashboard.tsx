import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, CheckCircle } from 'lucide-react';
import { ThemeColors } from '../types';
import { Owl } from './branding/Owl';

interface PickingDashboardProps {
    isPicking: boolean;
    theme: ThemeColors;
    isWarning: boolean;
    caseCount: string;
    currentDept: { name: string; target?: number } | null | undefined;
    finishTime: Date | null;
    stats: {
        timeRemainingSecs: number;
        [key: string]: any;
    };
    breakTimeDuringCurrentPick: number;
    isOnBreak: boolean;
    breakStartTime: number | null;
    pickStartTime: number | null;
    targetRate: number;
    now: Date;
    formatTime: (sec: number) => string;
    duoMessage: string;
    pendingLabelImages?: string[];
    pendingStoreLabels?: string[];
    isCaseCountModified?: boolean;
    onEditCaseCount?: () => void;
}

export const PickingDashboard: React.FC<PickingDashboardProps> = ({ 
    isPicking, 
    theme, 
    isWarning, 
    caseCount, 
    currentDept, 
    finishTime, 
    stats, 
    breakTimeDuringCurrentPick, 
    isOnBreak, 
    breakStartTime, 
    pickStartTime, 
    targetRate, 
    now, 
    formatTime, 
    duoMessage,
    pendingLabelImages = [],
    pendingStoreLabels = [],
    isCaseCountModified = false,
    onEditCaseCount
}) => {
    return (
        <AnimatePresence>
            {isPicking && (
                <motion.div 
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="px-4 py-3"
                >
                    <div className={`${theme.panel} p-4 ${theme.radius} border border-slate-800 shadow-2xl relative overflow-hidden`}>
                        {/* Coach Accent */}
                        <div className={`absolute top-0 left-0 w-1.5 h-full ${isCaseCountModified ? 'bg-purple-500' : isWarning ? 'bg-amber-500' : theme.bg}`}></div>
                        
                        <div className={`flex justify-between items-start mb-3 ${theme.font}`}>
                            <div 
                                className="cursor-pointer active:scale-95 transition-transform"
                                onClick={onEditCaseCount}
                            >
                                <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full animate-ping ${isCaseCountModified ? 'bg-purple-400' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`}></div>
                                    ACTIVE PICKING
                                </h3>
                                <p className={`text-[11px] font-bold uppercase tracking-widest ${isCaseCountModified ? 'text-fuchsia-400 flex items-center gap-1.5' : 'text-slate-500'}`}>
                                    {isCaseCountModified && <span className="bg-fuchsia-500/20 px-1.5 py-0.5 rounded text-[9px] border border-fuchsia-500/30">MODIFIED</span>} {caseCount} CASES • {currentDept?.name}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mb-1">Finish By</div>
                                <div className={`text-sm font-black ${isWarning ? 'text-amber-400' : 'text-white'}`}>
                                    {finishTime?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </div>
                            </div>
                        </div>

                        {/* Gamified Live Pacing Data */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">Live Pace vs Avg</div>
                                <div className={`text-base font-black italic tracking-tighter ${stats.projectedRate > stats.historicalAvg ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {stats.projectedRate}
                                    <span className="text-[10px] font-bold text-slate-600 ml-1">P/H</span>
                                </div>
                            </div>
                            <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/50">
                                <div className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1.5 leading-none">PB Milestones</div>
                                <div className={`text-base font-black italic tracking-tighter ${stats.isNewPb ? 'text-purple-400' : 'text-slate-400'}`}>
                                    {stats.isNewPb ? '🎉 PB!' : stats.personalBest}
                                    <span className="text-[10px] font-bold text-slate-600 ml-1">P/H</span>
                                </div>
                            </div>
                        </div>

                        {/* Scanned Label Previews */}
                        {pendingLabelImages.length > 0 && (
                            <div className="mt-3 p-2 bg-slate-950/50 rounded-xl border border-slate-800/50 space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">Scanned Labels ({pendingLabelImages.length}/4)</p>
                                    <CheckCircle size={10} className="text-emerald-400" />
                                </div>
                                <div className="grid grid-cols-2 gap-1.5">
                                    {pendingLabelImages.map((img, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800/50 overflow-hidden">
                                            <div className="w-6 h-6 rounded-md overflow-hidden border border-slate-855/20 shrink-0">
                                                <img src={img} className="w-full h-full object-cover" alt={`scanned-${idx}`} />
                                            </div>
                                            <span className="text-[9px] text-slate-300 font-mono truncate">{pendingStoreLabels[idx] || `Label ${idx + 1}`}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Live Pacing Logic Overlay */}
                        <div className="mt-3 flex items-center gap-3">
                            <div className="flex-1 py-2 px-3 bg-slate-950/80 rounded-xl border border-slate-800/40 flex justify-between items-center">
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stats.timeRemainingSecs >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <Clock size={14} />
                                    </div>
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stats.timeRemainingSecs >= 0 ? 'Ahead' : 'Behind'}</span>
                                </div>
                                <div className={`text-sm font-mono font-black ${stats.timeRemainingSecs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {stats.timeRemainingSecs >= 0 ? '+' : '-'}{formatTime(Math.abs(stats.timeRemainingSecs))}
                                </div>
                            </div>
                        </div>

                        {/* Duo Motivational Message with Tooltip Style */}
                        <div className="mt-4 flex items-start gap-3 p-3 bg-slate-800/40 rounded-2xl border border-slate-700/30">
                            <Owl className="w-5 h-5 shrink-0" />
                            <p className="text-[11px] text-slate-300 font-medium leading-tight italic">
                                "{duoMessage}"
                            </p>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
