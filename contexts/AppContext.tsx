import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { Alert } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { getDay } from 'date-fns';
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

// ===== INÍCIO DA MODIFICAÇÃO =====
// A interface foi atualizada para refletir a nova função de cálculo.
interface AppContextType {
  convocacoes: Convocacao[];
  saldos: Saldo[];
  categorias: CategoriaAvaliacao[];
  recargas: RecargaCoins[];
  saques: SaquePix[];
  chamadosSuporte: ChamadoSuporte[];
  mensagensSuporte: MensagemSuporte[];
  allAppUsers: User[];
  refreshing: boolean;
  loading: boolean;

  getAllUsers: () => User[];
  getUsuariosPendentes: () => User[];
  aprovarUsuario: (userId: string) => Promise<void>;
  rejeitarUsuario: (userId: string) => Promise<void>;
  getUsuarioById: (userId: string) => User | undefined;
  atualizarUsuario: (userId: string, updates: Partial<User>) => Promise<void>;

  getSaquesPendentes: () => SaquePix[];
  getRecargasPendentes: () => RecargaCoins[];
  getTransacoesUsuario: () => {
    recargas: RecargaCoins[];
    saques: SaquePix[];
  };

  fetchConvocacoes: () => Promise<Convocacao[]>;
  criarConvocacao: (convocacao: Omit<Convocacao, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  aceitarConvocacao: (convocacaoId: string) => Promise<void>;
  recusarConvocacao: (convocacaoId: string) => Promise<void>;
  avaliarGoleiro: (convocacaoId: string, nota: number) => Promise<void>;
  avaliarOrganizador: (convocacaoId: string, categoria: string) => Promise<void>;
  confirmarPresenca: (convocacaoId: string, status: 'compareceu' | 'nao_compareceu') => Promise<void>;
  getConvocacoesPorUsuario: (userId: string) => Convocacao[];
  getConvocacoesAtivas: () => Convocacao[];
  getConvocacoesHistorico: () => Convocacao[];

  recarregarCoins: (recarga: Omit<RecargaCoins, 'id' | 'created_at'>) => Promise<void>;
  aprovarRecarga: (recargaId: string) => Promise<void>;
  rejeitarRecarga: (recargaId: string) => Promise<void>;
  solicitarSaque: (saque: Omit<SaquePix, 'id' | 'created_at'>) => Promise<void>;
  aprovarSaque: (saqueId: string) => Promise<void>;
  rejeitarSaque: (saqueId: string) => Promise<void>;
  getSaldo: (userId: string) => Saldo;
  getSaldoUsuario: () => Saldo;
  transferirCoins: (destinatarioId: string, valor: number) => Promise<void>;

  criarChamadoSuporte: (chamado: Omit<ChamadoSuporte, 'id' | 'created_at' | 'solicitante'>) => Promise<void>;
  aprovarChamadoSuporte: (chamadoId: string) => Promise<void>;
  recusarChamadoSuporte: (chamadoId: string) => Promise<void>;
  resolverChamadoSuporte: (chamadoId: string) => Promise<void>;
  enviarMensagemSuporte: (mensagem: Omit<MensagemSuporte, 'id' | 'created_at' | 'autor'>) => Promise<void>;
  getChamadosPorUsuario: (userId: string) => ChamadoSuporte[];
  getMensagensPorChamado: (chamadoId: string) => MensagemSuporte[];
  getChamadosAbertos: () => ChamadoSuporte[];
  getChamadosResolvidos: () => ChamadoSuporte[];

  loadData: () => Promise<void>;
  loadChamadosSuporte: () => Promise<void>;
  handleRefresh: () => Promise<void>;
  loadUserData: (userId: string) => Promise<void>;

  isGoleiroAvaliado: (convocacaoId: string) => boolean;
  isOrganizadorAvaliado: (convocacaoId: string) => boolean;
  formatarData: (dateString: string) => string;
  formatarMoeda: (valor: number) => string;
  
  // AQUI ESTÁ A MUDANÇA: Uma única função que retorna um objeto com todos os detalhes.
  calcularDetalhesConvocacao: (nivelJogador: 'iniciante' | 'intermediario' | 'veterano', dataHora: Date, duracaoHoras: number) => {
      total: number;
      valorGoleiro: number;
      taxaApp: number;
      taxaDia: number;
      taxaHora: number;
      valorBaseGoleiro: number;
  };
}
// ===== FIM DA MODIFICAÇÃO =====


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
  
