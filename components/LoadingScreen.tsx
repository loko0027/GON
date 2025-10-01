import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function LoadingScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // Continuous rotation for decorative elements
    const rotateLoop = Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 8000,
        useNativeDriver: true,
      })
    );
    rotateLoop.start();

    // Pulse animation for logo
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Loading dots animation
    const dotsLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(dotsAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(dotsAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    );
    dotsLoop.start();

    return () => {
      rotateLoop.stop();
      pulseLoop.stop();
      dotsLoop.stop();
    };
  }, []);

  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <LinearGradient
      colors={['#667eea', '#764ba2', '#6366f1']}
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Decorative elements */}
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
          styles.content,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }]
          }
        ]}
      >
        {/* Logo with pulse animation */}
        <Animated.View style={[styles.logoContainer, { transform: [{ scale: pulseAnim }] }]}>
          <Image 
            source={require('@/assets/images/newicone.png')}
            style={styles.logo} 
            accessibilityLabel="GoleiroON Logo"
          />
        </Animated.View>

        {/* App name */}
        <Text style={styles.appName}>GoleiroON</Text>
        
        {/* Loading text with animated dots */}
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Verificando sessão</Text>
          <Animated.View style={[styles.dotsContainer, { opacity: dotsAnim }]}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </Animated.View>
        </View>
        
        {/* Progress steps */}
        <View style={styles.stepsContainer}>
          <Text style={styles.stepText}>🔐 Autenticando usuário</Text>
          <Text style={styles.stepText}>📊 Carregando dados</Text>
          <Text style={styles.stepText}>⚡ Preparando interface</Text>
        </View>

        {/* Subtitle */}
        <Text style={styles.subtitle}>
          Conectando goleiros e organizadores
        </Text>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  decorativeCircle: {
    position: 'absolute',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  circle1: {
    width: 200,
    height: 200,
    top: height * 0.15,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    bottom: height * 0.15,
    left: -30,
  },
  content: {
    alignItems: 'center',
    zIndex: 1,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    width: 100,
    height: 100,
    resizeMode: 'contain',
  },
  appName: {
    fontSize: 36,
    fontWeight: '900',
    color: '#ffffff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e2e8f0',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  stepsContainer: {
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  stepText: {
    fontSize: 13,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  subtitle: {
    fontSize: 14,
    color: '#cbd5e1',
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
});