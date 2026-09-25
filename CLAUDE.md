# CLAUDE.md — VKU Study Room Booking

Permanent instructions for every Claude session in this repository.
Read this file before any task. It outranks habit, convenience, and prior chat context.

**Architecture is locked as of TASK 00B.** The decisions below are not open for
re-litigation by a future session. To change one, raise it with the user, record the
outcome in `docs/progress.md`, and update this file.

---

## 1. Project identity

- **Name:** VKU Study Room Booking
- **Type:** React Native (Expo) + TypeScript mobile app, VKU Mini-Project 2.
- **Purpose:** VKU students search study rooms / computer labs and book a
  `(room, date, time slot)` reservation.
- **Two hard problems this codebase exists to solve:**
  1. Fast search + filter over **120+ rooms** on a mid-range phone.
  2. **Concurrent booking conflicts** — multiple users racing for the same
     `room + date + slot`. Exactly one must win.
- Target quality bar is **production-ready multi-user synchronization**, not a mock.

## 2. Backend model — no Cloud Functions

- **This project does NOT use Firebase Cloud Functions.** There is no `functions/`
  workspace, no Admin-SDK backend, no server-side callable.
- The project runs on the **Firebase Spark plan**. No billing, no Blaze.
  Never introduce a feature that requires billing to be enabled.
- The only backend services are **Firebase Authentication**, **Cloud Firestore**, and
  **Firestore Security Rules**.
- Documentation must never claim Spark is unlimited. The correct phrasing is:
  *"Free quota applies within Firebase Spark plan limits."*

```
React Native (Expo)
      ↓
Firebase Authentication
      ↓
Firestore Client SDK
      ↓
runTransaction()
      ↓
Cloud Firestore   ← Security Rules enforce every write
```

The one exception to "client-only": the **room seed script** is a local Node script run
by a developer from a workstation. It is not deployed, not part of the app, and not a
runtime backend.

## 3. Architecture rules

Layer boundaries are one-directional. A lower layer never imports an upper one.

```
UI (screens, components)
  -> hooks (queries, mutations, selectors)
    -> services (repositories, Firestore SDK, transactions, listeners)
      -> domain (types + pure logic; no I/O, no React, no Firebase)
```

- **No Firebase SDK import inside a screen or component.** Ever. Firebase access lives
  in `src/services/**` and is consumed through hooks.
- Pure domain logic (slot key derivation, slot math, conflict rules, date policy, filter
  predicates) must be **framework-free and unit-testable** with no mocks.
- Feature code is organized by feature folder; shared code by kind.
- Screens contain layout and wiring only. Business rules do not live in screens.
- No circular imports. No barrel file that re-exports across layers.

## 4. Source-of-truth rules (non-negotiable)

| Concern | Owner |
|---|---|
| Authoritative data | **Cloud Firestore** — `rooms`, `bookings`, `slotLocks`, `users` |
| Authoritative booking decision | **Client `runTransaction()` committed by Firestore** |
| Write enforcement boundary | **Firestore Security Rules** |
| Server state cache | **TanStack Query** |
| Client / UI state | **Zustand** |
| Persisted client cache & preferences | **AsyncStorage** |
| Multi-user synchronization | **Firestore `onSnapshot()`** → TanStack Query cache |

Zustand is not a database. AsyncStorage is not a source of truth. TanStack Query is a
cache of Firestore, not an authority.

## 5. Server vs client state separation

**Zustand must never hold server-owned entities.**
Forbidden in Zustand: room documents, booking documents, slot locks, availability,
user profile documents — anything that originates in Firestore.

Allowed in Zustand:
- search text, active filters, sort order
- selected date, selected slot id, and the draft `bookingId` (pre-commit)
- sheet/modal visibility, toasts, onboarding flags, theme
- **local notification id mapping** (`bookingId → scheduled notification id`)
- **demo mode** flags for the contention simulator
- current client session/UI information that is genuinely local

**TanStack Query owns** every Firestore read: rooms, single room, availability, slot
locks, bookings, profile. It is the only cache for server data.

Never duplicate a server entity into Zustand as a substitute for TanStack Query.
Never subscribe to a whole store when a slice will do — **always prefer selectors**:

