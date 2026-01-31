import { createClient } from "@supabase/supabase-js";

// ==============================================================================
// ⚙️ CONFIGURACIÓN DE CREDENCIALES
// ==============================================================================

const AIRTABLE_PAT = "PEGAR_AQUI_TU_AIRTABLE_PAT";
const AIRTABLE_BASE_ID = "PEGAR_AQUI_TU_BASE_ID";

const SUPABASE_URL = "PEGAR_AQUI_TU_SUPABASE_URL";
// ¡IMPORTANTE! Usar la SERVICE_ROLE_KEY para permisos de escritura (bypasear RLS)
const SUPABASE_SERVICE_KEY = "PEGAR_AQUI_TU_SUPABASE_SERVICE_ROLE_KEY";

// ==============================================================================

if (AIRTABLE_PAT.includes("PEGAR_AQUI") || SUPABASE_URL.includes("PEGAR_AQUI")) {
  console.error(
    "❌ ERROR: Edita el archivo scripts/migrate_solicitudes.js y pega las credenciales."
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const AIRTABLE_TABLE_NAME = "Solicitud de PPS";

// --- Helpers ---

// Reglas de negocio para unificar estados
const normalizeStatus = (rawStatus) => {
  if (!rawStatus) return "Archivado";

  const lower = String(rawStatus).trim().toLowerCase();

  // Regla 1: Pendiente -> Archivado (Las que no tienen gestión real)
  if (lower === "pendiente") return "Archivado";

  // Regla 2: En conversaciones / Puesta en contacto -> No se pudo concretar
  if (lower === "en conversaciones" || lower === "puesta en contacto")
    return "No se pudo concretar";

  // Regla 3: Realizando convenio / Finalizada -> Realizada
  if (
    lower === "realizando convenio" ||
    lower.includes("realizada") ||
    lower.includes("finalizada") ||
    lower.includes("pps realizada")
  )
    return "Realizada";

  // Regla 4: Rechazada -> No se pudo concretar (opcional, para agrupar fallidos)
  if (lower.includes("rechazada")) return "No se pudo concretar";

  return rawStatus; // Mantener otros si existen
};

const cleanDate = (val) => val || null;
const cleanArray = (val) => (Array.isArray(val) ? val[0] : val) || null;

// --- Lógica Principal ---

async function fetchAirtableData() {
  let allRecords = [];
  let offset = null;
  console.log(`📥 Descargando '${AIRTABLE_TABLE_NAME}' desde Airtable...`);

  try {
    do {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_NAME)}?pageSize=100${offset ? `&offset=${offset}` : ""}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
      if (!res.ok) throw new Error(`Error Airtable: ${res.statusText}`);
      const data = await res.json();
      allRecords = [...allRecords, ...data.records];
      offset = data.offset;
      if (offset) await new Promise((r) => setTimeout(r, 200));
    } while (offset);

    console.log(`   ✅ ${allRecords.length} registros obtenidos.`);
    return allRecords;
  } catch (error) {
    console.error("   ❌ Error descarga:", error);
    throw error;
  }
}

async function getStudentMap() {
  console.log("🔍 Obteniendo mapa de estudiantes de Supabase...");
  // Buscamos ID, Airtable ID, Legajo y Correo para maximizar probabilidad de match
  const { data, error } = await supabase
    .from("estudiantes")
    .select("id, airtable_id, legajo, correo");

  if (error) throw error;

  const map = new Map();
  data.forEach((s) => {
    // 1. Mapear por Airtable ID (si existe)
    if (s.airtable_id) map.set(s.airtable_id, s.id);
    // 2. Mapear por Legajo (trim)
    if (s.legajo) map.set(String(s.legajo).trim(), s.id);
    // 3. Mapear por Email (lowercase) como fallback
    if (s.correo) map.set(String(s.correo).trim().toLowerCase(), s.id);
  });
  console.log(`   -> ${map.size} claves de mapeo generadas (IDs, Legajos, Emails).`);
  return map;
}

