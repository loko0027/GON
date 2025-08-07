import React, { useEffect, useRef, useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Text, 
  TouchableOpacity, 
  ScrollView, 
  Animated, 
  Dimensions,
  StatusBar,
  Image // Importe o componente Image
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  ArrowRight, 
  Users, 
  Target, 
  Star, 
  Shield,
  TrendingUp,
  Award,
  Clock,
  Zap
} from 'lucide-react-native';

// Importa a imagem local da luva de goleiro
// Certifique-se de que o caminho 'assets/goleiroon.png' esteja correto
const GOLIE_ICON_LOCAL = require('../assets//images/goleiroon.png'); 

const { width, height } = Dimensions.get('window');

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const scrollY = useRef(new Animated.Value(0)).current;
  const [currentFeature, setCurrentFeature] = useState(0);
  
  // Animações
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const slideInAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animações iniciais
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideInAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();

    // Animação de pulso contínua
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Rotação contínua
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 10000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // Carrossel de features
    const featureInterval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 4);
    }, 3000);

    return () => {
      pulseLoop.stop();
      rotateLoop.stop();
      clearInterval(featureInterval);
    };
  }, []);

  if (loading) {
    return (
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.loadingContainer}
      >
        <Animated.View style={[styles.loadingContent, { transform: [{ scale: pulseAnim }] }]}>
          {/* Ícone de luva de goleiro no carregamento (usando imagem local) */}
          <Image 
            source={GOLIE_ICON_LOCAL} // Usando a imagem local
            style={styles.loadingGloveIcon} 
            accessibilityLabel="Ícone de luva de goleiro"
          />
          <Text style={styles.loadingText}>Carregando...</Text>
        </Animated.View>
      </LinearGradient>
    );
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  const headerTransform = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [0, -100],
    extrapolate: 'clamp',
  });

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 200],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const features = [
    {
      icon: Users,
      title: "Para Organizadores",
      description: "Encontre goleiros disponíveis, faça convocações e avalie o desempenho",
      color: "#059669",
      gradient: ['#059669', '#10b981']
    },
    {
      icon: Target,
      title: "Para Goleiros",
      description: "Receba convocações, ganhe coins por performance e saque seus ganhos",
      color: "#3b82f6",
      gradient: ['#3b82f6', '#60a5fa']
    },
    {
      icon: Star,
      title: "Sistema de Avaliação",
      description: "Avaliações bidirecionais que constroem reputação e confiança",
      color: "#f59e0b",
      gradient: ['#f59e0b', '#fbbf24']
    },
    {
      icon: Shield,
      title: "Pagamento Seguro",
      description: "Sistema de coins com retenção automática e liberação por performance",
      color: "#8b5cf6",
      gradient: ['#8b5cf6', '#a78bfa']
    }
  ];

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#667eea" />
      
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Hero Section */}
        <Animated.View
          style={[
            styles.heroWrapper,
            {
              transform: [{ translateY: headerTransform }],
              opacity: headerOpacity,
            }
          ]}
        >
          <LinearGradient
            colors={['#667eea', '#764ba2']}
            style={styles.heroSection}
          >
            {/* Elementos decorativos animados */}
            <Animated.View 
              style={[
                styles.decorativeCircle,
                styles.circle1,
                { transform: [{ rotate: rotateInterpolate }] }
              ]}
            />
            <Animated.View 
              style={[
                styles.decorativeCircle,
                styles.circle2,
                { transform: [{ rotate: rotateInterpolate }] }
              ]}
            />
            
            <Animated.View 
              style={[
                styles.heroContent,
                {
                  opacity: fadeInAnim,
                  transform: [{ translateY: slideInAnim }]
                }
              ]}
            >
              {/* Título com o ícone de luva de goleiro (usando imagem local) */}
              <Animated.View style={[styles.heroTitleContainer, { transform: [{ scale: pulseAnim }] }]}>
                <Image 
                  source={GOLIE_ICON_LOCAL} // Usando a imagem local
                  style={styles.heroGloveIcon} 
                  accessibilityLabel="Ícone de luva de goleiro"
                />
                <Text style={styles.heroTitleText}> GoleiroON </Text>
              </Animated.View>
              
              <Text style={styles.heroSubtitle}>
                Conectando goleiros e organizadores no futebol amador
              </Text>
              
              <Text style={styles.heroDescription}>
                A plataforma que facilita a convocação de goleiros, 
                com sistema de avaliação e pagamento seguro.
              </Text>
              
              <TouchableOpacity
                style={styles.ctaButton}
                onPress={() => router.push('/(auth)/login')}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#059669', '#10b981']}
                  style={styles.ctaButtonGradient}
                >
                  <Text style={styles.ctaButtonText}>Começar Agora</Text>
                  <ArrowRight size={20} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Como Funciona</Text>
          
          <View style={styles.featuresList}>
            {features.map((feature, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.featureCard,
                  {
                    opacity: fadeInAnim,
                    transform: [
                      {
                        translateX: slideInAnim.interpolate({
                          inputRange: [0, 50],
                          outputRange: [0, index % 2 === 0 ? -50 : 50],
                        })
                      }
                    ]
                  }
                ]}
              >
                <LinearGradient
                  colors={feature.gradient}
                  style={styles.featureIconGradient}
                >
                  <feature.icon size={28} color="#fff" />
                </LinearGradient>
                
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>
                    {feature.description}
                  </Text>
                </View>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Stats Section */}
        <LinearGradient
          colors={['#f8fafc', '#e2e8f0']}
          style={styles.statsSection}
        >
          <Text style={styles.statsTitle}>Junte-se à Comunidade</Text>
          <View style={styles.statsGrid}>
            {[
              { number: '500+', label: 'Goleiros', icon: Users },
              { number: '1000+', label: 'Jogos', icon: TrendingUp },
              { number: '50+', label: 'Organizadores', icon: Award },
            ].map((stat, index) => (
              <Animated.View
                key={index}
                style={[
                  styles.statCard,
                  {
                    opacity: fadeInAnim,
                    transform: [
                      {
                        scale: fadeInAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.8, 1],
                        })
                      }
                    ]
                  }
                ]}
              >
                <stat.icon size={32} color="#059669" />
                <Text style={styles.statNumber}>{stat.number}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Animated.View>
            ))}
          </View>
        </LinearGradient>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.benefitsTitle}>Por que Escolher?</Text>
          
          <View style={styles.benefitsList}>
            {[
              { icon: Clock, title: 'Rapidez', description: 'Convocações em tempo real' },
              { icon: Shield, title: 'Segurança', description: 'Pagamentos garantidos' },
              { icon: Star, title: 'Qualidade', description: 'Sistema de avaliação' },
              { icon: Zap, title: 'Eficiência', description: 'Interface intuitiva' },
            ].map((benefit, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.benefitIcon}>
                  <benefit.icon size={24} color="#059669" />
                </View>
                <View>
                  <Text style={styles.benefitTitle}>{benefit.title}</Text>
                  <Text style={styles.benefitDescription}>{benefit.description}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Footer Section */}
        <LinearGradient
          colors={['#1e293b', '#0f172a']}
          style={styles.footerSection}
        >
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => router.push('/(auth)/login')}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3b82f6', '#2563eb']}
              style={styles.loginButtonGradient}
            >
              <Text style={styles.loginButtonText}>Entrar / Cadastrar</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <Text style={styles.footerText}>
            © 2024  GoleiroON  - Conectando o futebol amador
          </Text>
        </LinearGradient>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  heroWrapper: {
    position: 'relative',
  },
  heroSection: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
    minHeight: height * 0.6,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: -30,
    left: -30,
  },
  heroContent: {
    alignItems: 'center',
    zIndex: 1,
  },
  // Novo estilo para o container do título e ícone
  heroTitleContainer: {
    flexDirection: 'row', // Para alinhar o ícone e o texto lado a lado
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  // Estilo para o texto do título (anteriormente heroTitle)
  heroTitleText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    marginLeft: 10, // Espaçamento entre o ícone e o texto
  },
  // Estilo para o ícone da luva no título principal
  heroGloveIcon: {
    width: 50, // Ajuste o tamanho conforme necessário
    height: 50, // Ajuste o tamanho conforme necessário
    resizeMode: 'contain', // Garante que a imagem se ajuste sem cortar
  },
  heroSubtitle: {
    fontSize: 22,
    color: '#e2e8f0',
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 28,
  },
  heroDescription: {
    fontSize: 16,
    color: '#cbd5e1',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  ctaButton: {
    borderRadius: 25,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 25,
  },
  ctaButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  featuresSection: {
    padding: 32,
    backgroundColor: '#ffffff',
  },
  featuresTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 40,
  },
  featuresList: {
    gap: 24,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIconGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 15,
    color: '#64748b',
    lineHeight: 22,
  },
  statsSection: {
    padding: 40,
  },
  statsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 32,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statCard: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 100,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: '#059669',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    fontWeight: '600',
  },
  benefitsSection: {
    padding: 32,
    backgroundColor: '#ffffff',
  },
  benefitsTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#0f172a',
    textAlign: 'center',
    marginBottom: 32,
  },
  benefitsList: {
    gap: 20,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  benefitIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  benefitDescription: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  footerSection: {
    padding: 40,
    alignItems: 'center',
  },
  loginButton: {
    borderRadius: 12,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 24,
  },
  loginButtonGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    flexDirection: 'column', // Para empilhar o ícone e o texto verticalmente
  },
  loadingText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 16,
  },
  // Estilo para o ícone da luva na tela de carregamento
  loadingGloveIcon: {
    width: 80, // Ajuste o tamanho conforme necessário
    height: 80, // Ajuste o tamanho conforme necessário
    resizeMode: 'contain',
  },
});
