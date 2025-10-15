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
  Image,
  Modal,     // <-- Adicionado
  FlatList,  // <-- Adicionado
  SafeAreaView // <-- Adicionado
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
  Square,
  ChevronDown, // <-- Adicionado
  X,           // <-- Adicionado
  MapPin       // <-- Adicionado (opcional, para ícone)
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

const { width, height } = Dimensions.get('window');

const estadosDisponiveis = [
    { label: 'Minas Gerais', value: 'MG' },
];

const cidadesDisponiveis: { [key: string]: { label: string, value: string }[] } = {
    'MG': [
        { label: 'Santa Rita do Sapucaí', value: 'Santa Rita do Sapucaí' },
    ],
};

const verificarEmailTelefoneExistente = async (email: string, telefone: string) => {
  const telefoneLimpo = telefone.replace(/\D/g, '');
  const { data, error } = await supabase
    .from('usuarios')
    .select('email, telefone')
    .or(`email.eq.${email},telefone.eq.${telefoneLimpo}`);
  
  if (error) {
    console.error("Erro ao verificar usuário:", error);
    throw new Error("Não foi possível verificar os dados. Tente novamente.");
  }

  if (data && data.length > 0) {
    const emailExiste = data.some(user => user.email === email);
    const telefoneExiste = data.some(user => user.telefone === telefoneLimpo);
    
    let mensagemErro = 'Email ou Telefone já existente.';
    if (emailExiste && telefoneExiste) {
      mensagemErro = 'Email e Telefone já estão cadastrados.';
    } else if (emailExiste) {
      mensagemErro = 'Este email já está em uso.';
    } else if (telefoneExiste) {
      mensagemErro = 'Este telefone já está em uso.';
    }
    throw new Error(mensagemErro);
  }
};

