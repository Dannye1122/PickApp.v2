import React from 'react';
import { haptic } from '../../services/hapticService';

export interface ConfirmDialogState {
    title: string;
    message: string;
    isAlert?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

interface ConfirmDialogModalProps {
    confirmDialog: ConfirmDialogState | null;
    setConfirmDialog: (dialog: ConfirmDialogState | null) => void;
    theme: any;
}

export const ConfirmDialogModal: React.FC<ConfirmDialogModalProps> = ({
    confirmDialog,
    setConfirmDialog,
    theme
}) => {
    if (!confirmDialog) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/80 flex flex-col items-center justify-center z-[500] px-4 backdrop-blur-sm">
            <div className="bg-slate-900 p-6 rounded-3xl w-full max-w-[320px] text-center border border-slate-800 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 className="text-white text-xl font-bold mb-2 tracking-tight">{confirmDialog.title}</h3>
                <p className="text-slate-400 mb-8 text-sm">{confirmDialog.message}</p>
                <div className="flex gap-3">
                    {!confirmDialog.isAlert && (
                        <button 
                            className="flex-1 py-3.5 bg-slate-800 text-white rounded-2xl font-semibold tracking-wide hover:bg-slate-700 transition-colors"
                            onClick={() => { haptic('light'); confirmDialog.onCancel(); setConfirmDialog(null); }}
                        >
                            Cancel
                        </button>
                    )}
                    <button 
                        className={`flex-1 py-3.5 text-white rounded-2xl font-semibold tracking-wide transition-colors shadow-lg ${confirmDialog.title.includes('Clear') || confirmDialog.title.includes('Reset') ? 'bg-red-500 hover:bg-red-400 shadow-red-500/20' : `${theme.bg} ${theme.bgHover} ${theme.shadow}`}`}
                        onClick={() => { haptic('medium'); confirmDialog.onConfirm(); setConfirmDialog(null); }}
                    >
                        {confirmDialog.isAlert ? 'OK' : 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};
