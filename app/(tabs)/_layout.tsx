import { Tabs, useRouter, Redirect } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  HomeIcon,
  Users,
  User,
  Coins,
  Shield,
  UserCheck,
  Settings,
  DollarSign,
  Megaphone,
} from 'lucide-react-native';
import { usePushNotifications } from '@/hooks/usePushNotifications';

type UserRole = 'goleiro' | 'organizador' | 'admin';

interface TabConfig {
  name: string;
  title: string;
  icon: React.ComponentType<any>;
  allowedRoles: UserRole[];
  badge?: boolean;
  gradient?: [string, string];
}

const ALL_TABS_CONFIG: TabConfig[] = [
  { name: 'index', title: 'Home', icon: HomeIcon, allowedRoles: ['goleiro', 'organizador', 'admin'], gradient: ['#0A8043', '#059669'] },
  { name: 'carteira', title: 'Coins', icon: Coins, allowedRoles: ['goleiro', 'organizador', 'admin'], gradient: ['#F59E0B', '#EAB308'] },
  { name: 'suporte', title: 'Suporte', icon: Shield, allowedRoles: ['goleiro', 'organizador', 'admin'], gradient: ['#EF4444', '#F97316'] },
  { name: 'perfil', title: 'Perfil', icon: User, allowedRoles: ['goleiro', 'organizador', 'admin'], gradient: ['#6366F1', '#8B5CF6'] },
  { name: 'goleiros', title: 'Goleiros', icon: Users, allowedRoles: ['organizador'], gradient: ['#10B981', '#059669'] },
  { name: 'avaliacao', title: '', icon: Megaphone, allowedRoles: ['goleiro', 'organizador'], gradient: ['#3B82F6', '#2563EB'] },
  { name: 'aprovacoes', title: 'Aprovações Pessoas', icon: UserCheck, allowedRoles: ['admin'], badge: true, gradient: ['#F59E0B', '#EAB308'] },
  { name: 'aprovarm', title: 'Aprovações Saques', icon: DollarSign, allowedRoles: ['admin'], badge: true, gradient: ['#F59E0B', '#EAB308'] },
  { name: 'admin', title: 'Sistema', icon: Settings, allowedRoles: ['admin'], gradient: ['#6B7280', '#374151'] },
];

