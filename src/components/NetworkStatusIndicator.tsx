import React, { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { syncManager } from '../services/syncManager';
import { isQuotaExceeded } from '../utils/quotaManager';

interface NetworkStatusIndicatorProps {
  failedUploadsCount?: number;
  onFlush?: () => void;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  failedUploadsCount = 0,
  onFlush
}) => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(isQuotaExceeded());

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setQuotaExceeded(isQuotaExceeded());
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(() => {
      setIsOnline(navigator.onLine);
      setQuotaExceeded(isQuotaExceeded());
    }, 4000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncManager.sync();
      if (onFlush) onFlush();
    } catch (e) {
      console.warn('Manual sync trigger exception:', e);
    } finally {
      setTimeout(() => setIsSyncing(false), 800);
    }
  };

  if (!isOnline) {
    return (
      <button
        id="network-status-offline-btn"
        onClick={handleManualSync}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 active:scale-95 transition-transform"
        title="Aisle Dead Zone - Tap to retry connection"
      >
        <CloudOff size={12} className="animate-pulse" />
        <span>Dead Zone ({failedUploadsCount})</span>
      </button>
    );
  }

  if (quotaExceeded) {
    return (
      <div
        id="network-status-quota-pill"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30"
        title="Offline Guardian Active (Free Tier Protected)"
      >
        <AlertTriangle size={12} />
        <span>Local Safe</span>
      </div>
    );
  }

  if (failedUploadsCount > 0) {
    return (
      <button
        id="network-status-pending-btn"
        onClick={handleManualSync}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 active:scale-95 transition-transform shadow-lg shadow-amber-500/10"
        title="Buffered orders ready to sync"
      >
        <RefreshCw size={12} className={isSyncing ? "animate-spin" : ""} />
        <span>Sync {failedUploadsCount} Orders</span>
      </button>
    );
  }

  return (
    <button
      id="network-status-live-btn"
      onClick={handleManualSync}
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 active:scale-95 transition-all"
      title="Live Cloud Connected (80% Free Tier Optimized)"
    >
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
      <Cloud size={12} className={isSyncing ? "animate-spin text-sky-400" : "text-emerald-400"} />
      <span className="hidden sm:inline">Live Synced</span>
    </button>
  );
};
export default NetworkStatusIndicator;
