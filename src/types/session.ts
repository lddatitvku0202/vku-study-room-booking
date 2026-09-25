/**
 * Authenticated session types.
 *
 * Deliberately minimal. The trusted identity is `request.auth.uid` on the
 * server (CLAUDE.md §8); the client only needs to know who is signed in.
 * Profile fields are not modelled until a feature actually requires them.
 */

/** The currently signed-in user. */
export interface UserSession {
  readonly uid: string;
}
