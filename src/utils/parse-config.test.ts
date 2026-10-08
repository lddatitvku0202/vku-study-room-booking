import { describe, expect, it } from 'vitest';

import { ConfigError, parseAppConfig } from '@/utils/parse-config';

const REAL = {
  apiKey: 'AIza-test-key',
  authDomain: 'vku-study-room-booking.firebaseapp.com',
  projectId: 'vku-study-room-booking',
  storageBucket: 'vku-study-room-booking.firebasestorage.app',
  messagingSenderId: '991798630696',
  appId: '1:991798630696:web:abc',
};
const PLACEHOLDER = {
  apiKey: 'demo-placeholder-api-key',
  authDomain: 'demo-placeholder.firebaseapp.com',
  projectId: 'demo-placeholder',
  storageBucket: 'demo-placeholder.firebasestorage.app',
  messagingSenderId: '000000000000',
  appId: '1:000000000000:web:demo-placeholder',
};
const DEMO = { ...REAL, projectId: 'demo-vku-study-room-booking' };

function problemsOf(raw: unknown): string {
  try {
    parseAppConfig(raw);
  } catch (error) {
    if (error instanceof ConfigError) return error.message;
    throw error;
  }
  return '';
}

describe('parseAppConfig — data source', () => {
  it('defaults to mock and needs no Firebase values', () => {
    const config = parseAppConfig({});
    expect(config.dataSource).toBe('mock');
    expect(config.firebase).toBeNull();
    expect(config.useFirebaseEmulator).toBe(false);
  });

  it('mock mode accepts the .env.example placeholders unchanged', () => {
    const config = parseAppConfig({ dataSource: 'mock', firebase: PLACEHOLDER });
    expect(config.dataSource).toBe('mock');
  });

  it('mock mode ignores a partial Firebase config', () => {
    expect(parseAppConfig({ firebase: { apiKey: 'x' } }).firebase).toBeNull();
  });

  it('rejects an unknown DATA_SOURCE', () => {
    expect(problemsOf({ dataSource: 'supabase' })).toContain('DATA_SOURCE must be one of');
  });
});

describe('parseAppConfig — firebase mode', () => {
  it('accepts the real web config', () => {
    const config = parseAppConfig({ dataSource: 'firebase', firebase: REAL });
    expect(config.dataSource).toBe('firebase');
    expect(config.firebase?.projectId).toBe('vku-study-room-booking');
  });

  it('requires all six values and lists every missing one', () => {
    const message = problemsOf({ dataSource: 'firebase', firebase: { apiKey: 'x' } });
    for (const name of [
      'FIREBASE_AUTH_DOMAIN',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_STORAGE_BUCKET',
      'FIREBASE_MESSAGING_SENDER_ID',
      'FIREBASE_APP_ID',
    ]) {
      expect(message).toContain(name);
    }
  });

  it('rejects the .env.example placeholders against the cloud', () => {
    expect(problemsOf({ dataSource: 'firebase', firebase: PLACEHOLDER })).toContain(
      'still holds the .env.example placeholder',
    );
  });

  it('rejects a demo- project without the emulator', () => {
    expect(problemsOf({ dataSource: 'firebase', firebase: DEMO })).toContain(
      'emulator-only project',
    );
  });
});

describe('parseAppConfig — emulator safety', () => {
  it('allows the emulator with a demo- project', () => {
    const config = parseAppConfig({
      dataSource: 'firebase',
      useFirebaseEmulator: 'true',
      emulatorHost: '192.168.1.10',
      firebase: DEMO,
    });
    expect(config.useFirebaseEmulator).toBe(true);
    expect(config.emulatorHost).toBe('192.168.1.10');
  });

  it('refuses the emulator with the real project id', () => {
    expect(
      problemsOf({ dataSource: 'firebase', useFirebaseEmulator: 'true', firebase: REAL }),
    ).toContain('requires a "demo-" FIREBASE_PROJECT_ID');
  });

  it('refuses the emulator in a production build', () => {
    expect(
      problemsOf({
        appEnv: 'production',
        dataSource: 'firebase',
        useFirebaseEmulator: 'true',
        firebase: DEMO,
      }),
    ).toContain('not allowed when APP_ENV=production');
  });

  it('rejects a malformed emulator flag and app env', () => {
    const message = problemsOf({ appEnv: 'staging', useFirebaseEmulator: 'yes' });
    expect(message).toContain('APP_ENV must be one of');
    expect(message).toContain('USE_FIREBASE_EMULATOR must be "true" or "false"');
  });

  it('rejects a missing manifest', () => {
    expect(problemsOf(undefined)).toContain('No configuration found');
  });
});
