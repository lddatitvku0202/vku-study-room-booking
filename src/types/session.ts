/**
 * Authenticated session types.
 *
 * Deliberately minimal. The trusted identity is `request.auth.uid` on the
 * server (CLAUDE.md §8); the client only needs to know who is signed in.
 * Sign-in is anonymous (AD-36), so there is no profile to model.
 */

/** The currently signed-in user. */
export interface UserSession {
  readonly uid: string;
  readonly isAnonymous: boolean;
}

/** Why establishing a session failed, independent of the Firebase SDK's error codes. */
export type SessionErrorCode =
  'NETWORK' | 'ANONYMOUS_AUTH_DISABLED' | 'TOO_MANY_REQUESTS' | 'UNKNOWN';

/**
 * The session as the UI sees it.
 * - `disabled`: mock mode (AD-37) — there is no Firebase session at all.
 */
export type SessionState =
  | { readonly status: 'disabled' }
  | { readonly status: 'loading' }
  | { readonly status: 'signed-in'; readonly session: UserSession }
  | { readonly status: 'error'; readonly code: SessionErrorCode };
