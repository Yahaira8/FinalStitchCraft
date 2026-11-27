import { useCallback, useEffect, useRef, useState } from 'react';

interface WakeLockSentinelLike {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: string, listener: () => void) => void;
}

export function useWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [active, setActive] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null);
  const wantActiveRef = useRef(false);

  const requestLock = useCallback(async () => {
    if (!supported) {
      setUnavailableReason('Wake Lock unsupported in this browser; touch controls active.');
      setActive(false);
      wantActiveRef.current = false;
      return;
    }

    try {
      const nav = navigator as Navigator & {
        wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinelLike> };
      };
      const sentinel = await nav.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      setActive(true);
      setUnavailableReason(null);
      sentinel.addEventListener?.('release', () => {
        if (!wantActiveRef.current) {
          setActive(false);
        }
      });
    } catch {
      sentinelRef.current = null;
      setActive(false);
      wantActiveRef.current = false;
      setUnavailableReason('Wake Lock unavailable in embedded preview; touch controls active.');
    }
  }, [supported]);

  const release = useCallback(async () => {
    wantActiveRef.current = false;
    setActive(false);
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release();
      } catch {
        // Ignore release errors
      }
    }
    sentinelRef.current = null;
  }, []);

  const toggle = useCallback(async () => {
    if (active) {
      await release();
    } else {
      wantActiveRef.current = true;
      await requestLock();
    }
  }, [active, release, requestLock]);

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && wantActiveRef.current) {
        requestLock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinelRef.current && !sentinelRef.current.released) {
        sentinelRef.current.release().catch(() => {});
      }
    };
  }, [requestLock]);

  return {
    supported,
    active,
    unavailableReason,
    toggle,
    release,
  };
}
