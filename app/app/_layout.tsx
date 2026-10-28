import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
const HindSiliguri_400Regular=require('@expo-google-fonts/hind-siliguri/HindSiliguri_400Regular.ttf');
const HindSiliguri_500Medium=require('@expo-google-fonts/hind-siliguri/HindSiliguri_500Medium.ttf');
const HindSiliguri_600SemiBold=require('@expo-google-fonts/hind-siliguri/HindSiliguri_600SemiBold.ttf');
const HindSiliguri_700Bold=require('@expo-google-fonts/hind-siliguri/HindSiliguri_700Bold.ttf');
import { View, ActivityIndicator, AppState, Platform } from 'react-native';
import { WebAlertHost } from '../src/components/WebAlertHost';

// react-native-web's Alert.alert does nothing, so errors/confirmations were invisible on web.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // Keep the native form styling restrained, but retain a clear keyboard-focus
  // indicator so web users can navigate forms and buttons safely.
  if (typeof document !== 'undefined') {
    const existing = document.getElementById('amanot-global-focus-reset');
    if (!existing) {
      const style = document.createElement('style');
      style.id = 'amanot-global-focus-reset';
      style.textContent = `
        input, textarea, select, [contenteditable="true"] {
          outline: none !important;
          outline-style: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        *:focus-visible {
          outline: 3px solid #0F5E4A !important;
          outline-offset: 2px !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
}
import { colors } from '../src/theme/colors';
import { supabase, isSupabaseConfigured } from '../src/lib/supabase';
import { useAuthStore } from '../src/features/auth/authStore';

/** Backend mode: validate the saved session on launch and ask for the PIN again. */
function useBackendSession() {
  const [ready, setReady] = React.useState(!isSupabaseConfigured());
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    (async () => {
      try {
        if (!useAuthStore.persist.hasHydrated()) await new Promise<void>(resolve => {
          const unsub = useAuthStore.persist.onFinishHydration(() => { unsub(); resolve(); });
        });
        const { data } = await supabase.auth.getSession();
        const auth = useAuthStore.getState();
        if (!data.session) {
          if (auth.isAuthenticated) auth.logout();
        } else {
          auth.lockApp();
          auth.refreshProfile().catch(() => {});
        }
      } catch {
        useAuthStore.getState().logout();
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        const auth = useAuthStore.getState();
        if (auth.isPinVerified) auth.logout();
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);
  return ready;
}

/** Poll a small revision token while active; refetch snapshots only on change. */
function useAutoSync() {
  const isPinVerified = useAuthStore((s) => s.isPinVerified);
  const mustChangePin = useAuthStore((s) => s.mustChangePin);
  useEffect(() => {
    if (!isSupabaseConfigured() || !isPinVerified || mustChangePin) return;
    const { useSomitiStore } = require('../src/store/somitiStore');
    const sync = async (refreshProfile = true) => {
      if (AppState.currentState !== 'active') return;
      const auth = useAuthStore.getState();
      try {
        if (refreshProfile && !await auth.refreshProfile()) { auth.logout(); return; }
        await useSomitiStore.getState().syncFromServer(false);
      } catch { await useSomitiStore.getState().syncFromServer(false); }
    };
    // Login just validated the profile. Join its in-flight sync without doing
    // another profile fetch; later foreground/timer checks still revalidate.
    sync(false);
    let backgroundAt = 0;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') backgroundAt = Date.now();
      if (st === 'active') {
        if (backgroundAt && Date.now()-backgroundAt>=60000) useAuthStore.getState().lockApp();
        else sync();
      }
    });
    const timer = setInterval(() => sync(), 300000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [isPinVerified, mustChangePin]);
}


export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'HindSiliguri-Regular': HindSiliguri_400Regular,
    'HindSiliguri-Medium': HindSiliguri_500Medium,
    'HindSiliguri-SemiBold': HindSiliguri_600SemiBold,
    'HindSiliguri-Bold': HindSiliguri_700Bold,
  });

  const [timedOut, setTimedOut] = React.useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimedOut(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const sessionReady = useBackendSession();
  useAutoSync();
  const isReady = (fontsLoaded || fontError || timedOut) && sessionReady;

  return (
    <SafeAreaProvider>
        <StatusBar style="dark" />
        {!isReady ? (
          <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(admin)" options={{ headerShown: false }} />
            <Stack.Screen name="(member)" options={{ headerShown: false }} />
          </Stack>
        )}
        <WebAlertHost />
    </SafeAreaProvider>
  );
}