export default function AuthPage() {
  const { login, register, loading, user } = useAuth();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [tipoUsuario, setTipoUsuario] = useState<'goleiro' | 'organizador'>('goleiro');
  const [aceitoTermos, setAceitoTermos] = useState(false);
  
  const [estado, setEstado] = useState('');
  const [cidade, setCidade] = useState('');
  const [isEstadoModalVisible, setEstadoModalVisible] = useState(false);
  const [isCidadeModalVisible, setCidadeModalVisible] = useState(false);

  const [errors, setErrors] = useState<{ [key: string]: string | null }>({});

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();
  }, []);

  useEffect(() => {
    if (user) {
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
      await login(email, password);
    } catch (err: any) {
      Alert.alert('❌ Erro de Login', err.message || 'Falha ao fazer login. Verifique suas credenciais.');
    }
  };

  const formatarTelefone = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    let match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    match = cleaned.match(/^(\d{2})(\d{4})(\d{4})$/);
      if (match) {
        return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
    return text;
  };

  const validateEmail = (emailToValidate: string) => {
    const re = /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    return re.test(String(emailToValidate).toLowerCase());
  };

  const handleRegister = async () => {
    setErrors({});
    let valid = true;
    if (!nome.trim()) {
      setErrors(prev => ({ ...prev, nome: 'Nome é obrigatório.' }));
      valid = false;
    }
    if (!validateEmail(email)) {
      setErrors(prev => ({ ...prev, email: 'Formato de email inválido.' }));
      valid = false;
    }
    const telefoneLimpo = telefone.replace(/\D/g, '');
    if (telefoneLimpo.length < 10) {
      setErrors(prev => ({ ...prev, telefone: 'Telefone inválido.' }));
      valid = false;
    }
    if (!estado) {
        setErrors(prev => ({ ...prev, estado: 'Estado é obrigatório.' }));
        valid = false;
    }
    if (!cidade) {
        setErrors(prev => ({ ...prev, cidade: 'Cidade é obrigatória.' }));
        valid = false;
    }
    if (password.length < 6) {
      setErrors(prev => ({ ...prev, password: 'A senha deve ter no mínimo 6 caracteres.' }));
      valid = false;
    }
    if (password !== confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: 'As senhas não coincidem.' }));
      valid = false;
    }
    if (!aceitoTermos) {
      Alert.alert('⚠️ Aceite os termos', 'Você precisa ler e aceitar os termos de uso para continuar.');
      return;
    }
    if (!valid) return;
    
    try {
      await verificarEmailTelefoneExistente(email, telefoneLimpo);

      // ===== CORREÇÃO DEFINITIVA AQUI =====
      // Corrigimos 'tipo_usuario' para 'tipoUsuario' (U maiúsculo).
      // Também passamos 'telefoneLimpo' para salvar o número sem formatação.
      await register(email, password, nome, telefoneLimpo, tipoUsuario, estado, cidade);
      // ===== FIM DA CORREÇÃO =====
      
      Alert.alert('✅ Sucesso', 'Cadastro enviado para aprovação! Você receberá uma notificação quando for aprovado.');
      switchMode(true);
    } catch (err: any) {
      console.error('[REGISTER] Erro ao registrar:', err);
      Alert.alert('❌ Erro de Cadastro', err.message || 'Falha ao registrar. Tente novamente.');
    }
  };

  const switchMode = (forceLogin = false) => {
    setIsLogin(forceLogin ? true : !isLogin);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setNome('');
    setTelefone('');
    setTipoUsuario('goleiro');
    setAceitoTermos(false);
    setEstado('');
    setCidade('');
    setErrors({});
  };

  const renderLoginForm = () => (
    // SEU FORMULÁRIO DE LOGIN (100% INTACTO)
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
          <View style={styles.inputIcon}><Mail size={22} color="#6366f1" /></View>
          <TextInput style={styles.input} placeholder="Seu email" placeholderTextColor="#9ca3af" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail}/>
        </View>
        <View style={styles.inputWrapper}>
          <View style={styles.inputIcon}><Lock size={22} color="#6366f1" /></View>
          <TextInput style={styles.input} placeholder="Sua senha" placeholderTextColor="#9ca3af" secureTextEntry={!showPassword} value={password} onChangeText={setPassword}/>
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
            {showPassword ? <EyeOff size={22} color="#6b7280" /> : <Eye size={22} color="#6b7280" />}
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.primaryButton} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
        <LinearGradient colors={['#6366f1', '#8b5cf6', '#a855f7']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Text style={styles.primaryButtonText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
          {!loading && <ArrowRight size={22} color="#ffffff" />}
        </LinearGradient>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => switchMode()} style={styles.switchButton} activeOpacity={0.7}>
        <Text style={styles.switchText}>Não tem conta? <Text style={styles.switchLink}>Criar conta gratuita</Text></Text>
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
        <View style={styles.inputWrapper}><View style={styles.inputIcon}><User size={22} color="#10b981" /></View><TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor="#9ca3af" value={nome} onChangeText={setNome}/></View>
        {errors.nome && <Text style={styles.errorText}>{errors.nome}</Text>}
        <View style={styles.inputWrapper}><View style={styles.inputIcon}><Mail size={22} color="#10b981" /></View><TextInput style={styles.input} placeholder="Seu melhor email" placeholderTextColor="#9ca3af" value={email} onChangeText={(text) => setEmail(text.trim())} keyboardType="email-address" autoCapitalize="none"/></View>
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
        <View style={styles.inputWrapper}><View style={styles.inputIcon}><Phone size={22} color="#10b981" /></View><TextInput style={styles.input} placeholder="WhatsApp (XX) XXXXX-XXXX" placeholderTextColor="#9ca3af" value={telefone} onChangeText={(text) => setTelefone(formatarTelefone(text))} keyboardType="phone-pad" maxLength={16}/></View>
        {errors.telefone && <Text style={styles.errorText}>{errors.telefone}</Text>}
        
        <TouchableOpacity style={styles.inputWrapper} onPress={() => setEstadoModalVisible(true)}>
            <View style={styles.inputIcon}><MapPin size={22} color="#10b981" /></View>
            <Text style={[styles.input, !estado && {color: '#9ca3af'}]}>{estado ? estadosDisponiveis.find(e => e.value === estado)?.label : 'Selecione seu estado'}</Text>
            <ChevronDown size={22} color="#6b7280" />
        </TouchableOpacity>
        {errors.estado && <Text style={styles.errorText}>{errors.estado}</Text>}

        <TouchableOpacity style={[styles.inputWrapper, !estado && {backgroundColor: '#e5e7eb'}]} onPress={() => setCidadeModalVisible(true)} disabled={!estado}>
            <View style={styles.inputIcon}><MapPin size={22} color={!estado ? '#9ca3af' : '#10b981'} /></View>
            <Text style={[styles.input, !cidade && {color: '#9ca3af'}]}>{cidade || 'Selecione sua cidade'}</Text>
            <ChevronDown size={22} color="#6b7280" />
        </TouchableOpacity>
        {errors.cidade && <Text style={styles.errorText}>{errors.cidade}</Text>}
        
        <View style={styles.inputWrapper}><View style={styles.inputIcon}><Lock size={22} color="#10b981" /></View><TextInput style={styles.input} placeholder="Criar senha (min. 6 caracteres)" placeholderTextColor="#9ca3af" secureTextEntry={!showPassword} value={password} onChangeText={setPassword}/><TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>{showPassword ? (<EyeOff size={22} color="#6b7280" />) : (<Eye size={22} color="#6b7280" />)}</TouchableOpacity></View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
        <View style={styles.inputWrapper}><View style={styles.inputIcon}><Lock size={22} color="#10b981" /></View><TextInput style={styles.input} placeholder="Confirmar senha" placeholderTextColor="#9ca3af" secureTextEntry={!showConfirmPassword} value={confirmPassword} onChangeText={setConfirmPassword}/><TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} style={styles.eyeIcon}>{showConfirmPassword ? (<EyeOff size={22} color="#6b7280" />) : (<Eye size={22} color="#6b7280" />)}</TouchableOpacity></View>
        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      </View>
      <View style={styles.radioContainer}>
        <Text style={styles.radioLabel}>Escolha seu perfil</Text>
        <View style={styles.radioGroup}>
          <TouchableOpacity style={[styles.radioOption, tipoUsuario === 'goleiro' && styles.radioSelected]} onPress={() => setTipoUsuario('goleiro')} activeOpacity={0.8}><LinearGradient colors={tipoUsuario === 'goleiro' ? ['#10b981', '#059669'] : ['#f8fafc', '#f1f5f9']} style={styles.radioGradient}><Text style={styles.radioEmoji}>🧤</Text><Text style={[styles.radioText, tipoUsuario === 'goleiro' && styles.radioTextSelected]}>Goleiro</Text><Text style={[styles.radioDesc, tipoUsuario === 'goleiro' && styles.radioDescSelected]}>Receba convocações</Text></LinearGradient></TouchableOpacity>
          <TouchableOpacity style={[styles.radioOption, tipoUsuario === 'organizador' && styles.radioSelected]} onPress={() => setTipoUsuario('organizador')} activeOpacity={0.8}><LinearGradient colors={tipoUsuario === 'organizador' ? ['#6366f1', '#4f46e5'] : ['#f8fafc', '#f1f5f9']} style={styles.radioGradient}><Text style={styles.radioEmoji}>👥</Text><Text style={[styles.radioText, tipoUsuario === 'organizador' && styles.radioTextSelected]}>Organizador</Text><Text style={[styles.radioDesc, tipoUsuario === 'organizador' && styles.radioDescSelected]}>Convoque goleiros</Text></LinearGradient></TouchableOpacity>
        </View>
      </View>
      <View style={styles.checkboxContainer}>
        <TouchableOpacity style={styles.checkbox} onPress={() => setAceitoTermos(!aceitoTermos)} activeOpacity={0.8}>
          {aceitoTermos ? (<CheckCircle size={22} color="#10b981" />) : (<Square size={22} color="#9ca3af" />)}
        </TouchableOpacity>
        <Text style={styles.checkboxText}>Li e aceito os{' '}<Text style={styles.termosLink} onPress={() => router.push('/(auth)/termos')}>Termos de Uso</Text></Text>
      </View>
      <TouchableOpacity style={[styles.primaryButton, (!aceitoTermos) && { opacity: 0.5 }]} onPress={handleRegister} disabled={loading || !aceitoTermos} activeOpacity={0.8}><LinearGradient colors={['#10b981', '#059669', '#047857']} style={styles.gradientButton} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}><Text style={styles.primaryButtonText}>{loading ? 'Criando conta...' : 'Criar conta gratuita'}</Text>{!loading && <ArrowRight size={22} color="#ffffff" />}</LinearGradient></TouchableOpacity>
      <TouchableOpacity onPress={() => switchMode()} style={styles.switchButton} activeOpacity={0.7}><Text style={styles.switchText}>Já tem conta? <Text style={styles.switchLink}>Entrar agora</Text></Text></TouchableOpacity>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#667eea', '#764ba2', '#6366f1', '#8b5cf6']} style={styles.background} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.logoContainer}>
            <Animated.View style={{ opacity: fadeAnim }}>
              <Text style={styles.logo}>
                Goleiro<Text style={styles.logoOn}>ON</Text>
              </Text>
              <Text style={styles.tagline}>
                {isLogin ? 'Conectando goleiros e organizadores' : 'Junte-se à nossa comunidade'}
              </Text>
            </Animated.View>
          </View>
          <View style={styles.cardContainer}>
            {isLogin ? renderLoginForm() : renderRegisterForm()}
          </View>
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>
              © 2025 GoleiroON™ Todos os direitos reservados.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>

      <Modal visible={isEstadoModalVisible} animationType="slide" transparent={true} onRequestClose={() => setEstadoModalVisible(false)}>
        <SafeAreaView style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Selecione o Estado</Text>
                    <TouchableOpacity onPress={() => setEstadoModalVisible(false)}><X size={24} color="#374151" /></TouchableOpacity>
                </View>
                <FlatList
                    data={estadosDisponiveis}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalItem} onPress={() => {
                            setEstado(item.value);
                            setCidade(''); 
                            setEstadoModalVisible(false);
                        }}>
                            <Text style={styles.modalItemText}>{item.label}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </SafeAreaView>
      </Modal>

      <Modal visible={isCidadeModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCidadeModalVisible(false)}>
        <SafeAreaView style={styles.modalBackdrop}>
            <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Selecione a Cidade</Text>
                    <TouchableOpacity onPress={() => setCidadeModalVisible(false)}><X size={24} color="#374151" /></TouchableOpacity>
                </View>
                <FlatList
                    data={cidadesDisponiveis[estado] || []}
                    keyExtractor={(item) => item.value}
                    renderItem={({ item }) => (
                        <TouchableOpacity style={styles.modalItem} onPress={() => {
                            setCidade(item.value);
                            setCidadeModalVisible(false);
                        }}>
                            <Text style={styles.modalItemText}>{item.label}</Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        </SafeAreaView>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  background: { flex: 1 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 40 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { fontSize: 36, fontWeight: '900', color: '#ffffff', textAlign: 'center', textShadowColor: 'rgba(0, 0, 0, 0.3)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4, letterSpacing: 1 },
  logoOn: { color: '#FACC15' },
  tagline: { fontSize: 16, color: '#e2e8f0', textAlign: 'center', marginTop: 8, fontWeight: '500' },
  cardContainer: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 30, padding: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.25, shadowRadius: 25, elevation: 20 },
  formContainer: { width: '100%' },
  headerContainer: { alignItems: 'center', marginBottom: 30 },
  iconContainer: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  title: { fontSize: 28, fontWeight: '800', color: '#1f2937', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#6b7280', textAlign: 'center', lineHeight: 22, paddingHorizontal: 10 },
  inputContainer: { marginBottom: 10, gap: 16 },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8fafc', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 4, borderWidth: 2, borderColor: '#e2e8f0', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 16, color: '#1f2937', paddingVertical: 16, fontWeight: '500' },
  eyeIcon: { padding: 5 },
  radioContainer: { marginBottom: 25 },
  radioLabel: { fontSize: 18, fontWeight: '700', color: '#1f2937', marginBottom: 15, textAlign: 'center' },
  radioGroup: { flexDirection: 'row', gap: 12 },
  radioOption: { flex: 1, borderRadius: 20, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  radioSelected: { transform: [{ scale: 1.02 }] },
  radioGradient: { padding: 20, alignItems: 'center', minHeight: 120, justifyContent: 'center' },
  radioEmoji: { fontSize: 32, marginBottom: 8 },
  radioText: { fontSize: 16, fontWeight: '700', color: '#374151', marginBottom: 4 },
  radioTextSelected: { color: '#fff' },
  radioDesc: { fontSize: 12, color: '#6b7280', textAlign: 'center' },
  radioDescSelected: { color: '#e2e8f0' },
  primaryButton: { borderRadius: 16, overflow: 'hidden', shadowColor: '#6366f1', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 16, elevation: 8, marginBottom: 20 },
  gradientButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, paddingHorizontal: 30, gap: 10 },
  primaryButtonText: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 0.5 },
  switchButton: { alignItems: 'center', paddingVertical: 15 },
  switchText: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  switchLink: { color: '#747171ff', fontWeight: '700', textDecorationLine: 'underline' },
  footerContainer: { alignItems: 'center', marginTop: 30, paddingBottom: 10 }, 
  footerText: { fontSize: 12, color: '#141414ff', textAlign: 'center', opacity: 0.8 },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, justifyContent: 'center' },
  checkbox: { marginRight: 10 },
  checkboxText: { fontSize: 14, color: '#6b7280' },
  termosLink: { color: '#10b981', fontWeight: '700', textDecorationLine: 'underline' },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: -12,
    marginBottom: 8,
    marginLeft: 20,
    fontWeight: '500',
  },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, maxHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 12, marginBottom: 12 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e293b' },
  modalItem: { paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  modalItemText: { fontSize: 16, color: '#334155' },
});