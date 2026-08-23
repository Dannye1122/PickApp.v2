import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Share, PlusSquare, MonitorCheck, ArrowRight, CheckCircle2, Info, MoreVertical, ExternalLink } from 'lucide-react';
import { haptic } from '../services/hapticService';

interface OnboardingModalProps {
    isOpen: boolean;
    onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onComplete }) => {
    const [confirmed, setConfirmed] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other');

    useEffect(() => {
        const ua = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setPlatform('ios');
        } else if (/android/.test(ua)) {
            setPlatform('android');
        } else {
            setPlatform('other');
        }
    }, []);

    const handleConfirm = () => {
        if (!confirmed) return;
        haptic('heavy');
        localStorage.setItem('pickapp_onboarding_acknowledged', 'true');
        onComplete();
    };

    const renderSteps = () => {
        if (platform === 'ios') {
            return (
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 font-black text-[10px] shrink-0 mt-0.5">1</div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-wider">Open Share Menu</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                Tap the <span className="text-sky-400 font-bold inline-flex items-center gap-1 mx-0.5"><Share size={12} /> Share</span> button (square box icon with an arrow) located at the bottom menu bar of your Safari browser.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 font-black text-[10px] shrink-0 mt-0.5">2</div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-wider">Select Add to Home</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                Scroll down the action menu sheets and select <span className="text-sky-400 font-bold inline-flex items-center gap-1 mx-0.5"><PlusSquare size={12} /> Add to Home Screen</span> (+) icon.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 font-black text-[10px] shrink-0 mt-0.5">3</div>
                        <div className="space-y-1">
                            <p className="text-[11px] font-black text-white uppercase tracking-wider">Confirm Installation</p>
                            <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                                Tap <span className="text-white font-black px-1.5 py-0.5 bg-sky-500 rounded text-[9px] mx-0.5">Add</span> in the top-right corner of the system prompt to securely lock PickApp onto your device desktop.
                            </p>
                        </div>
                    </div>
                </div>
            );
        }

        // Default to Android/Chrome flow for non-iOS
        return (
            <div className="space-y-4">
                <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 font-black text-[10px] shrink-0 mt-0.5">1</div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Open Browser Menu</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                            Tap the <span className="text-sky-400 font-bold inline-flex items-center gap-1 mx-0.5"><MoreVertical size={12} /> three vertical dots</span> in the top-right corner of your Chrome browser screen.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 font-black text-[10px] shrink-0 mt-0.5">2</div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Initiate Install</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                            Scroll down the menu options and tap <span className="text-sky-400 font-bold border-b border-sky-400/30 mx-0.5">Install App</span> or <span className="text-sky-400 font-bold border-b border-sky-400/30 mx-0.5">Add to Home Screen</span>.
                        </p>
                    </div>
                </div>

                <div className="flex items-start gap-4">
                    <div className="w-6 h-6 bg-sky-500/20 rounded-lg flex items-center justify-center text-sky-400 font-black text-[10px] shrink-0 mt-0.5">3</div>
                    <div className="space-y-1">
                        <p className="text-[11px] font-black text-white uppercase tracking-wider">Confirm Popup</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                            Confirm the system pop-up dialog box to drop the PickApp icon straight to your device app drawer.
                        </p>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col pt-safe-top pb-safe-bottom"
                >
                    {/* Header */}
                    <div className="p-8 pb-4 text-center space-y-2 shrink-0">
                        <div className="w-16 h-16 bg-emerald-500/10 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                            <Smartphone className="text-emerald-400" size={32} />
                        </div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Mobile Optimization</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] leading-relaxed">
                            {platform === 'ios' ? 'Safari / iOS Environment' : 'Chrome / Android Environment'}
                        </p>
                    </div>

                    {/* Guide Container */}
                    <div className="flex-1 px-6 overflow-y-auto no-scrollbar py-4">
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-[2.5rem] space-y-6">
                                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                                    <ExternalLink className="text-sky-400" size={18} />
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.1em]">Installation Steps</h3>
                                </div>
                                
                                {renderSteps()}
                            </div>

                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-[2.5rem] space-y-4">
                                <div className="flex items-center gap-3">
                                    <Info className="text-emerald-400" size={18} />
                                    <h3 className="text-[11px] font-black text-emerald-400 uppercase tracking-wider">Immersive Mode</h3>
                                </div>
                                <p className="text-[9px] text-slate-500 leading-relaxed font-medium pl-8 uppercase tracking-[0.15em]">
                                    Installing PickApp removes browser controls and unlocks full-screen immersive performance for warehouse floor operations.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer / Confirmation */}
                    <div className="p-6 pt-2 space-y-4 bg-slate-950 shrink-0 shadow-[0_-20px_40px_rgba(2,6,23,0.8)]">
                        <div 
                            className="flex items-center gap-4 p-5 bg-slate-900/80 border border-slate-800 rounded-2xl cursor-pointer active:scale-[0.98] transition-all"
                            onClick={() => { haptic('light'); setConfirmed(!confirmed); }}
                        >
                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${confirmed ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' : 'border-slate-700'}`}>
                                {confirmed && <CheckCircle2 size={16} className="text-slate-950" />}
                            </div>
                            <span className="text-[9px] font-black text-white uppercase tracking-widest leading-normal">
                                I confirm that PickApp is installed on my device home screen.
                            </span>
                        </div>

                        <button
                            onClick={handleConfirm}
                            disabled={!confirmed}
                            className={`w-full py-5 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${confirmed ? 'bg-white text-slate-950 shadow-2xl shadow-white/10' : 'bg-slate-900 text-slate-600 border border-slate-800 opacity-50 cursor-not-allowed'}`}
                        >
                            CONTINUE TO PICKAPP <ArrowRight size={18} />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
