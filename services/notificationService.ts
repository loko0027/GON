import { supabase } from "@/lib/supabase";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type NotificationType =
  | "new_convocacao"
  | "convocacao_aceita"
  | "convocacao_recusada"
  | "recarga_aprovada"
  | "recarga_rejeitada"
  | "saque_aprovado"
  | "saque_rejeitado"
  | "avaliacao_recebida"
  | "chamado_atualizado"
  | "welcome";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

// =======================================
// Registrar token do dispositivo no Supabase
// =======================================
export const registerPushToken = async (userId: string) => {
  try {
    // LOG para Web
    if (Platform.OS === "web") {
      console.log("[NOTIF] Plataforma Web detectada. Não é possível registrar push token.");
      return null;
    }

    // Permissões
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("[NOTIF] Permissão negada para notificações");
      return null;
    }

    // Token Expo
    const token = (await Notifications.getExpoPushTokenAsync()).data;

    // Canal Android
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "default",
        importance: Notifications.AndroidImportance.MAX,
      });
    }

    // Salva no Supabase
    const { error } = await supabase.from("user_push_tokens").upsert(
      {
        usuario: userId,
        expo_push_token: token,
        plataforma: Platform.OS,
      },
      { onConflict: ["usuario", "plataforma"] } // evita duplicidade
    );

    if (error) {
      console.error("[NOTIF] Erro ao salvar token no Supabase:", error);
    } else {
      console.log("[NOTIF] Token registrado com sucesso:", token);
    }

    return token;
  } catch (err) {
    console.error("[NOTIF] Falha ao registrar token:", err);
    return null;
  }
};

// =======================================
// Conteúdo das notificações
// =======================================
const getNotificationContent = (
  type: NotificationType,
  data: any = {},
  userName?: string
): NotificationPayload => {
  const messages: Record<NotificationType, NotificationPayload> = {
    new_convocacao: {
      title: "Nova Convocação!",
      body: `${data.organizadorNome || "Um organizador"} te convocou para um jogo`,
      data,
    },
    convocacao_aceita: {
      title: "Convocação Aceita!",
      body: `${userName || "Um goleiro"} aceitou sua convocação`,
      data,
    },
    convocacao_recusada: {
      title: "Convocação Recusada!",
      body: `${userName || "Um goleiro"} recusou sua convocação`,
      data,
    },
    recarga_aprovada: {
      title: "Recarga Aprovada!",
      body: `Sua recarga de ${data.coins || 0} coins foi aprovada`,
      data,
    },
    recarga_rejeitada: {
      title: "Recarga Rejeitada!",
      body: `Sua recarga de ${data.coins || 0} coins foi rejeitada`,
      data,
    },
    saque_aprovado: {
      title: "Saque Aprovado!",
      body: `Seu saque de R$${data.valor || "0,00"} foi processado`,
      data,
    },
    saque_rejeitado: {
      title: "Saque Rejeitado!",
      body: `Seu saque de R$${data.valor || "0,00"} foi rejeitado`,
      data,
    },
    avaliacao_recebida: {
      title: "Nova Avaliação!",
      body: `Você recebeu uma avaliação de ${data.nota || 5} estrelas`,
      data,
    },
    chamado_atualizado: {
      title: "Atualização no Chamado",
      body: `Status atualizado: ${data.status || "Atualizado"}`,
      data,
    },
    welcome: {
      title: "Bem-vindo!",
      body: data.message || "Seu dispositivo está configurado para receber notificações",
      data,
    },
  };

  return messages[type];
};

// =======================================
// Enviar notificações locais
// =======================================
export const sendPushNotification = async (
  userIds: string | string[],
  type: NotificationType,
  additionalData?: Record<string, any>
) => {
  const ids = Array.isArray(userIds) ? userIds : [userIds];

  for (const userId of ids) {
    try {
      const { data: tokens, error } = await supabase
        .from("user_push_tokens")
        .select("expo_push_token")
        .eq("usuario", userId);

      if (error || !tokens?.length) {
        console.warn(`[NOTIF] Tokens não encontrados para usuário ${userId}`);
        continue;
      }

      const { data: userData } = await supabase
        .from("usuarios")
        .select("nome")
        .eq("id", userId)
        .single();

      const userName = userData?.nome || "Usuário";
      const { title, body, data } = getNotificationContent(type, additionalData, userName);

      for (const t of tokens) {
        await Notifications.scheduleNotificationAsync({
          content: { title, body, sound: "default", data: { type, userId, ...data } },
          trigger: null,
        });
      }

      console.log(`[NOTIF] Notificação enviada para ${userName} (${userId}): ${title}`);
    } catch (err) {
      console.error(`[NOTIF] Erro ao enviar notificação para ${userId}:`, err);
    }
  }
};
