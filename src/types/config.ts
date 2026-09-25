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
  readonly useFirebaseEmulator: boolean;
  readonly emulatorHost: string;
  readonly firebase: FirebaseConfig;
}
