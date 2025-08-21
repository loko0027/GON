import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoLost(loadDataFunction: () => Promise<void>) {
  useEffect(() => {
    const checkLostConvocations = async () => {
      try {
        console.log('[AUTO_LOST] Verificando convocações perdidas...');

        // Chama a RPC
        const { data, error } = await supabase.rpc('verificar_convocacoes_perdidas');

        if (error) {
          console.error('[AUTO_LOST] Erro ao verificar convocações perdidas:', error);
          return;
        }

        if (data && data.length > 0) {
          console.log(`[AUTO_LOST] Convocações perdidas processadas: ${data.length}`);
          data.forEach((item: any) => console.log(`[AUTO_LOST] ID processada: ${item.id}`));

          // Recarrega os dados no app
          await loadDataFunction();
        }
      } catch (error) {
        console.error('[AUTO_LOST] Erro inesperado:', error);
      }
    };

    // Verifica a cada 1 minuto
    const interval = setInterval(checkLostConvocations, 60 * 1000);

    // Executa imediatamente ao montar
    checkLostConvocations();

    return () => clearInterval(interval);
  }, [loadDataFunction]);
}
