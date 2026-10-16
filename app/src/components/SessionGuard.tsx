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
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const isPinVerified = useAuthStore(s => s.isPinVerified);
  const mustChangePin = useAuthStore(s => s.mustChangePin);
  const actualRole = useAuthStore(s => s.actualRole);
  const logout = useAuthStore(s => s.logout);
  const lastSyncedAt = useSomitiStore((s) => s.lastSyncedAt);
  const isSyncing = useSomitiStore((s) => s.isSyncing);
  const syncError = useSomitiStore((s) => s.syncError);
  const { l } = useLanguage();
  const [hydrated, setHydrated] = useState(useAuthStore.persist.hasHydrated());
  const [slow, setSlow] = useState(false);
  useEffect(() => useAuthStore.persist.onFinishHydration(() => setHydrated(true)), []);
  useEffect(() => {
    if (!REMOTE || lastSyncedAt !== null || !isSyncing) { setSlow(false); return; }
    const timer = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(timer);
  }, [lastSyncedAt, isSyncing]);
  if (!hydrated) return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator color={colors.primary} /></View>;
  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!isPinVerified) return <Redirect href="/(auth)/pin" />;
  if (mustChangePin) return <Redirect href="/(auth)/change-pin" />;
  if (staff && actualRole === 'member') return <Redirect href="/(member)" />;
  // Never mount account screens with the default somiti name and zero balances.
  // Once a snapshot exists, ordinary background syncs keep those screens visible.
  if (REMOTE && lastSyncedAt === null) {
    const failed = !!syncError && !isSyncing;
    const failureMessage = /backend update|সার্ভারের নতুন update/i.test(syncError || '')
      ? l('The server needs an update. Contact your administrator.', 'সার্ভার আপডেট প্রয়োজন। অ্যাডমিনের সাথে যোগাযোগ করুন।')
      : /permission|row.level|denied|আবার লগইন|session|jwt/i.test(syncError || '')
        ? l('Your session or account access needs checking. Log in again or contact your administrator.', 'আপনার সেশন বা অনুমতি যাচাই প্রয়োজন। আবার লগইন করুন অথবা অ্যাডমিনের সাথে যোগাযোগ করুন।')
        : l('Could not load your account. Try again. If this continues, contact your administrator.', 'অ্যাকাউন্টের তথ্য আনা যায়নি। আবার চেষ্টা করুন। সমস্যা চলতে থাকলে অ্যাডমিনের সাথে যোগাযোগ করুন।');
    return (
      <View style={styles.loading}>
        {!failed && <ActivityIndicator size="large" color={colors.primary} />}
        <Text accessibilityRole="text" accessibilityLiveRegion="polite" style={styles.message}>
          {failed
            ? failureMessage
            : slow ? l('Loading is taking longer than usual. Please keep your internet connected.', 'তথ্য আসতে বেশি সময় লাগছে। ইন্টারনেট সংযোগ চালু রাখুন।')
              : l('Preparing your account…', 'আপনার তথ্য প্রস্তুত হচ্ছে…')}
        </Text>
        {failed && <>
          <Button title={l('Try again', 'আবার চেষ্টা করুন')} onPress={() => { void useSomitiStore.getState().syncFromServer(); }} />
          <Button title={l('Log out', 'লগআউট')} variant="ghost" onPress={logout} />
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
