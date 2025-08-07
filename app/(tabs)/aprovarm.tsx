// app/aprovarm.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
} from 'react-native';
import { useApp } from '@/contexts/AppContext';

interface SaqueToProcess {
  id: string;
  nome_goleiro: string;
  action: 'aprovar' | 'rejeitar';
}

export default function Aprovam() {
  const { getSaquesPendentes, aprovarSaque, rejeitarSaque } = useApp();

  const saquesPendentes = getSaquesPendentes();

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [currentSaqueToProcess, setCurrentSaqueToProcess] = useState<SaqueToProcess | null>(null);

  const openConfirmationModal = (id: string, nome_goleiro: string, action: 'aprovar' | 'rejeitar') => {
    setCurrentSaqueToProcess({ id, nome_goleiro, action });
    setIsModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!currentSaqueToProcess) return;

    const { id, nome_goleiro, action } = currentSaqueToProcess;

    try {
      if (action === 'aprovar') {
        await aprovarSaque(id);
        Alert.alert('Sucesso', `Saque de ${nome_goleiro} aprovado com sucesso.`);
      } else {
        await rejeitarSaque(id);
        Alert.alert('Sucesso', `Saque de ${nome_goleiro} rejeitado com sucesso.`);
      }
    } catch (error) {
      Alert.alert('Erro', `Erro ao ${action} saque.`);
    } finally {
      setIsModalVisible(false);
      setCurrentSaqueToProcess(null);
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <Text style={styles.title}>{item.nome_goleiro}</Text>
      <Text>Coins: {item.valor_coins}</Text>
      <Text>R$: {item.valor_reais.toFixed(2)}</Text>
      <Text>PIX: {item.chave_pix}</Text>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.button, styles.reject]}
          onPress={() => openConfirmationModal(item.id, item.nome_goleiro, 'rejeitar')}
        >
          <Text style={styles.buttonText}>Rejeitar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.approve]}
          onPress={() => openConfirmationModal(item.id, item.nome_goleiro, 'aprovar')}
        >
          <Text style={styles.buttonText}>Aprovar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Saques Pendentes</Text>

      <FlatList
        data={saquesPendentes}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>Nenhum saque pendente.</Text>}
      />

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

// Estilos do modal
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

// Estilos gerais da página
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
