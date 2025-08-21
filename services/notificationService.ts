import { supabase } from '@/lib/supabase';

type NotificationType =
  | 'new_convocacao'
  | 'convocacao_aceita'
  | 'convocacao_recusada'
  | 'presenca_confirmada'
  | 'recarga_solicitada'
  | 'recarga_aprovada'
  | 'recarga_rejeitada'
  | 'saque_solicitado'
  | 'saque_aprovado'
  | 'saque_rejeitado'
  | 'avaliacao_recebida'
  | 'novo_chamado'
  | 'chamado_atualizado'
  | 'nova_mensagem_suporte'
  | 'welcome'
  | 'conta_aprovada'
  | 'conta_rejeitada'
  | 'coins_recebidos';

export const sendPushNotification = async (
  userId: string,
  type: NotificationType,
  additionalData?: Record<string, any>
): Promise<void> => {
  try {
    // Buscar token na tabela user_push_tokens
    const { data: tokenData, error } = await supabase
      .from('user_push_tokens')
      .select('expo_push_token')
      .eq('usuario', userId)
      .single();

    if (error || !tokenData?.expo_push_token) {
      console.warn(`[SERVICE] Token não encontrado para usuário ${userId}`);
      return;
    }

    const { title, body } = getNotificationContent(type, additionalData);

    const message = {
      to: tokenData.expo_push_token,
      sound: 'default',
      title,
      body,
      data: { type, userId, ...additionalData },
      channelId: type === 'new_convocacao' ? 'convocacoes' : 'geral',
      priority: type === 'new_convocacao' ? 'max' : 'high',
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    console.log(`[SERVICE] Notificação [${type}] enviada para ${userId}:`, result);
  } catch (error) {
    console.error('[SERVICE] Erro ao enviar notificação:', error);
  }
};

const getNotificationContent = (type: NotificationType, data: any = {}) => {
  const messages: Record<string, { title: string; body: string }> = {
    new_convocacao: { title: '🧤 Nova Convocação!', body: `${data.organizadorNome || 'Um organizador'} te convocou` },
    convocacao_aceita: { title: '✅ Convocação Aceita!', body: `${data.userName || 'Um goleiro'} aceitou sua convocação` },
    convocacao_recusada: { title: '❌ Convocação Recusada', body: `${data.userName || 'Um goleiro'} recusou sua convocação` },
    presenca_confirmada: { title: '✅ Presença Confirmada!', body: `Presença confirmada! +${data.coins || '0'} coins` },
    recarga_solicitada: { title: '💰 Recarga Solicitada', body: `Nova recarga de ${data.valor || '0'} coins pendente` },
    recarga_aprovada: { title: '✅ Recarga Aprovada!', body: `Sua recarga de ${data.coins || '0'} coins foi aprovada` },
    recarga_rejeitada: { title: '❌ Recarga Rejeitada', body: `Sua recarga de ${data.coins || '0'} coins foi rejeitada` },
    saque_solicitado: { title: '💸 Saque Solicitado', body: `Novo saque de R$${data.valor || '0,00'} pendente` },
    saque_aprovado: { title: '✅ Saque Aprovado!', body: `Seu saque de R$${data.valor || '0,00'} foi processado` },
    saque_rejeitado: { title: '❌ Saque Rejeitado', body: `Seu saque de R$${data.valor || '0,00'} foi rejeitado` },
    avaliacao_recebida: { title: '⭐ Nova Avaliação!', body: `Você recebeu ${data.nota || '5'} estrelas` },
    novo_chamado: { title: '🆘 Novo Chamado', body: `Chamado: ${data.assunto || 'Suporte'}` },
    chamado_atualizado: { title: '📋 Chamado Atualizado', body: `Seu chamado foi ${data.status || 'atualizado'}` },
    nova_mensagem_suporte: { title: '💬 Nova Mensagem', body: 'Nova mensagem no chamado de suporte' },
    welcome: { title: '🎉 Bem-vindo!', body: 'Seu dispositivo está pronto para receber notificações' },
    conta_aprovada: { title: '✅ Conta Aprovada!', body: 'Sua conta foi aprovada!' },
    conta_rejeitada: { title: '❌ Conta Rejeitada', body: 'Sua conta foi rejeitada.' },
    coins_recebidos: { title: '💰 Coins Recebidos!', body: `${data.remetente || 'Alguém'} te enviou ${data.valor || '0'} coins` },
  };

  return messages[type] || { title: '📢 Nova Notificação', body: 'Você tem uma nova atualização' };
};

/**
 * Notifica múltiplos usuários
 */
export const notifyMultipleUsers = async (
  userIds: string[],
  type: NotificationType,
  additionalData?: Record<string, any>
) => {
  for (const userId of userIds) {
    await sendPushNotification(userId, type, additionalData);
  }
};
