
import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// ⚙️ CONFIGURACIÓN DE CREDENCIALES
// ==============================================================================

const AIRTABLE_PAT = "PEGAR_TU_AIRTABLE_PAT_AQUI";
const AIRTABLE_BASE_ID = "PEGAR_TU_BASE_ID_AQUI";
const SUPABASE_URL = "PEGAR_TU_SUPABASE_URL_AQUI";
// ¡IMPORTANTE! Usar la SERVICE_ROLE_KEY para poder escribir/actualizar sin restricciones
const SUPABASE_SERVICE_KEY = "PEGAR_TU_SUPABASE_SERVICE_KEY_AQUI";

// ==============================================================================

if (AIRTABLE_PAT.includes("PEGAR") || SUPABASE_URL.includes("PEGAR")) {
    console.error("❌ ERROR: Edita el archivo scripts/sync-solicitudes-status.js y pega tus credenciales.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fetchAirtableRequests() {
    let allRecords = [];
    let offset = null;
    console.log("📥 Descargando estados reales desde Airtable...");

    try {
        do {
            // Solo traemos los campos necesarios para minimizar tráfico
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Solicitud%20de%20PPS?pageSize=100&fields%5B%5D=Estado%20de%20seguimiento&fields%5B%5D=Nombre%20de%20la%20Instituci%C3%B3n${offset ? `&offset=${offset}` : ''}`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_PAT}` } });
            if (!res.ok) throw new Error(`Error Airtable: ${res.statusText}`);
            const data = await res.json();
            allRecords = [...allRecords, ...data.records];
            offset = data.offset;
            if(offset) await new Promise(r => setTimeout(r, 200)); 
        } while (offset);
        return allRecords;
    } catch (error) {
        console.error("❌ Error descargando Airtable:", error);
        return [];
    }
}

async function syncStatuses() {
    console.log("🚀 Iniciando sincronización QUIRÚRGICA de estados...");
    
    // 1. Traer datos de Airtable (La verdad de los estados históricos)
    const airtableRecords = await fetchAirtableRequests();
    console.log(`   -> ${airtableRecords.length} registros encontrados en Airtable.`);

    // 2. Traer datos de Supabase que tienen airtable_id (Solo los migrados)
    const { data: supabaseRecords, error } = await supabase
        .from('solicitudes_pps')
        .select('id, airtable_id, estado_seguimiento')
        .not('airtable_id', 'is', null);

    if (error) {
        console.error("❌ Error leyendo Supabase:", error);
        return;
    }

    console.log(`   -> ${supabaseRecords.length} registros históricos encontrados en Supabase.`);

    // 3. Comparar y Actualizar
    let updatedCount = 0;
    const updates = [];

    // Crear mapa de Airtable para búsqueda rápida
    const airtableMap = new Map(airtableRecords.map(r => [r.id, r]));

    for (const sbRecord of supabaseRecords) {
        const atRecord = airtableMap.get(sbRecord.airtable_id);
        
        if (atRecord) {
            const atStatus = atRecord.fields['Estado de seguimiento'];
            const sbStatus = sbRecord.estado_seguimiento;

            // Si el estado es diferente, lo actualizamos
            // Esto arreglará los que dicen "Archivado" en Supabase pero son "Finalizada" en Airtable
            if (atStatus && atStatus !== sbStatus) {
                // Normalización de nombres de instituciones para arreglar posibles desajustes visuales también
                const atInstitution = atRecord.fields['Nombre de la Institución'];
                
                updates.push({
                    id: sbRecord.id, // Usamos el ID de Supabase para el update
                    estado_seguimiento: atStatus,
                    nombre_institucion: atInstitution // Ya que estamos, actualizamos el nombre por si cambió
                });
            }
        }
    }

    console.log(`   -> Se detectaron ${updates.length} registros con estados desactualizados.`);

    // 4. Ejecutar actualizaciones en lotes
    const BATCH_SIZE = 50;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        
        // Hacemos updates individuales o un upsert masivo. Upsert es más eficiente.
        // Pero upsert requiere todas las columnas not-null si es insert, aquí es update.
        // Para seguridad, haremos promesas paralelas de update.
        
        const promises = batch.map(u => 
            supabase
                .from('solicitudes_pps')
                .update({ 
                    estado_seguimiento: u.estado_seguimiento,
                    nombre_institucion: u.nombre_institucion
                })
                .eq('id', u.id)
        );

        await Promise.all(promises);
        updatedCount += batch.length;
        process.stdout.write(`.`);
    }

    console.log(`\n\n✅ Sincronización completada.`);
    console.log(`   - ${updatedCount} solicitudes corregidas.`);
    console.log(`   - Los datos creados nativamente en Supabase (sin airtable_id) NO fueron tocados.`);
}

syncStatuses();
