import React from 'react';
import { motion } from 'motion/react';
import { Shield, Smartphone, Database, Zap, X, Info } from 'lucide-react';
import { Logo } from './branding/Logo';
import { APP_VERSION } from '../constants/version';

export const AboutPickApp = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    if (!isOpen) return null;

    const innovations = [
        {
            icon: <Shield size={18} className="text-emerald-400" />,
            title: "Security Layers",
            desc: "Mandatory PINs per-session isolate logic and stats per actual device instance to prevent impersonation."
        },
        {
            icon: <Smartphone size={18} className="text-blue-400" />,
            title: "Notch Isolation Engine",
            desc: "Dynamic safe-area padding that preserves 100% visibility on all rugged scanning screens."
        },
        {
            icon: <Database size={18} className="text-purple-400" />,
            title: "Cost-Effective Data Retention",
            desc: "Automated 6-week database lifecycle management to eliminate local caching bloat."
        },
        {
            icon: <Zap size={18} className="text-amber-400" />,
            title: "Full-Stream Synchronization",
            desc: "Mirrored Firestore data pathways ensuring strict administrative data management."
        }
    ];

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-[200] bg-slate-950 flex flex-col pt-safe-top overflow-y-auto"
        >
            {/* Header Sticky */}
            <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-900">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Information</span>
                </div>
                <button 
                    onClick={onClose}
                    className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center border border-slate-800 active:scale-90 transition-transform"
                    aria-label="Close About PickApp"
                >
                    <X size={20} className="text-slate-400" />
                </button>
            </div>

            <div className="flex-1 px-6 pb-12">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center py-12">
                    <div className="mb-6 scale-150">
                        <Logo size="lg" theme={{ brand: 'emerald', panel: 'slate' }} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tighter italic">PICKAPP</h1>
                    <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mt-1">Version {APP_VERSION}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Engineered for High-Volume Logistics</p>
                </div>

                {/* Mission Statement */}
                <div className="mb-12 text-center">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Our Mission</h2>
                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        PickApp is built by warehouse insiders to optimize real-time picking efficiency, 
                        eradicate connection drops, and maximize shift performance. We bridge the gap 
                        between legacy scanning hardware and modern cloud architecture.
                    </p>
                </div>

                {/* Innovations Grid */}
                <div className="space-y-4">
                    <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center mb-6">Core Innovations</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {innovations.map((item, idx) => (
                            <div key={idx} className="p-5 bg-slate-900/50 border border-slate-800/50 rounded-2xl flex items-start gap-4">
                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                                    {item.icon}
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-tight mb-1">{item.title}</h3>
                                    <p className="text-[11px] text-slate-400 leading-tight font-medium">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Info */}
                <div className="mt-16 pt-8 border-t border-slate-900 text-center">
                    <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">© 2026 Logistics Systems & Co.</p>
                </div>
            </div>
        </motion.div>
    );
};
