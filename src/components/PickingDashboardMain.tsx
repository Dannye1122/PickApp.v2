import React from 'react';
import { motion } from 'motion/react';
import { 
    Zap, Flame, Coffee, Trophy, Clock, FileText, Play, Square, Award, Download, CheckCircle, Camera, AlertCircle
} from 'lucide-react';
import { PickingDashboard } from './PickingDashboard';
import { MetricCard } from './stats/MetricCard';
import { ShiftData, ThemeColors } from '../types';
import { DEPT_LANES } from '../constants/data';

export interface PickingDashboardMainProps {
    shiftData: ShiftData;
    isPicking: boolean;
    theme: ThemeColors;
    isWarning: boolean;
    caseCount: string;
    setCaseCount: (val: string) => void;
    setIsUnlockingCaseCount: (val: boolean) => void;
    setUnlockPin: (val: string) => void;
    setUnlockError: (val: string) => void;
    currentDept: any;
    finishTime: Date | null;
    stats: any;
    breakTimeDuringCurrentPick: number;
    isOnBreak: boolean;
    breakStartTime: number | null;
    pickStartTime: number | null;
    targetRate: number;
    now: Date;
    formatTime: (s: number) => string;
    duoMessage: string | null;
    pendingLabelImages: string[];
    setPendingLabelImages: React.Dispatch<React.SetStateAction<string[]>>;
    pendingStoreLabels: string[];
    setPendingStoreLabels: React.Dispatch<React.SetStateAction<string[]>>;
    setViewingLabels: (urls: string[] | null) => void;
    statsMode: string;
    setStatsMode: (mode: string) => void;
    getDeptName: (deptId: string) => string;
    activeCases: number;
    activeElapsed: number;
    currentDeptStats: any;
    activeRate: number;
    isShiftFinalized: boolean;
    finalizedStats: any;
    rate: number;
    activeTargetRate: number;
    isRateGood: boolean;
    net: number;
    isNetGood: boolean;
    formatHHMM: (s: number) => string;
    totalBreakSeconds: number;
    masterStart: () => void;
    setManualClockType: (type: 'in' | 'out') => void;
    setShowClockInModal: (show: boolean) => void;
    lane1: string;
    lane2: string;
    lane3: string;
    lane4: string;
    setLane1: (val: string) => void;
    setLane2: (val: string) => void;
    setLane3: (val: string) => void;
    setLane4: (val: string) => void;
    updateShiftData: (updates: any) => void;
    setShiftNotes: (val: string) => void;
    saveStandaloneNote: () => void;
    startPick: () => void;
    finishPickPhase: () => void;
    undoFinishPickPhase: () => void;
    stopPick: () => void;
    startPaidBreak: () => void;
    stopPaidBreak: () => void;
    consistencyPercent: number;
    shiftBestRate: number;
    downloadReport: () => void;
    setManualClockTime: (time: string) => void;
    handleEndOfDay: () => void;
    haptic: (type?: 'light' | 'medium' | 'heavy') => void;
}

