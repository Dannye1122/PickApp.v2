import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, X, Megaphone, Bell, Sparkles } from 'lucide-react';

interface BroadcastBannerProps {
  message?: string;
  onDismiss?: () => void;
}

export const BroadcastBanner: React.FC<BroadcastBannerProps> = ({ message, onDismiss }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!message || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -20, height: 0 }}
        className="w-full bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90 backdrop-blur-md text-white border-b border-amber-400/40 shadow-lg px-4 py-2.5 flex items-center justify-between z-40 relative"
      >
        <div className="flex items-center gap-2.5 text-xs font-black tracking-wide truncate pr-2">
          <div className="p-1 rounded-lg bg-black/20 text-amber-200 shrink-0">
            <Radio size={14} className="animate-pulse" />
          </div>
          <span className="bg-black/30 text-amber-200 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full shrink-0 border border-amber-300/30">
            FLOOR BROADCAST
          </span>
          <span className="truncate text-white font-bold">{message}</span>
        </div>
        <button
          onClick={() => {
            setDismissed(true);
            if (onDismiss) onDismiss();
          }}
          className="p-1 rounded-lg hover:bg-black/20 text-white/80 hover:text-white transition-colors shrink-0"
          title="Dismiss Broadcast"
        >
          <X size={14} />
        </button>
      </motion.div>
    </AnimatePresence>
  );
};
