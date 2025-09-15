import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/contexts/AppContext';

export function useAutoRefund() {
  const { loadData } = useApp();

  useEffect(() => {
    /**
     * Processa estornos e liberações automáticas.
     * Agora chama as funções RPC para executar a lógica no banco de dados.
     */
    const processRefundsAndReleases = async () => {
      console.log('[AUTO_REFUND] Iniciando rotina de estorno e liberação...');

      // --- Processa Estornos de convocações recusadas ---
      try {
        console.log('[AUTO_REFUND] Verificando convocações recusadas pendentes...');

        // Busca apenas os IDs das convocações pendentes
        const { data: recusadas } = await supabase
          .from('convocacoes')
          .select('id')
          .eq('status', 'recusado')
          .eq('estorno_solicitado', false);

        if (!recusadas || recusadas.length === 0) {
          console.log('[AUTO_REFUND] Nenhum estorno pendente.');
        } else {
          for (const convocacao of recusadas) {
            // Chama a função RPC para executar o estorno de forma segura e atômica
            await supabase.rpc('process_estorno_recusado', { convocacao_id: convocacao.id });
            console.log(`[AUTO_REFUND] Estorno da convocação ${convocacao.id} concluído.`);
          }
        }
      } catch (err) {
        console.error('[AUTO_REFUND] Erro ao processar estornos:', err);
      }

      // --- Liberações automáticas de coins para goleiro ---
      try {
        console.log('[AUTO_REFUND] Verificando convocações para liberação automática...');

        const corte = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Busca apenas os IDs das convocações para liberar
        const { data: paraLiberar } = await supabase
          .from('convocacoes')
          .select('id')
          .eq('status', 'aceito')
          .eq('presenca_status', 'compareceu')
          .eq('liberacao_automatica', false)
          .lt('data_hora_fim', corte);

        if (!paraLiberar || paraLiberar.length === 0) {
          console.log('[AUTO_REFUND] Nenhuma liberação pendente.');
        } else {
          for (const c of paraLiberar) {
            // Chama a função RPC para executar a liberação de forma segura
            await supabase.rpc('process_liberacao_automatica', { convocacao_id: c.id });
            console.log(`[AUTO_REFUND] Liberação da convocação ${c.id} concluída.`);
          }
        }
      } catch (err) {
        console.error('[AUTO_REFUND] Erro ao processar liberações automáticas:', err);
      }

      console.log('[AUTO_REFUND] Rotina concluída.');
      await loadData();
    };

    // ⏱ Intervalo duplo para estornos e liberações
    const timeout1 = setTimeout(processRefundsAndReleases, 30 * 1000); // 30s
    const timeout2 = setTimeout(processRefundsAndReleases, 60 * 1000); // 60s
    const intervalRegular = setInterval(processRefundsAndReleases, 2 * 60 * 1000); // a cada 2 min

    // Executa imediatamente ao carregar
    processRefundsAndReleases();

    // Limpa os timers ao desmontar o componente
    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearInterval(intervalRegular);
    };
  }, [loadData]);
}