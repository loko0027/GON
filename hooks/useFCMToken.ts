// hooks/useFCMToken.ts
import { useEffect } from "react";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

export function useFCMToken(userId?: string) {
  useEffect(() => {
    if (!userId) return;
    if (Platform.OS === "web") return; // web não faz nada

    // importa messaging apenas no mobile
    const messaging = require("@react-native-firebase/messaging").default;

    const registerToken = async () => {
      try {
        const authStatus = await messaging().requestPermission();
        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (!enabled) return;

        const fcmToken = await messaging().getToken();
        if (!fcmToken) return;

        await supabase.from("user_push_tokens").upsert(
          {
            usuario: userId,
            fcm_token: fcmToken,
            plataforma: Platform.OS,
          },
          { onConflict: ["usuario", "plataforma"] }
        );
      } catch (err) {
        console.error("[FCM] Erro:", err);
      }
    };

    registerToken();

    const unsubscribe = messaging().onMessage(msg => {
      console.log("[FCM] Mensagem foreground:", msg);
    });

    return () => unsubscribe();
  }, [userId]);
}
