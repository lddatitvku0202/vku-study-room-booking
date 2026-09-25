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

Create your local environment file:

```bash
cp .env.example .env
```

`.env` is gitignored and **required** — the app validates its configuration at
startup and refuses to boot with a listed explanation if anything is missing or
malformed, rather than failing later with an `undefined`. Each variable is
documented in `.env.example`.

The Firebase values are placeholders until the Firebase project is created; the
Firebase *web* config is public by design and is not a secret. Privileged
credentials (service-account JSON, private keys) never go in this file.

After changing `.env`, restart with a cache clear:

```bash
npx expo start --clear
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
