# Progress — VKU Study Room Booking

Single source of truth for **where the project actually is**. Updated as part of every
task's commit. Never report progress that has not been verified.

---

## Current state

**Status:** READY FOR REVIEW
**Current Task:** TASK 04 — Environment config
**Completed Tasks:** TASK 00 (planning baseline), TASK 00B (architecture lock-in),
TASK 01 (Expo scaffold, `7b9f4f4`), TASK 02 (strict TS + lint baseline, `3fef414`),
TASK 03 (architecture + domain types, `092cdf4`)
**Next Task:** TASK 05 — Theme and base UI primitives
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
