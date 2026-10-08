/**
 * Idempotent seed of the 120-room catalogue into Firestore (10R).
 *
 * A local developer tool (CLAUDE.md §2): not deployed, not part of the app. It
 * writes `rooms/{roomId}` from the same deterministic generator the MVP uses
 * (`src/data/rooms.ts`), so room ids are unchanged (`room-B205`, …).
 *
 * Usage:
 *   npm run seed:rooms -- --emulator        Firestore emulator (demo project)
 *   npm run seed:rooms -- --production      the real project from .firebaserc
 *   add --dry-run to report without writing
 *
 * Idempotent: every room document is written with exactly the catalogue data, so a
 * re-run creates nothing new; it reports created / updated / unchanged. Documents
 * in `rooms` that are not in the catalogue are reported and left untouched.
 *
 * How it writes: clients cannot write rooms (Security Rules), so this uses the
 * Firestore REST API with privileged credentials, which bypass rules:
 *   - emulator: the emulator's built-in "owner" token;
 *   - production: an OAuth access token from the developer's own Firebase CLI login
 *     (`firebase login`) — its refresh token is exchanged in memory for a
 *     short-lived access token, never printed or written. No service-account key
 *     is created or stored.
 */

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join } from 'node:path';

import { MOCK_ROOMS } from '../src/data/rooms';
import { COLLECTIONS, roomToDocument, type RoomDocument } from '../src/services/firebase/model';

const EMULATOR_PROJECT_ID = 'demo-vku-study-room-booking';
const EMULATOR_ORIGIN = 'http://127.0.0.1:8080';
const PRODUCTION_ORIGIN = 'https://firestore.googleapis.com';

