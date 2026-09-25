# Progress — VKU Study Room Booking

Single source of truth for **where the project actually is**. Updated as part of every
task's commit. Never report progress that has not been verified.

---

## Emergency Submission MVP (active track)

**The production Firebase track is PAUSED** for the submission deadline. The MVP is a
temporary implementation that runs on local mock data. The production architecture, the
roadmap in `PLAN.md`, and the decision register below are **unchanged and still
authoritative**; nothing here overrides them. TASK 06 (Firebase wiring) was rolled back
before commit and is not in the repository.

MVP rules: no Firebase, no network, no API. Mock data is labelled as mock and is never
presented as server data. Code still follows the locked architecture (`screens → hooks →
services → types/data/utils`), so production can replace the mock repository without
touching the screen.

## MVP-01

Status: READY FOR REVIEW
Implemented:
- **120 mock rooms** — `src/data/rooms.ts`: a deterministic generator (no `Math.random`),
  4 buildings × 5 floors × 6 rooms = A 30 / B 30 / C 30 / V 30. Ids `room-<code>` (e.g.
  `room-B205`), unique names ("Study Room A101", "Computer Lab V203"), capacity 2–20,
  valid equipment in 10 distinct combinations, every V room a computer lab with a
  High-spec PC, placeholder images via `picsum.photos` seeded by room code. Uses the
  existing `Room` type; no dataset duplicated.
- **Room repository** — `src/services/room-repository.ts`: `fetchRooms()` returns the
  mock catalogue. No Firebase, no network, no fake latency.
- **TanStack Query** — `@tanstack/react-query@^5.103.2` added (PLAN.md TASK 11/13 put room
  reads in the server-state layer). `src/providers/QueryProvider.tsx` (one client, created
  once), `src/hooks/query-keys.ts` (typed factory, `roomKeys.all` = `['rooms']`),
  `src/hooks/use-rooms.ts` (`useQuery` over the repository). Rooms are never copied into
  client state.
- **Base UI primitives** (TASK 05B was pending) — `src/components/ui/`: `AppText`,
  `AppButton`, `Card`, `Badge`, `AppInput`, `Screen`, `EmptyState`, `Skeleton`. All
  values come from `src/data/theme.ts`; no second theme, no hard-coded colours. `AppButton`
  and `AppInput` meet the 44pt touch target. `Skeleton` is static (motion is TASK 40).
- **SafeAreaProvider** at the application root (`App.tsx`); `Screen` applies insets via
  `SafeAreaView`. No navigation.
- **`RoomCard`** — `src/components/RoomCard.tsx`: `React.memo`, fixed height
  (`ROOM_CARD_HEIGHT` 128 + 16 gap = `ROOM_ROW_HEIGHT` 144), every text line clamped to one
  line so the card cannot grow. Shows image, name, building, floor, capacity, equipment,
  and an Available/Occupied badge.
- **Mock status** — `RoomStatus` type added to `src/types/room.ts` (the `Room` type itself
  still has **no** status field, per CLAUDE.md §7); `src/utils/mock-room-status.ts` is a pure,
  deterministic placeholder (80 available / 40 occupied), explicitly not real availability.
  Computed once per dataset in a `useMemo` map, not inside `renderItem`.
- **`BrowseRoomsScreen`** — `src/screens/BrowseRoomsScreen.tsx`: title, room count, a
  read-only search placeholder, building-chip filter placeholder, then the feed as a
  `FlatList` with module-scope `keyExtractor` and `getItemLayout`,
  `initialNumToRender={10}`, `maxToRenderPerBatch={10}`, `windowSize={7}`,
  `removeClippedSubviews`, and a memoized `renderItem`. The header sits **above** the list
  rather than in `ListHeaderComponent`, so row N is exactly at N × 144. Loading shows
  skeleton rows; errors show a retryable `EmptyState`.
