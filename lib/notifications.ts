import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configurar comportamento das notificações
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidImportance.HIGH,
  }),
});

export async function registerForPushNotifications() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('convocacoes', {
      name: 'Convocações',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#10B981',
      sound: true,
      enableVibrate: true,
      enableLights: true,
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });

    // Canal para notificações gerais
    await Notifications.setNotificationChannelAsync('geral', {
      name: 'Notificações Gerais',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#3B82F6',
      sound: true,
      enableVibrate: true,
    });
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

  try {
    token = await Notifications.getExpoPushTokenAsync({
      projectId: '97e01803-b2d1-47cb-b054-26e6c7e0df9e', // Seu project ID do app.json
    });
    console.log('Push token:', token.data);
  } catch (error) {
    console.error('Erro ao obter push token:', error);
  }

  return token?.data;
}

export async function sendConvocacaoNotification(
  goleiroToken: string,
  organizadorNome: string,
  valorCoins: number,
  local: string
) {
  try {
    const message = {
      to: goleiroToken,
      sound: 'default',
      title: '🧤 Nova Convocação!',
      body: `O organizador ${organizadorNome} está te convocando no valor de ${valorCoins} coins para jogar hoje no ${local}.`,
      data: {
        type: 'convocacao',
        organizador: organizadorNome,
        valor: valorCoins,
        local: local,
      },
      channelId: 'convocacoes',
      priority: 'max',
      badge: 1,
      vibrate: [0, 250, 250, 250],
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Notificação enviada:', result);
    return result;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    throw error;
  }
}

export async function scheduleLocalNotification(
  title: string,
  body: string,
  data?: any,
  channelId: string = 'geral'
) {
  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: 'default',
        badge: 1,
        vibrate: [0, 250, 250, 250],
        priority: Notifications.AndroidImportance.HIGH,
      },
      trigger: null,
      identifier: `local_${Date.now()}`,
    });
    return id;
  } catch (error) {
    console.error('Erro ao agendar notificação local:', error);
    throw error;
  }
}

// Função para testar notificações
export async function testNotification() {
  try {
    await scheduleLocalNotification(
      '🧤 Teste de Notificação - GoleiroON',
      'Esta é uma notificação de teste com vibração e som!',
      { test: true },
      'convocacoes'
    );
    console.log('Notificação de teste enviada');
  } catch (error) {
    console.error('Erro ao enviar notificação de teste:', error);
  }
}

// Função para notificar confirmação de presença
export async function notifyPresenceConfirmed(
  goleiroToken: string,
  organizadorNome: string,
  coinsLiberados: number,
  local: string
) {
  try {
    const message = {
      to: goleiroToken,
      sound: 'default',
      title: '✅ Presença Confirmada!',
      body: `${organizadorNome} confirmou sua presença! Você recebeu ${coinsLiberados} coins pelo jogo no ${local}.`,
      data: {
        type: 'presenca_confirmada',
        organizador: organizadorNome,
        coins: coinsLiberados,
        local: local,
      },
      channelId: 'convocacoes',
      priority: 'high',
      badge: 1,
      vibrate: [0, 250, 250, 250],
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log('Notificação de presença enviada:', result);
    return result;
  } catch (error) {
    console.error('Erro ao enviar notificação de presença:', error);
    throw error;
  }
}