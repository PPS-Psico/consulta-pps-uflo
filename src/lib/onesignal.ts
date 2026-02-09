// OneSignal Integration - Custom Code Setup
// Documentation: https://documentation.onesignal.com/docs/custom-code-setup

// OneSignal Configuration
// Using hardcoded values (publishable keys - safe to expose in frontend)
// These are the same keys from GitHub Secrets but hardcoded to avoid env issues
const ONESIGNAL_APP_ID =
  import.meta.env.VITE_ONESIGNAL_APP_ID || "53f3327c-9553-41fc-919e-73161c8517f7";
const ONESIGNAL_SAFARI_WEB_ID =
  import.meta.env.VITE_ONESIGNAL_SAFARI_WEB_ID ||
  "web.onesignal.auto.14e17240-829a-4079-8f1d-24e0d0f74783";

// Extend Window interface for OneSignal
declare global {
  interface Window {
    OneSignalDeferred?: any[];
    OneSignal?: any;
  }
}

export const initializeOneSignal = async () => {
  if (!ONESIGNAL_APP_ID) {
    console.warn("[OneSignal] App ID not configured");
    return;
  }

  try {
    // Initialize OneSignal Deferred Array
    window.OneSignalDeferred = window.OneSignalDeferred || [];

    // Push initialization function
    window.OneSignalDeferred.push((OneSignal: any) => {
      const initConfig: any = {
        appId: ONESIGNAL_APP_ID,
        allowLocalhostAsSecureOrigin: true,
        serviceWorkerParam: { scope: "/consulta-pps-uflo/" },
        serviceWorkerPath: "consulta-pps-uflo/OneSignalSDKWorker.js",
        notifyButton: {
          enable: false, // Usamos nuestro propio botón, no el de OneSignal
        },
        // NO registrar automáticamente - esperar a que el usuario haga clic
        autoRegister: false,
        // Usar Native Prompt directamente (más confiable en móvil)
        promptOptions: {
          slidedown: {
            enabled: false,
            autoPrompt: false,
          },
          native: {
            enabled: true,
            autoPrompt: false,
          },
        },
        // Desactivar todas las suscripciones automáticas
        subscription: {
          autoResubscribe: false,
        },
      };

      // Agregar Safari Web ID si está configurado
      if (ONESIGNAL_SAFARI_WEB_ID) {
        initConfig.safari_web_id = ONESIGNAL_SAFARI_WEB_ID;
      }

      OneSignal.init(initConfig);
    });

    console.log("[OneSignal] Initialized successfully");
  } catch (error) {
    console.error("[OneSignal] Initialization error:", error);
  }
};

import { supabase } from "./supabaseClient";

export const subscribeToOneSignal = async (
  userId?: string
): Promise<{ success: boolean; error?: string; playerId?: string }> => {
  try {
    if (!window.OneSignal) {
      return { success: false, error: "OneSignal not loaded" };
    }

    // Check if already subscribed
    const currentPermission = await window.OneSignal.Notifications.permission;
    console.log("[OneSignal] Current permission status:", currentPermission);

    if (currentPermission) {
      console.log("[OneSignal] Already has permission, getting player ID...");
      const existingPlayerId = await getOneSignalPlayerId();
      if (existingPlayerId) {
        console.log("[OneSignal] Already subscribed with ID:", existingPlayerId);
        // Save to database even if already subscribed (in case it wasn't saved)
        if (userId) {
          await savePlayerIdToDatabase(userId, existingPlayerId);
        }
        return { success: true, playerId: existingPlayerId };
      }
    }

    // Request permission - use native prompt for better mobile compatibility
    console.log("[OneSignal] Requesting permission...");
    await window.OneSignal.Notifications.requestPermission();

    // Wait for subscription to be created (max 5 seconds)
    let playerId = null;
    for (let i = 0; i < 50; i++) {
      playerId = await getOneSignalPlayerId();
      if (playerId) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!playerId) {
      console.warn("[OneSignal] No player ID obtained after requesting permission");
      return {
        success: false,
        error: "No se pudo obtener el ID de suscripción. Por favor, intentá de nuevo.",
      };
    }

    console.log("[OneSignal] Subscription successful, player ID:", playerId);

    // Save to database if we have a user ID
    if (userId) {
      await savePlayerIdToDatabase(userId, playerId);
    }

    return { success: true, playerId };
  } catch (error: any) {
    console.error("[OneSignal] Subscribe error:", error);
    return { success: false, error: error.message };
  }
};

// Helper function to save player ID to database
async function savePlayerIdToDatabase(userId: string, playerId: string) {
  try {
    console.log("[OneSignal] Saving to database - userId:", userId, "playerId:", playerId);
    const { data, error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        onesignal_player_id: playerId,
        endpoint: `onesignal:${playerId}`,
        p256dh: "onesignal",
        auth: "onesignal",
        updated_at: new Date().toISOString(),
      } as any,
      {
        onConflict: "user_id",
      }
    );

    if (error) {
      console.error("[OneSignal] Error saving to database:", error);
    } else {
      console.log("[OneSignal] Player ID saved successfully");
    }
  } catch (dbError) {
    console.error("[OneSignal] Database error:", dbError);
  }
}

export const unsubscribeFromOneSignal = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    if (!window.OneSignal) {
      return { success: false, error: "OneSignal not loaded" };
    }

    // Opt out from push notifications
    await window.OneSignal.User.PushSubscription.optOut();

    console.log("[OneSignal] Unsubscribed successfully");
    return { success: true };
  } catch (error: any) {
    console.error("[OneSignal] Unsubscribe error:", error);
    return { success: false, error: error.message };
  }
};

export const isOneSignalSubscribed = async (): Promise<boolean> => {
  try {
    if (!window.OneSignal) {
      return false;
    }

    const subscription = await window.OneSignal.User.PushSubscription;
    return subscription?.optedIn || false;
  } catch (error) {
    return false;
  }
};

export const getOneSignalPlayerId = async (): Promise<string | null> => {
  try {
    if (!window.OneSignal) {
      return null;
    }

    const subscription = await window.OneSignal.User.PushSubscription;
    return subscription?.id || null;
  } catch (error) {
    return null;
  }
};

// Alias for backward compatibility
export const getOneSignalUserId = getOneSignalPlayerId;
