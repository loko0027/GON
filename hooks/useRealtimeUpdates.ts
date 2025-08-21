import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeUpdates(loadDataFunction: () => Promise<void>) {
  useEffect(() => {
    console.log('[REALTIME] Configurando subscription única...');

    const channel = supabase.channel('realtime_global');

    const tables = [
      'convocacoes',
      'saldos',
      'avaliacoes_goleiro',
      'avaliacoes_organizador',
      'presencas',
      'usuarios',
    ];

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] [REALTIME] Tabela: ${table}`);
          console.log(`Evento: ${payload.eventType}`);
          console.log('Dados da linha:', payload.new || payload.old);
          loadDataFunction();
        }
      );
    });

    channel.subscribe()
      .then(() => console.log('[REALTIME] Subscription ativa no canal global'))
      .catch((err) => console.error('[REALTIME] Erro ao ativar subscription:', err));

    return () => {
      console.log('[REALTIME] Removendo subscription global...');
      supabase.removeChannel(channel);
    };
  }, [loadDataFunction]);
}
