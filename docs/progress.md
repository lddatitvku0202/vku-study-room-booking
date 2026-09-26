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

## MVP-02

Status: READY FOR REVIEW
Implemented:
- **Debounced search** — `src/hooks/useDebounce.ts` (generic; each change restarts the
  timer, cleared in the effect cleanup). Flow: `TextInput → searchText → useDebounce(300 ms)
  → useMemo(filterRooms) → FlatList`. Search matches room name, case-insensitive, trimmed.
  A "Searching…" summary shows while the debounce is pending.
- **Pure filtering** — `src/utils/room-filters.ts`: `filterRooms`, `hasActiveFilters`,
  `EMPTY_FILTERS`, on the existing `RoomFilters` type. **AND logic across everything**:
  name AND building AND capacity ≥ minimum AND **all** selected equipment. With no active
  criteria it returns the same array reference, so FlatList data stays stable.
- **`filteredRooms` uses `useMemo`** with exact dependencies
  `[allRooms, debouncedSearch, building, minimumCapacity, equipment]`. No filtering in JSX or
  `renderItem`.
- **Filter UI** — `src/components/FilterChip.tsx` (reusable, `React.memo`, 36pt chip with
  hitSlop to reach the 44pt target, `accessibilityState.selected`) and
  `src/components/FilterChipGroup.tsx` (generic over the option type, one labelled
  horizontal `FlatList` per group — no casts). Groups: Building A/B/C/V (single-select,
  tap again to deselect), Capacity 4+/6+/10+/15+/20+ (single-select minimum), Equipment
  (multi-select). "Clear filters" resets search and all filters; it also appears in the
  no-results empty state.
- **Status presentation** — the card badge now reads **"Available Now" / "Occupied"**, and
  the screen states "Demo data · status is a preview, not live occupancy". Status still
  comes from the deterministic `getMockRoomStatus` util (MVP-01), computed once per dataset.
- **RoomCard layout** — the status badge moved to its own line next to the seat count so
  it no longer truncates the room name (the code users search for). Fixed height raised
  128 → 136pt (row 152pt); `getItemLayout` still reads the same constant. `React.memo` kept.
- Filter criteria are local screen state for now; the Zustand store arrives in MVP-04.
Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0, after an auto-fixed import-order nit)
  npm run format:check → PASS (exit 0)
  Filter logic (real `filterRooms` on the real 120-room dataset) → 13/13 PASS:
    1. search "B2"                     → 6 rooms (B201–B206); "b2" and "  B2 " identical
    2. Building B                      → 30 rooms
    3. Capacity ≥ 10                   → 60 rooms
    4. Projector                       → 60 rooms
    5. B AND ≥10 AND Projector         → 11 rooms; + search "B2" → 3 (B201, B203, B206)
       Projector AND AC                → 45 rooms (fewer than Projector alone — AND, not OR)
    6. Clear filters                   → 120 rooms, same array reference
       no match ("zzz")                → empty list → empty state
  Structure → debounce constant 300; FlatList props intact (`getItemLayout`, `keyExtractor`,
    10 / 10 / 7, `removeClippedSubviews`); RoomCard still `React.memo`; no ScrollView; no `any`
  Metro bundle → PASS — android and ios HTTP 200 (817 modules)
Known issues:
- **Debounce timing and scroll smoothness not verified on a device** — no device or
  simulator here, and no React test renderer is installed (a test framework is TASK 43).
  The hook is the standard clear-and-restart pattern; on device, typing fast should show
  "Searching…" and update the list once, about 300 ms after the last keystroke.
- Equipment uses "must have all selected". PLAN.md TASK 22 (production) describes OR within
  a dimension; the MVP follows this task's "search + all filters: AND logic".
- The fixed header (title, search, three chip rows, summary) takes about 300pt, so small
  phones show roughly two cards at a time.
Commit: `feat(mvp): add debounced search and room filters`
Next: MVP-03

## MVP-03

Status: READY FOR REVIEW
Implemented:
- **Dependencies** (via `npx expo install`, all SDK 57 compatible — `expo install --check`
  reports "Dependencies are up to date"): `@react-navigation/native@^7.4.1`,
  `@react-navigation/native-stack@^7.19.2`, `@react-navigation/bottom-tabs@^7.19.2`,
  `react-native-screens@~4.26.0`, `react-native-safe-area-context@~5.7.0` (already present),
  and `date-fns@^4.4.0` for the date selector. No icon or gesture library.
