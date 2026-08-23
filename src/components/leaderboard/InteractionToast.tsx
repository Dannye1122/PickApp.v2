import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ThumbsUp, Zap, MessageCircle, X } from 'lucide-react';
import { SocialInteraction } from '../../types';

interface InteractionToastProps {
  interaction: SocialInteraction | null;
  onDismiss: () => void;
}

export const InteractionToast: React.FC<InteractionToastProps> = ({ interaction, onDismiss }) => {
  if (!interaction) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'poke':
        return <Zap size={18} className="text-amber-400 animate-bounce" />;
      case 'thumbs_up':
        return <ThumbsUp size={18} className="text-emerald-400" />;
      case 'congrats':
        return <Sparkles size={18} className="text-purple-400 animate-spin-slow" />;
      case 'tease':
        return <MessageCircle size={18} className="text-rose-400" />;
      default:
        return <Zap size={18} className="text-emerald-400" />;
    }
  };

  const getBorderColor = (type: string) => {
    switch (type) {
      case 'poke':
        return 'border-amber-500/50 bg-slate-950/95 shadow-amber-500/10';
      case 'thumbs_up':
        return 'border-emerald-500/50 bg-slate-950/95 shadow-emerald-500/10';
      case 'congrats':
        return 'border-purple-500/50 bg-slate-950/95 shadow-purple-500/10';
      case 'tease':
        return 'border-rose-500/50 bg-slate-950/95 shadow-rose-500/10';
      default:
        return 'border-emerald-500/50 bg-slate-950/95 shadow-emerald-500/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -40, scale: 0.95 }}
      className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[300] max-w-sm w-[92%] sm:w-full p-3 rounded-2xl border shadow-2xl backdrop-blur-lg flex items-center gap-3 ${getBorderColor(
        interaction.type
      )}`}
    >
      <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
        {getIcon(interaction.type)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">
          Leaderboard Interaction
        </div>
        <p className="text-xs font-bold text-white truncate">{interaction.message}</p>
      </div>

      <button
        onClick={onDismiss}
        className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white shrink-0 active:scale-95"
        aria-label="Dismiss interaction"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};
