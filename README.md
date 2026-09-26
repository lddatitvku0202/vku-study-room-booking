# VKU Study Room Booking — Emergency Submission MVP

VKU Mini-Project 2. A React Native (Expo) + TypeScript app for VKU students to find a
study room or computer lab and book a `(room, date, time slot)`.

- GitHub: [YOUR GITHUB URL]
- Demo: [EXPO GO / DEMO INFORMATION]
- Video: [VIDEO URL]

> **Important limitation.** This emergency submission build uses **local mock data** and a
> **local conflict simulation**. It has no backend: no Firebase, no server transaction, no
> realtime updates, and no synchronization between devices or users. Bookings are stored
> on the device only. The production Firebase architecture (Auth + Firestore
> `runTransaction()` + Security Rules) remains planned in `PLAN.md` but is **not part of
> this build**.

## Problem

1. **Fast search over 120+ rooms** on a mid-range phone: search and combined filters must
   stay responsive while scrolling a long list.
2. **Booking conflicts:** when two people try to book the same room, date and slot, only
   one may win, and the loser needs a clear message and alternatives. In this MVP the
   conflict is **simulated locally** (see [Conflict simulation](#conflict-simulation)).

## Features

- **Browse Rooms:** 120 rooms (buildings A, B, C and V, 30 each; capacity 2–20).
  - Search by room name with a 300 ms debounce.
  - Building, minimum-capacity and equipment filters, combined with AND logic, plus Clear filters.
  - Demo "Available Now / Occupied" labels, clearly marked as not live occupancy.
- **Room Details:** the next 7 days and the 4 fixed slots (07:30–09:30, 09:30–11:30,
  13:00–15:00, 15:00–17:00). Slots that have started, that you already booked, or that
  had a simulated conflict are disabled.
- **Booking:** the "Đặt phòng" button shows a spinner for 1–1.5 s and ignores double taps.
  - Success (about 70%) opens the confirmation screen.
  - A simulated conflict (about 30%) shows an alert, disables the slot, and suggests
    other free slots or similar rooms.
- **Booking pass:** a QR code with `bookingId | roomName | date | slotLabel`. It is for
  display only; the app has no scanner.
- **Reminder:** a local notification 15 minutes before the slot. Permission is asked only
  when needed, and the app keeps working if you refuse.
- **My Bookings:** Confirmed and Cancelled lists. You confirm before cancelling; a cancelled
  booking stays in the history, its slot becomes free, and its reminder is cancelled.
- **Persistence:** bookings survive an app restart (AsyncStorage).

## Tech stack

| Area | Library |
|---|---|
| App | Expo SDK 57, React Native 0.86, React 19, TypeScript 6 (strict) |
| Navigation | React Navigation 7: bottom tabs and native stack, typed params |
| Room data | TanStack Query v5 over a local mock repository (`['rooms']` query) |
| Client state | Zustand v5 with AsyncStorage persistence |
| Dates | date-fns 4 |
| QR | react-native-qrcode-svg + react-native-svg |
| Notifications | expo-notifications (local only, no push) |

## How to run

Requirements: Node.js 20+ (developed on Node 22), npm 10+, and the **Expo Go** app on a
phone (or an Android/iOS simulator).

```bash
npm install
cp .env.example .env      # required: the app checks this configuration at startup
npx expo start            # phone and computer on the same Wi-Fi
npx expo start --tunnel   # any network (uses an ngrok tunnel)
```

Scan the QR code shown in the terminal with Expo Go (Android) or the Camera app (iOS).

- `.env.example` holds **fake placeholder** Firebase values so the app boots. This build
  never contacts Firebase, and no real key is needed. Never commit `.env`.
- `--tunnel` needs `@expo/ngrok` (`npm install -g @expo/ngrok@^4.1.0`). **On Windows**, if
  Expo keeps asking to install it anyway, run the command with
  `NODE_PATH="$(npm root -g)"` in Git Bash (or `$env:NODE_PATH = npm root -g` in
  PowerShell). Expo's lookup misses npm's global folder on Windows.
- After editing `.env`, restart with `npx expo start --clear`.

Checks:

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run format:check
```

## How to use

1. **Browse Rooms:** type in the search box (e.g. `B2`) and tap filter chips. Tap
   **Clear filters** to reset.
2. Tap a room, then pick a **date** and an available **time slot**.
3. Tap **Đặt phòng**. Wait for the spinner (1–1.5 s):
   - **Success:** the confirmation screen shows the booking details, the QR pass and the
     reminder status.
   - **Simulated conflict:** the alert "Đặt phòng không thành công — Rất tiếc, phòng này vừa
     được người khác đặt thành công." appears, the slot becomes *Unavailable*, and
     Alternatives lists other free times or similar rooms.
4. **My Bookings:** switch between *Confirmed* and *Cancelled*. Tap **Cancel booking** and
   confirm; the slot can then be booked again.
5. Close and reopen the app: your bookings are still there.

## Performance strategy

Data flow: rooms → TanStack Query cache → search text → 300 ms debounce → `useMemo(filterRooms)`
→ `FlatList`.

- **Filtering is in memory.** It runs only when the rooms, the debounced search or a
  filter changes, not on every keystroke. With no active filter, the original array is
  returned unchanged.
- **The list uses `FlatList`,** with a memoized `RoomCard` (`React.memo`) and a fixed row
  height.
  - `getItemLayout` means rows never need to be measured.
  - `initialNumToRender={10}`, `maxToRenderPerBatch={10}` and `windowSize={7}` limit
    rendering work.
  - `removeClippedSubviews` detaches off-screen rows.
  - `keyExtractor` and `renderItem` are stable.
- **Selectors:** each component reads only the store fields it needs, so unrelated
  changes don't re-render it.
- **Animations are light:** built-in `Animated` on the native driver (button press,
  success-screen fade, skeleton pulse), switched off by the OS "reduce motion" setting.
  List rows are never animated.

These choices keep the list responsive in testing. **A frame rate is not guaranteed.**
Smoothness depends on the device and was not measured with a profiler.

## Conflict simulation

**This is a LOCAL CONFLICT SIMULATION, not real concurrency control.**

- `reserveRoomDemo()` (`src/services/bookingSimulator.ts`) waits a random 1–1.5 s
  (`Promise` + `setTimeout`).
- It then returns success about 70% of the time and a **simulated** conflict about 30%
  of the time. In test runs of 1,000 attempts, measured success ranged from 67.7% to
  71.1%; it is random, not exact.
- **No other user is involved.** The app shows the required conflict message, and the
  Alternatives section states that the conflict was simulated.
- What *is* enforced locally: one confirmed booking per `room + date + slot` on this
  device. The key is `roomId_date_slotId`, and a double tap cannot create two bookings.

In the planned production design, the winner is decided by a Firestore `runTransaction()`
with a `slotLocks/{roomId_date_slotId}` document and Security Rules. That design is
documented in `CLAUDE.md` and `docs/project-brief.md`, and is **not implemented in this
build**.

## Other limitations

- **In Expo Go on Android, reminders show as "not available".** `expo-notifications` fails
  there when loaded, because remote push was removed from Expo Go in SDK 53. The app
  handles this and keeps working. Real reminders on Android need a development build.
- Reminder delivery has not been checked on a physical device.
- Tapping a reminder opens the app but not the specific booking.
- Times use the phone's local time zone.
- Room images are placeholders from `picsum.photos` and need an internet connection.
- The UI is mostly English, with the Vietnamese texts required by the assignment.

## Documentation

- `docs/progress.md`: what was built, how it was verified, and known issues (per MVP step).
- `CLAUDE.md`, `PLAN.md`, `docs/project-brief.md`: the production architecture and roadmap
  (Firebase track, paused for this submission).