- **Typed navigation** — `src/navigation/types.ts`: `RootStackParamList`
  (`MainTabs`, `RoomDetails: { roomId: string }`, `BookingSuccess: { bookingId: string }`),
  `MainTabParamList` (`BrowseRooms`, `MyBookings`), plus `RootStackScreenProps` and
  `MainTabScreenProps` (composite, so a tab screen can open root routes). `MainTabs` is
  typed `NavigatorScreenParams<MainTabParamList> | undefined` — React Navigation's nested
  navigator convention; plain `undefined` still works as specified.
- **Navigators** — `src/navigation/RootNavigator.tsx`: native stack
  `MainTabs → RoomDetails → BookingSuccess`, with `RoomDetails` and `BookingSuccess` outside
  the tabs; bottom tabs `BrowseRooms` / `MyBookings` (label-only, no icon library).
  `App.tsx` wraps it in `NavigationContainer` with a token-based theme, inside
  `SafeAreaProvider` and `QueryProvider`.
- **Browse → details** — `RoomCard` is now pressable; the screen passes one stable
  `openRoom` callback, so `React.memo` still holds. It navigates with `{ roomId }` only.
- **`RoomDetailsScreen`** — reads the room with the new `useRoom(roomId)`, which selects from
  the same `['rooms']` cache (no second fetch). Shows image, name, building, floor, capacity,
  equipment badges and the demo status ("Demo status, not live occupancy"). Handles loading,
  error and unknown-id states.
- **Date selector** — horizontal `FlatList` of `DateChip`s: 7 days starting today, keys in
  `yyyy-MM-dd` via `date-fns` (`src/utils/booking-dates.ts`, pure; the current time is
  passed in). `src/hooks/useNow.ts` ticks every minute so "today" and past slots stay right
  while the screen is open.
- **Fixed slots** — the existing `TIME_SLOTS`, exactly 07:30–09:30, 09:30–11:30, 13:00–15:00,
  15:00–17:00, in a 2-column `FlatList` of `SlotCard`s; no time input exists. A slot counts
  as past **from its start minute** (a slot already under way cannot be booked), and past
  slots are disabled.
- **"Đặt phòng" button** in a fixed bottom bar — disabled until a date inside the 7-day window
  **and** a slot that has not started are both selected. Pressing it only shows a
  placeholder alert; **no booking is created** (MVP-04).
- `BookingSuccessScreen` (shows the `bookingId`, "Back to rooms" → `popToTop`) and
  `MyBookingsScreen` (placeholder) are registered.
Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0)
  npm run format:check → PASS (exit 0, after Prettier re-wrapped `RootNavigator.tsx`)
  npx expo install --check → PASS ("Dependencies are up to date")
  Date/slot logic (real helpers) → 12/12 PASS: 7 consecutive days from today, all
    `YYYY-MM-DD`; month and year boundaries (2026-12-29 → 2027-01-04); exactly 4 fixed
    slots; at 10:00 today 07:30 and 09:30 are past, 13:00 and 15:00 open; tomorrow none past;
    past from the exact start minute (12:59 open, 13:00 past); invalid date never selectable
  Navigation type probe (temporary, deleted) → the 5 valid calls compile; all 5 invalid
    calls are compile errors: numeric `roomId`, missing params, unknown route, `roomId` passed
    to `BookingSuccess`, empty params
  Metro bundle → PASS — android and ios HTTP 200 (1379 modules)
Known issues:
- **Manual navigation checks not run on a device** (open browse, tap card, back, 7 dates,
  4 slots, past slots disabled, button enabling) — no device or simulator here. Logic and
  types behind each check are verified above.
- Tabs are label-only because no icon library is installed (the task limits dependencies).
- The UI is English except the Vietnamese copy this task specifies ("Đặt phòng"); pick one
  language before submission.
- Times use the device's local timezone; the MVP assumes the device is on campus time.
Commit: `feat(mvp): add typed navigation and room details`
Next: MVP-04

## MVP-04

Status: READY FOR REVIEW

> **The conflict engine is a LOCAL DEMO SIMULATION.** ~30% of booking attempts fail at
> random via `Math.random()`. There is **no Firebase, no realtime listener and no
> multi-user conflict** in the MVP — no other user exists. Bookings are stored on the
> device only and are not synchronized between devices or users.

Implemented:
- **Dependencies** — `zustand@^5.0.15`, `@react-native-async-storage/async-storage@2.2.0`
  (via `npx expo install`; `expo install --check` → up to date).
