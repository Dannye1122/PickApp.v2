import React from 'react';
import { Sparkles, Clock, LogOut, Activity, Coffee, Edit2, Check, X, Camera, Download } from 'lucide-react';
import { formatHHMM, formatTime } from '../../utils/formatUtils';
import { getDepartmentBreakdown, isBreakEntry, isNoteEntry, isPickEntry } from '../../utils/statsUtils';
import { haptic } from '../../services/hapticService';
import { fetchShiftSummaries, saveShiftSummary } from '../../services/leaderboardService';
import { generateFullShiftReport } from '../../services/shiftReportService';
import { deviceExport } from '../../lib/deviceApi';
import { auth } from '../../lib/firebase';

interface HistoricalShiftModalProps {
    viewingPastSummary: any;
    onClose: () => void;
    shiftData: any;
    isUserAdmin: () => boolean;
    storedShiftPhotos: any[];
    setShiftSummaries: React.Dispatch<React.SetStateAction<any[]>>;
    setViewingPastSummary: (summary: any) => void;
    setViewingLabels: (labels: string[] | null) => void;
    editingOrderIndex: number | null;
    setEditingOrderIndex: (index: number | null) => void;
    editingOrderLabel: string;
    setEditingOrderLabel: (label: string) => void;
    handleSavePastOrderLabel: (idx: number) => void;
}

