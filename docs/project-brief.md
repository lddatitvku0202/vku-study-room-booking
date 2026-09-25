# Project Brief — VKU Study Room Booking

**Architecture baseline: locked in TASK 00B.** Serverless-backend-free: no Cloud
Functions, Firebase Spark plan, client-side `runTransaction()` as the booking authority,
`slotLocks` as the availability lock, Firestore Security Rules as the enforcement boundary.

## Project name

**VKU Study Room Booking** — a real-time study room and computer lab booking app for
VKU students.

## Course context

VKU Mini-Project 2. Mobile application development with React Native. The project is
assessed on two technically substantial problems rather than feature count:

1. **Search and filter performance** over a catalogue of **120+ rooms**.
2. **Concurrent booking conflict prevention** when multiple users compete for the same
   `room + date + time slot`.

The expected standard is **production-ready multi-user synchronization** — correct under
real concurrency, not a simulated illusion of it.

## Problem statement

VKU students have no reliable way to know which study rooms or computer labs are free
and to reserve one. Informal coordination produces two failures:

- **Discovery failure** — with 120+ rooms across buildings, floors, types, capacities and
  equipment, finding a suitable free room is slow.
- **Double booking** — two students who check availability at the same moment both believe
  a room is free, and both claim it. Any design where a *local read* decides availability
  reproduces this bug, because a read and a separate write are not atomic.

The second problem is the architectural core of the project, and it is solved here
**without a custom backend**: Firestore's own transaction machinery provides the
atomicity, and Security Rules provide the enforcement.

## Objectives

1. Let a student find a suitable room among 120+ in seconds, on a mid-range phone.
2. Guarantee that a `(room, date, slot)` has **at most one active reservation**, always,
   under arbitrary concurrency.
3. Reflect other users' bookings in the UI in near real time, without manual refresh.
4. Give losers of a race an honest, specific, immediately actionable response.
5. Let students view and cancel their bookings, and show a QR booking pass.
6. Remain usable — for browsing — on a poor network, without ever compromising objective 2.
7. Run entirely within the **Firebase Spark plan**, with no billing enabled.

## Required features

- Email/password authentication with a per-user profile.
- Room catalogue of **120+ rooms**, virtualized list.
- In-memory text search (diacritic-insensitive) across name, code, building, equipment.
- Multi-dimension filters: building, type, capacity, equipment, available-now.
- Derived room status — "Available Now" / "Occupied" computed from active bookings.
- Room detail with a date selector and a time-slot grid.
- Real-time slot availability driven by Firestore `onSnapshot`.
- **Atomic booking** via a client `runTransaction()` writing a booking and its slot lock
  together, with typed conflict errors.
- Booking history with upcoming/past separation.
- Cancellation that atomically releases the slot lock.
- **Display-only** QR booking pass.
- Local reminder notifications tied to a booking's lifecycle.
- Animated, gesture-driven, accessible UI.
- A **70/30 contention simulation** demonstrating real conflict prevention.

## Non-goals

Explicitly out of scope:

- **Firebase Cloud Functions, any custom backend, and any billing-enabled service.**
- Admin/staff web console, room CRUD from the app, approval workflows.
- Payments, fines, or penalties.
- Recurring or multi-slot bookings, waitlists, group invitations.
- Chat, social features, ratings, reviews.
- Offline booking queueing (deliberately excluded — it cannot preserve invariant I1).
- **QR scanning / check-in** — the pass is display-only; no scanner dependency.
- Push notifications from a server; reminders are local and device-scoped.
- Multi-campus or multi-timezone support (single campus timezone assumed).
- SSO with a VKU identity provider.
- Analytics, crash reporting, A/B testing infrastructure.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime / tooling | React Native, Expo, TypeScript (strict) |
| Navigation | React Navigation |
| Client state | Zustand |
| Local persistence | AsyncStorage |
| Server state / cache | TanStack Query |
| Auth | Firebase Authentication |
| Database | Cloud Firestore (client SDK) |
| Write enforcement | Firestore Security Rules |
| Notifications | expo-notifications (local only) |
| QR | react-native-qrcode-svg (display only) |
| Motion / gesture | react-native-reanimated, react-native-gesture-handler |
| Dates | date-fns |
| Layout | react-native-safe-area-context |

No dependency outside this list is added without explicit approval.
**There is no backend runtime, no Admin SDK service, and no `functions/` workspace.**

## Architecture

