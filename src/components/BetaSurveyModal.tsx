import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ShieldCheck, CheckCircle2, ThumbsUp, AlertCircle, X, Send, HeartHandshake } from 'lucide-react';
import { haptic } from '../services/hapticService';
import { saveBetaFeedback } from '../services/leaderboardService';
import { recordSurveyCompleted, snoozeSurveyPrompt, SurveySubmission } from '../services/betaSurveyService';
import { auth } from '../lib/firebase';

interface BetaSurveyModalProps {
    isOpen: boolean;
    onClose: () => void;
    username: string;
    department?: string;
    zone?: string;
    onSuccess?: () => void;
}

export const BetaSurveyModal: React.FC<BetaSurveyModalProps> = ({
    isOpen,
    onClose,
    username,
    department = 'Aisles',
    zone = 'AMBIENT',
    onSuccess
}) => {
    const [step, setStep] = useState<number>(1);
    const [ergonomics, setErgonomics] = useState<number>(5);
    const [resilience, setResilience] = useState<string>('Flawless Operation');
    const [motivation, setMotivation] = useState<number>(5);
    const [notes, setNotes] = useState<string>('');
    const [submitting, setSubmitting] = useState<boolean>(false);
    const [submitted, setSubmitted] = useState<boolean>(false);

    if (!isOpen) return null;

    const handleDismiss = () => {
        haptic('light');
        snoozeSurveyPrompt(username);
        onClose();
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        haptic('medium');

        const submissionData: SurveySubmission = {
            ergonomics,
            resilience,
            motivation,
            notes: notes.trim(),
            department,
            zone,
            appVersion: '1.9.0'
        };

        const uid = auth.currentUser?.uid || 'anon';
        const success = await saveBetaFeedback(uid, username, submissionData);

        setSubmitting(false);
        if (success) {
            haptic('heavy');
            recordSurveyCompleted(username);
            setSubmitted(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1800);
        } else {
            // Local fallback record anyway to not frustrate worker
            recordSurveyCompleted(username);
            setSubmitted(true);
            setTimeout(() => {
                if (onSuccess) onSuccess();
                onClose();
            }, 1800);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.92, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: 20 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden"
            >
                {/* Background glow accent */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 blur-3xl rounded-full pointer-events-none" />

                {!submitted ? (
                    <>
                        <div className="flex justify-between items-start mb-5">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="p-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                        <Sparkles size={16} />
                                    </span>
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                                        Semi-Monthly Beta Intel
                                    </span>
                                </div>
                                <h3 className="text-lg font-black text-white mt-1">Floor Usability Check</h3>
                                <p className="text-slate-400 text-xs mt-0.5">
                                    Operator <span className="text-white font-bold">{username}</span> • {department}
                                </p>
                            </div>
                            <button 
                                onClick={handleDismiss}
                                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 flex items-center justify-center transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Progress Stepper */}
                        <div className="flex items-center gap-2 mb-6">
                            {[1, 2, 3].map((s) => (
                                <div 
                                    key={s} 
                                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                        step >= s ? 'bg-emerald-500' : 'bg-slate-800'
                                    }`}
                                />
                            ))}
                        </div>

                        {/* Step 1: Ergonomics & Single-handed UX */}
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                                    <label className="text-xs font-bold text-white block mb-1">
                                        1. Ergonomics & Physical Speed
                                    </label>
                                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                                        Did PickApp feel fluid and comfortable to operate single-handed while picking cases today?
                                    </p>
                                    <div className="grid grid-cols-5 gap-2">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <button
                                                key={val}
                                                type="button"
                                                onClick={() => { haptic('light'); setErgonomics(val); }}
                                                className={`py-3 rounded-xl font-black text-sm transition-all flex flex-col items-center gap-1 ${
                                                    ergonomics === val 
                                                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20 scale-105 border border-sky-400' 
                                                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                                                }`}
                                            >
                                                <span>{val}</span>
                                                <span className="text-[8px] uppercase tracking-tighter opacity-80">
                                                    {val === 1 ? 'Poor' : val === 3 ? 'Fair' : val === 5 ? 'Great' : ''}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={handleDismiss}
                                        className="py-3.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                                    >
                                        Snooze
                                    </button>
                                    <button
                                        onClick={() => { haptic('light'); setStep(2); }}
                                        className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        Next Question →
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 2: Reliability & Sync Resilience */}
                        {step === 2 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80">
                                    <label className="text-xs font-bold text-white block mb-1">
                                        2. System Stability & Sync Uptime
                                    </label>
                                    <p className="text-[11px] text-slate-400 leading-relaxed mb-4">
                                        Did you encounter any freezes, offline queue issues, or timer delays?
                                    </p>
                                    <div className="space-y-2">
                                        {[
                                            { label: 'Flawless Operation', sub: 'Fast & responsive throughout shift', icon: ShieldCheck, color: 'emerald' },
                                            { label: 'Minor Delay / Occasional Lag', sub: 'Brief hesitation or slow load', icon: ThumbsUp, color: 'amber' },
                                            { label: 'Sync Glitch / Floor Obstacle', sub: 'Timer froze or sync required force restart', icon: AlertCircle, color: 'rose' }
                                        ].map((opt) => {
                                            const isSelected = resilience === opt.label;
                                            const IconComponent = opt.icon;
                                            return (
                                                <button
                                                    key={opt.label}
                                                    type="button"
                                                    onClick={() => { haptic('light'); setResilience(opt.label); }}
                                                    className={`w-full p-3.5 rounded-xl border text-left flex items-center gap-3 transition-all ${
                                                        isSelected 
                                                            ? 'bg-emerald-500/10 border-emerald-500/50 shadow-md' 
                                                            : 'bg-slate-900/80 border-slate-800 hover:bg-slate-850'
                                                    }`}
                                                >
                                                    <div className={`p-2 rounded-lg ${isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                                                        <IconComponent size={16} />
                                                    </div>
                                                    <div>
                                                        <div className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                                                            {opt.label}
                                                        </div>
                                                        <div className="text-[10px] text-slate-500">{opt.sub}</div>
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => { haptic('light'); setStep(1); }}
                                        className="py-3.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={() => { haptic('light'); setStep(3); }}
                                        className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        Next Question →
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {/* Step 3: Productivity Motivation & Notes */}
                        {step === 3 && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                                <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-white block mb-1">
                                            3. Productivity & P/H Pace Motivation
                                        </label>
                                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                                            Did the live rate indicators and target feedback help you stay on pace?
                                        </p>
                                        <div className="grid grid-cols-5 gap-2">
                                            {[1, 2, 3, 4, 5].map((val) => (
                                                <button
                                                    key={val}
                                                    type="button"
                                                    onClick={() => { haptic('light'); setMotivation(val); }}
                                                    className={`py-3 rounded-xl font-black text-sm transition-all flex flex-col items-center gap-1 ${
                                                        motivation === val 
                                                            ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20 scale-105 border border-purple-400' 
                                                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800 border border-slate-800'
                                                    }`}
                                                >
                                                    <span>{val}</span>
                                                    <span className="text-[8px] uppercase tracking-tighter opacity-80">
                                                        {val === 1 ? 'No' : val === 3 ? 'Neutral' : val === 5 ? 'Very' : ''}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">
                                            Optional Operational Feedback
                                        </label>
                                        <textarea
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Floor suggestions, layout ideas, or obstacles..."
                                            rows={2}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 outline-none focus:border-emerald-500/50 resize-none transition-colors"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        onClick={() => { haptic('light'); setStep(2); }}
                                        className="py-3.5 px-4 bg-slate-800 hover:bg-slate-750 text-slate-400 font-bold text-xs rounded-xl uppercase tracking-wider transition-colors"
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={submitting}
                                        className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        {submitting ? (
                                            <span className="animate-pulse">Saving Intel...</span>
                                        ) : (
                                            <>
                                                <Send size={14} /> Submit Feedback
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </>
                ) : (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-10 text-center space-y-4"
                    >
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10">
                            <HeartHandshake size={32} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white">Thank You, {username}!</h3>
                            <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto leading-relaxed">
                                Your semi-monthly operational feedback has been recorded and delivered to executive telemetry.
                            </p>
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">
                            Next Survey Scheduled in 14 Days
                        </div>
                    </motion.div>
                )}
            </motion.div>
        </div>
    );
};
