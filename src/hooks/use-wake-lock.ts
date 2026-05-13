import { useEffect, useRef } from 'react';

export function useWakeLock(active: boolean) {
  const sentinelRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (!active || !navigator.wakeLock) return;

    let cancelled = false;

    const acquire = async () => {
      try {
        const sentinel = await navigator.wakeLock!.request('screen');
        if (cancelled) {
          sentinel.release();
          return;
        }
        sentinelRef.current = sentinel;
        sentinel.onrelease = () => {
          sentinelRef.current = null;
        };
      } catch {
        // Wake lock not available
      }
    };

    acquire();

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && !sentinelRef.current) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibility);
      sentinelRef.current?.release();
      sentinelRef.current = null;
    };
  }, [active]);
}