async function migrate() {
  try {
    // 1. Preparar datos
    const [airtableRecords, studentMap] = await Promise.all([fetchAirtableData(), getStudentMap()]);

    const mappedRecords = [];
    let orphanedCount = 0;

    // 2. Transformar
    console.log("⚙️  Transformando y vinculando...");

    for (const rec of airtableRecords) {
      const f = rec.fields;

      let supabaseStudentId = null;

      // Estrategia 1: Buscar por campos de identificación (Legajo, Link, ID)
      const idKeys = ["Legajo", "Legajo Link", "Estudiante", "Alumno", "ID Alumno"];
      for (const key of idKeys) {
        const rawVal = cleanArray(f[key]);
        if (rawVal) {
          const lookupKey = String(rawVal).trim();
          if (studentMap.has(lookupKey)) {
            supabaseStudentId = studentMap.get(lookupKey);
            break;
          }
        }
      }

      // Estrategia 2: Fallback por Email
      if (!supabaseStudentId && f["Email"]) {
        const email = String(cleanArray(f["Email"])).trim().toLowerCase();
        if (studentMap.has(email)) {
          supabaseStudentId = studentMap.get(email);
        }
      }

      if (!supabaseStudentId) {
        orphanedCount++;
        // console.log(`   ⚠️ Huérfano: Legajo="${f['Legajo']}" Email="${f['Email']}"`);
      }

      const newStatus = normalizeStatus(f["Estado de seguimiento"]);

      mappedRecords.push({
        airtable_id: rec.id,
        estudiante_id: supabaseStudentId || null, // Si no hay match, queda null (huérfano pero visible)

        // Mapeo de campos
        nombre_institucion: f["Nombre de la Institución"],
        estado_seguimiento: newStatus,
        actualizacion: cleanDate(f["Actualización"]),
        notas: f["Notas"],

        // Snapshots (copia de datos por si se borra el estudiante)
        nombre_alumno: f["Nombre"],
        legajo: String(f["Legajo"] || ""),
        email: f["Email"],

        // Detalles del formulario
        orientacion_sugerida: f["Orientación Sugerida"],
        localidad: f["Localidad"],
        direccion_completa: f["Dirección completa"],
        email_institucion: f["Correo electrónico de contacto de la institución"],
        telefono_institucion: f["Teléfono de contacto de la institución"],
        referente_institucion: f["Nombre del referente de la institución"],
        convenio_uflo: f["¿La institución tiene convenio firmado con UFLO?"],
        tutor_disponible:
          f[
            "¿La institución cuenta con un psicólogo/a que pueda actuar como tutor/a de la práctica?"
          ],
        contacto_tutor: f["Contacto del tutor (Teléfono o Email)"],
        tipo_practica: f["Práctica para uno o más estudiantes"],
        descripcion_institucion:
          f["Breve descripción de la institución y de sus actividades principales"],

        // Timestamp original
        created_at: rec.createdTime,
      });
    }

    if (orphanedCount > 0) {
      console.warn(
        `   ⚠️  Atención: ${orphanedCount} solicitudes quedaron sin vincular (se importaron como históricas sin link a perfil).`
      );
    }

    // 3. Insertar en lotes
    console.log("🚀 Insertando en Supabase...");
    const BATCH_SIZE = 100;

    for (let i = 0; i < mappedRecords.length; i += BATCH_SIZE) {
      const batch = mappedRecords.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from("solicitudes_pps")
        .upsert(batch, { onConflict: "airtable_id" });

      if (error) {
        console.error(`   ❌ Error en lote ${i}:`, error.message);
      } else {
        process.stdout.write(".");
      }
    }

    console.log("\n\n✅ Migración de solicitudes completada.");
  } catch (e) {
    console.error("\n❌ Error fatal:", e.message);
  }
}

migrate();
