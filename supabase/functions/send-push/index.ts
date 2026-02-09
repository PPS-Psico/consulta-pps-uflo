/**
 * OneSignal Push Notification Edge Function
 * Uses OneSignal REST API to send push notifications
 *
 * Required Supabase Secrets:
 * - ONESIGNAL_REST_API_KEY: Your OneSignal REST API Key
 * - ONESIGNAL_APP_ID: Your OneSignal App ID
 * - SUPABASE_URL: Supabase project URL
 * - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -- CONFIGURATION --
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const ONESIGNAL_REST_API_KEY = Deno.env.get("ONESIGNAL_REST_API_KEY") ?? "";
const ONESIGNAL_APP_ID = "53f3327c-9553-41fc-919e-73161c8517f7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("🔧 OneSignal Push Config:", {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasOneSignalKey: !!ONESIGNAL_REST_API_KEY,
  appId: ONESIGNAL_APP_ID,
});

// ============================================================================
// ONESIGNAL API IMPLEMENTATION
// ============================================================================

// Send push notification via OneSignal REST API
async function sendOneSignalNotification(
  playerIds: string[],
  title: string,
  message: string,
  url: string
): Promise<{ response: Response; data: any }> {
  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: message },
    url: url || "https://pps-psico.github.io/consulta-pps-uflo/",
    // Optional: add web push specific options
    web_buttons: [],
    chrome_web_icon: "https://pps-psico.github.io/consulta-pps-uflo/icon-192x192.png",
    firefox_icon: "https://pps-psico.github.io/consulta-pps-uflo/icon-192x192.png",
  };

  console.log("[OneSignal] Sending payload:", JSON.stringify(payload, null, 2));

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Authorization: `Key ${ONESIGNAL_REST_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  return { response, data };
}

// Get OneSignal player IDs from database
async function getPlayerIds(userId?: string): Promise<string[]> {
  let query = supabase
    .from("push_subscriptions")
    .select("onesignal_player_id")
    .not("onesignal_player_id", "is", null);

  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[OneSignal] Error fetching subscriptions:", error);
    throw error;
  }

  // Filter out null values and return array of player IDs
  const playerIds =
    data
      ?.map((sub) => sub.onesignal_player_id)
      .filter((id): id is string => id !== null && id !== undefined) ?? [];

  console.log(`[OneSignal] Found ${playerIds.length} player IDs:`, playerIds);
  return playerIds;
}

// Clean up invalid player IDs from database
async function cleanupInvalidPlayerIds(invalidIds: string[]) {
  if (invalidIds.length === 0) return;

  console.log(`[OneSignal] Cleaning up ${invalidIds.length} invalid player IDs:`, invalidIds);

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .in("onesignal_player_id", invalidIds);

  if (error) {
    console.error("[OneSignal] Error cleaning up invalid player IDs:", error);
  } else {
    console.log(`[OneSignal] ✅ Cleaned up ${invalidIds.length} invalid subscriptions`);
  }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

Deno.serve(async (req) => {
  console.log("📥 OneSignal Push Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate configuration
    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY not configured");
    }

    const { title, message, url, user_id } = await req.json();

    if (!title || !message) {
      throw new Error("Title and message are required.");
    }

    console.log(`[OneSignal Push] Sending: "${title}" to ${user_id ? user_id : "ALL"}`);

    // Get OneSignal player IDs
    const playerIds = await getPlayerIds(user_id);

    if (playerIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active OneSignal subscriptions found",
          sent: 0,
          total: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Send notification via OneSignal API
    console.log(`[OneSignal Push] Sending to ${playerIds.length} subscribers`);

    const { response, data: responseData } = await sendOneSignalNotification(
      playerIds,
      title,
      message,
      url
    );

    console.log("[OneSignal] Response:", JSON.stringify(responseData, null, 2));

    // Check for errors in response
    const invalidPlayerIds = responseData.errors?.invalid_player_ids || [];
    const hasInvalidIds = invalidPlayerIds.length > 0;
    const allNotSubscribed = responseData.errors?.includes(
      "All included players are not subscribed"
    );

    // Log detailed error information for debugging
    console.log("[OneSignal] Full response:", JSON.stringify(responseData, null, 2));

    if (responseData.errors) {
      console.warn(`[OneSignal] Errors in response:`, responseData.errors);

      // Check for specific error patterns
      if (responseData.errors.includes("Subscriber Opted Out")) {
        console.error("[OneSignal] CRITICAL: Subscribers opted out automatically");
        console.error("This usually happens when:");
        console.error("1. Service Worker scope is misconfigured");
        console.error("2. The subscription token was invalidated");
        console.error("3. The browser blocked the Service Worker");
      }
    }

    if (hasInvalidIds || allNotSubscribed) {
      console.warn(`[OneSignal] Invalid subscriptions found:`, responseData.errors);

      // Verificar cuáles son los IDs inválidos y por qué
      for (const invalidId of invalidPlayerIds) {
        console.warn(`[OneSignal] Invalid player ID: ${invalidId}`);
      }
    }

    if (response.ok && !hasInvalidIds && !allNotSubscribed) {
      console.log(`[OneSignal Push] ✅ Success:`, responseData);

      // Log the notification
      await supabase.from("notifications_log").insert({
        title,
        message,
        url: url || "https://pps-psico.github.io/consulta-pps-uflo/",
        user_id: user_id || null,
        recipients_count: playerIds.length,
        onesignal_response: responseData,
        sent_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({
          success: true,
          sent: playerIds.length,
          total: playerIds.length,
          onesignal_response: responseData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else if ((response.ok || !response.ok) && (hasInvalidIds || allNotSubscribed)) {
      // Error - suscripciones inválidas
      return new Response(
        JSON.stringify({
          success: false,
          error: allNotSubscribed
            ? "Las suscripciones expiraron. Los usuarios deben volver a activar las notificaciones en su perfil."
            : `Algunas suscripciones son inválidas (${invalidPlayerIds.length}). Los usuarios deben volver a suscribirse.`,
          sent: 0,
          total: playerIds.length,
          invalid_count: invalidPlayerIds.length || playerIds.length,
          onesignal_response: responseData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    } else {
      console.error(`[OneSignal Push] ❌ API Error:`, responseData);
      throw new Error(`OneSignal API error: ${JSON.stringify(responseData)}`);
    }
  } catch (error: any) {
    console.error("[OneSignal Push] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
