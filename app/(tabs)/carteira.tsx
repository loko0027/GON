import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, RefreshControl, Modal, Image } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Coins, Plus, ArrowUpRight, ArrowDownLeft, Smartphone, Clock, XCircle, CheckCircle } from 'lucide-react-native';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import { saquePixService } from '@/services/saquePixService';

// --- Função auxiliar para calcular CRC16 (Sua função) ---
function crc16(str: string) {
    let crc = 0xFFFF;
    const polynomial = 0x1021;
    for (let i = 0; i < str.length; i++) {
        crc ^= str.charCodeAt(i) << 8;
        for (let j = 0; j < 8; j++) {
            if ((crc & 0x8000) !== 0) {
                crc = ((crc << 1) & 0xFFFF) ^ polynomial;
            } else {
                crc = (crc << 1) & 0xFFFF;
            }
        }
    }
    return crc.toString(16).toUpperCase().padStart(4, "0");
}

// --- Função para gerar payload Pix válido (Sua função) ---
function gerarPayloadPix(valor: number) {
    const chavePix = "yafesm.srs@hotmail.com";
    const nomeRecebedor = "Pablo Vinicios Matias Gon";
    const cidadeRecebedor = "SAO PAULO";
    let payload = "";
    payload += "00" + "02" + "01";
    const gui = "BR.GOV.BCB.PIX";
    const pixKeyTLV = "01" + String(chavePix.length).padStart(2, "0") + chavePix;
    const guiTLV = "00" + String(gui.length).padStart(2, "0") + gui;
    const mai = guiTLV + pixKeyTLV;
    payload += "26" + String(mai.length).padStart(2, "0") + mai;
    payload += "52" + "04" + "0000";
    payload += "53" + "03" + "986";
    const amountStr = valor.toFixed(2);
    payload += "54" + String(amountStr.length).padStart(2, "0") + amountStr;
    payload += "58" + "02" + "BR";
    const nome = nomeRecebedor.toUpperCase().slice(0, 25);
    payload += "59" + String(nome.length).padStart(2, "0") + nome;
    const cidade = cidadeRecebedor.toUpperCase().slice(0, 15);
    payload += "60" + String(cidade.length).padStart(2, "0") + cidade;
    const txid = `recarga${Date.now()}`.slice(0, 25);
    const add = "05" + String(txid.length).padStart(2, "0") + add;
    payload += "62" + String(add.length).padStart(2, "0") + add;
    const payloadForCrc = payload + "63" + "04";
    const crc = crc16(payloadForCrc);
    payload += "63" + "04" + crc;
    return payload;
}

// Interfaces para tipagem dos dados
interface Recarga {
    id: string;
    valor_reais: number;
    coins_recebidos: number;
    metodo_pagamento: string;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    created_at: string;
    tipo: 'recarga';
}

interface Saque {
    id: string;
    valor_coins: number;
    valor_reais: number;
    status: 'pendente' | 'aprovado' | 'rejeitado';
    created_at: string;
    tipo: 'saque';
}

type Transacao = Recarga | Saque;