```ts
// wrong
const store = useBookingStore()
// right
const selectedSlotId = useBookingStore((s) => s.selectedSlotId)
```

**AsyncStorage** persists two separate things, never mixed:
1. Zustand client state (filters, preferences, notification id mapping) — disposable.
2. TanStack Query cache via a persister — a **cache**, never a source of truth.

Anything read from AsyncStorage is **stale until revalidated**. It may never decide
*"is this slot free?"* or *"did this booking succeed?"*. On reconnect, server state wins.

## 6. Booking concurrency invariants

These are invariants, not preferences. Code that violates one is wrong.

1. **I1 — Uniqueness:** at most one **active** `slotLocks/{slotKey}` document may exist
   for a given `(roomId, date, slotId)`. One room + one date + one slot = **maximum one
   active reservation**.
2. **I2 — Transaction authority:** the winner is decided by **Firestore at commit time**
   inside a client `runTransaction()`. A local read never decides. Firestore's
   optimistic concurrency re-runs the transaction if the read set changed.
3. **I3 — Coupled atomic write:** the booking document and the slot lock are created in
   **one transaction**. Security Rules reject either document written without the other.
4. **I4 — Read-then-write outside a transaction is not a check.** Availability shown in
   the UI is a hint for UX only, never a reservation.
5. **I5 — Losers get a typed conflict.** A lost race surfaces `SLOT_TAKEN` honestly and
   triggers a refetch. It is never silently retried into a different slot.
6. **I6 — Idempotency:** the client generates a stable `bookingId` once per booking
   attempt. A retry reuses it, and the transaction treats
   *"lock exists and `lock.bookingId === myBookingId`"* as success — never a second booking.
7. **I7 — Cancellation releases the lock** in the same atomic operation that marks the
   booking cancelled, and only the owner may do it.
8. **I8 — Simulations never fake outcomes.** A demo harness may shape *traffic* and
   *timing*; it may never fabricate success/failure or bypass the transaction.
9. **I9 — Rules are the enforcement boundary.** The client is untrusted. Every invariant
   above that can be enforced in Security Rules **must** be — client-side correctness is
   never the only guard.

### Forbidden booking implementations

- Checking availability locally, then writing.
- Creating the booking first and the lock afterwards.
- Creating the lock first and the booking afterwards.
- Two independent writes (even back to back).
- `writeBatch` in place of `runTransaction` for the booking path — a batch is atomic but
  performs no read-set validation, so it cannot detect a concurrent winner.
- Trusting Zustand or AsyncStorage to confirm a booking.

### Required transaction shape

```
runTransaction(db, async (tx) => {
  1. derive slotKey = `${roomId}_${date}_${slotId}`   // pure, shared function
  2. tx.get(slotLocks/{slotKey})
  3. if it exists and is active:
       - if lock.bookingId === myBookingId → idempotent success (I6)
       - else → throw SLOT_TAKEN
  4. otherwise, in the same transaction:
       - tx.set(bookings/{bookingId}, …)
       - tx.set(slotLocks/{slotKey}, { bookingId, userId, roomId, date, slotId, … })
})
```

## 7. Firestore data model

| Collection | Document id | Purpose | Client writes |
|---|---|---|---|
| `rooms/{roomId}` | catalogue id | static room data | **denied** (seed script only) |
| `slotLocks/{slotKey}` | `roomId_date_slotId` | **the availability lock** | create/delete via transaction only |
| `bookings/{bookingId}` | client-generated stable id | booking record + history | create/update via transaction only |
| `users/{uid}` | auth uid | profile, preferences | self-scoped, whitelisted fields |

- `slotKey` format: `roomId_date_slotId`, e.g. `room-B205_2026-09-28_07:30-09:30`.
  The date is `yyyy-MM-dd`. The derivation is a **pure shared function** — never
  hand-built inline with template strings at a call site.
- **Do not** use a slot-map-per-room-day document: every slot of a room-day would
  contend on one document, creating a hotspot under the contention demo.
- **Do not** use the booking document itself as the availability lock: it mixes booking
  history with active availability and makes cancellation messy.
