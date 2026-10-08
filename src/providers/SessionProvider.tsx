/**
 * Provides the session to the whole app (AD-36).
 *
 * In firebase mode it signs in anonymously once at app start — there is no sign-in
 * screen — and every screen reads the result with `useSession()`. In mock mode it
 * provides `disabled` and never touches Firebase.
 */

import { SessionContext, useSessionBootstrap } from '@/hooks/useSession';

import type { JSX, ReactNode } from 'react';

interface SessionProviderProps {
  readonly children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps): JSX.Element {
  const state = useSessionBootstrap();
  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
