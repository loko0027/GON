import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoLost(loadDataFunction: () => Promise<void>) {
  useEffect(() => {
    const checkLostConvocations = async () => {
      try {
        console.log('[AUTO_LOST] Verificando convocações perdidas...');
        
        const { data, error } = await supabase.rpc('verificar_convocacoes_perdidas');
        
        if (error) {
          console.error('[AUTO_LOST] Erro ao verificar convocações perdidas:', error);
          return;
        }

        if (data && data.length > 0) {
          const processadas = data.filter((item: any) => item.processada);
          const comErro = data.filter((item: any) => !item.processada);
          
          console.log(`[AUTO_LOST] Convocações perdidas processadas: ${processadas.length}`);
          
          if (comErro.length > 0) {
            console.error('[AUTO_LOST] Convocações com erro:', comErro);
          }
          
          // Recarregar dados se houve processamentos
          if (processadas.length > 0) {
            console.log('[AUTO_LOST] Recarregando dados após marcar convocações perdidas...');
            await loadDataFunction();
          }
        }
      } catch (error) {
        console.error('[AUTO_LOST] Erro inesperado:', error);
      }
    };

    // Verificar a cada 1 minuto para ser mais responsivo
    const interval = setInterval(checkLostConvocations, 1 * 60 * 1000);
    
    // Verificar imediatamente
    checkLostConvocations();

    return () => {
      clearInterval(interval);
    };
  }, [loadDataFunction]);
}