- **`buildSlotKey()`** — `src/utils/slot-key.ts`, the single definition:
  `roomId_date_slotId`, e.g. `room-B205_2026-09-28_07:30-09:30`. The task text renders the
  separator as `*`, but its own example and CLAUDE.md use `_`, so `_` is used.
- **Store** — `src/store/useBookingStore.ts` (Zustand): `bookings`, `filters`,
  `conflictedSlotKeys`; actions `addBooking`, `cancelBooking`, `markSlotConflict`,
  `clearConflict`, plus filter actions. Every component reads through a narrow selector
  (no whole-store subscription anywhere). Browse Rooms now takes its filters from the store.
- **Persistence** — Zustand `persist` + `createJSONStorage(() => AsyncStorage)`, version 1,
  `partialize` saves **only `bookings`** (filters and conflict marks reset on restart, so a
  random demo conflict never blocks a slot permanently). `merge` re-validates every saved
  entry with `isBooking()` and drops malformed ones.
- **Local duplicate prevention** — before sending, a confirmed booking on the same slot key
  is rejected; `addBooking` re-checks atomically and refuses a taken slot or a repeated id.
  Cancelled bookings do not block a slot.
- **Demo simulator** — `src/services/bookingSimulator.ts`: `reserveRoomDemo()` =
  `Promise` + `setTimeout`, random delay 1000–1500 ms, ~70% success / ~30% simulated
  conflict, typed result `{ kind: 'success', booking } | { kind: 'conflict', slotKey }`.
  The file header states it is not concurrency control and must not be reused as one.
- **Booking flow** (`RoomDetailsScreen`) — "Đặt phòng" shows an `ActivityIndicator` and is
  disabled while in flight; a synchronous ref guard blocks a double tap before re-render.
  Success → booking built with `userId: 'demo-user'`, `status: 'confirmed'`, `createdAt`,
  saved through the store, and **only then** navigate to `BookingSuccess` with `bookingId`.
  Booking is also blocked until saved bookings have finished loading.
- **Conflict UX** — alert with the exact title "Đặt phòng không thành công" and message
  "Rất tiếc, phòng này vừa được người khác đặt thành công."; the slot is marked conflicted and
  disabled ("Unavailable"); the user stays on the room; an Alternatives section suggests
  other free slots of the same room on that date, or — if none — up to 3 similar rooms
  (`src/utils/similar-rooms.ts`: shared equipment, ≤ 6 seats difference, same building
  ranked first, excluding rooms already taken or conflicted for that slot).
- **Honesty line added** — the Alternatives section says "Demo mode: this conflict was
  simulated (about 30% of attempts). No other user booked this room." The required message
  itself says another person booked the room, which conflicts with this task's own rule
  "never describe random failure as real multi-user conflict"; the required copy is kept
  word for word, and this one line reconciles the two. Delete it if not wanted.
- `BookingSuccessScreen` shows the saved booking; `MyBookingsScreen` shows how many
  confirmed bookings are saved on the device (makes persistence visible; the full list is
  MVP-05). `AppButton` gained a `loading` prop; `SlotCard` gained `booked` / `conflicted`.
Deliberate MVP exceptions to CLAUDE.md (production rules unchanged):
1. **§10 / I8** forbid random outcomes; this task requires a random 70/30 simulator. Allowed
   for the demo only, labelled everywhere, never presented as real concurrency.
2. **§5** keeps bookings out of Zustand (they are server state). The MVP has no server, so
   demo bookings live in Zustand + AsyncStorage by this task's instruction.
Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0, after an auto-fixed import-order nit)
  npm run format:check → PASS (exit 0)
  Real store + simulator run in Node (only AsyncStorage replaced by an in-memory stand-in)
    → 32/32 PASS:
    slot key: spec example format; deterministic; room/date/slot each change the key
    10 sequential attempts with real delays → 7 success / 3 conflict (a second run: 8 / 2),
      every attempt 1000–1500 ms
    1000 parallel attempts → 69.6% success / 30.4% conflict (second run 67.7% / 32.3%);
      delays min 1000–1001 ms, max 1500 ms
    duplicates: same slot new id → rejected; same id → rejected; two successful results for
      one slot ("double tap") → one booking; cancel frees the slot for rebooking
    conflicts: mark idempotent, clear works; filters: all toggles work
    persistence: only `bookings` stored; after a simulated app restart (store re-created
      over the same storage) all bookings are restored, filters/conflicts reset, and the
      same confirmed slot is still rejected; malformed saved entries are dropped
    similar rooms: 3 results, all share equipment within 6 seats, same building first
  Metro bundle → PASS — android and ios HTTP 200 (1391 modules); zero `@firebase/` code
