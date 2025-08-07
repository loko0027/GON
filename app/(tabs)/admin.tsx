import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import { Settings, Plus, CreditCard as Edit3, ChartBar as BarChart3, Activity } from 'lucide-react-native';

export default function AdminTab() {
  const { user } = useAuth();
  const { convocacoes, saldos, categorias, recargas, saques } = useApp();
  const [activeTab, setActiveTab] = useState('overview');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState({ nome: '', emoji: '', tipo: 'positiva' as 'positiva' | 'neutra' | 'negativa' });

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

  const handleAddCategory = () => {
    if (!newCategory.nome || !newCategory.emoji) {
      Alert.alert('Erro', 'Preencha todos os campos');
      return;
    }

    Alert.alert('Sucesso', 'Categoria adicionada com sucesso!');
    setShowAddCategory(false);
    setNewCategory({ nome: '', emoji: '', tipo: 'positiva' });
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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddCategory(true)}
        >
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
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowAddCategory(false)}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleAddCategory}
            >
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
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <Settings size={28} color="#7c3aed" />
            <View>
              <Text style={styles.title}>Configurações</Text>
              <Text style={styles.subtitle}>Gerenciar sistema e categorias</Text>
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
      </ScrollView>
    </View>
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
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 15,
    color: '#64748b',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: '#7c3aed',
  },
  tabButtonText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#7c3aed',
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    width: '47%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7c3aed',
  },
  statLabel: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: '#7c3aed',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  addCategoryForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#374151',
  },
  tipoButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  tipoButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  tipoButtonActive: {
    borderColor: '#10B981',
    backgroundColor: '#ecfdf5',
  },
  tipoButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  formActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#6b7280',
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#10B981',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  categoriasList: {
    gap: 8,
  },
  categoriaCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  categoriaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoriaEmoji: {
    fontSize: 16,
  },
  categoriaNome: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoriaActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipoTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tipoTagText: {
    fontSize: 10,
    color: '#6b7280',
  },
  editButton: {
    padding: 4,
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
    textAlign: 'center',
    marginTop: 50,
  },
});