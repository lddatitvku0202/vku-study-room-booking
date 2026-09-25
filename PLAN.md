# PLAN.md — VKU Study Room Booking Development Roadmap

Sequenced roadmap from empty repository to a production-ready build.
**No application code exists yet.** Phase 0 is planning only.

**Architecture baseline (locked in TASK 00B):** no Cloud Functions, Firebase Spark plan,
client `runTransaction()` as booking authority, `slotLocks` as the availability lock,
Security Rules as the enforcement boundary. See `CLAUDE.md` and `docs/project-brief.md`.

**Rules of use**
- Tasks execute **in order**; a task starts only when its dependencies are `DONE`.
- One task = one branch = one commit. Commit messages below are the expected form.
- A task is `DONE` only when every acceptance criterion is met **and** the verification
  step has actually been run and passed.
- After each task, update `docs/progress.md` using the template there.
- Architecture rules in `CLAUDE.md` apply to every task and are not restated here.

**Legend for `Verification`:** the concrete command or observable check that proves the
task works. "It compiles" is never sufficient on its own.

---

## Phase 0 — Project planning

### TASK 00 — Planning baseline
- **Objective:** Establish permanent project context and roadmap before any code.
- **Dependencies:** none.
- **Implementation scope:** `CLAUDE.md`, `PLAN.md`, `docs/project-brief.md`,
  `docs/progress.md`. No application code, no dependencies installed.
- **Acceptance criteria:** four documents exist and agree; state ownership, concurrency
  invariants and deployment boundaries are written down; architectural conflicts are
  documented as open questions rather than silently decided.
- **Verification:** all four files reviewed by the user; open questions listed.
- **Commit:** `docs(planning): add CLAUDE.md, PLAN.md and project context (TASK 00)`
- **Status:** DONE.

### TASK 00B — Architecture decision lock-in
- **Objective:** Resolve every open question and remove all Cloud Functions / Blaze
  dependencies from the planning baseline.
- **Dependencies:** TASK 00.
- **Implementation scope:** rewrite of the four planning documents to a single consistent
  architecture: no Cloud Functions, Spark plan, client transaction, `slotLocks`,
  Security Rules enforcement, `onSnapshot` → TanStack Query, 70/30 as traffic
  distribution, QR display-only, Expo Go for early development, in-memory search,
  derived room status. No application code.
- **Acceptance criteria:** zero Cloud Functions / Blaze / `functions/` dependencies remain
  in any planning document; no task depends on server-side compute; all four documents
  describe the same architecture; every open question is RESOLVED or explicitly carried
  forward as a stated limitation.
- **Verification:** repository-wide grep for `Cloud Function`, `Blaze`, `functions/`
  returns only historical notes that are explicitly marked as removed; the four documents
  cross-checked against each other.
- **Commit:** `docs(planning): lock architecture decisions and remove cloud functions (TASK 00B)`

---

## Phase 1 — Foundation

### TASK 01 — Expo + TypeScript scaffold
- **Objective:** Runnable Expo app with TypeScript.
- **Dependencies:** TASK 00B.
- **Implementation scope:** Expo app init (TypeScript template), `app.json` /
  `app.config.ts`, `.gitignore`, `README.md` skeleton, minimal placeholder root screen.
  Install only: `expo`, `react`, `react-native`, `typescript`,
  `react-native-safe-area-context`. **Expo Go is sufficient here — no development build.**
- **Acceptance criteria:** app starts in Expo Go; no TS errors; `.gitignore` covers
  `node_modules`, `.expo`, `.env*`, build output, and any service-account JSON.
- **Verification:** `npx expo start` launches and the placeholder screen renders on a
  device via Expo Go; `npx tsc --noEmit` clean.
- **Commit:** `chore(setup): scaffold expo typescript app (TASK 01)`

### TASK 02 — Strict TypeScript, lint, format, aliases
- **Objective:** Enforce the TypeScript rules from `CLAUDE.md` mechanically.
- **Dependencies:** TASK 01.
- **Implementation scope:** `tsconfig.json` strict flags + path aliases (`@/…`),
  ESLint + `@typescript-eslint` + import-order + react-hooks rules, Prettier, npm scripts
  `typecheck` / `lint` / `format`.
- **Acceptance criteria:** `any` and `@ts-ignore` are lint errors; unused imports and
  hook-dependency violations are errors; aliases resolve in both TS and Metro.
- **Verification:** `npm run typecheck && npm run lint` pass on a clean tree; a
  deliberately added `any` fails lint.
- **Commit:** `chore(tooling): enable strict typescript, eslint and prettier (TASK 02)`

### TASK 03 — Folder architecture + domain types
- **Objective:** Lock the layer boundaries and the vocabulary of the domain.
- **Dependencies:** TASK 02.
- **Implementation scope:** `src/{app,features,components,hooks,services,domain,lib,theme}`
  skeleton; domain types `Room`, `Building`, `TimeSlot`, `SlotId`, `BookingStatus`,
  `Booking`, `SlotLock`, `RoomFilters`, `BookingError`; the pure **`buildSlotKey()`**
  function (`roomId_date_slotId`) plus slot/date helpers. Lint rule forbidding
  `services` → `features` imports.
- **Acceptance criteria:** the domain module imports nothing from React, Firebase or
  `services`; `buildSlotKey` is the single definition of the lock key and is unit tested;
  ids are branded/typed, not bare strings.
- **Verification:** `npm run typecheck` clean; `grep` shows zero React/Firebase imports
  under `src/domain`; `buildSlotKey` tests pass including a date-format edge case.
- **Commit:** `feat(domain): add folder architecture and core domain types (TASK 03)`

