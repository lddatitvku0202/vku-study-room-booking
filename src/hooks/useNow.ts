import { useEffect, useState } from 'react';

const ONE_MINUTE_MS = 60_000;

/**
 * The current time, refreshed every `intervalMs` (default: one minute).
 *
 * Keeps "past slot" and "today" correct while a screen stays open — a slot
 * that starts while the user is looking at it becomes disabled on the next tick.
 */
export function useNow(intervalMs: number = ONE_MINUTE_MS): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date());
    }, intervalMs);
    return () => {
      clearInterval(timer);
    };
  }, [intervalMs]);

  return now;
}
