import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeUpdates(loadDataFunction: () => Promise<void>) {
  useEffect(() => {
    console.log('[REALTIME] Configurando subscriptions...');

    // Subscription para convocações
    const convocacoesSubscription = supabase
      .channel('convocacoes_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'convocacoes' },
        (payload) => {
          console.log('[REALTIME] Mudança em convocações:', payload);
          loadDataFunction();
        }
      )
      .subscribe();

    // Subscription para saldos
    const saldosSubscription = supabase
      .channel('saldos_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'saldos' },
        (payload) => {
          console.log('[REALTIME] Mudança em saldos:', payload);
          loadDataFunction();
        }
      )
      .subscribe();

    // Subscription para avaliações
    const avaliacoesGoleiroSubscription = supabase
      .channel('avaliacoes_goleiro_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avaliacoes_goleiro' },
        (payload) => {
          console.log('[REALTIME] Mudança em avaliações de goleiro:', payload);
          loadDataFunction();
        }
      )
      .subscribe();

    const avaliacoesOrganizadorSubscription = supabase
      .channel('avaliacoes_organizador_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'avaliacoes_organizador' },
        (payload) => {
          console.log('[REALTIME] Mudança em avaliações de organizador:', payload);
          loadDataFunction();
        }
      )
      .subscribe();

    // Subscription para presenças
    const presencasSubscription = supabase
      .channel('presencas_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'presencas' },
        (payload) => {
          console.log('[REALTIME] Mudança em presenças:', payload);
          loadDataFunction();
        }
      )
      .subscribe();

    // Subscription para usuários (aprovações)
    const usuariosSubscription = supabase
      .channel('usuarios_realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'usuarios' },
        (payload) => {
          console.log('[REALTIME] Mudança em usuários:', payload);
          loadDataFunction();
        }
      )
      .subscribe();

    return () => {
      console.log('[REALTIME] Removendo subscriptions...');
      supabase.removeChannel(convocacoesSubscription);
      supabase.removeChannel(saldosSubscription);
      supabase.removeChannel(avaliacoesGoleiroSubscription);
      supabase.removeChannel(avaliacoesOrganizadorSubscription);
      supabase.removeChannel(presencasSubscription);
      supabase.removeChannel(usuariosSubscription);
    };
  }, [loadDataFunction]);
}