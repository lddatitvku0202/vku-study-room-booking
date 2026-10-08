import { deleteApp } from 'firebase/app';
import { afterAll, describe, expect, it } from 'vitest';

import {
  currentUid,
  ensureAnonymousSession,
  sessionErrorCodeOf,
  subscribeToSession,
  SessionError,
} from '@/services/firebase/auth';

import { createTestClient, type TestClient } from './emulator-env';

const clients: TestClient[] = [];
function client(): TestClient {
  const created = createTestClient('auth');
  clients.push(created);
  return created;
}

afterAll(async () => {
  await Promise.all(clients.map((c) => deleteApp(c.app)));
});

describe('anonymous session (Auth emulator)', () => {
  it('signs in anonymously and exposes a uid', async () => {
    const { auth } = client();
    expect(currentUid(auth)).toBeUndefined();
    const session = await ensureAnonymousSession(auth);
    expect(session.isAnonymous).toBe(true);
    expect(session.uid.length).toBeGreaterThan(10);
    expect(currentUid(auth)).toBe(session.uid);
  });

  it('reuses the signed-in user instead of creating a new one', async () => {
    const { auth } = client();
    const first = await ensureAnonymousSession(auth);
    const second = await ensureAnonymousSession(auth);
    expect(second.uid).toBe(first.uid);
  });

  it('concurrent first calls share one sign-in (one anonymous user)', async () => {
    const { auth } = client();
    const sessions = await Promise.all([
      ensureAnonymousSession(auth),
      ensureAnonymousSession(auth),
      ensureAnonymousSession(auth),
    ]);
    expect(new Set(sessions.map((s) => s.uid)).size).toBe(1);
  });

  it('two devices get two different identities', async () => {
    const a = await ensureAnonymousSession(client().auth);
    const b = await ensureAnonymousSession(client().auth);
    expect(a.uid).not.toBe(b.uid);
  });

  it('notifies subscribers of the session', async () => {
    const { auth } = client();
    const seen: (string | null)[] = [];
    const unsubscribe = subscribeToSession(auth, (session) => {
      seen.push(session?.uid ?? null);
    });
    const session = await ensureAnonymousSession(auth);
    await new Promise((resolve) => setTimeout(resolve, 100));
    unsubscribe();
    expect(seen[0]).toBeNull();
    expect(seen).toContain(session.uid);
  });

  it('maps failures to typed codes', () => {
    expect(sessionErrorCodeOf(new SessionError('NETWORK'))).toBe('NETWORK');
    expect(sessionErrorCodeOf({ code: 'auth/admin-restricted-operation' })).toBe(
      'ANONYMOUS_AUTH_DISABLED',
    );
    expect(sessionErrorCodeOf(new Error('boom'))).toBe('UNKNOWN');
  });
});
