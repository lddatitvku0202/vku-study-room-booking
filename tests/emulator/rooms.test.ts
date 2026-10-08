import { type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MOCK_ROOMS } from '@/data/rooms';
import { fetchRoomCatalogue } from '@/services/firebase/rooms';

import {
  disposeClients,
  seedRooms,
  signedInActor,
  startRulesEnvironment,
  unauthenticatedClient,
} from './rules-env';

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await startRulesEnvironment();
  await env.clearFirestore();
  await seedRooms(env, MOCK_ROOMS);
  await env.withSecurityRulesDisabled(async (context) => {
    await context.firestore().collection('rooms').doc('room-BROKEN').set({ name: 42 });
  });
});
afterAll(async () => {
  await disposeClients();
  await env.cleanup();
});

describe('room catalogue from Firestore', () => {
  it('returns the 120 seeded rooms, identical to the catalogue and in its order', async () => {
    const { db } = await signedInActor('reader');
    const { rooms, skipped } = await fetchRoomCatalogue(db);
    expect(rooms).toHaveLength(120);
    expect(rooms).toEqual(MOCK_ROOMS);
    expect(skipped).toEqual(['room-BROKEN']);
  });

  it('is refused without a signed-in user', async () => {
    await expect(fetchRoomCatalogue(unauthenticatedClient().db)).rejects.toMatchObject({
      code: 'permission-denied',
    });
  });
});
