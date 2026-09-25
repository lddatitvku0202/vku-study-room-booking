/**
 * Typed navigation contracts. Every route and its params are declared here, so
 * a wrong route name or a missing param is a compile error, not a runtime crash.
 *
 *   RootStack
 *   ├── MainTabs
 *   │   ├── BrowseRooms
 *   │   └── MyBookings
 *   ├── RoomDetails      (outside the tabs)
 *   └── BookingSuccess   (outside the tabs)
 */

import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type MainTabParamList = {
  BrowseRooms: undefined;
  MyBookings: undefined;
};

export type RootStackParamList = {
  /**
   * The tab navigator. Accepts `undefined` (open the default tab) or, per React
   * Navigation's nested-navigator convention, a specific tab to open.
   */
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  RoomDetails: { roomId: string };
  BookingSuccess: { bookingId: string };
};

/** Props for a screen registered directly on the root stack. */
export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

/** Props for a tab screen, which can also navigate to root-stack routes. */
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;
