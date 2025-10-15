// app/aprovam.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  RefreshControl, // ✅ A importação do RefreshControl já está aqui.
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { saquePixService } from '@/services/saquePixService';
import { SaquePix } from '@/types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SaqueToProcess {
  id: string;
  nome_goleiro: string;
  action: 'aprovar' | 'rejeitar';
}

export default function Aprovam() {
  const { user } = useAuth();

  const [saquesPendentes, setSaquesPendentes] = useState<SaquePix[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ 1. ESTADO DO REFRESH: Esta variável controla a animação de "puxar para atualizar". Você já criou ela corretamente.
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSaqueToProcess, setCurrentSaqueToProcess] = useState<SaqueToProcess | null>(null);

  const fetchSaquesPendentes = useCallback(async () => {
    // Apenas para o carregamento inicial, não o refresh
    if (!isRefreshing) setIsLoading(true);
    
    try {
      const allSaques = await saquePixService.loadSaques();
      const pendentes = saquePixService.getSaquesPendentes(allSaques);
      setSaquesPendentes(pendentes);
    } catch (error) {
      console.error('Erro ao buscar saques pendentes:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de saques.');
    } finally {
      if (!isRefreshing) setIsLoading(false);
    }
  }, [isRefreshing]); // A dependência aqui está correta para diferenciar os loadings

  useEffect(() => {
    if (user?.tipo_usuario === 'admin') {
      fetchSaquesPendentes();
    } else {
      setIsLoading(false);
    }
  }, [user, fetchSaquesPendentes]);

  // ✅ 2. FUNÇÃO ONREFRESH: Esta é a função que é chamada quando o usuário puxa a tela. Sua implementação está perfeita.
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true); // Liga o indicador de loading
    await fetchSaquesPendentes(); // Busca os dados mais recentes
    setIsRefreshing(false); // Desliga o indicador de loading
  }, [fetchSaquesPendentes]);

  // O resto da sua lógica continua exatamente igual
  const openConfirmationModal = (id: string, nome_goleiro: string, action: 'aprovar' | 'rejeitar') => {
    setCurrentSaqueToProcess({ id, nome_goleiro, action });
    setIsModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!currentSaqueToProcess) return;

    const { id, nome_goleiro, action } = currentSaqueToProcess;

    try {
      if (action === 'aprovar') {
        await saquePixService.aprovarSaque(id);
      } else {
        await saquePixService.rejeitarSaque(id);
      }
      await fetchSaquesPendentes();
    } catch (error: any) {
      Alert.alert('Erro', error.message || `Erro ao ${action} saque.`);
    } finally {
      setIsModalVisible(false);
      setCurrentSaqueToProcess(null);
    }
  };

  if (user?.tipo_usuario !== 'admin') {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Acesso negado. Você não tem permissão para visualizar esta tela.</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.goleiro?.nome}</Text>
      <Text>Coins: {item.valor_coins}</Text>
      <Text>R$: {item.valor_reais.toFixed(2)}</Text>
      <Text>PIX: {item.chave_pix}</Text>
      <Text style={styles.dateText}>Data: {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.reject]}
          onPress={() => openConfirmationModal(item.id, item.goleiro?.nome, 'rejeitar')}
        >
          <Text style={styles.buttonText}>Rejeitar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approve]}
          onPress={() => openConfirmationModal(item.id, item.goleiro?.nome, 'aprovar')}
        >
          <Text style={styles.buttonText}>Aprovar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Saques Pendentes</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#059669" style={{ marginTop: 20 }} />
      ) : (
        // ✅ 3. INTEGRAÇÃO: A propriedade 'refreshControl' na FlatList conecta tudo. Está perfeito!
        <FlatList
          data={saquesPendentes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.empty}>Nenhum saque pendente.</Text>}
          refreshControl={
            <RefreshControl 
                refreshing={isRefreshing} 
                onRefresh={onRefresh} 
                colors={["#059669"]}
                tintColor={"#059669"}
            />
          }
        />
      )}

      <Modal
        animationType="fade"
        transparent
        visible={isModalVisible}
        onRequestClose={() => {
          setIsModalVisible(false);
          setCurrentSaqueToProcess(null);
        }}
      >
        <View style={modalStyles.centeredView}>
          <View style={modalStyles.modalView}>
            <Text style={modalStyles.modalTitle}>
              {currentSaqueToProcess?.action === 'aprovar' ? 'Aprovar Saque' : 'Rejeitar Saque'}
            </Text>
            <Text style={modalStyles.modalText}>
              Deseja realmente {currentSaqueToProcess?.action === 'aprovar' ? 'aprovar' : 'rejeitar'} o saque de{' '}
              <Text style={{ fontWeight: 'bold' }}>{currentSaqueToProcess?.nome_goleiro}</Text>?
            </Text>
            <View style={modalStyles.modalActionButtons}>
              <TouchableOpacity
                style={[modalStyles.modalButton, modalStyles.buttonCancel]}
                onPress={() => {
                  setIsModalVisible(false);
                  setCurrentSaqueToProcess(null);
                }}
              >
                <Text style={modalStyles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  modalStyles.modalButton,
                  currentSaqueToProcess?.action === 'aprovar' ? modalStyles.buttonApprove : modalStyles.buttonReject,
                ]}
                onPress={handleConfirmAction}
              >
                <Text style={modalStyles.buttonText}>
                  {currentSaqueToProcess?.action === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Seus estilos (sem alterações)
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
    padding: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#0f172a',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    color: '#475569',
  },
  modalActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  buttonCancel: {
    backgroundColor: '#6b7280',
  },
  buttonApprove: {
    backgroundColor: '#10b981',
  },
  buttonReject: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  approve: {
    backgroundColor: '#10b981',
  },
  reject: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  empty: {
    marginTop: 30,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 16,
  },
});