```
                React Native / Expo
                        │
        ┌───────────────┴───────────────┐
        │                               │
     Zustand                     TanStack Query
   CLIENT STATE                   SERVER STATE
  filters · draft ids            rooms · bookings
  notification map               slotLocks · profile
  demo mode · UI                        │
        │                               │
        └───────────────┬───────────────┘
                        │
                        ▼
                 Cloud Firestore
                        ▲
                        │  onSnapshot()  ── realtime freshness
                        ▼
                       UI
```

**Booking writes — the only write path:**

```
Client
  ↓  runTransaction()
Firestore
  ├── bookings/{bookingId}
  └── slotLocks/{slotKey}          slotKey = roomId_date_slotId
      (both written in ONE atomic transaction, never separately)
```

**Security:**

```
Firebase Authentication          identity, never forgeable by the client
        +
Firestore Security Rules         the ONLY server-side enforcement
                                 · default deny
                                 · userId == request.auth.uid
                                 · getAfter() couples booking ↔ slotLock
```

**Boundaries**
- The client **reads** Firestore directly — fast, realtime, rule-scoped.
- The client **writes** bookings and locks directly too, but **only** through a
  transaction whose shape Security Rules independently verify.
- Pure logic (`buildSlotKey`, `decideBookingOutcome`, `deriveRoomStatus`) lives in
  `src/utils/`, is framework-free, and is shared between the app and its tests.
- The only non-app code is a **local seed script**, run by a developer from a workstation.
  It is not deployed and is not a runtime backend.

### Source layout (final — locked in TASK 03)

The app is organized **by kind**, in a flat `src/` tree. An earlier draft proposed a
`features/ domain/ lib/ theme/ app/` layout; that proposal was rejected and removed. Only
this structure exists:

```
src/
├── components/   reusable UI components
├── screens/      screen-level UI composition
├── navigation/   React Navigation config + typed params
├── store/        Zustand client state
├── services/     infrastructure access: Firebase / Firestore, app configuration
│                 ← the only place Firebase is imported
├── hooks/        reusable React hooks
├── types/        domain + application types (pure)
├── data/         static configuration and seed-related local data (pure)
├── utils/        pure functions
└── providers/    React providers (e.g. TanStack Query)
```

The dependency direction is `screens/components → hooks → services → types/data/utils`.
The pure layer (`types/`, `data/`, `utils/`) imports no React, no Firebase and nothing
from the layers above it, which is what keeps the booking rules testable without mocks.
Modules are imported through the `@/*` alias (`@/types/room`), never deep relative paths.

**Domain types** (one canonical definition each, all Firebase-free):

| File | Defines |
|---|---|
| `src/types/room.ts` | `Building`, `Equipment`, `Room` |
| `src/types/slot.ts` | `TimeSlot` |
| `src/types/booking.ts` | `BookingStatus`, `Booking`, `SlotLock` |
| `src/types/filters.ts` | `RoomFilters` |
| `src/types/session.ts` | `UserSession` |
| `src/data/time-slots.ts` | `TIME_SLOTS` (the four fixed slots) and the derived `SlotId` union |

Time slots are a **closed set** — `07:30-09:30`, `09:30-11:30`, `13:00-15:00`,
`15:00-17:00`. `SlotId` is derived from the definition itself, so an arbitrary
user-entered time is not representable in the type system.

## Data flow

**Read path (discovery):**
`Firestore → repository → TanStack Query cache → memoized selector → FlatList`,
with Zustand filters as an *input* to the memoized derivation, never a data store.

**Read path (realtime availability):**
`onSnapshot(slotLocks where roomId, date) → setQueryData → slot grid re-render`.

**Write path (booking):**
`UI intent → Zustand draft (slot id + stable bookingId) → useCreateBooking →
runTransaction → read slotLocks/{slotKey} → decide → write booking + lock atomically →
Security Rules verify the coupling → typed result → Query invalidation →
onSnapshot pushes the new state to every other client`.

## Firestore data model

| Collection | Document id | Purpose | Client writes |
|---|---|---|---|
| `rooms/{roomId}` | catalogue id | static room data | **denied** — seed script only |
| `slotLocks/{slotKey}` | `roomId_date_slotId` | **the availability lock** | create/delete inside a coupled transaction only |
| `bookings/{bookingId}` | stable client-generated id | booking record and history | create/update inside a coupled transaction only |
| `users/{uid}` | auth uid | profile and preferences | self-scoped, whitelisted fields |

