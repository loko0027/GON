// AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    nome: string,
    telefone: string,
    tipo_usuario: 'goleiro' | 'organizador'
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

// Cria canais Android
async function createAndroidChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('convocacoes', {
      name: 'Convocações',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: true,
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
    });

    await Notifications.setNotificationChannelAsync('geral', {
      name: 'Notificações Gerais',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: true,
      enableVibrate: true,
      enableLights: false,
    });
  }
}

/**
 * Registra o push token no Supabase na tabela user_push_tokens
 */
async function registerPushToken(userId: string) {
  try {
    // Verifica se é dispositivo físico ou web
    const isMobile = Platform.OS !== 'web';
    if (isMobile && !Device.isDevice) {
      console.warn('[PUSH] Push notifications requerem um dispositivo físico.');
      return null;
    }

    if (isMobile) await createAndroidChannels();

    // Permissões apenas em mobile
    let finalStatus = 'granted';
    if (isMobile) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[PUSH] Permissão de notificação negada.');
        return null;
      }
    }

    // Obtem token
    const tokenData = isMobile
      ? await Notifications.getExpoPushTokenAsync({ projectId: '97e01803-b2d1-47cb-b054-26e6c7e0df9e' })
      : { data: 'WEB_PLACEHOLDER_TOKEN' }; // Para web você pode usar outro método, ou apenas um placeholder

    const token = tokenData?.data;
    console.log('[PUSH] Expo token obtido:', token);

    if (token) {
      const { error } = await supabase
        .from('user_push_tokens')
        .upsert(
          {
            usuario: userId,
            expo_push_token: token,
          },
          { onConflict: 'usuario' }
        );

      if (error) console.error('[PUSH] Erro ao salvar token:', error);
      else console.log('[PUSH] Token salvo no user_push_tokens para usuário:', userId);
    }

    return token;
  } catch (err) {
    console.error('[PUSH] Erro ao registrar push token:', err);
    return null;
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const userProfile: User = {
          ...data,
          data_cadastro: new Date(data.data_cadastro),
        };
        setUser(userProfile);
        return userProfile;
      }
    } catch (error) {
      console.error('[AUTH] Erro ao carregar perfil do usuário:', error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user.id);
        await registerPushToken(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user.id);
        await registerPushToken(session.user.id);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    supabase.auth.startAutoRefresh();

    return () => {
      subscription.unsubscribe();
      supabase.auth.stopAutoRefresh();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;

      if (data.user) {
        const userProfile = await loadUserProfile(data.user.id);
        if (!userProfile) throw new Error('Perfil de usuário não encontrado');

        if (userProfile.status_aprovacao === 'rejeitado') {
          await supabase.auth.signOut();
          throw new Error('Sua conta foi rejeitada. Entre em contato com o suporte.');
        }

        await registerPushToken(data.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string,
    password: string,
    nome: string,
    telefone: string,
    tipo_usuario: 'goleiro' | 'organizador'
  ) => {
    try {
      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            nome: nome.trim(),
            telefone: telefone.trim(),
            tipo_usuario,
            status_aprovacao: 'pendente',
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from('usuarios').insert({
          id: data.user.id,
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          telefone: telefone.trim(),
          tipo_usuario,
          status_aprovacao: 'pendente',
          data_cadastro: new Date().toISOString(),
        });

        if (profileError) throw profileError;

        await loadUserProfile(data.user.id);
        await registerPushToken(data.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      if (session) {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
      }
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
