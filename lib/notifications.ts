import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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
 * Solicita permissão e retorna o token (Web ignorado)
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      console.log('[NOTIFICATIONS] Ignorado no Web.');
      return null;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[NOTIFICATIONS] Permissão negada');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData?.data || null;
  } catch (err) {
    console.error('[NOTIFICATIONS] Erro ao obter token:', err);
    return null;
  }
}

/**
 * Envia push via Expo
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: any,
  channelId: string = 'default'
) {
  try {
    const message = {
      to: token,
      sound: 'default',
      title,
      body,
      data,
      channelId,
      priority: 'high',
      badge: 1,
      vibrate: [0, 250, 250, 250],
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('[NOTIFICATIONS] Notificação enviada:', result);
    return result;
  } catch (err) {
    console.error('[NOTIFICATIONS] Erro ao enviar notificação:', err);
    throw err;
  }
}

/**
 * Agendar notificação local
 */
export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  channelId: string = 'default'
) {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: { title, body, data, sound: 'default', badge: 1 },
      trigger: null,
      identifier: `local_${Date.now()}`,
    });
  } catch (err) {
    console.error('[NOTIFICATIONS] Erro ao agendar notificação local:', err);
    throw err;
  }
}
