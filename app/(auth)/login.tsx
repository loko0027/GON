import React, { useState, useEffect } from 'react';
import { 
  View, 
  TextInput, 
  TouchableOpacity, 
  Text, 
  Alert, 
  StyleSheet, 
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Image
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Eye, 
  EyeOff,
  ArrowRight,
  Sparkles,
  CheckCircle,
  Square
} from 'lucide-react-native';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Função de simulação — troque pela chamada real ao backend
const verificarEmailTelefoneExistente = async (email, telefone) => {
  console.log('[VERIFY] Verificando se email ou telefone já existem:', { email, telefone });

  const dadosDoBanco = [
    { email: 'teste@teste.com', telefone: '11987654321' },
    { email: 'user@example.com', telefone: '11999998888' },
  ];

  const emailExiste = dadosDoBanco.some(user => user.email === email);
  const telefoneExiste = dadosDoBanco.some(user => user.telefone === telefone);

  if (emailExiste || telefoneExiste) {
    let mensagemErro = 'Email ou Telefone já existente.';
    if (emailExiste && telefoneExiste) {
      mensagemErro = 'Email e Telefone já existentes.';
    } else if (emailExiste) {
      mensagemErro = 'Email já existente.';
    } else if (telefoneExiste) {
      mensagemErro = 'Telefone já existente.';
    }
    throw new Error(mensagemErro);
  }
};

