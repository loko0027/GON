// Seu AuthContext.js
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { User } from '@/types';

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

      if (error) {
        console.error('[AUTH] Erro ao carregar perfil:', error);
        throw error;
      }

      if (data) {
        const userProfile: User = {
          ...data,
          data_cadastro: new Date(data.data_cadastro)
        };
        console.log('[AUTH] Perfil carregado:', userProfile);
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
    
    // Verificar sessão inicial
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error('[AUTH] Erro ao obter sessão:', error);
      }
      
      console.log('[AUTH] Sessão inicial:', session?.user?.id || 'Nenhuma sessão');
      setSession(session);
      
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    // Escutar mudanças de autenticação
    // CORREÇÃO AQUI: Destruturar 'subscription' diretamente do 'data'
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] Evento de autenticação:', event, session?.user?.id || 'Sem usuário');
        
        setSession(session);
        
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );

    return () => {
      // E aqui, você chama a função de unsubscribe que veio de 'subscription'
      subscription.unsubscribe();
    };
  }, []); // [] significa que este useEffect roda uma vez ao montar e o cleanup uma vez ao desmontar.

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      console.log('[AUTH] Tentando fazer login:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: email.trim().toLowerCase(), 
        password 
      });
      
      if (error) {
        console.error('[AUTH] Erro no login:', error);
        throw error;
      }

      if (data.user) {
        console.log('[AUTH] Login bem-sucedido, carregando perfil...');
        const userProfile = await loadUserProfile(data.user.id);
        
        if (!userProfile) {
          throw new Error('Perfil de usuário não encontrado');
        }

        if (userProfile.status_aprovacao === 'rejeitado') {
          await supabase.auth.signOut();
          throw new Error('Sua conta foi rejeitada. Entre em contato com o suporte.');
        }

        console.log('[AUTH] Login completo para usuário:', userProfile.tipo_usuario);
      }
    } catch (error: any) {
      console.error('[AUTH] Erro durante login:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, nome: string, telefone: string, tipo_usuario: 'goleiro' | 'organizador') => {
    try {
      setLoading(true);
      console.log('[AUTH] Tentando registrar usuário:', { email, nome, telefone, tipo_usuario });
      
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
      
      if (error) {
        console.error('[AUTH] Erro no registro:', error);
        throw error;
      }

      if (data.user) {
        console.log('[AUTH] Usuário criado no Auth, criando perfil...');
        
        // Criar perfil na tabela usuarios
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

        if (profileError) {
          console.error('[AUTH] Erro ao criar perfil:', profileError);
          throw profileError;
        }

        console.log('[AUTH] Registro completo, usuário pendente de aprovação');
        
        // Fazer logout após registro para forçar nova autenticação
        await supabase.auth.signOut();
      }
    } catch (error: any) {
      console.error('[AUTH] Erro durante registro:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      console.log('[AUTH] Fazendo logout...');
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('[AUTH] Erro no logout:', error);
        throw error;
      }
      
      setUser(null);
      setSession(null);
      console.log('[AUTH] Logout realizado com sucesso');
    } catch (error: any) {
      console.error('[AUTH] Erro durante logout:', error);
      throw error;
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