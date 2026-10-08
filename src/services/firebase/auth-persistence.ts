/**
 * Firebase Auth persistence — web / default build (AD-40).
 *
 * Metro picks `auth-persistence.native.ts` on iOS and Android, and this file on
 * web. The browser keeps the anonymous session in its local storage, so a page
 * reload keeps the same uid. No React-Native-only API is reachable from here.
 */

import { browserLocalPersistence, type Persistence } from 'firebase/auth';

export function createAuthPersistence(): Persistence {
  return browserLocalPersistence;
}
