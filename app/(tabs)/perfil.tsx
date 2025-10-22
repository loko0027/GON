import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Image, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { User, Star, Target, Calendar, LogOut, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export default function PerfilTab() {
  const { user, logout, updateUser } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [avatarMenuVisible, setAvatarMenuVisible] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [nome, setNome] = useState(user?.nome || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [cidade, setCidade] = useState('');
  const [estado, setEstado] = useState('');

  if (!user) return null;

  // ==================== BUSCA CIDADE E ESTADO ====================
  useEffect(() => {
    async function fetchUserLocation() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('usuarios')
        .select('cidade, estado')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erro ao buscar cidade e estado:', error);
        return;
      }

      if (data) {
        setCidade(data.cidade || '');
        setEstado(data.estado || '');
      }
    }

    fetchUserLocation();
  }, [user?.id]);

  // ==================== SALVAR PERFIL ====================
  async function salvarPerfil() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome não pode ser vazio.');
      return;
    }

    try {
      if (!updateUser) throw new Error('updateUser não definido');

      await updateUser({ nome, telefone });

      Alert.alert('Sucesso', 'Perfil atualizado!');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
      console.error(error);
    }
  }

  // ==================== SELECIONAR FOTO ====================
  async function handleSelecionarFoto() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos da sua permissão para acessar a galeria de fotos.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled || !result.assets || result.assets.length === 0 || !result.assets[0].uri) return;

    const image = result.assets[0];
    const fileExt = image.uri.split('.').pop()?.toLowerCase();
    if (!fileExt) {
      Alert.alert('Erro', 'Formato de arquivo inválido.');
      return;
    }

    const fileName = `${user.id}.${fileExt}`;
    const filePath = `${fileName}`;

    setUploading(true);

    try {
      let fileBody;
      let contentType = image.mimeType || `image/${fileExt}`;

      if (Platform.OS === 'web') {
        const response = await fetch(image.uri);
        fileBody = await response.blob();
      } else {
        const fileData = await FileSystem.readAsStringAsync(image.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        fileBody = decode(fileData);
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBody, { contentType, upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      if (!publicUrl) throw new Error("Não foi possível obter a URL pública da imagem.");

      if (updateUser) {
        await updateUser({ foto_url: publicUrl });
        Alert.alert('Sucesso!', 'Sua foto de perfil foi atualizada.');
      }

    } catch (error: any) {
      console.error('Erro no upload da imagem:', error);
      Alert.alert('Erro', error.message || 'Não foi possível enviar sua foto. Por favor, tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header */}
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Meu Perfil</Text>
            <Text style={styles.subtitle}>Gerencie suas informações</Text>
          </View>
        </View>

        {/* Card de Perfil */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            <TouchableOpacity onPress={() => setAvatarMenuVisible(true)} disabled={uploading} style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                {uploading ? (
                  <ActivityIndicator size="large" color="#10B981" />
                ) : user.foto_url ? (
                  <Image source={{ uri: user.foto_url }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={48} color="#10B981" />
                  </View>
                )}
                {!uploading && (
                  <View style={styles.cameraButton}>
                    <Camera size={16} color="#fff" />
                  </View>
                )}
              </View>
              <View style={styles.typeBadge}>
                <Text style={styles.badgeEmoji}>
                  {user.tipo_usuario === 'goleiro' ? '🧤' : user.tipo_usuario === 'organizador' ? '👥' : '⚙️'}
                </Text>
              </View>
            </TouchableOpacity>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.nome}</Text>
              <Text style={styles.profileRole}>{user.tipo_usuario.charAt(0).toUpperCase() + user.tipo_usuario.slice(1)}</Text>
              <View style={styles.emailContainer}>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>

            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={styles.statIconContainer}>
                  <Target size={20} color="#10B981" />
                </View>
                <Text style={styles.statValue}>{user.jogos_realizados || 0}</Text>
                <Text style={styles.statLabel}>Jogos</Text>
              </View>

              {user.tipo_usuario === 'goleiro' && (
                <View style={styles.statCard}>
                  <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
                    <Star size={20} color="#F59E0B" />
                  </View>
                  <Text style={styles.statValue}>{user.nota_media ? Number(user.nota_media).toFixed(1) : '0.0'}</Text>
                  <Text style={styles.statLabel}>Avaliação</Text>
                </View>
              )}

              <View style={styles.statCard}>
                <View style={[styles.statIconContainer, { backgroundColor: '#DBEAFE' }]}>
                  <Calendar size={20} color="#3B82F6" />
                </View>
                <Text style={styles.statValue}>{new Date(user.data_cadastro).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</Text>
                <Text style={styles.statLabel}>Membro desde</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Ações */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={() => setModalVisible(true)}>
            <View style={styles.actionIconBg}>
              <User size={22} color="#10B981" />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Editar Perfil</Text>
              <Text style={styles.actionDescription}>Atualize suas informações</Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonDanger]}
            onPress={async () => { try { await logout(); } catch (error) { Alert.alert('❌ Erro', 'Não foi possível sair da conta. Tente novamente.'); } }}
          >
            <View style={[styles.actionIconBg, { backgroundColor: '#FEE2E2' }]}>
              <LogOut size={22} color="#EF4444" />
            </View>
            <View style={styles.actionContent}>
              <Text style={[styles.actionTitle, { color: '#EF4444' }]}>Sair da Conta</Text>
              <Text style={styles.actionDescription}>Desconectar do aplicativo</Text>
            </View>
            <Text style={[styles.actionArrow, { color: '#EF4444' }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>GoleiroON v.5.0.22</Text>
          <Text style={styles.footerSubtext}>Conectando o futebol amador</Text>
        </View>
      </ScrollView>

      {/* Modais */}
      {/* Avatar Modal */}
      <Modal visible={avatarMenuVisible} animationType="fade" transparent onRequestClose={() => setAvatarMenuVisible(false)}>
        <TouchableOpacity style={styles.overlayModal} activeOpacity={1} onPressOut={() => setAvatarMenuVisible(false)}>
          <View style={styles.avatarMenu}>
            <TouchableOpacity
              style={styles.avatarMenuButton}
              onPress={() => { setAvatarMenuVisible(false); handleSelecionarFoto(); }}
            >
              <Text style={styles.avatarMenuText}>Carregar Foto</Text>
            </TouchableOpacity>

            {user.foto_url && (
              <TouchableOpacity
                style={styles.avatarMenuButton}
                onPress={async () => {
                  setAvatarMenuVisible(false);
                  try {
                    await supabase.storage.from('avatars').remove([`${user.id}.jpg`]);
                    if (updateUser) await updateUser({ foto_url: null });
                    Alert.alert('Sucesso', 'Foto removida!');
                  } catch (error) {
                    Alert.alert('Erro', 'Não foi possível remover a foto.');
                  }
                }}
              >
                <Text style={[styles.avatarMenuText, { color: '#EF4444' }]}>Remover Foto</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={modalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Editar Perfil</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nome Completo</Text>
              <TextInput value={nome} onChangeText={setNome} style={styles.input} placeholder="Digite seu nome" placeholderTextColor="#94a3b8" />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefone</Text>
              <TextInput value={telefone} onChangeText={setTelefone} style={styles.input} placeholder="Digite seu telefone" keyboardType="phone-pad" placeholderTextColor="#94a3b8" />
            </View>

            {/* Campos Somente Leitura */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cidade</Text>
              <Text style={[styles.input, { backgroundColor: '#F1F5F9' }]}>{cidade}</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estado</Text>
              <Text style={[styles.input, { backgroundColor: '#F1F5F9' }]}>{estado}</Text>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={salvarPerfil}>
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>

            {/* Botão Excluir Conta */}
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: '#EF4444' }]}
              onPress={() => { // Removido o async daqui
                Alert.alert(
                  'Confirmação',
                  'Tem certeza que deseja excluir sua conta? Essa ação não pode ser desfeita.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    {
                      text: 'Excluir',
                      style: 'destructive',
                      onPress: async () => {
                        // =================== ÚNICA ALTERAÇÃO FEITA AQUI ===================
                        try {
                          // 1️⃣ Chama a função RPC 'delete_user' no servidor
                          const { error } = await supabase.rpc('delete_user');

                          if (error) {
                            throw error; // Lança o erro se a chamada RPC falhar
                          }

                          // 2️⃣ Ações de sucesso após a exclusão
                          setModalVisible(false); // Fecha o modal
                          Alert.alert('Conta excluída', 'Sua conta foi removida com sucesso.');
                          await logout(); // Desloga o usuário do app

                        } catch (error: any) {
                          console.error('Erro ao excluir conta:', error);
                          Alert.alert('Erro', 'Não foi possível excluir sua conta. Tente novamente.');
                        }
                        // ====================================================================
                      }
                    }
                  ]
                );
              }}
            >
              <Text style={[styles.saveButtonText, { color: '#fff' }]}>Excluir Conta</Text>
            </TouchableOpacity>

          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

// ==================== STYLES ====================
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  headerGradient: { backgroundColor: '#8b5cf6', paddingTop: 60, paddingBottom: 80, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  headerContent: { paddingHorizontal: 24 },
  title: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 16, color: '#ECFDF5', fontWeight: '500' },
  profileSection: { marginTop: -50, paddingHorizontal: 20 },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 28, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 10, alignItems: 'center' },
  avatarContainer: { marginBottom: 20, alignItems: 'center' },
  avatarWrapper: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#F0FDF4', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FFFFFF' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 50 },
  avatarPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  cameraButton: { position: 'absolute', bottom: 2, right: 2, backgroundColor: '#10B981', borderRadius: 16, padding: 8, borderWidth: 3, borderColor: '#FFFFFF' },
  typeBadge: { marginTop: -12, backgroundColor: '#FFFFFF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 2, borderColor: '#E5E7EB' },
  badgeEmoji: { fontSize: 20 },
  profileInfo: { alignItems: 'center', marginBottom: 24 },
  profileName: { fontSize: 26, fontWeight: '700', color: '#0F172A', marginBottom: 6, letterSpacing: -0.5 },
  profileRole: { fontSize: 15, color: '#10B981', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  emailContainer: { backgroundColor: '#F1F5F9', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12 },
  profileEmail: { fontSize: 14, color: '#64748B', fontWeight: '500' },
  statsGrid: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#F8FAFC', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0' },
  statIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D1FAE5', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  statLabel: { fontSize: 12, color: '#64748B' },
  actionsSection: { paddingHorizontal: 20, marginTop: 24 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 16, marginBottom: 12 },
  actionButtonDanger: { backgroundColor: '#fff' },
  actionIconBg: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#DCFCE7', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  actionContent: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  actionDescription: { fontSize: 12, color: '#64748B' },
  actionArrow: { fontSize: 24, color: '#94A3B8' },
  footer: { alignItems: 'center', marginVertical: 24 },
  footerText: { fontSize: 12, color: '#94A3B8', fontWeight: '500' },
  footerSubtext: { fontSize: 12, color: '#94A3B8' },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC', paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 24, fontWeight: '700' },
  modalClose: { fontSize: 24, fontWeight: '700', color: '#64748B' },
  modalContent: { paddingHorizontal: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: { backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', color: '#0F172A' },
  saveButton: { backgroundColor: '#10B981', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  overlayModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  avatarMenu: { backgroundColor: '#fff', borderRadius: 12, width: 220, paddingVertical: 16 },
  avatarMenuButton: { paddingVertical: 12, paddingHorizontal: 16 },
  avatarMenuText: { fontSize: 16 },
});