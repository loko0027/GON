import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,           // ✅ Usar AsyncStorage para persistência
    autoRefreshToken: true,          // ✅ Renovar token automaticamente
    persistSession: true,            // ✅ Manter sessão salva
    detectSessionInUrl: false,       // ✅ Não detectar sessão na URL (mobile)
    flowType: 'pkce',               // ✅ Usar PKCE para segurança adicional
  },
  global: {
    headers: {
      'X-Client-Info': 'goleiroon-mobile-app',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Log de debug para desenvolvimento
if (__DEV__) {
  console.log('[SUPABASE] Cliente configurado com persistência de sessão');
  
  // Monitorar mudanças de autenticação
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[SUPABASE] Auth event: ${event}`, session?.user?.id || 'No user');
  });
}