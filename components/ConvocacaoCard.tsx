import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import useCountdown from '@/hooks/useCountdown'; // Certifique-se que o caminho está correto
import { Clock, Calendar, CheckCircle, XCircle } from 'lucide-react-native';

// Função auxiliar para calcular o tempo inicial do cronômetro
const getRemainingMinutes = (createdAt: string) => {
  const thirtyMinutesInMs = 30 * 60 * 1000;
  const startTime = new Date(createdAt).getTime();
  const expirationTime = startTime + thirtyMinutesInMs;
  const now = new Date().getTime();
  const remainingMs = expirationTime - now;
  // Retorna o tempo restante em minutos, ou 0 se já expirou
  return remainingMs > 0 ? remainingMs / (1000 * 60) : 0;
};

export default function ConvocacaoCard({ convocacao }: { convocacao: any }) {
  const { user } = useAuth();
  const { aceitarConvocacao, recusarConvocacao, calcularTaxaApp } = useApp();

  // Lógica do cronômetro
  const initialMinutes = getRemainingMinutes(convocacao.created_at);
  const { minutes, seconds, isFinished } = useCountdown(
    initialMinutes,
    convocacao.status === 'pendente'
  );

  // Variáveis de formatação
  const dataInicio = new Date(convocacao.data_hora_inicio);
  const dataFim = new Date(convocacao.data_hora_fim);
  const taxaApp = calcularTaxaApp(convocacao.valor_retido);
  const valorLiquido = convocacao.valor_retido - taxaApp;

  // Funções de ajuda para Título e Cor do Status
  const getTituloConvocacao = (c: any) => {
    if (!user) return '';
    switch (c.status) {
      case 'pendente': return user.tipo_usuario === 'goleiro' ? 'Convocação Recebida' : 'Convocação Enviada';
      case 'aceito': return 'Convocação Aceita';
      case 'recusado': return 'Convocação Recusada';
      case 'Perdida': return 'Convocação Expirada';
      default: return `Convocação ${c.status}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pendente': return '#D97706';
      case 'aceito': return '#10B981';
      case 'Perdida': return '#6B7280';
      case 'recusado': case 'cancelado': return '#EF4444';
      default: return '#6B7280';
    }
  };

  return (
    <View style={styles.convocacaoCard}>
      <View style={styles.convocacaoHeader}>
        <Text style={styles.convocacaoTitle}>{getTituloConvocacao(convocacao)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(convocacao.status) }]}>
          <Text style={styles.statusText}>{convocacao.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.convocacaoInfo}>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>
            📅 {dataInicio.toLocaleDateString('pt-BR')} - {dataInicio.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})} às {dataFim.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoText}>📍 {convocacao.local}</Text>
        </View>
        
        {user?.tipo_usuario === 'goleiro' ? (
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
            {user?.tipo_usuario === 'organizador' ? 
              `Goleiro: ${convocacao.goleiro_nome || 'Não atribuído'}` : 
              `Organizador: ${convocacao.organizador_nome}`
            }
          </Text>
        </View>
      </View>

      {/* CRONÔMETRO VISUAL */}
      {convocacao.status === 'pendente' && !isFinished && (
        <View style={styles.countdownContainer}>
          <Clock size={16} color="#b91c1c" />
          <Text style={styles.countdownText}>
            Expira em: {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </Text>
        </View>
      )}

      {/* BOTÕES DE ACEITAR/RECUSAR (são parte do card 'pendente') */}
      {user?.tipo_usuario === 'goleiro' && convocacao.status === 'pendente' && (
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
    </View>
  );
}

// Estilos que pertencem ao card
const styles = StyleSheet.create({
  convocacaoCard: { backgroundColor: '#ffffffff', borderRadius: 16, padding: 20, marginHorizontal: 20, marginBottom: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.1, shadowRadius: 6, elevation: 4 },
  convocacaoHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  convocacaoTitle: { fontSize: 17, fontWeight: '600', color: '#000000ff' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, minWidth: 80, alignItems: 'center' },
  statusText: { fontSize: 13, fontWeight: '600', color: '#FFFFFF', textTransform: 'uppercase' },
  convocacaoInfo: { gap: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoText: { fontSize: 15, color: '#000000ff' },
  valorText: { fontSize: 15, fontWeight: '600', color: '#10B981' },
  valorSection: { marginTop: 8 },
  taxaText: { fontSize: 13, color: '#000000ff' },
  actionButtons: { flexDirection: 'row', gap: 14, marginTop: 14 },
  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 12 },
  acceptButton: { backgroundColor: '#10B981' },
  rejectButton: { backgroundColor: '#EF4444' },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fee2e2', borderRadius: 8, alignSelf: 'flex-start' },
  countdownText: { marginLeft: 6, color: '#ad0505ff', fontSize: 13, fontWeight: '600' },
});