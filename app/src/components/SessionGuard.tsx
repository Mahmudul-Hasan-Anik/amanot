import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAuthStore } from '../features/auth/authStore';
import { REMOTE, useSomitiStore } from '../store/somitiStore';
import { useLanguage } from '../i18n/useLanguage';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { Button } from './Button';

export function SessionGuard({ children, staff = false }: { children: React.ReactNode; staff?: boolean }) {
  const auth = useAuthStore();
  const lastSyncedAt = useSomitiStore((s) => s.lastSyncedAt);
  const isSyncing = useSomitiStore((s) => s.isSyncing);
  const syncError = useSomitiStore((s) => s.syncError);
  const { l } = useLanguage();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);
  if (!hydrated) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (!auth.isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!auth.isPinVerified) return <Redirect href="/(auth)/pin" />;
  if (auth.mustChangePin) return <Redirect href="/(auth)/change-pin" />;
  if (staff && auth.actualRole === 'member') return <Redirect href="/(member)" />;
  // Never mount account screens with the default somiti name and zero balances.
  // Once a snapshot exists, ordinary background syncs keep those screens visible.
  if (REMOTE && lastSyncedAt === null) {
    const failed = !!syncError && !isSyncing;
    return (
      <View style={styles.loading}>
        {!failed && <ActivityIndicator size="large" color={colors.primary} />}
        <Text accessibilityRole="text" style={styles.message}>
          {failed
            ? l('Could not load your account. Check your internet connection and try again.', 'তথ্য আনা যায়নি। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।')
            : l('Preparing your account…', 'আপনার তথ্য প্রস্তুত হচ্ছে…')}
        </Text>
        {failed && <>
          <Button title={l('Try again', 'আবার চেষ্টা করুন')} onPress={() => { void useSomitiStore.getState().syncFromServer(); }} />
          <Button title={l('Log out', 'লগআউট')} variant="ghost" onPress={auth.logout} />
        </>}
      </View>
    );
  }
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loading: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  message: { fontFamily: typography.fontFamily.regular, fontSize: typography.size.md, lineHeight: typography.lineHeight.md, color: colors.textSecondary, textAlign: 'center' },
});
