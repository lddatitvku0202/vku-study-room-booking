# Progress — VKU Study Room Booking

Single source of truth for **where the project actually is**. Updated as part of every
task's commit. Never report progress that has not been verified.

---

## Current state

**Status:** READY FOR REVIEW
**Current Task:** TASK 01 — Expo + TypeScript scaffold
**Completed Tasks:** TASK 00 (planning baseline), TASK 00B (architecture lock-in)
**Next Task:** TASK 02 — Strict TypeScript, lint, format, aliases
**Known Issues:** one naming discrepancy to reconcile in TASK 03 — see Task 01 entry.

**Repository state:** planning documents plus an Expo SDK 57 + TypeScript scaffold.
Dependencies installed: `expo`, `expo-status-bar`, `react`, `react-native`,
`react-native-safe-area-context`, `typescript`, `@types/react` — nothing else.
No Firebase, navigation, state, query, notification, QR or business code exists.
Git repository on `main`; planning docs committed as `bf07557`; the TASK 01 scaffold is
**uncommitted and unpushed**, awaiting user review. Nothing may be pushed without
explicit user approval.

**Blocked on:** nothing.

---

## Task log template

Every completed task appends an entry in exactly this form. Do not abbreviate the
sections; an empty section is written as `none`.

```markdown
## Task XX

Status:
Implemented:
Verification:
Commit:
Known issues:
Next task:
```

Field rules:
- **Status** — `DONE`, `PARTIAL`, or `BLOCKED`. `PARTIAL` and `BLOCKED` must state why.
- **Implemented** — what was actually built, with file paths. Not what was intended.
- **Verification** — the command or check that was **run**, and its result. If a check was
  skipped, say so. "It compiles" alone is not verification.
- **Commit** — the actual commit message and short SHA.
- **Known issues** — defects, deferred work, accepted limitations. `none` only if true.
- **Next task** — the next task id from `PLAN.md`.

---

## Task log

## Task 00

Status: DONE
Implemented: Planning baseline — `CLAUDE.md` (permanent rules), `PLAN.md` (phase roadmap),
`docs/project-brief.md` (full context), `docs/progress.md` (state + decision register).
No application code.
Verification: four documents cross-checked against the requirements; eight architectural
conflicts identified and documented as open questions OQ-1…OQ-8 rather than silently decided.
Commit: not committed — user directed no commit at this stage.
Known issues: the baseline assumed a Cloud Functions backend, which the user later rejected
in TASK 00B. Superseded by TASK 00B.
Next task: TASK 00B

## Task 00B

Status: READY FOR REVIEW
Implemented: Architecture lock-in across all four planning documents. Cloud Functions,
the Blaze plan and the `functions/` workspace removed entirely from the architecture and
the roadmap. Booking authority moved to a **client `runTransaction()`** writing
`bookings/{bookingId}` and `slotLocks/{slotKey}` atomically, with Firestore Security
Rules (`getAfter()` coupling) as the enforcement boundary. Invariants rewritten to I1–I9.
`PLAN.md` re-sequenced to TASK 00…48 with Phase 10 rebuilt around the client transaction
and a new TASK 19 (derived room status). All eight open questions resolved.
No application code, no dependencies installed.
Verification: repository-wide grep for `Cloud Function`, `Blaze`, `functions/` returns only
explicitly-marked historical notes; `PLAN.md` dependency audit confirms no task depends on
server-side compute; the four documents cross-checked and describe one architecture.
Commit: not committed — user directed no commit.
Known issues: none blocking. Six accepted limitations recorded in
`docs/project-brief.md` §Accepted limitations.
Next task: TASK 01

## Task 01

