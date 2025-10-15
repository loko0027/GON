// ARQUIVO: hooks/usePushNotifications.ts

import { useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext'; // Importamos para pegar o usuário

// A configuração do handler fica aqui, no escopo global do arquivo.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

// Esta é a função interna que faz o trabalho pesado. Ela não precisa ser exportada.
async function registerForPushNotificationsAsync(user: any) {
  if (!user) {
    console.log("[Notificação] Usuário não fornecido, cancelando registro de token.");
    return;
  }

  if (!Device.isDevice) {
    console.warn('As notificações Push só funcionam em dispositivos físicos.');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permissão para notificações não concedida.');
    Alert.alert("Permissão Negada", "Para receber alertas, habilite as notificações nas configurações.");
    return;
  }
  
  let token;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      throw new Error('O projectId do EAS não foi encontrado. Verifique a configuração em app.config.js.');
    }
    console.log("[Notificação] Tentando obter o push token...");
    token = (await Notifications.getPushTokenAsync({ projectId })).data;
    console.log(`[Notificação] Token obtido com sucesso: ${token}`);
  } catch (e: any) {
    console.error("ERRO CRÍTICO AO OBTER O PUSH TOKEN:", e);
    Alert.alert(
      "Erro ao Obter Token",
      `Não foi possível configurar as notificações para o seu dispositivo.\n\nMotivo: ${e.message}`,
      [{ text: "OK" }]
    );
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (!token) return;

  // Lógica para salvar o token no Supabase (permanece igual)
  const { data: userData } = await supabase.from('usuarios').select('push_token').eq('id', user.id).single();
  if (userData?.push_token === token) {
      console.log("[Notificação] Push token já está atualizado no banco de dados.");
      return;
  }
  
  console.log(`[Notificação] Salvando novo push token para o usuário ${user.id}`);
  const { error } = await supabase
      .from('usuarios')
      .update({ push_token: token })
      .eq('id', user.id);

  if (error) {
    console.error('[Notificação] Erro ao salvar o push token no Supabase:', error);
    Alert.alert(
        "Erro de Sincronização",
        `Não foi possível salvar a configuração de notificação no seu perfil.\n\nMotivo: ${error.message}`
    );
  } else {
    console.log('[Notificação] Push token salvo com sucesso no perfil do usuário!');
  }
}

// ========================================================================
// ESTE É O HOOK QUE SEU APP REALMENTE USA.
// Ele encapsula toda a lógica e a executa quando o usuário faz login.
// ========================================================================
export function usePushNotifications() {
  const { user } = useAuth(); // Pega o usuário do contexto de autenticação

  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync(user);
    }
  }, [user]); // Roda sempre que o 'user' mudar (login/logout)
}