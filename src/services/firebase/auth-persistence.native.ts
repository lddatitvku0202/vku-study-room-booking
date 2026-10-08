/**
 * Firebase Auth persistence — iOS / Android build (AD-40).
 *
 * Without this, Auth on React Native falls back to memory and every launch would
 * start a new anonymous user (and lose "My Bookings"). `getReactNativePersistence`
 * exists only in Firebase Auth's React Native build, which Metro resolves through
 * the package's `react-native` export condition; see `auth-react-native.d.ts`
 * for why TypeScript needs a declaration for it.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getReactNativePersistence, type Persistence } from 'firebase/auth';

export function createAuthPersistence(): Persistence {
  return getReactNativePersistence(AsyncStorage);
}