Known issues:
- **Found and fixed during verification:** with unreadable saved data, zustand's `persist`
  swallows the parse error and never marks the store hydrated — booking would have stayed
  disabled forever ("Loading your saved bookings…"). Hydration is now tracked through
  `onRehydrateStorage`, which settles on failure too; the store starts empty and booking
  works (3 added checks cover this).
- **Manual on-device steps not run** (spinner visible, alert shown, disabled slot, restart
  persistence on a real device) — no device or simulator here. The logic behind every
  step is verified above.
- Demo bookings are device-local: reinstalling the app or clearing its data removes them.
- The UI is English except the Vietnamese copy this task specifies.
Commit: `feat(mvp): add local booking and conflict simulation`
Next: MVP-05

## MVP-05

Status: READY FOR REVIEW

> Still **local demo only**: no Firebase. Cancelling changes the booking saved on this
> device; nothing is sent anywhere and no other user is affected.

Implemented:
- **My Bookings** (`src/screens/MyBookingsScreen.tsx`) — a `FlatList` of the saved demo
  bookings, read with the selector `useBookingStore((state) => state.bookings)` (no
  whole-store subscription). Each row (`src/components/BookingCard.tsx`, memoized) shows
  room, building, date, time slot, booking ID and a status badge. Stable `keyExtractor`,
  memoized `renderItem`, item separator component.
- **Status filter** — "Confirmed (n)" / "Cancelled (n)" chips, Confirmed selected by
  default; each list sorted by date, then start time (`src/utils/booking-list.ts`, pure).
  Only confirmed bookings show a **Cancel booking** button; cancelled ones show none.
- **States** — while saved bookings load: spinner + "Loading your bookings…"; no bookings
  at all: "Bạn chưa có lịch đặt phòng" with a "Browse rooms" action; an empty filter:
  "No confirmed bookings" / "No cancelled bookings".
- **Cancel** — the button opens a confirmation `Alert` ("Cancel this booking?", room, date
  and slot; "Keep booking" / "Cancel booking"). On confirm, `useCancelBooking()`
  (`src/hooks/useCancelBooking.ts`) calls the store's `cancelBooking`, which in **one
  update**: sets `status: 'cancelled'` (the booking is **kept as history**, never deleted),
  frees the slot (a slot is taken only by a *confirmed* booking, so Room Details shows it
  available again), removes the conflict mark for that slot, and removes the booking's
  notification id. It returns a typed result: `cancelled` (with the notification id, if
  any) / `already-cancelled` / `not-found`.
- **Notification cancellation hook** — the store now keeps `notificationIdsByBookingId`
  (`bookingId → notification id`; allowed in Zustand by CLAUDE.md §5) and persists it. If
  a cancelled booking had an id, the hook calls `cancelScheduledNotification()` in
  `src/services/local-notifications.ts`. **No notification library is installed**
  (`expo-notifications` is production TASK 38/39), so nothing is scheduled yet, the map is
  always empty in the app, and the service honestly returns `'unavailable'` instead of
  claiming a cancellation. When reminders are added, only that service file changes.
- **Persistence** — still version 1. Data saved by MVP-04 (no id map) loads with its
  bookings and an empty map; a version bump would have discarded saved bookings, since
  zustand drops state that has no migration. Malformed map entries are dropped on load.
- No swipe gesture (explicit button only, per the task).

Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0)
  npm run format:check → PASS (exit 0, after one Prettier fix)
  Real store + real `useCancelBooking` hook run in Node (only AsyncStorage and React's hook
  functions replaced by stand-ins) → 25/25 PASS:
    1–2 a new booking appears in the Confirmed list with status confirmed; sorted by date
        and time; counts 3 / 0
    4   cancel → status cancelled; typed result carries the notification id
    5   booking kept as history: still 3 bookings, now in the Cancelled list, counts 2 / 1
    6   slot freed (no longer a booked key); a new booking on the same slot → added;
        that slot's conflict mark removed, other conflict marks kept
        notification: id present → cancel requested once with that id, id removed from the
        map, other bookings' ids kept; no id → no call; service returns 'unavailable'
        cancel twice → 'already-cancelled', unknown id → 'not-found', nothing changes
    7   simulated restart: bookings identical, cancelled still cancelled, id map restored,
        freed slot still bookable; MVP-04-format data loads; malformed map entries dropped
  MVP-04 suite re-run on the new store → 31/32; the one failure is its old assertion
    "only `bookings` is persisted", now intentionally `bookings` + the id map
  Metro bundle → PASS — android and ios HTTP 200; zero `@firebase/` code
  8   FlatList used — yes (code review)
