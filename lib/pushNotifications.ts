// lib/pushNotifications.ts
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

export async function registerPushToken(userId: string) {
  if (!userId) return null;

  if (!Device.isDevice) {
    console.warn('Push notifications requerem um dispositivo físico.');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão de notificação negada');
    return null;
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  const token = tokenData?.data;
  console.log('[PUSH] Expo token obtido:', token);

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }

  if (token) {
    const { error } = await supabase
      .from('usuarios')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('[PUSH] Erro ao salvar token no Supabase:', error);
    } else {
      console.log('[PUSH] Token salvo no Supabase');
    }
  }

  return token;
}
