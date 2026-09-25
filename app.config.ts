import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo configuration.
 *
 * Static app metadata (name, icons, orientation, platform settings) stays in
 * `app.json` and is received here as `config` — this file deliberately does not
 * duplicate it. Its only job is to read environment variables and expose them
 * to the running app through `extra`, where `src/services/config.ts` reads and
 * validates them.
 *
 * Expo's CLI loads `.env` into `process.env` before evaluating this file.
 * Values are read as raw strings and are NOT validated here: a config file has
 * no good way to report an error to the user. Parsing and validation happen
 * once, at app startup, in the typed config module.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: config.name ?? 'VKU Study Room Booking',
  slug: config.slug ?? 'vku-study-room-booking',
  extra: {
    ...config.extra,
    appEnv: process.env.APP_ENV,
    useFirebaseEmulator: process.env.USE_FIREBASE_EMULATOR,
    emulatorHost: process.env.EMULATOR_HOST,
    firebase: {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID,
    },
  },
});
