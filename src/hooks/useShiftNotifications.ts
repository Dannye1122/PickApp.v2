import { useState, useCallback, useMemo, useEffect } from 'react';
import { ShiftNotification, InteractionType, SocialInteraction } from '../types';
import { 
  getLocalNotifications, 
  saveLocalNotification, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  clearLocalNotifications 
} from '../services/indexedDbService';
import { subscribeToIncomingInteractions, sendSocialInteraction } from '../services/leaderboardService';
import { deviceHaptic } from '../lib/deviceApi';

interface UseShiftNotificationsOptions {
  operatorName: string;
  showToast: (message: string, type?: 'error' | 'success' | 'info') => void;
}

export function useShiftNotifications({ operatorName, showToast }: UseShiftNotificationsOptions) {
  const [showNotificationHub, setShowNotificationHub] = useState(false);
  const [shiftNotifications, setShiftNotifications] = useState<ShiftNotification[]>([]);
  const [activeInteraction, setActiveInteraction] = useState<SocialInteraction | null>(null);

  const unreadNotificationsCount = useMemo(() => {
    return shiftNotifications.filter(n => !n.isRead).length;
  }, [shiftNotifications]);

  const loadShiftNotifications = useCallback(async (userName: string) => {
    if (!userName) return;
    try {
      const list = await getLocalNotifications(userName);
      setShiftNotifications(list || []);
    } catch (err) {
      console.warn('Failed to load notifications from IndexedDB:', err);
    }
  }, []);

  const addShiftNotification = useCallback(async (notif: Omit<ShiftNotification, 'id' | 'timestamp' | 'isRead'> & { id?: string; timestamp?: number; isRead?: boolean }) => {
    const safeOp = (notif.operator || operatorName || 'DEFAULT').toUpperCase().trim();
    const fullNotif: ShiftNotification = {
      id: notif.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      operator: safeOp,
      category: notif.category,
      title: notif.title,
      message: notif.message,
      timestamp: notif.timestamp || Date.now(),
      isRead: notif.isRead ?? false,
      interactionType: notif.interactionType,
      senderName: notif.senderName,
      data: notif.data
    };

    setShiftNotifications(prev => [fullNotif, ...prev.filter(p => p.id !== fullNotif.id)]);
    try {
      await saveLocalNotification(fullNotif);
    } catch (e) {
      console.warn('Failed to save notification to IndexedDB:', e);
    }
  }, [operatorName]);

  const handleMarkNotificationAsRead = useCallback(async (id: string) => {
    setShiftNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    try {
      await markNotificationAsRead(id);
    } catch (e) {
      console.warn('Error marking notification as read:', e);
    }
  }, []);

  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    const safeOp = (operatorName || 'DEFAULT').toUpperCase().trim();
    setShiftNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsAsRead(safeOp);
    } catch (e) {
      console.warn('Error marking all notifications as read:', e);
    }
  }, [operatorName]);

  const handleClearAllNotifications = useCallback(async () => {
    const safeOp = (operatorName || 'DEFAULT').toUpperCase().trim();
    setShiftNotifications([]);
    try {
      await clearLocalNotifications(safeOp);
      showToast("Notification history cleared", "info");
    } catch (e) {
      console.warn('Error clearing notifications:', e);
    }
  }, [operatorName, showToast]);

  const handleReplyToInteraction = useCallback(async (recipient: string, type: InteractionType, customText?: string) => {
    const sender = (operatorName || 'Teammate').toUpperCase().trim();
    const res = await sendSocialInteraction(sender, recipient, type, customText);
    if (res && res.message) {
      showToast(res.message, "success");
    }
  }, [operatorName, showToast]);

  // Subscribe to live incoming social interactions from teammates
  useEffect(() => {
    const targetOp = (operatorName || '').toUpperCase().trim();
    if (!targetOp) return;

    loadShiftNotifications(targetOp);

    const unsubscribe = subscribeToIncomingInteractions(targetOp, (interaction) => {
      setActiveInteraction(interaction);
      deviceHaptic('medium');

      addShiftNotification({
        id: interaction.id || `peer_${Date.now()}`,
        operator: targetOp,
        category: 'peer',
        title: `${interaction.senderName || 'Teammate'} interacted with you`,
        message: interaction.message,
        interactionType: interaction.type,
        senderName: interaction.senderName,
        timestamp: interaction.createdAt ? new Date(interaction.createdAt).getTime() : Date.now(),
        isRead: false
      });

      setTimeout(() => setActiveInteraction(null), 6000);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [operatorName, loadShiftNotifications, addShiftNotification]);

  return {
    showNotificationHub,
    setShowNotificationHub,
    shiftNotifications,
    unreadNotificationsCount,
    activeInteraction,
    setActiveInteraction,
    loadShiftNotifications,
    addShiftNotification,
    handleMarkNotificationAsRead,
    handleMarkAllNotificationsAsRead,
    handleClearAllNotifications,
    handleReplyToInteraction
  };
}
