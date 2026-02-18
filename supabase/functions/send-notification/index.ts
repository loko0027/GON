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
    // 1️⃣ Recebe os dados enviados do app
    const { userId, title, message } = await req.json();
    if (!userId || !title || !message) {
      throw new Error("Os campos 'userId', 'title' e 'message' são obrigatórios.");
    }

    // 2️⃣ Conecta ao Supabase com permissões administrativas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3️⃣ Busca o push_token do usuário
    // ⚠️ Altere o nome da tabela ou coluna se necessário:
    // - Tabela: 'usuarios' ou 'perfis'
    // - Coluna: 'push_token' ou 'expo_push_token'
    const { data: userData, error: userError } = await supabaseAdmin
      .from('usuarios')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (userError || !userData?.push_token) {
      throw new Error(`Usuário ${userId} não encontrado ou sem push_token.`);
    }

    const pushToken = userData.push_token;
    console.log(`Enviando notificação para o token: ${pushToken}`);

    // 4️⃣ Monta a notificação com ícone customizado
    const notificationPayload = {
      to: pushToken,
      sound: 'default',
      title,
      body: message,
      priority: 'high',
      android: {
        icon: 'notification_icon', // 👈 nome do arquivo PNG em /drawable/
        color: '#FF0000', // 👈 cor que vai aparecer no ícone
      },
    };

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(notificationPayload),
    });

    const responseBody = await res.json();
    console.log('Resposta da API da Expo:', responseBody);

    // 5️⃣ Retorna sucesso ou erro conforme resposta
    if (responseBody.data?.status === 'error') {
      throw new Error(`Erro retornado pela Expo: ${responseBody.data.message}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notificação enviada com sucesso!' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
