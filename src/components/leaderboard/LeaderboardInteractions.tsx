import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ThumbsUp, Sparkles, MessageCircle, Zap, Check } from 'lucide-react';
import { InteractionType } from '../../types';
import { sendSocialInteraction } from '../../services/leaderboardService';
import { haptic } from '../../services/hapticService';
import { playAlertSound } from '../../services/audioService';

interface LeaderboardInteractionsProps {
  targetName: string;
  senderName: string;
  rank: number;
  onSent?: (message: string) => void;
}

export const LeaderboardInteractions: React.FC<LeaderboardInteractionsProps> = ({
  targetName,
  senderName,
  rank,
  onSent
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [justSent, setJustSent] = useState<string | null>(null);

  // Only available for Top 5 users and not to oneself
  if (rank > 5 || targetName.toLowerCase() === senderName.toLowerCase()) {
    return null;
  }

  const actions: { type: InteractionType; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
    {
      type: 'poke',
      label: 'Poke',
      icon: <Zap size={13} className="text-amber-400" />,
      color: 'text-amber-400',
      bg: 'hover:bg-amber-500/20 active:bg-amber-500/30 border-amber-500/30'
    },
    {
      type: 'thumbs_up',
      label: 'Thumbs Up',
      icon: <ThumbsUp size={13} className="text-emerald-400" />,
      color: 'text-emerald-400',
      bg: 'hover:bg-emerald-500/20 active:bg-emerald-500/30 border-emerald-500/30'
    },
    {
      type: 'congrats',
      label: 'Congrats',
      icon: <Sparkles size={13} className="text-purple-400" />,
      color: 'text-purple-400',
      bg: 'hover:bg-purple-500/20 active:bg-purple-500/30 border-purple-500/30'
    },
    {
      type: 'tease',
      label: 'Tease',
      icon: <MessageCircle size={13} className="text-rose-400" />,
      color: 'text-rose-400',
      bg: 'hover:bg-rose-500/20 active:bg-rose-500/30 border-rose-500/30'
    }
  ];

  const handleSend = async (e: React.MouseEvent, type: InteractionType) => {
    e.stopPropagation();
    if (sending) return;

    setSending(true);
    haptic('medium');
    playAlertSound();

    try {
      const res = await sendSocialInteraction(senderName, targetName, type);
      setJustSent(type);
      if (onSent) onSent(res.message);
      setTimeout(() => {
        setJustSent(null);
        setIsOpen(false);
      }, 1200);
    } catch {
      // Ignore failure gracefully
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => {
          haptic('light');
          setIsOpen(!isOpen);
        }}
        className="px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-slate-200 flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap"
        title={`Interact with #${rank} ${targetName}`}
      >
        <span className="text-amber-400">⚡</span>
        <span>Interact</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 4 }}
            className="absolute right-0 sm:right-0 bottom-full mb-1.5 z-50 p-1.5 rounded-xl bg-slate-950/95 border border-slate-700/80 shadow-2xl backdrop-blur-md flex items-center gap-1 min-w-[210px] max-w-[280px]"
          >
            {justSent ? (
              <div className="w-full py-1 px-2 flex items-center justify-center gap-1.5 text-emerald-400 text-[10px] font-bold">
                <Check size={13} /> Sent to {targetName}!
              </div>
            ) : (
              actions.map((act) => (
                <button
                  key={act.type}
                  onClick={(e) => handleSend(e, act.type)}
                  disabled={sending}
                  className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-lg border bg-slate-900/90 transition-all ${act.bg} active:scale-90`}
                >
                  {act.icon}
                  <span className={`text-[8px] font-black uppercase tracking-tight mt-0.5 whitespace-nowrap ${act.color}`}>
                    {act.label}
                  </span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
