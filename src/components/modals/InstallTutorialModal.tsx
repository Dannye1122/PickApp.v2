import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Download, X, Share2, PlusSquare, MoreVertical } from 'lucide-react';
import { haptic } from '../../services/hapticService';

interface InstallTutorialModalProps {
    isOpen: boolean;
    onClose: () => void;
    theme: any;
}

export const InstallTutorialModal: React.FC<InstallTutorialModalProps> = ({
    isOpen,
    onClose,
    theme
}) => {
    if (!isOpen) return null;

    const handleDismiss = () => {
        haptic('medium');
        localStorage.setItem('hideInstallTutorial', 'true');
        onClose();
    };

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 50 }} 
                animate={{ opacity: 1, scale: 1, y: 0 }} 
                exit={{ opacity: 0, scale: 0.95, y: 50 }}
                className="fixed bottom-6 left-0 right-0 z-[200] mx-4 pointer-events-auto"
            >
                <div className={`${theme.bg} rounded-3xl p-5 shadow-2xl relative border border-white/10 overflow-hidden`}>
                    <button 
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                        onClick={handleDismiss}
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="flex gap-4 items-center mb-4 pr-6">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
                            <Download className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-white font-bold text-lg leading-tight">Install PickApp</h3>
                            <p className="text-white/70 text-xs">Add to home screen for the full app experience</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        {/* iOS Instructions */}
                        <div className="bg-black/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white uppercase">iOS / Safari</div>
                            </div>
                            <ol className="text-sm text-white/80 space-y-2 ml-1">
                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">1</span> Tap the <Share2 size={16} className="inline mx-1" /> Share button</li>
                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">2</span> Scroll and select <span className="font-semibold bg-white/10 px-1.5 rounded inline-flex items-center gap-1"><PlusSquare size={12} /> Add to Home Screen</span></li>
                            </ol>
                        </div>
                        
                        {/* Android Instructions */}
                        <div className="bg-black/20 rounded-2xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="px-2 py-0.5 bg-white/10 rounded text-[9px] font-bold text-white uppercase">Android / Chrome</div>
                            </div>
                            <ol className="text-sm text-white/80 space-y-2 ml-1">
                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">1</span> Tap the <MoreVertical size={16} className="inline mx-1" /> Menu button</li>
                                <li className="flex gap-2 items-center"><span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[10px] font-bold shrink-0">2</span> Select <span className="font-semibold bg-white/10 px-1.5 rounded">Install app</span> or <span className="font-semibold bg-white/10 px-1.5 rounded">Add to Home screen</span></li>
                            </ol>
                        </div>
                    </div>
                    
                    <button 
                        className="w-full mt-5 py-3.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition-all active:scale-95"
                        onClick={handleDismiss}
                    >
                        I Understand
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
