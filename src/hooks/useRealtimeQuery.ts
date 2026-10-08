import { skipToken, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useEffect, useEffectEvent, useState } from 'react';

import { acquireRealtime } from '@/hooks/realtime-registry';

export interface RealtimeQueryOptions<T> {
  readonly queryKey: QueryKey;
  /** False in mock mode or while inputs are missing: no listener at all. */
  readonly enabled: boolean;
  /** Starts the listener; calls `onData` for every snapshot; returns its stop function. */
  readonly subscribe: (onData: (data: T) => void, onError: (error: unknown) => void) => () => void;
}

export interface RealtimeQueryResult<T> {
  readonly data: T | undefined;
  readonly error: unknown;
}

/**
 * `onSnapshot()` → TanStack Query cache → UI (CLAUDE.md §9, AD-10).
 *
 * The listener writes every snapshot into the query cache with `setQueryData`;
 * the component reads it back through `useQuery`, which never fetches on its own
 * (`skipToken`) — the listener is the only source, so a refetch can never
 * overwrite fresher realtime data. Mounts that use the same key share one
 * listener (reference counted); it stops when the last one unmounts. The cached
 * value outlives the listener for the query's gc time, so returning to a screen
 * shows the last known state at once while the listener reconnects.
 */
export function useRealtimeQuery<T>({
  queryKey,
  enabled,
  subscribe,
}: RealtimeQueryOptions<T>): RealtimeQueryResult<T> {
  const queryClient = useQueryClient();
  const key = JSON.stringify(queryKey);
  const [failure, setFailure] = useState<{ readonly key: string; readonly error: unknown } | null>(
    null,
  );

  // Always the latest render's key and subscribe function, without restarting the effect.
  const start = useEffectEvent((reportError: (error: unknown) => void) =>
    subscribe((data) => {
      queryClient.setQueryData(queryKey, data);
    }, reportError),
  );

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    return acquireRealtime(
      key,
      (reportError) => start(reportError),
      (error) => {
        setFailure({ key, error });
      },
    );
  }, [enabled, key]);

  const query = useQuery<T>({ queryKey, queryFn: skipToken });
  return {
    data: enabled ? query.data : undefined,
    error: failure !== null && failure.key === key ? failure.error : undefined,
  };
}
