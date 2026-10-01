import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, HindSiliguri_400Regular, HindSiliguri_500Medium, HindSiliguri_600SemiBold, HindSiliguri_700Bold } from '@expo-google-fonts/hind-siliguri';
import { View, ActivityIndicator } from 'react-native';
import { colors } from '../src/theme/colors';

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

  const isReady = fontsLoaded || fontError || timedOut;

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
          </Stack>
        )}
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
