import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export function useAutoRelease(loadDataFunction: () => Promise<void>) {
  useEffect(() => {
    const checkAutoReleases = async () => {
      try {
        console.log('[AUTO_RELEASE] Verificando liberações automáticas...');

        const { data, error } = await supabase.rpc('verificar_liberacoes_automaticas');

        if (error) {
          console.error('[AUTO_RELEASE] Erro ao verificar liberações:', error);
          return;
        }

        if (data && data.length > 0) {
          const processadas = data.filter((item: any) => item.processada);
          const comErro = data.filter((item: any) => !item.processada);

          console.log(`[AUTO_RELEASE] Liberações processadas: ${processadas.length}`);

          if (comErro.length > 0) {
            console.error('[AUTO_RELEASE] Liberações com erro:', comErro);
          }

          if (processadas.length > 0) {
            console.log('[AUTO_RELEASE] Recarregando dados após liberações automáticas...');
            await loadDataFunction();
          }
        }
      } catch (error) {
        console.error('[AUTO_RELEASE] Erro inesperado:', error);
      }
    };

    const interval = setInterval(checkAutoReleases, 5 * 60 * 1000);

    checkAutoReleases();

    return () => {
      clearInterval(interval);
    };
  }, [loadDataFunction]);
}
