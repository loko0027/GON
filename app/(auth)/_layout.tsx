// app/(auth)/_layout.tsx

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Tela de login */}
      <Stack.Screen name="login" />

      {/* Tela de registro */}
      <Stack.Screen name="register" />

      {/* Tela de termos de uso */}
      <Stack.Screen name="termos" />
    </Stack>
  );
}
