import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="member/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="member/new" options={{ headerShown: false }} />
      <Stack.Screen name="deposit/new" options={{ headerShown: false }} />
      <Stack.Screen name="receipt/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="due" options={{ headerShown: false }} />
      <Stack.Screen name="reminder" options={{ headerShown: false }} />
      <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="finance" options={{ headerShown: false }} />
      <Stack.Screen name="expense/new" options={{ headerShown: false }} />
      <Stack.Screen name="approvals" options={{ headerShown: false }} />
      <Stack.Screen name="analytics" options={{ headerShown: false }} />
      <Stack.Screen name="reports" options={{ headerShown: false }} />
      <Stack.Screen name="statement" options={{ headerShown: false }} />
      <Stack.Screen name="distribution" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="somiti" options={{ headerShown: false }} />
      <Stack.Screen name="audit" options={{ headerShown: false }} />
    </Stack>
  );
}
