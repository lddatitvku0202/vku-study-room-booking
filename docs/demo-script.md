# Contention demo (70/30) — how to run and how to read it

This demonstrates the project's core guarantee: **one room + one date + one slot = at most
one active booking**, decided by Firestore at commit time, under real concurrency.

## What the "70/30" means here

The course asks for a 70% success / 30% conflict scenario using `Promise` + `setTimeout`
with 1–1.5 s delays. In this project 70/30 is **traffic distribution, never a forced
outcome** (CLAUDE.md §10, decision AD-16):

- N simulated participants, each a **separate Firebase client signed in anonymously** (a
  separate user);
- ~70% aim at their **own free slot** (different rooms, same date and slot);
- ~30% aim at **one shared hot slot**;
- each waits a random **1–1.5 s** (`Promise` + `setTimeout`), then calls the **same
  `runTransaction()` booking code the app uses**.

Nothing decides an outcome except Firestore. No `Math.random()` picks winners or losers.

## Run it

Prerequisites: `npm install`; the Firebase CLI (`npm i -g firebase-tools`); **Java 21+** for
the emulator.

```bash
# Local, against the Firebase Emulator Suite (seeds the 120 rooms first)
npm run demo:contention:emulator

# Against the real project (needs the real web config in .env — see .env.example)
npm run demo:contention -- --production --participants 30 --days-ahead 6
```

Options: `--participants N` (default 30), `--days-ahead D` (0–6, default 6), `--keep` (do not
cancel the demo's bookings afterwards). By default every booking the demo made is cancelled
by its own owner at the end, so the slots are free again and the demo can be re-run.

The production run creates N throwaway anonymous users and about 4 reads + 2 writes per
attempt (plus the cleanup). Free quota applies within Firebase Spark plan limits.

## Expected output

A table with one row per participant (target, room, delay, result, latency), then:

```
attempts 30 · successes 22 · conflicts (SLOT_TAKEN) 8 · errors 0
hot slot: 9 attempts → 1 winner; independent: 21/21 booked
MEASURED split: 73.3% success / 26.7% conflict
cleanup: 22/22 demo bookings cancelled by their owners
contention-demo: OK — exactly one winner on the hot slot
```

Recorded on 2026-10-08 against the real project `vku-study-room-booking` (30 participants,
hot slot `room-C305`, 15:00–17:00): exactly the numbers above. The winner was not the first
participant to start — whichever transaction Firestore committed first won.

## Why the success rate is slightly above 70%, not exactly 70%

With N = 30, `round(30 × 0.3) = 9` participants target the hot slot and 21 target free
slots. All 21 independent attempts succeed (their slots are free), and the hot slot has
**exactly one** winner, so successes = 21 + 1 = 22 → 73.3%, conflicts = 9 − 1 = 8 → 26.7%.
The split approximates 70/30 because it is **measured**, not forced; the invariant that is
guaranteed is "exactly one winner on the hot slot", not the percentage.

## Where the guarantee comes from

1. **Deterministic lock:** `slotLocks/{roomId}_{date}_{slotId}`.
2. **Client transaction:** `runTransaction()` reads the lock and, if it is free, writes the
   booking **and** the lock in one commit. If another participant commits first, Firestore
   retries our transaction with fresh reads, which then sees the lock → `SLOT_TAKEN`.
3. **Security Rules:** a booking without its lock (or a lock without its booking), a forged
   user id, or overwriting an existing lock is refused server-side.

The same behaviour is covered by automated emulator tests (`npm run test:rules`): N = 20
parallel users on one slot give exactly 1 success and 19 `SLOT_TAKEN`, and three 30-user
demo runs each give exactly one hot-slot winner.

## The local MVP simulator is different

The Emergency MVP's in-app simulator (`DATA_SOURCE=mock`) picks conflicts at random. It is
labelled in the app as a local simulation, exists only in mock mode, and is never used in
firebase mode or production builds (AD-38).
