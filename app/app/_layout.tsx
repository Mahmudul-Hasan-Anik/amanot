import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold } from '@expo-google-fonts/hind-siliguri';
import { View, ActivityIndicator, AppState, Alert, Platform } from 'react-native';

// react-native-web's Alert.alert does nothing, so errors/confirmations were invisible on web.
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  (Alert as any).alert = (title: string, message?: string, buttons?: Array<{ text?: string; style?: string; onPress?: () => void }>) => {
    const text = [title, message].filter(Boolean).join('\n\n');
    if (!buttons || buttons.length === 0) {
      window.alert(text);
      return;
    }
    if (buttons.length === 1) {
      window.alert(text);
      buttons[0].onPress?.();
      return;
    }
    const cancel = buttons.find((b) => b.style === 'cancel');
    const actions = buttons.filter((b) => b !== cancel);
    if (actions.length <= 1) {
      const action = actions[0] || buttons[buttons.length - 1];
      if (window.confirm(text)) action.onPress?.();
      else cancel?.onPress?.();
      return;
    }
    // several choices: let the user pick by number
    const menu = actions.map((b, i) => `${i + 1}. ${b.text || ''}`).join('\n');
    const answer = window.prompt(`${text}\n\n${menu}`, '1');
    const idx = answer ? parseInt(answer.replace(/[০-৯]/g, (c) => String('০১২৩৪৫৬৭৮৯'.indexOf(c))), 10) - 1 : -1;
    if (idx >= 0 && idx < actions.length) actions[idx].onPress?.();
    else cancel?.onPress?.();
  };

  // Global reset on web to prevent black or colored browser focus rings and outlines across the entire app
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
        input:focus, textarea:focus, select:focus, [contenteditable="true"]:focus,
        input:focus-visible, textarea:focus-visible, select:focus-visible,
        *:focus, *:focus-visible {
          outline: none !important;
          outline-style: none !important;
          outline-width: 0 !important;
          box-shadow: none !important;
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
    const sync = async () => {
      if (AppState.currentState !== 'active') return;
      const auth = useAuthStore.getState();
      try {
        if (!await auth.refreshProfile()) { auth.logout(); return; }
        await useSomitiStore.getState().syncFromServer(false);
      } catch { await useSomitiStore.getState().syncFromServer(false); }
    };
    sync();
    let backgroundAt = 0;
    const sub = AppState.addEventListener('change', (st) => {
      if (st === 'background') backgroundAt = Date.now();
      if (st === 'active') {
        if (backgroundAt && Date.now()-backgroundAt>=60000) useAuthStore.getState().lockApp();
        else sync();
      }
    });
    const timer = setInterval(sync, 300000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [isPinVerified, mustChangePin]);
}

const queryClient = new QueryClient();

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
      <QueryClientProvider client={queryClient}>
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
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
