import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/contexts/AppContext';

export function useAutoRefund() {
  const { loadData } = useApp();

  useEffect(() => {
    /**
     * Processa estornos e liberações automáticas.
     */
    const processRefundsAndReleases = async () => {
      console.log('[AUTO_REFUND] Iniciando rotina de estorno e liberação...');

      await processEstornosRecusados();
      await processLiberacoesAutomatica();

      console.log('[AUTO_REFUND] Rotina concluída.');
      await loadData();
    };

    /**
     * Estornos de convocações recusadas
     */
    const processEstornosRecusados = async () => {
      try {
        console.log('[AUTO_REFUND] Verificando convocações recusadas pendentes...');

        const { data: recusadas, error } = await supabase
          .from('convocacoes')
          .select('*')
          .eq('status', 'recusado')
          .eq('estorno_solicitado', false);

        if (error) throw error;
        if (!recusadas || recusadas.length === 0) {
          console.log('[AUTO_REFUND] Nenhum estorno pendente.');
          return;
        }

        for (const convocacao of recusadas) {
          console.log(`[AUTO_REFUND] Estornando convocação ${convocacao.id} para organizador ${convocacao.organizador_id}`);

          // 1️⃣ Buscar saldo do organizador
          const { data: saldoOrg, error: saldoOrgError } = await supabase
            .from('saldos')
            .select('saldo_coins, saldo_retido')
            .eq('usuario_id', convocacao.organizador_id)
            .single();

          if (saldoOrgError) throw saldoOrgError;

          const novoSaldoCoins = (saldoOrg?.saldo_coins || 0) + convocacao.valor_retido;
          const novoSaldoRetido = (saldoOrg?.saldo_retido || 0) - convocacao.valor_retido;

          // 2️⃣ Atualizar saldo do organizador
          const { error: updateSaldoError } = await supabase
            .from('saldos')
            .update({
              saldo_coins: novoSaldoCoins,
              saldo_retido: novoSaldoRetido
            })
            .eq('usuario_id', convocacao.organizador_id);

          if (updateSaldoError) throw updateSaldoError;

          // 3️⃣ Marcar estorno solicitado
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

    /**
     * Liberações automáticas de coins para goleiro
     */
    const processLiberacoesAutomatica = async () => {
      try {
        console.log('[AUTO_REFUND] Verificando convocações para liberação automática...');

        const corte = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: paraLiberar, error } = await supabase
          .from('convocacoes')
          .select('*')
          .eq('status', 'aceito')
          .eq('presenca_status', 'compareceu')
          .eq('liberacao_automatica', false)
          .lt('data_hora_fim', corte);

        if (error) throw error;
        if (!paraLiberar || paraLiberar.length === 0) {
          console.log('[AUTO_REFUND] Nenhuma liberação pendente.');
          return;
        }

        for (const c of paraLiberar) {
          console.log(`[AUTO_REFUND] Liberando coins para goleiro ${c.goleiro_id}, convocação ${c.id}`);

          // Atualiza saldo do organizador (retirando retido)
          const { data: saldoOrg, error: saldoOrgError } = await supabase
            .from('saldos')
            .select('saldo_retido')
            .eq('usuario_id', c.organizador_id)
            .single();
          if (saldoOrgError) throw saldoOrgError;

          const novoRetido = (saldoOrg?.saldo_retido || 0) - c.valor_retido;

          await supabase
            .from('saldos')
            .update({ saldo_retido: novoRetido })
            .eq('usuario_id', c.organizador_id);

          // Atualiza saldo do goleiro
          const { data: saldoGol, error: saldoGolError } = await supabase
            .from('saldos')
            .select('saldo_coins')
            .eq('usuario_id', c.goleiro_id)
            .single();
          if (saldoGolError) throw saldoGolError;

          const novoSaldoGoleiro = (saldoGol?.saldo_coins || 0) + c.valor_retido;

          await supabase
            .from('saldos')
            .upsert(
              { usuario_id: c.goleiro_id, saldo_coins: novoSaldoGoleiro },
              { onConflict: 'usuario_id' }
            );

          // Marca liberação automática
          await supabase
            .from('convocacoes')
            .update({
              liberacao_automatica: true,
              data_liberacao_automatica: new Date().toISOString()
            })
            .eq('id', c.id);

          console.log(`[AUTO_REFUND] Liberação da convocação ${c.id} concluída.`);
        }
      } catch (err) {
        console.error('[AUTO_REFUND] Erro ao processar liberações automáticas:', err);
      }
    };

    // ⏱ Intervalo duplo para estornos recusados
    const timeout1 = setTimeout(processRefundsAndReleases, 30 * 1000); // 30s
    const timeout2 = setTimeout(processRefundsAndReleases, 60 * 1000); // 60s
    const intervalRegular = setInterval(processRefundsAndReleases, 2 * 60 * 1000); // a cada 2 min

    // Executa imediatamente ao carregar
    processRefundsAndReleases();

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
      clearInterval(intervalRegular);
    };
  }, [loadData]);
}