- `rooms` documents **never** store a permanent `Available` / `Occupied` field. Current
  status is **derived** from active slot locks for the current time — this is
  booking-based availability, not physical sensor occupancy.

## 8. Firestore Security Rules

With no Cloud Functions, **Security Rules are the only server-side enforcement**. They
are mandatory, not a formality.

- **Default deny.** Start from `allow read, write: if false` and open the minimum.
- `allow read, write: if true` is prohibited anywhere, at any time, including "just to test".
- Authentication is required for all access.
- A user can never forge `userId` — every written document must satisfy
  `request.resource.data.userId == request.auth.uid`.
- `rooms/**`: authenticated read; **client write denied**.
- `slotLocks/{slotKey}`: authenticated read; **never created arbitrarily**. A create is
  valid only when the coupled booking document is written in the same commit, verified
  with `getAfter()`.
- `bookings/{bookingId}`: owner read only; a create is valid only when the coupled slot
  lock is written in the same commit, verified with `getAfter()`.
- Cancellation: only the owner may mark a booking cancelled, and the lock release must be
  coupled to it in the same commit.
- Booking fields must be validated in rules: required keys, allowed status values,
  `createdAt == request.time`, and a `slotKey` that matches the booking's own
  `roomId`/`date`/`slotId`.
- **Honest limit:** rules cannot tell a `runTransaction` from a `writeBatch`. What
  `getAfter()` enforces is the **atomic coupling** of booking and lock. Lost-update
  protection comes from the transaction's read-set validation, and uniqueness comes from
  `create` semantics (a create fails if the document already exists) plus a denied
  update path on an active lock. All three together give I1.
- No secret or privileged credential is ever committed or bundled. The Firebase web
  config is public by design; the seed script's service-account key is **not** and is
  gitignored.
- A rules change requires a matching rules test before merge.

## 9. Realtime synchronization rules

```
Firestore onSnapshot()  →  TanStack Query cache  →  React UI
```

- Listener payloads are written into the **TanStack Query cache**. Never build a parallel
  Zustand availability cache, and never create a second independent server-state store.
- Listeners are exposed through a clear abstraction (e.g. `useRoomAvailability(roomId, date)`),
  not attached ad hoc inside a screen.
- Listeners are **scoped and bounded**: subscribe at the right moment, unsubscribe on
  unmount/blur, never duplicate a listener for the same key, never attach one to an
  unbounded collection, and never one per list row.
- **Realtime = freshness. Transaction = correctness.** A client may briefly see stale
  availability; the transaction still decides success vs conflict. Brief staleness is
  acceptable by design and must never be "fixed" by adding a local availability authority.

## 10. Contention demo rules (70/30)

The 70/30 requirement is **traffic/scenario distribution**, never a forced outcome.

- ~70% of simulated requests target independent free slots; ~30% target one shared hot
  slot to create genuine contention.
- Requests are paced with `Promise` + `setTimeout` in the **1–1.5 s** range to simulate
  realistic user/network timing.
- Every `SUCCESS` and `SLOT_TAKEN` result must come from a **real Firestore transaction**.
- **Absolutely forbidden:** `Math.random() < 0.3 → pretend conflict`, or any other
  fabricated result, mocked booking path, or conflict-engine bypass.
- Reported ratios are **measured**, not asserted. The observed split will approximate
  70/30 rather than match it exactly, and the docs must say so.

## 11. TypeScript rules

- `strict: true`, plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
  `noImplicitOverride`, `noFallthroughCasesInSwitch`.
- **No `any`.** Use `unknown` plus a narrowing guard. No `@ts-ignore`;
  `@ts-expect-error` only with a comment stating why and when it can go.
- No non-null assertion on external data (Firestore docs, route params, env vars).
  Validate and narrow instead.
- Every Firestore collection has an explicit type and a typed converter. Data crossing
  into the app is validated, not cast.
- Shared domain types live in one place and are imported, never redeclared.
- Navigation params, query keys, and env config are typed — no stringly-typed routes or keys.
- Public functions have explicit return types. Errors are typed unions, not strings.

## 12. Performance rules

