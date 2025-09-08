import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Clipboard } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Coins, Plus, ArrowUpRight, ArrowDownLeft, CreditCard, Smartphone, FileText, Clock, XCircle, CheckCircle, Copy } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import QRCode from 'react-native-qrcode-svg';

export default function CarteiraTab() {
  const { user } = useAuth();
  const { getSaldo, recarregarCoins, solicitarSaque, getRecargasPendentes, aprovarRecarga, rejeitarRecarga, loadData } = useApp();
  
  const [showRecarga, setShowRecarga] = useState(false);
  const [showSaque, setShowSaque] = useState(false);
  const [valorRecarga, setValorRecarga] = useState('');
  const [valorSaque, setValorSaque] = useState('');
  const [chavePix, setChavePix] = useState('');
  const [loadingActions, setLoadingActions] = useState(false);

  const [historicoRecargas, setHistoricoRecargas] = useState<any[]>([]);
  const [loadingHistorico, setLoadingHistorico] = useState(true);

  const [refreshing, setRefreshing] = useState(false); 

  // Modal do QR Code PIX
  const [showQRCodeModal, setShowQRCodeModal] = useState(false);
  const [qrCodeValue, setQrCodeValue] = useState('');

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

  // RECARREGA ORGANIZADOR
  const handleRecargaOrganizador = () => {
    const valor = parseFloat(valorRecarga);
    if (!valor || valor < 10) {
      Alert.alert('⚠️ Valor inválido', 'Valor mínimo para recarga é R$ 10,00');
      return;
    }
    const chavePixFixa = '120.612.306-01';
    const qrValue = `PIX:${chavePixFixa}?valor=${valor.toFixed(2)}`;
    setQrCodeValue(qrValue);
    setShowRecarga(false);
    setShowQRCodeModal(true);
  };

  // SAQUE GOLEIRO
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

  const copiarQR = () => {
    Clipboard.setString(qrCodeValue);
    Alert.alert('Copiado!', 'Link do QR Code copiado para a área de transferência.');
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
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.title}>💰 Carteira</Text>
        <Text style={styles.subtitle}>Gerencie seus Goleiro Coins</Text>
      </View>

      {/* SALDO */}
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

      {/* BOTÕES */}
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

      {/* MODAL RECARREGAR ORGANIZADOR */}
      {showRecarga && (
        <ScrollView style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>💳 Recarregar Coins</Text>

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

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                ℹ️ O pagamento será via PIX. Recargas serão aprovadas em até 30 minutos.
              </Text>
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
                onPress={handleRecargaOrganizador}
                disabled={loadingActions}
              >
                <Text style={styles.confirmButtonText}>Gerar QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* MODAL QR CODE */}
      {showQRCodeModal && (
        <ScrollView style={styles.modal}>
          <View style={styles.modalContent}>
            <TouchableOpacity style={{ alignSelf: 'flex-end' }} onPress={() => setShowQRCodeModal(false)}>
              <XCircle size={28} color="#EF4444" />
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { marginTop: 0 }]}>📲 Pagamento PIX</Text>
            <View style={{ alignItems: 'center', marginVertical: 16 }}>
              <QRCode value={qrCodeValue} size={200} />
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={copiarQR}>
              <Copy size={16} color="#fff" />
              <Text style={styles.copyButtonText}>Copiar link PIX</Text>
            </TouchableOpacity>
            <Text style={[styles.infoText, { textAlign: 'center', marginTop: 12 }]}>
              Recargas serão aprovadas em até 30 minutos.
            </Text>
          </View>
        </ScrollView>
      )}

      {/* MODAL SAQUE */}
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
                ℹ️ O saque será processado em até 24 horas úteis. Valor mínimo: R$ 10
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

      {/* ADMIN */}
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

      {/* HISTÓRICO DE TRANSAÇÕES */}
      <View style={styles.transactionHistory}>
        <Text style={styles.sectionTitle}>📊 Histórico de Transações</Text>

        {loadingHistorico ? (
          <ActivityIndicator size="small" color="#059669" style={{ marginTop: 10 }} />
        ) : historicoRecargas.length === 0 ? (
          <Text style={styles.noTransactionsText}>Nenhuma transação realizada ainda.</Text>
        ) : (
          historicoRecargas.map((item) => (
            <View key={item.id} style={styles.transactionItem}>
              <Text style={styles.transactionTitle}>
                {item.coins_recebidos > 0 ? `+ ${item.coins_recebidos} coins` : `- ${item.valor_reais} R$`} ({item.metodo_pagamento.toUpperCase()})
              </Text>
              <Text style={styles.transactionDate}>
                {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </Text>
              <Text style={styles.transactionStatus}>{item.status.toUpperCase()}</Text>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f3f4f6', padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 14, color: '#6b7280' },
  saldoCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 16 },
  saldoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  saldoTitle: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  saldoValor: { fontSize: 32, fontWeight: '700', color: '#F59E0B' },
  saldoRetidoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  saldoRetido: { marginLeft: 4, fontSize: 12, color: '#6b7280' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', padding: 12, borderRadius: 12, flex: 1, justifyContent: 'center', marginRight: 8 },
  saqueButton: { backgroundColor: '#EF4444', marginRight: 0 },
  actionButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 9999 },
  modalContent: { backgroundColor: '#fff', margin: 20, borderRadius: 12, padding: 16, paddingBottom: 24 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10 },
  infoBox: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 12 },
  infoText: { color: '#92400e', fontSize: 12 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 12 },
  cancelButton: { marginRight: 12 },
  cancelButtonText: { color: '#6b7280', fontWeight: '600' },
  confirmButton: { backgroundColor: '#3B82F6', padding: 12, borderRadius: 8 },
  confirmButtonText: { color: '#fff', fontWeight: '600' },
  copyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#10B981', padding: 12, borderRadius: 8 },
  copyButtonText: { color: '#fff', fontWeight: '600', marginLeft: 8 },
  adminSection: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  noTransactionsText: { fontSize: 12, color: '#6b7280' },
  adminRecargaItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  adminRecargaDetails: { flex: 1 },
  adminRecargaTitle: { fontWeight: '600', fontSize: 14 },
  adminRecargaInfo: { fontSize: 12, color: '#6b7280' },
  adminRecargaDate: { fontSize: 10, color: '#9ca3af' },
  adminRecargaActions: { justifyContent: 'space-around' },
  adminActionButton: { padding: 8, borderRadius: 8 },
  adminApproveButton: { backgroundColor: '#10B981', marginBottom: 4 },
  adminRejectButton: { backgroundColor: '#EF4444' },
  transactionHistory: { marginTop: 20 },
  transactionItem: { backgroundColor: '#fff', padding: 12, borderRadius: 12, marginBottom: 8 },
  transactionTitle: { fontSize: 14, fontWeight: '600' },
  transactionDate: { fontSize: 12, color: '#6b7280' },
  transactionStatus: { fontSize: 12, color: '#10B981' },
});
