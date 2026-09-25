# VKU Mini-Project 2 — Real-time Study Room Booking App

Mobile app for VKU students to search study rooms / computer labs and book a
`(room, date, time slot)` reservation, with real-time availability and atomic
conflict prevention across concurrent users.

## Technology

Currently installed (TASK 01 scaffold):

- Expo SDK 57
- React Native 0.86
- React 19
- TypeScript 6 (strict mode)

Planned for later tasks — **not installed yet**: React Navigation, Zustand,
TanStack Query, AsyncStorage, Firebase (Auth + Firestore), expo-notifications,
react-native-qrcode-svg, react-native-reanimated, react-native-gesture-handler,
date-fns. Each is added by the task that needs it (see `PLAN.md`).

## Requirements

- Node.js 20+ (developed on Node 22)
- npm 10+
- Expo Go on a physical device, or an Android/iOS simulator

## Installation

```bash
npm install
```

Copy the environment template (values are added in TASK 04):

```bash
cp .env.example .env
```

## Run

```bash
npm start          # start the Expo dev server, then scan the QR with Expo Go
npm run android    # open on a connected Android device / emulator
npm run ios        # open on an iOS simulator (macOS only)
npm run web        # open in a browser
```

## Checks

```bash
npm run typecheck  # TypeScript validation (tsc --noEmit)
```

## Documentation

Architecture, roadmap and project state live in these files — read them before
changing anything:

- `CLAUDE.md` — permanent engineering rules
- `PLAN.md` — task roadmap
- `docs/project-brief.md` — full project context and architecture
- `docs/progress.md` — current state and architectural decisions
