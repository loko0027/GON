import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth, usePushToken } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import * as SplashScreen from 'expo-splash-screen';
import LoadingScreen from '@/components/LoadingScreen';

// Impede que a splash screen seja escondida automaticamente
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { loading, user } = useAuth();

  // Hook que registra o push token automaticamente
  usePushToken(user?.id);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useFrameworkReady();

  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
        <StatusBar style="auto" />
      </AppProvider>
    </AuthProvider>
  );
}
