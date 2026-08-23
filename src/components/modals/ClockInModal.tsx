import React from 'react';
import { Clock } from 'lucide-react';
import { haptic } from '../../services/hapticService';

interface ClockInModalProps {
    isOpen: boolean;
    onClose: () => void;
    manualClockType: 'in' | 'out';
    manualClockTime: string;
    setManualClockTime: (time: string) => void;
    theme: any;
    onConfirm: (type: 'in' | 'out', time: string) => void;
}

export const ClockInModal: React.FC<ClockInModalProps> = ({
    isOpen,
    onClose,
    manualClockType,
    manualClockTime,
    setManualClockTime,
    theme,
    onConfirm
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[100] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-slate-900 w-full max-w-sm rounded-[32px] p-6 border border-slate-800 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                <div className="text-center mb-6">
                    <div className={`w-12 h-12 rounded-2xl ${manualClockType === 'in' ? 'bg-slate-800 text-emerald-400' : 'bg-orange-500/20 text-orange-400'} flex items-center justify-center mx-auto mb-3`}>
                        <Clock size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-1">Manual Clock {manualClockType === 'in' ? 'In' : 'Out'}</h3>
                    <p className="text-slate-400 text-xs text-balance">
                        {manualClockType === 'in' 
                            ? 'Input the time you actually clocked in to start your shift tracking.'
                            : 'Update the time you finished your shift for final stats calculation.'}
                    </p>
                </div>
                
                <input 
                    type="time" 
                    className={`w-full bg-slate-950 border-2 border-slate-800 text-white p-5 rounded-2xl text-4xl font-light text-center outline-none ${theme.borderFocusLarge || 'focus:border-emerald-500'} mb-6 [color-scheme:dark]`}
                    value={manualClockTime}
                    onChange={e => setManualClockTime(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        className="py-4 bg-slate-800 text-slate-400 rounded-2xl font-bold text-sm tracking-wide hover:text-white"
                        onClick={() => { haptic('light'); onClose(); }}
                    >
                        CANCEL
                    </button>
                    <button 
                        className={`py-4 ${theme.bg || 'bg-emerald-500'} text-white rounded-2xl font-bold text-sm tracking-wide ${theme.bgHover || 'hover:bg-emerald-400'}`}
                        onClick={() => {
                            onConfirm(manualClockType, manualClockTime);
                        }}
                    >
                        {manualClockType === 'in' ? 'START' : 'FINISH'}
                    </button>
                </div>
            </div>
        </div>
    );
};
