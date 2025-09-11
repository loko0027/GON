import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFrameworkReady } from "@/hooks/useFrameworkReady";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider } from "@/contexts/AppContext";
import * as SplashScreen from "expo-splash-screen";
import LoadingScreen from "@/components/LoadingScreen";
import { registerPushToken } from "@/services/notificationService"; // import ajustado

// Evita que a splash screen desapareça automaticamente
SplashScreen.preventAutoHideAsync();

function AppContent() {
  const { loading, user } = useAuth();

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();

      if (user) {
        // Garantir que token do dispositivo esteja registrado
        registerPushToken(user.id).catch((err) =>
          console.error("[NOTIFICATIONS] Erro ao registrar token:", err)
        );
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