Example slot key: `room-B205_2026-09-28_07:30-09:30`.

**Business invariant:** ONE room + ONE date + ONE slot = **MAXIMUM ONE ACTIVE RESERVATION**.

Two rejected alternatives, and why:
- **Slot-map-per-room-day document** — every slot of a room-day would contend on a single
  document, turning the contention demo into an artificial hotspot and serializing
  unrelated bookings.
- **Booking document as the lock** — mixes booking history with active availability, and
  makes cancellation awkward (a cancelled booking would either occupy the key forever or
  have to be deleted, destroying history).

A dedicated `slotLocks` collection keeps uniqueness trivially checkable, release on
cancellation trivial, and history clean.

## State management strategy

Four distinct kinds of state. Confusing any two of them is the most likely way this
project breaks.

### 1. Client state — Zustand (in-memory, ephemeral)
What the user is currently doing. Never authoritative, never a Firestore entity.
- search text, active filters, sort order
- selected date, selected slot id, and the **stable draft `bookingId`** (pre-commit)
- sheet/modal visibility, toasts, onboarding flags, theme
- **local notification id mapping** (`bookingId → scheduled notification id`)
- **demo mode** flags for the contention simulator

Components subscribe through **selectors**, never to the whole store.

### 2. Server state — TanStack Query (cache of Firestore)
Every value that originates in Firestore, and the **only** cache for it:
- room catalogue, single room, `slotLocks` / availability, my bookings, my profile
- always carries freshness metadata (stale / fetching / error) that the UI surfaces
- realtime `onSnapshot` payloads are written **into this cache** — there is no parallel
  Zustand availability store

### 3. Persistent local state — AsyncStorage (durable, still not truth)
Two strictly separated buckets:
- **Client preferences** — persisted Zustand slice (filters, theme, notification id map).
- **Query cache persistence** — a cold-start accelerator with a version and max age,
  limited to `rooms` and `profile`. **`slotLocks`, availability and `bookings` are never
  persisted**, because a stale "free" slot would invite a user into a guaranteed conflict.

Anything read from AsyncStorage is **stale until revalidated**. It may never decide
*"is this slot free?"* or *"did this booking succeed?"*. After reconnect, server state wins.

### 4. Authoritative server state — Firestore
The only state that decides anything. A reservation exists if and only if an active
`slotLocks/{slotKey}` document exists in Firestore, committed by a transaction and
accepted by Security Rules. The three layers above are projections of it and may
legitimately be wrong for a moment; the UI is designed for that rather than pretending
otherwise.

## Backend strategy

**There is no backend.** The app talks to Firebase directly:

- **Firebase Authentication** — email/password. `request.auth.uid` is the only trusted
  identity, and rules reject any document whose `userId` does not match it.
- **Cloud Firestore (client SDK)** — reads, realtime listeners, and transactional writes.
- **Firestore Security Rules** — the entire server-side enforcement layer.
- **No Cloud Functions, no Admin-SDK service, no custom API.** The consequence is that
  every server-side guarantee must be expressible in Security Rules, which is why the
  data model uses a deterministic lock key and a `getAfter()`-verifiable coupling.

## Security strategy

Because there is no trusted compute, **Security Rules are not a formality — they are the
only thing standing between a hostile client and the database.**

- Default deny; `allow read, write: if true` is prohibited everywhere, permanently.
- Authentication required for all access.
- `userId` can never be forged: every written document must satisfy
  `request.resource.data.userId == request.auth.uid`.
- `rooms`: authenticated read, client write denied.
- `slotLocks`: authenticated read; a create is valid **only** when `getAfter()` shows the
  coupled booking written in the same commit, owned by the same user, with a matching
  `slotKey`. Updating an active lock is denied outright.
- `bookings`: owner read only; a create is valid **only** when `getAfter()` shows the
  coupled lock written in the same commit pointing back at this `bookingId`.
- Cancellation: only the owner may set `status = 'cancelled'`, and a lock delete is valid
  only when `getAfter()` shows that cancellation in the same commit.
- Field validation in rules: required keys, allowed status values, `createdAt ==
  request.time`, and a `slotKey` consistent with the document's own `roomId`/`date`/`slotId`.

**Honest statement of what rules can and cannot do:** rules cannot distinguish a
`runTransaction` from a `writeBatch`. What `getAfter()` enforces is the **atomic coupling**
of booking and lock — neither can be written alone. Protection against a lost update comes
from the transaction's read-set validation, and uniqueness comes from `create` semantics
(a create fails if the document already exists) combined with a denied update path on an
active lock. The three mechanisms together deliver invariant I1.

