import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Button, Image, ActivityIndicator, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { User, Star, Target, Calendar, LogOut, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';

export default function PerfilTab() {
  const { user, logout, updateUser } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalExcluirVisible, setModalExcluirVisible] = useState(false);
  const [nome, setNome] = useState(user?.nome || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [cidade, setCidade] = useState(user?.cidade || 'Santa Rita do Sapucaí');
  const [estado, setEstado] = useState(user?.estado || 'MG');
  const [uploading, setUploading] = useState(false);

  if (!user) return null;

  async function salvarPerfil() {
    if (!nome.trim()) {
      Alert.alert('Erro', 'O nome não pode ser vazio.');
      return;
    }
    try {
      if (!updateUser) {
        throw new Error('updateUser não definido');
      }
      await updateUser({ nome, telefone, cidade, estado });
      Alert.alert('Sucesso', 'Perfil atualizado!');
      setModalVisible(false);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
      console.error(error);
    }
  }

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

    if (result.canceled || !result.assets || result.assets.length === 0 || !result.assets[0].uri) {
      return;
    }

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
        .upload(filePath, fileBody, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        throw uploadError;
      }
      
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      if (!publicUrl) {
        throw new Error("Não foi possível obter a URL pública da imagem.");
      }
      
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

  useEffect(() => {
    if (cidade.toLowerCase() === 'santa rita do sapucaí') {
      setEstado('MG');
    } else {
      setEstado('');
    }
  }, [cidade]);

  return (
    <>
      <ScrollView style={styles.container}>
        {/* Header com gradiente */}
        <View style={styles.headerGradient}>
          <View style={styles.headerContent}>
            <Text style={styles.title}>Meu Perfil</Text>
            <Text style={styles.subtitle}>Gerencie suas informações</Text>
          </View>
        </View>

        {/* Card de Perfil Flutuante */}
        <View style={styles.profileSection}>
          <View style={styles.profileCard}>
            {/* Avatar Central com Badge */}
            <TouchableOpacity onPress={handleSelecionarFoto} disabled={uploading} style={styles.avatarContainer}>
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

            {/* Info do Perfil */}
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.nome}</Text>
              <Text style={styles.profileRole}>
                {user.tipo_usuario.charAt(0).toUpperCase() + user.tipo_usuario.slice(1)}
              </Text>
              <View style={styles.emailContainer}>
                <Text style={styles.profileEmail}>{user.email}</Text>
              </View>
            </View>

            {/* Estatísticas em Grid */}
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

        {/* Ações Modernas */}
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

          <TouchableOpacity style={[styles.actionButton, styles.actionButtonDanger]} onPress={async () => { try { await logout(); } catch (error) { Alert.alert('❌ Erro', 'Não foi possível sair da conta. Tente novamente.'); } }}>
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
          <Text style={styles.footerText}>GoleiroON v.3.0.01</Text>
          <Text style={styles.footerSubtext}>Conectando o futebol amador</Text>
        </View>
      </ScrollView>

      {/* Modal de Edição */}
      <Modal visible={modalVisible} animationType="slide" transparent={false}>
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
              <TextInput 
                value={nome} 
                onChangeText={setNome} 
                style={styles.input} 
                placeholder="Digite seu nome"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Telefone</Text>
              <TextInput 
                value={telefone} 
                onChangeText={setTelefone} 
                style={styles.input} 
                placeholder="Digite seu telefone" 
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Estado</Text>
              <TextInput
                value={estado}
                onChangeText={setEstado}
                style={[styles.input, styles.inputDisabled]}
                editable={false}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cidade</Text>
              <TextInput
                value={cidade}
                onChangeText={setCidade}
                style={[styles.input, styles.inputDisabled]}
                placeholder="Digite sua cidade"
                autoCapitalize="words"
                editable={false}
                placeholderTextColor="#94a3b8"
              />
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={salvarPerfil}>
              <Text style={styles.saveButtonText}>Salvar Alterações</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.deleteButton} onPress={() => setModalExcluirVisible(true)}>
              <Text style={styles.deleteButtonText}>Deletar Conta</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Modal de Confirmação */}
      <Modal visible={modalExcluirVisible} animationType="fade" transparent>
        <View style={styles.overlayModal}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIcon}>
              <Text style={styles.confirmIconText}>⚠️</Text>
            </View>
            <Text style={styles.confirmTitle}>Excluir Conta</Text>
            <Text style={styles.confirmMessage}>
              Tem certeza que deseja excluir sua conta? Esta ação não pode ser desfeita.
            </Text>
            <View style={styles.confirmButtons}>
              <TouchableOpacity style={styles.confirmButtonCancel} onPress={() => setModalExcluirVisible(false)}>
                <Text style={styles.confirmButtonCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmButtonDelete} onPress={() => setModalExcluirVisible(false)}>
                <Text style={styles.confirmButtonDeleteText}>Excluir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8FAFC' 
  },
  headerGradient: { 
    backgroundColor: '#10B981',
    paddingTop: 60,
    paddingBottom: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: { 
    paddingHorizontal: 24 
  },
  title: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#FFFFFF',
    marginBottom: 6,
    letterSpacing: -0.5
  },
  subtitle: { 
    fontSize: 16, 
    color: '#ECFDF5',
    fontWeight: '500'
  },
  profileSection: { 
    marginTop: -50,
    paddingHorizontal: 20
  },
  profileCard: { 
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 10,
    alignItems: 'center'
  },
  avatarContainer: { 
    marginBottom: 20,
    alignItems: 'center'
  },
  avatarWrapper: { 
    width: 100, 
    height: 100,
    borderRadius: 50,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 6
  },
  avatarImage: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 50 
  },
  avatarPlaceholder: { 
    width: '100%', 
    height: '100%', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cameraButton: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#10B981',
    borderRadius: 16,
    padding: 8,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4
  },
  typeBadge: {
    marginTop: -12,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  badgeEmoji: { 
    fontSize: 20 
  },
  profileInfo: { 
    alignItems: 'center',
    marginBottom: 24
  },
  profileName: { 
    fontSize: 26, 
    fontWeight: '700', 
    color: '#0F172A',
    marginBottom: 6,
    letterSpacing: -0.5
  },
  profileRole: { 
    fontSize: 15, 
    color: '#10B981',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8
  },
  emailContainer: { 
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12
  },
  profileEmail: { 
    fontSize: 14, 
    color: '#64748B',
    fontWeight: '500'
  },
  statsGrid: { 
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    gap: 12
  },
  statCard: { 
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0'
  },
  statIconContainer: { 
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  statValue: { 
    fontSize: 20, 
    fontWeight: '700', 
    color: '#0F172A',
    marginBottom: 4
  },
  statLabel: { 
    fontSize: 12, 
    color: '#64748B',
    fontWeight: '600',
    textAlign: 'center'
  },
  actionsSection: { 
    marginTop: 20,
    marginHorizontal: 20,
    marginBottom: 20
  },
  actionButton: { 
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  actionButtonDanger: { 
    borderColor: '#FEE2E2' 
  },
  actionIconBg: { 
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14
  },
  actionContent: { 
    flex: 1 
  },
  actionTitle: { 
    fontSize: 16, 
    fontWeight: '600', 
    color: '#0F172A',
    marginBottom: 2
  },
  actionDescription: { 
    fontSize: 13, 
    color: '#94A3B8' 
  },
  actionArrow: { 
    fontSize: 28, 
    color: '#CBD5E1',
    fontWeight: '300'
  },
  footer: { 
    alignItems: 'center',
    paddingVertical: 30,
    paddingHorizontal: 20
  },
  footerText: { 
    fontSize: 14, 
    color: '#0F172A',
    fontWeight: '600',
    marginBottom: 4
  },
  footerSubtext: { 
    fontSize: 12, 
    color: '#94A3B8' 
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: '#FFFFFF' 
  },
  modalHeader: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9'
  },
  modalTitle: { 
    fontSize: 24, 
    fontWeight: '700', 
    color: '#0F172A' 
  },
  modalClose: { 
    fontSize: 28, 
    color: '#94A3B8',
    fontWeight: '300'
  },
  modalContent: { 
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24
  },
  inputGroup: { 
    marginBottom: 20 
  },
  inputLabel: { 
    fontSize: 14, 
    fontWeight: '600', 
    color: '#475569',
    marginBottom: 8,
    letterSpacing: 0.3
  },
  input: { 
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF'
  },
  inputDisabled: { 
    backgroundColor: '#F8FAFC',
    color: '#94A3B8'
  },
  saveButton: { 
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  saveButtonText: { 
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  cancelButton: { 
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12
  },
  cancelButtonText: { 
    color: '#64748B',
    fontSize: 16,
    fontWeight: '600'
  },
  deleteButton: { 
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  deleteButtonText: { 
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700'
  },
  overlayModal: { 
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  confirmCard: { 
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12
  },
  confirmIcon: { 
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  confirmIconText: { 
    fontSize: 32 
  },
  confirmTitle: { 
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
    textAlign: 'center'
  },
  confirmMessage: { 
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28
  },
  confirmButtons: { 
    flexDirection: 'row',
    gap: 12,
    width: '100%'
  },
  confirmButtonCancel: { 
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center'
  },
  confirmButtonCancelText: { 
    color: '#475569',
    fontSize: 15,
    fontWeight: '600'
  },
  confirmButtonDelete: { 
    flex: 1,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  confirmButtonDeleteText: { 
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700'
  },
});