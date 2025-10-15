// supabase/functions/send-notification/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log("Edge Function 'send-notification' iniciada.");

Deno.serve(async (req) => {
  // Trata requisições OPTIONS (necessário para o navegador não bloquear a chamada)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Pega os dados que foram enviados para a função (ID do usuário, título e mensagem)
    const { userId, title, message } = await req.json();
    if (!userId || !title || !message) {
      throw new Error("Os campos 'userId', 'title', e 'message' são obrigatórios.");
    }

    // 2. Conecta ao Supabase com permissão de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Busca o push_token do usuário específico no banco de dados
    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (userError || !userData || !userData.push_token) {
      throw new Error(`Usuário ${userId} não encontrado ou não possui um push token.`);
    }

    const pushToken = userData.push_token;
    console.log(`Enviando notificação para o token: ${pushToken}`);

    // 4. Monta a notificação e envia para os servidores da Expo
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title: title,
        body: message,
      }),
    });

    const responseBody = await res.json();
    console.log("Resposta da API da Expo:", responseBody);
    
    if (responseBody.data?.status === 'error') {
      throw new Error(`Erro retornado pela Expo: ${responseBody.data.message}`);
    }

    // 5. Retorna uma mensagem de sucesso
    return new Response(JSON.stringify({ success: true, message: "Notificação enviada com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    // Se algo der errado, retorna uma mensagem de erro
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});