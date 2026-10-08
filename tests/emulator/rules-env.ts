/**
 * Rules-test environment: loads `firestore.rules` into the Firestore emulator and
 * provides fixtures. Dates are computed in campus time (UTC+07, AD-43).
 */

import { initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteApp } from 'firebase/app';

import { MOCK_ROOMS } from '@/data/rooms';
import { TIME_SLOTS } from '@/data/time-slots';
import { ensureAnonymousSession } from '@/services/firebase/auth';
import { roomToDocument } from '@/services/firebase/model';

import {
  createTestClient,
  DEMO_PROJECT_ID,
  EMULATOR_HOST,
  FIRESTORE_EMULATOR_PORT,
  type TestClient,
} from './emulator-env';

import type { Room } from '@/types/room';

export function startRulesEnvironment(): Promise<RulesTestEnvironment> {
  return initializeTestEnvironment({
    projectId: DEMO_PROJECT_ID,
    firestore: { rules: __FIRESTORE_RULES__, host: EMULATOR_HOST, port: FIRESTORE_EMULATOR_PORT },
  });
}

/** `yyyy-MM-dd` in campus time, `offsetDays` from today. */
export function campusDate(offsetDays: number): string {
  const campusNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  campusNow.setUTCDate(campusNow.getUTCDate() + offsetDays);
  return campusNow.toISOString().slice(0, 10);
}

function roomById(id: string): Room {
  const room = MOCK_ROOMS.find((r) => r.id === id);
  if (room === undefined) throw new Error(`fixture room ${id} missing`);
  return room;
}

export const ROOM_B205 = roomById('room-B205');
export const ROOM_A101 = roomById('room-A101');
export const FIRST_SLOT = TIME_SLOTS[0];
export const LAST_SLOT = TIME_SLOTS[3];

/** Seeds rooms the way the seed script does (Admin access bypasses rules). */
export async function seedRooms(env: RulesTestEnvironment, rooms: readonly Room[]): Promise<void> {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await Promise.all(
      rooms.map((room) => db.collection('rooms').doc(room.id).set(roomToDocument(room))),
    );
  });
}

/**
 * A real modular SDK client — the same code path as the app — signed in
 * anonymously on the Auth emulator (or not signed in at all).
 */
export interface Actor extends TestClient {
  readonly uid: string;
}

const created: TestClient[] = [];

export async function signedInActor(label: string): Promise<Actor> {
  const client = createTestClient(label);
  created.push(client);
  const session = await ensureAnonymousSession(client.auth);
  return { ...client, uid: session.uid };
}

export function unauthenticatedClient(): TestClient {
  const client = createTestClient('anonymous');
  created.push(client);
  return client;
}

export async function disposeClients(): Promise<void> {
  await Promise.all(created.splice(0).map((client) => deleteApp(client.app)));
}
