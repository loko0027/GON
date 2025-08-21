import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

type TableName =
  | 'convocacoes'
  | 'saldos'
  | 'avaliacoes_goleiro'
  | 'avaliacoes_organizador'
  | 'presencas'
  | 'usuarios';

interface UseDataWithRealtimeProps {
  loadFunction: () => Promise<any[]>; // função que busca dados
  tables: TableName[];                // tabelas que a página quer ouvir
}

export function useDataWithRealtime({ loadFunction, tables }: UseDataWithRealtimeProps) {
  const [data, setData] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Função que carrega dados
  const loadData = useCallback(async () => {
    try {
      const result = await loadFunction();
      setData(result);
    } catch (err) {
      console.error('[LOAD DATA] Erro ao buscar dados:', err);
    }
  }, [loadFunction]);

  // Pull-to-refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Busca inicial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Realtime
  useEffect(() => {
    if (!tables || tables.length === 0) return;

    const channel = supabase.channel('realtime_global');

    tables.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        (payload) => {
          const timestamp = new Date().toLocaleTimeString();
          console.log(`[${timestamp}] [REALTIME] Tabela: ${table}`);
          console.log(`Evento: ${payload.eventType}`);
          loadData();
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
  }, [loadData, tables]);

  return { data, refreshing, onRefresh };
}
