import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Keyboard } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { supabase } from '@/lib/supabase';
import { Shield, Plus, MessageCircle, Clock, CheckCircle, XCircle, Send, User } from 'lucide-react-native';
import { ChamadoSuporte, MensagemSuporte } from '@/types'; // Importe os tipos

// Hook para mensagens realtime do chamado selecionado
function useMensagensRealtime(chamadoId: string | null) {
  const [mensagens, setMensagens] = useState<MensagemSuporte[]>([]);

  useEffect(() => {
    if (!chamadoId) {
      setMensagens([]); // Limpa mensagens ao deselecionar chamado
      return;
    }

    // Buscar mensagens iniciais
    const fetchMensagens = async () => {
      const { data, error } = await supabase
        .from('mensagens_suporte') // Removido <MensagemSuporte> para compatibilidade geral
        .select(`
          *,
          autor:usuarios!autor_id(id, nome, tipo_usuario)
        `)
        .eq('chamado_id', chamadoId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return;
      }
      setMensagens(data || []);
    };

    fetchMensagens();

    // Subscrição realtime para inserts
    const subscription = supabase
      .channel(`mensagens_chamado_${chamadoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_suporte', filter: `chamado_id=eq.${chamadoId}` },
        (payload: any) => {
          // Recarrega as mensagens para garantir que os dados do autor venham corretamente
          fetchMensagens();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chamadoId]);

  return mensagens;
}

export default function SuporteTab() {
  const { user } = useAuth();
  const {
    chamadosSuporte,
    criarChamadoSuporte,
    aprovarChamadoSuporte,
    recusarChamadoSuporte,
    resolverChamadoSuporte,
    enviarMensagemSuporte,
    getChamadosPorUsuario,
    loadChamadosSuporte
  } = useApp();

  const [showNovoChamado, setShowNovoChamado] = useState(false);
  const [mensagemInicial, setMensagemInicial] = useState('');
  const [chamadoSelecionado, setChamadoSelecionado] = useState<string | null>(null);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const mensagens = useMensagensRealtime(chamadoSelecionado);

  useEffect(() => {
    const subscription = supabase
      .channel('public:chamados_suporte')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chamados_suporte' },
        (payload: any) => {
          loadChamadosSuporte();
          if (
            chamadoSelecionado &&
            payload.new &&
            payload.new.id === chamadoSelecionado &&
            payload.new.status === 'resolvido'
          ) {
            Alert.alert('Chamado Resolvido', 'Este chamado foi marcado como resolvido pelo administrador.');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [chamadoSelecionado, loadChamadosSuporte]);

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  useEffect(() => {
    if (chamadoSelecionado) {
      scrollToBottom();
    }
  }, [mensagens]);

  const handleCriarChamado = async () => {
    if (!mensagemInicial.trim()) {
      Alert.alert('Erro', 'Digite sua mensagem');
      return;
    }

    setIsLoading(true);
    try {
      await criarChamadoSuporte({
        // ==================================================================
        // <-- CORREÇÃO PRINCIPAL APLICADA AQUI
        // O nome da coluna no banco de dados é 'solicitante_id', e não 'usuario_id'.
        solicitante_id: user?.id || '',
        // ==================================================================
        mensagem_inicial: mensagemInicial,
      });
      Alert.alert('Sucesso', 'Chamado criado! Aguarde aprovação do administrador.');
      setShowNovoChamado(false);
      setMensagemInicial('');
    } catch (error) {
      console.error("Erro ao criar chamado:", error);
      Alert.alert('Erro', 'Não foi possível criar o chamado. Verifique o console para mais detalhes.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnviarMensagem = async () => {
    if (!novaMensagem.trim() || !chamadoSelecionado) return;

    Keyboard.dismiss();
    const mensagemTemp = novaMensagem;
    setNovaMensagem('');

    try {
      await enviarMensagemSuporte({
        chamado_id: chamadoSelecionado,
        autor_id: user?.id || '', // Esta parte já estava correta, usando 'autor_id'
        mensagem: mensagemTemp
      });
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem');
      setNovaMensagem(mensagemTemp);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#f59e0b';
      case 'aprovado': return '#10b981';
      case 'em_andamento': return '#3b82f6';
      case 'resolvido': return '#6b7280';
      case 'recusado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': return <Clock size={16} color="#f59e0b" />;
      case 'aprovado': return <MessageCircle size={16} color="#10b981" />;
      case 'em_andamento': return <MessageCircle size={16} color="#3b82f6" />;
      case 'resolvido': return <CheckCircle size={16} color="#6b7280" />;
      case 'recusado': return <XCircle size={16} color="#ef4444" />;
      default: return <Clock size={16} color="#6b7280" />;
    }
  };

  if (!user) return null;

  const isAdmin = user.tipo_usuario === 'admin';
  const meusChamados = isAdmin ? chamadosSuporte : getChamadosPorUsuario(user.id);
  const chamadosPendentes = chamadosSuporte.filter(c => c.status === 'pendente');

  if (chamadoSelecionado) {
    const chamado = meusChamados.find(c => c.id === chamadoSelecionado);

    return (
      <View style={styles.container}>
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => setChamadoSelecionado(null)}
          >
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.chatTitle}>Chamado #{chamado?.id.slice(0, 8)}</Text>
          {isAdmin && (chamado?.status === 'aprovado' || chamado?.status === 'em_andamento') && (
            <TouchableOpacity
              style={styles.resolverButton}
              onPress={() => resolverChamadoSuporte(chamadoSelecionado)}
            >
              <Text style={styles.resolverButtonText}>Resolver</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.chatMessages}
          contentContainerStyle={styles.chatMessagesContent}
        >
          <View style={styles.mensagemInicial}>
            <Text style={styles.mensagemInicialLabel}>Mensagem inicial:</Text>
            <Text style={styles.mensagemInicialTexto}>{chamado?.mensagem_inicial}</Text>
          </View>

          {mensagens.map((mensagem) => (
            <View
              key={mensagem.id}
              style={[
                styles.mensagem,
                mensagem.autor_id === user.id ? styles.mensagemPropria : styles.mensagemOutro
              ]}
            >
              <View style={styles.mensagemHeader}>
                <User size={14} color={mensagem.autor_id === user.id ? "#fff" : "#64748b"} />
                <Text style={[
                  styles.mensagemAutor,
                  mensagem.autor_id === user.id ? styles.mensagemAutorPropria : styles.mensagemAutorOutro
                ]}>
                  {mensagem.autor_id === user.id ? 'Você' : (mensagem.autor?.tipo_usuario === 'admin' ? 'Admin' : mensagem.autor?.nome || 'Usuário')}
                </Text>
              </View>
              <Text style={mensagem.autor_id === user.id ? styles.mensagemTextoPropria : styles.mensagemTextoOutro}>
                {mensagem.mensagem}
              </Text>
              <Text style={mensagem.autor_id === user.id ? styles.mensagemHoraPropria : styles.mensagemHoraOutro}>
                {new Date(mensagem.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          ))}
        </ScrollView>

        {(chamado?.status === 'aprovado' || chamado?.status === 'em_andamento') && (
          <View style={styles.chatInput}>
            <TextInput
              style={styles.inputMensagem}
              placeholder="Digite sua mensagem..."
              value={novaMensagem}
              onChangeText={setNovaMensagem}
              multiline
              onSubmitEditing={handleEnviarMensagem}
            />
            <TouchableOpacity
              style={[styles.enviarButton, !novaMensagem.trim() && styles.enviarButtonDisabled]}
              onPress={handleEnviarMensagem}
              disabled={!novaMensagem.trim()}
            >
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Shield size={28} color="#3b82f6" />
            <View>
              <Text style={styles.title}>
                {isAdmin ? 'Suporte Admin' : 'Suporte'}
              </Text>
              <Text style={styles.subtitle}>
                {isAdmin ? 'Gerencie chamados de suporte' : 'Precisa de ajuda? Fale conosco'}
              </Text>
            </View>
          </View>

          {isAdmin && (
            <View style={styles.statsContainer}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{chamadosPendentes.length}</Text>
                <Text style={styles.statLabel}>Pendentes</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {!isAdmin && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.novoChamadoButton}
            onPress={() => setShowNovoChamado(true)}
            disabled={isLoading}
          >
            <Plus size={20} color="#fff" />
            <Text style={styles.novoChamadoButtonText}>
              {isLoading ? 'Carregando...' : 'Novo Chamado'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {showNovoChamado && (
        <View style={styles.novoChamadoForm}>
          <Text style={styles.formTitle}>Novo Chamado de Suporte</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Descreva seu problema ou dúvida..."
            value={mensagemInicial}
            onChangeText={setMensagemInicial}
            multiline
            numberOfLines={4}
            editable={!isLoading}
          />
          <View style={styles.formActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowNovoChamado(false)}
              disabled={isLoading}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.enviarChamadoButton, isLoading && styles.enviarChamadoButtonDisabled]}
              onPress={handleCriarChamado}
              disabled={isLoading || !mensagemInicial.trim()}
            >
              <Text style={styles.enviarChamadoButtonText}>
                {isLoading ? 'Enviando...' : 'Enviar'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView style={styles.chamadosList}>
        {meusChamados.length === 0 ? (
          <View style={styles.emptyState}>
            <Shield size={64} color="#030303ff" />
            <Text style={styles.emptyTitle}>
              {isAdmin ? 'Nenhum chamado ainda' : 'Nenhum chamado criado'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {isAdmin
                ? 'Quando usuários criarem chamados, aparecerão aqui'
                : 'Crie um chamado se precisar de ajuda'
              }
            </Text>
          </View>
        ) : (
          meusChamados.map((chamado) => (
            <View key={chamado.id} style={styles.chamadoCard}>
              <View style={styles.chamadoHeader}>
                <View style={styles.chamadoInfo}>
                  <Text style={styles.chamadoId}>#{chamado.id.slice(0, 8)}</Text>
                  {isAdmin && (
                    <Text style={styles.solicitante}>
                      Por: {chamado.solicitante?.nome || 'Usuário'}
                    </Text>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(chamado.status) + '20' }]}>
                  {getStatusIcon(chamado.status)}
                  <Text style={[styles.statusText, { color: getStatusColor(chamado.status) }]}>
                    {chamado.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.mensagemPreview} numberOfLines={2}>
                {chamado.mensagem_inicial}
              </Text>

              <View style={styles.chamadoFooter}>
                <Text style={styles.dataText}>
                  {new Date(chamado.created_at).toLocaleDateString()}
                </Text>

                <View style={styles.chamadoActions}>
                  {isAdmin && chamado.status === 'pendente' && (
                    <>
                      <TouchableOpacity
                        style={styles.recusarButton}
                        onPress={() => recusarChamadoSuporte(chamado.id)}
                      >
                        <XCircle size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Recusar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.aprovarButton}
                        onPress={() => aprovarChamadoSuporte(chamado.id)}
                      >
                        <CheckCircle size={16} color="#fff" />
                        <Text style={styles.actionButtonText}>Aprovar</Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {(chamado.status === 'aprovado' || chamado.status === 'em_andamento' || (!isAdmin && chamado.status !== 'recusado')) && (
                    <TouchableOpacity
                      style={styles.abrirChatButton}
                      onPress={() => setChamadoSelecionado(chamado.id)}
                    >
                      <MessageCircle size={16} color="#fff" />
                      <Text style={styles.actionButtonText}>Abrir Chat</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

// Seus estilos permanecem os mesmos
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffffff',
    },
    header: {
        backgroundColor: '#ffffff',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 1,
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        color: '#3b82f6',
    },
    subtitle: {
        fontSize: 13,
        color: '#64748b',
    },
    statsContainer: {
        flexDirection: 'row',
        gap: 8,
    },
    statBadge: {
        backgroundColor: '#000000ff',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        alignItems: 'center',
        minWidth: 48,
    },
    statNumber: {
        fontWeight: '700',
        fontSize: 16,
        color: '#fcfcfcff',
    },
    statLabel: {
        fontSize: 12,
        color: '#ffffffff',
    },
    actionContainer: {
        paddingHorizontal: 20,
        marginVertical: 10,
    },
    novoChamadoButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 6,
        alignItems: 'center',
    },
    novoChamadoButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },
    novoChamadoForm: {
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    textArea: {
        minHeight: 80,
        backgroundColor: '#fff',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        borderWidth: 1,
        borderColor: '#585b5fe8',
        textAlignVertical: 'top',
    },
    formActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
        gap: 10,
    },
    cancelButton: {
        backgroundColor: '#f87171',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    cancelButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    enviarChamadoButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 8,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    enviarChamadoButtonDisabled: {
        opacity: 0.5,
    },
    enviarChamadoButtonText: {
        color: '#fff',
        fontWeight: '700',
    },
    chamadosList: {
        paddingHorizontal: 20,
    },
    chamadoCard: {
        backgroundColor: '#fff',
        borderRadius: 10,
        padding: 14,
        marginVertical: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    chamadoHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    chamadoInfo: {
        gap: 2,
    },
    chamadoId: {
        fontWeight: '700',
        fontSize: 14,
        color: '#1e293b',
    },
    solicitante: {
        fontSize: 12,
        color: '#64748b',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontWeight: '600',
        fontSize: 12,
        textTransform: 'capitalize',
    },
    mensagemPreview: {
        marginTop: 6,
        color: '#475569',
        fontSize: 14,
    },
    chamadoFooter: {
        marginTop: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dataText: {
        fontSize: 11,
        color: '#64748b',
    },
    chamadoActions: {
        flexDirection: 'row',
        gap: 6,
    },
    recusarButton: {
        backgroundColor: '#ef4444',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    aprovarButton: {
        backgroundColor: '#10b981',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    abrirChatButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    actionButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e0e7ff',
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    backButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    backButtonText: {
        color: '#3b82f6',
        fontWeight: '600',
    },
    chatTitle: {
        flex: 1,
        fontWeight: '700',
        fontSize: 18,
        color: '#1e293b',
        textAlign: 'center',
    },
    resolverButton: {
        backgroundColor: '#10b981',
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    resolverButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    chatMessages: {
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: '#f1f5f9',
    },
    chatMessagesContent: {
        paddingBottom: 20,
    },
    mensagemInicial: {
        marginBottom: 12,
        backgroundColor: '#ffffffff', // Um pouco diferente para destacar
        padding: 10,
        borderRadius: 8,
    },
    mensagemInicialLabel: {
        fontWeight: '600',
        fontSize: 14,
        marginBottom: 4,
        color: '#000000ff',
    },
    mensagemInicialTexto: {
        fontSize: 14,
        color: '#475569',
    },
    mensagem: {
        marginBottom: 12,
        padding: 8,
        borderRadius: 10,
        maxWidth: '80%',
    },
    mensagemPropria: {
        backgroundColor: '#3b82f6',
        alignSelf: 'flex-end',
    },
    mensagemOutro: {
        backgroundColor: '#fff',
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderColor: '#e2e8f0', // Borda para mensagens de outros
    },
    mensagemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    mensagemAutor: {
        fontSize: 12,
    },
    mensagemAutorPropria: {
        color: '#dbeafe',
    },
    mensagemAutorOutro: {
        color: '#64748b',
    },
    mensagemTextoPropria: {
        fontSize: 14,
        color: '#fff',
    },
    mensagemTextoOutro: {
        fontSize: 14,
        color: '#334155', // Cor para mensagens de outros
    },
    mensagemHoraPropria: {
        fontSize: 10,
        color: '#bfdbfe',
        marginTop: 4,
        textAlign: 'right',
    },
    mensagemHoraOutro: {
        fontSize: 10,
        color: '#000000ff',
        marginTop: 4,
        textAlign: 'right',
    },
    chatInput: {
        flexDirection: 'row',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderColor: '#000000ff',
        backgroundColor: '#fff',
        alignItems: 'center',
    },
    inputMensagem: {
        flex: 1,
        backgroundColor: '#ffffffff',
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        fontSize: 14,
        marginRight: 8,
        maxHeight: 100,
    },
    enviarButton: {
        backgroundColor: '#3b82f6',
        borderRadius: 24,
        padding: 12,
    },
    enviarButtonDisabled: {
        opacity: 0.5,
    },
    emptyState: {
        marginTop: 40,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#000000ff',
    },
    emptySubtitle: {
        fontSize: 14,
        color: '#000000ff',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
});