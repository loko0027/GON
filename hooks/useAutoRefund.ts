import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/contexts/AppContext';

export function useAutoRefund() {
  const { loadData } = useApp();

  useEffect(() => {
    const processAutoRefundAndRelease = async () => {
      console.log('[AUTO_REFUND] Iniciando rotina de estornos e liberação automática...');

      await processEstornosRecusados();
      await processLiberacoesViaRPC();

      console.log('[AUTO_REFUND] Rotina concluída.');
      await loadData();
    };

    // === Estornos de convocações recusadas ===
    const processEstornosRecusados = async () => {
      try {
        const { data: recusadas, error } = await supabase
          .from('convocacoes')
          .select('*')
          .eq('status', 'recusado')
          .eq('estorno_solicitado', false);

        if (error) throw error;
        if (!recusadas?.length) return;

        for (const convocacao of recusadas) {
          const { data: saldoOrg, error: saldoOrgError } = await supabase
            .from('saldos')
            .select('saldo_coins, saldo_retido')
            .eq('usuario_id', convocacao.organizador_id)
            .single();
          if (saldoOrgError) throw saldoOrgError;

          const novoSaldoCoins = (saldoOrg?.saldo_coins || 0) + convocacao.valor_retido;
          const novoSaldoRetido = (saldoOrg?.saldo_retido || 0) - convocacao.valor_retido;

          const { error: updateSaldoError } = await supabase
            .from('saldos')
            .update({ saldo_coins: novoSaldoCoins, saldo_retido: novoSaldoRetido })
            .eq('usuario_id', convocacao.organizador_id);
          if (updateSaldoError) throw updateSaldoError;

          const { error: updateConvError } = await supabase
            .from('convocacoes')
            .update({ estorno_solicitado: true })
            .eq('id', convocacao.id);
          if (updateConvError) throw updateConvError;

          console.log(`[AUTO_REFUND] Estorno da convocação ${convocacao.id} concluído.`);
        }
      } catch (err) {
        console.error('[AUTO_REFUND] Erro ao processar estornos:', err);
      }
    };

    // === Liberação automática via RPC ===
    const processLiberacoesViaRPC = async () => {
      try {
        const { data, error } = await supabase.rpc('liberar_coins_automaticamente');
        if (error) throw error;
        console.log('[AUTO_REFUND] Liberações automáticas via RPC concluídas', data);
      } catch (err) {
        console.error('[AUTO_REFUND] Erro ao processar liberação automática via RPC:', err);
      }
    };

    // Executa imediatamente
    processAutoRefundAndRelease();

    // Intervalo de 2 minutos
    const interval = setInterval(processAutoRefundAndRelease, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadData]);
}
