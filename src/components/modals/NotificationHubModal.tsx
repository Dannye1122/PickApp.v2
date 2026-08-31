import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bell, X, MessageSquare, Zap, Radio, CheckCheck, Trash2, 
  ThumbsUp, Hand, Trophy, Flame, Send, ArrowRight, Clock,
  Sparkles
} from 'lucide-react';
import { ShiftNotification, NotificationCategory, InteractionType } from '../../types';

interface NotificationHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: ShiftNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onDeleteNotification?: (id: string) => void;
  onSendInteractionReply?: (recipient: string, type: InteractionType, customText?: string) => Promise<void>;
  currentOperator: string;
}

export const NotificationHubModal: React.FC<NotificationHubModalProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onDeleteNotification,
  onSendInteractionReply,
  currentOperator
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'peer' | 'milestone' | 'broadcast'>('all');
  const [replyingTo, setReplyingTo] = useState<ShiftNotification | null>(null);
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replySuccessMessage, setReplySuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    return n.category === activeTab;
  });

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleQuickReply = async (recipient: string, type: InteractionType) => {
    if (!onSendInteractionReply) return;
    setIsSendingReply(true);
    try {
      await onSendInteractionReply(recipient, type);
      setReplySuccessMessage(`Sent reaction to ${recipient}!`);
      setTimeout(() => {
        setReplySuccessMessage(null);
        setReplyingTo(null);
      }, 1500);
    } catch (e) {
      console.warn('Failed to send reply:', e);
    } finally {
      setIsSendingReply(false);
    }
  };

  const getCategoryIcon = (category: NotificationCategory, type?: InteractionType) => {
    switch (category) {
      case 'peer':
        if (type === 'poke') return <Hand className="w-4 h-4 text-amber-400" />;
        if (type === 'thumbs_up') return <ThumbsUp className="w-4 h-4 text-emerald-400" />;
        if (type === 'congrats') return <Trophy className="w-4 h-4 text-sky-400" />;
        if (type === 'tease') return <Flame className="w-4 h-4 text-rose-400" />;
        return <MessageSquare className="w-4 h-4 text-indigo-400" />;
      case 'milestone':
        return <Zap className="w-4 h-4 text-amber-400" />;
      case 'broadcast':
        return <Radio className="w-4 h-4 text-rose-400" />;
      default:
        return <Bell className="w-4 h-4 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (category: NotificationCategory) => {
    switch (category) {
      case 'peer':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      case 'milestone':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'broadcast':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const formatTimestamp = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return isToday ? timeStr : `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${timeStr}`;
  };

  return (
    <AnimatePresence>
      <div 
        id="notification-hub-overlay"
        className="fixed inset-0 z-[300] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          id="notification-hub-container"
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative max-w-lg w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-950/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    Shift Notification Hub
                  </h2>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-indigo-500 text-white shadow-sm">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400">
                  Real-time peer interactions & shift events
                </p>
              </div>
            </div>
            
            <button
              id="close-notification-hub-btn"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Tabs & Quick Action Bar */}
          <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="filter-all-btn"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                id="filter-peer-btn"
                onClick={() => setActiveTab('peer')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'peer'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Interactions ({notifications.filter(n => n.category === 'peer').length})
              </button>
              <button
                id="filter-milestone-btn"
                onClick={() => setActiveTab('milestone')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'milestone'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                Milestones
              </button>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {unreadCount > 0 && (
                  <button
                    id="mark-all-read-btn"
                    onClick={onMarkAllAsRead}
                    title="Mark all as read"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
                <button
                  id="clear-all-notifs-btn"
                  onClick={onClearAll}
                  title="Clear history"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Notifications Scroll View */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[220px]">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/50 border border-slate-700/50 flex items-center justify-center text-slate-500 mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">
                  No notifications yet
                </h3>
                <p className="text-xs text-slate-500 max-w-xs">
                  Teammate pokes, cheers, banter, pace milestones, and broadcast alerts will appear right here.
                </p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {filteredNotifications.map((item) => {
                  const isPeer = item.category === 'peer' && item.senderName;
                  const canReply = isPeer && item.senderName !== currentOperator && !!onSendInteractionReply;

                  return (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, x: -200, height: 0, marginBottom: 0 }}
                      transition={{ duration: 0.2 }}
                      className="relative overflow-hidden rounded-2xl"
                    >
                      {/* Swipe Delete Background Reveal */}
                      <div className="absolute inset-0 bg-rose-600/90 rounded-2xl flex items-center justify-end px-4 z-0">
                        <div className="flex items-center gap-1.5 text-white font-bold text-xs uppercase tracking-wider">
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </div>
                      </div>

                      {/* Draggable Notification Card */}
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -100, right: 0 }}
                        dragElastic={0.15}
                        onDragEnd={(_, info) => {
                          if ((info.offset.x < -60 || info.velocity.x < -300) && onDeleteNotification) {
                            onDeleteNotification(item.id);
                          }
                        }}
                        id={`notification-item-${item.id}`}
                        onClick={() => onMarkAsRead(item.id)}
                        className={`relative z-10 p-3.5 rounded-2xl border transition-colors cursor-pointer select-none ${
                          item.isRead
                            ? 'bg-slate-950 border-slate-800/80 opacity-80 hover:opacity-100 hover:border-slate-700'
                            : 'bg-slate-900 border-indigo-500/30 shadow-md shadow-indigo-500/5'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5 mb-1.5">
                          <div className="flex items-center gap-2">
                            <div className={`p-1.5 rounded-xl border ${getCategoryBadgeClass(item.category)}`}>
                              {getCategoryIcon(item.category, item.interactionType)}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-200">
                                {item.title}
                              </span>
                              {!item.isRead && (
                                <span className="ml-2 inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTimestamp(item.timestamp)}
                            </span>
                            {onDeleteNotification && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteNotification(item.id);
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                                title="Delete notification"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 pl-8 mb-2 leading-relaxed">
                          {item.message}
                        </p>

                        {/* Peer Quick Interaction Actions */}
                        {canReply && (
                          <div 
                            className="pl-8 pt-2 mt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                              Reply to {item.senderName}:
                            </span>
                            <button
                              onClick={() => handleQuickReply(item.senderName!, 'thumbs_up')}
                              disabled={isSendingReply}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <ThumbsUp className="w-3 h-3 text-emerald-400" />
                              <span>Thumbs Up</span>
                            </button>
                            <button
                              onClick={() => handleQuickReply(item.senderName!, 'poke')}
                              disabled={isSendingReply}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border border-slate-700 hover:border-amber-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Hand className="w-3 h-3 text-amber-400" />
                              <span>Poke Back</span>
                            </button>
                            <button
                              onClick={() => handleQuickReply(item.senderName!, 'congrats')}
                              disabled={isSendingReply}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 hover:border-sky-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Trophy className="w-3 h-3 text-sky-400" />
                              <span>Cheer</span>
                            </button>
                            <button
                              onClick={() => handleQuickReply(item.senderName!, 'tease')}
                              disabled={isSendingReply}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 rounded-lg text-xs font-medium flex items-center gap-1 transition-all active:scale-95 disabled:opacity-50"
                            >
                              <Flame className="w-3 h-3 text-rose-400" />
                              <span>Banter</span>
                            </button>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Footer Status / Quick Dismiss */}
          <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              {replySuccessMessage || 'Stored locally in IndexedDB & synced with team'}
            </span>

            <button
              id="dismiss-notif-hub-btn"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
export default NotificationHubModal;
