import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { registerForPushNotifications } from '@/lib/notifications';
import * as SplashScreen from 'expo-splash-screen';
import LoadingScreen from '@/components/LoadingScreen';
import { supabase } from '@/lib/supabase';

// Evita esconder a splash automaticamente
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();

      if (user) {
        registerForPushNotifications()
          .then(async token => {
            if (token) {
              console.log('[NOTIFICATIONS] Token registrado:', token);

              // Salvar no banco associado ao usuário
              const { error } = await supabase
                .from('usuarios') // <-- CORRIGIDO AQUI!
                .update({ expo_push_token: token }) // <-- CORRIGIDO AQUI!
                .eq('id', user.id);

              if (error) {
                console.error('[NOTIFICATIONS] Erro ao salvar token:', error);
              } else {
                console.log('[NOTIFICATIONS] Token salvo no Supabase com sucesso!');
              }
            }
          })
          .catch(error => {
            console.error('[NOTIFICATIONS] Erro ao registrar:', error);
          });
      }
    }
  }, [loading, user]);

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