Status: READY FOR REVIEW — verification passed, awaiting user commit.
Implemented: Expo SDK 57 + React Native 0.86 + React 19 + TypeScript 6 scaffold at the
repository root (no nested project directory), from the `blank-typescript` template —
**not** the default `create-expo-app` template, which ships `expo-router` and would
conflict with the React Navigation decision in TASK 16.
Files: `package.json` (named `vku-study-room-booking`, `typecheck` script added),
`app.json` (name/slug set to the project), `tsconfig.json` (`strict: true` via
`expo/tsconfig.base`), `index.ts`, `App.tsx` (placeholder root screen, presentational
only), `.gitignore` (extended for `.env`, `.env.*` with a `!.env.example` negation,
`coverage/`, `*.log`, and Firebase service-account/credential patterns per CLAUDE.md §8),
`.env.example` (no values yet), `README.md`, `assets/`, and an empty `src/` skeleton
(`components`, `screens`, `navigation`, `store`, `services`, `hooks`, `types`, `data`,
`utils`, `providers`) held by `.gitkeep`.
The template's own `CLAUDE.md`, `AGENTS.md`, `.claude/settings.json` and Expo `LICENSE`
were deliberately not copied; the project planning documents were never modified.
Verification: `npm install` → 467 packages, no install errors. `npm run typecheck`
(`tsc --noEmit`) → exit 0, zero errors. `npx expo start` → Metro reported
`packager-status:running`; Android and iOS bundles both returned HTTP 200
(`Android Bundled 22618ms index.ts (738 modules)`, `iOS Bundled 14096ms index.ts
(737 modules)`) with no errors, and the placeholder screen's title string is present in
the compiled bundle. `git check-ignore` / `git add -n` confirm `.env` is refused and
`.env.example` is trackable. Greps confirm no `any`, no `@ts-ignore`, no nested
`package.json`, and none of the ten deferred packages installed.
Not verified: on-device rendering in Expo Go — no physical device or emulator was
available in this environment. Bundling for both platforms is the closest proxy that was
actually run; the user should confirm on a device.
Commit: not committed — user directed no commit; they will review and commit.
Known issues: the `src/` folder list specified for TASK 01 (`store`, `types`, `data`,
`utils`, `providers`, `screens`) differs from the layer list in CLAUDE.md §3 and PLAN.md
TASK 03 (`app`, `features`, `domain`, `lib`, `theme`). Both were left as-is rather than
silently reconciled; TASK 03 owns the final architecture and must resolve the naming.
Next task: TASK 02

---

## Resolved open questions

All open questions from TASK 00 are closed by the user's decisions in TASK 00B.

| # | Question | Resolution | Decision |
|---|---|---|---|
| OQ-1 | Firestore listeners vs TanStack Query ownership | **RESOLVED** — `onSnapshot` → `setQueryData`. TanStack Query is the single server-state owner; no parallel Zustand availability cache. | AD-10 |
| OQ-2 | AsyncStorage cache vs availability freshness | **RESOLVED** — persist `rooms` and `profile` only. `slotLocks`, availability and `bookings` are never persisted. AsyncStorage never decides availability or booking success; server state wins on reconnect. | AD-06, AD-22 |
| OQ-3 | Availability representation / deterministic key | **RESOLVED** — dedicated `slotLocks/{roomId_date_slotId}` collection. Slot-map-per-room-day and booking-as-lock both rejected. | AD-21 |
| OQ-4 | Meaning of "70/30" | **RESOLVED** — traffic/scenario distribution with `Promise` + `setTimeout` pacing at 1–1.5 s. Real transactions only; fabricated outcomes forbidden. | AD-16 |
| OQ-5 | QR scope | **RESOLVED** — display-only pass, payload `bookingId \| roomName \| date \| slotLabel`. No scanner dependency, no check-in backend. | AD-24 |
| OQ-5b | Notification id storage | **RESOLVED** — Zustand `bookingId → notificationId` map persisted to AsyncStorage. Device-local limitation documented, not hidden. | AD-23 |
| OQ-6 | Cloud Functions / Blaze requirement | **RESOLVED** — Cloud Functions removed from the project. Firebase Spark plan, no billing. Client transaction is the booking authority. | AD-02, AD-25 |
| OQ-7 | Expo Go vs development build | **RESOLVED** — Expo Go for early development and core feature testing; a development build later only where native behaviour requires it. Not required in TASK 01. | AD-26 |
| OQ-8 | Search strategy at 120+ rooms | **RESOLVED** — in-memory search/filter with 300 ms debounce and `useMemo`, by design. No server-side search, Algolia or Elasticsearch. | AD-13 |

---

## Architectural decisions

Decisions that future sessions **must not silently change**. To revisit one, raise it with
the user, record the outcome here with the superseding decision, and update `CLAUDE.md`.

