/**
 * Runtime application configuration types.
 *
 * These describe the validated shape of the values supplied through
 * `app.config.ts` → `extra`. Pure TypeScript: no Firebase SDK types are used
 * here, so the Firebase phase can consume this without inverting the layering.
 */

/** Which environment the running build is configured against. */
export type AppEnvironment = 'development' | 'production';

/**
 * Where server data comes from (AD-37).
 * - `mock`: the Emergency MVP — local rooms, local demo bookings, no Firebase.
 * - `firebase`: Firestore is the source of truth; Firebase is initialized lazily.
 */
export type DataSource = 'mock' | 'firebase';

/**
 * Firebase **web** configuration.
 *
 * Public by design — it ships inside every client build (CLAUDE.md §8).
 * Privileged credentials never appear here.
 */
export interface FirebaseConfig {
  readonly apiKey: string;
  readonly authDomain: string;
  readonly projectId: string;
  readonly storageBucket: string;
  readonly messagingSenderId: string;
  readonly appId: string;
}

/** The fully validated configuration the app runs on. */
export interface AppConfig {
  readonly appEnv: AppEnvironment;
  readonly dataSource: DataSource;
  readonly useFirebaseEmulator: boolean;
  readonly emulatorHost: string;
  /**
   * The Firebase web config. Always present and validated in firebase mode;
   * in mock mode it is `null` unless all six values happen to be set (and it
   * is never used).
   */
  readonly firebase: FirebaseConfig | null;
}
