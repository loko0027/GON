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
import { sendPushNotification, notifyMultipleUsers } from '@/services/notificationService';

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
  
  calcularTaxaConvocacao: (nivelJogador: 'iniciante' | 'intermediario' | 'veterano', dataHora: Date) => number;
  calcularTaxaApp: (valor: number) => number;
  calcularValorGoleiro: (nivelJogador: 'iniciante' | 'intermediario' | 'veterano', dataHora: Date) => number;
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
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const dataLoadedForUserRef = useRef<string | null>(null);
  const dataClearedForNullUserRef = useRef(false);

  // ✅ TAXA FIXA DO APP: SEMPRE 5 COINS
  const calcularTaxaApp = useCallback((valor: number): number => {
    return 5;
  }, []);

  // ✅ VALOR QUE O GOLEIRO RECEBE (base + dia + horário)
  const calcularValorGoleiro = useCallback((
    nivelJogador: 'iniciante' | 'intermediario' | 'veterano', 
    dataHora: Date
  ): number => {
    let valorBaseGoleiro = 0;
    switch (nivelJogador) {
      case 'iniciante':
        valorBaseGoleiro = 30;
        break;
      case 'intermediario':
        valorBaseGoleiro = 50;
        break;
      case 'veterano':
        valorBaseGoleiro = 70;
        break;
    }

    const diaSemana = dataHora.getDay();
    const diasValorizados = [0, 1, 5, 6];
    const taxaDia = diasValorizados.includes(diaSemana) ? 5 : 0;

    const hora = dataHora.getHours();
    let taxaHorario = 0;
    if (hora >= 9 && hora < 14) {
      taxaHorario = 6;
    }

    return valorBaseGoleiro + taxaDia + taxaHorario;
  }, []);

  // ✅ VALOR TOTAL QUE O ORGANIZADOR PAGA (goleiro + app)
  const calcularTaxaConvocacao = useCallback((
    nivelJogador: 'iniciante' | 'intermediario' | 'veterano', 
    dataHora: Date
  ): number => {
    const valorGoleiro = calcularValorGoleiro(nivelJogador, dataHora);
    const taxaApp = calcularTaxaApp(0);
    
    return valorGoleiro + taxaApp;
  }, [calcularValorGoleiro, calcularTaxaApp]);

  const fetchConvocacoes = useCallback(async (): Promise<Convocacao[]> => {
    try {
      if (!user) {
        setConvocacoes([]);
        return [];
      }

      const { data, error } = await supabase
        .from('convocacoes')
        .select(`
          *,
          organizador:usuarios!convocacoes_organizador_id_fkey(id, nome, foto_url),
          goleiro:usuarios!convocacoes_goleiro_id_fkey(id, nome, foto_url),
          avaliacoes_goleiro:avaliacoes_goleiro(*),
          avaliacoes_organizador:avaliacoes_organizador(*)
        `)
        .order('data_hora_inicio', { ascending: false });

      if (error) throw error;

      const convocacoesFormatadas = data?.map(conv => ({
        ...conv,
        organizador_nome: conv.organizador?.nome || 'Organizador não encontrado',
        goleiro_nome: conv.goleiro?.nome || null,
        organizador_foto_url: conv.organizador?.foto_url || null,
        goleiro_foto_url: conv.goleiro?.foto_url || null
      })) || [];

      setConvocacoes(convocacoesFormatadas);
      return convocacoesFormatadas;
    } catch (e) {
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
      setSaldos([]);
    }
  }, []);

  const loadCategorias = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase.from('categorias_avaliacao').select('*');
      if (error) throw error;
      setCategorias(data || []);
    } catch (e) {
      setCategorias([]);
    }
  }, []);

  const loadRecargas = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('recargas_coins')
        .select(`*, organizador:usuarios(id, nome, email)`);
      if (error) throw error;
      setRecargas(data || []);
    } catch (e) {
      setRecargas([]);
    }
  }, []);

  const loadSaques = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('saques_pix')
        .select(`*, goleiro:usuarios(id, nome, email)`);
      if (error) throw error;
      setSaques(data || []);
    } catch (e) {
      setSaques([]);
    }
  }, []);

  const loadChamadosSuporte = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('chamados_suporte')
        .select(`
          *,
          solicitante:usuarios!solicitante_id(id, nome, tipo_usuario, foto_url)
        `);
      if (error) throw error;
      setChamadosSuporte(data || []);
    } catch (e) {
      setChamadosSuporte([]);
    }
  }, []);

  const loadMensagensSuporte = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('mensagens_suporte')
        .select(`
          *,
          autor:usuarios!autor_id(id, nome, tipo_usuario, foto_url)
        `);
      if (error) throw error;
      setMensagensSuporte(data || []);
    } catch (e) {
      setMensagensSuporte([]);
    }
  }, []);

  const loadAllUsers = useCallback(async (): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome', { ascending: true });
      if (error) throw error;
      setAllAppUsers(data || []);
    } catch (e) {
      setAllAppUsers([]);
    }
  }, []);

  const loadUserData = useCallback(async (userId: string): Promise<void> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      setAllAppUsers(prev => {
        const exists = prev.some(u => u.id === userId);
        return exists ? prev.map(u => u.id === userId ? { ...u, ...data } : u) : [...prev, data];
      });
    } catch (e) {
      // Silencioso
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
      Alert.alert('Erro', 'Não foi possível carregar os dados');
    } finally {
      setLoading(false);
    }
  }, [
    authLoading,
    user,
    fetchConvocacoes,
    loadSaldos,
    loadCategorias,
    loadRecargas,
    loadSaques,
    loadChamadosSuporte,
    loadMensagensSuporte,
    loadAllUsers,
  ]);

  const handleRefresh = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
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
      loadData().catch(() => {});
    }
  }, [user, authLoading, loadData, clearAllAppDataStates]);

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

  const getAllUsers = useCallback((): User[] => allAppUsers, [allAppUsers]);

  const getUsuarioById = useCallback((userId: string): User | undefined => {
    return allAppUsers.find(u => u.id === userId);
  }, [allAppUsers]);

  const getUsuariosPendentes = useCallback((): User[] => {
    return allAppUsers.filter(u => u.status_aprovacao === 'pendente');
  }, [allAppUsers]);

  // ✅ FUNÇÕES CORRIGIDAS PARA APROVAR/REJEITAR USUÁRIOS
  const aprovarUsuario = useCallback(async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ status_aprovacao: 'aprovado' })
        .eq('id', userId);
      
      if (error) throw error;

      await sendPushNotification(userId, 'conta_aprovada', {
        message: 'Sua conta foi aprovada! Agora você pode usar todos os recursos do app.'
      });

      // ✅ ATUALIZA A LISTA DE USUÁRIOS APÓS A MUDANÇA
      await loadAllUsers();
      Alert.alert('Sucesso', 'Usuário aprovado com sucesso!');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível aprovar o usuário.');
    }
  }, [loadAllUsers]);

  const rejeitarUsuario = useCallback(async (userId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ status_aprovacao: 'rejeitado' })
        .eq('id', userId);
      
      if (error) throw error;

      await sendPushNotification(userId, 'conta_rejeitada', {
        message: 'Sua conta foi rejeitada. Entre em contato conosco para mais informações.'
      });

      // ✅ ATUALIZA A LISTA DE USUÁRIOS APÓS A MUDANÇA
      await loadAllUsers();
      Alert.alert('Sucesso', 'Usuário rejeitado.');
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível rejeitar o usuário.');
    }
  }, [loadAllUsers]);

  const atualizarUsuario = useCallback(async (userId: string, updates: Partial<User>): Promise<void> => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', userId);
      
      if (error) throw error;

      await loadUserData(userId);
    } catch (e) {
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

  const criarConvocacao = useCallback(async (
    convocacao: Omit<Convocacao, 'id' | 'created_at' | 'updated_at'>
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const saldoUsuario = getSaldoUsuario();
      if (saldoUsuario.saldo_coins < convocacao.valor_retido) {
        throw new Error('Saldo insuficiente para criar a convocação');
      }

      const { data: novaConvocacao, error } = await supabase
        .from('convocacoes')
        .insert(convocacao)
        .select(`
          *,
          organizador:usuarios!convocacoes_organizador_id_fkey(id, nome, foto_url)
        `)
        .single();

      if (error || !novaConvocacao) throw error || new Error('Falha ao criar convocação');

      await supabase
        .from('saldos')
        .update({
          saldo_coins: saldoUsuario.saldo_coins - convocacao.valor_retido,
          saldo_retido: (saldoUsuario.saldo_retido || 0) + convocacao.valor_retido
        })
        .eq('usuario_id', user.id);

      await sendPushNotification(convocacao.goleiro_id, 'new_convocacao', {
        organizadorNome: user.nome,
        valor: convocacao.valor_retido,
        convocacaoId: novaConvocacao.id
      });

      await loadData();
      Alert.alert('Sucesso', 'Convocação criada com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar a convocação');
    }
  }, [user, getSaldoUsuario, loadData]);

  const aceitarConvocacao = useCallback(async (convocacaoId: string): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');

      const { error } = await supabase
        .from('convocacoes')
        .update({
          status: 'aceito',
          goleiro_id: user.id
        })
        .eq('id', convocacaoId);

      if (error) throw error;

      await sendPushNotification(convocacao.organizador_id, 'convocacao_aceita', {
        goleiroNome: user.nome,
        valor: convocacao.valor_retido,
        convocacaoId
      });

      await loadData();
      Alert.alert('Sucesso', 'Convocação aceita com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aceitar a convocação');
    }
  }, [user, convocacoes, loadData]);

  const recusarConvocacao = useCallback(async (convocacaoId: string): Promise<void> => {
    try {
      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');

      const { error } = await supabase
        .from('convocacoes')
        .update({ status: 'recusado' })
        .eq('id', convocacaoId);

      if (error) throw error;

      const saldoOrganizador = getSaldo(convocacao.organizador_id);
      if (saldoOrganizador) {
        await supabase
          .from('saldos')
          .update({
            saldo_coins: saldoOrganizador.saldo_coins + convocacao.valor_retido,
            saldo_retido: saldoOrganizador.saldo_retido - convocacao.valor_retido
          })
          .eq('usuario_id', convocacao.organizador_id);
      }

      await sendPushNotification(convocacao.organizador_id, 'convocacao_recusada', {
        goleiroNome: user?.nome || 'Goleiro',
        convocacaoId
      });

      await loadData();
      Alert.alert('Sucesso', 'Convocação recusada com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível recusar a convocação');
    }
  }, [convocacoes, getSaldo, loadData, user]);

  const avaliarGoleiro = useCallback(async (convocacaoId: string, nota: number): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      if (convocacao.organizador_id !== user.id) throw new Error('Apenas o organizador pode avaliar o goleiro');

      const { error: avaliacaoError } = await supabase
        .from('avaliacoes_goleiro')
        .upsert({
          convocacao_id: convocacaoId,
          nota,
          organizador_id: user.id,
          goleiro_id: convocacao.goleiro_id,
        });

      if (avaliacaoError) throw avaliacaoError;

      const { error: updateError } = await supabase
        .from('convocacoes')
        .update({ avaliado_goleiro: true })
        .eq('id', convocacaoId);

      if (updateError) throw updateError;

      const coins_calculados = 20 + nota * 5;

      const saldoGoleiro = getSaldo(convocacao.goleiro_id!);
      await supabase
        .from('saldos')
        .upsert({
          usuario_id: convocacao.goleiro_id!,
          saldo_coins: (saldoGoleiro?.saldo_coins || 0) + coins_calculados,
        }, { onConflict: 'usuario_id' });

      const saldoOrganizador = getSaldo(user.id);
      await supabase
        .from('saldos')
        .upsert({
          usuario_id: user.id,
          saldo_retido: (saldoOrganizador?.saldo_retido || 0) - convocacao.valor_retido,
        }, { onConflict: 'usuario_id' });

      await sendPushNotification(convocacao.goleiro_id!, 'avaliacao_recebida', {
        nota,
        coins: coins_calculados,
        convocacaoId
      });

      await loadData();
      Alert.alert('Sucesso', 'Goleiro avaliado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível avaliar o goleiro');
    }
  }, [user, convocacoes, getSaldo, loadData]);

  const avaliarOrganizador = useCallback(async (convocacaoId: string, categoria: string): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      if (convocacao.goleiro_id !== user.id) throw new Error('Apenas o goleiro pode avaliar o organizador');

      const { error: avaliacaoError } = await supabase
        .from('avaliacoes_organizador')
        .upsert({
          convocacao_id: convocacaoId,
          goleiro_id: user.id,
          organizador_id: convocacao.organizador_id,
          categoria_avaliacao: categoria,
        });

      if (avaliacaoError) throw avaliacaoError;

      const { error: updateError } = await supabase
        .from('convocacoes')
        .update({ avaliado_organizador: true })
        .eq('id', convocacaoId);

      if (updateError) throw updateError;

      await sendPushNotification(convocacao.organizador_id, 'avaliacao_recebida', {
        categoria,
        convocacaoId,
        avaliador: user.nome
      });

      await loadData();
      Alert.alert('Sucesso', 'Organizador avaliado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível avaliar o organizador');
    }
  }, [user, convocacoes, loadData]);

  const confirmarPresenca = useCallback(async (
    convocacaoId: string, 
    status: 'compareceu' | 'nao_compareceu'
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const convocacao = convocacoes.find(c => c.id === convocacaoId);
      if (!convocacao) throw new Error('Convocação não encontrada');
      if (convocacao.organizador_id !== user.id) throw new Error('Apenas o organizador pode confirmar presença');

      const { error } = await supabase
        .from('convocacoes')
        .update({ presenca_status: status })
        .eq('id', convocacaoId);

      if (error) throw error;

      if (convocacao.goleiro_id) {
        await sendPushNotification(convocacao.goleiro_id, 'presenca_confirmada', {
          status,
          coins: convocacao.valor_retido,
          convocacaoId,
          organizador: user.nome
        });
      }

      await loadData();
      Alert.alert('Sucesso', `Presença confirmada como: ${status}`);
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível confirmar a presença');
    }
  }, [user, convocacoes, loadData]);

  const getConvocacoesPorUsuario = useCallback((userId: string): Convocacao[] => {
    return convocacoes.filter(c => 
      c.organizador_id === userId || c.goleiro_id === userId
    );
  }, [convocacoes]);

  const getConvocacoesAtivas = useCallback((): Convocacao[] => {
    const now = new Date();
    return convocacoes.filter(c => 
      (c.status === 'pendente' || c.status === 'aceito') &&
      new Date(c.data_hora_fim) > now
    );
  }, [convocacoes]);

  const getConvocacoesHistorico = useCallback((): Convocacao[] => {
    const now = new Date();
    return convocacoes.filter(c => 
      c.status === 'recusado' || c.status === 'cancelado' || 
      (new Date(c.data_hora_fim) < now && c.status === 'aceito')
    );
  }, [convocacoes]);

  const recarregarCoins = useCallback(async (
    recarga: Omit<RecargaCoins, 'id' | 'created_at'>
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('recargas_coins')
        .insert({
          ...recarga,
          organizador_id: user.id,
          status: 'pendente'
        });

      if (error) throw error;

      const administradores = allAppUsers.filter(u => u.tipo_usuario === 'admin');
      
      await notifyMultipleUsers(
        administradores.map(admin => admin.id),
        'recarga_solicitada',
        {
          valor: recarga.coins_recebidos,
          organizadorId: user.id,
          organizadorNome: user.nome
        }
      );

      await loadRecargas();
      Alert.alert('Sucesso', 'Solicitação de recarga enviada para aprovação!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível solicitar a recarga');
    }
  }, [user, allAppUsers, loadRecargas]);

  const aprovarRecarga = useCallback(async (recargaId: string): Promise<void> => {
    try {
      const { data: recarga, error: recargaError } = await supabase
        .from('recargas_coins')
        .select('organizador_id, coins_recebidos')
        .eq('id', recargaId)
        .single();

      if (recargaError || !recarga) throw new Error('Recarga não encontrada');

      const { error: updateError } = await supabase
        .from('recargas_coins')
        .update({ status: 'aprovado' })
        .eq('id', recargaId);

      if (updateError) throw updateError;

      const saldoExistente = getSaldo(recarga.organizador_id);
      await supabase
        .from('saldos')
        .upsert({
          usuario_id: recarga.organizador_id,
          saldo_coins: (saldoExistente?.saldo_coins || 0) + recarga.coins_recebidos,
        }, { onConflict: 'usuario_id' });

      await sendPushNotification(recarga.organizador_id, 'recarga_aprovada', {
        coins: recarga.coins_recebidos
      });

      await loadData();
      Alert.alert('Sucesso', 'Recarga aprovada e saldo atualizado!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aprovar a recarga');
    }
  }, [getSaldo, loadData]);

  const rejeitarRecarga = useCallback(async (recargaId: string): Promise<void> => {
    try {
      const { data: recarga } = await supabase
        .from('recargas_coins')
        .select('organizador_id, coins_recebidos')
        .eq('id', recargaId)
        .single();

      if (!recarga) throw new Error('Recarga não encontrada');

      const { error } = await supabase
        .from('recargas_coins')
        .update({ status: 'rejeitado' })
        .eq('id', recargaId);

      if (error) throw error;

      await sendPushNotification(recarga.organizador_id, 'recarga_rejeitada', {
        coins: recarga.coins_recebidos
      });

      await loadRecargas();
      Alert.alert('Sucesso', 'Recarga rejeitada.');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar a recarga');
    }
  }, [loadRecargas]);

  const solicitarSaque = useCallback(async (
    saque: Omit<SaquePix, 'id' | 'created_at'>
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const saldoUsuario = getSaldoUsuario();
      if (saldoUsuario.saldo_coins < saque.valor_saque) {
        throw new Error('Saldo insuficiente para realizar o saque');
      }

      const { error } = await supabase
        .from('saques_pix')
        .insert({
          ...saque,
          goleiro_id: user.id,
          status: 'pendente'
        });

      if (error) throw error;

      await supabase
        .from('saldos')
        .update({ 
          saldo_coins: saldoUsuario.saldo_coins - saque.valor_saque 
        })
        .eq('usuario_id', user.id);

      const administradores = allAppUsers.filter(u => u.tipo_usuario === 'admin');
      
      await notifyMultipleUsers(
        administradores.map(admin => admin.id),
        'saque_solicitado',
        {
          valor: saque.valor_saque,
          goleiroId: user.id,
          goleiroNome: user.nome
        }
      );

      await loadData();
      Alert.alert('Sucesso', 'Solicitação de saque enviada para aprovação!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível solicitar o saque');
    }
  }, [user, allAppUsers, getSaldoUsuario, loadData]);

  const aprovarSaque = useCallback(async (saqueId: string): Promise<void> => {
    try {
      const { data: saque, error: saqueError } = await supabase
        .from('saques_pix')
        .select('goleiro_id, valor_coins, valor_reais')
        .eq('id', saqueId)
        .single();

      if (saqueError || !saque) throw new Error('Saque não encontrado');

      const { goleiro_id, valor_coins } = saque;

      const { data: saldoExistente } = await supabase
        .from('saldos')
        .select('*')
        .eq('usuario_id', goleiro_id)
        .single();

      if (!saldoExistente) {
        await supabase.from('saldos').insert({
          usuario_id: goleiro_id,
          saldo_coins: valor_coins ?? 0,
          saldo_retido: 0,
        });
      } else {
        await supabase.from('saldos').update({
          saldo_coins: (saldoExistente.saldo_coins ?? 0) + (valor_coins ?? 0),
        }).eq('usuario_id', goleiro_id);
      }

      const { error: updateError } = await supabase
        .from('saques_pix')
        .update({ status: 'aprovado' })
        .eq('id', saqueId);

      if (updateError) throw updateError;

      await sendPushNotification(goleiro_id, 'saque_aprovado', {
        valor: valor_coins ?? 0
      });

      await loadSaques();
      Alert.alert('Sucesso', 'Saque aprovado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aprovar o saque');
    }
  }, [loadSaques]);

  const rejeitarSaque = useCallback(async (saqueId: string): Promise<void> => {
    try {
      const { data: saque, error: saqueError } = await supabase
        .from('saques_pix')
        .select('goleiro_id, valor_saque')
        .eq('id', saqueId)
        .single();

      if (saqueError || !saque) throw new Error('Saque não encontrado');

      const { error: updateError } = await supabase
        .from('saques_pix')
        .update({ status: 'rejeitado' })
        .eq('id', saqueId);

      if (updateError) throw updateError;

      const saldoGoleiro = getSaldo(saque.goleiro_id);
      if (saldoGoleiro) {
        await supabase
          .from('saldos')
          .update({
            saldo_coins: saldoGoleiro.saldo_coins + saque.valor_saque
          })
          .eq('usuario_id', saque.goleiro_id);
      }

      await sendPushNotification(saque.goleiro_id, 'saque_rejeitado', {
        valor: saque.valor_saque
      });

      await loadData();
      Alert.alert('Sucesso', 'Saque rejeitado e valor devolvido ao saldo!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar o saque');
    }
  }, [getSaldo, loadData]);

  const transferirCoins = useCallback(async (
    destinatarioId: string, 
    valor: number
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');
      if (user.id === destinatarioId) throw new Error('Não é possível transferir para si mesmo');

      const saldoRemetente = getSaldoUsuario();
      if (saldoRemetente.saldo_coins < valor) {
        throw new Error('Saldo insuficiente para realizar a transferência');
      }

      await supabase
        .from('saldos')
        .update({ 
          saldo_coins: saldoRemetente.saldo_coins - valor 
        })
        .eq('usuario_id', user.id);

      const saldoDestinatario = getSaldo(destinatarioId);
      await supabase
        .from('saldos')
        .upsert({
          usuario_id: destinatarioId,
          saldo_coins: (saldoDestinatario?.saldo_coins || 0) + valor,
        }, { onConflict: 'usuario_id' });

      await sendPushNotification(destinatarioId, 'coins_recebidos', {
        remetente: user.nome,
        valor
      });

      await loadData();
      Alert.alert('Sucesso', 'Transferência realizada com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível realizar a transferência');
    }
  }, [user, getSaldoUsuario, getSaldo, loadData]);

  const criarChamadoSuporte = useCallback(async (
    chamado: Omit<ChamadoSuporte, 'id' | 'created_at' | 'solicitante'>
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('chamados_suporte')
        .insert({
          ...chamado,
          solicitante_id: user.id,
          status: 'pendente'
        });

      if (error) throw error;

      const administradores = allAppUsers.filter(u => u.tipo_usuario === 'admin');
      
      await notifyMultipleUsers(
        administradores.map(admin => admin.id),
        'novo_chamado',
        {
          solicitante: user.nome,
          assunto: chamado.assunto,
          solicitanteId: user.id
        }
      );

      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado criado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível criar o chamado');
    }
  }, [user, allAppUsers, loadChamadosSuporte]);

  const aprovarChamadoSuporte = useCallback(async (chamadoId: string): Promise<void> => {
    try {
      const { data: chamado } = await supabase
        .from('chamados_suporte')
        .select('solicitante_id')
        .eq('id', chamadoId)
        .single();

      if (!chamado) throw new Error('Chamado não encontrado');

      const { error } = await supabase
        .from('chamados_suporte')
        .update({ status: 'aprovado' })
        .eq('id', chamadoId);

      if (error) throw error;

      await sendPushNotification(chamado.solicitante_id, 'chamado_atualizado', {
        status: 'aprovado'
      });

      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado aprovado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aprovar o chamado');
    }
  }, [loadChamadosSuporte]);

  const recusarChamadoSuporte = useCallback(async (chamadoId: string): Promise<void> => {
    try {
      const { data: chamado } = await supabase
        .from('chamados_suporte')
        .select('solicitante_id')
        .eq('id', chamadoId)
        .single();

      if (!chamado) throw new Error('Chamado não encontrado');

      const { error } = await supabase
        .from('chamados_suporte')
        .update({ status: 'recusado' })
        .eq('id', chamadoId);

      if (error) throw error;

      await sendPushNotification(chamado.solicitante_id, 'chamado_atualizado', {
        status: 'recusado'
      });

      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado recusado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível recusar o chamado');
    }
  }, [loadChamadosSuporte]);

  const resolverChamadoSuporte = useCallback(async (chamadoId: string): Promise<void> => {
    try {
      const { data: chamado } = await supabase
        .from('chamados_suporte')
        .select('solicitante_id')
        .eq('id', chamadoId)
        .single();

      if (!chamado) throw new Error('Chamado não encontrado');

      const { error } = await supabase
        .from('chamados_suporte')
        .update({ status: 'resolvido' })
        .eq('id', chamadoId);

      if (error) throw error;

      await sendPushNotification(chamado.solicitante_id, 'chamado_atualizado', {
        status: 'resolvido'
      });

      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado marcado como resolvido!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível resolver o chamado');
    }
  }, [loadChamadosSuporte]);

  const enviarMensagemSuporte = useCallback(async (
    mensagem: Omit<MensagemSuporte, 'id' | 'created_at' | 'autor'>
  ): Promise<void> => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('mensagens_suporte')
        .insert({
          ...mensagem,
          autor_id: user.id
        });

      if (error) throw error;

      let userIdToNotify: string | null = null;
      
      if (user.tipo_usuario === 'admin') {
        const chamado = chamadosSuporte.find(c => c.id === mensagem.chamado_id);
        if (chamado) userIdToNotify = chamado.solicitante_id;
      } else {
        const administradores = allAppUsers.filter(u => u.tipo_usuario === 'admin');
        await notifyMultipleUsers(
          administradores.map(admin => admin.id),
          'nova_mensagem_suporte',
          {
            chamadoId: mensagem.chamado_id,
            remetente: user.nome,
            solicitanteId: user.id
          }
        );
      }

      if (userIdToNotify) {
        await sendPushNotification(userIdToNotify, 'nova_mensagem_suporte', {
          chamadoId: mensagem.chamado_id,
          remetente: 'Suporte'
        });
      }

      await loadMensagensSuporte();
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível enviar a mensagem');
    }
  }, [user, chamadosSuporte, allAppUsers, loadMensagensSuporte]);

  const getChamadosPorUsuario = useCallback((userId: string): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => c.solicitante_id === userId);
  }, [chamadosSuporte]);

  const getMensagensPorChamado = useCallback((chamadoId: string): MensagemSuporte[] => {
    return mensagensSuporte.filter(m => m.chamado_id === chamadoId);
  }, [mensagensSuporte]);

  const getChamadosAbertos = useCallback((): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => 
      c.status === 'pendente' || c.status === 'aprovado'
    );
  }, [chamadosSuporte]);

  const getChamadosResolvidos = useCallback((): ChamadoSuporte[] => {
    return chamadosSuporte.filter(c => 
      c.status === 'resolvido' || c.status === 'recusado'
    );
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
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const formatarMoeda = useCallback((valor: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  }, []);

  const contextValue = useMemo(() => ({
    convocacoes,
    saldos,
    categorias,
    recargas,
    saques,
    chamadosSuporte,
    mensagensSuporte,
    allAppUsers,
    refreshing,
    loading,
    getAllUsers,
    getUsuariosPendentes,
    getUsuarioById,
    aprovarUsuario,
    rejeitarUsuario,
    atualizarUsuario,
    getSaquesPendentes,
    getRecargasPendentes,
    getTransacoesUsuario,
    fetchConvocacoes,
    criarConvocacao,
    aceitarConvocacao,
    recusarConvocacao,
    avaliarGoleiro,
    avaliarOrganizador,
    confirmarPresenca,
    getConvocacoesPorUsuario,
    getConvocacoesAtivas,
    getConvocacoesHistorico,
    recarregarCoins,
    aprovarRecarga,
    rejeitarRecarga,
    solicitarSaque,
    aprovarSaque,
    rejeitarSaque,
    getSaldo,
    getSaldoUsuario,
    transferirCoins,
    criarChamadoSuporte,
    aprovarChamadoSuporte,
    recusarChamadoSuporte,
    resolverChamadoSuporte,
    enviarMensagemSuporte,
    getChamadosPorUsuario,
    getMensagensPorChamado,
    getChamadosAbertos,
    getChamadosResolvidos,
    loadData,
    loadChamadosSuporte,
    handleRefresh,
    loadUserData,
    isGoleiroAvaliado,
    isOrganizadorAvaliado,
    formatarData,
    formatarMoeda,
    calcularTaxaConvocacao,
    calcularTaxaApp,
    calcularValorGoleiro,
  }), [
    convocacoes,
    saldos,
    categorias,
    recargas,
    saques,
    chamadosSuporte,
    mensagensSuporte,
    allAppUsers,
    refreshing,
    loading,
    getAllUsers,
    getUsuariosPendentes,
    getUsuarioById,
    aprovarUsuario,
    rejeitarUsuario,
    atualizarUsuario,
    getSaquesPendentes,
    getRecargasPendentes,
    getTransacoesUsuario,
    fetchConvocacoes,
    criarConvocacao,
    aceitarConvocacao,
    recusarConvocacao,
    avaliarGoleiro,
    avaliarOrganizador,
    confirmarPresenca,
    getConvocacoesPorUsuario,
    getConvocacoesAtivas,
    getConvocacoesHistorico,
    recarregarCoins,
    aprovarRecarga,
    rejeitarRecarga,
    solicitarSaque,
    aprovarSaque,
    rejeitarSaque,
    getSaldo,
    getSaldoUsuario,
    transferirCoins,
    criarChamadoSuporte,
    aprovarChamadoSuporte,
    recusarChamadoSuporte,
    resolverChamadoSuporte,
    enviarMensagemSuporte,
    getChamadosPorUsuario,
    getMensagensPorChamado,
    getChamadosAbertos,
    getChamadosResolvidos,
    loadData,
    loadChamadosSuporte,
    handleRefresh,
    loadUserData,
    isGoleiroAvaliado,
    isOrganizadorAvaliado,
    formatarData,
    formatarMoeda,
    calcularTaxaConvocacao,
    calcularTaxaApp,
    calcularValorGoleiro,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}