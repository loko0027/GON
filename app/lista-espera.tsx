import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';  // importe seu contexto de autenticação

export default function ListaEsperaPage() {
  const router = useRouter();
  const { logout } = useAuth();

  const handleVoltarLogin = async () => {
    try {
      await logout();            // Sai da conta
      router.replace('/(auth)/login');  // Redireciona para login
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível sair da conta.');
      console.error('Erro ao fazer logout:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Aguardando Aprovação</Text>
      <Text style={styles.message}>
        Seu cadastro está em análise. Assim que for aprovado pelo administrador, você será notificado por e-mail ou WhatsApp.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleVoltarLogin}>
        <Text style={styles.buttonText}>Voltar para Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f0f4f8',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginBottom: 16,
    color: '#334155',
  },
  message: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
