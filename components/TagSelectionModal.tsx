// components/TagSelectionModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Tag } from 'lucide-react-native'; // Importe o ícone de tag

// Definição das propriedades que o componente TagSelectionModal irá receber
interface TagSelectionModalProps {
  isVisible: boolean; // Controla se o modal está visível ou não
  onClose: () => void; // Função para fechar o modal
  onSelectTag: (tagName: string) => void; // Função a ser chamada quando uma tag for selecionada
  title: string; // Título do modal (ex: "Avaliar Organizador")
  message: string; // Mensagem de instrução (ex: "Escolha uma tag:")
  // Opções de tags, com emoji e nome da categoria
  options: { emoji: string; nome_categoria: string }[];
}

// Cores usadas no estilo do modal (podem ser importadas de um arquivo de estilos global se você tiver um)
const colors = {
  blue500: '#3B82F6', // Cor para os botões de tag
  white: '#FFFFFF',
  gray700: '#374151', // Cor para o título
  gray500: '#6B7280', // Cor para a mensagem
  gray200: '#E5E7EB', // Cor para o botão de cancelar
};

// Componente principal do Modal de Seleção de Tag
export default function TagSelectionModal({ isVisible, onClose, onSelectTag, title, message, options }: TagSelectionModalProps) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>{title}</Text>
          <Text style={modalStyles.modalMessage}>{message}</Text>

          {/* Container para as opções de tags */}
          <View style={modalStyles.tagOptionsContainer}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.nome_categoria} // Chave única para cada tag
                style={modalStyles.tagButton}
                onPress={() => onSelectTag(opt.nome_categoria)} // Chama a função onSelectTag com o nome da tag
              >
                {/* Emoji e nome da categoria da tag */}
                <Text style={modalStyles.tagButtonText}>{opt.emoji} {opt.nome_categoria}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Botão de Cancelar */}
          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// Estilos específicos para o modal de tags (baseados nos estilos do RatingModal, mas adaptados)
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalView: {
    margin: 20,
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 25,
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
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray700,
    marginBottom: 10,
  },
  modalMessage: {
    fontSize: 16,
    color: colors.gray500,
    marginBottom: 20,
    textAlign: 'center',
  },
  tagOptionsContainer: {
    width: '100%',
    gap: 10,
  },
  tagButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue500, // Use a mesma cor ou uma diferente para diferenciar
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  tagButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: colors.gray200,
  },
  cancelButtonText: {
    color: colors.gray700,
    fontSize: 16,
    fontWeight: '600',
  },
});