export default function AuthPage() {
  const { login, register, loading, user } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  // Login fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Register fields
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'goleiro' | 'organizador'>('goleiro');
  const [aceitoTermos, setAceitoTermos] = useState(false);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('[AUTH_PAGE] Usuário detectado:', user);
      if (user.status_aprovacao === 'pendente') {
        router.replace('/lista-espera');
      } else if (user.status_aprovacao === 'aprovado') {
        router.replace('/(tabs)');
      }
    }
  }, [user]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('⚠️ Campos obrigatórios', 'Por favor preencha todos os campos.');
      return;
    }

    try {
      console.log('[LOGIN] Tentando fazer login com:', email);
      await login(email, password);
      console.log('[LOGIN] Login realizado com sucesso');
    } catch (err: any) {
      console.error('[LOGIN] Erro ao logar:', err);
      Alert.alert('❌ Erro de Login', err.message || 'Falha ao fazer login. Verifique suas credenciais.');
    }
  };

  const handleRegister = async () => {
    if (!nome || !email || !telefone || !password) {
      Alert.alert('⚠️ Campos obrigatórios', 'Preencha todos os campos.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('⚠️ Senha inválida', 'A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (!aceitoTermos) {
      Alert.alert('⚠️ Aceite os termos', 'Você precisa ler e aceitar os termos de uso para continuar.');
      return;
    }
    
    try {
      await verificarEmailTelefoneExistente(email, telefone);
      
      console.log('[REGISTER] Tentando registrar usuário:', { email, nome, telefone, tipoUsuario });
      await register(email, password, nome, telefone, tipoUsuario);
      Alert.alert('✅ Sucesso', 'Cadastro enviado para aprovação! Você receberá uma notificação quando for aprovado.');
      setIsLogin(true);
      setNome('');
      setEmail('');
      setTelefone('');
      setPassword('');
      setTipoUsuario('goleiro');
      setAceitoTermos(false);
    } catch (err: any) {
      console.error('[REGISTER] Erro ao registrar:', err);
      if (err.message.includes('existente')) {
        Alert.alert(
          '❌ Erro de Cadastro', 
          `${err.message}. Redefina a senha se a conta for sua.`,
        );
      } else {
        Alert.alert('❌ Erro de Cadastro', err.message || 'Falha ao registrar. Tente novamente.');
      }
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setEmail('');
    setPassword('');
    setNome('');
    setTelefone('');
    setTipoUsuario('goleiro');
    setAceitoTermos(false);
  };

  const renderLoginForm = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={styles.headerContainer}>
        <View style={[styles.iconContainer, { backgroundColor: 'transparent' }]}>
          <Image
            source={require('@/assets/images/newicone.png')}
            style={{ width: 100, height: 100, resizeMode: 'contain', marginTop: 16 }} 
          />
        </View>
        <Text style={styles.title}>Bem-vindo de volta! 👋</Text>
        <Text style={styles.subtitle}>Entre na sua conta para continuar sua jornada</Text>
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Mail size={22} color="#6366f1" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Seu email"
            placeholderTextColor="#9ca3af"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Lock size={22} color="#6366f1" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Sua senha"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff size={22} color="#6b7280" />
            ) : (
              <Eye size={22} color="#6b7280" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleLogin}
        disabled={loading}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#6366f1', '#8b5cf6', '#a855f7']}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Text>
          {!loading && <ArrowRight size={22} color="#ffffff" />}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={switchMode}
        style={styles.switchButton}
        activeOpacity={0.7}
      >
        <Text style={styles.switchText}>
          Não tem conta? <Text style={styles.switchLink}>Criar conta gratuita</Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderRegisterForm = () => (
    <Animated.View style={[styles.formContainer, { opacity: fadeAnim }]}>
      <View style={styles.headerContainer}>
        <View style={[styles.iconContainer, { backgroundColor: '#10b98120' }]}>
          <Sparkles size={40} color="#10b981" />
        </View>
        <Text style={styles.title}>Criar conta ⚽</Text>
        <Text style={styles.subtitle}>Junte-se à maior comunidade de futebol amador</Text>
      </View>

      <View style={styles.inputContainer}>
        {/* Nome */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <User size={22} color="#10b981" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            placeholderTextColor="#9ca3af"
            value={nome}
            onChangeText={setNome}
          />
        </View>

        {/* Email */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Mail size={22} color="#10b981" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Seu melhor email"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Telefone */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Phone size={22} color="#10b981" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="WhatsApp (11) 99999-9999"
            placeholderTextColor="#9ca3af"
            value={telefone}
            onChangeText={setTelefone}
            keyboardType="phone-pad"
          />
        </View>

        {/* Senha */}
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}>
            <Lock size={22} color="#10b981" />
          </View>
          <TextInput
            style={styles.input}
            placeholder="Criar senha (min. 6 caracteres)"
            placeholderTextColor="#9ca3af"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity 
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeIcon}
          >
            {showPassword ? (
              <EyeOff size={22} color="#6b7280" />
            ) : (
              <Eye size={22} color="#6b7280" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Escolha do perfil */}
      <View style={styles.radioContainer}>
        <Text style={styles.radioLabel}>Escolha seu perfil</Text>
        <View style={styles.radioGroup}>
          {/* Goleiro */}
          <TouchableOpacity
            style={[styles.radioOption, tipoUsuario === 'goleiro' && styles.radioSelected]}
            onPress={() => setTipoUsuario('goleiro')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={tipoUsuario === 'goleiro' ? ['#10b981', '#059669'] : ['#f8fafc', '#f1f5f9']}
              style={styles.radioGradient}
            >
              <Text style={styles.radioEmoji}>🧤</Text>
              <Text style={[styles.radioText, tipoUsuario === 'goleiro' && styles.radioTextSelected]}>
                Goleiro
              </Text>
              <Text style={[styles.radioDesc, tipoUsuario === 'goleiro' && styles.radioDescSelected]}>
                Receba convocações
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Organizador */}
          <TouchableOpacity
            style={[styles.radioOption, tipoUsuario === 'organizador' && styles.radioSelected]}
            onPress={() => setTipoUsuario('organizador')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={tipoUsuario === 'organizador' ? ['#6366f1', '#4f46e5'] : ['#f8fafc', '#f1f5f9']}
              style={styles.radioGradient}
            >
              <Text style={styles.radioEmoji}>👥</Text>
              <Text style={[styles.radioText, tipoUsuario === 'organizador' && styles.radioTextSelected]}>
                Organizador
              </Text>
              <Text style={[styles.radioDesc, tipoUsuario === 'organizador' && styles.radioDescSelected]}>
                Convoque goleiros
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Checkbox Termos */}
      <View style={styles.checkboxContainer}>
        <TouchableOpacity
          style={styles.checkbox}
          onPress={() => setAceitoTermos(!aceitoTermos)}
          activeOpacity={0.8}
        >
          {aceitoTermos ? (
            <CheckCircle size={22} color="#10b981" />
          ) : (
            <Square size={22} color="#9ca3af" />
          )}
        </TouchableOpacity>
        <Text style={styles.checkboxText}>
          Li e aceito os{' '}
          <Text style={styles.termosLink} onPress={() => router.push('/(auth)/termos')}>
            Termos de Uso
          </Text>
        </Text>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleRegister}
        disabled={loading || !aceitoTermos}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#10b981', '#059669', '#047857']}
          style={styles.gradientButton}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? 'Criando conta...' : 'Criar conta gratuita'}
          </Text>
          {!loading && <ArrowRight size={22} color="#ffffff" />}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={switchMode}
        style={styles.switchButton}
        activeOpacity={0.7}
      >
        <Text style={styles.switchText}>
          Já tem conta? <Text style={styles.switchLink}>Entrar agora</Text>
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#667eea', '#764ba2', '#6366f1', '#8b5cf6']}
        style={styles.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.logo}> GoleiroON </Text>
              <Text style={styles.tagline}>
                {isLogin ? 'Conectando goleiros e organizadores' : 'Junte-se à nossa comunidade'}
              </Text>
            </Animated.View>
          </View>

          <View style={styles.cardContainer}>
            {isLogin ? renderLoginForm() : renderRegisterForm()}
          </View>

          <View style={styles.footerContainer}>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: '#e2e8f0',
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },
  cardContainer: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 30,
    padding: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
  },
  formContainer: { width: '100%' },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  inputContainer: { marginBottom: 25, gap: 16 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, color: '#1f2937', paddingVertical: 16, fontWeight: '500' },
  eyeIcon: { padding: 5 },
  radioContainer: { marginBottom: 25 },
  radioLabel: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15, textAlign: 'center' },
  radioGroup: { flexDirection: 'row', gap: 12 },
  radioOption: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  radioSelected: { transform: [{ scale: 1.02 }] },
  radioGradient: { padding: 20, alignItems: 'center', minHeight: 120, justifyContent: 'center' },
  radioEmoji: { fontSize: 32, marginBottom: 8 },
  radioText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  radioTextSelected: { color: '#fff' },
  radioDesc: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  radioDescSelected: { color: '#e2e8f0' },
  primaryButton: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 20,
  },
  gradientButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 30, gap: 10 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  switchButton: { alignItems: 'center', paddingVertical: 15 },
  switchText: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  switchLink: { color: '#6366f1', fontWeight: '700', textDecorationLine: 'underline' },
  footerContainer: { alignItems: 'center', marginTop: 30 },
  footerText: { fontSize: 12, color: '#e2e8f0', textAlign: 'center', opacity: 0.8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
  checkbox: { marginRight: 10 },
  checkboxText: { fontSize: 14, color: '#6b7280' },
  termosLink: { color: '#10b981', fontWeight: '700', textDecorationLine: 'underline' },
});