- `App.tsx` keeps the side-effect import of `@/services/config`, so TASK 04's
  fail-loudly `.env` validation still runs at startup.
Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0)
  npm run format:check → PASS (exit 0)
  Dataset (real generator run in Node) → 15/15 checks PASS: 120 rooms; A/B/C/V = 30 each;
    120 unique ids; 120 unique names; capacity 2–20 (8 distinct); equipment valid, no
    duplicates, all 4 types present; all V rooms have a High-spec PC; floors 1–5; https
    images; output identical across loads; mock status deterministic with both values
  Structure → FlatList used (no ScrollView anywhere in src/); getItemLayout, keyExtractor
    and all four required tuning props present; RoomCard wrapped in React.memo
  No `any` / `@ts-ignore` / `@ts-nocheck`; no Firebase import; no hex colour outside theme
  Metro bundle → PASS — android and ios HTTP 200 (813 modules); screen, TanStack Query and
    SafeAreaProvider present; zero `@firebase/` code in the bundle
Known issues:
- **On-device launch not verified** — no device or simulator in this environment. Bundling
  both platforms is the proxy that was run; confirm with `npx expo start` + Expo Go.
- Room images are remote (`picsum.photos`) and need internet; offline, each card shows its
  grey placeholder instead.
- Fixed-height cards clamp text to one line. At very large accessibility font sizes, text is
  truncated rather than wrapped — a deliberate trade-off for a predictable `getItemLayout`.
- Found and fixed during verification: the first generator gave **every** room AC (the
  equipment index was always odd, so only half the combinations were ever chosen). Fixed by
  indexing on `unit + floor`; AC is now in 90 of 120 rooms.
- Search and filters are visual placeholders only (MVP-02).
Commit: `feat(mvp): build optimized 120-room discovery`
Next: MVP-02

---

## Current state

**Status:** READY FOR REVIEW
**Current Task:** TASK 05 — Design tokens
**Completed Tasks:** TASK 00 (planning baseline), TASK 00B (architecture lock-in),
TASK 01 (Expo scaffold, `7b9f4f4`), TASK 02 (strict TS + lint baseline, `3fef414`),
TASK 03 (architecture + domain types, `092cdf4`), TASK 04 (environment config, **not yet
committed**)
**Next Task:** TASK 05B — Base UI primitives
**Known Issues:** none. `.env` currently holds **placeholder** Firebase values so the app
boots; TASK 06 replaces them with the real web config.

**Repository state:** planning documents, an Expo SDK 57 + TypeScript scaffold with the
code-quality baseline, the domain type layer, and typed runtime configuration. Runtime
dependencies: `expo`, `expo-constants`, `expo-status-bar`, `react`, `react-native`,
`react-native-safe-area-context`. Dev dependencies: `typescript`, `@types/react`,
`eslint`, `eslint-config-expo`, `prettier`.
No Firebase SDK, navigation, state, query, notification, QR or business logic exists —
the only code is types, static slot data, config parsing, and the placeholder root screen.
Git repository on `main`; planning `bf07557`, scaffold `7b9f4f4`, tooling `3fef414`,
types `092cdf4`; the TASK 04 changes are **uncommitted and unpushed**, awaiting user
review. Nothing may be pushed without explicit user approval.

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

## Task 02