function fail(message: string): never {
  console.error(`seed-rooms: ${message}`);
  process.exit(1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The project id in `.firebaserc` — the only production target this script accepts. */
function configuredProjectId(): string {
  const raw: unknown = JSON.parse(readFileSync('.firebaserc', 'utf8'));
  const projects = isRecord(raw) ? raw['projects'] : undefined;
  const id = isRecord(projects) ? projects['default'] : undefined;
  if (typeof id !== 'string' || id.length === 0) fail('.firebaserc has no default project');
  return id;
}

/** A short-lived access token from the developer's own Firebase CLI login. */
async function firebaseCliAccessToken(): Promise<string> {
  const storePath = join(homedir(), '.config', 'configstore', 'firebase-tools.json');
  let store: unknown;
  try {
    store = JSON.parse(readFileSync(storePath, 'utf8'));
  } catch {
    fail('no Firebase CLI login found — run `firebase login`');
  }
  const tokens = isRecord(store) ? store['tokens'] : undefined;
  const refreshToken = isRecord(tokens) ? tokens['refresh_token'] : undefined;
  if (typeof refreshToken !== 'string') fail('the Firebase CLI login has no refresh token');

  // The CLI's public OAuth client (open source), read from the installed CLI.
  const globalRoot = execSync('npm root -g', { encoding: 'utf8' }).trim();
  const api: unknown = createRequire(import.meta.url)(
    join(globalRoot, 'firebase-tools', 'lib', 'api.js'),
  );
  const clientId =
    isRecord(api) && typeof api['clientId'] === 'function' ? api['clientId']() : undefined;
  const clientSecret =
    isRecord(api) && typeof api['clientSecret'] === 'function' ? api['clientSecret']() : undefined;
  if (typeof clientId !== 'string' || typeof clientSecret !== 'string') {
    fail('could not read the Firebase CLI OAuth client from the global firebase-tools install');
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });
  const body: unknown = await response.json();
  if (!response.ok || !isRecord(body) || typeof body['access_token'] !== 'string') {
    fail(`token refresh failed (HTTP ${response.status}) — run \`firebase login --reauth\``);
  }
  return body['access_token'];
}

// ------------------------------------------------------------ REST value mapping

type FirestoreValue =
  | { readonly stringValue: string }
  | { readonly integerValue: string }
  | { readonly arrayValue: { readonly values: readonly FirestoreValue[] } };

function toFields(document: RoomDocument): Record<string, FirestoreValue> {
  return {
    name: { stringValue: document.name },
    building: { stringValue: document.building },
    floor: { integerValue: String(document.floor) },
    capacity: { integerValue: String(document.capacity) },
    equipment: {
      arrayValue: { values: document.equipment.map((item) => ({ stringValue: item })) },
    },
    image: { stringValue: document.image },
  };
}

/** JSON with object keys sorted, so documents compare equal regardless of field order. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, inner: unknown) =>
    isRecord(inner)
      ? Object.fromEntries(Object.entries(inner).sort(([a], [b]) => a.localeCompare(b)))
      : inner,
  );
}

// ------------------------------------------------------------ main

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const useEmulator = args.has('--emulator');
  const useProduction = args.has('--production');
  const dryRun = args.has('--dry-run');
  if (useEmulator === useProduction) fail('choose exactly one of --emulator or --production');

  const projectId = useEmulator ? EMULATOR_PROJECT_ID : configuredProjectId();
  const origin = useEmulator ? EMULATOR_ORIGIN : PRODUCTION_ORIGIN;
  const token = useEmulator ? 'owner' : await firebaseCliAccessToken();
  const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const documentsPath = `projects/${projectId}/databases/(default)/documents`;
  const base = `${origin}/v1/${documentsPath}`;

  console.log(
    `seed-rooms: ${MOCK_ROOMS.length} rooms → project "${projectId}" ` +
      `(${useEmulator ? 'emulator' : 'production'})${dryRun ? ' [dry run]' : ''}`,
  );

  async function listRooms(): Promise<Map<string, string>> {
    const found = new Map<string, string>();
    let pageToken = '';
    do {
      const url = `${base}/${COLLECTIONS.rooms}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`;
      const response = await fetch(url, { headers });
      const body: unknown = await response.json();
      if (!response.ok || !isRecord(body)) fail(`listing rooms failed (HTTP ${response.status})`);
      const documents = Array.isArray(body['documents']) ? body['documents'] : [];
      for (const document of documents) {
        if (isRecord(document) && typeof document['name'] === 'string') {
          const id = document['name'].split('/').pop() ?? '';
          found.set(id, canonical(document['fields']));
        }
      }
      pageToken = typeof body['nextPageToken'] === 'string' ? body['nextPageToken'] : '';
    } while (pageToken !== '');
    return found;
  }

  const existing = await listRooms();
  const catalogueIds = new Set(MOCK_ROOMS.map((room) => room.id));
  let created = 0;
  let updated = 0;
  let unchanged = 0;
  const writes: unknown[] = [];
  for (const room of MOCK_ROOMS) {
    const fields = toFields(roomToDocument(room));
    const current = existing.get(room.id);
    if (current === undefined) created += 1;
    else if (current === canonical(fields)) {
      unchanged += 1;
      continue;
    } else updated += 1;
    // `update` without a mask replaces the whole document: exactly the catalogue data.
    writes.push({ update: { name: `${documentsPath}/${COLLECTIONS.rooms}/${room.id}`, fields } });
  }

  if (!dryRun && writes.length > 0) {
    const response = await fetch(`${base}:commit`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ writes }),
    });
    if (!response.ok) fail(`commit failed (HTTP ${response.status}): ${await response.text()}`);
  }

  const after = await listRooms();
  const extras = [...after.keys()].filter((id) => !catalogueIds.has(id));
  console.log(
    `seed-rooms: created ${created}, updated ${updated}, unchanged ${unchanged}; ` +
      `rooms in Firestore now: ${after.size}` +
      (extras.length > 0 ? `; not in catalogue (left untouched): ${extras.join(', ')}` : ''),
  );
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
