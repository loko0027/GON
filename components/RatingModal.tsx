// components/RatingModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native'; // Importe o ícone de estrela

// Definição das propriedades que o componente RatingModal irá receber
interface RatingModalProps {
  isVisible: boolean; // Controla se o modal está visível ou não
  onClose: () => void; // Função para fechar o modal
  onRate: (nota: number) => void; // Função a ser chamada quando uma nota for selecionada
  title: string; // Título do modal (ex: "Avaliar Goleiro")
  message: string; // Mensagem de instrução (ex: "Escolha uma nota:")
  // Opções de avaliação, cada uma com uma nota e a quantidade de coins
  options: { nota: number; coins: number }[];
}

// Cores usadas no estilo do modal (podem ser importadas de um arquivo de estilos global se você tiver um)
const colors = {
  blue500: '#3B82F6', // Cor para os botões de avaliação
  white: '#FFFFFF',
  gray700: '#374151', // Cor para o título
  gray500: '#6B7280', // Cor para a mensagem
  gray200: '#E5E7EB', // Cor para o botão de cancelar
};

// Componente principal do Modal de Avaliação
export default function RatingModal({ isVisible, onClose, onRate, title, message, options }: RatingModalProps) {
  return (
    <Modal
      animationType="fade" // Efeito de transição do modal (fade-in/fade-out)
      transparent={true}   // Torna o fundo do modal transparente (permite ver o conteúdo por trás)
      visible={isVisible}  // Controla a visibilidade com base na prop isVisible
      onRequestClose={onClose} // Função chamada quando o usuário tenta fechar o modal (ex: botão voltar do Android)
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <Text style={modalStyles.modalTitle}>{title}</Text>
          <Text style={modalStyles.modalMessage}>{message}</Text>

          {/* Container para as opções de avaliação (estrelas) */}
          <View style={modalStyles.ratingOptionsContainer}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.nota} // Chave única para cada item na lista
                style={modalStyles.ratingButton}
                onPress={() => onRate(opt.nota)} // Chama a função onRate com a nota selecionada
              >
                {/* Ícone de estrela */}
                <Star size={20} color={colors.white} fill={colors.white} />
                {/* Texto da opção de avaliação (ex: "1 ⭐ (25 coins)") */}
                <Text style={modalStyles.ratingButtonText}>{opt.nota} ⭐ ({opt.coins} coins)</Text>
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

// Estilos específicos para o modal
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center', // Centraliza o conteúdo verticalmente
    alignItems: 'center',     // Centraliza o conteúdo horizontalmente
    backgroundColor: 'rgba(0,0,0,0.5)', // Fundo semitransparente para dar efeito de sobreposição
  },
  modalView: {
    margin: 20, // Margem em volta do conteúdo do modal
    backgroundColor: colors.white,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000', // Sombra para dar profundidade
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5, // Sombra para Android
    width: '80%', // Largura do modal na tela (ajuste conforme o design)
    maxWidth: 350, // Largura máxima para telas maiores (opcional)
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
  ratingOptionsContainer: {
    width: '100%', // Faz com que os botões de nota ocupem a largura total do modal
    gap: 10,       // Espaçamento entre cada botão de nota
  },
  ratingButton: {
    flexDirection: 'row',     // Ícone e texto lado a lado
    alignItems: 'center',     // Alinha verticalmente ícone e texto
    justifyContent: 'center', // Centraliza conteúdo horizontalmente
    backgroundColor: colors.blue500,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8, // Espaçamento entre o ícone e o texto
  },
  ratingButtonText: {
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