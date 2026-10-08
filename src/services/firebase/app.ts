/**
 * Firebase client foundation — created lazily, in firebase mode only (AD-37).
 *
 * Infrastructure boundary (CLAUDE.md §3): `src/services/firebase/` is the only
 * place the Firebase SDK is imported. Nothing here runs at module load: the app,
 * Auth and Firestore instances are created on the first `getFirebaseServices()`
 * call, and this module itself is only loaded through `loadFirebaseBackend()`
 * (see `src/services/firebase-backend.ts`), so mock mode never evaluates the
 * Firebase SDK at all.
 *
 * Client SDK only — Firebase Spark plan. No Cloud Functions, no Admin SDK.
 *
 * Guarantees:
 * - One Firebase app instance. Fast refresh re-evaluates modules; `getApps()`
 *   lets a re-evaluated module reuse the existing app instead of initializing a
 *   second one (and Auth / emulator setup only runs for a freshly created app,
 *   because repeating them throws).
 * - Auth persistence is platform specific (AD-40): AsyncStorage on native, the
 *   browser's storage on web — see `auth-persistence(.native).ts`.
 * - Firestore uses an in-memory cache only. There is no persistent offline cache,
 *   and bookings are written only through transactions, which cannot be queued
 *   offline (AD-44).
 * - Emulator vs cloud is selected by configuration, never by editing a constant;
 *   the config parser only allows the emulator with a `demo-` project id.
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, initializeAuth, type Auth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
  type Firestore,
} from 'firebase/firestore';

import { appConfig } from '@/services/config';
import { createAuthPersistence } from '@/services/firebase/auth-persistence';

/** Default Firebase Emulator Suite ports; `firebase.json` declares the same values. */
export const EMULATOR_PORTS = {
  auth: 9099,
  firestore: 8080,
} as const;

/** How the running app is connected to Firebase. */
export type FirebaseTarget =
  | { readonly kind: 'emulator'; readonly host: string; readonly projectId: string }
  | { readonly kind: 'cloud'; readonly projectId: string };

export interface FirebaseServices {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
  readonly target: FirebaseTarget;
}

/** Thrown when Firebase is requested in a build that is not in firebase mode. */
export class FirebaseDisabledError extends Error {
  public override readonly name = 'FirebaseDisabledError';

  constructor() {
    super('Firebase is disabled in this build (DATA_SOURCE is not "firebase").');
  }
}

let services: FirebaseServices | undefined;

/** The Firebase app, Auth and Firestore instances, created on first call. */
export function getFirebaseServices(): FirebaseServices {
  if (services !== undefined) {
    return services;
  }
  const { firebase } = appConfig;
  if (appConfig.dataSource !== 'firebase' || firebase === null) {
    throw new FirebaseDisabledError();
  }

  const isNewApp = getApps().length === 0;
  const app = isNewApp ? initializeApp(firebase) : getApp();
  const auth = isNewApp
    ? initializeAuth(app, { persistence: createAuthPersistence() })
    : getAuth(app);
  const db = isNewApp
    ? initializeFirestore(app, {
        localCache: memoryLocalCache(),
        // React Native's networking cannot always hold Firestore's streaming
        // connection open; let the SDK fall back to long polling when needed.
        experimentalAutoDetectLongPolling: true,
      })
    : getFirestore(app);

  const target: FirebaseTarget = appConfig.useFirebaseEmulator
    ? { kind: 'emulator', host: appConfig.emulatorHost, projectId: firebase.projectId }
    : { kind: 'cloud', projectId: firebase.projectId };

  if (isNewApp && target.kind === 'emulator') {
    connectAuthEmulator(auth, `http://${target.host}:${EMULATOR_PORTS.auth}`, {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, target.host, EMULATOR_PORTS.firestore);
  }

  if (isNewApp && __DEV__) {
    const where =
      target.kind === 'emulator'
        ? `emulator at ${target.host} (auth :${EMULATOR_PORTS.auth}, firestore :${EMULATOR_PORTS.firestore})`
        : 'cloud';
    console.info(`[firebase] initialized project "${target.projectId}" → ${where}`);
  }

  services = { app, auth, db, target };
  return services;
}
