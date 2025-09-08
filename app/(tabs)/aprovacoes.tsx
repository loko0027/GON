import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Modal } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import {
  UserCheck, Search, Filter, User, Mail, Phone, Calendar,
  CircleCheck as CheckCircle, Circle as XCircle, Clock
} from 'lucide-react-native';

// Definição da interface para os dados do usuário a ser aprovado/rejeitado
interface UserToProcess {
  id: string;
  nome: string;
  action: 'aprovar' | 'rejeitar'; // Indica se é para aprovar ou rejeitar
}

export default function AprovacoesTab() {
  const { user } = useAuth();
  const {
    getAllUsers,
    getUsuariosPendentes,
    aprovarUsuario,
    rejeitarUsuario
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('pendente');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'goleiro' | 'organizador'>('todos');

  // Novos estados para controlar o modal
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentUserToProcess, setCurrentUserToProcess] = useState<UserToProcess | null>(null);

  if (user?.tipo_usuario !== 'admin') {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <XCircle size={48} color="#ef4444" />
          <Text style={styles.errorText}>Acesso restrito a administradores</Text>
        </View>
      </View>
    );
  }

  const allUsers = getAllUsers();

  const filteredUsers = allUsers.filter(usuario => {
    // Normalização dos dados para comparação
    const statusNormalizado = usuario.status_aprovacao?.toLowerCase().trim() || 'pendente';
    const tipoNormalizado = usuario.tipo_usuario?.toLowerCase().trim() || '';

    // Condições de filtro
    const matchesSearch =
      usuario.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      usuario.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      filterStatus === 'todos' || statusNormalizado === filterStatus;

    const matchesTipo =
      filterTipo === 'todos' || tipoNormalizado === filterTipo;

    // Excluir admins da lista de aprovação, pois eles não precisam ser aprovados por outros admins
    const notAdmin = tipoNormalizado !== 'admin';

    return matchesSearch && matchesStatus && matchesTipo && notAdmin;
  });

  // Função para abrir o modal com os dados do usuário e a ação
  const openConfirmationModal = (userId: string, nome: string, action: 'aprovar' | 'rejeitar') => {
    console.log(`[UI - Clique] Botão ${action.toUpperCase()} clicado para o usuário: ${nome} (ID: ${userId})`);
    setCurrentUserToProcess({ id: userId, nome: nome, action: action });
    setIsModalVisible(true);
  };

  // Função que será chamada ao confirmar no modal
  const handleConfirmAction = async () => {
    console.log('[AprovacoesTab - handleConfirmAction] Função de confirmação do modal iniciada.'); // LOG
    if (!currentUserToProcess) {
      console.error("[AprovacoesTab - handleConfirmAction] Erro: Nenhum usuário selecionado no modal.");
      return;
    }

    const { id, nome, action } = currentUserToProcess;
    console.log(`[AprovacoesTab - handleConfirmAction] Confirmando ${action} para ${nome} (ID: ${id})`); // LOG

    try {
      if (action === 'aprovar') {
        console.log('[AprovacoesTab - handleConfirmAction] Tentando aprovar usuário via AppContext...'); // LOG
        await aprovarUsuario(id);
        Alert.alert('Sucesso', 'Usuário aprovado com sucesso!');
        console.log(`[AprovacoesTab - handleConfirmAction] Usuário ${nome} (ID: ${id}) aprovado com sucesso via AppContext!`);
      } else { // action === 'rejeitar'
        console.log('[AprovacoesTab - handleConfirmAction] Tentando rejeitar usuário via AppContext...'); // LOG
        await rejeitarUsuario(id);
        Alert.alert('Sucesso', 'Usuário rejeitado com sucesso!');
        console.log(`[AprovacoesTab - handleConfirmAction] Usuário ${nome} (ID: ${id}) rejeitado com sucesso via AppContext!`);
      }
    } catch (error) {
      console.error(`[AprovacoesTab - handleConfirmAction] Erro ao ${action}:`, error);
      Alert.alert('Erro', `Não foi possível ${action} o usuário.`);
      console.log(`[AprovacoesTab - handleConfirmAction] Erro ao tentar ${action} usuário ${nome} (ID: ${id}):`, error);
    } finally {
      // Fecha o modal e limpa os dados após a tentativa
      setIsModalVisible(false);
      setCurrentUserToProcess(null);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendente': return '#f59e0b';
      case 'aprovado': return '#10b981';
      case 'rejeitado': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pendente': return <Clock size={16} color="#f59e0b" />;
      case 'aprovado': return <CheckCircle size={16} color="#10b981" />;
      case 'rejeitado': return <XCircle size={16} color="#ef4444" />;
      default: return <Clock size={16} color="#6b7280" />;
    }
  };

  const getTipoEmoji = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case 'goleiro': return '🧤';
      case 'organizador': return '👥';
      default: return '👤';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            <UserCheck size={28} color="#059669" />
            <View>
              <Text style={styles.title}>Aprovações</Text>
              <Text style={styles.subtitle}>Gerencie solicitações de cadastro</Text>
            </View>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statBadge}>
              <Text style={styles.statNumber}>{getUsuariosPendentes().length}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por nome ou email..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#94a3b8"
          />
        </View>

        {/* Filtros de status */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {[
            { key: 'pendente', label: 'Pendentes', color: '#f59e0b' },
            { key: 'aprovado', label: 'Aprovados', color: '#10b981' },
            { key: 'rejeitado', label: 'Rejeitados', color: '#ef4444' },
            { key: 'todos', label: 'Todos', color: '#6b7280' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                filterStatus === filter.key && {
                  backgroundColor: filter.color + '20',
                  borderColor: filter.color
                }
              ]}
              onPress={() => setFilterStatus(filter.key as any)}
            >
              <Text style={[
                styles.filterTabText,
                filterStatus === filter.key && { color: filter.color, fontWeight: '600' }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Filtros de tipo de usuário */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {[
            { key: 'todos', label: 'Todos Tipos', emoji: '👥' },
            { key: 'goleiro', label: 'Goleiros', emoji: '🧤' },
            { key: 'organizador', label: 'Organizadores', emoji: '👥' }
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                filterTipo === filter.key && styles.filterTabActive
              ]}
              onPress={() => setFilterTipo(filter.key as any)}
            >
              <Text style={styles.filterEmoji}>{filter.emoji}</Text>
              <Text style={[
                styles.filterTabText,
                filterTipo === filter.key && styles.filterTabTextActive
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.usersList} showsVerticalScrollIndicator={false}>
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyState}>
            <UserCheck size={64} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
            <Text style={styles.emptySubtitle}>Ajuste os filtros para ver mais resultados</Text>
          </View>
        ) : (
          filteredUsers.map((usuario) => {
            const status = usuario.status_aprovacao?.toLowerCase().trim() || 'pendente';

            return (
              <View key={usuario.id} style={styles.userCard}>
                <View style={styles.userHeader}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{getTipoEmoji(usuario.tipo_usuario)}</Text>
                  </View>

                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName}>{usuario.nome}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(status) + '20' }]}>
                        {getStatusIcon(status)}
                        <Text style={[styles.statusText, { color: getStatusColor(status) }]}>
                          {status}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.userType}>
                      {usuario.tipo_usuario.charAt(0).toUpperCase() + usuario.tipo_usuario.slice(1)}
                    </Text>

                    <View style={styles.userDetails}>
                      <View style={styles.detailRow}>
                        <Mail size={14} color="#64748b" />
                        <Text style={styles.detailText}>{usuario.email}</Text>
                      </View>
                      {usuario.telefone && (
                        <View style={styles.detailRow}>
                          <Phone size={14} color="#64748b" />
                          <Text style={styles.detailText}>{usuario.telefone}</Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Calendar size={14} color="#64748b" />
                        <Text style={styles.detailText}>
                          {usuario.data_cadastro
                            ? new Date(usuario.data_cadastro).toLocaleDateString('pt-BR')
                            : '-'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {status === 'pendente' && (
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.rejectButton}
                      onPress={() => openConfirmationModal(usuario.id, usuario.nome, 'rejeitar')}
                    >
                      <XCircle size={16} color="#fff" />
                      <Text style={styles.buttonText}>Rejeitar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.approveButton}
                      onPress={() => openConfirmationModal(usuario.id, usuario.nome, 'aprovar')}
                    >
                      <CheckCircle size={16} color="#fff" />
                      <Text style={styles.buttonText}>Aprovar</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* --- MODAL DE CONFIRMAÇÃO --- */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(false);
          setCurrentUserToProcess(null);
        }}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>
              {currentUserToProcess?.action === 'aprovar' ? 'Aprovar Usuário' : 'Rejeitar Usuário'}
            </Text>
            <Text style={modalStyles.modalText}>
              Deseja realmente {currentUserToProcess?.action === 'aprovar' ? 'aprovar' : 'rejeitar'} <Text style={{fontWeight:'bold'}}>{currentUserToProcess?.nome}</Text>?
            </Text>

            <View style={modalStyles.modalActionButtons}>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.buttonCancel]}
                onPress={() => {
                  setIsModalVisible(false);
                  setCurrentUserToProcess(null);
                }}
              >
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  currentUserToProcess?.action === 'aprovar' ? modalStyles.buttonApprove : modalStyles.buttonReject
                ]}
                // --- AQUI ESTÁ A CORREÇÃO COM O LOG DE VERIFICAÇÃO FINAL ---
                onPress={() => {
                  console.log(`[UI - Clique no Modal] Botão CONFIRMAR ${currentUserToProcess?.action} clicado.`);
                  handleConfirmAction();
                }}
              >
                <Text style={modalStyles.buttonText}>
                  {currentUserToProcess?.action === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// --- ESTILOS DO MODAL ---
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', // Fundo escuro transparente
  },
  modalView: {
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 25,
    textAlign: 'center',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonApprove: {
    backgroundColor: '#10b981',
  },
  buttonReject: {
    backgroundColor: '#ef4444',
  },
  buttonCancel: {
    backgroundColor: '#9ca3af',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

// --- ESTILOS GERAIS ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginTop: 10,
  },
  header: {
    marginBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#059669',
  },
  subtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statBadge: {
    backgroundColor: '#10b981',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  statNumber: {
    fontWeight: '700',
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: 'white',
    textAlign: 'center',
  },
  filtersContainer: {
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    height: 30,
    color: '#1e293b',
  },
  filterTabs: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
    marginRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTabActive: {
    borderColor: '#059669',
    backgroundColor: '#d1fae5',
  },
  filterTabText: {
    fontSize: 13,
    color: '#475569',
  },
  filterTabTextActive: {
    fontWeight: '700',
    color: '#059669',
  },
  filterEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  usersList: {
    flex: 1,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 80,
  },
  emptyTitle: {
    marginTop: 14,
    fontSize: 18,
    color: '#cbd5e1',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  userHeader: {
    flexDirection: 'row',
  },
  userAvatar: {
    backgroundColor: '#d1fae5',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userAvatarText: {
    fontSize: 24,
  },
  userInfo: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    marginLeft: 4,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  userType: {
    color: '#64748b',
    fontSize: 14,
    marginTop: 2,
  },
  userDetails: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    marginLeft: 6,
    color: '#64748b',
    fontSize: 13,
  },
  actionButtons: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  approveButton: {
    flexDirection: 'row',
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  rejectButton: {
    flexDirection: 'row',
    backgroundColor: '#ef4444',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
});