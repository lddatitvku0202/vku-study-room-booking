/**
 * Application configuration, read from the Expo manifest and validated once.
 *
 * This is the infrastructure boundary for configuration: it is the only module
 * that touches `expo-constants`. Everything else imports the validated
 * `appConfig` value, so no feature code ever reads `process.env` or reaches
 * into the manifest itself.
 *
 * Validation runs at module load — i.e. at app startup — so a missing or
 * malformed value fails immediately with an explanatory error instead of
 * surfacing later as an `undefined` inside a Firebase call.
 *
 * No Firebase SDK is imported here. Firebase is initialized lazily, only in
 * firebase mode, by `src/services/firebase/app.ts` (AD-37).
 */

import Constants from 'expo-constants';

import { parseAppConfig } from '@/utils/parse-config';

import type { AppConfig, DataSource } from '@/types/config';

/** The validated configuration this build is running on. */
export const appConfig: AppConfig = parseAppConfig(Constants.expoConfig?.extra);

/** Where server data comes from in this build (AD-37). */
export const dataSource: DataSource = appConfig.dataSource;

/** True when Firestore is the source of truth (`DATA_SOURCE=firebase`). */
export const isFirebaseMode: boolean = appConfig.dataSource === 'firebase';

/** True when the build is configured against the local Firebase emulator. */
export const isUsingEmulator: boolean = isFirebaseMode && appConfig.useFirebaseEmulator;

/** True for a development build/profile, false for production. */
export const isDevelopmentEnv: boolean = appConfig.appEnv === 'development';
