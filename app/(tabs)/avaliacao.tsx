// app/(tabs)/avaliacao.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Star, Tag, CircleCheck as CheckCircle, Circle as XCircle, Megaphone, UserCheck, UserX } from 'lucide-react-native';
import RatingModal from '@/components/RatingModal';
import TagSelectionModal from '@/components/TagSelectionModal';
import { useRouter } from 'expo-router';

export default function AvaliacaoPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { convocacoes, aceitarConvocacao, recusarConvocacao, avaliarGoleiro, avaliarOrganizador, categorias, confirmarPresenca } = useApp();
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [currentConvocacaoIdToRate, setCurrentConvocacaoIdToRate] = useState<string | null>(null);
  const [showTagSelectionModal, setShowTagSelectionModal] = useState(false);
  const [currentConvocacaoIdToTag, setCurrentConvocacaoIdToTag] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);

  if (!user) return null;

  const minhasConvocacoes = convocacoes.filter(c =>
    user.tipo_usuario === 'goleiro' ? c.goleiro_id === user.id : c.organizador_id === user.id
  );

  const handleAvaliarGoleiro = (convocacaoId: string) => {
    setCurrentConvocacaoIdToRate(convocacaoId);
    setShowRatingModal(true);
  };

  const onRateGoleiro = async (nota: number) => {
    if (currentConvocacaoIdToRate) {
      setAvaliando(currentConvocacaoIdToRate);
      try {
        await avaliarGoleiro(currentConvocacaoIdToRate, nota);
      } catch (error) {
        console.error('Erro ao avaliar goleiro:', error);
      } finally {
        setAvaliando(null);
        setShowRatingModal(false);
        setCurrentConvocacaoIdToRate(null);
      }
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
    } finally {
      setConfirmando(null);
    }
  };

  const renderConvocacao = (convocacao: any) => {
    const dataInicio = new Date(convocacao.data_hora_inicio);
    const dataFim = new Date(convocacao.data_hora_fim);
    const isPassado = dataFim < new Date();

    const jaAvaliouGoleiro = convocacao.avaliacoes_goleiro && convocacao.avaliacoes_goleiro.length > 0;
    const jaAvaliouOrganizador = convocacao.avaliacoes_organizador && convocacao.avaliacoes_organizador.length > 0;

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pendente': return '#D97706';
        case 'aceito': return '#10B981';
        case 'recusado': return '#EF4444';
        default: return '#6B7280';
      }
    };

    return (
      <View key={convocacao.id} style={styles.convocacaoCard}>
        <View style={styles.convocacaoHeader}>
          <Text style={styles.convocacaoTitle}>
            {user.tipo_usuario === 'goleiro' ? 'Convocação Recebida' : 'Convocação Enviada'}
          </Text>
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
          <View style={styles.infoRow}>
            <Text style={styles.valorText}>💰 {convocacao.valor_retido} coins</Text>
          </View>
        </View>

        {user.tipo_usuario === 'goleiro' && convocacao.status === 'pendente' && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.button, styles.acceptButton]}
              onPress={() => aceitarConvocacao(convocacao.id)}
              activeOpacity={0.8}
            >
              <CheckCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>Aceitar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.rejectButton]}
              onPress={() => recusarConvocacao(convocacao.id)}
              activeOpacity={0.8}
            >
              <XCircle size={16} color="#fff" />
              <Text style={styles.buttonText}>Recusar</Text>
            </TouchableOpacity>
          </View>
        )}

        {isPassado && convocacao.status === 'aceito' && (
          <View style={styles.avaliacaoSection}>
            {/* Botão de confirmar presença para organizador */}
            {user.tipo_usuario === 'organizador' && convocacao.presenca_status == null && (
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.button, styles.acceptButton, confirmando === convocacao.id && styles.buttonDisabled]}
                  onPress={() => handleConfirmarPresenca(convocacao.id, 'compareceu')}
                  disabled={confirmando === convocacao.id}
                  activeOpacity={0.8}
                >
                  <UserCheck size={16} color="#fff" />
                  <Text style={styles.buttonText}>
                    {confirmando === convocacao.id ? 'Confirmando...' : 'Confirmar Presença'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.button, styles.rejectButton, confirmando === convocacao.id && styles.buttonDisabled]}
                  onPress={() => handleConfirmarPresenca(convocacao.id, 'nao_compareceu')}
                  disabled={confirmando === convocacao.id}
                  activeOpacity={0.8}
                >
                  <UserX size={16} color="#fff" />
                  <Text style={styles.buttonText}>
                    {confirmando === convocacao.id ? 'Marcando...' : 'Marcar Ausente'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Avaliação só aparece se o goleiro compareceu */}
            {convocacao.presenca_status === 'compareceu' && (
              <>
                {user.tipo_usuario === 'organizador' && !jaAvaliouGoleiro && (
                  <TouchableOpacity
                    style={[styles.button, styles.avaliarButton, avaliando === convocacao.id && styles.buttonDisabled]}
                    onPress={() => handleAvaliarGoleiro(convocacao.id)}
                    disabled={avaliando === convocacao.id}
                    activeOpacity={0.8}
                  >
                    <Star size={16} color="#fff" />
                    <Text style={styles.buttonText}>
                      {avaliando === convocacao.id ? 'Avaliando...' : 'Avaliar Goleiro'}
                    </Text>
                  </TouchableOpacity>
                )}

                {user.tipo_usuario === 'goleiro' && !jaAvaliouOrganizador && (
                  <TouchableOpacity
                    style={[styles.button, styles.avaliarButton, avaliando === convocacao.id && styles.buttonDisabled]}
                    onPress={() => handleAvaliarOrganizador(convocacao.id)}
                    disabled={avaliando === convocacao.id}
                    activeOpacity={0.8}
                  >
                    <Tag size={16} color="#fff" />
                    <Text style={styles.buttonText}>
                      {avaliando === convocacao.id ? 'Avaliando...' : 'Avaliar Organizador'}
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {jaAvaliouGoleiro && (
              <View style={styles.avaliacaoInfo}>
                <Text style={styles.avaliacaoText}>
                  ⭐ Avaliação: {convocacao.avaliacoes_goleiro[0].nota}/5 - {convocacao.avaliacoes_goleiro[0].coins_calculados} coins
                </Text>
              </View>
            )}

            {jaAvaliouOrganizador && (
              <View style={styles.avaliacaoInfo}>
                <Text style={styles.avaliacaoText}>
                  🏷️ Tag: {convocacao.avaliacoes_organizador[0].categoria_avaliacao}
                </Text>
              </View>
            )}

            {user.tipo_usuario === 'organizador' && !jaAvaliouGoleiro && (
              <Text style={styles.pendingReviewText}>Aguardando avaliação do goleiro.</Text>
            )}
            {user.tipo_usuario === 'goleiro' && !jaAvaliouOrganizador && (
              <Text style={styles.pendingReviewText}>Aguardando avaliação do organizador.</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Megaphone size={24} color={colors.blue500} />
        <View style={{ marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Avaliação de desempenho</Text>
          <Text style={styles.headerSubtitle}>Avalie o goleiro e seu depesenho em seu jogo!</Text>
        </View>
      </View>

      {minhasConvocacoes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma convocação para avaliar.</Text>
        </View>
      ) : (
        minhasConvocacoes.map(renderConvocacao)
      )}

      <RatingModal
        isVisible={showRatingModal}
        onClose={() => {
          setShowRatingModal(false);
          setCurrentConvocacaoIdToRate(null);
        }}
        onRate={onRateGoleiro}
        title="Avaliar Goleiro"
        message="Escolha uma nota:"
        options={[
          { nota: 1, coins: 25 },
          { nota: 2, coins: 30 },
          { nota: 3, coins: 35 },
          { nota: 4, coins: 40 },
          { nota: 5, coins: 45 },
        ]}
      />

      <TagSelectionModal
        isVisible={showTagSelectionModal}
        onClose={() => {
          setShowTagSelectionModal(false);
          setCurrentConvocacaoIdToTag(null);
        }}
        onSelectTag={onSelectOrganizadorTag}
        title="Avaliar Organizador"
        message="Escolha uma tag:"
        options={categorias}
      />
    </ScrollView>
  );
}

const colors = {
  gray50: '#F9FAFB',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  emerald500: '#10B981',
  amber600: '#D97706',
  red500: '#EF4444',
  blue500: '#3B82F6',
  white: '#FFFFFF',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.gray50 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '700', color: colors.gray700 },
  headerSubtitle: { fontSize: 15, fontWeight: '400', color: colors.gray500, marginTop: 2 },
  convocacaoCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  convocacaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  convocacaoTitle: { fontSize: 17, fontWeight: '600', color: colors.gray700 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '600', color: colors.white, textTransform: 'uppercase' },
  convocacaoInfo: { marginBottom: 14, gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, color: colors.gray500 },
  valorText: { fontSize: 15, fontWeight: '600', color: colors.emerald500 },
  actionButtons: { flexDirection: 'row', gap: 14, marginTop: 14 },
  button: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12
  },
  acceptButton: { backgroundColor: colors.emerald500 },
  rejectButton: { backgroundColor: colors.red500 },
  avaliarButton: { backgroundColor: colors.blue500 },
  buttonDisabled: { opacity: 0.6, backgroundColor: colors.gray400 },
  buttonText: { color: colors.white, fontSize: 15, fontWeight: '700' },
  avaliacaoSection: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.gray200 },
  avaliacaoInfo: { backgroundColor: colors.gray50, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, marginTop: 6 },
  avaliacaoText: { fontSize: 13, color: colors.gray500 },
  pendingReviewText: { fontSize: 13, color: colors.gray500, marginTop: 6, fontStyle: 'italic' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 20 },
  emptyText: { fontSize: 16, color: colors.gray500, fontStyle: 'italic' },
});
