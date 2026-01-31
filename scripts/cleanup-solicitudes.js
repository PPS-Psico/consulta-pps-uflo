import { createClient } from "@supabase/supabase-js";

// ==============================================================================
// ⚙️ CONFIGURACIÓN DE CREDENCIALES
// ==============================================================================

const SUPABASE_URL = "PEGAR_TU_SUPABASE_URL_AQUI";
// ¡IMPORTANTE! Usar la SERVICE_ROLE_KEY para tener permisos de escritura sin restricciones RLS
const SUPABASE_SERVICE_KEY = "PEGAR_TU_SUPABASE_SERVICE_KEY_AQUI";

// ==============================================================================

if (SUPABASE_URL.includes("PEGAR") || SUPABASE_SERVICE_KEY.includes("PEGAR")) {
  console.error(
    "❌ ERROR: Edita el archivo scripts/cleanup-solicitudes.js y pega tus credenciales."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function runCleanup() {
  console.log("🧹 Iniciando limpieza y actualización masiva de estados de Solicitudes PPS...");

  // 1. Archivar las que no tienen gestión (Pendiente -> Archivado)
  console.log("\n1️⃣  Procesando: Pendientes -> Archivado");
  const { count: countPendientes, error: errorPendientes } = await supabase
    .from("solicitudes_pps")
    .update({ estado_seguimiento: "Archivado" })
    .eq("estado_seguimiento", "Pendiente")
    .select("id", { count: "exact" });

  if (errorPendientes) console.error("   ❌ Error:", errorPendientes.message);
  else console.log(`   ✅ Se archivaron ${countPendientes} solicitudes que estaban pendientes.`);

  // 2. Las que quedaron a mitad de camino -> No se pudo concretar
  console.log("\n2️⃣  Procesando: En conversaciones / Puesta en contacto -> No se pudo concretar");
  const { count: countMitad, error: errorMitad } = await supabase
    .from("solicitudes_pps")
    .update({ estado_seguimiento: "No se pudo concretar" })
    .in("estado_seguimiento", ["En conversaciones", "Puesta en contacto"])
    .select("id", { count: "exact" });

  if (errorMitad) console.error("   ❌ Error:", errorMitad.message);
  else console.log(`   ✅ Se marcaron ${countMitad} solicitudes como 'No se pudo concretar'.`);

  // 3. Las que avanzaron (Realizando convenio -> Realizada)
  console.log("\n3️⃣  Procesando: Realizando convenio -> Realizada");
  const { count: countConv, error: errorConv } = await supabase
    .from("solicitudes_pps")
    .update({ estado_seguimiento: "Realizada" })
    .eq("estado_seguimiento", "Realizando convenio")
    .select("id", { count: "exact" });

  if (errorConv) console.error("   ❌ Error:", errorConv.message);
  else console.log(`   ✅ Se pasaron ${countConv} solicitudes a estado 'Realizada'.`);

  // 4. Normalización de términos viejos o de Airtable (Finalizada/PPS Realizada -> Realizada)
  console.log("\n4️⃣  Normalizando: 'Finalizada' / 'PPS Realizada' -> 'Realizada'");
  const { count: countNorm, error: errorNorm } = await supabase
    .from("solicitudes_pps")
    .update({ estado_seguimiento: "Realizada" })
    .in("estado_seguimiento", ["Finalizada", "PPS Realizada", "pps realizada", "Pps realizada"])
    .select("id", { count: "exact" });

  if (errorNorm) console.error("   ❌ Error:", errorNorm.message);
  else console.log(`   ✅ Se normalizaron ${countNorm} registros al estado 'Realizada'.`);

  console.log("\n🏁 Proceso finalizado. La base de datos está actualizada.");
}

runCleanup();
