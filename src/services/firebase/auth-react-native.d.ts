/**
 * Type declaration for Firebase Auth's React Native persistence.
 *
 * Why this exists: `@firebase/auth` lists a top-level `"types"` entry before its
 * `"react-native"` export condition, so TypeScript always resolves the web
 * typings (`auth-public.d.ts`), which omit `getReactNativePersistence`. At runtime
 * Metro honours the `"react-native"` condition on iOS/Android and loads the RN
 * build, where the function exists (signature copied from
 * `@firebase/auth/dist/rn/index.rn.d.ts`). This avoids a `@ts-expect-error` or a cast.
 *
 * Only `auth-persistence.native.ts` may call it — the web build does not have it.
 *
 * Remove when: Firebase's published `firebase/auth` typings include
 * `getReactNativePersistence`; `npm run typecheck` then passes without this file.
 */

import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