Known issues:
- **Not run on a device** (no device or simulator here): test 3 (the confirmation Alert
  appearing) and the visual checks are code-reviewed only; the logic behind every other
  step is verified above.
- A confirmed booking whose time has already passed can still be cancelled; that frees a
  past slot, which stays disabled anyway.
- Booking cards are not fixed-height, so the list has no `getItemLayout`. A student's
  bookings are a short list, and fixed heights would clip text at large font sizes.
- `BookingSuccessScreen` still shows a fixed "Confirmed" badge; it is only reached right
  after booking, before any cancel is possible.
- The UI is English except the Vietnamese copy the tasks specify.
Next: MVP-06

## MVP-06

Status: READY FOR REVIEW

> Still local demo only: no Firebase. The QR pass is **display-only** (no scanner, no
> check-in). Reminders are **local** notifications scheduled on this device; there is no
> push service. **Notifications have not been tested on a physical device** — see below.

Implemented:
- **Dependencies** (via `npx expo install`, `expo install --check` → up to date):
  `react-native-qrcode-svg@^6.3.26`, `react-native-svg@15.15.4` (its required SVG renderer),
  `expo-notifications@~57.0.21`. All three are in the approved stack (project brief).
  **Reanimated not added** (see Animation).
- **QR booking pass** — `BookingSuccessScreen` shows a success mark, the status, a QR card
  (`src/components/BookingPass.tsx`) and the booking ID, room, building, date and slot.
  Payload from the pure `buildBookingPassPayload()` (`src/utils/booking-pass.ts`):
  `bookingId | roomName | date | slotLabel`, e.g.
  `demo-abc | Study Room B205 | 2026-09-28 | 07:30 - 09:30`. The payload text is also shown
  under the QR, so it can be checked by eye. The task's example shows `B205`; the formula says
  `roomName`, whose value is "Study Room B205", so the formula was followed.
- **Reminder** — pure rules in `src/utils/booking-reminder.ts`: fires at
  `startTime − 15 min` on the booking date (local time); title "Nhắc lịch đặt phòng"; body
  "Sắp đến giờ sử dụng phòng [roomName] lúc [startTime]"; **not scheduled if that time has
  already passed** (also no permission prompt then). `scheduleBookingReminder()`
  (`src/hooks/useBookingReminder.ts`) runs when the success screen opens, i.e. only after the
  booking was saved; it runs once per booking (a remount or a second effect run reuses the
  first attempt, so nothing is scheduled twice).
- **Notification id lifecycle** — the id is stored in Zustand as
  `notificationIds: Record<string, string>` (`bookingId → id`), persisted with the bookings
  (renamed from MVP-05's always-empty `notificationIdsByBookingId`; old saved data still
  loads). It is client state only: it says which reminder to cancel, never whether a booking
  exists. On cancel (MVP-05 flow) the id is removed and the scheduled notification is
  cancelled. If the booking is cancelled while the permission prompt is still open, the
  just-scheduled reminder is cancelled and no id is kept.
- **Permission** — asked only when a reminder is actually needed, and only if not decided
  yet (no re-prompt after a permanent deny; iOS provisional counts as allowed). Denied → no
  crash; the success screen says "Notifications are off, so no reminder was set. Your booking
  is saved." with an **Open Settings** button. On Android the reminder channel is created
  before the prompt (Android 13+ needs one). A foreground handler shows reminders while the
  app is open; it is installed at app start (`useNotificationSetup`) without asking.
- **Expo Go safety** — found while reading the library: in Expo Go on Android,
  `expo-notifications` **throws when first imported** (its push-token setup; remote push was
  removed from Expo Go in SDK 53). A normal import would crash the app at startup. The service
  (`src/services/local-notifications.ts`) loads it with a guarded dynamic `import()`, so that
  case becomes "Reminders are not available here…" and the booking flow keeps working. Every
  service function resolves; none throws to the UI.
