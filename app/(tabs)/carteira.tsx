import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Coins, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone, FileText, Clock, XCircle, CheckCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Import do Supabase para buscar recargas
import { supabase } from '@/lib/supabase';

export default function CarteiraTab() {
  const { user } = useAuth();
  const { getSaldo, recarregarCoins, solicitarSaque, getRecargasPendentes, aprovarRecarga, rejeitarRecarga, loadData } = useApp();
  
  const [showRecarga, setShowRecarga] = useState(false);
  const [showSaque, setShowSaque] = useState(false);
  const [valorRecarga, setValorRecarga] = useState('');
  const [valorSaque, setValorSaque] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [metodoPagamento, setMetodoPagamento] = useState<'pix' | 'cartao' | 'boleto'>('pix');
  const [loadingActions, setLoadingActions] = useState(false);

  // Novo estado para histórico de recargas
  const [historicoRecargas, setHistoricoRecargas] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  if (!user) return null;

  const saldo = getSaldo(user.id);
  const isAdmin = user.tipo_usuario === 'admin';
  const isGoleiro = user.tipo_usuario === 'goleiro';
  const isOrganizador = user.tipo_usuario === 'organizador';

  const recargasPendentes = isAdmin ? getRecargasPendentes() : [];

  // Função para carregar histórico de recargas do usuário
  const carregarHistoricoRecargas = async () => {
    setLoadingHistorico(true);
    const { data, error } = await supabase
      .from('recargas_coins')
      .select('id, valor_reais, coins_recebidos, metodo_pagamento, status, created_at')
      .eq('organizador_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar histórico de recargas:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de recargas.');
      setLoadingHistorico(false);
      return;
    }
    setHistoricoRecargas(data || []);
    setLoadingHistorico(false);
  };

  // Carrega o histórico ao montar o componente
  useEffect(() => {
    carregarHistoricoRecargas();
  }, [user]);

  const handleRecarga = async () => {
    const valor = parseFloat(valorRecarga);
    if (!valor || valor < 10) {
      Alert.alert('⚠️ Valor inválido', 'Valor mínimo para recarga é R$ 10,00');
      return;
    }

    try {
      setLoadingActions(true);
      console.log('[CARTEIRA] Processando recarga:', { valor, metodoPagamento });
      await recarregarCoins({
        organizador_id: user.id,
        valor_reais: valor,
        coins_recebidos: valor,
        metodo_pagamento: metodoPagamento,
      });
      setShowRecarga(false);
      setValorRecarga('');
    } catch (error) {
      console.error('[CARTEIRA] Erro na recarga:', error);
      Alert.alert('❌ Erro', 'Não foi possível solicitar a recarga.');
    } finally {
      setLoadingActions(false);
    }
  };

  const handleSaque = async () => {
    const valor = parseFloat(valorSaque);
    if (!valor || valor < 10) {
      Alert.alert('⚠️ Valor inválido', 'Valor mínimo para saque é R$ 10,00');
      return;
    }

    if (valor > saldo.saldo_coins) {
      Alert.alert('⚠️ Saldo insuficiente', `Você possui apenas ${saldo.saldo_coins} coins disponíveis.`);
      return;
    }

    if (!chavePix) {
      Alert.alert('⚠️ Chave PIX obrigatória', 'Informe sua chave PIX para receber o saque.');
      return;
    }

    try {
      setLoadingActions(true);
      console.log('[CARTEIRA] Processando saque:', { valor, chavePix });
      await solicitarSaque({
        goleiro_id: user.id,
        valor_coins: valor,
        valor_reais: valor,
        chave_pix: chavePix,
        status: 'pendente'
      });
      setShowSaque(false);
      setValorSaque('');
      setChavePix('');
    } catch (error) {
      console.error('[CARTEIRA] Erro no saque:', error);
      Alert.alert('❌ Erro', 'Não foi possível processar o saque. Tente novamente.');
    } finally {
      setLoadingActions(false);
    }
  };

  const handleAprovarRecarga = async (recargaId: string) => {
    setLoadingActions(true);
    try {
      await aprovarRecarga(recargaId);
      Alert.alert('Sucesso', 'Recarga aprovada!');
    } catch (error) {
      console.error("Erro ao aprovar recarga:", error);
      Alert.alert('Erro', 'Não foi possível aprovar a recarga.');
    } finally {
      setLoadingActions(false);
    }
  };

  const handleRejeitarRecarga = async (recargaId: string) => {
    setLoadingActions(true);
    try {
      await rejeitarRecarga(recargaId);
      Alert.alert('Sucesso', 'Recarga rejeitada!');
    } catch (error) {
      console.error("Erro ao rejeitar recarga:", error);
      Alert.alert('Erro', 'Não foi possível rejeitar a recarga.');
    } finally {
      setLoadingActions(false);
    }
  };

  const valoresSugeridos = [25, 50, 100, 200];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <View style={styles.header}>
        <Text style={styles.title}>💰 Carteira</Text>
        <Text style={styles.subtitle}>Gerencie seus Goleiro Coins</Text>
      </View>

      <View style={styles.saldoCard}>
        <View style={styles.saldoHeader}>
          <Coins size={24} color="#F59E0B" />
          <Text style={styles.saldoTitle}>Saldo Disponível</Text>
        </View>
        <Text style={styles.saldoValor}>{saldo.saldo_coins} coins</Text>
        {saldo.saldo_retido > 0 && (
          <View style={styles.saldoRetidoContainer}>
            <Clock size={14} color="#6b7280" />
            <Text style={styles.saldoRetido}>{saldo.saldo_retido} coins retidos</Text>
          </View>
        )}
      </View>

      {!isAdmin && (
        <View style={styles.actionButtons}>
          {isOrganizador && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowRecarga(true)}
              disabled={loadingActions}
            >
              {loadingActions ? <ActivityIndicator color="#fff" /> : <Plus size={20} color="#fff" />}
              <Text style={styles.actionButtonText}>Recarregar</Text>
            </TouchableOpacity>
          )}

          {isGoleiro && (
            <TouchableOpacity
              style={[styles.actionButton, styles.saqueButton]}
              onPress={() => setShowSaque(true)}
              disabled={loadingActions}
            >
              {loadingActions ? <ActivityIndicator color="#fff" /> : <ArrowUpRight size={20} color="#fff" />}
              <Text style={styles.actionButtonText}>Sacar</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {showRecarga && (
        <ScrollView style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Recarregar Coins</Text>
            
            <View style={styles.valoresSugeridos}>
              <Text style={styles.sectionTitle}>Valores Sugeridos</Text>
              <View style={styles.valoresGrid}>
                {valoresSugeridos.map((valor) => (
                  <TouchableOpacity
                    key={valor}
                    style={styles.valorSugerido}
                    onPress={() => setValorRecarga(valor.toString())}
                  >
                    <Text style={styles.valorSugeridoText}>R$ {valor}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o valor"
                value={valorRecarga}
                onChangeText={setValorRecarga}
                keyboardType="numeric"
                editable={!loadingActions}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Método de Pagamento</Text>
              <View style={styles.paymentMethods}>
                <TouchableOpacity
                  style={[styles.paymentMethod, metodoPagamento === 'pix' && styles.paymentMethodActive]}
                  onPress={() => setMetodoPagamento('pix')}
                  disabled={loadingActions}
                >
                  <Smartphone size={20} color={metodoPagamento === 'pix' ? '#10B981' : '#6b7280'} />
                  <Text style={[styles.paymentMethodText, metodoPagamento === 'pix' && styles.paymentMethodTextActive]}>
                    PIX
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentMethod, metodoPagamento === 'cartao' && styles.paymentMethodActive]}
                  onPress={() => setMetodoPagamento('cartao')}
                  disabled={loadingActions}
                >
                  <CreditCard size={20} color={metodoPagamento === 'cartao' ? '#10B981' : '#6b7280'} />
                  <Text style={[styles.paymentMethodText, metodoPagamento === 'cartao' && styles.paymentMethodTextActive]}>
                    Cartão
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.paymentMethod, metodoPagamento === 'boleto' && styles.paymentMethodActive]}
                  onPress={() => setMetodoPagamento('boleto')}
                  disabled={loadingActions}
                >
                  <FileText size={20} color={metodoPagamento === 'boleto' ? '#10B981' : '#6b7280'} />
                  <Text style={[styles.paymentMethodText, metodoPagamento === 'boleto' && styles.paymentMethodTextActive]}>
                    Boleto
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowRecarga(false)}
                disabled={loadingActions}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleRecarga}
                disabled={loadingActions}
              >
                {loadingActions ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Recarregar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {showSaque && (
        <ScrollView style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💸 Sacar Coins</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Valor (coins)</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite o valor"
                value={valorSaque}
                onChangeText={setValorSaque}
                keyboardType="numeric"
                editable={!loadingActions}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Chave PIX</Text>
              <TextInput
                style={styles.input}
                placeholder="Digite sua chave PIX"
                value={chavePix}
                onChangeText={setChavePix}
                editable={!loadingActions}
              />
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ O saque será processado em até 24 horas úteis. 
                Valor mínimo: R$ 10
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowSaque(false)}
                disabled={loadingActions}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleSaque}
                disabled={loadingActions}
              >
                {loadingActions ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Solicitar Saque</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.sectionTitle}>💰 Recargas Pendentes (Admin)</Text>
          {loadingActions && <ActivityIndicator size="small" color="#059669" style={{ marginBottom: 10 }} />}
          {recargasPendentes.length === 0 ? (
            <Text style={styles.noTransactionsText}>Nenhuma recarga pendente no momento.</Text>
          ) : (
            recargasPendentes.map((recarga) => (
              <View key={recarga.id} style={styles.adminRecargaItem}>
                <View style={styles.adminRecargaDetails}>
                  <Text style={styles.adminRecargaTitle}>Recarga de {recarga.coins_recebidos} coins</Text>
                  <Text style={styles.adminRecargaInfo}>
                    Solicitado por: {recarga.organizador?.nome || 'Organizador Desconhecido'} ({recarga.organizador?.email || 'N/A'})
                  </Text>
                  <Text style={styles.adminRecargaInfo}>
                    Valor: R$ {recarga.valor_reais.toFixed(2)} - Método: {recarga.metodo_pagamento}
                  </Text>
                  <Text style={styles.adminRecargaDate}>
                    Data: {format(new Date(recarga.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </Text>
                </View>
                <View style={styles.adminRecargaActions}>
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.adminApproveButton]}
                    onPress={() => handleAprovarRecarga(recarga.id)}
                    disabled={loadingActions}
                  >
                    <CheckCircle size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.adminActionButton, styles.adminRejectButton]}
                    onPress={() => handleRejeitarRecarga(recarga.id)}
                    disabled={loadingActions}
                  >
                    <XCircle size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      <View style={styles.transactionHistory}>
        <Text style={styles.sectionTitle}>📊 Histórico de Transações</Text>

        {loadingHistorico ? (
          <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 10 }} />
        ) : historicoRecargas.length === 0 ? (
          <Text style={styles.noTransactionsText}>Nenhuma recarga realizada ainda.</Text>
        ) : (
          historicoRecargas.map((recarga) => (
            <View key={recarga.id} style={styles.historyItem}>
              <View style={styles.historyIcon}>
                <ArrowDownLeft size={16} color={recarga.status === 'aprovado' ? '#10B981' : '#F59E0B'} />
              </View>
              <View style={styles.historyDetails}>
                <Text style={styles.historyTitle}>
                  Recarga {recarga.metodo_pagamento.toUpperCase()} - {recarga.status === 'aprovado' ? 'Aprovada' : 'Pendente'}
                </Text>
                <Text style={styles.historyDate}>
                  {format(new Date(recarga.created_at), 'dd MMM yyyy HH:mm', { locale: ptBR })}
                </Text>
              </View>
              <Text style={styles.historyValue}>+{recarga.coins_recebidos} coins</Text>
            </View>
          ))
        )}

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    letterSpacing: 0.3,
  },
  saldoCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 28,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  saldoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  saldoTitle: {
    fontSize: 17,
    color: '#64748b',
    fontWeight: '500',
  },
  saldoValor: {
    fontSize: 42,
    fontWeight: '800',
    color: '#059669',
  },
  saldoRetidoContainer: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  saldoRetido: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  saqueButton: {
    backgroundColor: '#dc2626',
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  modal: {
    flex: 1,
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 20,
    padding: 20,
  },
  modalContent: {
    flex: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    color: '#0f172a',
  },
  valoresSugeridos: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
    color: '#0f172a',
  },
  valoresGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  valorSugerido: {
    backgroundColor: '#d1fae5',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  valorSugeridoText: {
    color: '#059669',
    fontWeight: '700',
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
    fontSize: 15,
  },
  input: {
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  paymentMethodActive: {
    borderColor: '#10B981',
    backgroundColor: '#d1fae5',
  },
  paymentMethodText: {
    fontSize: 15,
    color: '#64748b',
    fontWeight: '600',
  },
  paymentMethodTextActive: {
    color: '#10B981',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#e2e8f0',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#64748b',
    fontWeight: '700',
    fontSize: 16,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  infoBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    color: '#166534',
    fontSize: 14,
  },
  adminSection: {
    margin: 20,
  },
  adminRecargaItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminRecargaDetails: {
    flex: 1,
  },
  adminRecargaTitle: {
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 4,
    color: '#0f172a',
  },
  adminRecargaInfo: {
    fontSize: 13,
    color: '#475569',
  },
  adminRecargaDate: {
    fontSize: 12,
    color: '#94a3b8',
  },
  adminRecargaActions: {
    flexDirection: 'row',
    gap: 8,
  },
  adminActionButton: {
    padding: 10,
    borderRadius: 12,
  },
  adminApproveButton: {
    backgroundColor: '#059669',
  },
  adminRejectButton: {
    backgroundColor: '#dc2626',
  },
  transactionHistory: {
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 60,
  },
  noTransactionsText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    marginTop: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 4,
  },
  historyIcon: {
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyTitle: {
    fontWeight: '700',
    fontSize: 15,
    color: '#0f172a',
  },
  historyDate: {
    fontSize: 13,
    color: '#64748b',
  },
  historyValue: {
    fontWeight: '700',
    fontSize: 14,
    color: '#059669',
  },
});