export default function TabLayout() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Lógica de notificação continua aqui, funcionando perfeitamente
  usePushNotifications();

  useEffect(() => {
    if (!authLoading) {
      // ======================================================================================
      // ===== MUDANÇA PRINCIPAL: LÓGICA DE ACESSO SIMPLIFICADA =====
      // Agora, a autorização depende APENAS se o usuário está logado (user !== null).
      // A verificação de 'status_aprovacao' foi REMOVIDA daqui.
      // ======================================================================================
      const authorized = user !== null;

      setIsAuthorized(authorized);

      // Se não estiver autorizado (ou seja, não logado), redireciona para o login
      if (!authorized) {
        setTimeout(() => router.replace('/(auth)/login'), 0);
      } else {
        // Se estiver autorizado (logado), mostra as abas com a animação
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [authLoading, user, router, fadeAnim]);

  if (authLoading || isAuthorized === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A8043" />
      </View>
    );
  }

  // Se 'isAuthorized' for falso (usuário não logado), redireciona.
  // Este redirect é uma segurança extra.
  if (!isAuthorized) {
    return <Redirect href="/(auth)/login" />;
  }
  
  // O resto do código continua igual, renderizando as abas para o usuário logado.
  const currentUserRole = user?.tipo_usuario?.toLowerCase() as UserRole;
  let allowedTabs = ALL_TABS_CONFIG.filter(tab => tab.allowedRoles.includes(currentUserRole)).map(tab => {
    if (tab.name === 'avaliacao') {
      return { ...tab, title: currentUserRole === 'goleiro' ? 'Convocação' : 'Avaliação' };
    }
    return tab;
  });
  if (currentUserRole === 'organizador') {
    const ordemOrganizador = ['index', 'goleiros', 'avaliacao', 'carteira', 'suporte', 'perfil'];
    allowedTabs = ordemOrganizador.map(name => allowedTabs.find(tab => tab.name === name)).filter(Boolean) as TabConfig[];
  } else if (currentUserRole === 'goleiro') {
    const ordemGoleiro = ['index', 'avaliacao', 'carteira', 'suporte', 'perfil'];
    allowedTabs = ordemGoleiro.map(name => allowedTabs.find(tab => tab.name === name)).filter(Boolean) as TabConfig[];
  }
  const AnimatedTabIcon = ({ icon: Icon, color, size, focused }: any) => {
    const [scaleAnim] = useState(new Animated.Value(1));
    useEffect(() => {
      Animated.spring(scaleAnim, {
        toValue: focused ? 1.2 : 1,
        useNativeDriver: true,
        tension: 300,
        friction: 10,
      }).start();
    }, [focused, scaleAnim]);
    return (
      <Animated.View style={[ styles.iconContainer, { transform: [{ scale: scaleAnim }], backgroundColor: focused ? `${color}20` : 'transparent' } ]} >
        <Icon color={color} size={size} strokeWidth={focused ? 2.5 : 2} />
      </Animated.View>
    );
  };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <Tabs
          screenOptions={{
            tabBarInactiveTintColor: '#64748b',
            headerShown: false,
            tabBarStyle: styles.tabBar,
            tabBarLabelStyle: styles.tabBarLabel,
            tabBarItemStyle: styles.tabBarItem,
            tabBarHideOnKeyboard: true,
            tabBarBackground: () => <View style={styles.tabBarBackground} />,
          }}
        >
          {allowedTabs.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                title: tab.title,
                tabBarActiveTintColor: tab.gradient ? tab.gradient[0] : '#059669',
                tabBarIcon: ({ color, size, focused }) => (
                  <AnimatedTabIcon icon={tab.icon} color={color} size={size} focused={focused} />
                ),
                tabBarBadge: tab.badge ? '!' : undefined,
                tabBarBadgeStyle: styles.tabBarBadge,
                headerStyle: styles.headerStyle,
                headerTitleStyle: styles.headerTitle,
                headerTintColor: '#059669',
              }}
            />
          ))}
          {!allowedTabs.some((t) => t.name === 'goleiros') && ( <Tabs.Screen name="goleiros" redirect /> )}
          {!allowedTabs.some((t) => t.name === 'aprovacoes') && ( <Tabs.Screen name="aprovacoes" redirect /> )}
          {!allowedTabs.some((t) => t.name === 'aprovarm') && ( <Tabs.Screen name="aprovarm" redirect /> )}
          {!allowedTabs.some((t) => t.name === 'admin') && ( <Tabs.Screen name="admin" redirect /> )}
          {!allowedTabs.some((t) => t.name === 'avaliacao') && ( <Tabs.Screen name="avaliacao" redirect /> )}
        </Tabs>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8fafc', },
  tabBar: { backgroundColor: '#ffffff', borderTopWidth: 0, elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10, height: 80, paddingBottom: 20, paddingTop: 10, borderTopLeftRadius: 20, borderTopRightRadius: 20, },
  tabBarBackground: { backgroundColor: '#ffffff', borderTopLeftRadius: 20, borderTopRightRadius: 20, ...StyleSheet.absoluteFillObject, },
  tabBarItem: { flex: 1, paddingVertical: 5, },
  tabBarLabel: { fontSize: 12, fontWeight: '600', marginTop: 4, },
  iconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 2, },
  tabBarBadge: { backgroundColor: '#EF4444', color: '#ffffff', fontSize: 10, fontWeight: 'bold', minWidth: 18, height: 18, borderRadius: 9, marginLeft: 10, marginTop: -5, },
  headerStyle: { backgroundColor: '#ffffff', elevation: 0, shadowOpacity: 0, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1e293b', },
});