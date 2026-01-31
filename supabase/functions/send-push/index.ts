import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -- CONFIGURATION --
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

// Firebase Configuration
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
const FIREBASE_PRIVATE_KEY = Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "";
const FIREBASE_CLIENT_EMAIL = Deno.env.get("FIREBASE_CLIENT_EMAIL") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("🔧 Config loaded:", {
  hasSupabaseUrl: !!SUPABASE_URL,
  hasFirebaseConfig: !!FIREBASE_PROJECT_ID && !!FIREBASE_PRIVATE_KEY && !!FIREBASE_CLIENT_EMAIL,
});

// Get Firebase access token
async function getAccessToken() {
  const credentials = {
    type: "service_account",
    project_id: FIREBASE_PROJECT_ID,
    private_key: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    client_email: FIREBASE_CLIENT_EMAIL,
  };

  const jwt = await createJWT(credentials);
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

async function createJWT(credentials: any) {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(payload));
  const signature = await sign(`${encodedHeader}.${encodedPayload}`, credentials.private_key);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

async function sign(data: string, privateKey: string) {
  const keyData = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\n/g, "");

  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(data);

  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    await crypto.subtle.importKey(
      "pkcs8",
      Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0)),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    ),
    keyBytes
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

async function sendFCMMessage(
  accessToken: string,
  token: string,
  title: string,
  message: string,
  url?: string
) {
  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: token,
          notification: {
            title,
            body: message,
          },
          webpush: {
            fcm_options: {
              link: url || "/",
            },
          },
        },
      }),
    }
  );

  return response;
}

Deno.serve(async (req) => {
  console.log("📥 Request received:", req.method);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { title, message, url, user_id } = await req.json();

    if (!title || !message) {
      throw new Error("Title and message are required.");
    }

    console.log(`[Push] Sending: "${title}" to ${user_id ? user_id : "ALL"}`);

    // Fetch subscriptions
    let query = supabase.from("push_subscriptions").select("*");
    if (user_id) {
      query = query.eq("user_id", user_id);
    }

    const { data: subscriptions, error: dbError } = await query;

    if (dbError) throw dbError;
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ message: "No subscriptions found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Push] Found ${subscriptions.length} subscriptions`);

    // Get Firebase access token
    const accessToken = await getAccessToken();
    console.log("[Push] Firebase access token obtained");

    const results: any[] = [];

    // Send to all subscriptions
    for (const sub of subscriptions) {
      try {
        console.log(`[Push] Sending to token ${sub.fcm_token?.substring(0, 20)}...`);
        const response = await sendFCMMessage(accessToken, sub.fcm_token, title, message, url);

        if (response.ok) {
          results.push({ id: sub.id, success: true });
          console.log(`[Push] ✅ Success for ${sub.id}`);
        } else {
          const errorText = await response.text();
          console.error(`[Push] ❌ Error for ${sub.id}:`, errorText);
          results.push({ id: sub.id, success: false, error: errorText });

          // If token is invalid, clean it up
          if (response.status === 404 || response.status === 401) {
            console.log(`[Push] Cleaning up invalid token for ${sub.id}`);
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            results.push({ id: sub.id, success: false, error: "Invalid token", cleaned: true });
          }
        }
      } catch (err) {
        console.error(`[Push] ❌ Error for ${sub.id}:`, err);
        results.push({ id: sub.id, success: false, error: String(err) });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[Push] Completed: ${successCount}/${subscriptions.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        details: results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[Push] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
