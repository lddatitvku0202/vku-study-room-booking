/**
 * 70/30 contention demo with real Firestore transactions (32R/33R).
 *
 *   npm run demo:contention:emulator                       emulator (seeds rooms first)
 *   npm run demo:contention -- --production [--participants 30] [--days-ahead 6] [--keep]
 *
 * N participants, each a separate Firebase client signed in anonymously. ~30% aim at
 * one shared hot slot, ~70% at their own free slot; each waits 1–1.5 s
 * (Promise + setTimeout) and then runs the app's own booking transaction. Firestore
 * decides every outcome — nothing is simulated or forced (CLAUDE.md §10, AD-16).
 * The measured split is printed; afterwards every booking the demo made is
 * cancelled by its own owner (unless --keep), releasing the slots again.
 *
 * Production creates N throwaway anonymous users and N transactions (Spark quota:
 * roughly 4 reads and 2 writes per attempt plus the cleanup). See docs/demo-script.md.
 */

import { readFileSync } from 'node:fs';

import { deleteApp, initializeApp, type FirebaseOptions } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInAnonymously } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';

import { MOCK_ROOMS } from '../src/data/rooms';
import { TIME_SLOTS } from '../src/data/time-slots';
import {
  cleanUpContentionDemo,
  runContentionDemo,
  type DemoParticipant,
} from '../src/services/firebase/contention-demo';
import { planContention, summarizeContention } from '../src/utils/contention-plan';

const EMULATOR_PROJECT_ID = 'demo-vku-study-room-booking';
const HOT_ROOM_ID = 'room-C305';
const SLOT = TIME_SLOTS[3];

function fail(message: string): never {
  console.error(`contention-demo: ${message}`);
  process.exit(1);
}

function argValue(name: string, fallback: number): number {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  const value = Number(process.argv[index + 1]);
  if (!Number.isInteger(value) || value < 1) fail(`${name} needs a positive integer`);
  return value;
}

function readEnvFile(): Record<string, string> {
  let text = '';
  try {
    text = readFileSync('.env', 'utf8');
  } catch {
    fail('no .env found — production needs the real web config (see .env.example)');
  }
  return Object.fromEntries(
    text
      .split(/\r?\n/)
      .filter((line) => /^[A-Z_]+=/.test(line))
      .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
  );
}

function productionConfig(): FirebaseOptions {
  const env = readEnvFile();
  const value = (name: string): string => {
    const v = env[name];
    if (v === undefined || v === '' || v.includes('placeholder')) {
      fail(`.env does not hold the real Firebase web config (${name})`);
    }
    return v;
  };
  const config = {
    apiKey: value('FIREBASE_API_KEY'),
    authDomain: value('FIREBASE_AUTH_DOMAIN'),
    projectId: value('FIREBASE_PROJECT_ID'),
    storageBucket: value('FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: value('FIREBASE_MESSAGING_SENDER_ID'),
    appId: value('FIREBASE_APP_ID'),
  };
  const rc: unknown = JSON.parse(readFileSync('.firebaserc', 'utf8'));
  const projects =
    typeof rc === 'object' && rc !== null && 'projects' in rc ? JSON.stringify(rc.projects) : '';
  if (!projects.includes(`"${config.projectId}"`)) {
    fail('.env project is not the .firebaserc project — refusing');
  }
  return config;
}

function campusDate(offsetDays: number): string {
  const campusNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  campusNow.setUTCDate(campusNow.getUTCDate() + offsetDays);
  return campusNow.toISOString().slice(0, 10);
}

function roomOf(roomId: string) {
  const room = MOCK_ROOMS.find((r) => r.id === roomId);
  if (room === undefined) fail(`unknown room ${roomId}`);
  return room;
}

async function main(): Promise<void> {
  const useEmulator = process.argv.includes('--emulator');
  const useProduction = process.argv.includes('--production');
  if (useEmulator === useProduction) fail('choose exactly one of --emulator or --production');
  const participantsCount = argValue('--participants', 30);
  const daysAhead = argValue('--days-ahead', 6);
  if (daysAhead > 6) fail('--days-ahead must be within the 7-day booking window (≤ 6)');
  const keep = process.argv.includes('--keep');
  if (SLOT === undefined) fail('slot definition missing');

  const options: FirebaseOptions = useEmulator
    ? { projectId: EMULATOR_PROJECT_ID, apiKey: 'demo-api-key', appId: 'demo-app-id' }
    : productionConfig();

  console.log(
    `contention-demo: ${participantsCount} participants → ${useEmulator ? 'emulator' : `production "${options.projectId}"`}`,
  );
  const apps = Array.from({ length: participantsCount }, (_, i) =>
    initializeApp(options, `demo-participant-${i}`),
  );
  const participants: DemoParticipant[] = await Promise.all(
    apps.map(async (app) => {
      const auth = getAuth(app);
      const db = getFirestore(app);
      if (useEmulator) {
        connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
        connectFirestoreEmulator(db, '127.0.0.1', 8080);
      }
      const credential = await signInAnonymously(auth);
      return { db, uid: credential.user.uid };
    }),
  );

  const date = campusDate(daysAhead);
  const plan = planContention({
    participants: participantsCount,
    hotShare: 0.3,
    date,
    slotId: SLOT.id,
    hotRoomId: HOT_ROOM_ID,
    independentRoomIds: MOCK_ROOMS.filter((r) => r.id !== HOT_ROOM_ID).map((r) => r.id),
    minDelayMs: 1000,
    maxDelayMs: 1500,
    random: Math.random,
  });
  console.log(
    `contention-demo: hot slot ${HOT_ROOM_ID} ${date} ${SLOT.label}; each participant waits 1–1.5 s, then runs runTransaction()`,
  );

  const run = await runContentionDemo(participants, plan, roomOf);
  const report = summarizeContention(plan, run.results);

  console.log('');
  console.log('  #   target       room        delay  result    latency');
  plan.forEach((attempt, i) => {
    console.log(
      `  ${String(i).padStart(2)}  ${attempt.target.padEnd(11)}  ${attempt.roomId.padEnd(10)}  ${String(attempt.delayMs).padStart(4)}ms  ${(run.results[i] ?? '').padEnd(8)}  ${run.latenciesMs[i] ?? 0}ms`,
    );
  });
  console.log('');
  console.log(
    `  attempts ${report.attempts} · successes ${report.successes} · conflicts (SLOT_TAKEN) ${report.conflicts} · errors ${report.errors}`,
  );
  console.log(
    `  hot slot: ${report.hotAttempts} attempts → ${report.hotSuccesses} winner; independent: ${report.independentSuccesses}/${report.independentAttempts} booked`,
  );
  console.log(
    `  MEASURED split: ${(report.successRate * 100).toFixed(1)}% success / ${(report.conflictRate * 100).toFixed(1)}% conflict ` +
      '(target ≈70/30 traffic; slightly above 70% success because the hot slot always has one winner)',
  );

  if (!keep) {
    const released = await cleanUpContentionDemo(participants, run);
    console.log(
      `  cleanup: ${released}/${run.booked.length} demo bookings cancelled by their owners`,
    );
  }
  await Promise.all(apps.map((app) => deleteApp(app)));

  const ok = report.hotSuccesses === 1 && report.errors === 0;
  console.log(
    ok
      ? 'contention-demo: OK — exactly one winner on the hot slot'
      : 'contention-demo: UNEXPECTED RESULT',
  );
  process.exit(ok ? 0 : 1);
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error));
});
