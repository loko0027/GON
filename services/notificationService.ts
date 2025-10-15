import { Alert } from 'react-native';
// ===== ADIÇÃO: Importa o supabase para chamar a Edge Function =====
import { supabase } from '@/lib/supabase';

// Tipos de notificação (sem alteração)
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

// Interface de dados (alterada para ser mais flexível, não exige mais 'message')
export interface NotificationData {
  [key: string]: any;
}

export const notificationService = {
  // ===== FUNÇÃO MODIFICADA PARA FUNCIONAR DE VERDADE =====
  async sendPushNotification(
    userId: string, 
    type: NotificationType, 
    data: NotificationData
  ): Promise<void> {
    try {
      // 1. Pega a mensagem correta baseada no tipo de notificação
      const message = this.getNotificationMessage(type, data);
      
      // 2. Pega o título (pode ser passado nos dados ou usa um padrão)
      const title = data.title || 'GoleiroON - Nova Atividade!';

      console.log(`Disparando Edge Function 'send-notification' para o usuário ${userId}`);
      
      // 3. Chama a sua Edge Function 'send-notification' no Supabase
      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: userId,
          title: title,
          message: message,
        },
      });

      if (error) {
        throw error; // Joga o erro para ser pego pelo bloco catch abaixo
      }

      console.log('Edge Function chamada com sucesso.');

    } catch (error) {
      console.error('Erro ao chamar a Edge Function de notificação:', error);
      // Opcional: Você pode querer avisar o usuário que a notificação falhou,
      // mas a ação principal (ex: convocação) foi concluída.
      // Alert.alert("Aviso", "A ação foi concluída, mas não foi possível enviar a notificação.");
    }
  },

  // Notificar múltiplos usuários (sem alteração, agora funciona de verdade)
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

  // Mensagens padrão para cada tipo de notificação (sem alteração)
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
      'conta_aprovada': 'Sua conta foi aprovada! Bem-vindo ao GoleiroON.',
      'conta_rejeitada': 'Sua conta foi rejeitada. Entre em contato com o suporte.'
    };

    return messages[type] || 'Nova notificação';
  }
};

// Exportações para compatibilidade (sem alteração)
export const sendPushNotification = notificationService.sendPushNotification;
export const notifyMultipleUsers = notificationService.notifyMultipleUsers;