### Backend and platform

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-01 | Firestore is the single source of truth for `rooms`, `bookings`, `slotLocks`, `users`. | Multi-user correctness requires one authority. | Fixed |
| AD-02 | **No Cloud Functions.** Booking authority is a **client `runTransaction()`**. | Student mini-project; must deploy without enabling billing. Firestore transactions are sufficient for atomic booking at this scope. | Fixed (TASK 00B) |
| AD-25 | **Firebase Spark plan, no billing.** No feature requiring Blaze may be introduced. Docs state "Free quota applies within Firebase Spark plan limits." | Cost constraint of the project; Spark is not unlimited and quota must be budgeted. | Fixed (TASK 00B) |
| AD-27 | Only Firebase Auth, Firestore and Security Rules are used at runtime. The seed script is a local developer tool, not a backend. | Keeps the deployable surface to client + rules + indexes. | Fixed (TASK 00B) |

### Booking concurrency

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-03 | Booking and slot lock are written in **one transaction**, never as two writes, never lock-then-booking or booking-then-lock. | Any split creates a window where the two disagree. | Fixed |
| AD-21 | Availability lock is `slotLocks/{roomId}_{date}_{slotId}`. | Trivial uniqueness check, trivial release on cancel, history kept separate from availability, no room-day hotspot. | **Fixed (TASK 00B)** — was open |
| AD-28 | Rejected: slot-map-per-room-day, and booking-document-as-lock. | Hotspot contention; and mixing history with availability. | Fixed (TASK 00B) |
| AD-07 | **No optimistic UI for booking writes.** | The client cannot know the outcome of a contended transaction. | Fixed |
| AD-08 | Idempotency via a **stable client-generated `bookingId`** reused across retries; a lock with a matching `bookingId` is success, not conflict. | Retries and double-taps must not create two bookings, and there is no server to deduplicate. | Fixed (revised TASK 00B) |
| AD-09 | Conflicts surface as a typed `SLOT_TAKEN` and trigger a refetch. | Honest failure beats a silent retry into another slot. | Fixed |
| AD-17 | **No offline booking queue.** Reads may be cached; writes require connectivity. | A queued write replays against changed lock state and cannot preserve I1. | Fixed |

### Security

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-14 | Security Rules are deny-by-default, mandatory, and tested against the emulator. `allow read, write: if true` is prohibited permanently. | With no trusted compute, rules are the only server-side enforcement. | Fixed (elevated in TASK 00B) |
| AD-29 | Rules enforce the transaction pattern via `getAfter()` coupling: a lock is invalid without its booking, a booking invalid without its lock; `userId == request.auth.uid` always. | Prevents a hostile client from forging a lock or a booking independently. | Fixed (TASK 00B) |
| AD-30 | Honest scope: rules cannot distinguish a transaction from a batch. Uniqueness comes from `create` semantics + denied update on an active lock; lost-update protection comes from the transaction read set. | The guarantee must be stated accurately, not overclaimed. | Fixed (TASK 00B) |

### State ownership

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-04 | **TanStack Query is the only cache for server state** (rooms, bookings, slot locks, availability, profile). | Two server-state stores guarantee divergence. | Fixed |
| AD-05 | **Zustand holds client state only** — filters, UI, session info, draft ids, notification id map, demo mode. Never a Firestore entity. Selectors always, never whole-store subscriptions. | Prevents stale server data being treated as truth, and prevents needless re-renders. | Fixed |
| AD-06 | **AsyncStorage is client persistence/cache only** — never a source of truth, never decides availability or booking success. Server state wins after reconnect. | Persisted availability would invite guaranteed conflicts. | Fixed |
| AD-22 | Query-cache persistence is limited to `rooms` and `profile`; `slotLocks`, availability and `bookings` are excluded. | A stale "free" slot after a cold start is worse than a slower cold start. | **Fixed (TASK 00B)** — was open |

### Realtime

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-10 | `onSnapshot()` → TanStack Query cache → UI, behind an abstraction such as `useRoomAvailability()`. No parallel Zustand availability cache. | One server-state owner; push-fed cache with minimum latency. | **Fixed (TASK 00B)** — was open |
| AD-11 | **Realtime = freshness. Transaction = correctness.** Brief staleness is accepted by design. | A stale grid can only cause a clean conflict, never a double booking. | Fixed |
| AD-31 | Listeners are scoped, reference-counted, unsubscribed on unmount/blur, never duplicated, never on an unbounded collection or per row. | Memory leaks and Spark quota burn. | Fixed |

