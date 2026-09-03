import React from 'react';
import { RotateCcw, X } from 'lucide-react';
import { haptic } from '../../services/hapticService';
import { restoreShiftFromReportText } from '../../services/shiftReportService';
import { fetchShiftSummaries } from '../../services/leaderboardService';

interface RestoreShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    restoreText: string;
    setRestoreText: (text: string) => void;
    restoreStatus: { type: 'success' | 'info' | 'error'; msg: string } | null;
    setRestoreStatus: (status: { type: 'success' | 'info' | 'error'; msg: string } | null) => void;
    operator: string;
    onShiftRestored: (summaries: any[]) => void;
}

export const RestoreShiftModal: React.FC<RestoreShiftModalProps> = ({
    isOpen,
    onClose,
    restoreText,
    setRestoreText,
    restoreStatus,
    setRestoreStatus,
    operator,
    onShiftRestored
}) => {
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

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-slate-900 w-full max-w-lg rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in duration-200 flex flex-col gap-4">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2 text-white font-black text-base italic">
                        <RotateCcw className="text-emerald-400" size={18} /> RESTORE SHIFT FROM REPORT
                    </div>
                    <button onClick={onClose} className="text-slate-500 hover:text-white p-1">
                        <X size={18} />
                    </button>
                </div>
                
                <p className="text-xs text-slate-400 leading-relaxed font-bold">
                    Paste your exported Shift Report CSV or plain text report below. The system will parse the history and restore the complete shift into your Rota and database history.
                </p>

                <textarea
                    value={restoreText}
                    onChange={(e) => setRestoreText(e.target.value)}
                    placeholder="Paste Shift Report CSV / JSON here..."
                    rows={8}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 text-xs text-emerald-300 font-mono focus:outline-none focus:border-emerald-500/50 resize-none"
                />

                {restoreStatus && (
                    <div className={`p-3 rounded-xl text-xs font-black uppercase tracking-wider ${restoreStatus.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : restoreStatus.type === 'info' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                        {restoreStatus.msg}
                    </div>
                )}

                <div className="flex gap-3 pt-2">
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
                        Restore Shift
                    </button>
                </div>
            </div>
        </div>
    );
};
