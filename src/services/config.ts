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
 * No Firebase SDK is imported here. This module only supplies the values that
 * the Firebase phase (TASK 06) will consume.
 */

import Constants from 'expo-constants';

import { parseAppConfig } from '@/utils/parse-config';

import type { AppConfig } from '@/types/config';

/** The validated configuration this build is running on. */
export const appConfig: AppConfig = parseAppConfig(Constants.expoConfig?.extra);

/** True when the build is configured against the local Firebase emulator. */
export const isUsingEmulator: boolean = appConfig.useFirebaseEmulator;

/** True for a development build/profile, false for production. */
export const isDevelopmentEnv: boolean = appConfig.appEnv === 'development';
