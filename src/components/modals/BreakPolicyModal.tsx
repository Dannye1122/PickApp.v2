import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Coffee, Clock } from 'lucide-react';

interface BreakPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BreakPolicyModal: React.FC<BreakPolicyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-900 border border-slate-700 p-6 rounded-3xl max-w-sm w-full shadow-2xl"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">New Break Policy</h2>
          </div>

          <div className="space-y-4 text-slate-300 text-sm mb-8">
            <p>The 45-minute exempt time is now reorganized:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>5 mins: Deducted at clock-out.</li>
              <li>30 mins: Dinner break.</li>
              <li>10 mins: Post-dinner adjustment.</li>
            </ul>
            <p className="font-bold text-white flex items-center gap-2">
              <Coffee size={18} className="text-amber-500" />
              IMPORTANT: You MUST press the break button for dinner!
            </p>
            <p>
              The dinner exemption is 30 minutes. If your dinner break exceeds 30 minutes, 
              the extra time is added back to your working time, which can lower your pick rate.
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors"
          >
            I UNDERSTAND
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
