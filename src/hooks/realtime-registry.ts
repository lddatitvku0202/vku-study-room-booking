/**
 * Reference-counted realtime subscriptions (CLAUDE.md §9, AD-31).
 *
 * Every mount that needs the same realtime key shares ONE underlying listener:
 * the first `acquire` starts it, later ones only add a reference, and the last
 * `release` stops it — so there is never a duplicate listener for a key and zero
 * listeners once nothing is mounted. No React here, so it is unit-testable.
 */

export type StopListening = () => void;

interface Entry {
  count: number;
  stop: StopListening;
  readonly errorListeners: Set<(error: unknown) => void>;
  lastError: unknown;
}

const entries = new Map<string, Entry>();

/**
 * Starts (or joins) the listener for `key`. `start` receives an error reporter and
 * must return the function that stops the underlying listener.
 * Returns the release function for this reference.
 */
export function acquireRealtime(
  key: string,
  start: (reportError: (error: unknown) => void) => StopListening,
  onError?: (error: unknown) => void,
): () => void {
  let entry = entries.get(key);
  if (entry === undefined) {
    const created: Entry = {
      count: 0,
      stop: () => undefined,
      errorListeners: new Set(),
      lastError: undefined,
    };
    entries.set(key, created);
    created.stop = start((error) => {
      created.lastError = error;
      for (const listener of created.errorListeners) listener(error);
    });
    entry = created;
  }
  entry.count += 1;
  if (onError !== undefined) {
    entry.errorListeners.add(onError);
    if (entry.lastError !== undefined) onError(entry.lastError);
  }

  const owned = entry;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (onError !== undefined) owned.errorListeners.delete(onError);
    owned.count -= 1;
    if (owned.count === 0) {
      entries.delete(key);
      owned.stop();
    }
  };
}

/** Number of live underlying listeners (diagnostics and tests). */
export function activeRealtimeListenerCount(): number {
  return entries.size;
}
