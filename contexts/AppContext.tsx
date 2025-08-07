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
  User, // Assumindo que 'User' é a interface para a tabela 'usuarios'
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
  loadChamadosSuporte: () => Promise<void>; // Exposto para ser chamado de fora
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

      const convosComAvaliacao = (data || []).filter(c => {
        const isPassada = new Date(c.data_hora_fim) < new Date();
        const isAceita = c.status === 'aceito';

        if (!isAceita || !isPassada) {
            return (user.tipo_usuario === 'goleiro' && c.goleiro_id === user.id) ||
                   (user.tipo_usuario === 'organizador' && c.organizador_id === user.id);
        }

        if (user.tipo_usuario === 'goleiro') {
          const jaAvaliouOrganizador = c.avaliacoes_organizador && c.avaliacoes_organizador.some(
            (avaliacao: any) => avaliacao.goleiro_id === user.id && avaliacao.convocacao_id === c.id
          );
          return c.goleiro_id === user.id && !jaAvaliouOrganizador;

        } else if (user.tipo_usuario === 'organizador') {
          const jaAvaliouGoleiro = c.avaliacoes_goleiro && c.avaliacoes_goleiro.some(
            (avaliacao: any) => c.goleiro_id === c.goleiro_id && avaliacao.convocacao_id === c.id // organizador_id é implícito aqui se a avaliação for do organizador
          );
          return c.organizador_id === user.id && !jaAvaliouGoleiro;
        }

        return false;
      });

      setConvocacoes(convosComAvaliacao);

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

  // CORREÇÃO: loadChamadosSuporte agora busca os dados do solicitante
  const loadChamadosSuporte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('chamados_suporte')
        .select(`
          *,
          solicitante:usuarios!solicitante_id(id, nome, tipo_usuario)
        `); // Adiciona o join para o solicitante
      if (error) throw error;
      setChamadosSuporte(data || []);
    } catch (e) {
      console.error("Erro ao carregar chamados:", e);
      setChamadosSuporte([]);
    }
  }, []);

  // CORREÇÃO: loadMensagensSuporte agora busca os dados do autor
  const loadMensagensSuporte = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('mensagens_suporte')
        .select(`
          *,
          autor:usuarios!autor_id(id, nome, tipo_usuario)
        `); // Adiciona o join para o autor
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
      // Tenta buscar o saldo existente
      const { data: saldoExistente, error: saldoFetchError } = await supabase
        .from('saldos')
        .select('saldo_coins')
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

      const { data, error } = await supabase
        .from('avaliacoes_goleiro')
        .upsert({
          convocacao_id: convocacaoId,
          nota,
        })
        .select()
        .single();

      if (error) {
        Alert.alert('Erro', 'Não foi possível enviar a avaliação do goleiro. ' + error.message);
        return;
      }

      Alert.alert('Sucesso', `Avaliação do goleiro enviada: ${nota} estrelas`);
      await loadConvocacoes();

    }
    catch (err) {
      console.error("Erro em avaliarGoleiro:", err);
      Alert.alert('Erro', 'Erro inesperado ao enviar avaliação do goleiro.');
    }
  }, [convocacoes, loadConvocacoes, user]);


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

      const avaliacaoExistente = convocacao.avaliacoes_organizador?.find(
        (avaliacao: any) => avaliacao.goleiro_id === user.id
      );
      if (avaliacaoExistente) {
        Alert.alert('Aviso', 'Este organizador já foi avaliado por você para esta convocação.');
        return;
      }

      const payload = {
        convocacao_id: convocacaoId,
        goleiro_id: user.id,
        categoria_avaliacao: categoria,
      };

      const { data, error } = await supabase
        .from('avaliacoes_organizador')
        .upsert(payload)
        .select()
        .single();

      if (error) {
        Alert.alert('Erro', 'Não foi possível enviar a avaliação do organizador. ' + error.message);
        return;
      }

      Alert.alert('Sucesso', `Avaliação do organizador enviada: ${categoria}`);
      await loadConvocacoes();

    } catch (err) {
      console.error("Erro em avaliarOrganizador:", err);
      Alert.alert('Erro', 'Erro inesperado ao enviar avaliação do organizador.');
    }
  }, [convocacoes, loadConvocacoes, user]);

  // Outras funções
  const criarConvocacao = useCallback(async (convocacao: Omit<Convocacao, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { error } = await supabase.from('convocacoes').insert(convocacao);
      if (error) throw error;
      await loadConvocacoes();
      Alert.alert('Sucesso', 'Convocação criada com sucesso!');
    } catch (error) {
      console.error("Erro em criarConvocacao:", error);
      Alert.alert('Erro', 'Não foi possível criar a convocação.');
    }
  }, [loadConvocacoes]);

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

      const { error } = await supabase.from('saques_pix').insert({
        ...saque,
        goleiro_id: user.id,
        status: 'pendente'
      });

      if (error) throw error;
      await loadSaques();
      Alert.alert('Sucesso', 'Saque solicitado com sucesso!');
    } catch (error) {
      console.error("Erro em solicitarSaque:", error);
      Alert.alert('Erro', 'Não foi possível solicitar o saque.');
    }
  }, [user, loadSaques]);

  const criarChamadoSuporte = useCallback(async (chamado: Omit<ChamadoSuporte, 'id' | 'created_at' | 'solicitante'>) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase.from('chamados_suporte').insert({
        ...chamado,
        solicitante_id: user.id, // CORRIGIDO: de 'usuario_id' para 'solicitante_id'
        status: 'pendente'
      });

      if (error) throw error;
      await loadChamadosSuporte();
      Alert.alert('Sucesso', 'Chamado criado com sucesso!');
    } catch (error) {
      console.error("Erro em criarChamadoSuporte:", error);
      Alert.alert('Erro', 'Não foi possível criar o chamado. Verifique o console para mais detalhes.');
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
      await loadMensagensSuporte(); // Recarrega todas as mensagens (incluindo as novas com autor)
    } catch (error) {
      console.error("Erro em enviarMensagemSuporte:", error);
      Alert.alert('Erro', 'Não foi possível enviar a mensagem.');
    }
  }, [user, loadMensagensSuporte]);

  const getChamadosPorUsuario = useCallback((userId: string) => {
    return chamadosSuporte.filter(c => c.solicitante_id === userId);
  }, [chamadosSuporte]);

  const getMensagensPorChamado = useCallback((chamadoId: string) => {
    // Esta função agora recebe mensagens que já têm o autor populado do loadMensagensSuporte
    return mensagensSuporte.filter(m => m.chamado_id === chamadoId);
  }, [mensagensSuporte]);

  // Saldo
  const getSaldo = useCallback((userId: string): Saldo => {
    const foundSaldo = saldos.find(s => s.usuario_id === userId);
    return foundSaldo || { usuario_id: userId, saldo_coins: 0, saldo_retido: 0, updated_at: new Date().toISOString() };
  }, [saldos]);

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
        loadChamadosSuporte, // Exposto
      }}
    >
      {children}
    </AppContext.Provider>
  );
}