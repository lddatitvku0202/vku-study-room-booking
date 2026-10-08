/**
 * Anonymous Firebase Authentication (AD-36).
 *
 * Every function takes the `Auth` instance as a parameter, so the same code runs
 * in the app (wired in `services/firebase/index.ts`) and in Node against the Auth
 * emulator. No React here.
 */

import { onAuthStateChanged, signInAnonymously, type Auth, type User } from 'firebase/auth';

import { errorCodeOf, mapAuthErrorCode } from '@/utils/firebase-errors';

import type { SessionErrorCode, UserSession } from '@/types/session';

/** Establishing the anonymous session failed; `code` is the app's typed reason. */
export class SessionError extends Error {
  public override readonly name = 'SessionError';

  constructor(
    public readonly code: SessionErrorCode,
    options?: { cause?: unknown },
  ) {
    super(`Could not start an anonymous session (${code}).`, options);
  }
}

function toSession(user: User): UserSession {
  return { uid: user.uid, isAnonymous: user.isAnonymous };
}

// One in-flight sign-in per Auth instance: concurrent callers (the session
// provider, a room query, a booking) share it instead of each creating a new
// anonymous user.
const pending = new WeakMap<Auth, Promise<UserSession>>();

/**
 * The current user, signing in anonymously if nobody is signed in yet.
 * A persisted session (AsyncStorage on native, browser storage on web) is
 * restored first, so a normal restart keeps the same uid.
 *
 * @throws {SessionError} if sign-in fails; a later call retries.
 */
export function ensureAnonymousSession(auth: Auth): Promise<UserSession> {
  const existing = pending.get(auth);
  if (existing !== undefined) {
    return existing;
  }
  const attempt = (async (): Promise<UserSession> => {
    await auth.authStateReady();
    if (auth.currentUser !== null) {
      return toSession(auth.currentUser);
    }
    try {
      const credential = await signInAnonymously(auth);
      return toSession(credential.user);
    } catch (error: unknown) {
      throw new SessionError(mapAuthErrorCode(errorCodeOf(error)), { cause: error });
    }
  })();
  pending.set(auth, attempt);
  // Clear only after a failure, so the next call retries; a success stays cached.
  attempt.catch(() => {
    pending.delete(auth);
  });
  return attempt;
}

/** The signed-in uid, or `undefined` when nobody is signed in. Never signs in. */
export function currentUid(auth: Auth): string | undefined {
  return auth.currentUser?.uid;
}

/** Calls `listener` with the session (or `null`) now and on every change. */
export function subscribeToSession(
  auth: Auth,
  listener: (session: UserSession | null) => void,
): () => void {
  return onAuthStateChanged(auth, (user) => {
    listener(user === null ? null : toSession(user));
  });
}

/** The typed code of a sign-in failure. */
export function sessionErrorCodeOf(error: unknown): SessionErrorCode {
  return error instanceof SessionError ? error.code : mapAuthErrorCode(errorCodeOf(error));
}