export const PickingDashboardMain: React.FC<PickingDashboardMainProps> = ({
    shiftData,
    isPicking,
    theme,
    isWarning,
    caseCount,
    setCaseCount,
    setIsUnlockingCaseCount,
    setUnlockPin,
    setUnlockError,
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
    pendingLabelImages,
    setPendingLabelImages,
    pendingStoreLabels,
    setPendingStoreLabels,
    setViewingLabels,
    statsMode,
    setStatsMode,
    getDeptName,
    activeCases,
    activeElapsed,
    currentDeptStats,
    activeRate,
    isShiftFinalized,
    finalizedStats,
    rate,
    activeTargetRate,
    isRateGood,
    net,
    isNetGood,
    formatHHMM,
    totalBreakSeconds,
    masterStart,
    setManualClockType,
    setShowClockInModal,
    lane1,
    lane2,
    lane3,
    lane4,
    setLane1,
    setLane2,
    setLane3,
    setLane4,
    updateShiftData,
    setShiftNotes,
    saveStandaloneNote,
    startPick,
    finishPickPhase,
    undoFinishPickPhase,
    stopPick,
    startPaidBreak,
    stopPaidBreak,
    consistencyPercent,
    shiftBestRate,
    downloadReport,
    setManualClockTime,
    handleEndOfDay,
    haptic
}) => {
    return (
        <div id="screen-picking" className="h-full flex flex-col">
            <div id="scrollable-dashboard" className="flex-1 overflow-y-auto no-scrollbar pb-safe-bottom">
                <div id="dashboard-content" className="p-4 max-w-md mx-auto space-y-4">
                    
                    {/* Wake Lock Active Indicator */}
                    {shiftData.wakeLock && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-1.5 bg-sky-500/10 px-3 py-1.5 rounded-full border border-sky-500/20 text-[10px] font-bold text-sky-400 uppercase tracking-widest mb-4 self-center"
                        >
                            <Zap size={12} className="fill-sky-400 animate-pulse" /> Always-On Display Active
                        </motion.div>
                    )}

                    {/* Firestreak Indicator */}
                    {(shiftData.firestreak || 0) > 0 && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 bg-orange-500/10 px-4 py-2 rounded-2xl border border-orange-500/20 mb-4"
                        >
                            <div className="p-1.5 bg-orange-500 rounded-lg shadow-lg shadow-orange-500/20">
                                <Flame size={14} className="text-slate-950 fill-slate-950" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest leading-none">Firestreak Active</span>
                                <span className="text-xs font-black text-white uppercase tracking-tighter mt-1">{shiftData.firestreak} CONSECUTIVE TARGETS</span>
                            </div>
                        </motion.div>
                    )}

                    {/* picking dashboard */}
                    <PickingDashboard 
                        isPicking={isPicking}
                        theme={theme}
                        isWarning={isWarning}
                        caseCount={caseCount}
                        isCaseCountModified={shiftData.isCaseCountModified}
                        onEditCaseCount={() => {
                            haptic('medium');
                            setIsUnlockingCaseCount(true);
                            setUnlockPin('');
                            setUnlockError('');
                        }}
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
                        pendingStoreLabels={pendingStoreLabels}
                    />

                    {/* Dashboard Main Content */}
                    <div className="flex flex-col items-center justify-center py-2">
                        <div className="text-4xl font-light tracking-tight text-white font-mono">
                            {now.toLocaleTimeString('en-US', { hour12: false })}
                        </div>
                        {isOnBreak && (
                            <div className="mt-2 inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                                <Coffee size={14} /> On Break
                            </div>
                        )}
                    </div>
                    
                    {/* Hands-Free Voice Monitor (MHE Optimized) */}
                    {shiftData.voiceEnabled && shiftData.voiceTask?.aisle && (
                        <div className="mb-4 bg-slate-900 border-2 border-sky-500 rounded-[2.5rem] p-6 shadow-2xl shadow-sky-500/20 overflow-hidden relative">
                            <div className="absolute top-0 right-0 bg-sky-500 text-slate-950 px-4 py-1 text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                Voice Active
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Current Instruction</span>
                                </div>
                                <div className="flex justify-between items-end">
                                    <div className="flex flex-col">
                                        <div className="text-[12px] font-bold text-sky-400 uppercase tracking-widest">Aisle / Slot</div>
                                        <div className="text-6xl font-black text-white tracking-tighter leading-none">
                                            {shiftData.voiceTask.aisle}<span className="text-slate-600">.</span>{shiftData.voiceTask.slot}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest">Cases</div>
                                        <div className="text-6xl font-black text-white leading-none">
                                            {shiftData.voiceTask.cases}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="mt-6 pt-4 border-t border-slate-800 flex justify-between items-center">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Status</span>
                                        <span className={`text-[13px] font-black uppercase tracking-widest ${shiftData.voiceTask.status === 'awaiting_digits' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                            {shiftData.voiceTask.status === 'awaiting_digits' ? '● VERIFY DIGITS' : '● START PICKING'}
                                        </span>
                                    </div>
                                    {shiftData.voiceTask.status === 'awaiting_digits' && (
                                        <div className="bg-slate-950 px-4 py-2 rounded-2xl border border-slate-800">
                                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-0.5">Check Digits</span>
                                            <span className="text-2xl font-black text-white tracking-[0.2em]">{shiftData.voiceTask.checkDigits}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Stats Mode Toggle */}
                    <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                            Performance View
                        </span>
                        <div className="bg-slate-950 border border-slate-800 p-1 rounded-xl inline-flex gap-1">
                            <button 
                                onClick={() => { haptic('light'); setStatsMode('dept'); }}
                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${statsMode === 'dept' ? 'bg-slate-800 text-emerald-400 border border-slate-700/50' : 'text-slate-500 border border-transparent'}`}
                            >
                                {getDeptName(shiftData.department)}
                            </button>
                            <button 
                                onClick={() => { haptic('light'); setStatsMode('shift'); }}
                                className={`px-3 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${statsMode === 'shift' ? 'bg-slate-800 text-sky-400 border border-slate-700/50' : 'text-slate-500 border border-transparent'}`}
                            >
                                Total Shift
                            </button>
                        </div>
                    </div>

                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <MetricCard 
                            label={statsMode === 'dept' ? `${getDeptName(shiftData.department)} Rate` : "Total Shift Rate"}
                            value={activeCases > 0 && activeElapsed <= 60 ? "CALC..." : (statsMode === 'dept' ? (currentDeptStats.rate || activeRate) : (isShiftFinalized ? finalizedStats?.rate : rate))}
                            subValue={statsMode === 'dept' ? `Goal: ${activeTargetRate} P/H • Shift Avg: ${rate} P/H` : `Goal: ${targetRate} P/H • ${getDeptName(shiftData.department)}: ${currentDeptStats.rate} P/H`}
                            isGood={statsMode === 'dept' ? currentDeptStats.isRateGood : (isShiftFinalized ? ((finalizedStats?.rate || 0) >= targetRate) : isRateGood)}
                            icon={<Trophy size={14} />}
                            theme={theme}
                        />
                        <MetricCard 
                            label="Net Saved"
                            value={`${(statsMode === 'dept' ? currentDeptStats.net : net) >= 0 ? "+" : "-"}${formatTime(Math.abs(statsMode === 'dept' ? currentDeptStats.net : net))}`}
                            subValue={statsMode === 'dept' ? `${getDeptName(shiftData.department)} Vs Target` : "Total Shift Vs Target"}
                            isGood={statsMode === 'dept' ? currentDeptStats.isNetGood : isNetGood}
                            icon={<Clock size={14} />}
                            theme={theme}
                        />
                    </div>

                    {/* Secondary Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <MetricCard 
                            label="Cases"
                            value={activeCases}
                            type="secondary"
                            theme={theme}
                        />
                        <MetricCard 
                            label="Shift Time"
                            value={formatHHMM(isShiftFinalized ? (finalizedStats?.activeElapsedSeconds || 0) : (statsMode === 'dept' ? activeElapsed : stats.totalShiftSeconds))}
                            type="secondary"
                            theme={theme}
                        />
                        <MetricCard 
                            label="Break Time"
                            value={formatHHMM(statsMode === 'dept' ? currentDeptStats.breakSeconds : totalBreakSeconds)}
                            type="secondary"
                            theme={theme}
                            trend="neutral"
                        />
                    </div>

                    {/* Action Area */}
                    <div className={`${theme.panel} p-4 ${theme.radius} border mt-2 shadow-2xl`}>
                        {!shiftData.firstStartTime ? (
                            <div className="space-y-3">
                                <button 
                                    className={`w-full py-5 ${theme.bg} text-white ${theme.radius} font-bold text-lg tracking-wide ${theme.bgHover} active:scale-[0.98] transition-all shadow-lg ${theme.shadow} flex flex-col items-center justify-center gap-1`}
                                    onClick={masterStart}
                                >
                                    <span>START SHIFT NOW</span>
                                    <span className="text-[10px] font-medium opacity-80 uppercase tracking-widest leading-none">Clock in: {now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                                </button>
                                <button 
                                    className={`w-full py-3.5 bg-slate-800 text-slate-300 ${theme.radius} font-bold text-xs uppercase tracking-widest border border-slate-700 hover:text-white flex items-center justify-center gap-2`}
                                    onClick={() => { 
                                        setManualClockType('in');
                                        haptic('light'); 
                                        setShowClockInModal(true); 
                                    }}
                                >
                                    <Clock size={16} /> Manual Clock In
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {shiftData.firstStartTime && (
                                    <div className="flex items-center justify-between bg-slate-950 p-3 border border-slate-800 rounded-xl mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Active Pick Start</span>
                                            <span className="text-white font-bold text-sm">
                                                {new Date(shiftData.firstStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                        <button 
                                            className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                                            onClick={() => {
                                                const d = new Date(shiftData.firstStartTime!);
                                                setManualClockTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
                                                setManualClockType('pick_start');
                                                haptic('light');
                                                setShowClockInModal(true);
                                            }}
                                        >
                                            Edit
                                        </button>
                                    </div>
                                )}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { id: 1, val: lane1, set: setLane1 },
                                        { id: 2, val: lane2, set: setLane2 },
                                        { id: 3, val: lane3, set: setLane3 },
                                        { id: 4, val: lane4, set: setLane4 }
                                    ].map(lane => (
                                        <div key={lane.id} className={`bg-slate-950 p-2 pb-3 ${theme.radius} border border-slate-800 text-center relative`}>
                                            <div className="text-[12px] text-slate-400 font-black uppercase tracking-wider mb-1">L{lane.id}</div>
                                            <input 
                                                type="number" 
                                                className="w-full bg-transparent text-white text-center text-3xl font-black outline-none placeholder:text-slate-800"
                                                placeholder="--"
                                                value={lane.val}
                                                onChange={e => { 
                                                    const val = e.target.value;
                                                    lane.set(val); 
                                                    localStorage.setItem(`draft_lane${lane.id}`, val);
                                                    haptic('light'); 
                                                }}
                                                disabled={lane.id === 1 ? isOnBreak : (isPicking || isOnBreak)}
                                            />
                                            <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 min-w-[44px]">
                                                <span className={`text-[14px] font-black tracking-tighter ${theme.text}`}>
                                                    {(DEPT_LANES[shiftData.department] || 
                                                      DEPT_LANES[`${shiftData.zone.toLowerCase()}/${shiftData.department}`] || 
                                                      DEPT_LANES[shiftData.zone.toLowerCase()])?.[lane.val] || "---"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="pt-2">
                                    {isPicking && finishTime && (
                                        <div className="text-center mb-3">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${stats.timeRemainingSecs < 0 ? 'bg-red-500/10 text-red-500 border-red-500/20' : (isWarning ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20')}`}>
                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${stats.timeRemainingSecs < 0 ? 'bg-red-500' : (isWarning ? 'bg-amber-400' : 'bg-emerald-400')}`}></div>
                                                {stats.timeRemainingSecs < 0 ? 'OVERDUE - TARGET WAS ' : (isWarning ? 'HURRY! FINISH BY ' : 'FINISH BY ')} {finishTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second: '2-digit'})} ({stats.currentTargetSeconds > 3600 ? formatHHMM(stats.currentTargetSeconds) : formatTime(stats.currentTargetSeconds)})
                                            </span>
                                        </div>
                                    )}

                                    {/* Pre-Pick Label Grid for idle state */}
                                    {!isPicking && (pendingLabelImages.length > 0 || pendingStoreLabels.length > 0) && (
                                        <div className="mb-4 bg-slate-950/30 p-3 rounded-2xl border border-slate-800/40">
                                            <div className="flex justify-between items-center mb-2 px-1">
                                                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Stored Labels ({pendingLabelImages.length}/4)</span>
                                                <button onClick={() => { setPendingLabelImages([]); setPendingStoreLabels([]); haptic('heavy'); }} className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:underline">Clear All</button>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                {Array.from({ length: Math.max(pendingLabelImages.length, pendingStoreLabels.length) }).map((_, index) => {
                                                    const img = pendingLabelImages[index];
                                                    const label = pendingStoreLabels[index] || "NO LABEL TEXT";
                                                    return (
                                                        <div key={index} className="bg-slate-900/50 border border-slate-800/40 rounded-xl p-1.5 flex items-center justify-between gap-2">
                                                            <div className="flex items-center gap-2 overflow-hidden min-w-0">
                                                                {img ? (
                                                                    <div className="w-7 h-7 rounded-lg overflow-hidden shrink-0 border border-slate-800 cursor-pointer" onClick={() => setViewingLabels([img])}>
                                                                        <img src={img} className="w-full h-full object-cover" />
                                                                    </div>
                                                                ) : <div className="w-7 h-7 rounded-lg bg-slate-950 shrink-0 border border-dashed border-slate-800" />}
                                                                <span className="text-[10px] text-white font-mono truncate font-bold">{label}</span>
                                                            </div>
                                                            <button onClick={() => { setPendingLabelImages(prev => prev.filter((_, i) => i !== index)); setPendingStoreLabels(prev => prev.filter((_, i) => i !== index)); haptic('light'); }} className="text-rose-500/50 hover:text-rose-500 p-1">✕</button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    <input 
                                        type="number" 
                                        className={`w-full p-5 mb-4 ${theme.radius} border-2 border-slate-800 bg-slate-950 text-white text-3xl font-light text-center outline-none ${theme.borderFocusLarge} transition-colors disabled:opacity-50 placeholder:text-slate-600`}
                                        placeholder="0"
                                        inputMode="numeric"
                                        value={caseCount}
                                        onChange={e => { setCaseCount(e.target.value); haptic('light'); }}
                                        disabled={isPicking || isOnBreak}
                                    />

                                    {/* Shift Notes / Reminders (Active Picking Screen) */}
                                    <div className="mb-4 text-left">
                                        <label className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2 ml-1">Shift Notes / Reminders</label>
                                        <textarea 
                                            className={`w-full bg-slate-950 p-3 rounded-2xl border border-slate-800 text-sm focus:outline-none focus:min-h-[140px] ${theme.borderFocus} text-white transition-all duration-300 min-h-[80px] placeholder:text-slate-600`}
                                            placeholder="Type any scratch notes, drop lane hints, or shift reminders here..."
                                            value={shiftData.operatorNote || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                updateShiftData({ operatorNote: val });
                                                setShiftNotes(val);
                                                localStorage.setItem('draft_operatorNote', val);
                                            }}
                                            disabled={isOnBreak}
                                        />
                                        {(shiftData.operatorNote || '').trim() && (
                                            <button 
                                                type="button"
                                                onClick={saveStandaloneNote}
                                                className="w-full mt-2 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-xl font-bold text-xs uppercase tracking-wider border border-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                                            >
                                                <FileText size={14} /> Save Note to History Table
                                            </button>
                                        )}
                                    </div>

                                    {/* Gap Timer UI */}
                                    {!isPicking && !isOnBreak && shiftData.firstStartTime && shiftData.lastStopTimestamp && (
                                        <div className={`mb-4 ${theme.panel} ${theme.radius} p-4 border border-slate-800 text-center`}>
                                            <div className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mb-1.5 leading-none">3-Min Gap Timer</div>
                                            {((now.getTime() - shiftData.lastStopTimestamp) / 1000) >= 180 ? (
                                                <div className="text-red-500 font-black text-2xl animate-pulse italic tracking-tight">
                                                    OVERRIDE: {formatTime(((now.getTime() - shiftData.lastStopTimestamp) / 1000) - 180)}
                                                </div>
                                            ) : (
                                                <div className={`${theme.text} font-black text-3xl italic tracking-tight`}>
                                                    {formatTime(180 - ((now.getTime() - shiftData.lastStopTimestamp) / 1000))}
                                                </div>
                                            )}
                                            <div className={`w-full bg-slate-800 h-1.5 ${theme.radius} mt-3 overflow-hidden`}>
                                                <div 
                                                    className={`h-full transition-all duration-1000 ${((now.getTime() - shiftData.lastStopTimestamp) / 1000) >= 180 ? 'bg-red-500' : theme.bg}`} 
                                                    style={{ width: `${Math.min(100, (((now.getTime() - shiftData.lastStopTimestamp) / 1000) / 180) * 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}

                                    {!isOnBreak ? (
                                        <>
                                            {!isPicking ? (
                                                <div className="flex flex-col gap-2">
                                                    <button 
                                                        className={`w-full py-5 bg-emerald-500 text-slate-900 ${theme.radius} font-black text-xl tracking-tighter hover:bg-emerald-400 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/10 flex items-center justify-center gap-3 min-h-[68px] italic`}
                                                        onClick={startPick}
                                                    >
                                                        <Play fill="currentColor" size={24} /> START PICKING
                                                    </button>
                                                    {!shiftData.pickPhaseEndTime ? (
                                                        <button 
                                                            className={`w-full py-4 bg-slate-800 text-slate-300 ${theme.radius} font-black text-sm uppercase tracking-widest hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-slate-700 shadow-lg`}
                                                            onClick={finishPickPhase}
                                                        >
                                                            <CheckCircle size={18} /> FINISH PICK PHASE
                                                        </button>
                                                    ) : (
                                                        <button 
                                                            className={`w-full py-4 bg-amber-500/10 text-amber-500 ${theme.radius} font-black text-sm uppercase tracking-widest hover:bg-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-amber-500/20 shadow-lg`}
                                                            onClick={undoFinishPickPhase}
                                                        >
                                                            <CheckCircle size={18} /> RESUME PICK PHASE
                                                        </button>
                                                    )}
                                                </div>
                                            ) : (
                                                <button 
                                                    className={`w-full py-5 bg-red-500 text-white ${theme.radius} font-black text-xl tracking-tighter hover:bg-red-400 active:scale-[0.98] transition-all shadow-xl shadow-red-500/10 flex items-center justify-center gap-3 min-h-[68px] italic`}
                                                    onClick={stopPick}
                                                >
                                                    <Square fill="currentColor" size={24} /> FINISH PICKING
                                                </button>
                                            )}
                                            
                                            <div className="mt-4 flex flex-col gap-2">
                                                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 flex items-center gap-3">
                                                    <AlertCircle size={18} className="text-amber-500 shrink-0" />
                                                    <p className="text-[10px] text-amber-500 font-bold uppercase tracking-widest leading-relaxed">
                                                        Press BREAK for Dinner (30m max)
                                                    </p>
                                                </div>
                                                <button 
                                                    className={`w-full py-5 bg-slate-900 text-slate-300 ${theme.radius} font-black text-sm tracking-widest uppercase hover:bg-slate-800 active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-slate-800 shadow-lg min-h-[60px]`}
                                                    onClick={startPaidBreak}
                                                >
                                                    <Coffee size={20} className="text-amber-500" /> START PAID BREAK
                                                </button>
                                            </div>
                                        </>
                                    ) : (
                                        <button 
                                            className={`w-full py-5 bg-amber-500 text-slate-900 ${theme.radius} font-bold text-lg tracking-wide hover:bg-amber-400 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2`}
                                            onClick={stopPaidBreak}
                                        >
                                            <Play fill="currentColor" size={20} /> RESUME SHIFT
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* History Section */}
                    {shiftData.history.length > 0 && (
                        <div className="mt-8">
                            <div className="flex justify-between items-end mb-4 px-1">
                                <h3 className={`text-sm font-bold text-white tracking-tight flex items-center gap-2 ${theme.font}`}>
                                    Pick History
                                    <span className={`text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-900 px-2 py-0.5 ${theme.radius} border border-slate-800`}>{shiftData.history.filter((h: any) => h.gap !== 'BREAK' && h.gap !== 'NOTE' && !h.isNote).length} RECORDS</span>
                                </h3>
                            </div>

                            {/* Enhanced Shift Analytics: Consistency & Best Pick */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div className={`${theme.panel} p-3 ${theme.radius} border border-slate-800 flex items-center gap-3`}>
                                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/20">
                                        <Award size={16} />
                                    </div>
                                    <div>
                                        <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Consistency</div>
                                        <div className="text-sm font-black text-white italic">
                                            {consistencyPercent}%
                                        </div>
                                    </div>
                                </div>
                                <div className={`${theme.panel} p-3 ${theme.radius} border border-slate-800 flex items-center gap-3`}>
                                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20">
                                        <Zap size={16} />
                                    </div>
                                    <div>
                                        <div className="text-[8px] text-slate-500 font-black uppercase tracking-tighter">Shift Best</div>
                                        <div className="text-sm font-black text-white italic">
                                            {shiftBestRate} <span className="text-[9px] font-bold text-slate-600 not-italic">PH</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className={`${theme.panel} ${theme.radius} border border-slate-800 overflow-hidden relative shadow-xl`}>
                                <div 
                                    className="max-h-[320px] sm:max-h-[400px] overflow-y-auto overflow-x-auto no-scrollbar"
                                    onTouchStart={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                    onTouchEnd={(e) => e.stopPropagation()}
                                >
                                    <table className="w-full text-[10px] sm:text-xs">
                                        <thead>
                                            <tr className="sticky top-0 bg-slate-900 text-slate-400 border-b border-slate-800 z-10 text-[9px] sm:text-[10px] uppercase font-black tracking-wider">
                                                <th className="py-2.5 px-2 sm:px-3.5 text-left whitespace-nowrap text-slate-500">Start</th>
                                                <th className="py-2.5 px-2 sm:px-3.5 text-left whitespace-nowrap text-slate-500">Label</th>
                                                <th className="py-2.5 px-2 sm:px-3.5 text-left whitespace-nowrap text-slate-500">Finish</th>
                                                <th className="py-2.5 px-2 sm:px-3.5 text-center whitespace-nowrap text-slate-500">Gap</th>
                                                <th className="py-2.5 px-2 sm:px-3.5 text-center whitespace-nowrap text-slate-500">Cases</th>
                                                <th className="py-2.5 px-2 sm:px-3.5 text-center whitespace-nowrap text-slate-500">Rate</th>
                                                <th className="py-2.5 px-2 sm:px-3.5 text-right whitespace-nowrap text-slate-500">Saved</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/40">
                                            {shiftData.history.map((entry: any, i: number) => {
                                                const isBest = entry.rate === shiftBestRate && typeof entry.rate === 'number';
                                                const isNote = entry.gap === 'NOTE' || entry.isNote;
                                                if (isNote) {
                                                    return (
                                                        <tr key={i} className="group bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500 transition-colors">
                                                            <td className="py-2.5 px-1.5 sm:px-3 text-amber-400 font-extrabold whitespace-nowrap flex items-center gap-1.5">
                                                                <FileText size={11} className="shrink-0" />
                                                                {entry.start}
                                                            </td>
                                                            <td colSpan={5} className="py-2.5 px-1.5 sm:px-3 text-amber-300 font-bold max-w-xl break-words">
                                                                <div className="flex flex-col">
                                                                    <span className="whitespace-normal leading-relaxed text-[11px] sm:text-xs font-black select-text tracking-wide">{entry.storeLabel}</span>
                                                                    {entry.departmentName && (
                                                                        <span className="text-[8px] text-amber-500/60 font-black tracking-wider uppercase block mt-1">
                                                                            LOGGED IN: {entry.departmentName}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="py-2.5 px-1.5 sm:px-3 text-right text-amber-500/70 font-black text-[9px] uppercase tracking-wider whitespace-nowrap">
                                                                NOTE
                                                            </td>
                                                        </tr>
                                                    );
                                                }
                                                return (
                                                    <tr key={i} className={`group hover:bg-slate-800/25 transition-colors ${isBest ? 'bg-amber-400/5' : ''}`}>
                                                         <td className="py-2 px-1.5 sm:px-3 text-sky-400 font-extrabold whitespace-nowrap flex items-center gap-1.5">
                                                            {isBest && <Zap size={10} className="text-amber-400 shrink-0" />}
                                                            {entry.start}
                                                        </td>
                                                        <td className="py-2 px-1.5 sm:px-3 text-sky-400 font-bold whitespace-nowrap">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="truncate max-w-[150px] sm:max-w-[220px]" title={entry.storeLabel || entry.departmentName || `Order #${i + 1}`}>
                                                                        {entry.storeLabel || entry.departmentName || `Order #${i + 1}`}
                                                                    </span>
                                                                    {(entry.labelImage || (entry.labelImages && entry.labelImages.length > 0)) && (
                                                                        <button 
                                                                            onClick={(e) => { 
                                                                                e.stopPropagation(); 
                                                                                const allI = [
                                                                                    ...(entry.labelImages || []), 
                                                                                    ...(entry.labelImage ? [entry.labelImage] : [])
                                                                                ].filter(Boolean);
                                                                                setViewingLabels(allI.length ? allI : null); 
                                                                            }} 
                                                                            className="text-emerald-400 p-0.5 hover:bg-emerald-500/10 rounded shrink-0 border border-emerald-500/20"
                                                                        >
                                                                            <Camera size={11} />
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {entry.gap !== 'BREAK' && entry.gap !== 'NOTE' && !entry.isNote && (
                                                                    <span className="text-[8px] text-slate-500 font-black tracking-wider uppercase block mt-0.5">
                                                                        {entry.departmentName || entry.department || 'Aisles'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2 px-1.5 sm:px-3 text-slate-400 whitespace-nowrap">{entry.finish || '--:--'}</td>
                                                        <td className="py-2 px-1.5 sm:px-3 text-center text-slate-400 font-mono whitespace-nowrap">{entry.gap}</td>
                                                        <td className="py-2 px-1.5 sm:px-3 text-center font-medium whitespace-nowrap">
                                                            <div className="flex flex-col items-center">
                                                                <span className={entry.isCaseCountModified ? 'text-fuchsia-400 font-bold' : 'text-white'}>{entry.cases}</span>
                                                                {entry.isCaseCountModified && <span className="text-[7px] bg-fuchsia-500/20 text-fuchsia-300 px-1 rounded border border-fuchsia-500/20 mt-0.5">MODIFIED</span>}
                                                            </div>
                                                        </td>
                                                        <td className={`py-2 px-1.5 sm:px-3 text-center font-black whitespace-nowrap ${isBest ? 'text-amber-400' : 'text-white'}`}>{entry.rate}</td>
                                                        <td className={`py-2 px-1.5 sm:px-3 text-right font-black text-[10px] sm:text-xs whitespace-nowrap ${entry.statusClass}`}>{entry.saved}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Move buttons back here, just after table */}
                            <div className="flex gap-3 mt-6 mb-10">
                                <button 
                                    className="flex-1 py-4 bg-slate-800 text-white rounded-2xl font-semibold text-sm tracking-wide hover:bg-slate-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-slate-700"
                                    onClick={() => downloadReport()}
                                >
                                    <Download size={18} /> Export
                                </button>
                                <div className="flex gap-2">
                                    <button 
                                        className="py-4 px-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm tracking-wide hover:text-white border border-slate-700"
                                        onClick={() => {
                                            const d = new Date();
                                            setManualClockTime(`${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`);
                                            setManualClockType('out');
                                            haptic('light');
                                            setShowClockInModal(true);
                                        }}
                                    >
                                        <Clock size={20} />
                                    </button>
                                    <button 
                                        className={`flex-1 py-4 ${theme.bg} text-white rounded-2xl font-semibold text-sm tracking-wide ${theme.bgHover} active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg ${theme.shadow}`}
                                        onClick={() => handleEndOfDay(false)}
                                    >
                                        <CheckCircle size={18} /> Clock Out Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
