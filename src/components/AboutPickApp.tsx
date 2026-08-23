import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, Smartphone, Database, Zap, X, Info, BookOpen, Layers, Award, Terminal, RefreshCw, Cpu } from 'lucide-react';
import { Logo } from './branding/Logo';
import { APP_VERSION } from '../constants/version';

export const AboutPickApp = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'manual'>('overview');

    if (!isOpen) return null;

    const innovations = [
        {
            icon: <Shield size={18} className="text-emerald-400" />,
            title: "Security & Role-Based Access",
            desc: "Mandatory PINs per session with strict role distinctions (Admin vs. Operator) isolate logic and stats per actual device instance."
        },
        {
            icon: <Layers size={18} className="text-sky-400" />,
            title: "Home Department Auto-Routing",
            desc: "Operators automatically boot into their designated home department (e.g. Aisles 300 / 350 in Ambient) and auto-restore upon shift reset."
        },
        {
            icon: <Smartphone size={18} className="text-blue-400" />,
            title: "Notch Isolation & Rugged UX",
            desc: "Dynamic safe-area padding and 48px+ touch targets optimized for warehouse scanners and single-handed industrial use."
        },
        {
            icon: <Database size={18} className="text-purple-400" />,
            title: "Dual-Storage Cloud & Offline Sync",
            desc: "Real-time Firestore cloud synchronization backed by IndexedDB offline storage with automatic 6-week lifecycle data management."
        },
        {
            icon: <Zap size={18} className="text-amber-400" />,
            title: "Precision Shift & Rate Engine",
            desc: "Active pick rate computation, customizable department targets, gap buffer deductions, and dynamic performance feedback."
        },
        {
            icon: <Award size={18} className="text-emerald-400" />,
            title: "Gamification & Progress System",
            desc: "XP progression, leveling, milestone badges, and the Skins Vault reward high pick accuracy and consistent shift delivery."
        }
    ];

    const manualSections = [
        {
            section: "01. Authentication & Floor Login",
            rules: [
                "Log in using your registered operator ID (e.g., MIABRUDAN, DASERGHIE) and unique 6-digit security PIN.",
                "Admins access elevated tools (User Management, Department Roster, Storage Rigs) via the Admin Command panel.",
                "To switch operators or end your session, use 'Drop Session' in the Engine Room settings."
            ]
        },
        {
            section: "02. Home Department & Shift Initialization",
            rules: [
                "Each operator has an assigned Home Department (e.g., Aisles 300 / 350 in the Ambient zone).",
                "Upon login or starting a fresh shift, PickApp automatically sets your active department and zone to your home assignment.",
                "To pick in a temporary department, select it from the department picker; resetting or completing a shift returns you to your home assignment.",
                "Department target rates and buffer rules (+45 min buffer for Aisles) are dynamically fetched and applied."
            ]
        },
        {
            section: "03. Picking Engine & Order Tracking",
            rules: [
                "Enter your assigned target case count and tap 'Start Pick' to begin tracking.",
                "Tap 'Take Break' when pausing work to ensure break time is deducted from your active pick rate calculation.",
                "When an order is finished, tap 'Complete Pick' to record your final rate, cases picked, and time elapsed.",
                "Any modified case counts are flagged with a purple 'MODIFIED' badge for historical auditing."
            ]
        },
        {
            section: "04. Dual-Tier Persistence & Offline Mode",
            rules: [
                "All shifts, rota schedules, and achievements are cached locally in IndexedDB and mirrored to Firebase Firestore.",
                "If warehouse Wi-Fi drops, the red 'Offline' badge activates. Picks and shifts continue locally and sync automatically upon reconnection.",
                "Manual synchronization can be triggered anytime via 'Global Application Sync' in the Data tab."
            ]
        },
        {
            section: "05. Safety, Haptics & Audio",
            rules: [
                "Haptic engine provides distinct vibration cues: Light tap (navigation), Medium buzz (confirmations), Heavy pulse (alerts).",
                "Voice synthesis announcements provide hands-free order status updates without microphone activation."
            ]
        },
        {
            section: "06. System Versioning & Maintenance",
            rules: [
                "The active code version is displayed across all primary screens (Login, Header, Settings, About).",
                "Historical shift summaries and image buffers older than 42 days are automatically scrubbed to optimize storage.",
                "Every release version is tagged for tracking and auditing."
            ]
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
            <div className="sticky top-0 z-10 flex justify-between items-center px-6 py-4 bg-slate-950/90 backdrop-blur-md border-b border-slate-900">
                <div className="flex items-center gap-2">
                    <Info size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Documentation</span>
                </div>
                <button 
                    onClick={onClose}
                    className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center border border-slate-800 active:scale-90 transition-transform text-slate-400 hover:text-white"
                    aria-label="Close About PickApp"
                >
                    <X size={18} />
                </button>
            </div>

            <div className="flex-1 px-6 pb-12 max-w-2xl mx-auto w-full">
                {/* Brand Header */}
                <div className="flex flex-col items-center text-center py-8">
                    <div className="mb-4 scale-125">
                        <Logo size="lg" theme={{ brand: 'emerald', panel: 'slate' }} />
                    </div>
                    <h1 className="text-2xl font-black text-white tracking-tighter italic">PICKAPP</h1>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 uppercase tracking-widest mt-2">
                        <span>v{APP_VERSION}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">Engineered for High-Volume Logistics</p>
                </div>

                {/* Sub-Navigation Switcher */}
                <div className="flex gap-2 bg-slate-900/60 p-1.5 rounded-2xl border border-slate-800 mb-8">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'overview' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <Cpu size={14} /> System Architecture
                    </button>
                    <button
                        onClick={() => setActiveTab('manual')}
                        className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                        <BookOpen size={14} /> Operating Manual
                    </button>
                </div>

                {activeTab === 'overview' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                        {/* Mission Statement */}
                        <div className="text-center bg-slate-900/40 border border-slate-800/80 p-5 rounded-2xl">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Our Mission</h2>
                            <p className="text-xs text-slate-300 leading-relaxed font-medium">
                                PickApp is built by warehouse insiders to optimize real-time picking efficiency, 
                                eradicate connection drops, and maximize shift performance. We bridge the gap 
                                between legacy scanning hardware and modern cloud architecture.
                            </p>
                        </div>

                        {/* Innovations Grid */}
                        <div className="space-y-4">
                            <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Core Innovations & Systems</h2>
                            <div className="grid grid-cols-1 gap-3">
                                {innovations.map((item, idx) => (
                                    <div key={idx} className="p-4 bg-slate-900/50 border border-slate-800/50 rounded-2xl flex items-start gap-4">
                                        <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 shrink-0">
                                            {item.icon}
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black text-white uppercase tracking-tight mb-1">{item.title}</h3>
                                            <p className="text-[11px] text-slate-400 leading-normal font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {activeTab === 'manual' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen size={16} className="text-emerald-400" />
                            <h2 className="text-xs font-black text-white uppercase tracking-wider">Standard Operating Procedures</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {manualSections.map((sec, idx) => (
                                <div key={idx} className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
                                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-wider">{sec.section}</h3>
                                    <ul className="space-y-1.5 pl-2">
                                        {sec.rules.map((rule, rIdx) => (
                                            <li key={rIdx} className="text-[11px] text-slate-300 flex items-start gap-2 leading-relaxed">
                                                <span className="text-emerald-500 font-bold mt-0.5">•</span>
                                                <span>{rule}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* Footer Info */}
                <div className="mt-12 pt-6 border-t border-slate-900 flex justify-between items-center text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                    <span>PickApp v{APP_VERSION}</span>
                    <span>© 2026 Logistics Systems & Co.</span>
                </div>
            </div>
        </motion.div>
    );
};
