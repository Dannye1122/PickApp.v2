import React from 'react';
import { CheckCircle, Flame, Sparkles, Share, Download, FileText } from 'lucide-react';
import { formatHHMM, formatTime } from '../../utils/formatUtils';
import { getDepartmentBreakdown } from '../../utils/statsUtils';
import { calculateAislesExemptionDetail } from '../../lib/exemptionUtils';
import { haptic } from '../../services/hapticService';

interface ShiftSummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: any;
    getSummaryMessage: () => string;
    isShiftFinalized: boolean;
    finalizedStats: any;
    shiftData: any;
    rate: number;
    targetRate: number;
    activeElapsedSeconds: number;
    isAisles: boolean;
    finalExemption: number;
    accruedPrep: number;
    accruedDinner: number;
    accruedCleanup: number;
    shiftNotes: string;
    setShiftNotes: (val: string) => void;
    updateShiftData: (data: any) => void;
    takeScreenshot: () => Promise<string | undefined>;
    downloadReport: () => void;
    endShift: () => void;
}

export const ShiftSummaryModal: React.FC<ShiftSummaryModalProps> = ({
    isOpen,
    onClose,
    theme,
    getSummaryMessage,
    isShiftFinalized,
    finalizedStats,
    shiftData,
    rate,
    targetRate,
    activeElapsedSeconds,
    isAisles,
    finalExemption,
    accruedPrep,
    accruedDinner,
    accruedCleanup,
    shiftNotes,
    setShiftNotes,
    updateShiftData,
    takeScreenshot,
    downloadReport,
    endShift
}) => {
    if (!isOpen) return null;

    return (
        <div id="summary-modal" className="fixed inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-[150] px-4 backdrop-blur-sm pt-safe-top pb-safe-bottom">
            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-[340px] text-center border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <div className={`w-16 h-16 bg-gradient-to-br ${theme.gradient || 'from-emerald-400 to-teal-600'} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg ${theme.shadow || ''}`}>
                    <CheckCircle size={32} className="text-white" />
                </div>
                <h3 className="text-white text-2xl font-bold mb-1 tracking-tight">Shift Complete</h3>
                <p className="text-slate-400 mb-6 text-sm">{getSummaryMessage()}</p>
                
                <div className="bg-slate-950 rounded-2xl p-4 mb-6 border border-slate-800/50 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-medium">Total Cases</span>
                        <span className="text-white font-bold text-lg">{isShiftFinalized ? finalizedStats?.cases : shiftData.totalCases}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-medium">Avg Pick Rate</span>
                        <span className={`font-bold text-lg ${(isShiftFinalized ? (finalizedStats?.rate || 0) : rate) >= targetRate ? 'text-emerald-400' : 'text-red-400'}`}>
                            {isShiftFinalized ? finalizedStats?.rate : rate} <span className="text-xs text-slate-400 font-normal">P/H</span>
                        </span>
                    </div>
                    {(shiftData.firestreak || 0) > 0 && (
                        <div className="flex justify-between items-center py-1.5 px-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
                            <div className="flex items-center gap-2">
                                <Flame size={14} className="text-orange-500 fill-orange-500" />
                                <span className="text-orange-500 text-xs font-black uppercase tracking-widest">Firestreak</span>
                            </div>
                            <span className="text-white font-black text-sm">{shiftData.firestreak} SHIFTS</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-sm font-medium">Shift Time</span>
                        <span className="text-white font-bold text-lg">{formatHHMM(isShiftFinalized ? (finalizedStats?.activeElapsedSeconds || 0) : activeElapsedSeconds)}</span>
                    </div>
                    {isAisles && (
                        <div className="border border-sky-500/10 bg-sky-950/20 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center border-b border-sky-500/10 pb-2">
                                <span className="text-sky-400 text-sm font-bold uppercase tracking-tighter flex items-center gap-1.5 font-bold">
                                    <Sparkles size={11} className="text-sky-400" />
                                    PWA Exemption
                                </span>
                                <span className="text-sky-400 font-extrabold text-lg">+{formatTime(isShiftFinalized ? (finalizedStats?.exemption || 0) : finalExemption)}</span>
                            </div>
                            
                            <div className="space-y-1.5 text-slate-400 text-[10px] font-mono leading-relaxed select-none">
                                <div className="flex justify-between">
                                    <span>Prep (Max 10m):</span>
                                    <span className="text-slate-200 font-bold">
                                        +{formatTime(isShiftFinalized ? calculateAislesExemptionDetail(finalizedStats?.totalSeconds || 0).prep : accruedPrep)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Dinner (Max 30m):</span>
                                    <span className="text-slate-200 font-bold">
                                        +{formatTime(isShiftFinalized ? calculateAislesExemptionDetail(finalizedStats?.totalSeconds || 0).dinner : accruedDinner)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Cleanup (Max 5m):</span>
                                    <span className="text-slate-200 font-bold">
                                        +{formatTime(isShiftFinalized ? calculateAislesExemptionDetail(finalizedStats?.totalSeconds || 0).cleanup : accruedCleanup)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className="flex justify-between items-center border-t border-slate-800/50 pt-2">
                        <span className="text-slate-400 text-sm font-medium">Break / Idle Duration</span>
                        <div className="text-right">
                            <div className="text-white font-bold text-lg">
                                {formatHHMM(isShiftFinalized ? (finalizedStats?.breakSeconds || 0) : shiftData.totalExcludedTime)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Department Breakdown */}
                {(() => {
                    const breakdown = getDepartmentBreakdown(shiftData.history);
                    if (breakdown.length === 0) return null;
                    return (
                        <div className="border border-slate-800/80 bg-slate-950/40 rounded-2xl p-3.5 space-y-2.5 text-left mb-6 max-h-[165px] overflow-y-auto custom-scrollbar">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-800/60 pb-1.5 flex justify-between items-center">
                                <span>Department Summary</span>
                                <span className="text-[8px] font-bold text-sky-400 font-mono">MULTI-DEPOT</span>
                            </h4>
                            <div className="space-y-2.5">
                                {breakdown.map((item: any) => {
                                    const isAbove = item.rate >= item.targetRate;
                                    const netSec = item.netSeconds || 0;
                                    const isNetGood = netSec >= 0;
                                    const netFormatted = `${isNetGood ? '+' : '-'}${formatTime(Math.abs(netSec))}`;
                                    return (
                                        <div key={item.department} className="flex justify-between items-center text-xs">
                                            <div>
                                                <span className="text-white font-bold">{item.departmentName}</span>
                                                <span className="text-slate-500 text-[9px] block">
                                                    {item.picksCount} {item.picksCount === 1 ? 'order' : 'orders'} • target {item.targetRate}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <span className={`font-black ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {item.rate} <span className="text-[9px] font-normal text-slate-400">P/H</span>
                                                    </span>
                                                    <span className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded ${isNetGood ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                                                        {netFormatted}
                                                    </span>
                                                </div>
                                                <span className="text-slate-300 font-mono text-[9px] block">
                                                    {item.cases} {item.cases === 1 ? 'case' : 'cases'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })()}

                <div className="mb-6 text-left">
                    <label className="block text-slate-400 text-xs font-medium uppercase mb-2">Shift Notes / Reminders</label>
                    <textarea 
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-white text-sm focus:outline-none focus:border-emerald-500 min-h-[80px] focus:min-h-[140px] transition-all duration-300"
                        placeholder="Type any scratch notes, drop lane hints, or shift reminders here..."
                        value={shiftData.operatorNote || shiftNotes}
                        onChange={(e) => {
                            const val = e.target.value;
                            updateShiftData({ operatorNote: val });
                            setShiftNotes(val);
                            localStorage.setItem('draft_operatorNote', val);
                        }}
                    />
                </div>

                <div className="sticky bottom-0 bg-slate-900 pt-4 border-t border-slate-800 flex flex-wrap gap-2">
                    <button 
                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                        onClick={async () => {
                            haptic('light');
                            const totalCases = isShiftFinalized ? (finalizedStats?.totalCases || shiftData.totalCases) : shiftData.totalCases;
                            const shareText = `Shift Update: Picked ${totalCases} cases today on PickApp!`;
                            
                            const dataUrl = await takeScreenshot();
                            if (dataUrl) {
                                const link = document.createElement('a');
                                link.href = dataUrl;
                                link.download = `shift_summary_${new Date().toISOString()}.jpg`;
                                
                                try {
                                    await navigator.clipboard.writeText(shareText);
                                    if (navigator.share) {
                                        const blob = await (await fetch(dataUrl)).blob();
                                        const file = new File([blob], 'pickapp_summary.jpg', { type: 'image/jpeg' });
                                        
                                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                            await navigator.share({
                                                title: 'My Shift Summary',
                                                text: shareText,
                                                files: [file]
                                            });
                                            return;
                                        }
                                    }
                                } catch (e) {
                                    if ((e as Error).name === 'AbortError') return;
                                }
                                
                                link.click();
                                alert("Screenshot saved & summary copied to clipboard!");
                            }
                        }}
                    >
                        <Share size={16} /> Share & Save
                    </button>
                    <button 
                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                        onClick={() => downloadReport()}
                    >
                        <Download size={16} /> Report
                    </button>
                    <button 
                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors flex items-center justify-center gap-2 min-w-[100px]"
                        onClick={async () => {
                            haptic('light');
                            const dataToUse = isShiftFinalized && finalizedStats ? finalizedStats : {
                                rate,
                                activeElapsedSeconds,
                                cases: shiftData.totalCases
                            };
                            const reportTxt = `PickApp Shift: ${dataToUse.cases || shiftData.totalCases} cases at ${dataToUse.rate} P/H. Steps: ${shiftData.steps}.`;
                            try {
                                await navigator.clipboard.writeText(reportTxt);
                                alert("Summary copied!");
                            } catch (e) {
                                alert("Copy failed.");
                            }
                        }}
                    >
                        <FileText size={16} /> Copy
                    </button>
                    <button 
                        className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors min-w-[80px]"
                        onClick={() => { haptic('light'); onClose(); }}
                    >
                        Review
                    </button>
                    <button 
                        type="button"
                        className={`flex-1 py-3.5 text-white rounded-2xl font-semibold tracking-wide transition-all shadow-lg bg-emerald-500 hover:bg-emerald-400 shadow-emerald-500/20 min-w-[100px]`}
                        onClick={endShift}
                    >
                        FINISH & EXIT
                    </button>
                </div>
            </div>
        </div>
    );
};