- **UI polish** (existing theme tokens only):
  - `AppButton`: new `danger` variant (used for "Cancel booking"); disabled text stays readable.
  - Slot states now look different, not only by caption: past = dashed and faded, your
    booking = thick primary border ("Your booking"), unavailable = red border.
  - Loading skeletons pulse gently.
  - `EmptyState` takes an optional icon; message width capped.
  - Booking card puts date and time first.
  - Conflict Alert: the required title and message are unchanged; its button
    "Xem lựa chọn khác" scrolls to the Alternatives section.
  - Success screen: success mark, QR card, reminder notice, and two actions
    ("View my bookings", "Back to rooms"). It now shows "Booking cancelled" if the booking was
    cancelled (fixes an MVP-05 known issue).
- **Animation** — React Native's built-in `Animated` on the native driver, not Reanimated:
  a slight press shrink on `AppButton`, one fade-and-rise on the success screen, and the
  skeleton pulse. All are skipped when the OS "reduce motion" setting is on. **No RoomCard
  entrance:** rows in a virtualized list remount as you scroll, so an entrance would replay
  constantly across 120 rooms. Reanimated 4 needs `react-native-worklets` and its Babel
  plugin, which could not be checked on a device here; the task says to drop the animation
  rather than risk the MVP, so it was not added.

Verification:
  npm run typecheck    → PASS (exit 0)
  npm run lint         → PASS (exit 0, after fixing 16 react-hooks/refs errors:
                         `useRef(...).current` during render → `useState(() => ...)`)
  npm run format:check → PASS
  Real reminder rules, service, store and hooks run in Node. `expo-notifications`,
  `react-native` and React's hook functions are replaced with scripted stand-ins, so this
  checks OUR logic against the library's API, not the OS notifications themselves
  → 43/43 PASS:
    QR payload: spec example exact; real booking → `id | roomName | date | slotLabel`
    rules: 07:30 → 07:15; 13:00 → 12:45; 00:10 → previous day 23:55; at 07:14 schedule; at
      exactly 07:15 or later not scheduled; unreadable date not scheduled; title/body exact
    granted: DATE trigger at start − 15 min on the reminder channel, content and
      `data.bookingId` correct, id stored in `notificationIds`, no needless prompt, remount
      does not schedule twice
    too late: nothing scheduled, no permission prompt, no id
    cancel: notification cancelled with the stored id, mapping removed, booking kept
    permission: undetermined → one prompt → scheduled; channel created before the prompt;
      user denies → "permission-denied", nothing scheduled, booking unaffected; permanent deny
      → no re-prompt; iOS provisional allowed
    failures: module import throws (Expo Go Android) → "unavailable", booking and cancel still
      work; scheduling throws → "unavailable", no id
    cancelled during the prompt → reminder cancelled, no id kept
    restart: bookings (confirmed + cancelled) and ids restored; no second schedule; cancel
      after restart cancels the stored notification; MVP-05 saved data loads
  MVP-05 suite re-run on this code → PASS (two assertions updated on purpose: the map is now
    `notificationIds`, and cancelling now reports "cancelled" because the library is real)
  Metro bundle → PASS — android and ios HTTP 200; zero `@firebase/` code; lazy (dev) mode:
    the split-out `expo-notifications` chunk also builds (HTTP 200)

Manual physical-device test — **NOT RUN: no physical device or simulator is available**:
  1. Successful booking ........................ NOT VERIFIED on device (logic verified above)
  2. QR visible ................................ NOT VERIFIED
  3. QR contains correct payload ............... NOT VERIFIED on device (payload builder verified)
  4. Notification permission prompt ........... NOT VERIFIED
  5. Reminder scheduled / delivered ............ NOT VERIFIED
  6. Cancel booking ............................ NOT VERIFIED on device (logic verified above)
  7. Notification cancellation ................. NOT VERIFIED
  8. Restart app ............................... NOT VERIFIED on device (simulated restart passes)
  9. Booking remains ........................... NOT VERIFIED on device (simulated restart passes)
  10. UI no crash .............................. NOT VERIFIED
Known issues:
- **Expo Go on Android:** reminders are expected to show "not available" (see Expo Go
  safety). Real reminders on Android need a development build. iOS Expo Go should support
  local notifications — unverified.
- Reminder timing uses the device's local time zone (same assumption as the slot picker).
- Tapping a reminder opens the app but not the booking (deep links are production TASK 39).
- No `expo-notifications` config plugin in `app.config.ts`; not needed for Expo Go or for
  local notifications with default icon and colour.
Next: MVP-07

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
