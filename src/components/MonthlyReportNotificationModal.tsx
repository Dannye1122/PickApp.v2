import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Download, X, CheckCircle2, TrendingUp, Sparkles, ShieldCheck } from 'lucide-react';
import { haptic } from '../services/hapticService';
import { buildAndDownloadMonthlyReport, dismissMonthlyReportNotification } from '../services/monthlyReportService';

interface MonthlyReportNotificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    monthName: string;
    reportKey: string;
    warehouseId?: string;
    onSuccess?: () => void;
}

export const MonthlyReportNotificationModal: React.FC<MonthlyReportNotificationModalProps> = ({
    isOpen,
    onClose,
    monthName,
    reportKey,
    warehouseId = 'MAIN',
    onSuccess
}) => {
    const [downloading, setDownloading] = useState(false);
    const [downloaded, setDownloaded] = useState(false);

    if (!isOpen) return null;

    const handleDismiss = () => {
        haptic('light');
        dismissMonthlyReportNotification(reportKey);
        onClose();
    };

    const handleDownload = async () => {
        setDownloading(true);
        haptic('heavy');
        try {
            await buildAndDownloadMonthlyReport(warehouseId, 0);
            setDownloaded(true);
            dismissMonthlyReportNotification(reportKey);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1600);
        } catch (e) {
            console.error("Failed downloading monthly report:", e);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/85 z-[320] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
            >
                {/* Accent glow */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

                {!downloaded ? (
                    <>
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-2">
                                <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                    <FileText size={20} />
                                </span>
                                <div>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block">
                                        Executive Intelligence
                                    </span>
                                    <h3 className="text-base font-black text-white">Monthly Report Ready</h3>
                                </div>
                            </div>
                            <button 
                                onClick={handleDismiss}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-4 bg-slate-950/70 rounded-2xl border border-slate-800/80 mb-5 space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-[11px] text-slate-400">Reporting Period</span>
                                <span className="text-xs font-black text-white uppercase">{monthName}</span>
                            </div>
                            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                <span className="text-[11px] text-slate-400">Warehouse Node</span>
                                <span className="text-xs font-mono font-bold text-sky-400">{warehouseId}</span>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                    <TrendingUp size={13} className="text-emerald-400" />
                                    Operator performance & MoM improvement %
                                </div>
                                <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                                    <ShieldCheck size={13} className="text-sky-400" />
                                    Ergonomic survey ratings & Floor telemetry
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={handleDismiss}
                                className="py-3.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                            >
                                Remind Later
                            </button>
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                            >
                                {downloading ? (
                                    <span className="animate-pulse">Compiling PDF...</span>
                                ) : (
                                    <>
                                        <Download size={15} /> Download PDF Now
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-8 text-center space-y-3"
                    >
                        <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle2 size={28} />
                        </div>
                        <h3 className="text-lg font-black text-white">Monthly Report Downloaded</h3>
                        <p className="text-slate-400 text-xs max-w-xs mx-auto">
                            The executive review document for {monthName} is ready to present to management.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
