import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, User, Key, ArrowRight, Loader2, Fingerprint, Sparkles } from 'lucide-react';
import { Logo, Catchphrase } from './branding/Logo';
import { ThemeColors } from '../types';
import { haptic } from '../services/hapticService';
import { playAlertSound } from '../services/audioService';

interface LoginScreenProps {
    theme: any;
    availableUpdate: any;
    loginError: string;
    username: string;
    setUsername: (val: string) => void;
    password: string;
    setPassword: (val: string) => void;
    handleLogin: () => void;
    handleDownloadManual: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
    theme, availableUpdate, loginError, username, setUsername, 
    password, setPassword, handleLogin, handleDownloadManual
}) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden pt-safe-top pb-safe-bottom">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className={`absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full`} />
                <div className={`absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-sky-500/10 blur-[120px] rounded-full`} />
            </div>

            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-sm relative z-10"
            >
                <div className="flex flex-col items-center mb-10">
                    <Logo theme={theme} size="lg" className="mb-6 scale-110" />
                    <Catchphrase theme={theme} />
                </div>

                <div className={`${theme.panel} p-8 ${theme.radius} border border-slate-800 shadow-2xl backdrop-blur-md`}>
                    <div className="space-y-6">
                        <div className="space-y-2.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-none">Operator ID</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-emerald-500 transition-colors" size={18} />
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.toUpperCase())}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                                    className={`w-full bg-slate-950 border border-slate-800 p-4 pl-12 rounded-2xl text-white outline-none ${theme.borderFocus} transition-all font-bold placeholder:text-slate-700`}
                                    placeholder="OPERATOR NAME"
                                />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1 leading-none">Security PIN</label>
                            <div className="relative group">
                                <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-sky-500 transition-colors" size={18} />
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    inputMode="numeric"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                                    className={`w-full bg-slate-950 border border-slate-800 p-4 pl-12 pr-12 rounded-2xl text-white outline-none ${theme.borderFocus} transition-all font-bold tracking-widest placeholder:text-slate-700`}
                                    placeholder="••••••"
                                />
                                <button
                                    type="button"
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? "Hide" : "Show"}
                                </button>
                            </div>
                        </div>

                        {loginError && (
                            <motion.p 
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="text-red-400 text-xs font-bold text-center bg-red-500/10 p-3 rounded-xl border border-red-500/20"
                            >
                                {loginError}
                            </motion.p>
                        )}

                        <div className="flex gap-4">
                            <button 
                                onClick={handleLogin}
                                className={`flex-1 py-5 bg-gradient-to-br ${theme.gradient} text-slate-900 font-black rounded-2xl shadow-xl ${theme.shadow} flex items-center justify-center gap-3 active:scale-[0.98] transition-box shadow-lg shadow-emerald-500/10 min-h-[64px]`}
                            >
                                AUTHENTICATE <ArrowRight size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                        <button 
                            onClick={handleDownloadManual}
                            className="w-full py-4 bg-slate-900/30 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl border border-slate-800/50 hover:bg-slate-800 hover:text-slate-300 transition-all flex items-center justify-center gap-2"
                        >
                            <ShieldCheck size={16} /> Operations Manual
                        </button>
                    </div>
                </div>

                {availableUpdate && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center justify-between"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <Loader2 className="text-emerald-500 animate-spin" size={16} />
                            </div>
                            <div>
                                <div className="text-emerald-500 text-[10px] font-black uppercase tracking-wider">Update Available</div>
                                <div className="text-slate-400 text-[9px] font-medium">Version {availableUpdate.version} ready</div>
                            </div>
                        </div>
                        <span className="text-emerald-500 text-[10px] font-black underline">DETAILS</span>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
