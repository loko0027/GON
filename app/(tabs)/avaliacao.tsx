import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Star, Tag, UserCheck, UserX, Megaphone } from 'lucide-react-native';
import RatingModal from '@/components/RatingModal';
import TagSelectionModal from '@/components/TagSelectionModal';
import ConvocacaoCard from '@/components/ConvocacaoCard'; // 1. Importamos o novo componente

export default function AvaliacaoPage() {
  const { user } = useAuth();
  const { 
    convocacoes, 
    avaliarGoleiro, 
    avaliarOrganizador, 
    categorias, 
    confirmarPresenca,
    isGoleiroAvaliado,
    isOrganizadorAvaliado,
    fetchConvocacoes,
  } = useApp();

  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentConvocacaoIdToRate, setCurrentConvocacaoIdToRate] = useState<string | null>(null);
  const [showTagSelectionModal, setShowTagSelectionModal] = useState(false);
  const [currentConvocacaoIdToTag, setCurrentConvocacaoIdToTag] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [showHistorico, setShowHistorico] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const LABELS = ["Ruim", "Mais ou menos", "Bom", "Ótimo", "Paredão"];

  if (!user) return null;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConvocacoes();
    setRefreshing(false);
  }, [fetchConvocacoes]);

  const minhasConvocacoes = convocacoes.filter(c =>
    user.tipo_usuario === 'goleiro' ? c.goleiro_id === user.id : c.organizador_id === user.id
  );

  const now = new Date();

  const convocacoesAtuais = minhasConvocacoes
    .filter(c => (c.status === 'pendente' || c.status === 'aceito'))
    .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());

  const convocacoesHistorico = minhasConvocacoes
    .filter(c => (c.status !== 'pendente' && c.status !== 'aceito'))
    .sort((a, b) => new Date(b.data_hora_inicio).getTime() - new Date(a.data_hora_inicio).getTime());

  // As funções de ação (handlers) continuam aqui pois são específicas desta tela
  const handleAvaliarGoleiro = (convocacaoId: string) => {
    setCurrentConvocacaoIdToRate(convocacaoId);
    setShowRatingModal(true);
  };

  const onRateGoleiro = async (nota: number) => {
    if (!currentConvocacaoIdToRate) return;
    setAvaliando(currentConvocacaoIdToRate);
    try {
      await avaliarGoleiro(currentConvocacaoIdToRate, nota);
      Alert.alert('Sucesso', `Avaliação enviada: ${LABELS[nota - 1]}`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível registrar a avaliação.');
    } finally {
      setAvaliando(null);
      setShowRatingModal(false);
      setCurrentConvocacaoIdToRate(null);
    }
  };

  const handleAvaliarOrganizador = (convocacaoId: string) => {
    setCurrentConvocacaoIdToTag(convocacaoId);
    setShowTagSelectionModal(true);
  };

  const onSelectOrganizadorTag = async (tagName: string) => {
    if (!currentConvocacaoIdToTag) return;
    setAvaliando(currentConvocacaoIdToTag);
    try {
      await avaliarOrganizador(currentConvocacaoIdToTag, tagName);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível avaliar o organizador.');
    } finally {
      setAvaliando(null);
      setShowTagSelectionModal(false);
      setCurrentConvocacaoIdToTag(null);
    }
  };

  const handleConfirmarPresenca = async (convocacaoId: string, status: 'compareceu' | 'nao_compareceu') => {
    setConfirmando(convocacaoId);
    try {
      await confirmarPresenca(convocacaoId, status);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar presença.');
    } finally {
      setConfirmando(null);
    }
  };

  // 2. A função de renderizar foi removida. Agora usamos o componente diretamente no JSX.

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Megaphone size={24} color="#3B82F6" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Minhas Convocações</Text>
          <Text style={styles.headerSubtitle}>Gerencie seus jogos e avaliações</Text>
        </View>
      </View>

      {minhasConvocacoes.length === 0 ? (
        <View style={styles.emptyState}><Text style={styles.emptyText}>Nenhuma convocação encontrada.</Text></View>
      ) : (
        <>
          {convocacoesAtuais.map(convocacao => {
            const isPassado = new Date(convocacao.data_hora_fim) < now;
            return (
              <View key={convocacao.id}>
                <ConvocacaoCard convocacao={convocacao} />
                
                {/* BOTÕES DE AÇÃO ESPECÍFICOS DESTA TELA */}
                {isPassado && convocacao.status === 'aceito' && (
                  <View style={styles.actionSection}>
                    {user.tipo_usuario === 'organizador' && convocacao.presenca_status == null && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={() => handleConfirmarPresenca(convocacao.id, 'compareceu')}><UserCheck size={16} color="#fff" /><Text style={styles.buttonText}>Confirmar Presença</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => handleConfirmarPresenca(convocacao.id, 'nao_compareceu')}><UserX size={16} color="#fff" /><Text style={styles.buttonText}>Marcar Ausente</Text></TouchableOpacity>
                      </View>
                    )}
                    {convocacao.presenca_status === 'compareceu' && (
                      <>
                        {user.tipo_usuario === 'organizador' && !isGoleiroAvaliado(convocacao.id) && (
                          <TouchableOpacity style={[styles.button, styles.avaliarButton]} onPress={() => handleAvaliarGoleiro(convocacao.id)}><Star size={16} color="#fff" /><Text style={styles.buttonText}>Avaliar Goleiro</Text></TouchableOpacity>
                        )}
                        {user.tipo_usuario === 'goleiro' && !isOrganizadorAvaliado(convocacao.id) && (
                          <TouchableOpacity style={[styles.button, styles.avaliarButton]} onPress={() => handleAvaliarOrganizador(convocacao.id)}><Tag size={16} color="#fff" /><Text style={styles.buttonText}>Avaliar Organizador</Text></TouchableOpacity>
                        )}
                      </>
                    )}
                    {isGoleiroAvaliado(convocacao.id) && <View style={styles.avaliacaoInfo}><Text style={styles.avaliacaoText}>⭐ Você já avaliou este goleiro</Text></View>}
                    {isOrganizadorAvaliado(convocacao.id) && <View style={styles.avaliacaoInfo}><Text style={styles.avaliacaoText}>🏷️ Você já avaliou este organizador</Text></View>}
                  </View>
                )}
              </View>
            )
          })}
          
          {convocacoesHistorico.length > 0 && (
            <TouchableOpacity style={styles.historicoToggle} onPress={() => setShowHistorico(!showHistorico)}>
              <Text style={styles.historicoToggleText}>{showHistorico ? 'Ocultar Histórico' : 'Mostrar Histórico'}</Text>
            </TouchableOpacity>
          )}
          {showHistorico && convocacoesHistorico.map(convocacao => <ConvocacaoCard key={convocacao.id} convocacao={convocacao} />)}
        </>
      )}

      <RatingModal isVisible={showRatingModal} onClose={() => setShowRatingModal(false)} onRate={onRateGoleiro} title="Avaliar Goleiro" message="Escolha uma nota:" options={LABELS.map((_, i) => ({ nota: i + 1 }))}/>
      <TagSelectionModal isVisible={showTagSelectionModal} onClose={() => setShowTagSelectionModal(false)} onSelectTag={onSelectOrganizadorTag} title="Avaliar Organizador" message="Escolha uma tag:" options={categorias}/>
    </ScrollView>
  );
}

// Os estilos que sobraram, específicos da página
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffffff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#040405ff' },
  headerSubtitle: { fontSize: 15, fontWeight: '400', color: '#000000ff', marginTop: 2 },
  actionSection: { marginTop: -10, marginBottom: 18, paddingHorizontal: 20 },
  avaliacaoSection: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 10 },
  actionButtons: { flexDirection: 'row', gap: 14 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  acceptButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  avaliarButton: { backgroundColor: '#3B82F6' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  avaliacaoInfo: { marginTop: 6 },
  avaliacaoText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  historicoToggle: { paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center' },
  historicoToggleText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { fontSize: 15, color: '#6B7280' }
});