Status: READY FOR REVIEW — verification passed, awaiting user commit.
Implemented: code-quality baseline making the CLAUDE.md §11 TypeScript rules
mechanically enforced instead of conventional. No domain model, no architecture change.
- `tsconfig.json`: added the four strict-family flags required by CLAUDE.md §11
  (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`,
  `noFallthroughCasesInSwitch`) on top of `strict: true`, plus the `@/*` → `./src/*`
  path alias. `baseUrl` was deliberately **not** used — TypeScript 6 errors on it
  (TS5101, deprecated); `paths` resolves relative to the config file instead.
- ESLint 9 flat config via `npx expo lint` → `eslint.config.js` extending
  `eslint-config-expo/flat`, which already bundles `@typescript-eslint`, `import`,
  `react` and `react-hooks`, so no extra plugins were installed. Rule overrides:
  `no-explicit-any` error, `ban-ts-comment` error (`@ts-ignore`/`@ts-nocheck` banned,
  `@ts-expect-error` allowed only with a description), `no-unused-vars` error
  (`_` prefix opts out), `react-hooks/rules-of-hooks` and `exhaustive-deps` errors,
  `import/order` with enforced grouping/alphabetization, `import/no-duplicates`.
- Prettier added with `.prettierrc` and `.prettierignore`. Markdown is ignored so the
  hand-formatted planning documents are never reflowed, and `tsconfig.json` is ignored
  because the Expo CLI rewrites its formatting on every start.
- `.gitattributes` added (`* text=auto eol=lf`) so `prettier --check` behaves identically
  on Windows, macOS and CI rather than passing locally and failing elsewhere.
- Scripts: `typecheck`, `lint`, `lint:fix`, `format`, `format:check`. The `lint` script
  is `eslint .` rather than `expo lint`, because `expo lint` targets `src/` and currently
  fails ("all files matching the glob are ignored") while `src/` holds only `.gitkeep`.
- `App.tsx`: import order corrected by `eslint --fix` (type import moved into its own
  group). This is the only source change and it adds no logic.
Verification:
  npm run typecheck   → PASS (exit 0)
  npm run lint        → PASS (exit 0)
  npm run format:check → PASS (exit 0)
  tsc --showConfig    → strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes,
                        noImplicitOverride, noFallthroughCasesInSwitch all true
Negative test (temporary probe file, deleted afterwards) confirmed all four rule classes
are errors, not warnings: unused imports, `@ts-ignore`, `any`, and a missing hook
dependency — 5 errors, exit 1.
Alias test (temporary probe files, deleted afterwards): `@/…` resolved in TypeScript
(`tsc --noEmit` exit 0) **and** through Metro — an Android bundle returned HTTP 200 with
the aliased module's value present in the compiled output.
Commit: not committed — user directed no commit.
Known issues: none. The TASK 03 folder-naming discrepancy from Task 01 remains open and
is still owned by TASK 03.
Next task: TASK 03

## Task 03

Status: READY FOR REVIEW — verification passed, awaiting user commit.
Implemented:
- **Final architecture selected and locked** (AD-33). The flat by-kind `src/` tree is now
  the single architecture: `components`, `screens`, `navigation`, `store`, `services`,
  `hooks`, `types`, `data`, `utils`, `providers`. The competing
  `app/features/domain/lib/theme` proposal was rejected and removed from every planning
  document, so no two architectures coexist.
- **Domain types**, one canonical definition each, all Firebase-free:
  `src/types/room.ts` (`Building`, `Equipment`, `Room`), `src/types/slot.ts` (`TimeSlot`),
  `src/types/booking.ts` (`BookingStatus`, `Booking`, `SlotLock`),
  `src/types/filters.ts` (`RoomFilters`), `src/types/session.ts` (`UserSession`).
- **Fixed time slots** in `src/data/time-slots.ts`: exactly four —
  07:30-09:30, 09:30-11:30, 13:00-15:00, 15:00-17:00 — declared
  `as const satisfies readonly TimeSlot[]`, with `SlotId` derived from the definition so
  an arbitrary user-entered time is not representable.
- Server-owned entities (`Room`, `Booking`, `SlotLock`, `TimeSlot`) are fully `readonly`;
  they are snapshots the client renders, never mutates.
- Planning documents reconciled: CLAUDE.md §3 rewritten with the folder tree and the
  layer→folder mapping, PLAN.md TASK 03 rewritten, project-brief.md gained a
  "Source layout (final)" section with the type inventory.
Verification:
  npm run typecheck → PASS (exit 0)
  npm run lint      → PASS (exit 0)
Positive type probe (temporary, deleted): every type composes, `@/…` imports resolve, and
a filter clears with an explicit `undefined`.
Negative type probe (temporary, deleted): 7 expected compile errors — invalid building,
invalid equipment, invalid slot id, invalid status, `TIME_SLOTS.length` proven to be
exactly `4` (`Type '4' is not assignable to type '5'`), and `readonly` blocking mutation
of both a `Room` field and a `TIME_SLOTS` entry.
Grep confirms zero React/Firebase imports under `src/types` and `src/data`, and no
duplicate definition of any domain type.
Commit: not committed — user directed no commit.
Known issues: none.
Deviations from the earlier PLAN text, both deliberate and recorded:
1. `buildSlotKey()` was **not** created here. This task is types-only per instruction, so
   PLAN.md TASK 07 now explicitly owns creating it in `src/utils/`. It had to be rehomed
   rather than dropped, since TASK 25 and TASK 29 depend on it.
2. Ids are plain `string`, not branded types. The old PLAN text required branding; the
   ceremony is not justified at this scope, and PLAN.md TASK 03 now says so.
Next task: TASK 04

## Task 04

Status: READY FOR REVIEW — verification passed, awaiting user commit.
Implemented (configuration only — no feature code):
- `app.config.ts`: dynamic Expo config that receives `app.json` as `config` and adds
  `extra`. Static metadata stays in `app.json` and is **not** duplicated; this file only
  reads environment variables and exposes them to the app. Typed with `ExpoConfig` /
  `ConfigContext`.
- `.env.example`: declares variable **names** only — `APP_ENV`, `USE_FIREBASE_EMULATOR`,
  `EMULATOR_HOST`, and the six `FIREBASE_*` web-config keys — with documentation of why
  the Firebase web config is public and why privileged credentials never appear.
  No real values committed.
- `src/types/config.ts`: `AppEnvironment`, `FirebaseConfig`, `AppConfig` — Firebase-SDK-free.
- `src/utils/parse-config.ts`: pure `parseAppConfig(raw: unknown): AppConfig` plus a
  `ConfigError` that reports **every** problem at once with a fix hint. No React, Firebase,
  Expo or I/O, so it is unit-testable with no mocks.
- `src/services/config.ts`: the infrastructure boundary — the only module that touches
  `expo-constants`. Validates at module load (app startup) and exports `appConfig`,
  `isUsingEmulator`, `isDevelopmentEnv`. **No Firebase SDK is imported.**
- `App.tsx`: imports the config so validation actually runs at startup, and displays the
  resolved env/emulator flag. No feature logic added.
- `README.md`: documented that `.env` is required and that startup fails loudly without it.
- Dependency added: `expo-constants@~57.0.19` — required to read `extra` at runtime, which
  PLAN.md TASK 04 mandates. No other package added.
Verification:
  npm run typecheck                 → PASS (exit 0)
  npm run lint                      → PASS (exit 0)
  npm run format:check              → PASS (exit 0)
  npx expo config --type public     → PASS — resolves name/slug and injects the full
                                      `extra` payload from `.env`
  Metro bundle (android)            → PASS — HTTP 200, `Android Bundled 740 modules`,
                                      log confirms `env: load .env`
Validator executed directly against the real manifest (transpiled to a scratch dir,
deleted afterwards), four cases:
  1. complete config      → parsed; `useFirebaseEmulator` is a real `boolean`, not a string
  2. two Firebase keys removed → ConfigError naming `FIREBASE_API_KEY` and `FIREBASE_APP_ID`
  3. empty extra (no .env)     → ConfigError listing all 6 missing keys at once
  4. `APP_ENV=staging`         → ConfigError "must be one of development | production"
Commit: not committed — user directed no commit.
Known issues: `.env` on this machine holds placeholder Firebase values so the app boots;
TASK 06 must replace them with the real web config. `.env` is gitignored (verified).
Deviations/notes, all deliberate:
1. `scheme` was **not** added to the app config. It is deep-linking configuration and
   PLAN.md TASK 04 does not ask for it; TASK 17 owns it.
2. `src/services/config.ts` placement: the canonical architecture has no `config/` folder
   and creating one would change TASK 03's locked structure. `services/` is the
   infrastructure boundary, so the manifest reader lives there. CLAUDE.md §3 and the brief
   had their one-line description of `services/` widened from "Firebase / Firestore
   service layer" to "infrastructure access: Firebase / Firestore, app configuration".
   No folder was added, renamed or removed.
Next task: TASK 05

## Task 05

Status: READY FOR REVIEW — verification passed, awaiting user commit.
Implemented (design tokens only — no components, no feature code):
- `src/data/theme.ts`: the canonical source of visual values.
  - `colors` — `primary`, `primaryDark`, `background`, `surface`, `text`,
    `textSecondary`, `border`, `success`, `warning`, `error`, `disabled`.
  - `spacing` — `xs` 4, `sm` 8, `md` 16, `lg` 24, `xl` 32.
  - `radius` — `sm` 6, `md` 10, `lg` 16.
  - `typography` — `title`, `heading`, `body`, `caption`, each a complete style object
    (`fontSize` + `lineHeight` + `fontWeight`).
  - `sizes` — `touchTarget: 44` (the accessibility floor, needed by TASK 05B and TASK 42).
  - `theme` aggregate plus derived token-name types (`ColorToken`, `SpacingToken`,
    `RadiusToken`, `TypographyToken`, `SizeToken`, `Theme`).
- `App.tsx`: placeholder screen restyled to consume tokens only. This was the verification
  that `as const` typography composes with `StyleSheet.create` — no hard-coded value
  remains anywhere outside the token file.
- No dependency added or removed. No UI library. Light theme only.
Location decision: the locked architecture (AD-33) has **no `theme/` folder** — it was
explicitly rejected in TASK 03 — and `data/` is defined as "static configuration (pure)",
which is exactly what design tokens are. Tokens therefore live in `src/data/theme.ts` and
**no folder was added, renamed or removed**.
Purity: the token module imports no React, React Native, Expo or Firebase. `as const`
keeps `fontWeight` as a literal (`'600'`), which is what makes the tokens assignable to
React Native styles without importing `TextStyle` and without a cast.
Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0)
  npm run format:check → PASS (exit 0)
  Metro bundle (android) → PASS — HTTP 200, token value present in compiled output
Negative probe (temporary, deleted): 6 expected compile errors — unknown `colors`,
`spacing`, `radius` and `typography` token names all rejected, and assignment to
`colors.primary` / `theme.spacing.md` blocked as read-only.
Grep: zero hex colours outside `src/data/theme.ts`; exactly one definition of each token
group; no React/RN import under `src/data`.
Commit: not committed — user directed no commit.
Known issues: none.
Scope deviation from the previous PLAN text, deliberate and reconciled:
1. PLAN.md TASK 05 previously bundled design tokens **with** `SafeAreaProvider` wiring and
   eight UI primitives (`Text`, `Button`, `Card`, `Badge`, `Input`, `Screen`, `EmptyState`,
   `Skeleton`), and its verification mentioned dark mode. This task was scoped to tokens
   only. Rather than leave the primitives orphaned, PLAN.md TASK 05 was narrowed to
   "Design tokens" and a new **TASK 05B — Base UI primitives** now owns the primitives and
   `SafeAreaProvider`. TASK 16 and TASK 18 had their dependency repointed from TASK 05 to
   TASK 05B, since they consume primitives rather than raw tokens.
2. Dark mode remains out of scope and is no longer referenced in TASK 05 verification.
Next task: TASK 05B

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
| AD-15 | Pure logic (`buildSlotKey`, `decideBookingOutcome`, `deriveRoomStatus`) lives in `src/utils/`, is framework-free, and is shared between app and tests. | The slot key must have exactly one definition. | Fixed |
| AD-33 | **Final architecture: flat by-kind `src/` tree** — `components`, `screens`, `navigation`, `store`, `services`, `hooks`, `types`, `data`, `utils`, `providers`. The `app/features/domain/lib/theme` proposal is rejected and removed. Layers: `screens/components → hooks → services → types/data/utils`; Firebase only under `services/`; imports via `@/*`. | A mini-project does not need feature-slicing; by-kind is simpler to navigate, already matches the scaffold, and still expresses the layer boundary that the booking rules depend on. Two parallel architectures were a live contradiction. | **Fixed (TASK 03)** — resolves the TASK 01 discrepancy |
| AD-34 | Domain types are Firebase-free, live one-per-concern in `src/types/**`, and server-owned entities are fully `readonly`. Ids are plain `string`, not branded. | Keeps the pure layer testable without mocks and prevents accidental mutation of server snapshots; branding is ceremony this scope does not need. | Fixed (TASK 03) |
| AD-35 | Time slots are a **closed set of exactly four**, with `SlotId` derived from the definition via `as const satisfies`. | An arbitrary user-entered time must be unrepresentable, and slot ids are persisted inside the slot lock key — changing one is a data migration. | Fixed (TASK 03) |
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
