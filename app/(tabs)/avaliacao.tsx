import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Star, Tag, CircleCheck as CheckCircle, Circle as XCircle, Megaphone, UserCheck, UserX, Info } from 'lucide-react-native';
import RatingModal from '@/components/RatingModal';
import TagSelectionModal from '@/components/TagSelectionModal';
import { useRouter } from 'expo-router';

export default function AvaliacaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { 
    convocacoes, 
    aceitarConvocacao, 
    recusarConvocacao, 
    avaliarGoleiro, 
    avaliarOrganizador, 
    categorias, 
    confirmarPresenca,
    isGoleiroAvaliado,
    isOrganizadorAvaliado,
    fetchConvocacoes,
    calcularTaxaApp
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
    try {
      await fetchConvocacoes();
    } catch (error) {
      console.error('Erro ao atualizar convocações:', error);
      Alert.alert('Erro', 'Não foi possível atualizar as convocações.');
    } finally {
      setRefreshing(false);
    }
  }, [fetchConvocacoes]);

  const minhasConvocacoes = convocacoes.filter(c =>
    user.tipo_usuario === 'goleiro' ? c.goleiro_id === user.id : c.organizador_id === user.id
  );

  const now = new Date();

  const convocacoesAtuais = minhasConvocacoes
    .filter(c => 
      (c.status === 'pendente' || c.status === 'aceito') &&
      !(new Date(c.data_hora_fim) < now && (isGoleiroAvaliado(c.id) || isOrganizadorAvaliado(c.id)))
    )
    .sort((a, b) => new Date(a.data_hora_inicio).getTime() - new Date(b.data_hora_inicio).getTime());

  const convocacoesHistorico = minhasConvocacoes
    .filter(c => 
      c.status === 'recusado' || c.status === 'cancelado' || c.presenca_status === 'nao_compareceu'
    )
    .sort((a, b) => new Date(b.data_hora_inicio).getTime() - new Date(a.data_hora_inicio).getTime());

  const getTituloConvocacao = (convocacao: any) => {
    switch (convocacao.status) {
      case 'pendente': return user.tipo_usuario === 'goleiro' ? 'Convocação Recebida' : 'Convocação Enviada';
      case 'aceito': return 'Convocação Aceita';
      case 'recusado': return 'Convocação Recusada';
      case 'cancelado': return 'Convocação Cancelada';
      default: return 'Convocação';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#D97706';
      case 'aceito': return '#10B981';
      case 'recusado': return '#EF4444';
      case 'cancelado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const handleAvaliarGoleiro = (convocacaoId: string) => {
    setCurrentConvocacaoIdToRate(convocacaoId);
    setShowRatingModal(true);
  };

  const onRateGoleiro = async (nota: number) => {
    if (!currentConvocacaoIdToRate) return;
    setAvaliando(currentConvocacaoIdToRate);

    const label = LABELS[nota - 1] ?? `${nota} estrelas`;

    try {
      await avaliarGoleiro(currentConvocacaoIdToRate, nota);
      Alert.alert('Sucesso', `Avaliação do goleiro enviada: ${label}`);
    } catch (error: any) {
      console.error('Erro ao avaliar goleiro:', error);
      Alert.alert('Erro', 'Não foi possível registrar a avaliação. Tente novamente mais tarde.');
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
    if (currentConvocacaoIdToTag) {
      setAvaliando(currentConvocacaoIdToTag);
      try {
        await avaliarOrganizador(currentConvocacaoIdToTag, tagName);
      } catch (error) {
        console.error('Erro ao avaliar organizador:', error);
        Alert.alert('Erro', 'Não foi possível registrar a avaliação do organizador.');
      } finally {
        setAvaliando(null);
        setShowTagSelectionModal(false);
        setCurrentConvocacaoIdToTag(null);
      }
    }
  };

  const handleConfirmarPresenca = async (convocacaoId: string, status: 'compareceu' | 'nao_compareceu') => {
    setConfirmando(convocacaoId);
    try {
      await confirmarPresenca(convocacaoId, status);
    } catch (error) {
      console.error('Erro ao confirmar presença:', error);
      Alert.alert('Erro', 'Não foi possível atualizar presença.');
    } finally {
      setConfirmando(null);
    }
  };

  const renderConvocacao = (convocacao: any) => {
    const dataInicio = new Date(convocacao.data_hora_inicio);
    const dataFim = new Date(convocacao.data_hora_fim);
    const isPassado = dataFim < now;

    const jaAvaliouGoleiro = isGoleiroAvaliado(convocacao.id);
    const jaAvaliouOrganizador = isOrganizadorAvaliado(convocacao.id);

    // Calcular taxa e valor líquido (apenas para goleiros)
    const taxaApp = calcularTaxaApp(convocacao.valor_retido);
    const valorLiquido = convocacao.valor_retido - taxaApp;

    return (
      <View key={convocacao.id} style={styles.convocacaoCard}>
        <View style={styles.convocacaoHeader}>
          <Text style={styles.convocacaoTitle}>{getTituloConvocacao(convocacao)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(convocacao.status) }]}>
            <Text style={styles.statusText}>{convocacao.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.convocacaoInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              📅 {dataInicio.toLocaleDateString()} - {dataInicio.toLocaleTimeString()} às {dataFim.toLocaleTimeString()}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>📍 {convocacao.local}</Text>
          </View>
          
          {/* Exibir valor diretamente no card */}
          {user.tipo_usuario === 'goleiro' ? (
            <View style={styles.valorSection}>
              <Text style={styles.valorText}>💰 Valor Bruto: {convocacao.valor_retido} coins</Text>
              <Text style={styles.taxaText}>🔴 Taxa do App: {taxaApp} coins</Text>
              <Text style={styles.taxaText}>🟢 Valor Líquido: {valorLiquido} coins</Text>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.valorText}>💰 {convocacao.valor_retido} coins</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Text style={styles.infoText}>
              {user.tipo_usuario === 'organizador' ? 
                `Goleiro: ${convocacao.goleiro_nome || 'Não atribuído'}` : 
                `Organizador: ${convocacao.organizador_nome}`
              }
            </Text>
          </View>
        </View>

        {user.tipo_usuario === 'goleiro' && convocacao.status === 'pendente' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={() => aceitarConvocacao(convocacao.id)} activeOpacity={0.8}>
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>Aceitar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={() => recusarConvocacao(convocacao.id)} activeOpacity={0.8}>
              <XCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>Recusar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPassado && convocacao.status === 'aceito' && (
          <View style={styles.avaliacaoSection}>
            {user.tipo_usuario === 'organizador' && convocacao.presenca_status == null && (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={[styles.button, styles.acceptButton, confirmando === convocacao.id && styles.buttonDisabled]}
                  onPress={() => handleConfirmarPresenca(convocacao.id, 'compareceu')} disabled={confirmando === convocacao.id} activeOpacity={0.8}>
                  <UserCheck size={16} color="#fff" />
                  <Text style={styles.buttonText}>{confirmando === convocacao.id ? 'Confirmando...' : 'Confirmar Presença'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.rejectButton, confirmando === convocacao.id && styles.buttonDisabled]}
                  onPress={() => handleConfirmarPresenca(convocacao.id, 'nao_compareceu')} disabled={confirmando === convocacao.id} activeOpacity={0.8}>
                  <UserX size={16} color="#fff" />
                  <Text style={styles.buttonText}>{confirmando === convocacao.id ? 'Marcando...' : 'Marcar Ausente'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {convocacao.presenca_status === 'compareceu' && (
              <>
                {user.tipo_usuario === 'organizador' && !jaAvaliouGoleiro && (
                  <TouchableOpacity style={[styles.button, styles.avaliarButton, avaliando === convocacao.id && styles.buttonDisabled]}
                    onPress={() => handleAvaliarGoleiro(convocacao.id)} disabled={avaliando === convocacao.id} activeOpacity={0.8}>
                    <Star size={16} color="#fff" />
                    <Text style={styles.buttonText}>{avaliando === convocacao.id ? 'Avaliando...' : 'Avaliar Goleiro'}</Text>
                  </TouchableOpacity>
                )}

                {user.tipo_usuario === 'goleiro' && !jaAvaliouOrganizador && (
                  <TouchableOpacity style={[styles.button, styles.avaliarButton, avaliando === convocacao.id && styles.buttonDisabled]}
                    onPress={() => handleAvaliarOrganizador(convocacao.id)} disabled={avaliando === convocacao.id} activeOpacity={0.8}>
                    <Tag size={16} color="#fff" />
                    <Text style={styles.buttonText}>{avaliando === convocacao.id ? 'Avaliando...' : 'Avaliar Organizador'}</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {jaAvaliouGoleiro && (
              <View style={styles.avaliacaoInfo}>
                <Text style={styles.avaliacaoText}>⭐ Você já avaliou este goleiro</Text>
              </View>
            )}

            {jaAvaliouOrganizador && (
              <View style={styles.avaliacaoInfo}>
                <Text style={styles.avaliacaoText}>🏷️ Você já avaliou este organizador</Text>
              </View>
            )}

            {user.tipo_usuario === 'organizador' && !jaAvaliouGoleiro && convocacao.presenca_status === 'compareceu' && (
              <Text style={styles.pendingReviewText}>Aguardando sua avaliação do goleiro</Text>
            )}
            {user.tipo_usuario === 'goleiro' && !jaAvaliouOrganizador && convocacao.presenca_status === 'compareceu' && (
              <Text style={styles.pendingReviewText}>Aguardando sua avaliação do organizador</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 24 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Megaphone size={24} color="#3B82F6" />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Avaliação de desempenho</Text>
          <Text style={styles.headerSubtitle}>Avalie o goleiro e seu desempenho em seu jogo!</Text>
        </View>
      </View>

      {minhasConvocacoes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma convocação para avaliar.</Text>
        </View>
      ) : (
        <>
          {convocacoesAtuais.map(renderConvocacao)}

          {convocacoesHistorico.length > 0 && (
            <TouchableOpacity style={styles.historicoToggle} onPress={() => setShowHistorico(!showHistorico)}>
              <Text style={styles.historicoToggleText}>
                {showHistorico ? 'Ocultar Histórico de Convocações' : 'Mostrar Histórico de Convocações'}
              </Text>
            </TouchableOpacity>
          )}

          {showHistorico && (
            <View style={{ marginTop: 20 }}>
              {convocacoesHistorico.map(renderConvocacao)}
            </View>
          )}
        </>
      )}

      <RatingModal
        isVisible={showRatingModal}
        onClose={() => { setShowRatingModal(false); setCurrentConvocacaoIdToRate(null); }}
        onRate={onRateGoleiro}
        title="Avaliar Goleiro"
        message="Escolha uma nota:"
        options={[{ nota: 1 }, { nota: 2 }, { nota: 3 }, { nota: 4 }, { nota: 5 }]}
      />

      <TagSelectionModal
        isVisible={showTagSelectionModal}
        onClose={() => { setShowTagSelectionModal(false); setCurrentConvocacaoIdToTag(null); }}
        onSelectTag={onSelectOrganizadorTag}
        title="Avaliar Organizador"
        message="Escolha uma tag:"
        options={categorias}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle: { fontSize: 26, fontWeight: '700', color: '#374151' },
  headerSubtitle: { fontSize: 15, fontWeight: '400', color: '#6B7280', marginTop: 2 },
  convocacaoCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  convocacaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  convocacaoTitle: { fontSize: 17, fontWeight: '600', color: '#374151' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase' },
  convocacaoInfo: { marginBottom: 14, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, color: '#6B7280' },
  valorText: { fontSize: 15, fontWeight: '600', color: '#10B981' },
  valorSection: { marginTop: 8 },
  taxaText: { fontSize: 13, color: '#6B7280' },
  actionButtons: { flexDirection: 'row', gap: 14, marginTop: 14 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  acceptButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  avaliarButton: { backgroundColor: '#3B82F6' },
  buttonDisabled: { opacity: 0.6, backgroundColor: '#9CA3AF' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  avaliacaoSection: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB', gap: 10 },
  avaliacaoInfo: { marginTop: 6 },
  avaliacaoText: { fontSize: 14, fontWeight: '500', color: '#6B7280' },
  pendingReviewText: { fontSize: 13, color: '#F59E0B', marginTop: 4 },
  historicoToggle: { paddingHorizontal: 20, paddingVertical: 12 },
  historicoToggleText: { color: '#3B82F6', fontSize: 15, fontWeight: '600' },
  emptyState: { padding: 20, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#6B7280' }
});
