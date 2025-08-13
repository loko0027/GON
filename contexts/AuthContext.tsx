// Seu AuthContext.js
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, nome: string, telefone: string, tipo_usuario: 'goleiro' | 'organizador') => Promise<void>;
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

async function registerPushToken(userId: string) {
  try {
    if (Platform.OS === 'web') {
      console.log('[NOTIFICATIONS] Web detectado — não registrando push token.');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NOTIFICATIONS] Permissão para notificações não concedida');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    console.log('[NOTIFICATIONS] Token obtido:', token);

    const { error } = await supabase
      .from('usuarios')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) throw error;
    console.log('[NOTIFICATIONS] Token salvo no banco com sucesso.');
  } catch (err) {
    console.error('[NOTIFICATIONS] Erro ao registrar token:', err);
  }
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      console.log('[AUTH] Carregando perfil do usuário:', userId);
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      if (data) {
        const userProfile: User = {
          ...data,
          data_cadastro: new Date(data.data_cadastro)
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
    console.log('[AUTH] Inicializando AuthProvider...');
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AUTH] Erro ao obter sessão:', error);
      }
      
      setSession(session);
      
      if (session?.user) {
        loadUserProfile(session.user.id).then(() => {
          registerPushToken(session.user.id); // registra push token no mobile
        });
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
          registerPushToken(session.user.id);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (error) throw error;

      if (data.user) {
        const userProfile = await loadUserProfile(data.user.id);
        
        if (!userProfile) throw new Error('Perfil de usuário não encontrado');

        if (userProfile.status_aprovacao === 'rejeitado') {
          await supabase.auth.signOut();
          throw new Error('Sua conta foi rejeitada. Entre em contato com o suporte.');
        }

        registerPushToken(data.user.id);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, nome: string, telefone: string, tipo_usuario: 'goleiro' | 'organizador') => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password: password,
        options: {
          data: {
            nome: nome.trim(),
            telefone: telefone.trim(),
            tipo_usuario: tipo_usuario,
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
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            telefone: telefone.trim(),
            tipo_usuario: tipo_usuario,
            status_aprovacao: 'pendente',
            data_cadastro: new Date().toISOString(),
          });

        if (profileError) throw profileError;
        
        await supabase.auth.signOut();
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
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
