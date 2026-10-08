/**
 * The firebase-mode backend: everything the app calls when `DATA_SOURCE=firebase`.
 *
 * Loaded only through `loadFirebaseBackend()` (dynamic import), never imported
 * statically from outside `src/services/firebase/`, so mock mode never evaluates
 * the Firebase SDK and the web build downloads it only in firebase mode.
 */

export { getFirebaseServices } from '@/services/firebase/app';
