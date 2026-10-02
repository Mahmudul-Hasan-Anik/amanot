import { useRouter } from 'expo-router';

export type AppRouter = ReturnType<typeof useRouter>;

/**
 * Safely navigates back if there is history in the navigation stack,
 * otherwise falls back to the default tab screen.
 * Prevents the Expo warning: "The action 'GO_BACK' was not handled by any navigator."
 */
export function safeBack(router: AppRouter, fallback: string = '/(admin)/(tabs)') {
  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as any);
    }
  } catch (e) {
    router.replace(fallback as any);
  }
}
