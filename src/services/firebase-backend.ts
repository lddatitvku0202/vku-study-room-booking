/**
 * Gateway to the firebase-mode backend (AD-37).
 *
 * This module imports no Firebase code. Callers that need Firestore or Auth ask
 * for the backend here; the Firebase SDK is loaded with a dynamic `import()` the
 * first time that happens, and only in firebase mode. In mock mode the request is
 * refused, so a code path that would silently reach Firebase fails loudly instead.
 */

import { isFirebaseMode } from '@/services/config';
import { FirebaseModeRequiredError } from '@/utils/data-source-errors';

export type FirebaseBackend = typeof import('@/services/firebase');

let backend: Promise<FirebaseBackend> | undefined;

/** The firebase-mode backend module, loaded once on first use. */
export function loadFirebaseBackend(): Promise<FirebaseBackend> {
  if (!isFirebaseMode) {
    return Promise.reject(new FirebaseModeRequiredError());
  }
  backend ??= import('@/services/firebase');
  return backend;
}
