import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native'; // 1. IMPORTAR O PLATFORM

const supabaseUrl = Constants.expoConfig?.extra?.supabaseUrl;
const supabaseAnonKey = Constants.expoConfig?.extra?.supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // 2. CORREÇÃO: Usar o armazenamento correto para cada plataforma
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false, // Importante para mobile, evita problemas
    flowType: 'pkce',
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

// Debug
if (__DEV__) {
  console.log('[SUPABASE] Cliente configurado com persistência de sessão');

  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`[SUPABASE] Auth event: ${event}`, session?.user?.id || 'No user');
  });
}