### TASK 04 — Environment config
- **Objective:** Typed, validated runtime configuration with no secrets in git.
- **Dependencies:** TASK 03.
- **Implementation scope:** `.env.example`, `app.config.ts` `extra` wiring, a typed
  `config` module that validates required keys at startup and fails loudly, and an
  emulator on/off flag.
- **Acceptance criteria:** missing/invalid config throws a clear startup error, not a
  downstream `undefined`; no real credentials in the repo; config is typed, not `any`.
- **Verification:** app boots with a valid `.env`; removing a required key produces the
  explicit startup error.
- **Commit:** `feat(config): add typed environment configuration (TASK 04)`

### TASK 05 — Theme and base UI primitives
- **Objective:** A consistent visual base so later screens are not ad hoc.
- **Dependencies:** TASK 04.
- **Implementation scope:** design tokens (spacing, color, typography, radii),
  `SafeAreaProvider` wiring, primitives: `Text`, `Button`, `Card`, `Badge`, `Input`,
  `Screen`, `EmptyState`, `Skeleton`.
- **Acceptance criteria:** no hard-coded colors/spacing outside the token file;
  primitives are memo-friendly (no inline style objects in hot paths); touch targets ≥44pt.
- **Verification:** a scratch showcase screen renders every primitive in light and dark,
  on a notched device, with correct insets.
- **Commit:** `feat(ui): add design tokens and base primitives (TASK 05)`

---

## Phase 2 — Firebase

### TASK 06 — Firebase project wiring
- **Objective:** Initialize Firebase in the app with a single typed entry point.
- **Dependencies:** TASK 04.
- **Implementation scope:** Firebase project created on the **Spark plan** (by the user),
  app registration, `src/services/firebase/app.ts` singleton, Auth + Firestore instances
  with React Native persistence, emulator connection toggled by config.
  **No Cloud Functions SDK, no `functions/` directory.**
- **Acceptance criteria:** one Firebase app instance (no re-init on fast refresh);
  emulator vs cloud selected by config, never an edited constant; no Firebase import
  outside `src/services`; no billing-dependent service referenced.
- **Verification:** app boots against the emulator and logs a successful connection;
  toggling config switches target.
- **Commit:** `feat(firebase): initialize firebase app and emulator wiring (TASK 06)`

