/**
 * Pure parsing and validation of the raw `extra` object into a typed AppConfig.
 *
 * Pure layer: no React, no Firebase, no Expo, no I/O — it takes `unknown` in and
 * returns a validated value or throws. That keeps it unit-testable with no mocks
 * and lets a configuration failure be reported once, loudly, at startup rather
 * than surfacing later as an `undefined` deep inside a Firestore call.
 */

import type { AppConfig, AppEnvironment, FirebaseConfig } from '@/types/config';

/** Thrown when configuration is missing or malformed. */
export class ConfigError extends Error {
  public override readonly name = 'ConfigError';

  constructor(problems: readonly string[]) {
    super(
      [
        'Invalid application configuration.',
        '',
        ...problems.map((problem) => `  - ${problem}`),
        '',
        'Fix: copy .env.example to .env, fill in the values, then restart the dev',
        'server with a cache clear (npx expo start --clear).',
      ].join('\n'),
    );
  }
}

const APP_ENVIRONMENTS = ['development', 'production'] as const satisfies readonly AppEnvironment[];

const FIREBASE_KEYS = [
  'apiKey',
  'authDomain',
  'projectId',
  'storageBucket',
  'messagingSenderId',
  'appId',
] as const satisfies readonly (keyof FirebaseConfig)[];

/** Environment variable name that supplies each Firebase config key. */
const FIREBASE_ENV_NAMES: Readonly<Record<keyof FirebaseConfig, string>> = {
  apiKey: 'FIREBASE_API_KEY',
  authDomain: 'FIREBASE_AUTH_DOMAIN',
  projectId: 'FIREBASE_PROJECT_ID',
  storageBucket: 'FIREBASE_STORAGE_BUCKET',
  messagingSenderId: 'FIREBASE_MESSAGING_SENDER_ID',
  appId: 'FIREBASE_APP_ID',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Read a non-empty trimmed string, or `undefined` if absent/blank/not a string. */
function readString(source: Record<string, unknown>, key: string): string | undefined {
  const value = source[key];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isAppEnvironment(value: string): value is AppEnvironment {
  return (APP_ENVIRONMENTS as readonly string[]).includes(value);
}

/**
 * Build a FirebaseConfig, appending a problem per missing key.
 * Returns `undefined` when anything is missing — the caller then throws.
 */
function readFirebaseConfig(
  source: Record<string, unknown>,
  problems: string[],
): FirebaseConfig | undefined {
  const apiKey = readString(source, 'apiKey');
  const authDomain = readString(source, 'authDomain');
  const projectId = readString(source, 'projectId');
  const storageBucket = readString(source, 'storageBucket');
  const messagingSenderId = readString(source, 'messagingSenderId');
  const appId = readString(source, 'appId');

  const found: Readonly<Record<keyof FirebaseConfig, string | undefined>> = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
  for (const key of FIREBASE_KEYS) {
    if (found[key] === undefined) {
      problems.push(`${FIREBASE_ENV_NAMES[key]} is missing or empty`);
    }
  }

  if (
    apiKey === undefined ||
    authDomain === undefined ||
    projectId === undefined ||
    storageBucket === undefined ||
    messagingSenderId === undefined ||
    appId === undefined
  ) {
    return undefined;
  }

  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

/**
 * Validate the raw `extra` payload and return a typed configuration.
 *
 * Every problem found is reported together, so a developer fixes one error
 * rather than rediscovering the next one on each restart.
 *
 * @throws {ConfigError} if anything required is missing or malformed.
 */
export function parseAppConfig(raw: unknown): AppConfig {
  if (!isRecord(raw)) {
    throw new ConfigError([
      'No configuration found in the app manifest (expo.extra was missing or not an object).',
    ]);
  }

  const problems: string[] = [];

  const appEnvRaw = readString(raw, 'appEnv') ?? 'development';
  let appEnv: AppEnvironment = 'development';
  if (isAppEnvironment(appEnvRaw)) {
    appEnv = appEnvRaw;
  } else {
    problems.push(
      `APP_ENV must be one of ${APP_ENVIRONMENTS.join(' | ')} (received "${appEnvRaw}")`,
    );
  }

  const emulatorRaw = readString(raw, 'useFirebaseEmulator') ?? 'false';
  if (emulatorRaw !== 'true' && emulatorRaw !== 'false') {
    problems.push(`USE_FIREBASE_EMULATOR must be "true" or "false" (received "${emulatorRaw}")`);
  }

  const emulatorHost = readString(raw, 'emulatorHost') ?? '127.0.0.1';

  const firebaseRaw = raw['firebase'];
  const firebase = readFirebaseConfig(isRecord(firebaseRaw) ? firebaseRaw : {}, problems);

  if (problems.length > 0 || firebase === undefined) {
    throw new ConfigError(problems);
  }

  return {
    appEnv,
    useFirebaseEmulator: emulatorRaw === 'true',
    emulatorHost,
    firebase,
  };
}
