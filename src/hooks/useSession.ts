import { createContext, useContext, useEffect, useState } from 'react';

import { isFirebaseMode } from '@/services/config';
import { loadFirebaseBackend } from '@/services/firebase-backend';

import type { SessionState } from '@/types/session';

const DISABLED: SessionState = { status: 'disabled' };
const LOADING: SessionState = { status: 'loading' };

/** Session state for the whole app; provided by `SessionProvider`. */
export const SessionContext = createContext<SessionState>(DISABLED);

/**
 * The current session (AD-36). `disabled` in mock mode; in firebase mode
 * `loading` → `signed-in` (anonymous uid) or `error` with a typed reason.
 */
export function useSession(): SessionState {
  return useContext(SessionContext);
}

/**
 * Starts the anonymous session once at app start (firebase mode only) and keeps
 * it in sync with Firebase Auth. Used by `SessionProvider`; screens read the
 * result with `useSession()`.
 *
 * The Auth listener stays subscribed after a failed sign-in, so any later
 * successful attempt (for example a room-list retry, which signs in again)
 * moves the state to `signed-in` without a separate retry path.
 */
export function useSessionBootstrap(): SessionState {
  const [state, setState] = useState<SessionState>(isFirebaseMode ? LOADING : DISABLED);

  useEffect(() => {
    if (!isFirebaseMode) {
      return undefined;
    }
    let isActive = true;
    let unsubscribe: (() => void) | undefined;

    void loadFirebaseBackend()
      .then((backend) => {
        if (!isActive) {
          return;
        }
        unsubscribe = backend.subscribeToSession((session) => {
          if (isActive && session !== null) {
            setState({ status: 'signed-in', session });
          }
        });
        backend.ensureAnonymousSession().catch((error: unknown) => {
          if (isActive) {
            setState({ status: 'error', code: backend.sessionErrorCodeOf(error) });
          }
        });
      })
      .catch(() => {
        if (isActive) {
          setState({ status: 'error', code: 'UNKNOWN' });
        }
      });

    return () => {
      isActive = false;
      unsubscribe?.();
    };
  }, []);

  return state;
}
