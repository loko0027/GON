import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Função para registrar token de push na tabela user_push_tokens
async function registerPushToken(userId: string) {
  if (!userId) return;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificação negada');
    return;
  }

  let token: string | undefined;

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '97e01803-b2d1-47cb-b054-26e6c7e0df9e',
    });
    token = tokenData.data;
    console.log('[PUSH] Token obtido:', token);
  } catch (error) {
    console.error('[PUSH] Erro ao obter token:', error);
    return;
  }

  if (!token) {
    console.warn('[PUSH] Token está vazio');
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  // Verifica se o token já existe para este usuário
  const { data: existingToken, error: fetchError } = await supabase
    .from('user_push_tokens')
    .select('*')
    .eq('usuario', userId)
    .eq('expo_push_token', token)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = not found
    console.error('[PUSH] Erro ao buscar token no banco:', fetchError);
    return;
  }

  if (existingToken) {
    console.log('[PUSH] Token já está cadastrado.');
    return;
  }

  // Insere ou atualiza o token na tabela user_push_tokens
  const { error: insertError } = await supabase
    .from('user_push_tokens')
    .upsert({
      usuario: userId,
      expo_push_token: token,
      plataforma: Platform.OS,
    }, { onConflict: ['usuario', 'expo_push_token'] });

  if (insertError) {
    console.error('[PUSH] Erro ao salvar token no banco:', insertError);
  } else {
    console.log('[PUSH] Token salvo na tabela user_push_tokens com sucesso!');
  }
}

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
  updateUser?: (updates: Partial<User>) => Promise<void>;
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
      console.error('[AUTH] Erro ao carregar perfil:', error);
      setUser(null);
      return null;
    }
  };

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) console.error('[AUTH] Erro ao obter sessão inicial:', error);

      setSession(session);

      if (session?.user) {
        const userProfile = await loadUserProfile(session.user.id);
        if (userProfile) {
          await registerPushToken(session.user.id);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        if (session?.user) {
          await loadUserProfile(session.user.id);
          await registerPushToken(session.user.id);
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    return () => {
      listener?.subscription.unsubscribe();
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
        if (!userProfile) throw new Error('Perfil não encontrado');

        if (userProfile.status_aprovacao === 'rejeitado') {
          await supabase.auth.signOut();
          throw new Error('Sua conta foi rejeitada.');
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
            nome,
            telefone,
            tipo_usuario,
            status_aprovacao: 'pendente',
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase
          .from('usuarios')
          .insert({
            id: data.user.id,
            nome,
            email: email.trim().toLowerCase(),
            telefone,
            tipo_usuario,
            status_aprovacao: 'pendente',
            data_cadastro: new Date().toISOString(),
          });

        if (profileError) throw profileError;

        await registerPushToken(data.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) throw new Error('Usuário não autenticado');
    setLoading(true);
    try {
      const { error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      await loadUserProfile(user.id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        register,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
