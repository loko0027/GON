import React, { useState, useCallback, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  Alert, TextInput, Modal, RefreshControl, ActivityIndicator 
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useApp } from '@/contexts/AppContext';
import {
  UserCheck, Search, Filter, User, Mail, Phone, Calendar,
  CircleCheck as CheckCircle, Circle as XCircle, Clock,
  Users, // Novo ícone para a aba Gerenciamento
  Bell, // Novo ícone para Notificar
  AlertOctagon, // Novo ícone para Banir
  ShieldOff, // Novo ícone para Banido
  Gamepad2, // Novo ícone para Jogos
  FileText // Novo ícone para Convocações
} from 'lucide-react-native';
import { formatDistanceToNow } from 'date-fns'; // Para formatar datas "há 5 minutos"
import { ptBR } from 'date-fns/locale'; // Para datas em português

// Definição da interface (sem alterações)
interface UserToProcess {
  id: string;
  nome: string;
  action: 'aprovar' | 'rejeitar';
}

// Tipo para o novo modal de gerenciamento
type ManageAction = 'notificar' | 'banir';

export default function AprovacoesTab() {
  const { user } = useAuth();
  
  // 1. Pegamos as NOVAS funções do AppContext
  const {
    getAllUsers,
    getUsuariosPendentes,
    aprovarUsuario,
    rejeitarUsuario,
    loadData,
    notificarUsuario, // <- NOVO (presumido)
    banirUsuario,     // <- NOVO (presumido)
  } = useApp();

  // ----- ESTADOS GERAIS -----
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'aprovacoes' | 'gerenciamento'>('aprovacoes');
  
  // ----- ESTADOS DA ABA 'APROVAÇÕES' -----
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'todos' | 'pendente' | 'aprovado' | 'rejeitado'>('pendente');
  const [filterTipo, setFilterTipo] = useState<'todos' | 'goleiro' | 'organizador'>('todos');
  const [isAprovarModalVisible, setIsAprovarModalVisible] = useState(false);
  const [currentUserToProcess, setCurrentUserToProcess] = useState<UserToProcess | null>(null);

  // ----- ESTADOS DA ABA 'GERENCIAMENTO' -----
  const [manageSearchQuery, setManageSearchQuery] = useState('');
  const [manageFilterTipo, setManageFilterTipo] = useState<'todos' | 'goleiro' | 'organizador'>('todos');
  const [isManageModalVisible, setIsManageModalVisible] = useState(false);
  const [manageAction, setManageAction] = useState<ManageAction | null>(null);
  const [selectedUser, setSelectedUser] = useState<any | null>(null); // Usuário selecionado para notificar/banir
  const [notificacaoMessage, setNotificacaoMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false); // Loading para modais

  // 2. Função de Refresh (agora recarrega dados para AMBAS as abas)
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } catch (error) {
      console.error("Erro durante o refresh:", error);
      Alert.alert("Erro", "Não foi possível atualizar os dados.");
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  // ----- LÓGICA DE FILTRO (MEMORIZADA) -----

  // 3. Filtros para a ABA "APROVAÇÕES"
  const filteredAprovacoesUsers = useMemo(() => {
    return getAllUsers().filter(usuario => {
      const statusNormalizado = usuario.status_aprovacao?.toLowerCase().trim() || 'pendente';
      const tipoNormalizado = usuario.tipo_usuario?.toLowerCase().trim() || '';
      
      const matchesSearch =
        usuario.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
        usuario.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus =
        filterStatus === 'todos' || statusNormalizado === filterStatus;
      
      const matchesTipo =
        filterTipo === 'todos' || tipoNormalizado === filterTipo;
      
      const notAdmin = tipoNormalizado !== 'admin';
      
      return matchesSearch && matchesStatus && matchesTipo && notAdmin;
    });
  }, [getAllUsers, searchQuery, filterStatus, filterTipo]);

  // 4. Filtros para a NOVA ABA "GERENCIAMENTO"
  const filteredManagementUsers = useMemo(() => {
    return getAllUsers().filter(usuario => {
      // Apenas usuários APROVADOS e não-admins
      if (usuario.status_aprovacao !== 'aprovado' || usuario.tipo_usuario === 'admin') {
        return false;
      }
      
      const tipoNormalizado = usuario.tipo_usuario?.toLowerCase().trim() || '';

      const matchesSearch =
        usuario.nome.toLowerCase().includes(manageSearchQuery.toLowerCase()) ||
        usuario.email.toLowerCase().includes(manageSearchQuery.toLowerCase());
      
      const matchesTipo =
        manageFilterTipo === 'todos' || tipoNormalizado === manageFilterTipo;

      return matchesSearch && matchesTipo;
    });
  }, [getAllUsers, manageSearchQuery, manageFilterTipo]);


  // ----- HANDLERS DE MODAL (APROVAÇÕES) -----
  const openAprovarModal = (userId: string, nome: string, action: 'aprovar' | 'rejeitar') => {
    setCurrentUserToProcess({ id: userId, nome: nome, action: action });
    setIsAprovarModalVisible(true);
  };

  const handleConfirmAprovarAction = async () => {
    if (!currentUserToProcess) return;
    const { id, nome, action } = currentUserToProcess;
    
    setIsSubmitting(true); // Ativa loading
    try {
      if (action === 'aprovar') {
        await aprovarUsuario(id);
        Alert.alert('Sucesso', 'Usuário aprovado com sucesso!');
      } else {
        await rejeitarUsuario(id);
        Alert.alert('Sucesso', 'Usuário rejeitado com sucesso!');
      }
    } catch (error) {
      console.error(`Erro ao ${action}:`, error);
      Alert.alert('Erro', `Não foi possível ${action} o usuário.`);
    } finally {
      setIsAprovarModalVisible(false);
      setCurrentUserToProcess(null);
      setIsSubmitting(false); // Desativa loading
    }
  };

  // ----- 5. NOVOS HANDLERS DE MODAL (GERENCIAMENTO) -----
  
  // Abre o modal de Notificação
  const openNotificarModal = (user: any) => {
    setSelectedUser(user);
    setManageAction('notificar');
    setNotificacaoMessage(''); // Limpa mensagem anterior
    setIsManageModalVisible(true);
  };

  // Abre o modal de Confirmação de Ban
  const openBanirModal = (user: any) => {
    setSelectedUser(user);
    setManageAction('banir');
    setIsManageModalVisible(true);
  };

  // Confirma a ação do modal de Gerenciamento (Notificar ou Banir)
  const handleConfirmManageAction = async () => {
    if (!selectedUser || !manageAction) return;
    
    setIsSubmitting(true); // Ativa loading

    try {
      if (manageAction === 'notificar') {
        if (notificacaoMessage.trim().length < 10) {
          Alert.alert("Erro", "A mensagem de notificação deve ter pelo menos 10 caracteres.");
          setIsSubmitting(false);
          return;
        }
        await notificarUsuario(selectedUser.id, notificacaoMessage);
        Alert.alert('Sucesso', `Usuário ${selectedUser.nome} notificado!`);
        await onRefresh(); // Atualiza a contagem de notificações
      
      } else if (manageAction === 'banir') {
        await banirUsuario(selectedUser.id);
        Alert.alert('Sucesso', `Usuário ${selectedUser.nome} foi banido.`);
        await onRefresh(); // Atualiza o status de banido
      }
    } catch (error: any) {
      console.error(`Erro ao ${manageAction}:`, error);
      Alert.alert('Erro', `Não foi possível ${manageAction} o usuário.\nMotivo: ${error.message}`);
    } finally {
      setIsManageModalVisible(false);
      setSelectedUser(null);
      setManageAction(null);
      setIsSubmitting(false); // Desativa loading
    }
  };

  // ----- FUNÇÕES DE RENDERIZAÇÃO (Helpers) -----

  // Funções de Status (sem alteração)
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
  
  // 6. Nova função para formatar datas "Há X tempo"
  const formatTimeAgo = (dateString: string | undefined) => {
    if (!dateString) return 'Nunca';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: ptBR });
    } catch (error) {
      return 'Data inválida';
    }
  };

  // ----- RENDERIZAÇÃO PRINCIPAL -----

  // Proteção de Admin (sem alteração)
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

  // Header (sem alteração)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.titleContainer}>
            {/* 7. Ícone do Header muda baseado na aba ativa */}
            {activeTab === 'aprovacoes' ? (
              <UserCheck size={28} color="#059669" />
            ) : (
              <Users size={28} color="#3b82f6" />
            )}
            <View>
              <Text style={[styles.title, activeTab === 'gerenciamento' && { color: '#3b82f6' }]}>
                {activeTab === 'aprovacoes' ? 'Aprovações' : 'Gerenciamento'}
              </Text>
              <Text style={styles.subtitle}>
                {activeTab === 'aprovacoes' ? 'Gerencie solicitações de cadastro' : 'Gerencie usuários da plataforma'}
              </Text>
            </View>
          </View>
          {/* Badge de pendentes só aparece na aba de aprovações */}
          {activeTab === 'aprovacoes' && (
            <View style={styles.statsContainer}>
              <View style={styles.statBadge}>
                <Text style={styles.statNumber}>{getUsuariosPendentes().length}</Text>
                <Text style={styles.statLabel}>Pendentes</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* 8. NOVO SELETOR DE ABAS */}
      <View style={styles.tabSwitcherContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'aprovacoes' && styles.tabButtonActive]}
          onPress={() => setActiveTab('aprovacoes')}
        >
          <UserCheck size={16} color={activeTab === 'aprovacoes' ? '#059669' : '#6b7280'} />
          <Text style={[styles.tabButtonText, activeTab === 'aprovacoes' && styles.tabButtonTextActive]}>
            Aprovações
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'gerenciamento' && styles.tabButtonActive]}
          onPress={() => setActiveTab('gerenciamento')}
        >
          <Users size={16} color={activeTab === 'gerenciamento' ? '#3b82f6' : '#6b7280'} />
          <Text style={[styles.tabButtonText, activeTab === 'gerenciamento' && styles.tabButtonTextActive]}>
            Gerenciamento
          </Text>
        </TouchableOpacity>
      </View>

      {/* 9. RENDERIZAÇÃO CONDICIONAL DA ABA "APROVAÇÕES" */}
      {activeTab === 'aprovacoes' && (
        <>
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

          <ScrollView
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#059669"]}
                tintColor={"#059669"}
              />
            }
          >
            {filteredAprovacoesUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <UserCheck size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
                <Text style={styles.emptySubtitle}>Ajuste os filtros ou puxe para atualizar</Text>
              </View>
            ) : (
              filteredAprovacoesUsers.map((usuario) => {
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
                          onPress={() => openAprovarModal(usuario.id, usuario.nome, 'rejeitar')}
                        >
                          <XCircle size={16} color="#fff" />
                          <Text style={styles.buttonText}>Rejeitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveButton}
                          onPress={() => openAprovarModal(usuario.id, usuario.nome, 'aprovar')}
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
        </>
      )}

      {/* 10. RENDERIZAÇÃO CONDICIONAL DA NOVA ABA "GERENCIAMENTO" */}
      {activeTab === 'gerenciamento' && (
        <>
          <View style={styles.filtersContainer}>
            {/* Filtro de Busca */}
            <View style={styles.searchContainer}>
              <Search size={20} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar por nome ou email..."
                value={manageSearchQuery}
                onChangeText={setManageSearchQuery}
                placeholderTextColor="#94a3b8"
              />
            </View>
            {/* Filtro de Tipo */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
              {[
                { key: 'todos', label: 'Todos Tipos', emoji: '👥' },
                { key:getTipoEmoji('goleiro'), label: 'Goleiros', emoji: '🧤' },
                { key: 'organizador', label: 'Organizadores', emoji: '👥' }
              ].map((filter) => (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.filterTab,
                    manageFilterTipo === filter.key && styles.filterTabActive
                  ]}
                  onPress={() => setManageFilterTipo(filter.key as any)}
                >
                  <Text style={styles.filterEmoji}>{filter.emoji}</Text>
                  <Text style={[
                    styles.filterTabText,
                    manageFilterTipo === filter.key && styles.filterTabTextActive
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Lista de Usuários de Gerenciamento */}
          <ScrollView
            style={styles.usersList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#3b82f6"]}
                tintColor={"#3b82f6"}
              />
            }
          >
            {filteredManagementUsers.length === 0 ? (
              <View style={styles.emptyState}>
                <Users size={64} color="#cbd5e1" />
                <Text style={styles.emptyTitle}>Nenhum usuário aprovado</Text>
                <Text style={styles.emptySubtitle}>Ajuste os filtros ou puxe para atualizar</Text>
              </View>
            ) : (
              filteredManagementUsers.map((usuario) => {
                const notificacoes = usuario.notificacoes_count || 0;
                const podeBanir = notificacoes >= 3;
                const isBanned = usuario.is_banned === true;

                return (
                  <View key={usuario.id} style={[styles.userCard, isBanned && styles.userCardBanned]}>
                    {/* Header do Card (Nome, Tipo, Avatar) */}
                    <View style={styles.userHeader}>
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{getTipoEmoji(usuario.tipo_usuario)}</Text>
                      </View>
                      <View style={styles.userInfo}>
                        <View style={styles.userNameRow}>
                          <Text style={styles.userName}>{usuario.nome}</Text>
                          {isBanned && (
                            <View style={[styles.statusBadge, { backgroundColor: '#ef444420' }]}>
                              <ShieldOff size={16} color="#ef4444" />
                              <Text style={[styles.statusText, { color: '#ef4444' }]}>
                                Banido
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.userType}>
                          {usuario.tipo_usuario.charAt(0).toUpperCase() + usuario.tipo_usuario.slice(1)}
                        </Text>
                      </View>
                    </View>

                    {/* Detalhes (Cadastro, Último Login) */}
                    <View style={styles.userDetailsGrid}>
                      <View style={styles.detailColumn}>
                        <View style={styles.detailRow}>
                          <Calendar size={14} color="#64748b" />
                          <Text style={styles.detailText}>
                            Cadastrado em: {new Date(usuario.data_cadastro).toLocaleDateString('pt-BR')}
                          </Text>
                        </View>
                        <View style={styles.detailRow}>
                          <Clock size={14} color="#64748b" />
                          <Text style={styles.detailText}>
                            Último login: {formatTimeAgo(usuario.ultimo_login)}
                          </Text>
                        </View>
                      </View>
                      
                      {/* Stats (Jogos, Convocações) */}
                      <View style={styles.detailColumn}>
                        {usuario.tipo_usuario === 'goleiro' ? (
                          <View style={styles.detailRow}>
                            <Gamepad2 size={14} color="#64748b" />
                            <Text style={styles.detailText}>
                              Jogos: {usuario.jogos_count || 0}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.detailRow}>
                            <FileText size={14} color="#64748b" />
                            <Text style={styles.detailText}>
                              Convocações: {usuario.convocacoes_count || 0}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Botões de Ação (Notificar, Banir) */}
                    {!isBanned && (
                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.notifyButton}
                          onPress={() => openNotificarModal(usuario)}
                        >
                          <Bell size={16} color="#4f46e5" />
                          <Text style={styles.notifyButtonText}>
                            Notificar ({notificacoes})
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.banButton, !podeBanir && styles.banButtonDisabled]}
                          onPress={() => openBanirModal(usuario)}
                          disabled={!podeBanir}
                        >
                          <AlertOctagon size={16} color="#fff" />
                          <Text style={styles.buttonText}>
                            {podeBanir ? 'Banir Usuário' : `Banir (${notificacoes}/3)`}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                  </View>
                );
              })
            )}
          </ScrollView>
        </>
      )}

      {/* Modal de Aprovação (sem alteração) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isAprovarModalVisible}
        onRequestClose={() => {
          setIsAprovarModalVisible(false);
          setCurrentUserToProcess(null);
        }}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>
              {currentUserToProcess?.action === 'aprovar' ? 'Aprovar Usuário' : 'Rejeitar Usuário'}
            </Text>
            <Text style={modalStyles.modalText}>
              Deseja realmente {currentUserToProcess?.action === 'aprovar' ? 'aprovar' : 'rejeitar'} <Text style={{ fontWeight: 'bold' }}>{currentUserToProcess?.nome}</Text>?
            </Text>
            <View style={modalStyles.modalActionButtons}>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.buttonCancel]}
                onPress={() => {
                  setIsAprovarModalVisible(false);
                  setCurrentUserToProcess(null);
                }}
                disabled={isSubmitting}
              >
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  currentUserToProcess?.action === 'aprovar' ? modalStyles.buttonApprove : modalStyles.buttonReject,
                  isSubmitting && { opacity: 0.7 }
                ]}
                onPress={handleConfirmAprovarAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.buttonText}>
                    {currentUserToProcess?.action === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 11. NOVOS MODAIS (Gerenciamento: Notificar e Banir) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={isManageModalVisible}
        onRequestClose={() => {
          setIsManageModalVisible(false);
          setSelectedUser(null);
          setManageAction(null);
        }}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            
            {/* Título do Modal */}
            <Text style={modalStyles.modalTitle}>
              {manageAction === 'notificar' ? 'Notificar Usuário' : 'Banir Usuário'}
            </Text>
            
            {/* Corpo do Modal */}
            {manageAction === 'notificar' ? (
              <>
                <Text style={modalStyles.modalText}>
                  Escreva uma breve mensagem de advertência para <Text style={{ fontWeight: 'bold' }}>{selectedUser?.nome}</Text>. O usuário será notificado e a contagem de advertências será incrementada.
                </Text>
                <TextInput
                  style={modalStyles.notificationInput}
                  placeholder="Ex: Conduta inadequada no chat..."
                  placeholderTextColor="#9ca3af"
                  value={notificacaoMessage}
                  onChangeText={setNotificacaoMessage}
                  multiline
                />
              </>
            ) : (
              <Text style={modalStyles.modalText}>
                Deseja realmente BANIR <Text style={{ fontWeight: 'bold' }}>{selectedUser?.nome}</Text>? 
                {'\n'}O usuário perderá o acesso ao aplicativo.
              </Text>
            )}

            {/* Botões de Ação */}
            <View style={modalStyles.modalActionButtons}>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.buttonCancel]}
                onPress={() => {
                  setIsManageModalVisible(false);
                  setSelectedUser(null);
                }}
                disabled={isSubmitting}
              >
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  manageAction === 'notificar' ? modalStyles.buttonNotify : modalStyles.buttonReject,
                  isSubmitting && { opacity: 0.7 }
                ]}
                onPress={handleConfirmManageAction}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={modalStyles.buttonText}>
                    {manageAction === 'notificar' ? 'Enviar Notificação' : 'Confirmar Banimento'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// ----- ESTILOS -----
// (Seus estilos 'modalStyles' e 'styles' originais, com novas adições)

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    width: '90%', // Aumentei um pouco
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
    lineHeight: 22, // Melhor legibilidade
  },
  // NOVO: Input para mensagem de notificação
  notificationInput: {
    width: '100%',
    height: 100,
    borderColor: '#cbd5e1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 20,
    fontSize: 14,
    color: '#1e293b',
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
  // NOVO: Estilo para botão de notificar
  buttonNotify: {
    backgroundColor: '#4f46e5',
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

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
  
  // NOVO: Estilos do Seletor de Abas
  tabSwitcherContainer: {
    flexDirection: 'row',
    backgroundColor: '#e5e7eb',
    borderRadius: 10,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
  },
  tabButtonTextActive: {
    fontWeight: '700',
    color: '#3b82f6', // Cor da aba ativa (pode ser #059669 também)
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
    backgroundColor: '#fff', // Adicionado
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
    backgroundColor: '#fff', // Adicionado
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
  // NOVO: Estilo para Card Banido
  userCardBanned: {
    backgroundColor: '#fef2f2', // Fundo vermelho claro
    borderColor: '#fca5a5',
    borderWidth: 1,
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
  // NOVO: Grid para detalhes do gerenciamento
  userDetailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopColor: '#f3f4f6',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  detailColumn: {
    flex: 1,
    gap: 4,
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
  // NOVO: Estilos dos botões de Notificar/Banir
  notifyButton: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff', // Fundo índigo claro
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
    flex: 1, // Ocupa espaço
    justifyContent: 'center', // Centraliza
  },
  notifyButtonText: {
    color: '#4f46e5', // Cor índigo
    fontWeight: '600',
  },
  banButton: {
    flexDirection: 'row',
    backgroundColor: '#dc2626', // Vermelho mais escuro para "Banir"
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    gap: 6,
    flex: 1,
    justifyContent: 'center',
  },
  banButtonDisabled: {
    backgroundColor: '#d1d5db', // Cinza quando desabilitado
  },
});