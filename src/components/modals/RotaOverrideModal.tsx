import React from 'react';
import { Calendar } from 'lucide-react';

interface RotaOverrideModalProps {
    selectedFutureDate: Date | null;
    onClose: () => void;
    onSelectOverride: (overrideType: 'work' | 'holiday' | 'sick' | 'off' | 'reset') => void;
}

export const RotaOverrideModal: React.FC<RotaOverrideModalProps> = ({
    selectedFutureDate,
    onClose,
    onSelectOverride
}) => {
    if (!selectedFutureDate) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[110] flex items-center justify-center p-6 backdrop-blur-md">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-6 border border-slate-800 shadow-2xl animate-in zoom-in duration-200">
                <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                    <Calendar size={20} className="text-sky-400" />
                    Choose Rota Override
                </h3>
                <p className="text-slate-400 text-xs mb-5 font-medium">
                    Set your custom shift status for <b className="text-white font-mono">{selectedFutureDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</b>.
                </p>
                
                <div className="space-y-3 mb-6">
                    <button 
                        onClick={() => onSelectOverride('work')}
                        className="w-full p-4 bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 hover:border-emerald-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                    >
                        <span>Scheduled Work Day</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-emerald-500/20 px-2 py-0.5 rounded">Pattern</span>
                    </button>

                    <button 
                        onClick={() => onSelectOverride('holiday')}
                        className="w-full p-4 bg-purple-500/10 hover:bg-purple-500/25 text-purple-400 border border-purple-500/30 hover:border-purple-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                    >
                        <span>Holiday / Paid Leave</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-purple-500/20 px-2 py-0.5 rounded">Holiday</span>
                    </button>

                    <button 
                        onClick={() => onSelectOverride('sick')}
                        className="w-full p-4 bg-red-500/10 hover:bg-red-500/25 text-red-400 border border-red-500/30 hover:border-red-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                    >
                        <span>Sick Day</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-red-500/20 px-2 py-0.5 rounded">Sick</span>
                    </button>

                    <button 
                        onClick={() => onSelectOverride('off')}
                        className="w-full p-4 bg-slate-800/50 hover:bg-slate-800 text-slate-300 border border-slate-700/50 hover:border-slate-700 rounded-2xl flex items-center justify-between transition-all font-bold text-sm"
                    >
                        <span>Scheduled Rest Day / Off</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest bg-slate-800 px-2 py-0.5 rounded">Off day</span>
                    </button>

                    <button 
                        onClick={() => onSelectOverride('reset')}
                        className="w-full p-3 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 hover:border-sky-500/50 rounded-2xl flex items-center justify-between transition-all font-bold text-xs"
                    >
                        <span>Reset to Standard Pattern</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest bg-sky-500/20 px-2 py-0.5 rounded">Default</span>
                    </button>
                </div>

                <button 
                    onClick={onClose}
                    className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-xs text-white uppercase font-black tracking-widest rounded-2xl border border-slate-700 transition-all text-center"
                >
                    Cancel
                </button>
            </div>
        </div>
    );
};
