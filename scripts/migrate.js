
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ==============================================================================
// ⚙️ CONFIGURACIÓN DE CREDENCIALES
// ==============================================================================

const AIRTABLE_PAT = "PEGAR_AQUI_TU_AIRTABLE_PAT"; 
const AIRTABLE_BASE_ID = "PEGAR_AQUI_TU_BASE_ID"; 

const SUPABASE_URL = "PEGAR_AQUI_TU_SUPABASE_URL"; 
// ¡IMPORTANTE! Usar la SERVICE_ROLE_KEY para tener permisos de escritura
const SUPABASE_SERVICE_KEY = "PEGAR_AQUI_TU_SUPABASE_SERVICE_ROLE_KEY";

// ==============================================================================
// 🗺️ MAPEO DE TABLAS (Nombre en Supabase -> Nombre en Airtable)
// ==============================================================================
const TABLE_MAPPING = {
    'estudiantes': 'Estudiantes',
    'instituciones': 'Instituciones',
    'lanzamientos_pps': 'Lanzamientos de PPS',
    'convocatorias': 'Convocatorias',
    'practicas': 'Prácticas',
    'solicitudes_pps': 'Solicitud de PPS',
    'penalizaciones': 'Historial de Penalizaciones',
    'finalizacion_pps': 'Finalización de PPS'
};

// ==============================================================================

if (AIRTABLE_PAT.includes("PEGAR_AQUI") || SUPABASE_URL.includes("PEGAR_AQUI")) {
    console.error("❌ ERROR: Debes editar el archivo scripts/migrate.js y pegar tus credenciales de Airtable y Supabase.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const idMap = new Map();

// --- Funciones Auxiliares ---

async function fetchAllAirtable(supabaseTableName) {
    const airtableTableName = TABLE_MAPPING[supabaseTableName] || supabaseTableName;
    let allRecords = [];
    let offset = null;

    console.log(`📥 Descargando tabla '${airtableTableName}' (para '${supabaseTableName}')...`);

    try {
        do {
            const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(airtableTableName)}?pageSize=100${offset ? `&offset=${offset}` : ''}`;
            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${AIRTABLE_PAT}` }
            });

            if (!res.ok) {
                throw new Error(`Error Airtable (${res.status}): ${await res.text()}`);
            }
            
            const data = await res.json();
            allRecords = [...allRecords, ...data.records];
            offset = data.offset;
            
            if(offset) await new Promise(r => setTimeout(r, 200)); // Rate limiting

        } while (offset);

        console.log(`   ✅ ${allRecords.length} registros obtenidos.`);
        
        return allRecords;

    } catch (error) {
        console.error(`   ❌ Falló la descarga de '${airtableTableName}'.`);
        throw error;
    }
}

