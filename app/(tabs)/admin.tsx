import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator, RefreshControl } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Settings, Percent, ChartBar as BarChart3, Bell, Eye, Calendar, Clock } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// Função para enviar push via Expo API (sem alterações)
async function sendPushNotification(tokens: string[], title: string, body: string) {
  try {
    const messages = tokens.map(token => ({
      to: token,
      sound: 'default',
      title,
      body,
      data: { extra: 'dados se quiser' },
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const result = await response.json();
    console.log("Resultado Expo Push:", result);
  } catch (error) {
    console.error("Erro ao enviar push:", error);
    throw error;
  }
}

export default function AdminTab() {
  const { user } = useAuth();
  // ADICIONADO: 'loadData' para ser usado no refresh
  const { convocacoes, saldos, recargas, saques, loadData } = useApp();
  const [activeTab, setActiveTab] = useState('overview');

  const [taxas, setTaxas] = useState({
    app: 0,
    dia: 0,
    hora: 0,
    goleiro: 0,
  });
  const [loadingTaxas, setLoadingTaxas] = useState(true);
  const [savingTaxas, setSavingTaxas] = useState(false);
  const [notification, setNotification] = useState({ title: '', message: '' });
  const [temposRestantes, setTemposRestantes] = useState<{ [key: string]: string }>({});

  // ADICIONADO: Estado para controlar a animação do refresh
  const [refreshing, setRefreshing] = useState(false);

  // A lógica de buscar taxas foi movida para uma função reutilizável com 'useCallback'
  const fetchTaxas = useCallback(async () => {
    setLoadingTaxas(true);
    try {
      const { data, error } = await supabase
        .from('configuracoes_taxas')
        .select('taxa_app, taxa_dia, taxa_hora, taxa_goleiro')
        .eq('id', 1)
        .single();

      if (error) throw error;
      if (data) {
        setTaxas({
          app: data.taxa_app,
          dia: data.taxa_dia,
          hora: data.taxa_hora,
          goleiro: data.taxa_goleiro,
        });
      }
    } catch (error) {
      console.error("Erro ao buscar taxas:", error);
      Alert.alert("Erro", "Não foi possível carregar as taxas do sistema.");
    } finally {
      setLoadingTaxas(false);
    }
  }, []); // Array de dependências vazio

  // O useEffect inicial agora só chama a função criada acima
  useEffect(() => {
    fetchTaxas();
  }, [fetchTaxas]);

  // ADICIONADO: Função que será executada ao puxar a tela para baixo
  const onRefresh = useCallback(async () => {
    setRefreshing(true); // Ativa o indicador de loading
    try {
      // Executa a atualização dos dados globais (do AppContext) e das taxas (locais) em paralelo
      await Promise.all([
        loadData(),
        fetchTaxas()
      ]);
    } catch (error) {
        console.error("Erro durante o refresh:", error);
        Alert.alert("Erro", "Não foi possível atualizar os dados.");
    } finally {
        setRefreshing(false); // Desativa o indicador de loading ao finalizar
    }
  }, [loadData, fetchTaxas]);

  // Efeito para atualizar os cronômetros (sem alterações)
  useEffect(() => {
    if (activeTab !== 'monitoramento') return;

    const interval = setInterval(() => {
      const novosTempos: { [key: string]: string } = {};
      const convocacoesPendente = convocacoes.filter(c => c.status === 'pendente');

      convocacoesPendente.forEach(conv => {
        const DURACAO_EXPIRACAO_MINUTOS = 30;
        const expirationTime = new Date(new Date(conv.created_at).getTime() + DURACAO_EXPIRACAO_MINUTOS * 60000);
        const now = new Date();
        const diff = expirationTime.getTime() - now.getTime();

        if (diff <= 0) {
          novosTempos[conv.id] = 'Expirado';
        } else {
          const minutes = Math.floor((diff / 1000) / 60);
          const seconds = Math.floor((diff / 1000) % 60);
          novosTempos[conv.id] = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }
      });
      setTemposRestantes(novosTempos);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTab, convocacoes]);

  if (user?.tipo_usuario !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Acesso restrito a administradores</Text>
      </View>
    );
  }

  const stats = {
    totalConvocacoes: convocacoes.length,
    convocacoesAceitas: convocacoes.filter(c => c.status === 'aceito').length,
    convocacoesPendentes: convocacoes.filter(c => c.status === 'pendente').length,
    totalCoinsCirculacao: saldos.reduce((acc, s) => acc + s.saldo_coins + s.saldo_retido, 0),
    totalRecargas: recargas.reduce((acc, r) => acc + r.valor_reais, 0),
    saquesPendentes: saques.filter(s => s.status === 'pendente').length,
  };

  const handleSendNotification = async () => {
    if (!notification.title || !notification.message) {
      Alert.alert("Erro", "Preencha o título e a mensagem da notificação.");
      return;
    }
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('push_token')
        .eq('status_aprovacao', 'aprovado')
        .not('push_token', 'is', null);

      if (error) throw error;

      const tokens = data.map(u => u.push_token).filter(Boolean);

      if (tokens.length === 0) {
        Alert.alert("Aviso", "Nenhum usuário aprovado com token de notificação foi encontrado.");
        return;
      }

      await sendPushNotification(tokens, notification.title, notification.message);
      
      Alert.alert("Sucesso", `Notificação enviada para ${tokens.length} usuários!`);
      setNotification({ title: '', message: '' });

    } catch (err) {
      console.error("Erro ao buscar tokens ou enviar notificação:", err);
      Alert.alert("Erro", "Não foi possível enviar a notificação.");
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pendente': return { text: 'PENDENTE', color: '#D97706' };
      case 'aceito': return { text: 'ACEITO', color: '#10B981' };
      case 'recusado': return { text: 'RECUSADO', color: '#EF4444' };
      case 'Perdida': return { text: 'EXPIRADA', color: '#6B7280' };
      default: return { text: status.toUpperCase(), color: '#6B7280' };
    }
  };

  const calcularDuracao = (inicio: string, fim: string) => {
    const diffMs = new Date(fim).getTime() - new Date(inicio).getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}min`;
    if (hours > 0) return `${hours}h`;
    return `${minutes}min`;
  };

  // --- Funções de Renderização das Abas (sem alterações) ---
  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}><View style={styles.statCardInner}><Text style={styles.statNumber}>{stats.totalConvocacoes}</Text><Text style={styles.statLabel}>Total Convocações</Text></View></View>
        <View style={styles.statCard}><View style={styles.statCardInner}><Text style={styles.statNumber}>{stats.convocacoesAceitas}</Text><Text style={styles.statLabel}>Aceitas</Text></View></View>
        <View style={styles.statCard}><View style={styles.statCardInner}><Text style={styles.statNumber}>{stats.convocacoesPendentes}</Text><Text style={styles.statLabel}>Pendentes</Text></View></View>
        <View style={styles.statCard}><View style={styles.statCardInner}><Text style={styles.statNumber}>{stats.totalCoinsCirculacao}</Text><Text style={styles.statLabel}>Coins em Circulação</Text></View></View>
        <View style={styles.statCard}><View style={styles.statCardInner}><Text style={styles.statNumber}>R$ {stats.totalRecargas.toFixed(2)}</Text><Text style={styles.statLabel}>Total Recargas</Text></View></View>
        <View style={styles.statCard}><View style={styles.statCardInner}><Text style={styles.statNumber}>{stats.saquesPendentes}</Text><Text style={styles.statLabel}>Saques Pendentes</Text></View></View>
      </View>
      <View style={styles.ratesSection}>
        <Text style={styles.sectionTitle}>💰 Valores e Taxas Atuais (em R$)</Text>
        {loadingTaxas ? (
          <ActivityIndicator size="small" color="#7c3aed" style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.ratesGrid}>
            <View style={styles.rateCard}><Text style={styles.rateLabel}>App (Taxa)</Text><Text style={styles.rateValue}>R$ {taxas.app.toFixed(2)}</Text></View>
            <View style={styles.rateCard}><Text style={styles.rateLabel}>Dia (Adicional)</Text><Text style={styles.rateValue}>R$ {taxas.dia.toFixed(2)}</Text></View>
            <View style={styles.rateCard}><Text style={styles.rateLabel}>Hora (Adicional)</Text><Text style={styles.rateValue}>R$ {taxas.hora.toFixed(2)}</Text></View>
            <View style={styles.rateCard}><Text style={styles.rateLabel}>Goleiro (Base)</Text><Text style={styles.rateValue}>R$ {taxas.goleiro.toFixed(2)}</Text></View>
          </View>
        )}
      </View>
    </View>
  );

  const renderMonitoramento = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const convocacoesPendente = convocacoes.filter(c => c.status === 'pendente');
    const convocacoesAceitasHoje = convocacoes.filter(c => 
      c.status === 'aceito' && new Date(c.data_hora_inicio).setHours(0, 0, 0, 0) === today.getTime()
    );

    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.subSectionTitle}>Convocação Pendente</Text>
        {convocacoesPendente.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma convocação pendente no momento. ✅</Text>
        ) : (
          convocacoesPendente.map(conv => {
            const statusInfo = getStatusInfo(conv.status);
            const dataInicio = new Date(conv.data_hora_inicio);
            return (
              <View key={conv.id} style={styles.monitorCard}>
                <View style={styles.monitorCardHeader}>
                  <Text style={styles.monitorLocal}>{conv.local || 'Local não definido'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusText}>{statusInfo.text}</Text>
                  </View>
                </View>
                <View style={styles.monitorCardBody}>
                  <View style={styles.monitorInfoRow}><Calendar size={16} color="#64748b" /><Text style={styles.monitorInfoText}>{dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                  <View style={styles.monitorInfoRow}><Clock size={16} color="#64748b" /><Text style={styles.monitorInfoText}>Duração: {calcularDuracao(conv.data_hora_inicio, conv.data_hora_fim)}</Text></View>
                  <View style={styles.monitorInfoRow}><Text style={styles.monitorCoinEmoji}>💰</Text><Text style={styles.monitorInfoText}>Valor: {conv.valor_retido} coins</Text></View>
                </View>
                {conv.status === 'pendente' && (
                  <View style={styles.countdownContainer}><Clock size={16} color="#b91c1c" /><Text style={styles.countdownText}>Expira em: {temposRestantes[conv.id] || '...'}</Text></View>
                )}
              </View>
            );
          })
        )}
        
        <View style={styles.separator} />

        <Text style={styles.subSectionTitle}>Convocação Aceita (Hoje)</Text>
        {convocacoesAceitasHoje.length === 0 ? (
          <Text style={styles.emptyText}>Nenhuma convocação aceita para hoje. 📅</Text>
        ) : (
          convocacoesAceitasHoje.map(conv => {
            const statusInfo = getStatusInfo(conv.status);
            const dataInicio = new Date(conv.data_hora_inicio);
            return (
              <View key={conv.id} style={styles.monitorCard}>
                <View style={styles.monitorCardHeader}>
                  <Text style={styles.monitorLocal}>{conv.local || 'Local não definido'}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
                    <Text style={styles.statusText}>{statusInfo.text}</Text>
                  </View>
                </View>
                <View style={styles.monitorCardBody}>
                  <View style={styles.monitorInfoRow}><Calendar size={16} color="#64748b" /><Text style={styles.monitorInfoText}>{dataInicio.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} às {dataInicio.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Text></View>
                  <View style={styles.monitorInfoRow}><Clock size={16} color="#64748b" /><Text style={styles.monitorInfoText}>Duração: {calcularDuracao(conv.data_hora_inicio, conv.data_hora_fim)}</Text></View>
                  <View style={styles.monitorInfoRow}><Text style={styles.monitorCoinEmoji}>💰</Text><Text style={styles.monitorInfoText}>Valor: {conv.valor_retido} coins</Text></View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    );
  };

  const renderTaxas = () => {
    const handleSaveChanges = async () => {
      setSavingTaxas(true);
      try {
        const { error } = await supabase
          .from('configuracoes_taxas')
          .update({
            taxa_app: taxas.app,
            taxa_dia: taxas.dia,
            taxa_hora: taxas.hora,
            taxa_goleiro: taxas.goleiro,
            updated_at: new Date().toISOString(),
          })
          .eq('id', 1);
        if (error) throw error;
        Alert.alert("Sucesso!", "Os valores foram atualizados com sucesso.");
      } catch (error) {
        console.error("Erro ao salvar taxas:", error);
        Alert.alert("Erro", "Não foi possível salvar as alterações.");
      } finally {
        setSavingTaxas(false);
      }
    };

    if (loadingTaxas) {
      return <ActivityIndicator size="large" color="#7c3aed" style={{ marginTop: 40 }} />;
    }
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>⚙️ Ajuste de Valores (em R$)</Text>
        <Text style={styles.infoText}>
          Ajuste os valores base aqui. O valor final para o usuário é calculado automaticamente com base no nível do goleiro e nas regras de dia/horário.
        </Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Taxa do App (valor fixo por convocação)</Text>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="Ex: 5.00" value={String(taxas.app)} onChangeText={(text) => setTaxas(prev => ({ ...prev, app: parseFloat(text.replace(',', '.')) || 0 }))} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adicional por Dia (Sexta a Segunda)</Text>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="Ex: 10.00" value={String(taxas.dia)} onChangeText={(text) => setTaxas(prev => ({ ...prev, dia: parseFloat(text.replace(',', '.')) || 0 }))} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Adicional por Horário (09:00 - 15:00)</Text>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="Ex: 5.00" value={String(taxas.hora)} onChangeText={(text) => setTaxas(prev => ({ ...prev, hora: parseFloat(text.replace(',', '.')) || 0 }))} />
        </View>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Valor Base do Goleiro (para nível Iniciante)</Text>
          <TextInput style={styles.input} keyboardType="numeric" placeholder="Ex: 30.00" value={String(taxas.goleiro)} onChangeText={(text) => setTaxas(prev => ({ ...prev, goleiro: parseFloat(text.replace(',', '.')) || 0 }))} />
        </View>
        
        <TouchableOpacity style={[styles.confirmButton, { marginTop: 20 }, savingTaxas && { backgroundColor: '#a5b4fc' }]} onPress={handleSaveChanges} disabled={savingTaxas}>
          {savingTaxas ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Salvar Alterações</Text>}
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotificacoes = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>🔔 Enviar Notificação</Text>
      <View style={styles.inputGroup}><Text style={styles.label}>Título</Text><TextInput style={styles.input} placeholder="Ex: Promoção especial!" value={notification.title} onChangeText={(text) => setNotification(prev => ({ ...prev, title: text }))} /></View>
      <View style={styles.inputGroup}><Text style={styles.label}>Mensagem</Text><TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} placeholder="Digite a mensagem da notificação..." multiline value={notification.message} onChangeText={(text) => setNotification(prev => ({ ...prev, message: text }))} /></View>
      <TouchableOpacity style={styles.confirmButton} onPress={handleSendNotification}><Text style={styles.confirmButtonText}>Enviar</Text></TouchableOpacity>
    </View>
  );

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'monitoramento', label: 'Ao Vivo', icon: Eye },
    { id: 'taxas', label: 'Taxas', icon: Percent },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}><View style={styles.titleContainer}><Settings size={28} color="#7c3aed" /><View><Text style={styles.title}>Painel do Administrador</Text><Text style={styles.subtitle}>Gerenciar sistema, taxas e notificações</Text></View></View></View>
      </View>
      <View style={styles.tabBar}>
        {tabs.map((tab) => (<TouchableOpacity key={tab.id} style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]} onPress={() => setActiveTab(tab.id)}><tab.icon size={18} color={activeTab === tab.id ? '#7c3aed' : '#64748b'} /><Text style={[styles.tabButtonText, activeTab === tab.id && styles.tabButtonTextActive]}>{tab.label}</Text></TouchableOpacity>))}
      </View>
      
      {/* ADICIONADO: 'refreshControl' ao ScrollView principal */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#7c3aed"]} // Cor do indicador de loading no Android
            tintColor={"#7c3aed"} // Cor do indicador de loading no iOS
          />
        }
      >
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'monitoramento' && renderMonitoramento()}
        {activeTab === 'taxas' && renderTaxas()}
        {activeTab === 'notificacoes' && renderNotificacoes()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'red' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#64748b' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', backgroundColor: '#fff' },
  tabButton: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabButtonText: { fontSize: 14, color: '#64748b' },
  tabButtonTextActive: { color: '#7c3aed', fontWeight: '600' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', margin: -6 },
  statCard: { width: '50%', padding: 6 },
  statCardInner: { backgroundColor: '#fff', padding: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: '#1e293b' },
  statLabel: { fontSize: 14, color: '#64748b', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1e293b', marginBottom: 16 },
  subSectionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8, marginTop: 16 },
  inputGroup: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '500', color: '#334155', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#fff', fontSize: 16 },
  confirmButton: { padding: 12, backgroundColor: '#7c3aed', borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 16, color: '#64748b' },
  monitorCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  monitorCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  monitorLocal: { fontSize: 16, fontWeight: '600', color: '#1e293b', flex: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginLeft: 8 },
  statusText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  monitorCardBody: { gap: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9', paddingTop: 12 },
  monitorInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monitorInfoText: { fontSize: 14, color: '#334155' },
  monitorCoinEmoji: { fontSize: 14 },
  countdownContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: '#fee2e2', borderRadius: 8, alignSelf: 'flex-start' },
  countdownText: { marginLeft: 6, color: '#b91c1c', fontSize: 14, fontWeight: '600' },
  ratesSection: {
    marginTop: 20,
  },
  ratesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    margin: -6,
    justifyContent: 'flex-start',
  },
  rateCard: {
    width: '46%',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 12,
    marginHorizontal: '2%',
  },
  rateLabel: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  rateValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  separator: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
});