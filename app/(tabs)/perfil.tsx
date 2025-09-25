import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput, Button, Image, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { User, Star, Target, Calendar, LogOut, Camera } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker'; // Importa a biblioteca de imagens
import { supabase } from '@/lib/supabase'; // Importa o supabase para o upload

export default function PerfilTab() {
  const { user, logout, updateUser } = useAuth();

  const [modalVisible, setModalVisible] = useState(false);
  const [modalExcluirVisible, setModalExcluirVisible] = useState(false);
  const [nome, setNome] = useState(user?.nome || '');
  const [telefone, setTelefone] = useState(user?.telefone || '');
  const [uploading, setUploading] = useState(false); // Estado para controlar o loading do upload

  if (!user) return null;

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

  // Função completa para selecionar, validar e fazer upload da foto
  async function handleSelecionarFoto() {
    // ✅ PASSO IMPORTANTE: PEDIR PERMISSÃO PARA ACESSAR A GALERIA
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos da sua permissão para acessar a galeria de fotos.');
      return;
    }

    // Abrir a galeria de imagens
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, // Permite que o usuário recorte a imagem
      aspect: [1, 1],      // Força um recorte quadrado
      quality: 0.7,        // Comprime a imagem para um upload mais rápido
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return; // Usuário cancelou a seleção
    }

    const image = result.assets[0];
    const fileExt = image.uri.split('.').pop();
    const fileName = `${user.id}.${fileExt}`; // Nomeia o arquivo com o ID do usuário para fácil associação
    const filePath = `${fileName}`;

    setUploading(true);

    try {
      // Converte a imagem para um formato que o Supabase entende (Blob)
      const response = await fetch(image.uri);
      const blob = await response.blob();
      
      const { error: uploadError } = await supabase.storage
        .from('avatars') // Nome do bucket que você criou no Supabase
        .upload(filePath, blob, {
          upsert: true, // Sobrescreve a imagem se já existir uma com o mesmo nome
        });

      if (uploadError) {
        throw uploadError;
      }
      
      // Pega a URL pública da imagem que acabamos de enviar
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      const publicUrl = data.publicUrl;

      if (!publicUrl) {
          throw new Error("Não foi possível obter a URL pública da imagem.");
      }
      
      // Atualiza a coluna 'foto_url' na tabela 'usuarios'
      if (updateUser) {
        await updateUser({ foto_url: publicUrl });
        Alert.alert('Sucesso!', 'Sua foto de perfil foi atualizada.');
      }

    } catch (error: any) {
      console.error('Erro no upload da imagem:', error);
      Alert.alert('Erro', error.message || 'Não foi possível enviar sua foto.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>👤 Meu Perfil</Text>
          <Text style={styles.subtitle}>Suas informações e estatísticas</Text>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <TouchableOpacity onPress={handleSelecionarFoto} disabled={uploading} style={styles.avatar}>
              {uploading ? (
                <ActivityIndicator size="large" color="#10B981" />
              ) : user.foto_url ? (
                <Image source={{ uri: user.foto_url }} style={styles.avatarImage} />
              ) : (
                <User size={32} color="#10B981" />
              )}
              {!uploading && (
                  <View style={styles.cameraIconContainer}>
                      <Camera size={14} color="#fff" />
                  </View>
              )}
            </TouchableOpacity>
            
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.nome}</Text>
              <Text style={styles.profileType}>
                {user.tipo_usuario === 'goleiro' ? '🧤' : user.tipo_usuario === 'organizador' ? '👥' : '⚙️'}
                {user.tipo_usuario.charAt(0).toUpperCase() + user.tipo_usuario.slice(1)}
              </Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Target size={16} color="#10B981" />
              <Text style={styles.statValue}>{user.jogos_realizados || 0}</Text>
              <Text style={styles.statLabel}>Jogos</Text>
            </View>
            {user.tipo_usuario === 'goleiro' && (
              <View style={styles.statItem}>
                <Star size={16} color="#F59E0B" />
                <Text style={styles.statValue}>{user.nota_media ? Number(user.nota_media).toFixed(1) : '0.0'}</Text>
                <Text style={styles.statLabel}>Nota Média</Text>
              </View>
            )}
            <View style={styles.statItem}>
              <Calendar size={16} color="#3B82F6" />
              <Text style={styles.statValue}>{new Date(user.data_cadastro).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</Text>
              <Text style={styles.statLabel}>Desde</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionItem} onPress={() => setModalVisible(true)}>
            <User size={20} color="#6b7280" />
            <Text style={styles.actionText}>Editar Perfil</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionItem} onPress={async () => { try { await logout(); } catch (error) { Alert.alert('❌ Erro', 'Não foi possível sair da conta. Tente novamente.'); } }}>
            <LogOut size={20} color="#ef4444" />
            <Text style={[styles.actionText, { color: '#ef4444' }]}>Sair</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>GoleiroON v.2.09.06 - Conectando o futebol amador</Text>
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent={false}>
        <View style={{ flex: 1, padding: 20, backgroundColor: '#fff' }}>
          <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 20 }}>Editar Perfil</Text>
          <Text style={{ marginBottom: 6 }}>Nome</Text>
          <TextInput value={nome} onChangeText={setNome} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 16, fontSize: 16 }} placeholder="Digite seu nome" />
          <Text style={{ marginBottom: 6 }}>Telefone</Text>
          <TextInput value={telefone} onChangeText={setTelefone} style={{ borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 10, marginBottom: 16, fontSize: 16 }} placeholder="Digite seu telefone" keyboardType="phone-pad" />
          <Button title="Salvar" onPress={salvarPerfil} />
          <View style={{ marginTop: 10 }}><Button title="Cancelar" onPress={() => setModalVisible(false)} color="#ef4444" /></View>
          <View style={{ marginTop: 20 }}><Button title="Deletar Conta" color="#ef4444" onPress={() => setModalExcluirVisible(true)} /></View>
        </View>
      </Modal>

      <Modal visible={modalExcluirVisible} animationType="fade" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}><View style={{ width: 300, backgroundColor: '#fff', borderRadius: 12, padding: 20 }}><Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 16 }}>Tem certeza que deseja excluir sua conta?</Text><View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}><Button title="Não" onPress={() => setModalExcluirVisible(false)} /><Button title="Sim, desejo excluir" color="#ef4444" onPress={() => setModalExcluirVisible(false)} /></View></View></View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffffff' },
  header: { paddingVertical: 24, paddingHorizontal: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 28, fontWeight: '700', color: '#0f172a', marginBottom: 6 },
  subtitle: { fontSize: 15, color: '#000000ff', letterSpacing: 0.3 },
  profileCard: { backgroundColor: '#fff', margin: 20, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 16, elevation: 8, borderWidth: 1, borderColor: '#f1f5f9' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatar: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#ecfdf5', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#a7f3d0' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 36 },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#10B981',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#0f172a' },
  profileType: { fontSize: 16, color: '#059669', marginTop: 2, fontWeight: '600' },
  profileEmail: { fontSize: 14, color: '#64748b', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 20, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  actionsCard: { backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 16, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 5, borderWidth: 1, borderColor: '#f1f5f9' },
  actionItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  actionText: { fontSize: 17, color: '#0f172a', fontWeight: '500' },
  footer: { alignItems: 'center', padding: 20 },
  footerText: { fontSize: 13, color: '#000000ff', textAlign: 'center', fontWeight: '500' },
});