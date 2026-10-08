/**
 * Pure parsing and validation of the raw `extra` object into a typed AppConfig.
 *
 * Pure layer: no React, no Firebase, no Expo, no I/O — it takes `unknown` in and
 * returns a validated value or throws. That keeps it unit-testable with no mocks
 * and lets a configuration failure be reported once, loudly, at startup rather
 * than surfacing later as an `undefined` deep inside a Firestore call.
 *
 * Rules (AD-37, AD-42):
 * - `DATA_SOURCE` is `mock` (default) or `firebase`.
 * - In firebase mode the six Firebase web-config values are required and must not
 *   be the `.env.example` placeholders (except against the emulator).
 * - The emulator may only be used with a `demo-` project id, and never in a
 *   production build — so a test run can never touch the real project, and a
 *   release can never point at a developer's machine.
 * - In mock mode Firebase values are optional and ignored.
 */

import type { AppConfig, AppEnvironment, DataSource, FirebaseConfig } from '@/types/config';

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
const DATA_SOURCES = ['mock', 'firebase'] as const satisfies readonly DataSource[];

/** Marker used by the `.env.example` placeholder values. */
const PLACEHOLDER_MARKER = 'placeholder';
/** Emulator-only Firebase project ids start with this (Firebase convention). */
export const DEMO_PROJECT_PREFIX = 'demo-';

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

function isDataSource(value: string): value is DataSource {
  return (DATA_SOURCES as readonly string[]).includes(value);
}

/** The Firebase config if all six values are present, plus the names of missing ones. */
function readFirebaseConfig(source: Record<string, unknown>): {
  readonly config: FirebaseConfig | null;
  readonly missing: readonly string[];
} {
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
  const missing = FIREBASE_KEYS.filter((key) => found[key] === undefined).map(
    (key) => FIREBASE_ENV_NAMES[key],
  );

  if (
    apiKey === undefined ||
    authDomain === undefined ||
    projectId === undefined ||
    storageBucket === undefined ||
    messagingSenderId === undefined ||
    appId === undefined
  ) {
    return { config: null, missing };
  }
  return {
    config: { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId },
    missing,
  };
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

  const dataSourceRaw = readString(raw, 'dataSource') ?? 'mock';
  let dataSource: DataSource = 'mock';
  if (isDataSource(dataSourceRaw)) {
    dataSource = dataSourceRaw;
  } else {
    problems.push(
      `DATA_SOURCE must be one of ${DATA_SOURCES.join(' | ')} (received "${dataSourceRaw}")`,
    );
  }

  const emulatorRaw = readString(raw, 'useFirebaseEmulator') ?? 'false';
  if (emulatorRaw !== 'true' && emulatorRaw !== 'false') {
    problems.push(`USE_FIREBASE_EMULATOR must be "true" or "false" (received "${emulatorRaw}")`);
  }
  const useFirebaseEmulator = emulatorRaw === 'true';

  const emulatorHost = readString(raw, 'emulatorHost') ?? '127.0.0.1';

  const firebaseRaw = raw['firebase'];
  const { config: firebase, missing } = readFirebaseConfig(
    isRecord(firebaseRaw) ? firebaseRaw : {},
  );

  if (dataSource === 'firebase') {
    for (const name of missing) {
      problems.push(`${name} is missing or empty (required when DATA_SOURCE=firebase)`);
    }
    if (firebase !== null) {
      const isDemoProject = firebase.projectId.startsWith(DEMO_PROJECT_PREFIX);
      if (useFirebaseEmulator) {
        if (!isDemoProject) {
          problems.push(
            `USE_FIREBASE_EMULATOR=true requires a "${DEMO_PROJECT_PREFIX}" FIREBASE_PROJECT_ID ` +
              `(received "${firebase.projectId}"), so emulator runs can never reach a real project`,
          );
        }
        if (appEnv === 'production') {
          problems.push('USE_FIREBASE_EMULATOR=true is not allowed when APP_ENV=production');
        }
      } else {
        const placeholders = FIREBASE_KEYS.filter((key) =>
          firebase[key].toLowerCase().includes(PLACEHOLDER_MARKER),
        );
        for (const key of placeholders) {
          problems.push(
            `${FIREBASE_ENV_NAMES[key]} still holds the .env.example placeholder — set the real ` +
              'web config (firebase apps:sdkconfig WEB) for DATA_SOURCE=firebase',
          );
        }
        if (isDemoProject) {
          problems.push(
            `FIREBASE_PROJECT_ID "${firebase.projectId}" is an emulator-only project; ` +
              'set USE_FIREBASE_EMULATOR=true or use the real project id',
          );
        }
      }
    }
  }

  if (problems.length > 0) {
    throw new ConfigError(problems);
  }

  return {
    appEnv,
    dataSource,
    useFirebaseEmulator,
    emulatorHost,
    firebase,
  };
}
