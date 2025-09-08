import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Settings, Plus, CreditCard as Edit3, ChartBar as BarChart3, Bell } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

// 🚀 Função para enviar push via Expo API
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
  const { convocacoes, saldos, categorias, recargas, saques } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ nome: '', emoji: '', tipo: 'positiva' as 'positiva' | 'neutra' | 'negativa' });

  // Notificações
  const [notification, setNotification] = useState({ title: '', message: '' });

  if (user?.tipo_usuario !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Acesso restrito a administradores</Text>
      </View>
    );
  }

  // Estatísticas
  const stats = {
    totalConvocacoes: convocacoes.length,
    convocacoesAceitas: convocacoes.filter(c => c.status === 'aceito').length,
    convocacoesPendentes: convocacoes.filter(c => c.status === 'pendente').length,
    totalCoinsCirculacao: saldos.reduce((acc, s) => acc + s.saldo_coins + s.saldo_retido, 0),
    totalRecargas: recargas.reduce((acc, r) => acc + r.valor_reais, 0),
    saquesPendentes: saques.filter(s => s.status === 'pendente').length,
  };

  // Adicionar categoria
  const handleAddCategory = () => {
    if (!newCategory.nome || !newCategory.emoji) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    Alert.alert('Sucesso', 'Categoria adicionada com sucesso!');
    setShowAddCategory(false);
    setNewCategory({ nome: '', emoji: '', tipo: 'positiva' });
  };

  // Enviar notificações
  const handleSendNotification = async () => {
    if (!notification.title || !notification.message) {
      Alert.alert("Erro", "Preencha título e mensagem.");
      return;
    }

    try {
      const { data: tokensData, error } = await supabase
        .from('user_push_tokens')
        .select(`expo_push_token, usuario (id, status_aprovacao)`);

      if (error) throw error;

      const tokens = tokensData
        .filter(t => t.usuario?.status_aprovacao === 'aprovado')
        .map(t => t.expo_push_token)
        .filter(Boolean);

      if (tokens.length === 0) {
        Alert.alert("Aviso", "Nenhum usuário aprovado com token de notificação encontrado.");
        return;
      }

      await sendPushNotification(tokens, notification.title, notification.message);

      Alert.alert("Sucesso", "Notificação enviada para os usuários!");
      setNotification({ title: '', message: '' });
    } catch (err) {
      console.error(err);
      Alert.alert("Erro", "Não foi possível enviar a notificação.");
    }
  };

  const renderOverview = () => (
    <View style={styles.tabContent}>
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalConvocacoes}</Text>
          <Text style={styles.statLabel}>Total Convocações</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.convocacoesAceitas}</Text>
          <Text style={styles.statLabel}>Aceitas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.convocacoesPendentes}</Text>
          <Text style={styles.statLabel}>Pendentes</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.totalCoinsCirculacao}</Text>
          <Text style={styles.statLabel}>Coins em Circulação</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>R$ {stats.totalRecargas}</Text>
          <Text style={styles.statLabel}>Total Recargas</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats.saquesPendentes}</Text>
          <Text style={styles.statLabel}>Saques Pendentes</Text>
        </View>
      </View>
    </View>
  );

  const renderCategorias = () => (
    <View style={styles.tabContent}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>🏷️ Categorias de Avaliação</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddCategory(true)}>
          <Plus size={16} color="#fff" />
          <Text style={styles.addButtonText}>Adicionar</Text>
        </TouchableOpacity>
      </View>

      {showAddCategory && (
        <View style={styles.addCategoryForm}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Categoria</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Top Demais"
              value={newCategory.nome}
              onChangeText={(text) => setNewCategory(prev => ({ ...prev, nome: text }))}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Emoji</Text>
            <TextInput
              style={styles.input}
              placeholder="🌟"
              value={newCategory.emoji}
              onChangeText={(text) => setNewCategory(prev => ({ ...prev, emoji: text }))}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tipo</Text>
            <View style={styles.tipoButtons}>
              {['positiva', 'neutra', 'negativa'].map((tipo) => (
                <TouchableOpacity
                  key={tipo}
                  style={[
                    styles.tipoButton,
                    newCategory.tipo === tipo && styles.tipoButtonActive
                  ]}
                  onPress={() => setNewCategory(prev => ({ ...prev, tipo: tipo as any }))}
                >
                  <Text style={styles.tipoButtonText}>{tipo}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.formActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddCategory(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleAddCategory}>
              <Text style={styles.confirmButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.categoriasList}>
        {categorias.map((categoria) => (
          <View key={categoria.id} style={styles.categoriaCard}>
            <View style={styles.categoriaInfo}>
              <Text style={styles.categoriaEmoji}>{categoria.emoji}</Text>
              <Text style={styles.categoriaNome}>{categoria.nome_categoria}</Text>
            </View>
            <View style={styles.categoriaActions}>
              <View style={[styles.tipoTag, { backgroundColor: getTipoColor(categoria.tipo) }]}>
                <Text style={styles.tipoTagText}>{categoria.tipo}</Text>
              </View>
              <TouchableOpacity style={styles.editButton}>
                <Edit3 size={16} color="#6b7280" />
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const renderNotificacoes = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>🔔 Enviar Notificação</Text>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Título</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Promoção especial!"
          value={notification.title}
          onChangeText={(text) => setNotification(prev => ({ ...prev, title: text }))}
        />
      </View>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Mensagem</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
          placeholder="Digite a mensagem da notificação..."
          multiline
          value={notification.message}
          onChangeText={(text) => setNotification(prev => ({ ...prev, message: text }))}
        />
      </View>
      <TouchableOpacity style={styles.confirmButton} onPress={handleSendNotification}>
        <Text style={styles.confirmButtonText}>Enviar</Text>
      </TouchableOpacity>
    </View>
  );

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'positiva': return '#dcfce7';
      case 'neutra': return '#f3f4f6';
      case 'negativa': return '#fee2e2';
      default: return '#f3f4f6';
    }
  };

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: BarChart3 },
    { id: 'categorias', label: 'Categorias', icon: Settings },
    { id: 'notificacoes', label: 'Notificações', icon: Bell },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Settings size={28} color="#7c3aed" />
            <View>
              <Text style={styles.title}>Configurações</Text>
              <Text style={styles.subtitle}>Gerenciar sistema, categorias e notificações</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tabButton, activeTab === tab.id && styles.tabButtonActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <tab.icon size={18} color={activeTab === tab.id ? '#7c3aed' : '#64748b'} />
            <Text style={[styles.tabButtonText, activeTab === tab.id && styles.tabButtonTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'categorias' && renderCategorias()}
        {activeTab === 'notificacoes' && renderNotificacoes()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  errorText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'red' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerContent: { flexDirection: 'row', alignItems: 'center' },
  titleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111' },
  subtitle: { fontSize: 14, color: '#666' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tabButton: { flex: 1, padding: 12, alignItems: 'center' },
  tabButtonActive: { borderBottomWidth: 2, borderBottomColor: '#7c3aed' },
  tabButtonText: { fontSize: 14, color: '#64748b', marginTop: 4 },
  tabButtonTextActive: { color: '#7c3aed', fontWeight: 'bold' },
  content: { flex: 1 },
  tabContent: { padding: 16 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { width: '45%', backgroundColor: '#f9fafb', padding: 12, borderRadius: 8 },
  statNumber: { fontSize: 18, fontWeight: 'bold', color: '#111' },
  statLabel: { fontSize: 12, color: '#666' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#7c3aed', padding: 8, borderRadius: 6 },
  addButtonText: { color: '#fff', marginLeft: 4 },
  addCategoryForm: { backgroundColor: '#f9fafb', padding: 12, borderRadius: 8, marginBottom: 12 },
  inputGroup: { marginBottom: 8 },
  label: { fontSize: 12, fontWeight: '500', color: '#333' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 8, marginTop: 4 },
  tipoButtons: { flexDirection: 'row', gap: 8, marginTop: 6 },
  tipoButton: { padding: 6, borderWidth: 1, borderColor: '#ddd', borderRadius: 6 },
  tipoButtonActive: { backgroundColor: '#7c3aed22', borderColor: '#7c3aed' },
  tipoButtonText: { fontSize: 12, color: '#111' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  cancelButton: { padding: 8, backgroundColor: '#f3f4f6', borderRadius: 6 },
  cancelButtonText: { color: '#333' },
  confirmButton: { padding: 10, backgroundColor: '#7c3aed', borderRadius: 6, alignItems: 'center' },
  confirmButtonText: { color: '#fff', fontWeight: 'bold' },
  categoriasList: { gap: 8 },
  categoriaCard: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#fff', borderRadius: 6, borderWidth: 1, borderColor: '#eee' },
  categoriaInfo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoriaEmoji: { fontSize: 18 },
  categoriaNome: { fontSize: 14, fontWeight: '500' },
  categoriaActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tipoTag: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 6 },
  tipoTagText: { fontSize: 12, color: '#111' },
  editButton: { padding: 4 },
});