- Search and filter over the room catalogue are **in-memory on the client, by design**:
  `Firestore → TanStack Query → 120+ rooms → 300 ms debounce → useMemo filtering → FlatList`.
  No server-side search, no Algolia, no Elasticsearch, no custom search backend.
- Any list that can exceed ~30 items uses `FlatList` — never `.map()` in a `ScrollView`.
- List requirements: stable `keyExtractor`, memoized row component, memoized `renderItem`,
  no inline object/array/arrow props passed to rows, and `getItemLayout` when row height
  is fixed.
- The search index is computed once per dataset, not per keystroke; filtering is memoized
  on `(rooms, filters, query)`.
- No `useEffect` chains for derived state — derive during render via `useMemo` or a selector.

## 13. Feature scope decisions

- **QR is display-only.** `react-native-qrcode-svg` renders a booking pass with the
  payload `bookingId | roomName | date | slotLabel`. No scanner dependency, no check-in
  backend, no scanning feature — unless the lecturer changes the requirement.
- **Expo Go is valid** for early development and for testing UI and core features. A
  **development build** is used later only when native behaviour or a production-like
  environment must be validated. Do not add native complexity early, and do not require
  a development build in TASK 01.

## 14. Scope restrictions

- **Work only on the task explicitly assigned.** One task per session.
- Do not implement future phases early, do not drive-by refactor unrelated files, do not
  rename or reformat outside the task.
- If a task cannot be finished without touching something out of scope, **stop and report**
  rather than expanding scope.
- Do not add a dependency outside the approved stack without asking first.
- Do not silently resolve an architectural conflict. Raise it, and record the outcome in
  `docs/progress.md`.
- Task scope is defined by `PLAN.md`; state is tracked in `docs/progress.md`.

## 15. Investigate before modifying

Before changing any existing file:
1. Read the file and its direct importers.
2. Check `docs/progress.md` for what is done and any known issue.
3. Check `PLAN.md` for the owning task and its acceptance criteria.
4. Prefer extending an existing module over creating a parallel one.

Never assume a file's contents. Never rewrite a file wholesale when an edit will do.

## 16. Testing expectations

- Pure domain logic (slot key, slot math, dates, filters, search, conflict rules):
  **unit tests required**, no mocks.
- Security Rules: tested against the **Firebase Emulator Suite**, including negative paths
  (forged `userId`, lock without booking, booking without lock, non-owner cancellation).
- Booking concurrency: an emulator test firing N parallel transactions at one slot,
  asserting **exactly one success** and `N-1` typed `SLOT_TAKEN` results.
- Realtime: a two-client test proving one client's commit reaches the other's UI.
- Hooks/components: test behaviour the user can observe, not implementation.
- A task is not done until its **Verification** step in `PLAN.md` passes.
- Never report success on unverified work. If something fails, say so with the real output.

## 17. Git workflow

- Branches off `main`: `feat/task-XX-slug`, `fix/…`, `chore/…`, `docs/…`.
- **One task = one branch = one focused commit.**
- Conventional Commits referencing the task —
  `feat(booking): add atomic client booking transaction (TASK 29)`.
- **Never `git push` without explicit user approval, every time.** Approval for one push
  does not carry to the next.
- **Never run destructive Git commands without explicit approval:**
  `push --force` / `--force-with-lease`, `reset --hard`, `clean -fd`,
  `checkout --` / `restore` over uncommitted work, rebase of pushed history, branch or tag
  deletion, `stash drop` / `clear`, any history rewrite, `gc --prune`.
- Do not commit unless asked. Do not open a PR unless asked.
- Never commit `.env*`, service-account JSON, keystores, or build artifacts.
- Update `docs/progress.md` as part of the task's commit.

## 18. Deployment boundaries

There are exactly **three deployables**, and they can be out of step:

1. **Mobile client** — Expo / EAS. Untrusted, holds no secrets.
2. **Firestore Security Rules** — deployed with the Firebase CLI, versioned in-repo.
3. **Firestore indexes** — `firestore.indexes.json`, deployed with the CLI.

Deployment order for a change that touches both: **rules and indexes first, then the
client.** A rules change is a security change and must be called out in the task notes.

Development may use the **Firebase Emulator Suite** where appropriate. Production uses
only the services listed in §2, within Spark plan quota limits.
