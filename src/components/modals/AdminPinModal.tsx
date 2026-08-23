import React from 'react';
import { X, Trash2 } from 'lucide-react';
import { USERS } from '../../constants/data';
import { clearLeaderboard, purgeDatabaseOlderThan6Weeks } from '../../services/leaderboardService';
import { haptic } from '../../services/hapticService';

interface AdminPinModalProps {
    isOpen: boolean;
    type: 'clear' | 'reset' | 'purge';
    input: string;
    onInputChange: (newInput: string) => void;
    onClose: () => void;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
    isOpen,
    type,
    input,
    onInputChange,
    onClose
}) => {
    if (!isOpen) return null;

    const handleNumberClick = (numStr: string) => {
        haptic('light');
        if (input.length < 6) {
            const nextInput = input + numStr;
            onInputChange(nextInput);
            if (nextInput.length === 6) {
                if (nextInput === USERS.ADMIN) {
                    haptic('medium');
                    if (type === 'clear') {
                        clearLeaderboard().then(success => {
                            if (success) window.alert("Leaderboard cleared!");
                        });
                        onClose();
                    } else if (type === 'purge') {
                        purgeDatabaseOlderThan6Weeks().then(res => {
                            if (res.success) {
                                window.alert(`Database purge complete! Deleted ${res.summariesDeleted} shift summaries and ${res.leaderboardDeleted} leaderboard entries older than 6 weeks.`);
                            } else {
                                window.alert(`Database purge failed: ${res.error}`);
                            }
                        });
                        onClose();
                    } else {
                        const consented = localStorage.getItem('userConsented');
                        localStorage.clear();
                        if (consented) localStorage.setItem('userConsented', consented);
                        window.location.reload();
                    }
                } else {
                    haptic('heavy');
                    onInputChange('');
                }
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[400] flex items-center justify-center p-6 backdrop-blur-md pt-safe-top pb-safe-bottom">
            <div className="bg-slate-900 w-full max-w-sm rounded-3xl p-8 border border-slate-800 shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-white mb-2">Admin Security</h3>
                    <p className="text-slate-400 text-sm">
                        Enter the Admin PIN to proceed with {type === 'clear' ? 'clearing leaderboard' : type === 'purge' ? '6-week database purge' : 'factory reset'}.
                    </p>
                </div>
                <div className="flex justify-center gap-3 mb-8">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${input.length >= i ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                        <button 
                            key={num} 
                            onClick={() => handleNumberClick(num)}
                            className="h-16 rounded-2xl bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                        >
                            {num}
                        </button>
                    ))}
                    <button 
                        onClick={() => { haptic('light'); onClose(); }}
                        className="h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                    >
                        <X size={24} />
                    </button>
                    <button 
                        onClick={() => handleNumberClick('0')}
                        className="h-16 rounded-2xl bg-slate-800 text-white text-xl font-bold hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                    >
                        0
                    </button>
                    <button 
                        onClick={() => { haptic('light'); onInputChange(input.slice(0, -1)); }}
                        className="h-16 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center hover:bg-slate-700 active:scale-95 transition-all border border-slate-700/50"
                    >
                        <Trash2 size={24} />
                    </button>
                </div>
            </div>
        </div>
    );
};