### Demo and features

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-16 | **70/30 is traffic/scenario distribution**, paced with `Promise` + `setTimeout` at 1–1.5 s. All outcomes come from real transactions; results are measured, never fabricated or forced. | A faked ratio demonstrates nothing about concurrency. | **Fixed (TASK 00B)** — clarified |
| AD-24 | **QR is display-only**, payload `bookingId \| roomName \| date \| slotLabel`. No scanner dependency, no check-in backend. | Scope control; the approved stack cannot scan. Reopen only if the lecturer changes the requirement. | **Fixed (TASK 00B)** — was open |
| AD-23 | Notification ids live in Zustand (`bookingId → notificationId`), persisted to AsyncStorage; cross-device cleanup limitation documented. | Device-local ids are meaningless on another device, and there is no server to schedule from. | **Fixed (TASK 00B)** — was open |
| AD-26 | **Expo Go is valid** for early development; a development build is introduced later only where native behaviour requires it. Not required in TASK 01. | Avoids premature native complexity. | **Fixed (TASK 00B)** — was open |

### Performance and data

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-12 | Lists over ~30 items use `FlatList` with memoized rows, stable `keyExtractor` and `getItemLayout`. | The 120+ room requirement is a render-churn problem. | Fixed |
| AD-13 | **Search/filter is in-memory**: Firestore → TanStack Query → 120+ rooms → 300 ms debounce → `useMemo` → `FlatList`. No server-side search, Algolia or Elasticsearch. | At 120 documents the bottleneck is re-render churn, not I/O. | **Fixed (TASK 00B)** — was open |
| AD-32 | **Room status is derived**, never stored. "Occupied" = a confirmed booking covers now; "Available Now" = none does. Booking-based availability, not sensor occupancy. | A stored flag goes stale the moment a lock changes. | Fixed (TASK 00B) |
| AD-15 | Pure domain logic (`buildSlotKey`, `decideBookingOutcome`, `deriveRoomStatus`) is framework-free and shared between app and tests. | The slot key must have exactly one definition. | Fixed |
| AD-20 | Single campus timezone; dates as `yyyy-MM-dd`; slots from a shared definition. | Avoids an entire class of off-by-one-day booking bugs. | Fixed |

### Process

| # | Decision | Rationale | Status |
|---|---|---|---|
| AD-18 | Separate dev and production Firebase projects, both on Spark; local work uses the Emulator Suite where appropriate. | Seed and load tests must never touch production. | Fixed (revised TASK 00B) |
| AD-19 | **Three deployables:** client, Security Rules, Firestore indexes. Deploy rules and indexes **before** the client. | They can be out of step; a rules change is a security change. | Fixed (revised TASK 00B) |

### Superseded decisions

Removed from the architecture in TASK 00B. Listed only so a future session recognises them
as obsolete if it encounters them in old notes.

| Superseded | Was | Replaced by |
|---|---|---|
| ~~AD-02 (original)~~ | Booking writes happen only inside a **Cloud Function** transaction. | AD-02 — client `runTransaction()`. |
| ~~AD-03 (original)~~ | Clients may **never write** bookings or availability. | AD-03 + AD-29 — clients write, but only in the coupled transaction shape that rules verify. |
| ~~AD-01 addendum~~ | Cloud Functions are the only privileged compute and the sole writer. | AD-27 — no backend runtime exists. |
| ~~Blaze plan requirement~~ | Deployment requires a billing-enabled project. | AD-25 — Spark plan, no billing. |
| ~~`functions/` workspace~~ | A TypeScript Cloud Functions workspace with Admin SDK. | Removed; no equivalent exists. |
| ~~Cloud Functions deployable~~ | A fourth deployable alongside client, rules and indexes. | AD-19 — three deployables. |

---

## Accepted limitations

Recorded in full in `docs/project-brief.md` §Accepted limitations:

1. Notification ids are device-local; cross-device reminder cleanup is deferred to next open.
2. No offline booking or cancellation — writes require connectivity.
3. No QR scanning or check-in; the pass is display-only.
4. Per-user booking quotas are not enforceable in rules without a counter document; out of scope.
5. Security Rules carry the full enforcement burden — anything inexpressible in rules
   cannot be enforced at all.
6. Spark plan quota limits apply and are budgeted in TASK 27, not assumed away.

---

## Performance baselines

Recorded in TASK 20 and re-measured in TASK 45. Each entry names the device, OS, build
type and dataset size — numbers without that context are not comparable.

_(No measurements yet.)_

---

## Verification history

Results of the concurrency suite (TASK 44), rules tests (TASK 09 / 30 / 35 / 46), the
Spark read-budget estimate (TASK 27), and CI runs.

_(No runs yet.)_
