import { Redirect } from 'expo-router';
import { useAuthStore } from '../src/features/auth/authStore';

export default function Index() {
  const { isAuthenticated, isPinVerified } = useAuthStore();

  if (isAuthenticated && isPinVerified) {
    return <Redirect href="/(admin)/(tabs)" />;
  }

  if (isAuthenticated && !isPinVerified) {
    return <Redirect href="/(auth)/pin" />;
  }

  return <Redirect href="/(auth)/login" />;
}
