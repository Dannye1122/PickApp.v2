import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, ThumbsUp, Zap, MessageCircle, X, Bell } from 'lucide-react';
import { SocialInteraction, InteractionType } from '../../types';

interface InteractionToastProps {
  interaction: SocialInteraction | null;
  onDismiss: () => void;
  onOpenHub?: () => void;
  onQuickReply?: (recipient: string, type: InteractionType) => void;
}

export const InteractionToast: React.FC<InteractionToastProps> = ({ 
  interaction, 
  onDismiss, 
  onOpenHub,
  onQuickReply 
}) => {
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
      className={`fixed top-14 sm:top-16 left-1/2 -translate-x-1/2 z-[300] max-w-md w-[92%] sm:w-full p-3 rounded-2xl border shadow-2xl backdrop-blur-lg flex flex-col gap-2 pointer-events-auto ${getBorderColor(
        interaction.type
      )}`}
    >
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-xl bg-slate-900 border border-slate-800 shrink-0 cursor-pointer"
          onClick={onOpenHub}
          title="Open Notification Hub"
        >
          {getIcon(interaction.type)}
        </div>

        <div className="flex-1 min-w-0 cursor-pointer" onClick={onOpenHub}>
          <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
            <span>Leaderboard Interaction</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          </div>
          <p className="text-xs font-bold text-white truncate">{interaction.message}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {onOpenHub && (
            <button
              onClick={onOpenHub}
              className="px-2 py-1 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-[10px] font-bold text-indigo-200 hover:bg-indigo-600/50 active:scale-95"
              aria-label="View notifications"
            >
              Hub
            </button>
          )}
          <button
            onClick={onDismiss}
            className="w-7 h-7 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white shrink-0 active:scale-95"
            aria-label="Dismiss interaction"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Quick Reply Row */}
      {onQuickReply && interaction.senderName && (
        <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80 pl-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Reply:</span>
          <button
            onClick={() => {
              onQuickReply(interaction.senderName, 'thumbs_up');
              onDismiss();
            }}
            className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-800 text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95"
          >
            <ThumbsUp className="w-2.5 h-2.5 text-emerald-400" />
            <span>Thumbs Up</span>
          </button>
          <button
            onClick={() => {
              onQuickReply(interaction.senderName, 'poke');
              onDismiss();
            }}
            className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-800 text-[10px] font-semibold flex items-center gap-1 transition-all active:scale-95"
          >
            <Zap className="w-2.5 h-2.5 text-amber-400" />
            <span>Poke Back</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};
