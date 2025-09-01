import { supabase } from '@/lib/supabase';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type NotificationType = 
  | 'new_convocacao'
  | 'convocacao_aceita'
  | 'convocacao_recusada'
  | 'recarga_aprovada'
  | 'recarga_rejeitada'
  | 'saque_aprovado'
  | 'saque_rejeitado'
  | 'avaliacao_recebida'
  | 'chamado_atualizado'
  | 'welcome';

export const sendPushNotification = async (
  userId: string,
  type: NotificationType,
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    // 1. Buscar todos os tokens do usuário na tabela user_push_tokens
    const { data: tokens, error } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('usuario', userId);

    if (error || !tokens?.length) {
      console.warn(`Tokens não encontrados para usuário ${userId}`);
      return;
    }

    // 2. Buscar o nome do usuário (opcional, para mensagens personalizadas)
    const { data: userData } = await supabase
      .from('usuarios')
      .select('nome')
      .eq('id', userId)
      .single();

    const userName = userData?.nome || 'Usuário';

    // 3. Criar conteúdo da notificação
    const { title, body } = getNotificationContent(type, additionalData, userName);

    // 4. Configurar canal de notificação para Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // 5. Enviar notificação para cada token
    for (const t of tokens) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          data: { type, userId, ...additionalData },
        },
        trigger: null,
      });
    }

    console.log(`Notificação enviada para ${userId}: ${title} - ${body}`);
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
  }
};

const getNotificationContent = (
  type: NotificationType,
  data: any = {},
  userName?: string
): { title: string; body: string } => {
  const messages = {
    'new_convocacao': {
      title: 'Nova Convocação!',
      body: `${data.organizadorNome || 'Um organizador'} te convocou para um jogo`
    },
    'convocacao_aceita': {
      title: 'Convocação Aceita!',
      body: `${userName || 'Um goleiro'} aceitou sua convocação`
    },
    'convocacao_recusada': {
      title: 'Convocação Recusada',
      body: `${userName || 'Um goleiro'} recusou sua convocação`
    },
    'recarga_aprovada': {
      title: 'Recarga Aprovada!',
      body: `Sua recarga de ${data.coins || '0'} coins foi aprovada`
    },
    'recarga_rejeitada': {
      title: 'Recarga Rejeitada',
      body: `Sua recarga de ${data.coins || '0'} coins foi rejeitada`
    },
    'saque_aprovado': {
      title: 'Saque Aprovado!',
      body: `Seu saque de R$${data.valor || '0,00'} foi processado`
    },
    'saque_rejeitado': {
      title: 'Saque Rejeitado',
      body: `Seu saque de R$${data.valor || '0,00'} foi rejeitado`
    },
    'avaliacao_recebida': {
      title: 'Nova Avaliação!',
      body: `Você recebeu uma avaliação de ${data.nota || '5'} estrelas`
    },
    'chamado_atualizado': {
      title: 'Atualização no Chamado',
      body: `Status atualizado: ${data.status || 'Atualizado'}`
    },
    'welcome': {
      title: 'Bem-vindo!',
      body: data.message || 'Seu dispositivo está configurado para receber notificações'
    }
  };

  return messages[type] || {
    title: 'Nova Notificação',
    body: 'Você tem uma nova atualização no app'
  };
};
