import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from "@supabase/supabase-js";
import { User } from "@/types";
import { registerPushToken } from "@/services/notificationService";

// ===== Auth Context =====
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
    tipo_usuario: "goleiro" | "organizador"
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
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== Carrega perfil do usuário =====
  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("id", userId)
        .single();
      if (error) throw error;

      if (data) {
        const userProfile: User = {
          id: data.id,
          nome: data.nome,
          email: data.email,
          telefone: data.telefone,
          tipo_usuario: data.tipo_usuario,
          status_aprovacao: data.status_aprovacao,
          data_cadastro: new Date(data.data_cadastro),
          coins: data.coins || 0,
          limite_convocacoes: data.limite_convocacoes || 2,
          foto_url: data.foto_url,
          nota_media: data.nota_media,
          jogos_realizados: data.jogos_realizados,
        };
        setUser(userProfile);
        return userProfile;
      }
    } catch (error) {
      console.error("[AUTH] Erro ao carregar perfil:", error);
      setUser(null);
      return null;
    }
  };

  // ===== Coins =====
  const adicionarCoins = async (valor: number, descricao: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    try {
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ coins: (user.coins || 0) + valor })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await supabase.from("transacoes_coins").insert({
        usuario_id: user.id,
        tipo: "credito",
        valor,
        descricao,
        data: new Date().toISOString(),
      });

      setUser({ ...user, coins: (user.coins || 0) + valor });
    } catch (error) {
      console.error("Erro ao adicionar coins:", error);
      throw error;
    }
  };

  const removerCoins = async (valor: number, descricao: string) => {
    if (!user) throw new Error("Usuário não autenticado");
    if ((user.coins || 0) < valor) throw new Error("Saldo insuficiente");

    try {
      const { error: updateError } = await supabase
        .from("usuarios")
        .update({ coins: (user.coins || 0) - valor })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await supabase.from("transacoes_coins").insert({
        usuario_id: user.id,
        tipo: "debito",
        valor,
        descricao,
        data: new Date().toISOString(),
      });

      setUser({ ...user, coins: (user.coins || 0) - valor });
    } catch (error) {
      console.error("Erro ao remover coins:", error);
      throw error;
    }
  };

  // ===== Inicialização =====
  useEffect(() => {
    const initialize = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setSession(session);

        if (session?.user) {
          await loadUserProfile(session.user.id);
          await registerPushToken(session.user.id); // ✅ registro centralizado
        } else {
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (session?.user) {
        await loadUserProfile(session.user.id);
        await registerPushToken(session.user.id);
      } else {
        setUser(null);
      }
    });

    return () => listener?.subscription.unsubscribe();
  }, []);

  // ===== Login =====
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;

      if (data.user) {
        const profile = await loadUserProfile(data.user.id);
        if (!profile) throw new Error("Perfil não encontrado");
        if (profile.status_aprovacao === "rejeitado") {
          await supabase.auth.signOut();
          throw new Error("Sua conta foi rejeitada.");
        }

        await registerPushToken(data.user.id); // ✅ registro centralizado
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== Registro =====
  const register = async (
    email: string,
    password: string,
    nome: string,
    telefone: string,
    tipo_usuario: "goleiro" | "organizador"
  ) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { nome, telefone, tipo_usuario, status_aprovacao: "pendente" },
        },
      });
      if (error) throw error;

      if (data.user) {
        const { error: profileError } = await supabase.from("usuarios").insert({
          id: data.user.id,
          nome,
          email: email.trim().toLowerCase(),
          telefone,
          tipo_usuario,
          status_aprovacao: "pendente",
          data_cadastro: new Date().toISOString(),
          coins: 0,
          limite_convocacoes: 2,
        });
        if (profileError) throw profileError;

        await registerPushToken(data.user.id); // ✅ registro centralizado
      }
    } finally {
      setLoading(false);
    }
  };

  // ===== Logout =====
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

  // ===== Update user =====
  const updateUser = async (updates: Partial<User>) => {
    if (!user) throw new Error("Usuário não autenticado");
    setLoading(true);
    try {
      const { error } = await supabase.from("usuarios").update(updates).eq("id", user.id);
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
        adicionarCoins,
        removerCoins,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
