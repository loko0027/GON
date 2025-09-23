import { Alert } from 'react-native';

// Tipos de notificação
export type NotificationType = 
  | 'new_convocacao'
  | 'convocacao_aceita'
  | 'convocacao_recusada'
  | 'avaliacao_recebida'
  | 'presenca_confirmada'
  | 'recarga_solicitada'
  | 'recarga_aprovada'
  | 'recarga_rejeitada'
  | 'saque_solicitado'
  | 'saque_aprovado'
  | 'saque_rejeitado'
  | 'coins_recebidos'
  | 'novo_chamado'
  | 'chamado_atualizado'
  | 'nova_mensagem_suporte'
  | 'conta_aprovada'
  | 'conta_rejeitada';

export interface NotificationData {
  message: string;
  [key: string]: any;
}

export const notificationService = {
  // Enviar notificação para um usuário
  async sendPushNotification(
    userId: string, 
    type: NotificationType, 
    data: NotificationData
  ): Promise<void> {
    try {
      // Aqui você integraria com seu serviço de push notification
      // Por exemplo: OneSignal, Expo Notifications, etc.
      console.log(`Notificação enviada para ${userId}:`, { type, data });
      
      // Simulação de envio
      // await yourNotificationService.send({ userId, type, data });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
    }
  },

  // Notificar múltiplos usuários
  async notifyMultipleUsers(
    userIds: string[], 
    type: NotificationType, 
    data: NotificationData
  ): Promise<void> {
    try {
      const promises = userIds.map(userId => 
        this.sendPushNotification(userId, type, data)
      );
      await Promise.all(promises);
    } catch (error) {
      console.error('Erro ao notificar múltiplos usuários:', error);
    }
  },

  // Mensagens padrão para cada tipo de notificação
  getNotificationMessage(type: NotificationType, data: any): string {
    const messages = {
      'new_convocacao': `Nova convocação de ${data.organizadorNome} - Valor: ${data.valor} coins`,
      'convocacao_aceita': `Goleiro ${data.goleiroNome} aceitou sua convocação`,
      'convocacao_recusada': `Goleiro ${data.goleiroNome} recusou sua convocação`,
      'avaliacao_recebida': `Você recebeu uma avaliação de ${data.nota} estrelas`,
      'presenca_confirmada': `Presença confirmada: ${data.status}`,
      'recarga_solicitada': `Nova solicitação de recarga de ${data.organizadorNome}`,
      'recarga_aprovada': `Sua recarga de ${data.coins} coins foi aprovada`,
      'recarga_rejeitada': `Sua recarga de ${data.coins} coins foi rejeitada`,
      'saque_solicitado': `Nova solicitação de saque de ${data.goleiroNome}`,
      'saque_aprovado': `Seu saque de ${data.valor} coins foi aprovado`,
      'saque_rejeitado': `Seu saque de ${data.valor} coins foi rejeitado`,
      'coins_recebidos': `Você recebeu ${data.valor} coins de ${data.remetente}`,
      'novo_chamado': `Novo chamado de suporte de ${data.solicitante}`,
      'chamado_atualizado': `Seu chamado foi atualizado: ${data.status}`,
      'nova_mensagem_suporte': `Nova mensagem no chamado de suporte`,
      'conta_aprovada': 'Sua conta foi aprovada! Bem-vindo ao app.',
      'conta_rejeitada': 'Sua conta foi rejeitada. Entre em contato conosco.'
    };

    return messages[type] || 'Nova notificação';
  }
};

// Exportações para compatibilidade
export const sendPushNotification = notificationService.sendPushNotification;
export const notifyMultipleUsers = notificationService.notifyMultipleUsers;