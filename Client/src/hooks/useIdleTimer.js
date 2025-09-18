import { useEffect, useRef, useState } from 'react';

/**
 * Simple idle timer hook.
 * Triggers onIdle after `thresholdMs` of no activity while `enabled` is true.
 */
export function useIdleTimer({ enabled, thresholdMs = 30000, pollMs = 1000, onIdle }) {
  const lastActivityRef = useRef(Date.now());
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const mark = () => {
      if (idle) return; // don't reset while already idle (until caller handles)
      lastActivityRef.current = Date.now();
    };
    const events = ['mousemove','keydown','click','scroll','touchstart'];
    events.forEach(e => window.addEventListener(e, mark, { passive: true }));

    const interval = setInterval(() => {
      if (!idle && Date.now() - lastActivityRef.current >= thresholdMs) {
        setIdle(true);
        onIdle?.();
      }
    }, pollMs);

    return () => {
      events.forEach(e => window.removeEventListener(e, mark));
      clearInterval(interval);
    };
  }, [enabled, thresholdMs, pollMs, idle, onIdle]);

  const reset = () => {
    lastActivityRef.current = Date.now();
    setIdle(false);
  };

  return { idle, reset };
}
