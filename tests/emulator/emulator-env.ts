/**
 * Shared settings for emulator-backed tests. The ports match `firebase.json`; the
 * project id is a `demo-` id, which the emulators never forward to production.
 */

import { initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore, type Firestore } from 'firebase/firestore';

export const DEMO_PROJECT_ID = 'demo-vku-study-room-booking';
export const EMULATOR_HOST = '127.0.0.1';
export const AUTH_EMULATOR_PORT = 9099;
export const FIRESTORE_EMULATOR_PORT = 8080;

let counter = 0;

/** A separate Firebase client (its own app, Auth and Firestore) — one simulated device. */
export interface TestClient {
  readonly app: FirebaseApp;
  readonly auth: Auth;
  readonly db: Firestore;
}

export function createTestClient(label = 'client'): TestClient {
  counter += 1;
  const app = initializeApp(
    { projectId: DEMO_PROJECT_ID, apiKey: 'demo-api-key', appId: 'demo-app-id' },
    `${label}-${counter}-${Date.now()}`,
  );
  const auth = getAuth(app);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`, {
    disableWarnings: true,
  });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, EMULATOR_HOST, FIRESTORE_EMULATOR_PORT);
  return { app, auth, db };
}
