import { supabase } from '@/lib/supabase';
import { SaquePix } from '@/types';
import { Alert } from 'react-native';
import { sendPushNotification, notifyMultipleUsers } from './notificationService';

export const saquePixService = {
  // Carregar saques
  async loadSaques(): Promise<SaquePix[]> {
    try {
      const { data, error } = await supabase
        .from('saques_pix')
        .select(`*, goleiro:usuarios(id, nome, email)`);
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao carregar saques:', error);
      return [];
    }
  },

  // Solicitar saque
  // ✅ Lógica correta: move coins do saldo normal para o saldo retido.
  async solicitarSaque(
    saque: Omit<SaquePix, 'id' | 'created_at'>, 
    userId: string, 
    userNome: string,
    getSaldoUsuario: () => any,
    allUsers: any[]
  ): Promise<void> {
    try {
      const saldoUsuario = getSaldoUsuario();
      if (saldoUsuario.saldo_coins < saque.valor_coins) {
        throw new Error('Saldo insuficiente para realizar o saque');
      }

      // Cria registro do saque com status 'pendente'
      const { error } = await supabase
        .from('saques_pix')
        .insert({
          ...saque,
          goleiro_id: userId,
          status: 'pendente'
        });

      if (error) throw error;

      // Atualiza saldo: tira dos coins e joga no retido
      await supabase
        .from('saldos')
        .update({ 
          saldo_coins: saldoUsuario.saldo_coins - saque.valor_coins,
          saldo_retido: (saldoUsuario.saldo_retido || 0) + saque.valor_coins
        })
        .eq('usuario_id', userId);

      // Notificar admins
      const administradores = allUsers.filter(u => u.tipo_usuario === 'admin');
      await notifyMultipleUsers(
        administradores.map(admin => admin.id),
        'saque_solicitado',
        {
          valor: saque.valor_coins,
          goleiroId: userId,
          goleiroNome: userNome
        }
      );

      Alert.alert('Sucesso', 'Solicitação de saque enviada para aprovação!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível solicitar o saque');
      throw error;
    }
  },

  // Aprovar saque
  // ✅ Lógica correta: remove o valor APENAS do saldo retido, "destruindo" os coins.
  async aprovarSaque(saqueId: string): Promise<void> {
    try {
      const { data: saque, error: saqueError } = await supabase
        .from('saques_pix')
        .select('goleiro_id, valor_coins')
        .eq('id', saqueId)
        .single();

      if (saqueError || !saque) throw new Error('Saque não encontrado');
      const { goleiro_id, valor_coins } = saque;

      // Debita do retido (destrói os coins)
      const { data: saldoAtual } = await supabase
        .from('saldos')
        .select('saldo_retido')
        .eq('usuario_id', goleiro_id)
        .single();

      if (saldoAtual) {
        await supabase
          .from('saldos')
          .update({
            saldo_retido: Math.max(0, saldoAtual.saldo_retido - valor_coins)
          })
          .eq('usuario_id', goleiro_id);
      }

      // Atualiza status
      await supabase
        .from('saques_pix')
        .update({ status: 'aprovado' })
        .eq('id', saqueId);

      await sendPushNotification(goleiro_id, 'saque_aprovado', { valor: valor_coins });
      Alert.alert('Sucesso', 'Saque aprovado com sucesso!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível aprovar o saque');
      throw error;
    }
  },

  // Rejeitar saque
  // ✅ Lógica correta: move coins do saldo retido de volta para o saldo normal.
  async rejeitarSaque(saqueId: string): Promise<void> {
    try {
      const { data: saque, error: saqueError } = await supabase
        .from('saques_pix')
        .select('goleiro_id, valor_coins')
        .eq('id', saqueId)
        .single();

      if (saqueError || !saque) throw new Error('Saque não encontrado');
      const { goleiro_id, valor_coins } = saque;

      const { data: saldoAtual } = await supabase
        .from('saldos')
        .select('saldo_coins, saldo_retido')
        .eq('usuario_id', goleiro_id)
        .single();

      if (saldoAtual) {
        // Remove do retido e devolve para o saldo normal
        await supabase
          .from('saldos')
          .update({
            saldo_coins: saldoAtual.saldo_coins + valor_coins,
            saldo_retido: Math.max(0, saldoAtual.saldo_retido - valor_coins)
          })
          .eq('usuario_id', goleiro_id);
      }

      // Atualiza status
      await supabase
        .from('saques_pix')
        .update({ status: 'rejeitado' })
        .eq('id', saqueId);

      await sendPushNotification(goleiro_id, 'saque_rejeitado', { valor: valor_coins });
      Alert.alert('Sucesso', 'Saque rejeitado e valor devolvido ao saldo!');
    } catch (error: any) {
      Alert.alert('Erro', error.message || 'Não foi possível rejeitar o saque');
      throw error;
    }
  },

  // Obter saques pendentes
  getSaquesPendentes(saques: SaquePix[]): SaquePix[] {
    return saques.filter(saque => saque.status === 'pendente');
  },

  // Obter transações do usuário
  getTransacoesUsuario(saques: SaquePix[], userId: string | null) {
    if (!userId) return { saques: [] };
    
    return {
      saques: saques.filter(s => s.goleiro_id === userId)
    };
  }
};