export const HistoricalShiftModal: React.FC<HistoricalShiftModalProps> = ({
    viewingPastSummary,
    onClose,
    shiftData,
    isUserAdmin,
    storedShiftPhotos,
    setShiftSummaries,
    setViewingPastSummary,
    setViewingLabels,
    editingOrderIndex,
    setEditingOrderIndex,
    editingOrderLabel,
    setEditingOrderLabel,
    handleSavePastOrderLabel
}) => {
    const [editingBreak, setEditingBreak] = React.useState(false);
    const [newBreakSecs, setNewBreakSecs] = React.useState(viewingPastSummary?.breakSeconds || 0);

    const handleSaveBreak = async () => {
        if (!viewingPastSummary) return;
        haptic('heavy');
        const updatedSummary = {
            ...viewingPastSummary,
            breakSeconds: newBreakSecs,
            isBreakModified: true
        };
        
        await saveShiftSummary(updatedSummary);
        
        setShiftSummaries(prev => prev.map(s => s.id === viewingPastSummary.id ? updatedSummary : s));
        setViewingPastSummary(updatedSummary);
        setEditingBreak(false);
    };

    if (!viewingPastSummary) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[110] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900 w-full max-w-md max-h-[85vh] flex flex-col rounded-3xl border border-slate-800 shadow-2xl animate-in zoom-in duration-200">
                
                <div className="p-6 shrink-0 border-b border-slate-800 flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-black text-white flex items-center gap-2">
                            <Sparkles size={20} className="text-sky-400" />
                            Shift Detail Summary
                        </h3>
                        <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold font-sans mt-0.5">
                            Recorded on <span className="text-white font-mono">{new Date(viewingPastSummary.date ? (viewingPastSummary.date.includes('T') ? viewingPastSummary.date : `${viewingPastSummary.date}T12:00:00`) : (viewingPastSummary.clockInTime || viewingPastSummary.timestamp?.seconds * 1000 || Date.now())).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                        </p>
                    </div>
                    <div className="text-[10px] uppercase font-black tracking-widest px-2.5 py-1 bg-sky-500/10 border border-sky-500/20 rounded-md text-sky-400 font-bold self-start mt-1 shrink-0">
                        {viewingPastSummary.department || 'Aisles'} - {viewingPastSummary.zone || 'Zone A'}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-6">
                    {(() => {
                        const hist = viewingPastSummary.history || [];
                        
                        // Derive activeSeconds accurately if saved as 0 or missing
                        let derivedActiveSecs = viewingPastSummary.activeSeconds || 0;
                        if (derivedActiveSecs <= 60 && hist.length > 0) {
                            let sumElapsed = 0;
                            hist.forEach((h: any) => {
                                if (!isPickEntry(h)) return;
                                const c = parseInt(h.cases) || 0;
                                let el = h.elapsedSeconds;
                                if (el === undefined || isNaN(el) || el <= 0) {
                                    const r = parseFloat(h.rate);
                                    el = (r > 0 && c > 0) ? Math.round((c / r) * 3600) : 0;
                                }
                                sumElapsed += el;
                            });
                            if (sumElapsed > 0) derivedActiveSecs = sumElapsed;
                        }

                        // Derive total duration from clock times if saved as 0
                        let derivedTotalSecs = viewingPastSummary.totalSeconds || 0;
                        if (derivedTotalSecs <= 60) {
                            if (viewingPastSummary.clockInTime && viewingPastSummary.clockOutTime) {
                                const diff = (viewingPastSummary.clockOutTime - viewingPastSummary.clockInTime) / 1000;
                                if (diff > 0) derivedTotalSecs = diff;
                            } else if (derivedActiveSecs > 0) {
                                derivedTotalSecs = derivedActiveSecs + (viewingPastSummary.breakSeconds || 2700);
                            }
                        }

                        // Derive break seconds
                        let derivedBreakSecs = viewingPastSummary.breakSeconds || 0;
                        if (derivedBreakSecs === 0 && derivedTotalSecs > derivedActiveSecs) {
                            derivedBreakSecs = derivedTotalSecs - derivedActiveSecs;
                        }

                        // Derive true final rate
                        let derivedFinalRate = viewingPastSummary.finalRate || 0;
                        if ((derivedFinalRate === 0 || derivedActiveSecs > 60) && (viewingPastSummary.totalCases || 0) > 0 && derivedActiveSecs > 10) {
                            const calculatedRate = Math.round(((viewingPastSummary.totalCases || 0) / derivedActiveSecs) * 3600);
                            if (derivedFinalRate === 0 || Math.abs(calculatedRate - derivedFinalRate) > 5) {
                                derivedFinalRate = calculatedRate;
                            }
                        }

                        const targetRateVal = shiftData.scoreConfig?.[viewingPastSummary.department || 'Aisles']?.targetRate || 220;
                        const targetTotalSec = ((viewingPastSummary.totalCases || 0) / targetRateVal) * 3600;
                        const netSavedSecs = Math.round(targetTotalSec - derivedActiveSecs);

                        return (
                            <>
                                {/* Shift Logistics/Timings */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Shift Timeline & Logistics</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Clock size={10}/> Clock In</div>
                                            <div className="text-lg font-black text-white">{viewingPastSummary.clockInTime ? new Date(viewingPastSummary.clockInTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
                                        </div>
                                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><LogOut size={10}/> Clock Out</div>
                                            <div className="text-lg font-black text-white">{viewingPastSummary.clockOutTime ? new Date(viewingPastSummary.clockOutTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '--:--'}</div>
                                        </div>
                                        <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800/80">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5"><Activity size={10}/> Gross Length</div>
                                            <div className="text-lg font-black text-white">{formatHHMM(derivedTotalSecs)}</div>
                                        </div>
                                        <div className={`bg-slate-950/50 p-3 rounded-2xl border ${viewingPastSummary.isBreakModified ? 'border-amber-500/50' : 'border-slate-800/80'}`}>
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center justify-between gap-1.5">
                                                <span className="flex items-center gap-1.5"><Coffee size={10}/> Break Time</span>
                                                {(isUserAdmin() || (viewingPastSummary.userName || '').toUpperCase().trim() === (shiftData.operator || '').toUpperCase().trim()) && !editingBreak && (
                                                    <button onClick={() => setEditingBreak(true)} className="text-sky-400 hover:text-sky-300">
                                                        <Edit2 size={10} />
                                                    </button>
                                                )}
                                            </div>
                                            {editingBreak ? (
                                                <div className="flex items-center gap-1">
                                                    <input 
                                                        type="number"
                                                        value={Math.floor(newBreakSecs / 60)}
                                                        onChange={(e) => setNewBreakSecs(parseInt(e.target.value) * 60)}
                                                        className="w-12 bg-slate-900 text-white text-lg font-black rounded p-1"
                                                    />
                                                    <span className="text-white font-black">m</span>
                                                    <button onClick={handleSaveBreak} className="bg-emerald-500 text-slate-900 rounded p-1"><Check size={12} /></button>
                                                    <button onClick={() => setEditingBreak(false)} className="bg-slate-700 text-white rounded p-1"><X size={12} /></button>
                                                </div>
                                            ) : (
                                                <div className={`text-lg font-black ${viewingPastSummary.isBreakModified ? 'text-amber-500' : 'text-amber-400'}`}>
                                                    {formatHHMM(derivedBreakSecs)}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Performance Stats */}
                                <div>
                                    <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Total Picking Performance</h4>
                                    <div className="grid grid-cols-3 gap-3">
                                        <div className="bg-sky-950/20 p-3 rounded-2xl border border-sky-900/30 text-center">
                                            <div className="text-[9px] font-bold text-sky-500/70 uppercase tracking-wider mb-1">Pick Rate</div>
                                            <div className="text-xl font-black text-sky-400">{derivedFinalRate || 0}</div>
                                            <div className="text-[8px] font-bold text-slate-500 mt-1">CASES / HR</div>
                                        </div>
                                        <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-center">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Total Cases</div>
                                            <div className="text-xl font-black text-white">{(viewingPastSummary.totalCases || 0).toLocaleString()}</div>
                                            <div className="text-[8px] font-bold text-slate-500 mt-1">IN {formatHHMM(derivedActiveSecs).split(':')[0]}h {formatHHMM(derivedActiveSecs).split(':')[1]}m</div>
                                        </div>
                                        <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center flex flex-col justify-center">
                                            <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Net Saved</div>
                                            <div className={`text-xl font-black ${netSavedSecs >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {netSavedSecs >= 0 ? '+' : '-'}
                                                {formatTime(Math.abs(netSavedSecs)).split(':')[0]}<span className="text-xs">m</span>
                                            </div>
                                            <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Vs Target</div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        );
                    })()}

                    {/* Activity & Movement Tracking */}
                    <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Activity & Movement Tracking</h4>
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Steps Count</div>
                                <div className="text-xl font-black text-amber-500">{(viewingPastSummary.steps || 0).toLocaleString()}</div>
                                <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Total Steps</div>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Distance (Km)</div>
                                <div className="text-xl font-black text-emerald-400">{((viewingPastSummary.steps || 0) * 0.00075).toFixed(2)}</div>
                                <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Distance Km</div>
                            </div>
                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-800 text-center">
                                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Efficiency</div>
                                <div className="text-xl font-black text-blue-400">{(viewingPastSummary.totalCases || 0) > 0 ? Math.round((viewingPastSummary.steps || 0) / (viewingPastSummary.totalCases || 1)) : '--'}</div>
                                <div className="text-[8px] font-bold text-slate-500 mt-1 uppercase">Steps / Case</div>
                            </div>
                        </div>
                    </div>

                    {/* Department Breakdown */}
                    {(() => {
                        const breakdown = getDepartmentBreakdown(viewingPastSummary.history, viewingPastSummary);
                        if (breakdown.length === 0) return null;
                        return (
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Department Breakdown</h4>
                                <div className="grid grid-cols-1 gap-2.5">
                                    {breakdown.map((item) => {
                                        const isAbove = item.rate >= item.targetRate;
                                        return (
                                            <div key={item.department} className="bg-slate-950/45 p-3 rounded-2xl border border-slate-800/80 flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2.5 h-2.5 rounded-full ${
                                                        item.zone === 'CHILLER' ? 'bg-blue-400' :
                                                        item.zone === 'FREEZER' ? 'bg-indigo-400' :
                                                        'bg-amber-400'
                                                    }`} />
                                                    <div>
                                                        <div className="text-xs font-black text-white">{item.departmentName}</div>
                                                        <div className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">
                                                            {item.picksCount} {item.picksCount === 1 ? 'order' : 'orders'} • target {item.targetRate}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-sm font-black ${isAbove ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {item.rate} <span className="text-[8px] font-normal text-slate-400">P/H</span>
                                                    </div>
                                                    <div className="text-[10px] font-mono text-slate-300">
                                                        {item.cases} {item.cases === 1 ? 'case' : 'cases'}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}

                    {/* Orders Details (History) */}
                    {viewingPastSummary.history && viewingPastSummary.history.length > 0 && (
                        <div>
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 flex justify-between items-end gap-2">
                                Order Details
                                <span className="bg-slate-800 text-[8px] px-2 py-0.5 rounded text-slate-300 shrink-0">{viewingPastSummary.history.filter((h: any) => isPickEntry(h)).length} PICKS</span>
                            </h4>
                            <div className="bg-slate-950/40 rounded-2xl border border-slate-800 overflow-hidden">
                                <table className="w-full text-[10px] sm:text-xs">
                                    <thead className="bg-slate-900 border-b border-slate-800">
                                        <tr className="text-slate-500 text-[8px] uppercase tracking-wider font-black">
                                            <th className="py-2.5 px-3 text-left w-1/3">Time</th>
                                            <th className="py-2.5 px-2 text-left">Label</th>
                                            <th className="py-2.5 px-2 text-center">Cases</th>
                                            <th className="py-2.5 px-3 text-right">Rate</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                        {viewingPastSummary.history.map((h: any, idx: number) => {
                                            const isNote = isNoteEntry(h);
                                            if (isNote) {
                                                return (
                                                    <tr key={idx} className="bg-amber-500/5 hover:bg-amber-500/10 border-l-2 border-l-amber-500 transition-colors">
                                                        <td className="py-2.5 px-3 text-amber-400 font-extrabold whitespace-nowrap flex items-center gap-1.5 font-mono">
                                                            {h.start}
                                                        </td>
                                                        <td colSpan={2} className="py-2.5 px-2 text-amber-300 font-bold break-words whitespace-normal text-[11px] sm:text-xs">
                                                            <div className="flex flex-col">
                                                                <span className="leading-relaxed font-black select-text tracking-wide">{h.storeLabel}</span>
                                                                {h.departmentName && (
                                                                    <span className="text-[7px] text-amber-500/60 font-black tracking-wider uppercase block mt-0.5">
                                                                        LOGGED IN: {h.departmentName}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-2.5 px-3 text-right text-amber-500/70 font-black text-[9px] uppercase tracking-wider whitespace-nowrap">
                                                            NOTE
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            const isBreak = isBreakEntry(h);
                                            const isEditingThisOrder = editingOrderIndex === idx;
                                            const orderLabelToDisplay = (() => {
                                                if (isBreak) return h.gap?.toUpperCase().includes('DINNER') ? 'DINNER BREAK' : 'BREAK';
                                                const rawLabel = (h.storeLabel || '').trim();
                                                if (rawLabel && rawLabel !== '-') return rawLabel;
                                                if (h.departmentName || h.department) return h.departmentName || h.department;
                                                return `Order #${idx + 1}`;
                                            })();

                                            return (
                                                <tr key={idx} className={`hover:bg-slate-800/30 transition-colors ${isBreak ? 'bg-amber-500/5' : ''}`}>
                                                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono tracking-tighter">
                                                        {h.start} <span className="text-slate-600 font-sans mx-0.5">→</span> {h.finish}
                                                    </td>
                                                    <td className={`py-2.5 px-2 ${isBreak ? 'text-amber-400' : 'text-sky-400'} font-bold max-w-[200px]`}>
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                {isEditingThisOrder ? (
                                                                    <div className="flex items-center gap-1 my-1">
                                                                        <input
                                                                            type="text"
                                                                            value={editingOrderLabel}
                                                                            onChange={(e) => setEditingOrderLabel(e.target.value)}
                                                                            className="bg-slate-900 border border-sky-500/50 text-white text-[11px] font-mono px-2 py-0.5 rounded outline-none focus:ring-1 focus:ring-sky-400 max-w-[130px]"
                                                                            autoFocus
                                                                            placeholder="Store / Aisle label"
                                                                            onKeyDown={(e) => {
                                                                                if (e.key === 'Enter') handleSavePastOrderLabel(idx);
                                                                                if (e.key === 'Escape') { setEditingOrderIndex(null); setEditingOrderLabel(''); }
                                                                            }}
                                                                        />
                                                                        <button
                                                                            onClick={() => handleSavePastOrderLabel(idx)}
                                                                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 p-1 rounded transition-colors shrink-0"
                                                                            title="Save Label"
                                                                        >
                                                                            <Check size={12} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setEditingOrderIndex(null); setEditingOrderLabel(''); }}
                                                                            className="bg-slate-800 hover:bg-slate-700 text-slate-400 p-1 rounded transition-colors shrink-0"
                                                                            title="Cancel"
                                                                        >
                                                                            <X size={12} />
                                                                        </button>
                                                                    </div>
                                                                ) : (
                                                                    <>
                                                                        <span className="truncate max-w-[140px] sm:max-w-[180px]" title={orderLabelToDisplay}>
                                                                            {orderLabelToDisplay}
                                                                        </span>
                                                                        {!isBreak && (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation();
                                                                                    setEditingOrderIndex(idx);
                                                                                    setEditingOrderLabel(h.storeLabel || (orderLabelToDisplay.startsWith('Order #') ? '' : orderLabelToDisplay));
                                                                                }}
                                                                                className="text-slate-500 hover:text-sky-400 p-0.5 rounded transition-colors shrink-0"
                                                                                title="Edit Order Label"
                                                                            >
                                                                                <Edit2 size={11} />
                                                                            </button>
                                                                        )}
                                                                    </>
                                                                )}
                                                                {(h.labelImage || (h.labelImages && h.labelImages.length > 0)) && (
                                                                    <button 
                                                                        onClick={(e) => { e.stopPropagation(); setViewingLabels(h.labelImages?.length ? h.labelImages : (h.labelImage ? [h.labelImage] : null)); }} 
                                                                        className="text-emerald-400 p-1 hover:bg-emerald-500/20 rounded shrink-0 border border-emerald-500/20"
                                                                    >
                                                                        <Camera size={12} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {!isBreak && !isNote && orderLabelToDisplay !== (h.departmentName || h.department || 'Aisles') && (
                                                                <span className="text-[8px] text-slate-500 font-bold tracking-wider uppercase block mt-0.5">
                                                                    {h.departmentName || h.department || 'Aisles'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-2.5 px-2 text-center text-white font-medium">{isBreak ? '-' : h.cases}</td>
                                                    <td className={`py-2.5 px-3 text-right font-black w-[50px] ${h.rate && h.rate > 0 ? (h.statusClass?.includes('emerald') ? 'text-emerald-400' : 'text-slate-300') : 'text-slate-500'}`}>
                                                        {h.rate || '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* General Shift Labels Images */}
                    {(() => {
                        const extractedLabels: {title: string, url: any, isPick: boolean}[] = [];
                        if (viewingPastSummary.labelImage) {
                            extractedLabels.push({ title: "Base Label", url: viewingPastSummary.labelImage, isPick: false });
                        }
                        if (Array.isArray(viewingPastSummary.labelImages)) {
                            viewingPastSummary.labelImages.forEach((img: any, i: number) => {
                                extractedLabels.push({ title: `Main Label ${i+1}`, url: img, isPick: false });
                            });
                        }
                        if (Array.isArray(storedShiftPhotos) && storedShiftPhotos.length > 0) {
                            storedShiftPhotos.forEach((photo: any, i: number) => {
                                if (photo && photo.blob) {
                                    extractedLabels.push({ title: `Stored Photo ${i+1}`, url: photo.blob, isPick: false });
                                }
                            });
                        }
                        if (Array.isArray(viewingPastSummary.history)) {
                            viewingPastSummary.history.forEach((h: any, i: number) => {
                                if (h.labelImage) extractedLabels.push({ title: `Order ${i+1}`, url: h.labelImage, isPick: true });
                                if (Array.isArray(h.labelImages)) {
                                    h.labelImages.forEach((img: any, j: number) => {
                                        extractedLabels.push({ title: `Pick ${i+1}: Label ${h.labelImages.length > 1 ? j+1 : ''}`, url: img, isPick: true });
                                    });
                                }
                            });
                        }
                        
                        if (extractedLabels.length === 0) return null;
                        
                        return (
                            <div>
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">All Scanned Labels</h4>
                                <div className="flex flex-wrap gap-2">
                                    {extractedLabels.map((lbl, idx) => (
                                        <button 
                                            key={idx}
                                            onClick={() => setViewingLabels([lbl.url])}
                                            className={`px-4 py-2.5 bg-${lbl.isPick ? 'emerald' : 'sky'}-500/10 text-${lbl.isPick ? 'emerald' : 'sky'}-400 border border-${lbl.isPick ? 'emerald' : 'sky'}-500/20 rounded-xl text-[10px] font-black tracking-widest uppercase transition-colors hover:bg-${lbl.isPick ? 'emerald' : 'sky'}-500/20 flex items-center gap-2`}
                                        >
                                            <Camera size={12} /> {lbl.title}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </div>
                
                <div className="p-4 border-t border-slate-800 shrink-0 select-none flex gap-3">
                    <button
                        onClick={async () => {
                            haptic('medium');
                            const csvContent = generateFullShiftReport(viewingPastSummary);
                            const dateStr = (viewingPastSummary.date || '27.08.2026').replace(/-/g, '');
                            const operatorName = (viewingPastSummary.userName || viewingPastSummary.operator || 'MIABRUDAN').toUpperCase().trim();
                            const fileName = `ShiftReport_${operatorName}_${dateStr}.csv`;
                            await deviceExport(csvContent, fileName, true);
                        }}
                        className="flex-1 py-4 bg-emerald-500/10 hover:bg-emerald-500/20 active:scale-[0.98] text-xs text-emerald-400 font-bold tracking-wider rounded-2xl border border-emerald-500/20 transition-all flex items-center justify-center gap-2 uppercase font-mono"
                    >
                        <Download size={16} /> Download CSV
                    </button>
                    <button 
                        onClick={onClose}
                        className="px-6 py-4 bg-slate-800 hover:bg-slate-700 active:scale-[0.98] text-xs text-white uppercase font-black tracking-widest rounded-2xl border border-slate-700 transition-all text-center"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
