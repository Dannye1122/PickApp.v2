import { useState, useEffect, useRef } from 'react';

export function useWakeLock(enabled: boolean, isAuthenticated: boolean) {
  const [wakeLockError, setWakeLockError] = useState<string | null>(null);
  const wakeLockRef = useRef<any>(null);

  useEffect(() => {
    const handleWakeLock = async () => {
      if (enabled && 'wakeLock' in navigator && isAuthenticated) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          setWakeLockError(null);
        } catch (err: any) {
          setWakeLockError(err.message);
        }
      } else {
        if (wakeLockRef.current) {
          wakeLockRef.current.release();
          wakeLockRef.current = null;
        }
        setWakeLockError(null);
      }
    };

    handleWakeLock();

    // Re-acquire lock if page becomes visible again
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && enabled) {
        handleWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
      }
    };
  }, [enabled, isAuthenticated]);

  return { wakeLockError };
}