## Concurrency strategy

The problem: availability is a **read-then-write** decision, and a local read followed by
a separate write is a race by construction.

The solution, in order:

1. **Deterministic key.** Availability is a single-document question:
   does `slotLocks/{roomId}_{date}_{slotId}` exist and is it active?
2. **Client transaction.** `runTransaction()` reads that document and either writes or
   aborts. Firestore validates the read set at commit time and automatically re-runs the
   transaction if another client changed it — so the *server* decides the winner, even
   though the code runs on the client.
3. **Coupled atomic write.** The booking and the lock are written in the same transaction.
   Rules reject either one alone, so there is no partial state and no way to construct a
   lock without a booking.
4. **Idempotency.** Each attempt carries a stable client-generated `bookingId`. A retry
   reuses it, and a lock whose `bookingId` matches is treated as success rather than a
   conflict — so a double-tap or a network retry cannot create two bookings.
5. **Typed failure.** A loser receives `SLOT_TAKEN`, the UI refetches, and the slot shows
   as taken. It never silently retries into another slot and never masks the conflict.

Invariants **I1–I9** are stated in `CLAUDE.md` §6 and each gets an automated test in
TASK 44. **Optimistic UI is deliberately not used for booking writes** — an optimistic
"booked" state would assert something only Firestore can know.

## Realtime strategy

```
Firestore onSnapshot()  →  TanStack Query cache  →  React UI
```

- A scoped `onSnapshot` over `slotLocks where roomId == … and date == …` while the slot
  grid is focused, exposed as `useRoomAvailability(roomId, date)`.
- One bounded listener over today's locks backs the "Available Now" badge for the whole
  room list — never one listener per row.
- Snapshot payloads are written into the TanStack Query cache, so there is exactly one
  representation of server state in the app. **No parallel Zustand availability cache.**
- Reference-counted subscribe/unsubscribe; detach on blur and on backgrounding; never
  duplicate a listener for the same key; never listen to an unbounded collection.
- **Realtime delivers freshness; the transaction delivers correctness.** A client may
  briefly see a stale grid — that is accepted by design, and the worst outcome is a clean,
  honest `SLOT_TAKEN`, never a double booking.

## Contention demo strategy (70/30)

The course requirement — 70% success, 30% conflict, `Promise`, `setTimeout`, 1–1.5 s — is
implemented as **traffic and scenario distribution**, never as a fabricated outcome.

- ~70% of simulated requests target independent, free slots; ~30% target one shared hot
  slot to create genuine contention.
- Requests are paced with `Promise` + `setTimeout` delays in the **1–1.5 s** range to
  simulate realistic user and network timing.
- Every `SUCCESS` and `SLOT_TAKEN` comes from a **real Firestore transaction** subject to
  the same rules as a normal booking.
- **Forbidden:** `Math.random() < 0.3 → pretend conflict`, or any other fake result,
  mocked booking path, or bypass of the conflict engine. That would demonstrate nothing.
- Results are **measured and reported**, not asserted. The observed split approximates
  70/30 rather than matching it exactly — with N participants and 30% aimed at the hot
  slot, the hot slot produces exactly one success, so the measured success rate lands
  slightly **above** 70%. The demo documentation explains this rather than hiding it.

## Performance strategy

Targets for a mid-range Android device with 120+ rooms.

**Search and filter are in-memory on the client, by design:**

```
Firestore → TanStack Query → 120+ rooms → 300 ms debounce → useMemo filtering → FlatList
```

No server-side search, no Algolia, no Elasticsearch, no custom search backend. At this
scale the cost is **re-render churn, not I/O** — 120 documents fetch once and filter in
well under a frame. The engineering effort therefore goes into virtualization and
memoization, which is where the actual bottleneck is.

- `FlatList` for every list over ~30 items; `.map()` in a `ScrollView` is prohibited.
- Memoized row components, stable `keyExtractor`, `getItemLayout` for fixed heights, tuned
  `windowSize` / `maxToRenderPerBatch` / `initialNumToRender`.
- A search index computed once per dataset, not per keystroke; 300 ms debounce.
- Filtering memoized on `(rooms, filters, query)`; pure predicates, unit tested.
- Reanimated work on the UI thread; motion must not regress the recorded list baseline.

## Room status strategy