async function processAttachments(attachments, recordId, fieldPrefix) {
    if (!attachments || !Array.isArray(attachments) || attachments.length === 0) {
        return null;
    }

    const processedFiles = [];

    for (const att of attachments) {
        try {
            const airtableUrl = att.url;
            const filename = att.filename;
            const ext = filename.includes('.') ? filename.split('.').pop() : 'bin';
            const storagePath = `${recordId}/${fieldPrefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;

            console.log(`      ⬇️ Descargando ${filename}...`);
            const response = await fetch(airtableUrl);
            if (!response.ok) throw new Error(`Failed to fetch ${airtableUrl}`);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            console.log(`      ☁️ Subiendo a Supabase Storage...`);
            const { error: uploadError } = await supabase
                .storage
                .from('documentos_finalizacion')
                .upload(storagePath, buffer, {
                    contentType: att.type,
                    upsert: true
                });

            if (uploadError) {
                 if (uploadError.message.includes('Bucket not found')) {
                     console.error(`      ❌ ERROR: El bucket 'documentos_finalizacion' no existe. Créalo en Supabase Storage como PÚBLICO.`);
                     return null;
                 }
                 console.error(`      ⚠️ Error subiendo ${filename}: ${uploadError.message}`);
                 continue;
            }

            const { data: publicData } = supabase.storage.from('documentos_finalizacion').getPublicUrl(storagePath);
            processedFiles.push({ url: publicData.publicUrl, filename: filename });

        } catch (error) {
            console.error(`      ⚠️ Error procesando archivo ${att.filename}:`, error.message);
        }
    }
    return processedFiles.length > 0 ? processedFiles : null;
}

async function pushToSupabase(tableName, records, mapperFn) {
    if (records.length === 0) return;
    console.log(`🚀 Procesando '${tableName}' para Supabase...`);
    
    let existingRecordsMap = new Map();
    if (tableName === 'finalizacion_pps') {
        console.log("   🔍 Pre-cargando datos existentes de Supabase para verificar archivos...");
        const { data: existingData } = await supabase.from(tableName).select('airtable_id, informe_final_url, planilla_horas_url, planilla_asistencia_url');
        if (existingData) existingData.forEach(r => existingRecordsMap.set(r.airtable_id, r));
    }

    const mappedRecords = [];
    for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        try {
            let mapped;
            if (tableName === 'finalizacion_pps') {
                mapped = await mapFinalizacionAsync(rec, existingRecordsMap);
            } else {
                mapped = mapperFn(rec.fields);
            }
            
            mapped.airtable_id = rec.id;
            mappedRecords.push(mapped);
            if (i > 0 && i % 10 === 0) process.stdout.write(` ${i}`);
        } catch (e) {
            console.warn(`\n   ⚠️ Error mapeando registro ${rec.id}:`, e.message);
        }
    }
    console.log("");

    const batchSize = 100;
    let batchHasFailed = false;
    for (let i = 0; i < mappedRecords.length; i += batchSize) {
        const batch = mappedRecords.slice(i, i + batchSize);
        const { data, error } = await supabase
            .from(tableName)
            .upsert(batch, { onConflict: 'airtable_id' })
            .select('id, airtable_id');

        if (error) {
            console.error(`   ❌ Error en lote para ${tableName}:`, error.message);
            batchHasFailed = true;
        } else if (data) {
            data.forEach(row => idMap.set(row.airtable_id, row.id));
        }
    }
    
    if (batchHasFailed) {
        console.error(`   ⚠️ Hubo errores al subir datos a '${tableName}'. No todos los registros pueden haber sido sincronizados.`);
        throw new Error(`Falló la subida de datos para la tabla ${tableName}.`);
    } else {
        console.log(`   ✨ ${tableName} sincronizada (${mappedRecords.length} registros).`);
    }
}

// --- Mapeadores ---

const cleanArray = (val) => (Array.isArray(val) ? val[0] : val) || null;
const cleanDate = (val) => val || null;
const cleanNum = (val) => (val ? Number(val) : null);

const mapEstudiante = (f) => ({
    legajo: f['Legajo'], nombre: f['Nombre'], genero: f['Género'],
    orientacion_elegida: f['Orientación Elegida'], dni: cleanNum(f['DNI']),
    fecha_nacimiento: cleanDate(f['Fecha de Nacimiento']), correo: f['Correo'],
    telefono: f['Teléfono'], notas_internas: f['Notas Internas'],
    fecha_finalizacion: cleanDate(f['Fecha de Finalización']), finalizaron: !!f['Finalizaron']
});

const mapInstitucion = (f) => ({
    nombre: f['Nombre'], direccion: f['Dirección'], telefono: f['Teléfono'],
    convenio_nuevo: !!f['Convenio Nuevo'], tutor: f['Tutor']
});

const mapLanzamiento = (f) => ({
    nombre_pps: f['Nombre PPS'], fecha_inicio: cleanDate(f['Fecha Inicio']),
    fecha_finalizacion: cleanDate(f['Fecha Finalización']), direccion: f['Dirección'],
    horario_seleccionado: f['Horario Seleccionado'], orientacion: f['Orientación'],
    horas_acreditadas: cleanNum(f['Horas Acreditadas']), cupos_disponibles: cleanNum(f['Cupos disponibles']),
    estado_convocatoria: f['Estado de Convocatoria'], informe: f['Informe'],
    estado_gestion: f['Estado de Gestión'], notas_gestion: f['Notas de Gestión'],
    fecha_relanzamiento: cleanDate(f['Fecha de Relanzamiento']), permite_certificado: !!f['Permite Certificado'],
});

const mapConvocatoria = (f) => ({
    lanzamiento_id: idMap.get(cleanArray(f['Lanzamiento Vinculado'])),
    estudiante_id: idMap.get(cleanArray(f['Estudiante Inscripto'])),
    estado: f['Estado'], termino_cursar: f['¿Terminó de cursar?'],
    cursando_electivas: f['Cursando Materias Electivas'], finales_adeuda: f['Finales que adeuda'],
    otra_situacion_academica: f['Otra situación académica'], informe_subido: !!f['Informe Subido'],
    fecha_entrega_informe: cleanDate(f['Fecha_Entrega_Informe']), horario_seleccionado: f['Horario'],
});

const mapPractica = (f) => ({
    estudiante_id: idMap.get(cleanArray(f['Estudiante Inscripto'])),
    lanzamiento_id: idMap.get(cleanArray(f['Lanzamiento Vinculado'])),
    nombre_institucion: cleanArray(f['Nombre (de Institución)']),
    horas_realizadas: cleanNum(f['Horas Realizadas']), fecha_inicio: cleanDate(f['Fecha de Inicio']),
    fecha_finalizacion: cleanDate(f['Fecha de Finalización']), estado: f['Estado'],
    especialidad: f['Especialidad'], nota: f['Nota']
});

const mapSolicitud = (f) => ({
    estudiante_id: idMap.get(cleanArray(f['Legajo Link'])),
    nombre_institucion: f['Nombre de la Institución'],
    estado_seguimiento: f['Estado de seguimiento'],
    actualizacion: cleanDate(f['Actualización']),
    notas: f['Notas'],
    email: f['Email'],
    nombre: f['Nombre'],
    legajo: String(f['Legajo'] || ''),
    orientacion_sugerida: f['Orientación Sugerida'],
    localidad: f['Localidad'],
    direccion_completa: f['Dirección completa'],
    email_institucion: f['Correo electrónico de contacto de la institución'],
    telefono_institucion: f['Teléfono de contacto de la institución'],
    referente_institucion: f['Nombre del referente de la institución'],
    convenio_uflo: f['¿La institución tiene convenio firmado con UFLO?'],
    tutor_disponible: f['¿La institución cuenta con un psicólogo/a que pueda actuar como tutor/a de la práctica?'],
    contacto_tutor: f['Contacto del tutor (Teléfono o Email)'],
    tipo_practica: f['Práctica para uno o más estudiantes'],
    descripcion_institucion: f['Breve descripción de la institución y de sus actividades principales'],
});

const mapPenalizacion = (f) => ({
    estudiante_id: idMap.get(cleanArray(f['Estudiante'])),
    tipo_incumplimiento: f['Tipo de Incumplimiento'], fecha_incidente: cleanDate(f['Fecha del Incidente']),
    notas: f['Notas'], puntaje_penalizacion: cleanNum(f['Puntaje Penalización']),
    convocatoria_afectada: idMap.get(cleanArray(f['Convocatoria Afectada']))
});

const mapFinalizacionAsync = async (rec, existingMap) => {
    const f = rec.fields;
    const existingRecord = existingMap ? existingMap.get(rec.id) : null;
    let [informeFiles, horasFiles, asistenciaFiles] = [
        existingRecord?.informe_final_url,
        existingRecord?.planilla_horas_url,
        existingRecord?.planilla_asistencia_url
    ];

    if (!informeFiles && f['Informes']) informeFiles = await processAttachments(f['Informes'], rec.id, 'informe');
    if (!horasFiles && f['Excel de Seguimiento']) horasFiles = await processAttachments(f['Excel de Seguimiento'], rec.id, 'horas');
    if (!asistenciaFiles && f['Planillas de asistencias ']) asistenciaFiles = await processAttachments(f['Planillas de asistencias '], rec.id, 'asistencia');
    
    return {
        estudiante_id: idMap.get(cleanArray(f['Nombre'])),
        fecha_solicitud: f['Created Time'] || rec.createdTime,
        estado: (Array.isArray(f['Cargado']) && f['Cargado'].includes('Si')) ? 'Cargado' : 'Pendiente',
        informe_final_url: informeFiles, planilla_horas_url: horasFiles,
        planilla_asistencia_url: asistenciaFiles,
        sugerencias_mejoras: f['Sugerencia de mejoras para las PPS']
    };
};

// --- Ejecución Principal ---

async function main() {
    console.log("=== INICIANDO MIGRACIÓN A SUPABASE ===");
    let hasFailed = false;
    try {
        const order = [
            { table: 'estudiantes', mapper: mapEstudiante },
            { table: 'instituciones', mapper: mapInstitucion },
            { table: 'lanzamientos_pps', mapper: mapLanzamiento },
            { table: 'convocatorias', mapper: mapConvocatoria },
            { table: 'practicas', mapper: mapPractica },
            { table: 'solicitudes_pps', mapper: mapSolicitud },
            { table: 'penalizaciones', mapper: mapPenalizacion },
            { table: 'finalizacion_pps', mapper: null }, // Mapper asíncrono
        ];

        for (const { table, mapper } of order) {
            try {
                const records = await fetchAllAirtable(table);
                await pushToSupabase(table, records, mapper);
            } catch (e) {
                console.error(`\n❌ ERROR CRÍTICO procesando la tabla '${table}':`, e.message);
                hasFailed = true;
                continue; // Skip to the next table on critical failure
            }
        }

        if (hasFailed) {
            console.log("\n=== MIGRACIÓN COMPLETADA CON ERRORES ===");
        } else {
            console.log("\n=== MIGRACIÓN COMPLETADA CON ÉXITO ===");
        }
    } catch (error) {
        console.error("\n❌ ERROR FATAL EN MIGRACIÓN:", error.message);
    }
}

main();
