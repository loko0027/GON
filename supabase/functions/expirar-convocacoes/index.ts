// File: supabase/functions/expirar-convocacoes/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

console.log("Iniciando a função expirar-convocacoes...");

Deno.serve(async (req) => {
  // O Cron Job (nosso próximo passo) precisa desta resposta para funcionar
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Conecta ao Supabase com a chave de administrador para ter permissão total
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Pega o horário exato de 30 minutos atrás
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    console.log(`Verificando convocações criadas antes de: ${thirtyMinutesAgo}`);

    // 2. Busca no banco por convocações PENDENTES e com mais de 30 minutos
    const { data: expiredConvocations, error: selectError } = await supabaseAdmin
      .from('convocacoes')
      .select('id, organizador_id, valor_retido')
      .eq('status', 'pendente')
      .lt('created_at', thirtyMinutesAgo);

    if (selectError) throw selectError;

    if (!expiredConvocations || expiredConvocations.length === 0) {
      console.log("Nenhuma convocação para expirar encontrada.");
      return new Response(JSON.stringify({ message: 'Nenhuma convocação para expirar.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Encontradas ${expiredConvocations.length} convocações para expirar.`);
    const convocationsToExpireIds = expiredConvocations.map(c => c.id);

    // 3. Muda o status de todas para "Perdida"
    console.log(`Atualizando status para 'Perdida' para os IDs: ${convocationsToExpireIds.join(', ')}`);
    await supabaseAdmin
      .from('convocacoes')
      .update({ status: 'Perdida' })
      .in('id', convocationsToExpireIds);

    // 4. Devolve o dinheiro para cada organizador usando a função SQL que criamos
    console.log("Iniciando devolução de saldos...");
    const refundPromises = expiredConvocations.map(conv => 
      supabaseAdmin.rpc('devolver_saldo_retido', {
        organizador_id_param: conv.organizador_id,
        valor_param: conv.valor_retido
      })
    );

    await Promise.all(refundPromises);
    console.log("Saldos devolvidos com sucesso.");

    return new Response(JSON.stringify({ message: `${expiredConvocations.length} convocações expiradas com sucesso.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});