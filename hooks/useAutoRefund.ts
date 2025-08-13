import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useApp } from '@/contexts/AppContext';

export function useAutoRefund() {
  const { loadData } = useApp();

  useEffect(() => {
    /**
     * Orquestra os processos de estorno e liberação de fundos.
     * Esta é a função principal que será executada em intervalos regulares.
     */
    const runRefundAndLiberationProcess = async () => {
      console.log('[AUTO_REFUND] Iniciando rotina de estorno e liberação...');
      
      // 1. Processa convocações recusadas para estornar o valor retido
      await checkForAutoRefunds();
      
      // 2. Processa convocações finalizadas para liberar os coins ao goleiro
      await checkForAutoLiberations();
      
      console.log('[AUTO_REFUND] Rotina finalizada.');
      
      // 3. Recarrega os dados da aplicação para refletir as mudanças
      await loadData();
    };

    /**
     * Verifica e processa convocações recusadas para estornar o valor retido
     * para o saldo do organizador.
     */
    const checkForAutoRefunds = async () => {
      try {
        console.log('[AUTO_REFUND] Verificando convocações recusadas...');

        // Busca convocações com status 'recusado' que ainda não foram estornadas
        const { data: convocacoesRecusadas, error } = await supabase
          .from('convocacoes')
          .select('*')
          .eq('status', 'recusado')
          .eq('estorno_solicitado', false)
          .not('organizador_id', 'is', null);

        if (error) throw error;
        if (convocacoesRecusadas.length === 0) {
          console.log('[AUTO_REFUND] Nenhum estorno pendente de convocações recusadas.');
          return;
        }

        for (const convocacao of convocacoesRecusadas) {
          console.log(`[AUTO_REFUND] Estornando coins para a convocação ${convocacao.id}`);
          
          // 1. Buscar o saldo atual do organizador
          const { data: saldoData, error: saldoFetchError } = await supabase
            .from('saldos')
            .select('saldo_coins, saldo_retido')
            .eq('usuario_id', convocacao.organizador_id)
            .single();

          if (saldoFetchError) throw saldoFetchError;

          // 2. Calcula o novo saldo e o saldo retido
          const novoSaldoCoins = (saldoData.saldo_coins || 0) + convocacao.valor_retido;
          const novoSaldoRetido = (saldoData.saldo_retido || 0) - convocacao.valor_retido;

          // 3. Atualiza o saldo do organizador
          const { error: saldoUpdateError } = await supabase
            .from('saldos')
            .update({
              saldo_coins: novoSaldoCoins,
              saldo_retido: novoSaldoRetido
            })
            .eq('usuario_id', convocacao.organizador_id);

          if (saldoUpdateError) throw saldoUpdateError;
          
          // 4. Marca a convocação como estorno solicitado para evitar reprocessamento
          const { error: updateError } = await supabase
            .from('convocacoes')
            .update({ estorno_solicitado: true })
            .eq('id', convocacao.id);

          if (updateError) throw updateError;
          
          console.log(`[AUTO_REFUND] Estorno da convocação ${convocacao.id} concluído.`);
        }
      } catch (error) {
        console.error('[AUTO_REFUND] Erro ao processar estornos automáticos:', error);
      }
    };
    
    /**
     * Verifica e processa convocações finalizadas para liberar o valor
     * retido para o saldo do goleiro.
     */
    const checkForAutoLiberations = async () => {
      try {
        console.log('[AUTO_REFUND] Verificando convocações para liberação automática...');
        
        // Define o ponto de corte: 24 horas após o fim da convocação
        const cutOffTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        // Busca convocações aceitas, com presença confirmada e que já terminaram
        const { data: convocacoesParaLiberar, error } = await supabase
          .from('convocacoes')
          .select('*')
          .eq('status', 'aceito')
          .eq('presenca_status', 'compareceu')
          .eq('liberacao_automatica', false) // Somente as que ainda não foram liberadas
          .lt('data_hora_fim', cutOffTime);

        if (error) throw error;
        if (convocacoesParaLiberar.length === 0) {
          console.log('[AUTO_REFUND] Nenhuma liberação pendente.');
          return;
        }
        
        for (const convocacao of convocacoesParaLiberar) {
          console.log(`[AUTO_REFUND] Liberando coins para convocação ${convocacao.id}`);
          
          // 1. Atualiza o saldo do organizador (diminui o retido)
          const { data: saldoOrganizador, error: saldoOrgError } = await supabase
            .from('saldos')
            .select('saldo_retido')
            .eq('usuario_id', convocacao.organizador_id)
            .single();

          if (saldoOrgError) throw saldoOrgError;
          
          const novoSaldoRetidoOrganizador = (saldoOrganizador?.saldo_retido || 0) - convocacao.valor_retido;

          await supabase
            .from('saldos')
            .update({ saldo_retido: novoSaldoRetidoOrganizador })
            .eq('usuario_id', convocacao.organizador_id);

          // 2. Atualiza o saldo do goleiro (adiciona os coins)
          const { data: saldoGoleiro, error: saldoGolError } = await supabase
            .from('saldos')
            .select('saldo_coins')
            .eq('usuario_id', convocacao.goleiro_id)
            .single();

          if (saldoGolError) throw saldoGolError;

          const novoSaldoCoinsGoleiro = (saldoGoleiro?.saldo_coins || 0) + convocacao.valor_retido;

          await supabase
            .from('saldos')
            .upsert({
              usuario_id: convocacao.goleiro_id,
              saldo_coins: novoSaldoCoinsGoleiro
            }, { onConflict: 'usuario_id' });

          // 3. Marca a convocação como liberada para evitar reprocessamento
          const { error: updateError } = await supabase
            .from('convocacoes')
            .update({
              liberacao_automatica: true,
              data_liberacao_automatica: new Date().toISOString()
            })
            .eq('id', convocacao.id);

          if (updateError) throw updateError;
          
          console.log(`[AUTO_REFUND] Liberação da convocação ${convocacao.id} concluída.`);
        }
      } catch (error) {
        console.error('[AUTO_REFUND] Erro ao processar liberações automáticas:', error);
      }
    };
    
    // Configura o intervalo para rodar a cada 2 minutos
    const interval = setInterval(runRefundAndLiberationProcess, 2 * 60 * 1000);
    runRefundAndLiberationProcess(); // Executa imediatamente ao carregar o app

    // Limpa o intervalo quando o componente é desmontado
    return () => clearInterval(interval);
  }, [loadData]);
}
