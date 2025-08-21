import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Configura comportamento das notificações
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidImportance.HIGH,
  }),
});

/**
 * Cria canais Android
 */
async function createAndroidChannels() {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('convocacoes', {
    name: 'Convocações',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#10B981',
    sound: true,
    enableVibrate: true,
    enableLights: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: true,
  });

  await Notifications.setNotificationChannelAsync('geral', {
    name: 'Notificações Gerais',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#3B82F6',
    sound: true,
    enableVibrate: true,
    enableLights: false,
  });
}

/**
 * Registra push token do usuário na tabela user_push_tokens
 */
export async function registerPushToken(userId: string) {
  if (!userId) return null;
  if (!Device.isDevice) {
    console.warn('[PUSH] Push notifications requerem um dispositivo físico.');
    return null;
  }

  await createAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('[PUSH] Permissão de notificação negada.');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync({
    projectId: '97e01803-b2d1-47cb-b054-26e6c7e0df9e',
  });
  const token = tokenData?.data;
  console.log('[PUSH] Expo token obtido:', token);

  if (token) {
    const { error } = await supabase
      .from('user_push_tokens')
      .upsert({ usuario: userId, expo_push_token: token }, { onConflict: 'usuario' });

    if (error) console.error('[PUSH] Erro ao salvar token:', error);
    else console.log('[PUSH] Token salvo no user_push_tokens para usuário:', userId);
  }

  return token;
}

/**
 * Notificação local
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  channelId: string = 'geral'
) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default', badge: 1 },
      trigger: null,
      identifier: `local_${Date.now()}`,
    });
  } catch (error) {
    console.error('[PUSH] Erro ao agendar notificação local:', error);
    throw error;
  }
}

/**
 * Limpar todas as notificações
 */
export async function clearAllNotifications() {
  await Notifications.dismissAllNotificationsAsync();
  await Notifications.setBadgeCountAsync(0);
}
