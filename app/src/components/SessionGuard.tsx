import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '../features/auth/authStore';
import { colors } from '../theme/colors';

export function SessionGuard({ children, staff = false }: { children: React.ReactNode; staff?: boolean }) {
  const auth = useAuthStore();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);
  if (!hydrated) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (!auth.isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!auth.isPinVerified) return <Redirect href="/(auth)/pin" />;
  if (staff && auth.actualRole === 'member') return <Redirect href="/(member)" />;
  return <>{children}</>;
}
