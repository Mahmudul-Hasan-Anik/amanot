import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { View } from 'react-native';
import { SessionGuard } from '../../src/components/SessionGuard';
import { SyncStatus } from '../../src/components/SyncStatus';

export default function MemberLayout() {
  return (
    <SessionGuard><View style={{flex:1}}><SyncStatus /><Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ headerShown: false }} />
    </Stack></View></SessionGuard>
  );
}
