import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Coins, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone, FileText, Clock, XCircle, CheckCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

  const [historicoRecargas, setHistoricoRecargas] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  if (!user) return null;

  const saldo = getSaldo(user.id);
  const isAdmin = user.tipo_usuario === 'admin';
  const isGoleiro = user.tipo_usuario === 'goleiro';
  const isOrganizador = user.tipo_usuario === 'organizador';
  const recargasPendentes = isAdmin ? getRecargasPendentes() : [];

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

  useEffect(() => {
    carregarHistoricoRecargas();
  }, [user]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
      await carregarHistoricoRecargas();
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setRefreshing(false);
    }
  }, [user]);

  const handleRecarga = async () => {
    const valor = parseFloat(valorRecarga);
    if (!valor || valor < 10) {
      Alert.alert('⚠️ Valor inválido', 'Valor mínimo para recarga é R$ 10,00');
      return;
    }

    try {
      setLoadingActions(true);
      await recarregarCoins({
        organizador_id: user.id,
        valor_reais: valor,
        coins_recebidos: valor,
        metodo_pagamento: metodoPagamento,
      });
      setShowRecarga(false);
      setValorRecarga('');
      onRefresh();
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
      onRefresh();
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
      onRefresh();
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
      onRefresh();
    } catch (error) {
      console.error("Erro ao rejeitar recarga:", error);
      Alert.alert('Erro', 'Não foi possível rejeitar a recarga.');
    } finally {
      setLoadingActions(false);
    }
  };

  const valoresSugeridos = [25, 50, 100, 200];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
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
                <Text style={styles.historyText}>
                  + {recarga.coins_recebidos} coins ({recarga.metodo_pagamento.toUpperCase()})
                </Text>
                <Text style={styles.historyDate}>
                  {format(new Date(recarga.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </Text>
              </View>
              <View style={styles.historyStatus}>
                <Text style={{
                  color: recarga.status === 'aprovado' ? '#10B981' : recarga.status === 'pendente' ? '#F59E0B' : '#EF4444'
                }}>
                  {recarga.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* MODAL DE RECARGA */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRecarga}
        onRequestClose={() => setShowRecarga(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
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
        </View>
      </Modal>

      {/* MODAL DE SAQUE */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSaque}
        onRequestClose={() => setShowSaque(false)}
      >
        <View style={styles.centeredView}>
          <View style={styles.modalView}>
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
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  saldoCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 },
  saldoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  saldoTitle: { marginLeft: 8, fontSize: 16, fontWeight: '600', color: '#111827' },
  saldoValor: { fontSize: 32, fontWeight: 'bold', color: '#111827' },
  saldoRetidoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  saldoRetido: { marginLeft: 4, fontSize: 12, color: '#6b7280' },
  actionButtons: { flexDirection: 'row', marginBottom: 16 },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', padding: 12, borderRadius: 8, marginHorizontal: 4 },
  saqueButton: { backgroundColor: '#3B82F6' },
  actionButtonText: { color: '#fff', fontWeight: '600', marginLeft: 4 },
  
  // Novos estilos para o Modal
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  valoresSugeridos: { marginBottom: 12 },
  sectionTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  valoresGrid: { flexDirection: 'row', gap: 8 },
  valorSugerido: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8 },
  valorSugeridoText: { fontWeight: '600' },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 8 },
  paymentMethods: { flexDirection: 'row', gap: 8 },
  paymentMethod: { flexDirection: 'row', alignItems: 'center', padding: 8, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8 },
  paymentMethodActive: { borderColor: '#10B981' },
  paymentMethodText: { marginLeft: 4, fontWeight: '500', color: '#6b7280' },
  paymentMethodTextActive: { color: '#10B981' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
  cancelButton: { padding: 12, borderRadius: 8, backgroundColor: '#F3F4F6', flex: 1, marginRight: 4, alignItems: 'center' },
  cancelButtonText: { color: '#111827', fontWeight: '600' },
  confirmButton: { padding: 12, borderRadius: 8, backgroundColor: '#10B981', flex: 1, marginLeft: 4, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: '600' },
  infoBox: { backgroundColor: '#F3F4F6', padding: 8, borderRadius: 8, marginBottom: 12 },
  infoText: { fontSize: 12, color: '#6b7280' },
  adminSection: { marginBottom: 16 },
  noTransactionsText: { color: '#6b7280', fontSize: 12, textAlign: 'center', marginVertical: 8 },
  adminRecargaItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 },
  adminRecargaDetails: { flex: 1 },
  adminRecargaTitle: { fontWeight: '600', marginBottom: 2 },
  adminRecargaInfo: { fontSize: 12, color: '#6b7280' },
  adminRecargaDate: { fontSize: 10, color: '#9CA3AF', marginTop: 2 },
  adminRecargaActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  adminActionButton: { padding: 8, borderRadius: 8 },
  adminApproveButton: { backgroundColor: '#10B981' },
  adminRejectButton: { backgroundColor: '#EF4444' },
  transactionHistory: { marginTop: 16 },
  historyItem: { flexDirection: 'row', alignItems: 'center', padding: 8, backgroundColor: '#fff', borderRadius: 8, marginBottom: 8 },
  historyIcon: { marginRight: 8 },
  historyDetails: { flex: 1 },
  historyText: { fontWeight: '600', color: '#111827' },
  historyDate: { fontSize: 10, color: '#6b7280' },
  historyStatus: { width: 60, alignItems: 'center' },
});