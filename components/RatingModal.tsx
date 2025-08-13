// components/RatingModal.tsx
import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

interface RatingModalProps {
  isVisible: boolean;
  onClose: () => void;
  onRate: (nota: number) => void;
  title: string;
  message: string;
  options: { nota: number }[];
}

const colors = {
  blue500: '#3B82F6',
  white: '#FFFFFF',
  gray700: '#374151',
  gray500: '#6B7280',
  gray200: '#E5E7EB',
};

export default function RatingModal({ isVisible, onClose, onRate, title, message, options }: RatingModalProps) {
  const labels = ["Ruim", "Mais ou menos", "Bom", "Ótimo", "Paredão"];

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

          <View style={modalStyles.ratingOptionsContainer}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt.nota}
                style={modalStyles.ratingButton}
                onPress={() => onRate(opt.nota)}
              >
                <View style={{ flexDirection: 'row', marginRight: 8 }}>
                  {Array.from({ length: opt.nota }).map((_, i) => (
                    <Star key={i} size={20} color={colors.white} fill={colors.white} />
                  ))}
                </View>
                <Text style={modalStyles.ratingButtonText}>
                  {labels[opt.nota - 1]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={modalStyles.cancelButton} onPress={onClose}>
            <Text style={modalStyles.cancelButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

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
    shadowOffset: { width: 0, height: 2 },
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
  ratingOptionsContainer: {
    width: '100%',
    gap: 10,
  },
  ratingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.blue500,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
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