  const [dbTaxas, setDbTaxas] = useState({
    app: 0,
    dia: 0,
    hora: 0,
    taxa_goleiro: 0, 
  });

  const [convocacoes, setConvocacoes] = useState<Convocacao[]>([]);
  const [saldos, setSaldos] = useState<Saldo[]>([]);
  const [categorias, setCategorias] = useState<CategoriaAvaliacao[]>([]);
  const [recargas, setRecargas] = useState<RecargaCoins[]>([]);
  const [saques, setSaques] = useState<SaquePix[]>([]);
  const [chamadosSuporte, setChamadosSuporte] = useState<ChamadoSuporte[]>([]);
  const [mensagensSuporte, setMensagensSuporte] = useState<MensagemSuporte[]>([]);
  const [allAppUsers, setAllAppUsers] = useState<User[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const getSaldo = useCallback((userId: string): Saldo => {
    return saldos.find(s => s.usuario_id === userId) || {
      usuario_id: userId,
      saldo_coins: 0,
      saldo_retido: 0
    };
  }, [saldos]);

  const getSaldoUsuario = useCallback((): Saldo => {
    if (!user) return { usuario_id: '', saldo_coins: 0, saldo_retido: 0 };
    return getSaldo(user.id);
  }, [user, getSaldo]);

  const dataLoadedForUserRef = useRef<string | null>(null);
  const dataClearedForNullUserRef = useRef(false);

  // ===== INÍCIO DA MODIFICAÇÃO =====
  // As funções de cálculo foram centralizadas em uma única função que retorna um objeto detalhado.
  const calcularDetalhesConvocacao = useCallback((
    nivelJogador: 'iniciante' | 'intermediario' | 'veterano',
    dataHora: Date,
    duracaoHoras: number
  ) => {
    // 1. Pega os valores base do banco de dados
    const valorBase = dbTaxas.taxa_goleiro;
    const taxaApp = dbTaxas.app;

    // 2. Calcula os bônus e taxas variáveis por hora
    let bonusNivel = 0;
    switch (nivelJogador) {
      case 'iniciante': bonusNivel = 10; break;
      case 'intermediario': bonusNivel = 20; break;
      case 'veterano': bonusNivel = 30; break;
    }

    const diaSemana = getDay(new Date(dataHora));
    const diasValorizados = [0, 1, 5, 6]; // Dom, Seg, Sex, Sáb
    const taxaDiaPorHora = diasValorizados.includes(diaSemana) ? dbTaxas.dia : 0;
    
    const hora = new Date(dataHora).getHours();
    const taxaHoraPorHora = (hora >= 9 && hora < 15) ? dbTaxas.hora : 0;

    // 3. Calcula os totais com base nos componentes, multiplicando pela duração
    const valorBaseGoleiroFinal = (valorBase + bonusNivel) * duracaoHoras;
    const taxaDiaFinal = taxaDiaPorHora * duracaoHoras;
    const taxaHoraFinal = taxaHoraPorHora * duracaoHoras;
    
    const valorFinalGoleiro = valorBaseGoleiroFinal + taxaDiaFinal + taxaHoraFinal;
    const totalFinal = valorFinalGoleiro + taxaApp;

    // 4. Retorna um objeto com TUDO detalhado para ser usado na tela
    return {
      total: totalFinal,
      valorGoleiro: valorFinalGoleiro,
      taxaApp: taxaApp,
      taxaDia: taxaDiaFinal,
      taxaHora: taxaHoraFinal,
      valorBaseGoleiro: valorBaseGoleiroFinal,
    };
  }, [dbTaxas]);
  // ===== FIM DA MODIFICAÇÃO =====

  const fetchConvocacoes = useCallback(async (): Promise<Convocacao[]> => {
    try {
      if (!user) {
        setConvocacoes([]);
        return [];
      }
      const { data, error } = await supabase
        .from('convocacoes')
        .select(`*, organizador:usuarios!convocacoes_organizador_id_fkey(id, nome, foto_url), goleiro:usuarios!convocacoes_goleiro_id_fkey(id, nome, foto_url), avaliacoes_goleiro:avaliacoes_goleiro(*), avaliacoes_organizador:avaliacoes_organizador(*)`)
        .order('data_hora_inicio', { ascending: false });
      if (error) throw error;
      const convocacoesFormatadas = data?.map(conv => ({ ...conv, organizador_nome: conv.organizador?.nome || 'Organizador não encontrado', goleiro_nome: conv.goleiro?.nome || null, organizador_foto_url: conv.organizador?.foto_url || null, goleiro_foto_url: conv.goleiro?.foto_url || null })) || [];
      setConvocacoes(convocacoesFormatadas);
      return convocacoesFormatadas;
    } catch (e) {
      console.error("Erro ao carregar convocações:", e);
      Alert.alert("Erro", "Não foi possível carregar as convocações.");
      setConvocacoes([]);
      return [];
    }
  }, [user]);

  const loadSaldos = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('saldos').select('*');
      if (error) throw error;
      setSaldos(data || []);
    } catch (e) {
      console.error("Erro ao carregar saldos:", e);
      setSaldos([]);
    }
  }, []);
  
  useEffect(() => {
    const fetchDbTaxas = async () => {
      try {
        const { data, error } = await supabase
          .from('configuracoes_taxas')
          .select('taxa_app, taxa_dia, taxa_hora, taxa_goleiro')
          .eq('id', 1)
          .single();
        if (error) throw error;
        if (data) {
          setDbTaxas({
            app: data.taxa_app,
            dia: data.taxa_dia,
            hora: data.taxa_hora,
            taxa_goleiro: data.taxa_goleiro,
          });
        }
      } catch (e) {
        console.error("Erro ao carregar taxas do BD:", e);
      }
    };
    fetchDbTaxas();
  }, []);

  const loadCategorias = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('categorias_avaliacao').select('*');
      if (error) throw error;
      setCategorias(data || []);
    } catch (e) {
      console.error("Erro ao carregar categorias:", e);
      setCategorias([]);
    }
  }, []);

  const loadRecargas = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('recargas_coins').select(`*, organizador:usuarios(id, nome, email)`);
      if (error) throw error;
      setRecargas(data || []);
    } catch (e) {
      console.error("Erro ao carregar recargas:", e);
      setRecargas([]);
    }
  }, []);

  const loadSaques = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('saques_pix').select(`*, goleiro:usuarios(id, nome, email)`);
      if (error) throw error;
      setSaques(data || []);
    } catch (e) {
      console.error("Erro ao carregar saques:", e);
      setSaques([]);
    }
  }, []);

  const loadChamadosSuporte = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('chamados_suporte').select(`*, solicitante:usuarios!solicitante_id(id, nome, tipo_usuario, foto_url)`);
      if (error) throw error;
      setChamadosSuporte(data || []);
    } catch (e) {
      console.error("Erro ao carregar chamados:", e);
      setChamadosSuporte([]);
    }
  }, []);

  const loadMensagensSuporte = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('mensagens_suporte').select(`*, autor:usuarios!autor_id(id, nome, tipo_usuario, foto_url)`);
      if (error) throw error;
      setMensagensSuporte(data || []);
    } catch (e) {
      console.error("Erro ao carregar mensagens:", e);
      setMensagensSuporte([]);
    }
  }, []);

  const loadAllUsers = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('usuarios').select('*').order('nome', { ascending: true });
      if (error) throw error;
      setAllAppUsers(data || []);
    } catch (e) {
      console.error("Erro ao carregar usuários:", e);
      setAllAppUsers([]);
    }
  }, []);

  const loadUserData = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase.from('usuarios').select('*').eq('id', userId).single();
      if (error) throw error;
      setAllAppUsers(prev => {
        const exists = prev.some(u => u.id === userId);
        return exists ? prev.map(u => u.id === userId ? { ...u, ...data } : u) : [...prev, data];
      });
    } catch (e) {
      console.error("Erro ao carregar dados do usuário:", e);
    }
  }, []);

  const loadData = useCallback(async (): Promise<void> => {
    if (authLoading) return;
    setLoading(true);
    try {
      await Promise.all([
        fetchConvocacoes(),
        loadSaldos(),
        loadCategorias(),
        loadRecargas(),
        loadSaques(),
        loadChamadosSuporte(),
        loadMensagensSuporte(),
        loadAllUsers(),
      ]);
      if (user) {
        dataLoadedForUserRef.current = user.id;
        dataClearedForNullUserRef.current = false;
      }
    } catch (error) {
      console.error('Erro ao carregar dados do app:', error);
    } finally {
      setLoading(false);
    }
  }, [authLoading, user, fetchConvocacoes, loadSaldos, loadCategorias, loadRecargas, loadSaques, loadChamadosSuporte, loadMensagensSuporte, loadAllUsers]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      Alert.alert('Erro', 'Não foi possível atualizar os dados');
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const clearAllAppDataStates = useCallback((): void => {
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

  const getAllUsers = useCallback((): User[] => allAppUsers, [allAppUsers]);

  const getUsuarioById = useCallback((userId: string): User | undefined => {
    return allAppUsers.find(u => u.id === userId);
  }, [allAppUsers]);

  const getUsuariosPendentes = useCallback((): User[] => {
    return allAppUsers.filter(u => u.status_aprovacao === 'pendente');
  }, [allAppUsers]);

  const aprovarUsuario = useCallback(async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('usuarios').update({ status_aprovacao: 'aprovado' }).eq('id', userId);
      if (error) throw error;
      await loadAllUsers();
      Alert.alert('Sucesso', 'Usuário aprovado com sucesso!');
    } catch (e) {
      console.error("Erro ao aprovar usuário:", e);
      Alert.alert('Erro', 'Não foi possível aprovar o usuário.');
    }
  }, [loadAllUsers]);

  const rejeitarUsuario = useCallback(async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('usuarios').update({ status_aprovacao: 'rejeitado' }).eq('id', userId);
      if (error) throw error;
      await loadAllUsers();
      Alert.alert('Sucesso', 'Usuário rejeitado.');
    } catch (e) {
      console.error("Erro ao rejeitar usuário:", e);
      Alert.alert('Erro', 'Não foi possível rejeitar o usuário.');
    }
  }, [loadAllUsers]);

  const atualizarUsuario = useCallback(async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const { error } = await supabase.from('usuarios').update(updates).eq('id', userId);
      if (error) throw error;
      await loadUserData(userId);
    } catch (e) {
      console.error("Erro ao atualizar usuário:", e);
      throw e;
    }
  }, [loadUserData]);

  const getSaquesPendentes = useCallback((): SaquePix[] => {
    return saques.filter(saque => saque.status === 'pendente');
  }, [saques]);

  const getRecargasPendentes = useCallback((): RecargaCoins[] => {
    return recargas.filter(recarga => recarga.status === 'pendente');
  }, [recargas]);

  const getTransacoesUsuario = useCallback(() => {
    if (!user) return { recargas: [], saques: [] };
    return {
      recargas: recargas.filter(r => r.organizador_id === user.id),
      saques: saques.filter(s => s.goleiro_id === user.id)
    };
  }, [recargas, saques, user]);

  const criarConvocacao = useCallback(async (convocacao: Omit<Convocacao, 'id' | 'created_at' | 'updated_at'>): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const saldoUsuario = getSaldoUsuario();
      if (saldoUsuario.saldo_coins < convocacao.valor_retido) {
        throw new Error('Saldo insuficiente para criar a convocação');
      }
      const { error } = await supabase.from('convocacoes').insert(convocacao).select().single();
      if (error) throw error;
      await supabase.from('saldos').update({
        saldo_coins: saldoUsuario.saldo_coins - convocacao.valor_retido,
        saldo_retido: (saldoUsuario.saldo_retido || 0) + convocacao.valor_retido
      }).eq('usuario_id', user.id);
      await loadData();
      Alert.alert('Sucesso', 'Convocação criada com sucesso!');
    } catch (error: any) {
      console.error("Erro ao criar convocação:", error);
      Alert.alert('Erro', error.message || 'Não foi possível criar a convocação');
    }
  }, [user, getSaldoUsuario, loadData]);

  const aceitarConvocacao = useCallback(async (convocacaoId: string): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      const { error } = await supabase.from('convocacoes').update({ status: 'aceito', goleiro_id: user.id }).eq('id', convocacaoId);
      if (error) throw error;
      await loadData();
      Alert.alert('Sucesso', 'Convocação aceita com sucesso!');
    } catch (error: any) {
      console.error("Erro ao aceitar convocação:", error);
      Alert.alert('Erro', error.message || 'Não foi possível aceitar a convocação');
    }
  }, [user, convocacoes, loadData]);

  const recusarConvocacao = useCallback(async (convocacaoId: string): Promise<void> => {
    try {
      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      const { error } = await supabase.from('convocacoes').update({ status: 'recusado' }).eq('id', convocacaoId);
      if (error) throw error;
      const saldoOrganizador = getSaldo(convocacao.organizador_id);
      if (saldoOrganizador) {
        await supabase.from('saldos').update({
          saldo_coins: saldoOrganizador.saldo_coins + convocacao.valor_retido,
          saldo_retido: saldoOrganizador.saldo_retido - convocacao.valor_retido
        }).eq('usuario_id', convocacao.organizador_id);
      }
      await loadData();
      Alert.alert('Sucesso', 'Convocação recusada com sucesso!');
    } catch (error: any) {
      console.error("Erro ao recusar convocação:", error);
      Alert.alert('Erro', error.message || 'Não foi possível recusar a convocação');
    }
  }, [convocacoes, getSaldo, loadData]);

  const avaliarGoleiro = useCallback(async (convocacaoId: string, nota: number): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      if (!convocacao.goleiro_id) throw new Error('Goleiro não definido na convocação');
      if (convocacao.organizador_id !== user.id) throw new Error('Apenas o organizador pode avaliar o goleiro');

      const { error: avaliacaoError } = await supabase.from('avaliacoes_goleiro').upsert({
        convocacao_id: convocacaoId,
        nota,
        organizador_id: user.id,
        goleiro_id: convocacao.goleiro_id,
      });
      if (avaliacaoError) throw avaliacaoError;

      const { error: updateError } = await supabase.from('convocacoes').update({ avaliado_goleiro: true }).eq('id', convocacaoId);
      if (updateError) throw updateError;

      const taxaApp = dbTaxas.app;
      const valorParaGoleiro = convocacao.valor_retido - taxaApp;

      const saldoGoleiro = getSaldo(convocacao.goleiro_id);
      await supabase.from('saldos').upsert({
        usuario_id: convocacao.goleiro_id,
        saldo_coins: (saldoGoleiro?.saldo_coins || 0) + valorParaGoleiro,
      }, { onConflict: 'usuario_id' });

      const saldoOrganizador = getSaldo(user.id);
      await supabase.from('saldos').upsert({
        usuario_id: user.id,
        saldo_retido: (saldoOrganizador?.saldo_retido || 0) - convocacao.valor_retido,
      }, { onConflict: 'usuario_id' });

      await loadData();
      Alert.alert('Sucesso', 'Goleiro avaliado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao avaliar goleiro:", error);
      Alert.alert('Erro', error.message || 'Não foi possível avaliar o goleiro');
    }
  }, [user, convocacoes, getSaldo, loadData, dbTaxas]);

  const avaliarOrganizador = useCallback(async (convocacaoId: string, categoria: string): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      if (convocacao.goleiro_id !== user.id) throw new Error('Apenas o goleiro pode avaliar o organizador');
      const { error: avaliacaoError } = await supabase.from('avaliacoes_organizador').upsert({
        convocacao_id: convocacaoId,
        goleiro_id: user.id,
        organizador_id: convocacao.organizador_id,
        categoria_avaliacao: categoria,
      });
      if (avaliacaoError) throw avaliacaoError;
      const { error: updateError } = await supabase.from('convocacoes').update({ avaliado_organizador: true }).eq('id', convocacaoId);
      if (updateError) throw updateError;
      await loadData();
      Alert.alert('Sucesso', 'Organizador avaliado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao avaliar organizador:", error);
      Alert.alert('Erro', error.message || 'Não foi possível avaliar o organizador');
    }
  }, [user, convocacoes, loadData]);

  const confirmarPresenca = useCallback(async (convocacaoId: string, status: 'compareceu' | 'nao_compareceu'): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      if (convocacao.organizador_id !== user.id) throw new Error('Apenas o organizador pode confirmar presença');
      const { error } = await supabase.from('convocacoes').update({ presenca_status: status }).eq('id', convocacaoId);
      if (error) throw error;
      await loadData();
      Alert.alert('Sucesso', `Presença confirmada como: ${status}`);
    } catch (error: any) {
      console.error("Erro ao confirmar presença:", error);
      Alert.alert('Erro', error.message || 'Não foi possível confirmar a presença');
    }
  }, [user, convocacoes, loadData]);

  const getConvocacoesPorUsuario = useCallback((userId: string): Convocacao[] => {
    return convocacoes.filter(c => c.organizador_id === userId || c.goleiro_id === userId);
  }, [convocacoes]);

  const getConvocacoesAtivas = useCallback((): Convocacao[] => {
    const now = new Date();
    return convocacoes.filter(c => (c.status === 'pendente' || c.status === 'aceito') && new Date(c.data_hora_fim) > now);
  }, [convocacoes]);

  const getConvocacoesHistorico = useCallback((): Convocacao[] => {
    const now = new Date();
    return convocacoes.filter(c => c.status === 'recusado' || c.status === 'cancelado' || (new Date(c.data_hora_fim) < now && c.status === 'aceito'));
  }, [convocacoes]);

  const recarregarCoins = useCallback(async (recarga: Omit<RecargaCoins, 'id' | 'created_at'>): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('recargas_coins').insert({ ...recarga, organizador_id: user.id, status: 'pendente' });
      if (error) throw error;
      await loadRecargas();
      Alert.alert('Sucesso', 'Solicitação de recarga enviada para aprovação!');
    } catch (error: any) {
      console.error("Erro ao solicitar recarga:", error);
      Alert.alert('Erro', error.message || 'Não foi possível solicitar a recarga');
    }
  }, [user, loadRecargas]);

  const aprovarRecarga = useCallback(async (recargaId: string): Promise<void> => {
    try {
      const { data: recarga, error: recargaError } = await supabase.from('recargas_coins').select('organizador_id, coins_recebidos').eq('id', recargaId).single();
      if (recargaError || !recarga) throw new Error('Recarga não encontrada');
      const { error: updateError } = await supabase.from('recargas_coins').update({ status: 'aprovado' }).eq('id', recargaId);
      if (updateError) throw updateError;
      const saldoExistente = getSaldo(recarga.organizador_id);
      await supabase.from('saldos').upsert({
        usuario_id: recarga.organizador_id,
        saldo_coins: (saldoExistente?.saldo_coins || 0) + recarga.coins_recebidos,
      }, { onConflict: 'usuario_id' });
      await loadData();
      Alert.alert('Sucesso', 'Recarga aprovada e saldo atualizado!');
    } catch (error: any) {
      console.error("Erro ao aprovar recarga:", error);
      Alert.alert('Erro', error.message || 'Não foi possível aprovar a recarga');
    }
  }, [getSaldo, loadData]);

  const rejeitarRecarga = useCallback(async (recargaId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('recargas_coins').update({ status: 'rejeitado' }).eq('id', recargaId);
      if (error) throw error;
      await loadRecargas();
      Alert.alert('Sucesso', 'Recarga rejeitada.');
    } catch (error: any) {
      console.error("Erro ao rejeitar recarga:", error);
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar a recarga');
    }
  }, [loadRecargas]);

  const solicitarSaque = useCallback(async (saque: Omit<SaquePix, 'id' | 'created_at'>): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const saldoUsuario = getSaldoUsuario();
      if (saldoUsuario.saldo_coins < saque.valor_saque) {
        throw new Error('Saldo insuficiente para realizar o saque');
      }
      const { error } = await supabase.from('saques_pix').insert({ ...saque, goleiro_id: user.id, status: 'pendente' });
      if (error) throw error;
      await supabase.from('saldos').update({
        saldo_coins: saldoUsuario.saldo_coins - saque.valor_saque
      }).eq('usuario_id', user.id);
      await loadData();
      Alert.alert('Sucesso', 'Solicitação de saque enviada para aprovação!');
    } catch (error: any) {
      console.error("Erro ao solicitar saque:", error);
      Alert.alert('Erro', error.message || 'Não foi possível solicitar o saque');
    }
  }, [user, getSaldoUsuario, loadData]);

  const aprovarSaque = useCallback(async (saqueId: string): Promise<void> => {
    try {
      const { data: saque, error: saqueError } = await supabase.from('saques_pix').select('goleiro_id, valor_saque').eq('id', saqueId).single();
      if (saqueError || !saque) throw new Error('Saque não encontrado');
      const { error: updateError } = await supabase.from('saques_pix').update({ status: 'aprovado' }).eq('id', saqueId);
      if (updateError) throw updateError;
      await loadSaques();
      Alert.alert('Sucesso', 'Saque aprovado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao aprovar saque:", error);
      Alert.alert('Erro', error.message || 'Não foi possível aprovar o saque');
    }
  }, [loadSaques]);

  const rejeitarSaque = useCallback(async (saqueId: string): Promise<void> => {
    try {
      const { data: saque, error: saqueError } = await supabase.from('saques_pix').select('goleiro_id, valor_saque').eq('id', saqueId).single();
      if (saqueError || !saque) throw new Error('Saque não encontrado');
      const { error: updateError } = await supabase.from('saques_pix').update({ status: 'rejeitado' }).eq('id', saqueId);
      if (updateError) throw updateError;
      const saldoGoleiro = getSaldo(saque.goleiro_id);
      if (saldoGoleiro) {
        await supabase.from('saldos').update({
          saldo_coins: saldoGoleiro.saldo_coins + saque.valor_saque
        }).eq('usuario_id', saque.goleiro_id);
      }
      await loadData();
      Alert.alert('Sucesso', 'Saque rejeitado e valor devolvido ao saldo!');
    } catch (error: any) {
      console.error("Erro ao rejeitar saque:", error);
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar o saque');
    }
  }, [getSaldo, loadData]);

  const transferirCoins = useCallback(async (destinatarioId: string, valor: number): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      if (user.id === destinatarioId) throw new Error('Não é possível transferir para si mesmo');
      const saldoRemetente = getSaldoUsuario();
      if (saldoRemetente.saldo_coins < valor) {
        throw new Error('Saldo insuficiente para realizar a transferência');
      }
      await supabase.from('saldos').update({
        saldo_coins: saldoRemetente.saldo_coins - valor
      }).eq('usuario_id', user.id);
      const saldoDestinatario = getSaldo(destinatarioId);
      await supabase.from('saldos').upsert({
        usuario_id: destinatarioId,
        saldo_coins: (saldoDestinatario?.saldo_coins || 0) + valor,
      }, { onConflict: 'usuario_id' });
      await loadData();
      Alert.alert('Sucesso', 'Transferência realizada com sucesso!');
    } catch (error: any) {
      console.error("Erro ao transferir coins:", error);
      Alert.alert('Erro', error.message || 'Não foi possível realizar a transferência');
    }
  }, [user, getSaldoUsuario, getSaldo, loadData]);

  const criarChamadoSuporte = useCallback(async (chamado: Omit<ChamadoSuporte, 'id' | 'created_at' | 'solicitante'>): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('chamados_suporte').insert({ ...chamado, solicitante_id: user.id, status: 'pendente' });
      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado criado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao criar chamado:", error);
      Alert.alert('Erro', error.message || 'Não foi possível criar o chamado');
    }
  }, [user, loadChamadosSuporte]);

  const aprovarChamadoSuporte = useCallback(async (chamadoId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('chamados_suporte').update({ status: 'aprovado' }).eq('id', chamadoId);
      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado aprovado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao aprovar chamado:", error);
      Alert.alert('Erro', error.message || 'Não foi possível aprovar o chamado');
    }
  }, [loadChamadosSuporte]);

  const recusarChamadoSuporte = useCallback(async (chamadoId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('chamados_suporte').update({ status: 'recusado' }).eq('id', chamadoId);
      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado recusado com sucesso!');
    } catch (error: any) {
      console.error("Erro ao recusar chamado:", error);
      Alert.alert('Erro', error.message || 'Não foi possível recusar o chamado');
    }
  }, [loadChamadosSuporte]);

  const resolverChamadoSuporte = useCallback(async (chamadoId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('chamados_suporte').update({ status: 'resolvido' }).eq('id', chamadoId);
      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado marcado como resolvido!');
    } catch (error: any) {
      console.error("Erro ao resolver chamado:", error);
      Alert.alert('Erro', error.message || 'Não foi possível resolver o chamado');
    }
  }, [loadChamadosSuporte]);

  const enviarMensagemSuporte = useCallback(async (mensagem: Omit<MensagemSuporte, 'id' | 'created_at' | 'autor'>): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      const { error } = await supabase.from('mensagens_suporte').insert({ ...mensagem, autor_id: user.id });
      if (error) throw error;
      await loadMensagensSuporte();
    } catch (error: any) {
      console.error("Erro ao enviar mensagem:", error);
      Alert.alert('Erro', error.message || 'Não foi possível enviar a mensagem');
    }
  }, [user, loadMensagensSuporte]);

  const getChamadosPorUsuario = useCallback((userId: string): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => c.solicitante_id === userId);
  }, [chamadosSuporte]);

  const getMensagensPorChamado = useCallback((chamadoId: string): MensagemSuporte[] => {
    return mensagensSuporte.filter(m => m.chamado_id === chamadoId);
  }, [mensagensSuporte]);

  const getChamadosAbertos = useCallback((): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => c.status === 'pendente' || c.status === 'aprovado');
  }, [chamadosSuporte]);

  const getChamadosResolvidos = useCallback((): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => c.status === 'resolvido' || c.status === 'recusado');
  }, [chamadosSuporte]);

  const isGoleiroAvaliado = useCallback((convocacaoId: string): boolean => {
    const convocacao = convocacoes.find(c => c.id === convocacaoId);
    return convocacao?.avaliado_goleiro || false;
  }, [convocacoes]);

  const isOrganizadorAvaliado = useCallback((convocacaoId: string): boolean => {
    const convocacao = convocacoes.find(c => c.id === convocacaoId);
    return convocacao?.avaliado_organizador || false;
  }, [convocacoes]);

  const formatarData = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatarMoeda = useCallback((valor: number): string => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  }, []);

  // ===== INÍCIO DA MODIFICAÇÃO =====
  // O valor do contexto foi atualizado para expor a nova função de cálculo.
  const contextValue = useMemo(() => ({
    convocacoes, saldos, categorias, recargas, saques, chamadosSuporte, mensagensSuporte, allAppUsers, refreshing, loading,
    getAllUsers, getUsuariosPendentes, aprovarUsuario, rejeitarUsuario, getUsuarioById, atualizarUsuario, getSaquesPendentes,
    getRecargasPendentes, getTransacoesUsuario, fetchConvocacoes, criarConvocacao, aceitarConvocacao, recusarConvocacao,
    avaliarGoleiro, avaliarOrganizador, confirmarPresenca, getConvocacoesPorUsuario, getConvocacoesAtivas, getConvocacoesHistorico,
    recarregarCoins, aprovarRecarga, rejeitarRecarga, solicitarSaque, aprovarSaque, rejeitarSaque, getSaldo, getSaldoUsuario,
    transferirCoins, criarChamadoSuporte, aprovarChamadoSuporte, recusarChamadoSuporte, resolverChamadoSuporte,
    enviarMensagemSuporte, getChamadosPorUsuario, getMensagensPorChamado, getChamadosAbertos, getChamadosResolvidos,
    loadData, loadChamadosSuporte, handleRefresh, loadUserData, isGoleiroAvaliado, isOrganizadorAvaliado, formatarData,
    formatarMoeda, calcularDetalhesConvocacao, // AQUI ESTÁ A MUDANÇA
  }), [
    convocacoes, saldos, categorias, recargas, saques, chamadosSuporte, mensagensSuporte, allAppUsers, refreshing, loading,
    getAllUsers, getUsuariosPendentes, aprovarUsuario, rejeitarUsuario, getUsuarioById, atualizarUsuario, getSaquesPendentes,
    getRecargasPendentes, getTransacoesUsuario, fetchConvocacoes, criarConvocacao, aceitarConvocacao, recusarConvocacao,
    avaliarGoleiro, avaliarOrganizador, confirmarPresenca, getConvocacoesPorUsuario, getConvocacoesAtivas, getConvocacoesHistorico,
    recarregarCoins, aprovarRecarga, rejeitarRecarga, solicitarSaque, aprovarSaque, rejeitarSaque, getSaldo, getSaldoUsuario,
    transferirCoins, criarChamadoSuporte, aprovarChamadoSuporte, recusarChamadoSuporte, resolverChamadoSuporte,
    enviarMensagemSuporte, getChamadosPorUsuario, getMensagensPorChamado, getChamadosAbertos, getChamadosResolvidos,
    loadData, loadChamadosSuporte, handleRefresh, loadUserData, isGoleiroAvaliado, isOrganizadorAvaliado, formatarData,
    formatarMoeda, calcularDetalhesConvocacao, // AQUI ESTÁ A MUDANÇA
  ]);
  // ===== FIM DA MODIFICAÇÃO =====

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}