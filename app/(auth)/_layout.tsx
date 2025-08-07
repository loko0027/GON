// app/(auth)/_layout.tsx (VERSÃO CORRIGIDA)

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Rota para a tela de login (app/(auth)/login.tsx) */}
      <Stack.Screen name="login" />

      {/* Rota para a tela de registro (app/(auth)/register.tsx) */}
      <Stack.Screen name="register" />

      {/* REMOVIDO: A rota "lista-espera" NÃO pertence a este grupo.
          Ela é uma rota de nível superior e deve ser declarada APENAS
          no app/_layout.tsx (o layout raiz). */}
      {/* <Stack.Screen name="lista-espera" /> */}
    </Stack>
  );
}