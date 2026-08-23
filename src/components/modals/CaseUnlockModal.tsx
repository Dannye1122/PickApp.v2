import React from 'react';
import { motion } from 'motion/react';
import { Box, ShieldAlert, Key, ChevronRight, CheckCircle, X } from 'lucide-react';
import { haptic } from '../../services/hapticService';

interface CaseUnlockModalProps {
    isUnlockingCaseCount: boolean;
    isEditingCaseCount: boolean;
    unlockPin: string;
    setUnlockPin: (val: string) => void;
    unlockError: string;
    tempCaseCount: string;
    setTempCaseCount: (val: string) => void;
    handleVerifyUnlock: () => void;
    handleSaveModifiedCaseCount: () => void;
    onClose: () => void;
}

export const CaseUnlockModal: React.FC<CaseUnlockModalProps> = ({
    isUnlockingCaseCount,
    isEditingCaseCount,
    unlockPin,
    setUnlockPin,
    unlockError,
    tempCaseCount,
    setTempCaseCount,
    handleVerifyUnlock,
    handleSaveModifiedCaseCount,
    onClose
}) => {
    if (!isUnlockingCaseCount) return null;

    return (
        <div className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[200] px-6 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-slate-900 p-8 rounded-[32px] w-full max-w-sm border border-slate-800 shadow-2xl relative overflow-hidden"
            >
                {/* Decorative background */}
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] rounded-full ${isEditingCaseCount ? 'bg-purple-500/20' : 'bg-amber-500/10'}`} />
                
                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isEditingCaseCount ? 'bg-purple-500/20 text-purple-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {isEditingCaseCount ? <Box size={24} /> : <ShieldAlert size={24} />}
                        </div>
                        <button 
                            onClick={() => { onClose(); haptic('light'); }}
                            className="p-2 rounded-full hover:bg-slate-800 transition-colors text-slate-500"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {!isEditingCaseCount ? (
                        <>
                            <h3 className="text-white text-2xl font-black mb-2 tracking-tight">Security Check</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">Please enter your password to unlock order modifications.</p>
                            
                            <div className="space-y-4">
                                <div className="relative">
                                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input 
                                        type="password"
                                        value={unlockPin}
                                        onChange={(e) => setUnlockPin(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleVerifyUnlock()}
                                        placeholder="••••••"
                                        className={`w-full bg-slate-950 border ${unlockError ? 'border-red-500/50' : 'border-slate-800'} p-4 pl-12 rounded-2xl text-white outline-none focus:border-amber-500/50 transition-all font-black tracking-widest`}
                                        autoFocus
                                    />
                                </div>

                                {unlockError && (
                                    <p className="text-red-400 text-xs font-bold px-2">{unlockError}</p>
                                )}

                                <button 
                                    onClick={handleVerifyUnlock}
                                    className="w-full py-4 bg-amber-500 text-slate-950 font-black rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                >
                                    UNLOCK <ChevronRight size={18} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <h3 className="text-purple-400 text-2xl font-black mb-2 tracking-tight">Modify Order</h3>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">Update the case count for the active pick. This will be marked as a manual correction.</p>
                            
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">New Case Count</label>
                                    <div className="relative">
                                        <Box className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                        <input 
                                            type="number"
                                            inputMode="numeric"
                                            value={tempCaseCount}
                                            onChange={(e) => setTempCaseCount(e.target.value)}
                                            placeholder="0"
                                            className="w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none focus:border-purple-500/50 transition-all font-black"
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <button 
                                    onClick={handleSaveModifiedCaseCount}
                                    className="w-full py-4 bg-purple-500 text-white font-black rounded-2xl shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2 active:scale-95 transition-transform"
                                >
                                    SAVE CORRECTION <CheckCircle size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};