### TASK 07 — Firestore data model
- **Objective:** Define collections, document shapes, and converters.
- **Dependencies:** TASK 06, TASK 03.
- **Implementation scope:** documented model and typed `FirestoreDataConverter` for
  `rooms`, `bookings`, **`slotLocks`**, `users`; `firestore.indexes.json` covering the
  planned queries (my bookings by user + date, today's active locks).
  `slotLocks/{slotKey}` document id is `roomId_date_slotId`, produced only by
  `buildSlotKey()`. `rooms` documents carry **no** persisted availability field.
- **Acceptance criteria:** every collection has a type + converter + validation;
  `createdAt` uses a server timestamp; no field is `any`; the booking document stores the
  `slotKey` it owns so cancellation can release the lock without recomputation;
  the model is documented in `docs/project-brief.md`.
- **Verification:** converter round-trip unit tests pass; a malformed document is rejected
  by validation rather than crashing a screen.
- **Commit:** `feat(firestore): define collections, converters and indexes (TASK 07)`

### TASK 08 — Authentication
- **Objective:** VKU students sign in; every write carries a verified identity.
- **Dependencies:** TASK 06.
- **Implementation scope:** Firebase Auth email/password, sign-up/sign-in/sign-out
  services, auth-state observer, `users/{uid}` profile bootstrap, typed auth error mapping.
- **Acceptance criteria:** auth state survives app restart; the profile document is created
  idempotently; errors are typed and human-readable; **no role or privileged field is
  client-writable**.
- **Verification:** emulator sign-up → restart app → still signed in; sign-out clears the
  session and the server cache.
- **Commit:** `feat(auth): add firebase authentication and user profile bootstrap (TASK 08)`

### TASK 09 — Security rules v1 + emulator suite
- **Objective:** Deny-by-default rules and the harness that tests them.
- **Dependencies:** TASK 07, TASK 08.
- **Implementation scope:** `firestore.rules` v1 — `rooms` read-only to clients,
  `bookings` owner-read only, `slotLocks` authenticated read, **all booking and lock
  writes denied for now** (opened in TASK 30), `users/{uid}` self-scoped with a field
  whitelist; `firebase.json` emulator config; `@firebase/rules-unit-testing`;
  npm script `test:rules`.
- **Acceptance criteria:** `allow read, write: if true` appears nowhere; unauthenticated
  access denied everywhere; a user cannot read another user's bookings; a client cannot
  write a room; a client cannot escalate its own role.
- **Verification:** `npm run test:rules` passes, including explicit negative tests.
- **Commit:** `feat(security): add firestore rules v1 with emulator rules tests (TASK 09)`

### TASK 10 — Room seed data (120+)
- **Objective:** A realistic dataset large enough to prove the performance claims.
- **Dependencies:** TASK 07, TASK 09.
- **Implementation scope:** a **local Node seed script** (run by a developer from a
  workstation, not deployed and not part of the app) generating **≥120 rooms** across
  buildings, floors, types, capacities and equipment, plus the shared time-slot
  definition. Idempotent and re-runnable, targeting the emulator or a dev project by flag.
- **Acceptance criteria:** ≥120 room documents with a genuine spread of filterable
  attributes; the script is idempotent; it never runs from the mobile client; any
  credential it needs is gitignored and referenced by path from an env var.
- **Verification:** run against the emulator, assert count ≥120 and attribute spread;
  re-run produces no duplicates.
- **Commit:** `feat(data): add idempotent seed script for 120+ rooms (TASK 10)`

---

## Phase 3 — Server state

### TASK 11 — TanStack Query foundation
- **Objective:** One cache for all server state, with typed keys.
- **Dependencies:** TASK 06.
- **Implementation scope:** `QueryClientProvider`, defaults (staleTime, retry,
  `AppState`-aware refetch for React Native), a **typed query-key factory**, and a global
  typed error handler.
- **Acceptance criteria:** no raw string arrays as query keys anywhere; retry does **not**
  retry on typed conflict or permission errors; defaults documented in the file.
- **Verification:** a smoke query resolves, caches, and refetches on app foreground.
- **Commit:** `feat(query): add tanstack query client and typed key factory (TASK 11)`

### TASK 12 — Firestore repository layer
- **Objective:** All Firestore access behind typed, testable repositories.
- **Dependencies:** TASK 07, TASK 11.
- **Implementation scope:** `roomsRepository`, `bookingsRepository`, `slotLocksRepository`
  — plain async functions returning domain types and mapping Firestore errors to typed
  domain errors. No React inside. Read paths only; the booking transaction lands in TASK 29.
- **Acceptance criteria:** repositories return domain types (never `DocumentSnapshot`);
  every error path is typed; repositories are callable from a Node test without React.
- **Verification:** repository integration tests against the emulator pass.
- **Commit:** `feat(services): add typed firestore repository layer (TASK 12)`

### TASK 13 — Room queries + cache persistence
- **Objective:** Fetch the room catalogue efficiently and survive cold starts.
- **Dependencies:** TASK 12, TASK 10.
- **Implementation scope:** `useRooms`, `useRoom(id)`; AsyncStorage persister for the
  Query cache with an explicit **allowlist** of persisted keys, a cache version/buster and
  a max age. **`slotLocks`, availability and `bookings` are excluded from persistence.**
  Firestore's own local persistence is not used as a second cache for availability.
- **Acceptance criteria:** cold start shows cached rooms and then revalidates; no
  availability value is ever served from persisted cache as truth; a cache-version bump
  discards old data.
- **Verification:** airplane-mode cold start renders cached rooms with a visible
  "offline/stale" indicator; reconnect refetches; persisted JSON inspected and contains no
  lock or booking data.
- **Commit:** `feat(rooms): add room queries with persisted query cache (TASK 13)`

---

## Phase 4 — Client state

### TASK 14 — Zustand client stores
- **Objective:** UI state cleanly separated from server state.
- **Dependencies:** TASK 03.
- **Implementation scope:** `useFilterStore` (search text, filters, sort);
  `useBookingDraftStore` (selected date, selected slot id, and the **stable
  client-generated `bookingId`** for the current attempt — ids only);
  `useUiStore` (sheets, toasts, onboarding); `useNotificationStore`
  (`bookingId → notification id` mapping); `useDemoStore` (demo-mode flags).
  Selector-based subscriptions throughout.
- **Acceptance criteria:** **no store holds a server entity**; components subscribe via
  narrow selectors, never the whole store; actions are typed; the draft `bookingId` is
  generated once per attempt and reused on retry (supports I6).
- **Verification:** unit tests on store transitions including `bookingId` stability across
  a simulated retry; a review grep confirms no `Room`/`Booking`/`SlotLock` document type
  is stored.
- **Commit:** `feat(state): add zustand stores for client ui state (TASK 14)`

### TASK 15 — Client state persistence
- **Objective:** Remember user preferences across launches — safely.
- **Dependencies:** TASK 14.
- **Implementation scope:** Zustand `persist` middleware over AsyncStorage for filters,
  preferences and the notification id mapping only, with `partialize`, a version and a
  migration function.
- **Acceptance criteria:** only whitelisted client fields persist; the booking draft and
  any server-derived value are **not** persisted; a version bump migrates without crashing.
- **Verification:** set filters → kill app → relaunch → filters restored; stored JSON
  inspected and contains no server entities.
- **Commit:** `feat(state): persist client preferences to asyncstorage (TASK 15)`

---

## Phase 5 — Navigation

### TASK 16 — Navigation skeleton
- **Objective:** Typed navigation with auth gating.
- **Dependencies:** TASK 08, TASK 05.
- **Implementation scope:** React Navigation + gesture-handler/reanimated setup; root
  switch (Auth stack vs App tabs); tabs: Rooms, My Bookings, Profile; native stack for
  Room Detail and Booking Confirmation; fully typed param lists and hooks.
- **Acceptance criteria:** no untyped `navigate('…')`; auth gating shows no flash of the
  wrong stack; back behaviour and header titles are correct on Android and iOS.
- **Verification:** navigate every route; hardware back returns correctly; typecheck
  rejects a wrong route param.
- **Commit:** `feat(navigation): add typed navigation with auth gating (TASK 16)`

### TASK 17 — Deep linking
- **Objective:** Notification taps can open a specific booking or room.
- **Dependencies:** TASK 16.
- **Implementation scope:** `linking` config, URL scheme, typed path→param parsing,
  cold-start and warm-start handling, unknown-link fallback.
- **Acceptance criteria:** a deep link works from cold start, background and foreground;
  a link to an inaccessible resource resolves to a safe screen, never a crash.
- **Verification:** `npx uri-scheme open <scheme>://booking/<id>` on both platforms in all
  three app states.
- **Commit:** `feat(navigation): add deep linking configuration (TASK 17)`

---

## Phase 6 — Room discovery / performance

### TASK 18 — Virtualized room list
- **Objective:** Smooth scrolling over 120+ rooms.
- **Dependencies:** TASK 13, TASK 16, TASK 05.
- **Implementation scope:** `RoomListScreen` with `FlatList`, memoized `RoomCard`, stable
  `keyExtractor`, `getItemLayout` (fixed row height), tuned `windowSize` /
  `maxToRenderPerBatch` / `initialNumToRender`, loading skeletons, empty and error states.
- **Acceptance criteria:** no `.map()` over rooms in a `ScrollView`; no inline
  object/array/arrow props on rows; a full-list fling produces no blank frames on a
  mid-range Android device.
- **Verification:** 120+ rooms render; fling from top to bottom stays smooth; JS FPS
  observed via the performance monitor.
- **Commit:** `feat(rooms): add virtualized room list screen (TASK 18)`

### TASK 19 — Derived room status ("Available Now")
- **Objective:** Show live availability without ever persisting a status field on a room.
- **Dependencies:** TASK 18, TASK 12.
- **Implementation scope:** `useTodayActiveLocks()` — one bounded query/listener over
  `slotLocks where date == today` — plus a **pure** `deriveRoomStatus(room, locks, now)`
  returning `AVAILABLE_NOW | OCCUPIED`; status badge on `RoomCard`; a "free now" filter input.
- **Acceptance criteria:** `rooms` documents contain no persisted availability field;
  status is derived, never stored; "occupied" means a confirmed booking covers the current
  time; the derivation is pure and unit tested across slot boundaries; exactly one bounded
  query backs the whole list, never one per row.
- **Verification:** unit tests for `deriveRoomStatus` (before, during, after a slot, and at
  the exact boundary); booking a slot on a second client flips the badge on the list.
- **Commit:** `feat(rooms): derive room availability status from slot locks (TASK 19)`

### TASK 20 — Render profiling and performance baseline
- **Objective:** Prove the performance claim with numbers, not vibes.
- **Dependencies:** TASK 19.
- **Implementation scope:** memoization audit of `RoomCard` and list props, a documented
  measurement procedure, and recorded baseline numbers in `docs/progress.md`.
- **Acceptance criteria:** scrolling does not re-render off-screen rows; a filter change
  re-renders only affected rows; a lock update does not re-render the whole list; baseline
  numbers recorded with device and OS.
- **Verification:** React DevTools profiler / render-count instrumentation before and
  after, both recorded.
- **Commit:** `perf(rooms): memoize list rendering and record baseline (TASK 20)`

---

## Phase 7 — Search / filter

### TASK 21 — Search
- **Objective:** Fast in-memory text search over the room catalogue.
- **Dependencies:** TASK 18, TASK 14.
- **Implementation scope:** search input bound to `useFilterStore` with a **300 ms
  debounce**; a pure, unit-tested match function (name, code, building, equipment) with
  normalization for case and **Vietnamese diacritics**; a search index precomputed once
  per dataset, not per keystroke.
- **Acceptance criteria:** typing never rebuilds the dataset; results update within one
  debounce interval; search runs entirely on cached data with no network round trip;
  diacritic-insensitive matching is tested; no server-side search is introduced.
- **Verification:** unit tests for the matcher; rapid typing over 120+ rooms keeps the
  input responsive with no dropped characters.
- **Commit:** `feat(search): add debounced in-memory room search (TASK 21)`

### TASK 22 — Filters
- **Objective:** Combine multiple filter dimensions predictably.
- **Dependencies:** TASK 21, TASK 19.
- **Implementation scope:** filter sheet (building, room type, capacity range, equipment,
  available-now); pure composable predicates; active-filter chips; reset; result count.
- **Acceptance criteria:** filters compose as AND across dimensions and OR within a
  dimension — documented and tested; filter state lives only in Zustand; filtering is
  memoized on `(rooms, filters, query)`.
- **Verification:** unit tests over the predicate matrix; the UI count matches list length.
- **Commit:** `feat(search): add composable room filters (TASK 22)`

### TASK 23 — Discovery states polish
- **Objective:** Every state of the list is intentional.
- **Dependencies:** TASK 22.
- **Implementation scope:** empty-result state with a reset action, loading skeletons,
  typed error state with retry, offline/stale banner, pull-to-refresh.
- **Acceptance criteria:** no infinite spinner; no silent failure; stale cached data is
  visibly labelled stale.
- **Verification:** force each state (no results, offline, permission error) and confirm
  the correct UI.
- **Commit:** `feat(search): add empty, loading and error states (TASK 23)`

---

## Phase 8 — Room detail / time slots

### TASK 24 — Room detail screen
- **Objective:** Full information for one room.
- **Dependencies:** TASK 18, TASK 16.
- **Implementation scope:** `RoomDetailScreen` — details, equipment, capacity, rules;
  `useRoom(id)` with the list item as placeholder data; not-found and no-access states.
- **Acceptance criteria:** opens instantly from the list using cached data, then
  revalidates; handles a deleted or invalid room id without crashing.
- **Verification:** open from the list and from a deep link (cold start) — both work.
- **Commit:** `feat(rooms): add room detail screen (TASK 24)`

### TASK 25 — Date picker and time-slot grid
- **Objective:** Pick a date and a slot, correctly and unambiguously.
- **Dependencies:** TASK 24, TASK 03.
- **Implementation scope:** date strip (bookable window only) using `date-fns`; slot grid
  rendering the shared slot definition; states available / taken / past / mine / disabled;
  selection into `useBookingDraftStore`; the documented timezone policy (single campus
  timezone, date as `yyyy-MM-dd`, slot times from the slot definition).
- **Acceptance criteria:** past slots are never selectable; the timezone policy is written
  down and unit tested including a day boundary; the displayed slot key derives from
  `buildSlotKey()` — never an inline template string.
- **Verification:** unit tests for slot/date derivation including edge times; the UI
  reflects every slot state.
- **Commit:** `feat(booking): add date selection and time slot grid (TASK 25)`

---

## Phase 9 — Realtime availability

### TASK 26 — Realtime availability subscription
- **Objective:** Other users' bookings appear without a manual refresh.
- **Dependencies:** TASK 25, TASK 12, TASK 11.
- **Implementation scope:** `useRoomAvailability(roomId, date)` — a scoped `onSnapshot`
  over `slotLocks where roomId == … and date == …`, bridged into the TanStack Query cache
  via `setQueryData`; subscribe on focus, unsubscribe on blur/unmount; reference counting
  so duplicate mounts share one listener; availability queries configured so a refetch
  cannot overwrite fresher listener data.
- **Acceptance criteria:** exactly one listener per `(roomId, date)` regardless of mount
  count; zero listeners after leaving the screen; **no Zustand availability cache and no
  second server-state store**; `fromCache` / pending-writes metadata handled explicitly.
- **Verification:** two emulator clients — a booking on A updates B's grid within seconds
  without interaction; an instrumented listener count reads 0 after navigating away.
- **Commit:** `feat(realtime): bridge slot lock listeners into query cache (TASK 26)`

### TASK 27 — Listener lifecycle and cost guards
- **Objective:** Realtime that does not leak memory or quota.
- **Dependencies:** TASK 26, TASK 19.
- **Implementation scope:** background/foreground detachment via `AppState`, a documented
  maximum concurrent listener count, a dev-only listener registry/warning, and a documented
  read-cost estimate **against Spark plan quota limits**.
- **Acceptance criteria:** listeners detach in background and reattach on foreground;
  exceeding the cap warns loudly in dev; no listener over an unbounded collection; the
  estimated daily read volume for the demo scenario is recorded and sits inside free quota.
- **Verification:** ten background/foreground cycles show a stable listener count and no
  growth in retained memory; the read estimate is written into `docs/progress.md`.
- **Commit:** `perf(realtime): add listener lifecycle and quota guards (TASK 27)`

---

## Phase 10 — Atomic booking / conflict prevention

### TASK 28 — Booking transaction contract (pure domain)
- **Objective:** Define the booking contract before any I/O touches it.
- **Dependencies:** TASK 07, TASK 03.
- **Implementation scope:** pure, framework-free definitions — `slotKey` derivation reuse,
  the `SlotLock` and `Booking` document shapes, the stable client `bookingId` generator,
  the typed error union (`SLOT_TAKEN`, `INVALID_SLOT`, `PAST_SLOT`, `UNAUTHENTICATED`,
  `PERMISSION_DENIED`, `NETWORK`), and a pure `decideBookingOutcome(existingLock, request)`
  used by both the transaction and its tests.
- **Acceptance criteria:** no Firebase import in this module; `decideBookingOutcome`
  returns `PROCEED`, `IDEMPOTENT_SUCCESS` (same `bookingId`) or `SLOT_TAKEN`, and is
  exhaustively unit tested; the error union is the single source of booking error codes.
- **Verification:** unit tests cover no-lock, active-lock-other-user, active-lock-same-
  bookingId, and released-lock cases; `npm run typecheck` clean.
- **Commit:** `feat(booking): add booking transaction contract and outcome logic (TASK 28)`

### TASK 29 — Atomic client booking transaction
- **Objective:** The core of the project — exactly one winner per slot, decided by Firestore.
- **Dependencies:** TASK 28, TASK 12, TASK 08.
- **Implementation scope:** `bookingService.createBooking({ roomId, date, slotId, bookingId })`
  using **`runTransaction()`**: derive `slotKey` → `tx.get(slotLocks/{slotKey})` → apply
  `decideBookingOutcome` → on `PROCEED`, `tx.set` **both** `bookings/{bookingId}` and
  `slotLocks/{slotKey}` in the same transaction; `userId` taken from the authenticated
  user; `createdAt` as a server timestamp; Firestore errors mapped to the typed union.
- **Acceptance criteria:** invariants **I1, I2, I3, I5, I6** hold; both documents are
  written in one transaction and never separately; no `writeBatch`, no pre-check-then-write,
  no lock-then-booking or booking-then-lock ordering; replaying the same `bookingId`
  returns the original booking rather than creating a second one.
- **Verification:** emulator concurrency test — **N=20 parallel** `createBooking` calls for
  one slot yield exactly **1 success and 19 `SLOT_TAKEN`**; a duplicate `bookingId` yields
  exactly one booking document and one lock.
- **Commit:** `feat(booking): add atomic client booking transaction (TASK 29)`

### TASK 30 — Security rules v2 — transaction pattern enforcement
- **Objective:** Make the invariants unbypassable from a hostile client.
- **Dependencies:** TASK 29, TASK 09.
- **Implementation scope:** open the booking write paths in `firestore.rules` **only** in
  the coupled shape: a `slotLocks/{slotKey}` create is valid only when
  `getAfter(/bookings/$(lock.bookingId))` shows a matching, owned, active booking; a
  `bookings/{bookingId}` create is valid only when
  `getAfter(/slotLocks/$(booking.slotKey)).data.bookingId == bookingId`. Both require
  `userId == request.auth.uid`, a valid status, `createdAt == request.time`, and a
  `slotKey` consistent with the booking's own `roomId`/`date`/`slotId`. Updates to an
  active lock are denied. Expand the rules test suite.
- **Acceptance criteria:** a lock written **without** its booking is denied; a booking
  written **without** its lock is denied; a forged `userId` is denied; overwriting another
  user's active lock is denied; a non-owner write is denied; the legitimate transaction
  from TASK 29 still succeeds. `allow read, write: if true` appears nowhere.
- **Verification:** `npm run test:rules` covers each negative path above plus the positive
  transaction path, and passes.
- **Commit:** `feat(security): enforce booking transaction pattern in rules v2 (TASK 30)`

### TASK 31 — Booking mutation hook + conflict UX
- **Objective:** Honest, immediate feedback on winning or losing a race.
- **Dependencies:** TASK 29, TASK 30, TASK 26, TASK 25.
- **Implementation scope:** `useCreateBooking` mutation over `bookingService`; in-flight
  and disabled button state; on `SLOT_TAKEN` → a specific conflict message, invalidate and
  refetch availability, keep the user on the grid with the slot now shown as taken;
  on success → confirmation screen; the draft `bookingId` is cleared only after a
  confirmed success.
- **Acceptance criteria:** **no optimistic success** for bookings (I4) — the UI never shows
  "booked" before Firestore confirms; a double-tap cannot create two bookings; conflict
  messaging is specific, not a generic failure.
- **Verification:** two clients tap the same slot simultaneously — one sees the
  confirmation, the other sees the conflict message and an updated grid; a rapid
  double-tap produces exactly one booking document.
- **Commit:** `feat(booking): add booking mutation with conflict handling (TASK 31)`

---

## Phase 11 — Demo 70/30 contention simulation

### TASK 32 — Contention simulation engine
- **Objective:** Reproducibly generate real contention to demonstrate correctness.
- **Dependencies:** TASK 29, TASK 30, TASK 14.
- **Implementation scope:** a simulation engine that issues **real** `createBooking`
  transactions from N simulated participants, with traffic split **~70% onto independent
  free slots and ~30% onto one shared hot slot**, paced with `Promise` + `setTimeout`
  delays in the **1–1.5 s** range. Collects per-attempt results: target slot, outcome,
  latency. Runs against the emulator or a dev project, gated behind the `useDemoStore`
  demo-mode flag.
- **Acceptance criteria:** invariant **I8** — no fabricated outcomes, no `Math.random()`
  conflict, no mocked booking path, no bypass of the transaction or rules; the hot slot
  yields exactly **one** success no matter how many participants target it; every result
  originates from a real Firestore commit; the engine is excluded from production builds.
- **Verification:** run with N=30 — assert hot-slot successes == 1, and
  `successes + conflicts + errors == attempts`; repeat runs reproduce the invariant while
  exact ratios vary.
- **Commit:** `feat(demo): add real-transaction contention simulation engine (TASK 32)`

### TASK 33 — Demo screen, results and script
- **Objective:** A repeatable, presentable demonstration for evaluation.
- **Dependencies:** TASK 32, TASK 31.
- **Implementation scope:** a demo screen that runs the engine and renders a live results
  table (attempts, successes, `SLOT_TAKEN`, other errors, measured ratio, latency), plus
  `docs/demo-script.md` — setup, seed, accounts, exact steps, expected output and how to
  read it.
- **Acceptance criteria:** the measured ratio is **reported as measured** and labelled an
  approximation of the 70/30 target, never asserted or rounded into shape; the document
  explains why the hot slot yields exactly one success and why the observed success rate
  sits slightly above 70%; a reader can reproduce the demo from the document alone.
- **Verification:** someone other than the author follows the script end to end and
  reproduces comparable numbers.
- **Commit:** `feat(demo): add contention demo screen and script (TASK 33)`

---

## Phase 12 — Booking history / cancellation

### TASK 34 — Booking history
- **Objective:** Users see their upcoming and past bookings.
- **Dependencies:** TASK 31, TASK 16.
- **Implementation scope:** `MyBookingsScreen` — `FlatList`, upcoming/past sections,
  `useMyBookings` query (owner-scoped `where userId == uid`), status badges, empty state,
  and a bounded query window.
- **Acceptance criteria:** a user sees only their own bookings, enforced by rules and not
  merely by the query; sections derive from a pure, tested date comparison; the list is
  virtualized.
- **Verification:** an emulator account with ≥30 bookings scrolls smoothly; a second
  account's bookings are neither visible nor fetchable (rules test).
- **Commit:** `feat(bookings): add booking history screen (TASK 34)`

### TASK 35 — Cancellation transaction
- **Objective:** Cancel a booking and genuinely free the slot.
- **Dependencies:** TASK 34, TASK 29, TASK 30.
- **Implementation scope:** `bookingService.cancelBooking(bookingId)` using
  `runTransaction()` — read the booking, verify ownership and the cancellation window,
  then **in one transaction** set `status = 'cancelled'` and delete
  `slotLocks/{booking.slotKey}`. Rules v3: a lock delete is valid only when
  `getAfter()` shows the coupled booking cancelled by its owner. Confirm dialog and cache
  invalidation on the client.
- **Acceptance criteria:** invariant **I7** — a cancelled slot becomes bookable by another
  user immediately; only the owner can cancel; a cancelled booking cannot be cancelled
  twice; a past booking cannot be cancelled; a lock can never be deleted on its own.
- **Verification:** emulator test — user A cancels, user B then books the same slot
  successfully; a rules test proves a bare lock delete is denied; concurrent cancel+book
  still yields at most one active lock.
- **Commit:** `feat(bookings): add cancellation transaction with lock release (TASK 35)`

### TASK 36 — Offline and reconciliation behaviour
- **Objective:** Define exactly what the app does without a network.
- **Dependencies:** TASK 35, TASK 13.
- **Implementation scope:** documented offline policy — reads may serve cache with a stale
  indicator; **booking and cancellation are disabled offline** (no queueing, since
  Firestore would otherwise replay the write later against a changed lock state);
  reconnect revalidates bookings and availability, with server state winning.
- **Acceptance criteria:** no queued booking that could violate I1; offline state is
  visible and explained; on reconnect, stale data is replaced within one refetch.
- **Verification:** airplane mode — browsing works with a stale banner and booking is
  blocked with a clear message; reconnect refreshes and server state wins.
- **Commit:** `feat(offline): define offline read cache and booking lockout (TASK 36)`

---

## Phase 13 — QR + notifications

### TASK 37 — QR booking pass (display-only)
- **Objective:** A visual pass for the booked session.
- **Dependencies:** TASK 31.
- **Implementation scope:** `react-native-qrcode-svg` rendering the payload
  `bookingId | roomName | date | slotLabel` on the confirmation and booking-detail screens,
  with the slot time shown alongside. **No scanner, no scanning dependency, no check-in
  backend.**
- **Acceptance criteria:** the payload matches the agreed format exactly; no personal data
  beyond the booking reference is encoded; a cancelled booking does not display a valid
  pass; no new dependency is added.
- **Verification:** scan with a generic reader and confirm the payload string; cancel the
  booking and confirm the pass is withdrawn.
- **Commit:** `feat(qr): add display-only qr booking pass (TASK 37)`

### TASK 38 — Notification permissions and channels
- **Objective:** Foundation for reminders.
- **Dependencies:** TASK 16, TASK 08.
- **Implementation scope:** `expo-notifications` setup, a permission request with a
  pre-prompt rationale, Android channels, denied-permission handling. **Local
  notifications only** — no push service, no server-side sender.
- **Acceptance criteria:** the app is fully functional with notifications denied; no crash
  when notifications are unavailable; if Expo Go limits a behaviour here, that limitation
  is documented and a development build is used for verification only.
- **Verification:** grant and deny flows both exercised; a test local notification fires.
- **Commit:** `feat(notifications): add notification permissions and channels (TASK 38)`

### TASK 39 — Booking reminders and notification id lifecycle
- **Objective:** Remind before a session, and clean up reliably.
- **Dependencies:** TASK 38, TASK 35, TASK 15.
- **Implementation scope:** schedule a local reminder on booking success; cancel it on
  cancellation; deep link into the booking on tap; store the scheduled notification
  identifier in `useNotificationStore` (`bookingId → notificationId`), persisted to
  AsyncStorage.
- **Acceptance criteria:** cancelling a booking cancels its reminder **on that device**;
  no duplicate reminder after a reschedule; no orphaned reminder after sign-out; the
  device-local limitation (a cancellation on device B cannot clear a reminder scheduled on
  device A) is documented honestly in the README and surfaced in the UI where relevant.
- **Verification:** book → reminder scheduled; cancel → reminder gone, confirmed via the
  scheduled-notifications list; sign-out clears local schedules and the mapping.
- **Commit:** `feat(notifications): add booking reminders with id lifecycle (TASK 39)`

---

## Phase 14 — Reanimated / Gesture / UI polish

### TASK 40 — Reanimated interactions
- **Objective:** Motion that improves comprehension, not decoration.
- **Dependencies:** TASK 23, TASK 25.
- **Implementation scope:** filter-sheet transitions, slot selection feedback,
  booking-success animation, list-item entering animation — all on the UI thread.
- **Acceptance criteria:** animations run on the UI thread with no JS-thread jank during
  scroll; the TASK 20 list baseline is **not regressed**; `reduceMotion` is respected.
- **Verification:** re-run the TASK 20 profiling procedure and compare against the recorded
  baseline.
- **Commit:** `feat(ui): add reanimated interactions (TASK 40)`

### TASK 41 — Gesture flows
- **Objective:** Natural direct manipulation where it helps.
- **Dependencies:** TASK 40, TASK 34.
- **Implementation scope:** swipe-to-cancel on a booking row (with confirmation),
  pull-to-refresh, sheet drag-to-dismiss — via `react-native-gesture-handler`.
- **Acceptance criteria:** gestures do not conflict with list scrolling; a destructive
  gesture always requires confirmation; gesture-triggered cancel uses the **same**
  `cancelBooking` transaction as the button — never a separate write path.
- **Verification:** manual test on both platforms including an interrupted/aborted swipe.
- **Commit:** `feat(ui): add gesture-driven booking interactions (TASK 41)`

### TASK 42 — Accessibility and final UI pass
- **Objective:** Usable for everyone, consistent everywhere.
- **Dependencies:** TASK 41.
- **Implementation scope:** accessibility labels/roles/hints, contrast check, dynamic type,
  safe-area audit on notched and gesture-nav devices, dark mode, loading/error consistency.
- **Acceptance criteria:** every interactive element has an accessible label; contrast meets
  WCAG AA; no content under a notch or home indicator; a screen reader can complete a full
  booking flow.
- **Verification:** VoiceOver and TalkBack walkthrough of search → detail → book → cancel.
- **Commit:** `feat(ui): accessibility and final polish pass (TASK 42)`

---

## Phase 15 — Testing / production / deployment

### TASK 43 — Unit and integration test suite
- **Objective:** Lock in the pure logic.
- **Dependencies:** TASK 42.
- **Implementation scope:** Jest + React Native Testing Library; unit tests for domain
  logic (slot key, slots, dates, filters, search, `decideBookingOutcome`,
  `deriveRoomStatus`); hook/component tests for the booking flow; coverage reporting.
- **Acceptance criteria:** every pure domain module is tested; the booking flow has tests
  covering success **and** conflict; tests run without a network.
- **Verification:** `npm test` passes; the coverage report is reviewed against the domain
  modules.
- **Commit:** `test(app): add unit and integration test suite (TASK 43)`

### TASK 44 — Concurrency regression suite
- **Objective:** Make the core guarantee permanently enforced.
- **Dependencies:** TASK 43, TASK 29, TASK 35.
- **Implementation scope:** emulator-based tests: N-parallel booking on one slot, duplicate
  `bookingId`, cancel-then-rebook, concurrent cancel+book, past-slot rejection, and the
  hostile-client cases (bare lock write, bare booking write, forged `userId`).
- **Acceptance criteria:** invariants **I1–I9** each have at least one automated test; the
  suite is deterministic with no flaky timing assumptions; it runs from one command.
- **Verification:** `npm run test:concurrency` passes five consecutive runs.
- **Commit:** `test(booking): add booking concurrency regression suite (TASK 44)`

### TASK 45 — Performance regression check
- **Objective:** Keep the 120+ room claim true over time.
- **Dependencies:** TASK 43, TASK 20.
- **Implementation scope:** a documented repeatable procedure with recorded numbers for
  list scroll, search keystroke latency and cold start, plus documented thresholds.
- **Acceptance criteria:** measurements taken on a named device/OS; results compared against
  the TASK 20 baseline; any regression is documented, not ignored.
- **Verification:** the procedure is executed and results appended to `docs/progress.md`.
- **Commit:** `test(perf): add performance regression measurements (TASK 45)`

### TASK 46 — Rules suite completion and CI
- **Objective:** Security verified automatically.
- **Dependencies:** TASK 44, TASK 30, TASK 35.
- **Implementation scope:** complete the negative-path rules tests; GitHub Actions running
  typecheck, lint, unit tests, rules tests and the concurrency suite against the emulator.
- **Acceptance criteria:** CI fails on any rules regression; no credentials in CI config
  (emulator only); the pipeline runs on pull requests.
- **Verification:** an intentionally weakened rule fails CI; reverting makes it pass.
- **Commit:** `ci(security): complete rules tests and add ci pipeline (TASK 46)`

### TASK 47 — Production configuration and release
- **Objective:** A deployable release on the Spark plan.
- **Dependencies:** TASK 46.
- **Implementation scope:** EAS build profiles (dev / preview / production), a production
  Firebase project separated from dev, the rules + indexes deployment steps, app icon,
  splash, versioning and a release checklist. **No functions deployment step exists.**
- **Acceptance criteria:** dev and production Firebase projects are separate, both on
  Spark; the deployment order is documented (**rules and indexes first, then the client**);
  a production build completes a full booking; the demo simulator and any debug path are
  excluded from the release bundle; documentation states *"Free quota applies within
  Firebase Spark plan limits."*
- **Verification:** produce a preview build and complete a full book → cancel cycle against
  the production project.
- **Commit:** `chore(release): add eas build profiles and deployment config (TASK 47)`

### TASK 48 — Documentation and handover
- **Objective:** Someone else can run, understand and extend this.
- **Dependencies:** TASK 47.
- **Implementation scope:** `README.md` (setup, emulator, seed, run, test, deploy), an
  architecture summary with a data-flow diagram, the final `docs/progress.md` update, and
  explicit statement of every accepted limitation.
- **Acceptance criteria:** a fresh clone reaches a running app by following the README
  alone; the accepted limitations (device-local notification ids, no offline booking, no
  QR scanning, rules-level quota limits) are all documented.
- **Verification:** clean-clone dry run in an empty directory.
- **Commit:** `docs(project): finalize documentation and handover (TASK 48)`

---

## Task sequence summary

| Phase | Tasks |
|---|---|
| 0 Planning | 00 baseline · **00B decision lock-in** |
| 1 Foundation | 01 scaffold · 02 strict TS · 03 architecture + domain · 04 config · 05 theme |
| 2 Firebase | 06 wiring · 07 data model (incl. `slotLocks`) · 08 auth · 09 rules v1 · 10 seed 120+ |
| 3 Server state | 11 Query foundation · 12 repositories · 13 room queries + persistence |
| 4 Client state | 14 Zustand stores · 15 client persistence |
| 5 Navigation | 16 typed navigation · 17 deep linking |
| 6 Discovery | 18 virtualized list · 19 derived room status · 20 profiling baseline |
| 7 Search/filter | 21 in-memory search · 22 filters · 23 states |
| 8 Detail/slots | 24 room detail · 25 date + slot grid |
| 9 Realtime | 26 `onSnapshot` → Query bridge · 27 lifecycle + quota guards |
| 10 Atomic booking | 28 transaction contract · **29 client `runTransaction()`** · 30 rules v2 · 31 mutation + conflict UX |
| 11 Contention demo | 32 simulation engine · 33 demo screen + script |
| 12 History | 34 history · 35 cancellation transaction · 36 offline policy |
| 13 QR/notifications | 37 QR display-only · 38 permissions · 39 reminders + id lifecycle |
| 14 Polish | 40 reanimated · 41 gestures · 42 accessibility |
| 15 Production | 43 tests · 44 concurrency regression · 45 perf regression · 46 rules + CI · 47 release · 48 handover |

**Dependency audit:** every task depends only on client-side Firebase (Auth, Firestore,
Security Rules), local scripts, or earlier tasks. **No task depends on Cloud Functions,
a `functions/` workspace, the Blaze plan, or any billing-enabled service.**

**No task is blocked on an open question.** All eight questions from TASK 00 were resolved
in TASK 00B; see `docs/progress.md` §Resolved open questions.
