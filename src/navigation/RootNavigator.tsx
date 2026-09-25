import {
  createBottomTabNavigator,
  type BottomTabNavigationOptions,
} from '@react-navigation/bottom-tabs';
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';

import { colors, typography } from '@/data/theme';
import { BookingSuccessScreen } from '@/screens/BookingSuccessScreen';
import { BrowseRoomsScreen } from '@/screens/BrowseRoomsScreen';
import { MyBookingsScreen } from '@/screens/MyBookingsScreen';
import { RoomDetailsScreen } from '@/screens/RoomDetailsScreen';

import type { MainTabParamList, RootStackParamList } from '@/navigation/types';
import type { JSX } from 'react';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const TAB_OPTIONS: BottomTabNavigationOptions = {
  // Tab screens draw their own title inside the safe area.
  headerShown: false,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.textSecondary,
  // Label-only tabs: no icon library is installed.
  tabBarIconStyle: { display: 'none' },
  tabBarItemStyle: { justifyContent: 'center' },
  tabBarLabelStyle: { ...typography.body, fontWeight: '600' },
};

const STACK_OPTIONS: NativeStackNavigationOptions = {
  headerTintColor: colors.primary,
  headerTitleStyle: { color: colors.text },
  contentStyle: { backgroundColor: colors.background },
};

function MainTabs(): JSX.Element {
  return (
    <Tabs.Navigator screenOptions={TAB_OPTIONS}>
      <Tabs.Screen
        name="BrowseRooms"
        component={BrowseRoomsScreen}
        options={{ title: 'Browse Rooms' }}
      />
      <Tabs.Screen
        name="MyBookings"
        component={MyBookingsScreen}
        options={{ title: 'My Bookings' }}
      />
    </Tabs.Navigator>
  );
}

/**
 * RootStack
 * ├── MainTabs (BrowseRooms, MyBookings)
 * ├── RoomDetails     — outside the tabs, so the tab bar hides while booking
 * └── BookingSuccess  — outside the tabs
 */
export function RootNavigator(): JSX.Element {
  return (
    <RootStack.Navigator screenOptions={STACK_OPTIONS}>
      <RootStack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <RootStack.Screen
        name="RoomDetails"
        component={RoomDetailsScreen}
        options={{ title: 'Room Details' }}
      />
      <RootStack.Screen
        name="BookingSuccess"
        component={BookingSuccessScreen}
        options={{ title: 'Booking Confirmed' }}
      />
    </RootStack.Navigator>
  );
}