export default function CarteiraTab() {
    const { user, users } = useAuth();
    const { getSaldo, recarregarCoins, getRecargasPendentes, aprovarRecarga, rejeitarRecarga, loadData } = useApp();

    const [showRecarga, setShowRecarga] = useState(false);
    const [showSaque, setShowSaque] = useState(false);
    const [showSaqueSuccess, setShowSaqueSuccess] = useState(false); // Novo estado para o modal de sucesso
    const [showPixModal, setShowPixModal] = useState(false);
    const [valorRecarga, setValorRecarga] = useState('');
    const [valorSaque, setValorSaque] = useState('');
    const [chavePix, setChavePix] = useState('');
    const [loadingActions, setLoadingActions] = useState(false);
    const [pixQrCodeData, setPixQrCodeData] = useState<string | null>(null);
    const [pixLink, setPixLink] = useState<string | null>(null);

    const [historicoTransacoes, setHistoricoTransacoes] = useState<Transacao[]>([]);
    const [loadingHistorico, setLoadingHistorico] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    if (!user) return null;

    const saldo = getSaldo(user.id);
    const isAdmin = user.tipo_usuario === 'admin';
    const isGoleiro = user.tipo_usuario === 'goleiro';
    const isOrganizador = user.tipo_usuario === 'organizador';
    const recargasPendentes = isAdmin ? getRecargasPendentes() : [];

    // Nova função para carregar todo o histórico de transações
    const carregarHistoricoCompleto = async () => {
        if (!user) return;
        setLoadingHistorico(true);
        try {
            // Busca recargas do usuário logado
            const { data: recargasData, error: recargasError } = await supabase
                .from('recargas_coins')
                .select('id, valor_reais, coins_recebidos, metodo_pagamento, status, created_at')
                .eq('organizador_id', user.id);

            if (recargasError) throw recargasError;

            const recargasFormatadas = (recargasData || []).map(r => ({ ...r, tipo: 'recarga' }));

            // Busca saques do usuário logado
            const { data: saquesData, error: saquesError } = await supabase
                .from('saques_pix')
                .select('id, valor_coins, valor_reais, status, created_at')
                .eq('goleiro_id', user.id);

            if (saquesError) throw saquesError;

            const saquesFormatadas = (saquesData || []).map(s => ({ ...s, tipo: 'saque' }));

            // Combina e ordena os dois arrays por data
            const historico = [...recargasFormatadas, ...saquesFormatadas].sort((a, b) => {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            });

            setHistoricoTransacoes(historico);
        } catch (error) {
            console.error('Erro ao buscar histórico completo:', error);
            Alert.alert('Erro', 'Não foi possível carregar o histórico de transações.');
        } finally {
            setLoadingHistorico(false);
        }
    };

    useEffect(() => {
        carregarHistoricoCompleto();
    }, [user]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await loadData();
            await carregarHistoricoCompleto();
        } catch (error) {
            console.error('Erro ao atualizar dados:', error);
        } finally {
            setRefreshing(false);
        }
    }, [user, loadData]);

    const handleRecarga = async () => {
        const valor = parseFloat(valorRecarga);
        if (!valor || valor < 10) {
            Alert.alert('⚠️ Valor inválido', 'Valor mínimo para recarga é R$ 10,00');
            return;
        }
        try {
            setLoadingActions(true);
            const payload = gerarPayloadPix(valor);
            const qrCodeImage = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(payload)}`;
            setPixQrCodeData(qrCodeImage);
            setPixLink(payload);
            setShowRecarga(false);
            setShowPixModal(true);
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
            Alert.alert('⚠️ Valor insuficiente', 'Valor mínimo para saque é R$ 10,00');
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
        // ✅ Adiciona verificação para garantir que 'users' não seja undefined
        if (!users) {
          console.error('[CARTEIRA] Erro: Lista de usuários não carregada.');
          Alert.alert('Erro', 'Não foi possível solicitar o saque. Tente novamente em alguns segundos.');
          return;
        }
        try {
            setLoadingActions(true);
            await saquePixService.solicitarSaque({
                goleiro_id: user.id,
                valor_coins: valor,
                valor_reais: valor,
                chave_pix: chavePix,
                status: 'pendente'
            }, user.id, user.nome, () => saldo, users);

            setShowSaque(false); // Fecha o modal de solicitação
            setShowSaqueSuccess(true); // Abre o modal de sucesso

            setValorSaque('');
            setChavePix('');
            onRefresh();
        } catch (error: any) {
            console.error('[CARTEIRA] Erro no saque:', error);
            // O Alert.alert já está sendo chamado dentro do serviço, então pode ser removido aqui
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

    const handleFinalizarPix = () => {
        setShowPixModal(false);
        Alert.alert('Pagamento Pendente', `💰 Valor solicitado: R$ ${valorRecarga}\n\n⚽ O organizador deve pagar o valor escolhido via PIX.\n\n✅ Após o pagamento, a recarga será aprovada em até 15 minutos.`);
        recarregarCoins({
            organizador_id: user.id,
            valor_reais: parseFloat(valorRecarga),
            coins_recebidos: parseFloat(valorRecarga),
            metodo_pagamento: 'pix',
        });
        onRefresh();
    };

    const copyToClipboard = async () => {
        if (pixLink) {
            await Clipboard.setStringAsync(pixLink);
            Alert.alert('Copiado!', 'Código PIX copiado para a área de transferência.');
        }
    };

    const valoresSugeridos = [25, 50, 100, 200];

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={{ paddingBottom: 40 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
                        <TouchableOpacity style={styles.actionButton} onPress={() => setShowRecarga(true)} disabled={loadingActions}>
                            {loadingActions ? <ActivityIndicator color="#fff" /> : <Plus size={20} color="#fff" />}
                            <Text style={styles.actionButtonText}>Recarregar</Text>
                        </TouchableOpacity>
                    )}
                    {isGoleiro && (
                        <TouchableOpacity style={[styles.actionButton, styles.saqueButton]} onPress={() => setShowSaque(true)} disabled={loadingActions}>
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
                                    <Text style={styles.adminRecargaInfo}>Solicitado por: {recarga.organizador?.nome || 'Organizador Desconhecido'} ({recarga.organizador?.email || 'N/A'})</Text>
                                    <Text style={styles.adminRecargaInfo}>Valor: R$ {recarga.valor_reais.toFixed(2)} - Método: {recarga.metodo_pagamento}</Text>
                                    <Text style={styles.adminRecargaDate}>Data: {format(new Date(recarga.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</Text>
                                </View>
                                <View style={styles.adminRecargaActions}>
                                    <TouchableOpacity style={[styles.adminActionButton, styles.adminApproveButton]} onPress={() => handleAprovarRecarga(recarga.id)} disabled={loadingActions}>
                                        <CheckCircle size={20} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.adminActionButton, styles.adminRejectButton]} onPress={() => handleRejeitarRecarga(recarga.id)} disabled={loadingActions}>
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
                ) : historicoTransacoes.length === 0 ? (
                    <Text style={styles.noTransactionsText}>Nenhuma transação realizada ainda.</Text>
                ) : (
                    historicoTransacoes.map((transacao) => (
                        <View key={transacao.id} style={styles.historyItem}>
                            <View style={styles.historyIcon}>
                                {transacao.tipo === 'recarga' ? (
                                    <ArrowDownLeft size={16} color={transacao.status === 'aprovado' ? '#10B981' : '#F59E0B'} />
                                ) : (
                                    <ArrowUpRight size={16} color={transacao.status === 'aprovado' ? '#EF4444' : '#F59E0B'} />
                                )}
                            </View>
                            <View style={styles.historyDetails}>
                                <Text style={styles.historyText}>
                                    {transacao.tipo === 'recarga' ? `+ ${(transacao as Recarga).coins_recebidos} coins (Recarga)` : `- ${(transacao as Saque).valor_coins} coins (Saque)`}
                                </Text>
                                <Text style={styles.historyDate}>
                                    {format(new Date(transacao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                                </Text>
                            </View>
                            <View style={styles.historyStatus}>
                                <Text style={{
                                    color: transacao.status === 'aprovado' ? '#10B981' : transacao.status === 'pendente' ? '#F59E0B' : '#EF4444'
                                }}>
                                    {transacao.status.toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
            {/* Modal de recarga */}
            <Modal animationType="slide" transparent={true} visible={showRecarga} onRequestClose={() => setShowRecarga(false)}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>💳 Recarregar Coins</Text>
                        <View style={styles.valoresSugeridos}>
                            <Text style={styles.sectionTitle}>Valores Sugeridos</Text>
                            <View style={styles.valoresGrid}>
                                {valoresSugeridos.map((valor) => (
                                    <TouchableOpacity key={valor} style={styles.valorSugerido} onPress={() => setValorRecarga(valor.toString())}>
                                        <Text style={styles.valorSugeridoText}>R$ {valor}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Valor (R$)</Text>
                            <TextInput style={styles.input} placeholder="Digite o valor" value={valorRecarga} onChangeText={setValorRecarga} keyboardType="numeric" editable={!loadingActions} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Método de Pagamento</Text>
                            <View style={styles.paymentMethods}>
                                <TouchableOpacity style={[styles.paymentMethod, styles.paymentMethodActive]} disabled={true}>
                                    <Smartphone size={20} color={'#10B981'} />
                                    <Text style={[styles.paymentMethodText, styles.paymentMethodTextActive]}>PIX</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowRecarga(false)} disabled={loadingActions}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleRecarga} disabled={loadingActions}>
                                {loadingActions ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Recarregar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Modal PIX */}
            <Modal animationType="slide" transparent={true} visible={showPixModal} onRequestClose={handleFinalizarPix}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <TouchableOpacity style={styles.closeModalButton} onPress={handleFinalizarPix}>
                            <XCircle size={24} color="#6b7280" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>💰 PIX para Recarga</Text>
                        <View style={styles.pixInfoContainer}>
                            <Text style={styles.pixInfoText}>💎 <Text style={styles.pixInfoHighlight}>Valor escolhido: R$ {valorRecarga}</Text></Text>
                            <Text style={styles.pixInfoText}>⚠️ O organizador deve pagar o valor escolhido via PIX</Text>
                        </View>
                        {pixQrCodeData && (
                            <View style={styles.qrCodeContainer}>
                                <Image source={{ uri: pixQrCodeData }} style={styles.qrCodeImage} />
                                <Text style={styles.qrCodeText}>Escaneie o QR Code com seu app bancário</Text>
                            </View>
                        )}
                        {pixLink && (
                            <View style={styles.pixLinkContainer}>
                                <Text style={styles.pixLink}>{pixLink}</Text>
                                <TouchableOpacity style={styles.copyButton} onPress={copyToClipboard}>
                                    <Text style={styles.copyButtonText}>Copiar PIX</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
            {/* Modal Saque */}
            <Modal animationType="slide" transparent={true} visible={showSaque} onRequestClose={() => setShowSaque(false)}>
                <View style={styles.centeredView}>
                    <View style={styles.modalView}>
                        <Text style={styles.modalTitle}>🏧 Solicitar Saque</Text>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Valor (R$)</Text>
                            <TextInput style={styles.input} placeholder="Digite o valor" value={valorSaque} onChangeText={setValorSaque} keyboardType="numeric" editable={!loadingActions} />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Chave PIX</Text>
                            <TextInput style={styles.input} placeholder="Digite sua chave PIX" value={chavePix} onChangeText={setChavePix} editable={!loadingActions} />
                        </View>
                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowSaque(false)} disabled={loadingActions}>
                                <Text style={styles.cancelButtonText}>Cancelar</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.confirmButton} onPress={handleSaque} disabled={loadingActions}>
                                {loadingActions ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Sacar</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
            {/* Modal de Sucesso do Saque */}
            <Modal animationType="slide" transparent={true} visible={showSaqueSuccess} onRequestClose={() => setShowSaqueSuccess(false)}>
                <View style={styles.centeredView}>
                    <View style={[styles.modalView, styles.successModal]}>
                        <CheckCircle size={48} color="#10B981" style={{ marginBottom: 16 }} />
                        <Text style={styles.successTitle}>Saque Solicitado com Sucesso!</Text>
                        <Text style={styles.successMessage}>
                            Seu pedido de saque foi enviado e o PIX será efetivado em até **1 dia útil** após a aprovação do administrador.
                        </Text>
                        <TouchableOpacity style={styles.successButton} onPress={() => setShowSaqueSuccess(false)}>
                            <Text style={styles.successButtonText}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9fafb', paddingHorizontal: 16 },
    header: { marginTop: 20, marginBottom: 10 },
    title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 14, color: '#6b7280', marginTop: 2 },
    saldoCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginVertical: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 8, elevation: 2 },
    saldoHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    saldoTitle: { fontSize: 16, fontWeight: '600', color: '#111827', marginLeft: 6 },
    saldoValor: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
    saldoRetidoContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    saldoRetido: { fontSize: 12, color: '#6b7280', marginLeft: 4 },
    actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10 },
    actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', padding: 12, borderRadius: 8, flex: 1, justifyContent: 'center', marginRight: 8 },
    saqueButton: { backgroundColor: '#3B82F6', marginLeft: 8, marginRight: 0 },
    actionButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
    adminSection: { marginVertical: 10 },
    sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 6, color: '#111827' },
    noTransactionsText: { fontSize: 14, color: '#6b7280', marginVertical: 10 },
    adminRecargaItem: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginVertical: 4, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    adminRecargaDetails: { flex: 1 },
    adminRecargaTitle: { fontWeight: '600', color: '#111827' },
    adminRecargaInfo: { fontSize: 12, color: '#6b7280' },
    adminRecargaDate: { fontSize: 10, color: '#9ca3af' },
    adminRecargaActions: { flexDirection: 'row' },
    adminActionButton: { padding: 8, borderRadius: 8, marginLeft: 6 },
    adminApproveButton: { backgroundColor: '#10B981' },
    adminRejectButton: { backgroundColor: '#EF4444' },
    transactionHistory: { marginTop: 10 },
    historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 12, marginVertical: 4, shadowColor: '#000', shadowOpacity: 0.03, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 1 },
    historyIcon: { width: 30, justifyContent: 'center', alignItems: 'center' },
    historyDetails: { flex: 1, marginLeft: 6 },
    historyText: { fontSize: 14, fontWeight: '500', color: '#111827' },
    historyDate: { fontSize: 12, color: '#6b7280' },
    historyStatus: { width: 60, alignItems: 'center' },
    centeredView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' },
    modalView: { width: '90%', backgroundColor: 'white', borderRadius: 12, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12, color: '#111827' },
    inputGroup: { marginBottom: 12 },
    label: { fontSize: 14, color: '#6b7280', marginBottom: 4 },
    input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 10, fontSize: 14 },
    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
    cancelButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#E5E7EB', marginRight: 8 },
    cancelButtonText: { color: '#374151', fontWeight: '600' },
    confirmButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, backgroundColor: '#10B981' },
    confirmButtonText: { color: '#fff', fontWeight: '600' },
    valoresSugeridos: { marginBottom: 12 },
    valoresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    valorSugerido: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 8 },
    valorSugeridoText: { color: '#111827', fontWeight: '500' },
    paymentMethods: { flexDirection: 'row', marginTop: 4 },
    paymentMethod: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#d1d5db', marginRight: 8 },
    paymentMethodActive: { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
    paymentMethodText: { marginLeft: 6, color: '#374151' },
    paymentMethodTextActive: { color: '#10B981', fontWeight: '600' },
    closeModalButton: { position: 'absolute', top: 12, right: 12 },
    pixInfoContainer: { marginVertical: 12 },
    pixInfoText: { fontSize: 14, color: '#111827', marginBottom: 4 },
    pixInfoHighlight: { fontWeight: 'bold', color: '#10B981' },
    qrCodeContainer: { alignItems: 'center', marginVertical: 10 },
    qrCodeImage: { width: 200, height: 200 },
    qrCodeText: { fontSize: 12, color: '#6b7280', marginTop: 6 },
    pixLinkContainer: { marginTop: 10, alignItems: 'center' },
    pixLink: { fontSize: 12, color: '#6b7280', marginBottom: 6, textAlign: 'center' },
    copyButton: { backgroundColor: '#10B981', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
    copyButtonText: { color: '#fff', fontWeight: '600' },
    // Novos estilos para o modal de sucesso
    successModal: { alignItems: 'center' },
    successTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 8, textAlign: 'center' },
    successMessage: { fontSize: 14, color: '#4b5563', textAlign: 'center', marginBottom: 20 },
    successButton: { backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
    successButtonText: { color: '#fff', fontWeight: '600' },
});
