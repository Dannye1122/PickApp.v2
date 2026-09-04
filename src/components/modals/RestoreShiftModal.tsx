import React, { useEffect, useState } from 'react';
import { RotateCcw, X, History, Sparkles, CheckCircle } from 'lucide-react';
import { haptic } from '../../services/hapticService';
import { restoreShiftFromReportText } from '../../services/shiftReportService';
import { fetchShiftSummaries } from '../../services/leaderboardService';
import { getShiftSnapshots } from '../../services/indexedDbService';

interface RestoreShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    restoreText: string;
    setRestoreText: (text: string) => void;
    restoreStatus: { type: 'success' | 'info' | 'error'; msg: string } | null;
    setRestoreStatus: (status: { type: 'success' | 'info' | 'error'; msg: string } | null) => void;
    operator: string;
    onShiftRestored: (summaries: any[]) => void;
    onActiveSessionRestored?: (snapshotData: any) => void;
}

export const RestoreShiftModal: React.FC<RestoreShiftModalProps> = ({
    isOpen,
    onClose,
    restoreText,
    setRestoreText,
    restoreStatus,
    setRestoreStatus,
    operator,
    onShiftRestored,
    onActiveSessionRestored
}) => {
    const [snapshots, setSnapshots] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && operator) {
            getShiftSnapshots(operator).then(list => setSnapshots(list || [])).catch(() => {});
        }
    }, [isOpen, operator]);

    if (!isOpen) return null;

    const handleRestore = async () => {
        haptic('heavy');
        setRestoreStatus({ type: 'info', msg: 'Parsing & restoring shift...' });
        const targetOp = operator || 'DASERGHIE';
        const res = await restoreShiftFromReportText(restoreText, targetOp);
        if (res.success) {
            setRestoreStatus({ type: 'success', msg: res.message });
            fetchShiftSummaries(targetOp, true).then(fresh => {
                onShiftRestored(fresh);
            }).catch(e => console.warn('Could not fetch restored shift summaries:', e));
            setTimeout(() => {
                onClose();
                setRestoreText('');
                setRestoreStatus(null);
            }, 1500);
        } else {
            setRestoreStatus({ type: 'error', msg: res.message });
        }
    };

    const handleRestoreSnapshot = (snap: any) => {
        haptic('heavy');
        if (!snap || !snap.shiftData) return;
        if (onActiveSessionRestored) {
            onActiveSessionRestored(snap.shiftData);
            setRestoreStatus({ type: 'success', msg: 'Active Shift Session Snapshot Restored!' });
            setTimeout(() => {
                onClose();
                setRestoreStatus(null);
            }, 1200);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in duration-200 flex flex-col gap-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3 shrink-0">
                    <div className="flex items-center gap-2 text-white font-black text-base italic">
                        <RotateCcw className="text-emerald-400" size={18} /> RESTORE SHIFT SESSION
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
                        <X size={18} />
                    </button>
                </div>
                
                {snapshots.length > 0 && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col gap-2 shrink-0">
                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-wider">
                            <Sparkles size={14} /> Auto-Saved Active Session Snapshot Found
                        </div>
                        <p className="text-[11px] text-slate-300">
                            A recent active shift snapshot was backed up automatically on this device. Tap below to instantly recover your active break, orders, and cases.
                        </p>
                        <div className="flex flex-col gap-1.5 mt-1">
                            {snapshots.slice(0, 3).map((snap, i) => {
                                const data = snap.shiftData || {};
                                const timeStr = new Date(snap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                const dateStr = new Date(snap.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
                                const cases = data.caseCount || data.totalCases || 0;
                                const entries = data.history?.length || 0;
                                const isBreak = data.isOnBreak;

                                return (
                                    <button
                                        key={i}
                                        onClick={() => handleRestoreSnapshot(snap)}
                                        className="flex items-center justify-between p-2.5 bg-slate-950/80 hover:bg-slate-950 border border-emerald-500/30 rounded-xl text-left transition-all active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-2">
                                            <History size={14} className="text-emerald-400 shrink-0" />
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-white font-mono">
                                                    {dateStr} @ {timeStr} {isBreak ? '☕ (ON BREAK)' : ''}
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    {cases} cases • {entries} orders logged
                                                </span>
                                            </div>
                                        </div>
                                        <span className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg shrink-0">
                                            Restore
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed font-bold">
                    Or paste your exported Shift Report CSV / plain text report below to restore a historical shift into your Rota and history:
                </p>

                <textarea
                    value={restoreText}
                    onChange={(e) => setRestoreText(e.target.value)}
                    placeholder="Paste Shift Report CSV / JSON here..."
                    rows={6}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500/50 resize-none"
                />

                {restoreStatus && (
                    <div className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider ${restoreStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : restoreStatus.type === 'info' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {restoreStatus.msg}
                    </div>
                )}

                <div className="flex gap-3 pt-2 shrink-0">
                    <button
                        onClick={() => {
                            setRestoreText('');
                            setRestoreStatus(null);
                            onClose();
                        }}
                        className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-wider hover:text-white"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleRestore}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-400 shadow-lg shadow-emerald-500/20"
                    >
                        Restore Shift Report
                    </button>
                </div>
            </div>
        </div>
    );
};
