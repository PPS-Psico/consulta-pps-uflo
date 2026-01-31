import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// -- CONFIGURATION --
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const now = new Date().toISOString();
    console.log(`[Scheduler] Checking for scheduled launches at ${now}...`);

    // 1. Find 'Programada' launches that are due
    const { data: launches, error: fetchError } = await supabase
      .from("lanzamientos_pps")
      .select("*")
      .eq("estado_convocatoria", "Programada")
      .lte("fecha_publicacion", now);

    if (fetchError) {
      console.error("[Scheduler] Error fetching launches:", fetchError);
      throw fetchError;
    }

    if (!launches || launches.length === 0) {
      console.log("✅ No pending launches found.");
      return new Response(JSON.stringify({ message: "No pending launches", time: now }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`🚀 Found ${launches.length} launches to activate.`);
    const results = [];

    // 2. Process each launch
    for (const launch of launches) {
      try {
        console.log(`[Scheduler] Activando: ${launch.nombre_pps} (${launch.id})`);

        // Update status to 'Abierta'
        const { error: updateError } = await supabase
          .from("lanzamientos_pps")
          .update({ estado_convocatoria: "Abierta" })
          .eq("id", launch.id);

        if (updateError) {
          console.error(`❌ Database update failed for ${launch.id}:`, updateError);
          results.push({ id: launch.id, success: false, error: "DB Update failed" });
          continue;
        }

        results.push({ id: launch.id, status: "activated" });
      } catch (err: any) {
        console.error(`[Scheduler] Critical error processing launch ${launch.id}:`, err);
        results.push({ id: launch.id, status: "error", error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results, time: now }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("[Scheduler] Global Function Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
