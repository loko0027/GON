import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
} from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  Convocacao,
  CategoriaAvaliacao,
  Saldo,
  RecargaCoins,
  SaquePix,
  ChamadoSuporte,
  MensagemSuporte,
  User,
} from '@/types';

interface AppContextType {
  convocacoes: Convocacao[];
  saldos: Saldo[];
  categorias: CategoriaAvaliacao[];
  recargas: RecargaCoins[];
  saques: SaquePix[];
  chamadosSuporte: ChamadoSuporte[];
  mensagensSuporte: MensagemSuporte[];
  allAppUsers: User[];

  getAllUsers: () => User[];
  getUsuariosPendentes: () => User[];
  aprovarUsuario: (userId: string) => Promise<void>;
  rejeitarUsuario: (userId: string) => Promise<void>;

  getSaquesPendentes: () => SaquePix[];
  getRecargasPendentes: () => RecargaCoins[];

  criarConvocacao: (convocacao: Omit<Convocacao, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  aceitarConvocacao: (convocacaoId: string) => Promise<void>;
  recusarConvocacao: (convocacaoId: string) => Promise<void>;
  avaliarGoleiro: (convocacaoId: string, nota: number) => Promise<void>;
  avaliarOrganizador: (convocacaoId: string, categoria: string) => Promise<void>;
  confirmarPresenca: (convocacaoId: string, status: 'compareceu' | 'nao_compareceu') => Promise<void>;

  recarregarCoins: (recarga: Omit<RecargaCoins, 'id' | 'created_at'>) => Promise<void>;
  aprovarRecarga: (recargaId: string) => Promise<void>;
  rejeitarRecarga: (recargaId: string) => Promise<void>;
  solicitarSaque: (saque: Omit<SaquePix, 'id' | 'created_at'>) => Promise<void>;
  aprovarSaque: (saqueId: string) => Promise<void>;
  rejeitarSaque: (saqueId: string) => Promise<void>;
  getSaldo: (userId: string) => Saldo;

  criarChamadoSuporte: (chamado: Omit<ChamadoSuporte, 'id' | 'created_at' | 'solicitante'>) => Promise<void>;
  aprovarChamadoSuporte: (chamadoId: string) => Promise<void>;
  recusarChamadoSuporte: (chamadoId: string) => Promise<void>;
  resolverChamadoSuporte: (chamadoId: string) => Promise<void>;
  enviarMensagemSuporte: (mensagem: Omit<MensagemSuporte, 'id' | 'created_at' | 'autor'>) => Promise<void>;
  getChamadosPorUsuario: (userId: string) => ChamadoSuporte[];
  getMensagensPorChamado: (chamadoId: string) => MensagemSuporte[];

  loadData: () => Promise<void>;
  loadChamadosSuporte: () => Promise<void>;

  // Novas funções adicionadas
  isGoleiroAvaliado: (convocacaoId: string) => boolean;
  isOrganizadorAvaliado: (convocacaoId: string) => boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const { user, loading: authLoading } = useAuth();

  const [convocacoes, setConvocacoes] = useState<Convocacao[]>([]);
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAvaliacao[]>([]);
  const [recargas, setRecargas] = useState<RecargaCoins[]>([]);
  const [saques, setSaques] = useState<SaquePix[]>([]);
  const [chamadosSuporte, setChamadosSuporte] = useState<ChamadoSuporte[]>([]);
  const [mensagensSuporte, setMensagensSuporte] = useState<MensagemSuporte[]>([]);
  const [allAppUsers, setAllAppUsers] = useState<User[]>([]);

  const dataLoadedForUserRef = useRef<string | null>(null);
  const dataClearedForNullUserRef = useRef(false);

  // Loaders
  const loadConvocacoes = useCallback(async () => {
    try {
      if (!user) {
        setConvocacoes([]);
        return;
      }

      const { data, error } = await supabase
        .from('convocacoes')
        .select(`
          *,
          organizador:usuarios!convocacoes_organizador_id_fkey(*),
          goleiro:usuarios!convocacoes_goleiro_id_fkey(*),
          avaliacoes_goleiro:avaliacoes_goleiro(*),
          avaliacoes_organizador:avaliacoes_organizador(*)
        `)
        .or(`organizador_id.eq.${user.id},goleiro_id.eq.${user.id}`)
        .order('data_hora_inicio', { ascending: false });

      if (error) {
        console.error("Erro ao carregar convocações do Supabase:", error);
        throw error;
      }

      // CORREÇÃO: Removido o filtro complexo. Agora a UI decide o que mostrar.
      // O filtro por `or` já garante que o usuário só veja as suas convocações.
      setConvocacoes(data || []);

    } catch (e) {
      console.error("Erro ao carregar convocações:", e);
      Alert.alert("Erro", "Não foi possível carregar as convocações. Tente novamente.");
      setConvocacoes([]);
    }
  }, [user]);

  const loadSaldos = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('saldos').select('*');
      if (error) throw error;
      setSaldos(data || []);
    } catch (e) {
      console.error("Erro ao carregar saldos:", e);
      setSaldos([]);
    }
  }, []);

  const loadCategorias = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('categorias_avaliacao').select('*');
      if (error) throw error;
      setCategorias(data || []);
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
      setCategorias([]);
    }
  }, []);

  const loadRecargas = useCallback(async () => {
    try {
      const query = supabase.from('recargas_coins').select(`*, organizador:usuarios(nome, email)`);

      const { data, error } = await query;
      if (error) throw error;
      setRecargas(data || []);
    } catch (e) {
      console.error("Erro ao carregar recargas:", e);
      setRecargas([]);
    }
  }, []);

  const loadSaques = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('saques_pix').select('*');
      if (error) throw error;
      setSaques(data || []);
    } catch (e) {
      console.error("Erro ao carregar saques:", e);
      setSaques([]);
    }
  }, []);

  const loadChamadosSuporte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chamados_suporte')
        .select(`
          *,
          solicitante:usuarios!solicitante_id(id, nome, tipo_usuario)
        `);
      if (error) throw error;
      setChamadosSuporte(data || []);
    } catch (e) {
      console.error("Erro ao carregar chamados:", e);
      setChamadosSuporte([]);
    }
  }, []);

  const loadMensagensSuporte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mensagens_suporte')
        .select(`
          *,
          autor:usuarios!autor_id(id, nome, tipo_usuario)
        `);
      if (error) throw error;
      setMensagensSuporte(data || []);
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
      setMensagensSuporte([]);
    }
  }, []);

  const loadAllUsers = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('usuarios').select('*');
      if (error) throw error;
      setAllAppUsers(data || []);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
      setAllAppUsers([]);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (authLoading || !user) return;
    if (dataLoadedForUserRef.current === user.id) return;

    try {
      await Promise.all([
        loadConvocacoes(),
        loadSaldos(),
        loadCategorias(),
        loadRecargas(),
        loadSaques(),
        loadChamadosSuporte(),
        loadMensagensSuporte(),
        loadAllUsers(),
      ]);
      dataLoadedForUserRef.current = user.id;
      dataClearedForNullUserRef.current = false;
    } catch (error) {
      console.error('Erro ao carregar dados do app:', error);
    }
  }, [
    authLoading,
    user,
    loadConvocacoes,
    loadSaldos,
    loadCategorias,
    loadRecargas,
    loadSaques,
    loadChamadosSuporte,
    loadMensagensSuporte,
    loadAllUsers,
  ]);

  const clearAllAppDataStates = useCallback(() => {
    setConvocacoes([]);
    setSaldos([]);
    setCategorias([]);
    setRecargas([]);
    setSaques([]);
    setChamadosSuporte([]);
    setMensagensSuporte([]);
    setAllAppUsers([]);
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (!dataClearedForNullUserRef.current) {
        dataLoadedForUserRef.current = null;
        clearAllAppDataStates();
        dataClearedForNullUserRef.current = true;
      }
      return;
    }

    if (dataLoadedForUserRef.current !== user.id) {
      loadData().catch(console.error);
    }
  }, [user, authLoading, loadData, clearAllAppDataStates]);

  // Usuários
  const getAllUsers = useCallback((): User[] => allAppUsers, [allAppUsers]);

  const getUsuariosPendentes = useCallback((): User[] => allAppUsers.filter(u => u.status_aprovacao === 'pendente'), [allAppUsers]);

  const aprovarUsuario = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ status_aprovacao: 'aprovado' })
      .eq('id', userId);
    if (error) throw error;
    await loadAllUsers();
  }, [loadAllUsers]);

  const rejeitarUsuario = useCallback(async (userId: string) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ status_aprovacao: 'rejeitado' })
      .eq('id', userId);
    if (error) throw error;
    await loadAllUsers();
  }, [loadAllUsers]);

  // Saques pendentes
  const getSaquesPendentes = useCallback(() => saques.filter(saque => saque.status === 'pendente'), [saques]);

  // Recargas pendentes
  const getRecargasPendentes = useCallback(() => recargas.filter(recarga => recarga.status === 'pendente'), [recargas]);

  const aprovarSaque = useCallback(async (saqueId: string) => {
    try {
      const { error } = await supabase
        .from('saques_pix')
        .update({ status: 'aprovado' })
        .eq('id', saqueId);
      if (error) throw error;
      await loadSaques();
      await loadSaldos();
      Alert.alert('Sucesso', 'Saque aprovado e saldo atualizado!');
    } catch (e) {
      console.error("Erro ao aprovar saque:", e);
      Alert.alert('Erro', 'Não foi possível aprovar o saque.');
    }
  }, [loadSaques, loadSaldos]);

  const rejeitarSaque = useCallback(async (saqueId: string) => {
    try {
      const { error } = await supabase
        .from('saques_pix')
        .update({ status: 'rejeitado' })
        .eq('id', saqueId);
      if (error) throw error;
      await loadSaques();
      await loadSaldos();
      Alert.alert('Sucesso', 'Saque rejeitado.');
    } catch (e) {
      console.error("Erro ao rejeitar saque:", e);
      Alert.alert('Erro', 'Não foi possível rejeitar o saque.');
    }
  }, [loadSaques, loadSaldos]);

  const aprovarRecarga = useCallback(async (recargaId: string) => {
    try {
      // 1. Buscar os detalhes da recarga
      const { data: recargaData, error: recargaError } = await supabase
        .from('recargas_coins')
        .select('organizador_id, coins_recebidos')
        .eq('id', recargaId)
        .single();

      if (recargaError) {
        throw new Error(`Erro ao buscar detalhes da recarga: ${recargaError.message}`);
      }
      if (!recargaData) {
        throw new Error('Recarga não encontrada.');
      }

      const { organizador_id, coins_recebidos } = recargaData;

      // 2. Atualizar o status da recarga para 'aprovado'
      const { error: updateRecargaError } = await supabase
        .from('recargas_coins')
        .update({ status: 'aprovado' })
        .eq('id', recargaId);

      if (updateRecargaError) {
        throw new Error(`Erro ao atualizar status da recarga: ${updateRecargaError.message}`);
      }

      // 3. Atualizar o saldo do organizador
      const { data: saldoExistente, error: saldoFetchError } = await supabase
        .from('saldos')
        .select('saldo_coins, saldo_retido')
        .eq('usuario_id', organizador_id)
        .single();

      if (saldoFetchError && saldoFetchError.code !== 'PGRST116') { // PGRST116 = no rows found
        throw new Error(`Erro ao buscar saldo existente: ${saldoFetchError.message}`);
      }

      let novoSaldoCoins = coins_recebidos;
      if (saldoExistente) {
        novoSaldoCoins += saldoExistente.saldo_coins;
      }

      const { error: upsertSaldoError } = await supabase
        .from('saldos')
        .upsert(
          {
            usuario_id: organizador_id,
            saldo_coins: novoSaldoCoins,
            saldo_retido: saldoExistente?.saldo_retido || 0
          },
          { onConflict: 'usuario_id' }
        );

      if (upsertSaldoError) {
        throw new Error(`Erro ao atualizar/inserir saldo: ${upsertSaldoError.message}`);
      }

      // 4. Recarregar dados para atualizar a UI
      await loadRecargas();
      await loadSaldos();
      Alert.alert('Sucesso', 'Recarga aprovada e saldo do organizador atualizado!');
    } catch (e: any) {
      console.error("Erro ao aprovar recarga:", e.message);
      Alert.alert('Erro', `Não foi possível aprovar a recarga: ${e.message}`);
    }
  }, [loadRecargas, loadSaldos]);

  const rejeitarRecarga = useCallback(async (recargaId: string) => {
    try {
      const { error } = await supabase
        .from('recargas_coins')
        .update({ status: 'rejeitado' })
        .eq('id', recargaId);
      if (error) throw error;
      await loadRecargas();
      Alert.alert('Sucesso', 'Recarga rejeitada.');
    } catch (e) {
      console.error("Erro ao rejeitar recarga:", e);
      Alert.alert('Erro', 'Não foi possível rejeitar a recarga.');
    }
  }, [loadRecargas]);

  // Adicione estas funções auxiliares
  const isGoleiroAvaliado = useCallback((convocacaoId: string): boolean => {
    const convocacao = convocacoes.find(c => c.id === convocacaoId);
    return convocacao?.avaliado_goleiro || false;
  }, [convocacoes]);

  const isOrganizadorAvaliado = useCallback((convocacaoId: string): boolean => {
    const convocacao = convocacoes.find(c => c.id === convocacaoId);
    return convocacao?.avaliado_organizador || false;
  }, [convocacoes]);

  // AVALIAÇÕES
  const avaliarGoleiro = useCallback(async (convocacaoId: string, nota: number) => {
    try {
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado para realizar a avaliação.');
        return;
      }

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) {
        Alert.alert('Erro', 'Convocação não encontrada.');
        return;
      }
      if (convocacao.organizador_id !== user.id) {
        Alert.alert('Erro', 'Você não é o organizador desta convocação para avaliá-la.');
        return;
      }

      // Inserir avaliação
      const { data, error } = await supabase
        .from('avaliacoes_goleiro')
        .upsert({
          convocacao_id: convocacaoId,
          nota,
          organizador_id: user.id,
          goleiro_id: convocacao.goleiro_id,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar flag na convocação
      const { error: updateError } = await supabase
        .from('convocacoes')
        .update({ avaliado_goleiro: true })
        .eq('id', convocacaoId);

      if (updateError) throw updateError;

      // Atualizar saldos (código existente)
      const coins_calculados = 20 + nota * 5;

      const { data: saldoGoleiro } = await supabase
        .from('saldos')
        .select('saldo_coins')
        .eq('usuario_id', convocacao.goleiro_id)
        .single();

      const novoSaldoCoinsGoleiro = (saldoGoleiro?.saldo_coins || 0) + coins_calculados;

      await supabase
        .from('saldos')
        .upsert({
          usuario_id: convocacao.goleiro_id,
          saldo_coins: novoSaldoCoinsGoleiro,
        }, { onConflict: 'usuario_id' });

      const { data: saldoOrganizador } = await supabase
        .from('saldos')
        .select('saldo_retido')
        .eq('usuario_id', user.id)
        .single();

      const novoSaldoRetidoOrganizador = (saldoOrganizador?.saldo_retido || 0) - convocacao.valor_retido;

      await supabase
        .from('saldos')
        .upsert({
          usuario_id: user.id,
          saldo_retido: novoSaldoRetidoOrganizador,
        }, { onConflict: 'usuario_id' });

      Alert.alert('Sucesso', `Avaliação do goleiro enviada: ${nota} estrelas e ${coins_calculados} coins adicionados.`);
      await loadConvocacoes();
      await loadSaldos();

    } catch (err) {
      console.error("Erro em avaliarGoleiro:", err);
      Alert.alert('Erro', 'Erro inesperado ao enviar avaliação do goleiro.');
    }
  }, [convocacoes, loadConvocacoes, loadSaldos, user]);


  const avaliarOrganizador = useCallback(async (convocacaoId: string, categoria: string) => {
    try {
      if (!user) {
        Alert.alert('Erro', 'Usuário não autenticado para realizar a avaliação.');
        return;
      }

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) {
        Alert.alert('Erro', 'Convocação não encontrada.');
        return;
      }

      if (convocacao.goleiro_id !== user.id || convocacao.status !== 'aceito') {
        Alert.alert('Erro', 'Você não pode avaliar este organizador para esta convocação ou a convocação não está no status correto.');
        return;
      }

      // Inserir avaliação
      const { data, error } = await supabase
        .from('avaliacoes_organizador')
        .upsert({
          convocacao_id: convocacaoId,
          goleiro_id: user.id,
          organizador_id: convocacao.organizador_id,
          categoria_avaliacao: categoria,
        })
        .select()
        .single();

      if (error) throw error;

      // Atualizar flag na convocação
      const { error: updateError } = await supabase
        .from('convocacoes')
        .update({ avaliado_organizador: true })
        .eq('id', convocacaoId);

      if (updateError) throw updateError;

      Alert.alert('Sucesso', `Avaliação do organizador enviada: ${categoria}`);
      await loadConvocacoes();

    } catch (err) {
      console.error("Erro em avaliarOrganizador:", err);
      Alert.alert('Erro', 'Erro inesperado ao enviar avaliação do organizador.');
    }
  }, [convocacoes, loadConvocacoes, user]);


  // FUNÇÃO FALTANDO
  const confirmarPresenca = useCallback(async (convocacaoId: string, status: 'compareceu' | 'nao_compareceu') => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada.');

      if (convocacao.organizador_id !== user.id) {
        Alert.alert('Erro', 'Você não é o organizador desta convocação para confirmar a presença.');
        return;
      }

      const { error } = await supabase
        .from('convocacoes')
        .update({ presenca_status: status })
        .eq('id', convocacaoId);

      if (error) throw error;

      await loadConvocacoes();
      Alert.alert('Sucesso', `Presença confirmada como: ${status}`);

    } catch (e: any) {
      console.error("Erro ao confirmar presença:", e);
      Alert.alert('Erro', 'Não foi possível confirmar a presença. ' + e.message);
    }
  }, [user, loadConvocacoes, convocacoes]);

  // Outras funções
  const criarConvocacao = useCallback(async (convocacao: Omit<Convocacao, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Tentar buscar o saldo do organizador
      const { data: saldoData, error: saldoFetchError } = await supabase
        .from('saldos')
        .select('saldo_coins, saldo_retido')
        .eq('usuario_id', user.id)
        .single();

      if (saldoFetchError) {
        Alert.alert('Erro', 'Saldo do organizador não encontrado.');
        return;
      }
      if (saldoData.saldo_coins < convocacao.valor_retido) {
        Alert.alert('Saldo Insuficiente', 'Você não tem coins suficientes para criar esta convocação.');
        return;
      }

      // 2. Criar a convocação
      const { error: convocacaoError } = await supabase.from('convocacoes').insert(convocacao);
      if (convocacaoError) throw convocacaoError;

      // 3. Atualizar o saldo do organizador, retendo os coins
      const novoSaldoCoins = saldoData.saldo_coins - convocacao.valor_retido;
      const novoSaldoRetido = (saldoData.saldo_retido || 0) + convocacao.valor_retido;

      const { error: saldoUpdateError } = await supabase
        .from('saldos')
        .update({
          saldo_coins: novoSaldoCoins,
          saldo_retido: novoSaldoRetido,
        })
        .eq('usuario_id', user.id);

      if (saldoUpdateError) throw saldoUpdateError;

      await loadConvocacoes();
      await loadSaldos();
      Alert.alert('Sucesso', 'Convocação criada com sucesso! Coins retidos do seu saldo.');
    } catch (error) {
      console.error("Erro em criarConvocacao:", error);
      Alert.alert('Erro', 'Não foi possível criar a convocação.');
    }
  }, [user, loadConvocacoes, loadSaldos]);

  const aceitarConvocacao = useCallback(async (convocacaoId: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('convocacoes')
        .update({
          status: 'aceito',
          goleiro_id: user.id
        })
        .eq('id', convocacaoId);

      if (error) throw error;
      await loadConvocacoes();
      Alert.alert('Sucesso', 'Convocação aceita com sucesso!');
    } catch (error) {
      console.error("Erro em aceitarConvocacao:", error);
      Alert.alert('Erro', 'Não foi possível aceitar a convocação.');
    }
  }, [user, loadConvocacoes]);

  const recusarConvocacao = useCallback(async (convocacaoId: string) => {
    try {
      const { error } = await supabase
        .from('convocacoes')
        .update({ status: 'recusado' })
        .eq('id', convocacaoId);

      if (error) throw error;
      await loadConvocacoes();
      Alert.alert('Sucesso', 'Convocação recusada com sucesso!');
    } catch (error) {
      console.error("Erro em recusarConvocacao:", error);
      Alert.alert('Erro', 'Não foi possível recusar a convocação.');
    }
  }, [loadConvocacoes]);

  const recarregarCoins = useCallback(async (recarga: Omit<RecargaCoins, 'id' | 'created_at'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('recargas_coins').insert({
        ...recarga,
        organizador_id: user.id,
        status: 'pendente'
      });

      if (error) throw error;
      await loadRecargas();
      Alert.alert('Sucesso', 'Recarga solicitada com sucesso! Aguardando aprovação.');
    } catch (error) {
      console.error("Erro em recarregarCoins:", error);
      Alert.alert('Erro', 'Não foi possível solicitar a recarga.');
    }
  }, [user, loadRecargas]);

  const solicitarSaque = useCallback(async (saque: Omit<SaquePix, 'id' | 'created_at'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      // Tentar buscar o saldo do goleiro
      const { data: saldoData, error: saldoFetchError } = await supabase
        .from('saldos')
        .select('saldo_coins')
        .eq('usuario_id', user.id)
        .single();

      if (saldoFetchError) {
        Alert.alert('Erro', 'Saldo do goleiro não encontrado.');
        return;
      }
      if (saldoData.saldo_coins < saque.valor_saque) {
        Alert.alert('Saldo Insuficiente', 'Você não tem coins suficientes para solicitar este saque.');
        return;
      }

      const { error } = await supabase.from('saques_pix').insert({
        ...saque,
        goleiro_id: user.id,
        status: 'pendente'
      });

      if (error) throw error;

      // Retirar os coins do saldo do goleiro
      const novoSaldoCoins = saldoData.saldo_coins - saque.valor_saque;
      const { error: saldoUpdateError } = await supabase
        .from('saldos')
        .update({ saldo_coins: novoSaldoCoins })
        .eq('usuario_id', user.id);

      if (saldoUpdateError) throw saldoUpdateError;

      await loadSaques();
      await loadSaldos();
      Alert.alert('Sucesso', 'Saque solicitado com sucesso!');
    } catch (error) {
      console.error("Erro em solicitarSaque:", error);
      Alert.alert('Erro', 'Não foi possível solicitar o saque.');
    }
  }, [user, loadSaques, loadSaldos]);

  const criarChamadoSuporte = useCallback(async (chamado: Omit<ChamadoSuporte, 'id' | 'created_at' | 'solicitante'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('chamados_suporte').insert({
        ...chamado,
        solicitante_id: user.id,
        status: 'pendente'
      });

      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado criado com sucesso!');
    } catch (error) {
      console.error("Erro em criarChamadoSuporte:", error);
      Alert.alert('Erro', 'Não foi possível criar o chamado de suporte.');
    }
  }, [user, loadChamadosSuporte]);

  const aprovarChamadoSuporte = useCallback(async (chamadoId: string) => {
    try {
      const { error } = await supabase
        .from('chamados_suporte')
        .update({ status: 'aprovado' })
        .eq('id', chamadoId);

      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado aprovado com sucesso!');
    } catch (error) {
      console.error("Erro em aprovarChamadoSuporte:", error);
      Alert.alert('Erro', 'Não foi possível aprovar o chamado.');
    }
  }, [loadChamadosSuporte]);

  const recusarChamadoSuporte = useCallback(async (chamadoId: string) => {
    try {
      const { error } = await supabase
        .from('chamados_suporte')
        .update({ status: 'recusado' })
        .eq('id', chamadoId);

      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado recusado com sucesso!');
    } catch (error) {
      console.error("Erro em recusarChamadoSuporte:", error);
      Alert.alert('Erro', 'Não foi possível recusar o chamado.');
    }
  }, [loadChamadosSuporte]);

  const resolverChamadoSuporte = useCallback(async (chamadoId: string) => {
    try {
      const { error } = await supabase
        .from('chamados_suporte')
        .update({ status: 'resolvido' })
        .eq('id', chamadoId);

      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado resolvido com sucesso!');
    } catch (error) {
      console.error("Erro em resolverChamadoSuporte:", error);
      Alert.alert('Erro', 'Não foi possível resolver o chamado.');
    }
  }, [loadChamadosSuporte]);


  const enviarMensagemSuporte = useCallback(async (mensagem: Omit<MensagemSuporte, 'id' | 'created_at' | 'autor'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('mensagens_suporte').insert({
        ...mensagem,
        autor_id: user.id
      });

      if (error) throw error;
      await loadMensagensSuporte();
      Alert.alert('Sucesso', 'Mensagem enviada com sucesso!');
    } catch (error) {
      console.error("Erro em enviarMensagemSuporte:", error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    }
  }, [user, loadMensagensSuporte]);

  const getSaldo = useCallback((userId: string): Saldo => {
    return saldos.find(s => s.usuario_id === userId) || { usuario_id: userId, saldo_coins: 0, saldo_retido: 0 };
  }, [saldos]);

  const getChamadosPorUsuario = useCallback((userId: string): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => c.solicitante_id === userId);
  }, [chamadosSuporte]);

  const getMensagensPorChamado = useCallback((chamadoId: string): MensagemSuporte[] => {
    return mensagensSuporte.filter(m => m.chamado_id === chamadoId);
  }, [mensagensSuporte]);

  // Atualize o retorno do provider para incluir as novas funções
  return (
    <AppContext.Provider
      value={{
        convocacoes,
        saldos,
        categorias,
        recargas,
        saques,
        chamadosSuporte,
        mensagensSuporte,
        allAppUsers,
        getAllUsers,
        getUsuariosPendentes,
        aprovarUsuario,
        rejeitarUsuario,
        getSaquesPendentes,
        getRecargasPendentes,
        criarConvocacao,
        aceitarConvocacao,
        recusarConvocacao,
        avaliarGoleiro,
        avaliarOrganizador,
        confirmarPresenca,
        recarregarCoins,
        aprovarRecarga,
        rejeitarRecarga,
        solicitarSaque,
        aprovarSaque,
        rejeitarSaque,
        getSaldo,
        criarChamadoSuporte,
        aprovarChamadoSuporte,
        recusarChamadoSuporte,
        resolverChamadoSuporte,
        enviarMensagemSuporte,
        getChamadosPorUsuario,
        getMensagensPorChamado,
        loadData,
        loadChamadosSuporte,
        isGoleiroAvaliado,
        isOrganizadorAvaliado,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}