`rooms` documents **never** store a permanent `Available` / `Occupied` field. Status is
**derived** at render time from active slot locks:

- **"Occupied"** — a confirmed booking covers the current time.
- **"Available Now"** — no confirmed booking covers the current time.

This is **booking-based availability, not physical sensor occupancy**, and the UI says so.
Deriving rather than storing removes an entire class of stale-flag bugs and means
availability is correct the moment a lock is created or released.

## Navigation strategy

- React Navigation with **fully typed** param lists; no stringly-typed routes.
- Root switch between an Auth stack and an App tab navigator, gated on auth state with no
  flash of the wrong stack.
- Tabs: **Rooms** · **My Bookings** · **Profile**.
- Native stack for Room Detail and Booking Confirmation.
- Deep linking for notification taps, handled from cold start, background and foreground;
  inaccessible targets resolve to a safe screen.
- `gesture-handler` and `reanimated` initialized at the app root per their setup requirements.

## Notification strategy

- `expo-notifications` with an explicit rationale before the permission prompt; the app is
  fully functional if permission is denied.
- **Local scheduled reminders only** — no push service and no server-side sender, which
  also keeps the project inside Spark.
- A reminder is scheduled on booking success and cancelled on booking cancellation.
- Tapping a notification deep links to the booking.
- The scheduled notification id is stored in Zustand (`bookingId → notificationId`) and
  persisted to AsyncStorage.
- **Accepted limitation:** notification ids are device-local. Cancelling a booking on
  device B cannot clear a reminder already scheduled on device A; that device clears it on
  next open. This is documented in the README and in the UI rather than hidden. Fixing it
  properly would require server-side scheduling, which needs a backend the project has
  deliberately excluded.

## Development environment strategy

- **Expo Go is used for early development** and for testing UI and core features. It is
  sufficient for the majority of this project.
- A **development build** is produced later, only when native behaviour or a
  production-like environment must be validated (for example, notification behaviour that
  Expo Go restricts), and before final production validation.
- No native complexity is added early, and **TASK 01 does not require a development build**.
- The **Firebase Emulator Suite** is used where appropriate for rules tests, concurrency
  tests and seeding, so development never touches production data.

## Deployment strategy

Exactly **three deployables**, which can be out of step:

1. **Mobile client** — Expo / EAS (dev, preview, production profiles).
2. **Firestore Security Rules** — Firebase CLI, versioned in-repo.
3. **Firestore indexes** — `firestore.indexes.json`, Firebase CLI.

Deployment order for a change touching more than one: **rules and indexes first, then the
client.** There is no functions deployment step.

Separate dev and production Firebase projects, **both on the Spark plan**.

## Billing assumptions

- The project runs on the **Firebase Spark plan** with **no billing enabled**.
- No feature that requires Blaze may be introduced — in particular Cloud Functions, which
  is why the booking authority is a client transaction.
- **Free quota applies within Firebase Spark plan limits.** Spark is not unlimited: daily
  document read, write and delete quotas apply, and exceeding them stops requests until
  the quota resets. Listener and read volume is therefore budgeted explicitly in TASK 27,
  and the contention demo is run against the emulator or a dev project rather than
  production.

## Accepted limitations

Consequences of the locked architecture, stated openly rather than discovered later:

1. **Notification ids are device-local** (see Notification strategy).
2. **No offline booking.** Reads are cached; writes require connectivity. A queued write
   would replay later against a changed lock state and could not preserve I1.
3. **No QR scanning or check-in.** The pass is display-only.
4. **Per-user booking quotas are hard to enforce.** Security Rules cannot count documents
   across a collection. Enforcing "max N active bookings per user" would need a counter
   document maintained in the same transaction and validated with `getAfter()`. Not in
   scope; if the lecturer requires it, it is a design change, not a bug fix.
5. **Rules carry the full security burden.** With no trusted compute, any guarantee that
   cannot be expressed in Security Rules cannot be enforced at all. This is the deliberate
   trade for staying on Spark, and it is why the rules test suite is mandatory rather than
   optional.
6. **Spark quota limits apply** and are budgeted, not assumed away.

---

## Open questions

**None.** All eight open questions raised in TASK 00 were resolved by the user's decisions
in TASK 00B; the resolutions are recorded in `docs/progress.md` §Resolved open questions
and are reflected throughout this document.

A future session that believes it has found a new architectural conflict must **document
it here and raise it with the user** rather than resolving it silently — see `CLAUDE.md` §14.
