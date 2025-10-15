// context/AuthContext.tsx
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { User } from "@/types";
// A importação de notificação foi removida daqui para evitar duplicidade.

interface AuthContextType {
  user: User | null;
  users: User[];
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string, password: string, nome: string, telefone: string,
    tipo_usuario: "goleiro" | "organizador", estado: string, cidade: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser?: (updates: Partial<User>) => Promise<void>;
  adicionarCoins: (valor: number, descricao: string) => Promise<void>;
  removerCoins: (valor: number, descricao: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== O useEffect DUPLICADO PARA NOTIFICAÇÕES FOI REMOVIDO DESTA ÁREA =====

  const loadUserProfile = async (authUser: any) => {
    try {
      if (!authUser?.id) return null;
      const { data, error } = await supabase.from("usuarios").select("*").eq("id", authUser.id).single();
      if (error && error.code !== "PGRST116") throw error;
      if (!data) { setUser(null); return null; }
      const fullUser = { ...authUser, ...data };
      setUser(fullUser as User);
      return fullUser;
    } catch (error) {
      console.error("[AUTH] Erro ao carregar perfil:", error);
      setUser(null);
      return null;
    }
  };
  
  const loadAllUsers = async () => {
    try {
      const { data, error } = await supabase.from("usuarios").select("*");
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("[AUTH] Erro ao carregar a lista de todos os usuários:", error);
      setUsers([]);
    }
  };

  const adicionarCoins = async (valor: number, descricao: string) => { /* ... */ };
  const removerCoins = async (valor: number, descricao: string) => { /* ... */ };
  
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user);
        await loadAllUsers();
      } else {
        setUser(null);
        setUsers([]);
      }
      setLoading(false);
    };
    initialize();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setLoading(true);
      setSession(session);
      if (session?.user) {
        await loadUserProfile(session.user);
        await loadAllUsers();
      } else {
        setUser(null);
        setUsers([]);
      }
      setLoading(false);
    });
    return () => listener?.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (data.user) {
        const userProfile = await loadUserProfile(data.user);
        if (!userProfile) throw new Error("Perfil não encontrado");
        if (userProfile.status_aprovacao === "rejeitado") {
          await supabase.auth.signOut();
          throw new Error("Sua conta foi rejeitada.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (
    email: string, password: string, nome: string, telefone: string,
    tipo_usuario: "goleiro" | "organizador", estado: string, cidade: string
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({ email: email.trim().toLowerCase(), password });
      if (error) throw error;
      if (data.user) {
        const { error: profileError } = await supabase.from("usuarios").insert({
          id: data.user.id, nome, email: email.trim().toLowerCase(), telefone,
          tipo_usuario, status_aprovacao: "pendente",
          data_cadastro: new Date().toISOString(), coins: 0, limite_convocacoes: 2,
          estado, cidade,
        });
        if (profileError) throw profileError;
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setUser(null); setSession(null); setUsers([]);
    } catch (error) {
      console.error("[AUTH] Erro ao fazer logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) throw new Error("Usuário não autenticado");
    setLoading(true);
    try {
      const { error } = await supabase.from("usuarios").update(updates).eq("id", user.id);
      if (error) throw error;
      await loadUserProfile(user);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user, users, session, loading, login, register,
        logout, updateUser, adicionarCoins, removerCoins,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}