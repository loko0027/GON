import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert, StyleSheet } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Phone, Lock } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function RegisterPage() {
  const { register, loading } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'goleiro' | 'organizador'>('goleiro');
  const [password, setPassword] = useState('');

  const handleRegister = async () => {
    if (!nome || !email || !telefone || !password) {
      Alert.alert('Erro', 'Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erro', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    try {
      // --- CORREÇÃO AQUI: Passando os argumentos na ordem correta e como strings separadas ---
      await register(email, password, nome, telefone, tipoUsuario); 
      Alert.alert('Sucesso', 'Cadastro enviado para aprovação!');
      // Limpar formulário
      setNome('');
      setEmail('');
      setTelefone('');
      setPassword('');
      setTipoUsuario('goleiro');
      // Redirecionar para login
      router.push('/(auth)/login');
    } catch (err: any) {
      Alert.alert('Erro', err.message || 'Falha ao registrar.');
      console.error('Erro de registro:', err);
    }
  };

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>Criar Conta</Text>

        <Text style={styles.label}>Nome completo</Text>
        <View style={styles.inputGroup}>
          <User size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            value={nome}
            onChangeText={setNome}
          />
        </View>

        <Text style={styles.label}>Email</Text>
        <View style={styles.inputGroup}>
          <User size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Telefone</Text>
        <View style={styles.inputGroup}>
          <Phone size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Telefone"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
          />
        </View>

        <Text style={styles.label}>Tipo de usuário</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity
            style={[styles.radioOption, tipoUsuario === 'goleiro' && styles.radioSelected]}
            onPress={() => setTipoUsuario('goleiro')}
          >
            <Text style={styles.radioText}>🧤 Goleiro</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.radioOption, tipoUsuario === 'organizador' && styles.radioSelected]}
            onPress={() => setTipoUsuario('organizador')}
            >
            <Text style={styles.radioText}>👥 Organizador</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Senha</Text>
        <View style={styles.inputGroup}>
          <Lock size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Senha"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleRegister}
          disabled={loading}
        >
          <Text style={styles.submitText}>{loading ? 'Cadastrando...' : 'Registrar'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.switchAuth}
        >
          <Text style={styles.switchAuthText}>Já tem conta? <Text style={styles.switchAuthLink}>Entrar</Text></Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 24,
    color: '#0f172a',
    textAlign: 'center',
  },
  label: {
    fontWeight: '600',
    marginBottom: 6,
    color: '#0f172a',
    fontSize: 16,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 16,
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  radioGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  radioOption: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    marginHorizontal: 5,
  },
  radioSelected: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  radioText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  submitButton: {
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#059669',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  switchAuth: {
    marginTop: 20,
    alignItems: 'center',
  },
  switchAuthText: {
    color: '#64748b',
    fontSize: 14,
  },
  switchAuthLink: {
    color: '#3b82f6',
    fontWeight: '700',
  },
});
