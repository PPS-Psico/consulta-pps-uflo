
import { createClient } from '@supabase/supabase-js';

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
    console.error("❌ ERROR: Edita el archivo scripts/migrate.js y pega las credenciales.");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Mapas para relaciones y Snapshots (Hydration)
const idMap = new Map(); // Airtable ID -> Supabase UUID
const cacheEstudiantes = new Map(); // Airtable ID -> Datos Estudiante
const cacheLanzamientos = new Map(); // Airtable ID -> Datos Lanzamiento

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
    
    // Pre-carga para Finalización (Archivos)
    if (tableName === 'finalizacion_pps') {
        console.log("   🔍 Pre-cargando datos existentes de Supabase para verificar archivos...");
        const { data: existingData } = await supabase.from(tableName).select('airtable_id, informe_final_url, planilla_horas_url, planilla_asistencia_url');
        if (existingData) existingData.forEach(r => existingRecordsMap.set(r.airtable_id, r));
    }

    // Pre-carga para Convocatorias (Evitar conflictos Unique)
    const dbConflicts = new Map(); // Map<"estId_lanzId", airtableId>
    
    if (tableName === 'convocatorias') {
        console.log("   🔍 Pre-cargando TODAS las convocatorias existentes para evitar duplicados...");
        
        let allExisting = [];
        let from = 0;
        const limit = 1000;
        let done = false;
        
        while (!done) {
            const { data, error } = await supabase
                .from(tableName)
                .select('id, airtable_id, estudiante_id, lanzamiento_id')
                .range(from, from + limit - 1);
            
            if (error) {
                 console.error("Error fetching existing convocatorias:", error);
                 break;
            }
            
            if (data && data.length > 0) {
                allExisting = [...allExisting, ...data];
                from += limit;
                if (data.length < limit) done = true;
            } else {
                done = true;
            }
        }

        allExisting.forEach(c => {
            if (c.estudiante_id && c.lanzamiento_id) {
                dbConflicts.set(`${c.estudiante_id}_${c.lanzamiento_id}`, c.airtable_id);
            }
        });
        console.log(`      -> ${allExisting.length} registros pre-cargados en memoria.`);
    }

    // Set para deduplicación dentro del mismo lote de migración
    const seenKeys = new Set();
    const mappedRecords = [];

    for (let i = 0; i < records.length; i++) {
        const rec = records[i];
        try {
            let mapped;
            if (tableName === 'finalizacion_pps') {
                mapped = await mapFinalizacionAsync(rec, existingRecordsMap);
            } else {
                mapped = mapperFn(rec.fields, rec.id); // Pasamos ID para cacheo
            }
            
            // Lógica de deduplicación para estudiantes (Legajo único)
            if (tableName === 'estudiantes') {
                const legajo = mapped.legajo ? String(mapped.legajo).trim() : null;
                if (legajo) {
                    if (seenKeys.has(legajo)) {
                        console.warn(`   ⚠️ Saltando estudiante duplicado (Legajo: ${legajo}, ID Airtable: ${rec.id})`);
                        continue; // Saltar este registro
                    }
                    seenKeys.add(legajo);
                }
            }
            // Lógica de deduplicación para convocatorias (Estudiante + Lanzamiento único)
            else if (tableName === 'convocatorias') {
                const estId = mapped.estudiante_id;
                const lanzId = mapped.lanzamiento_id;
                if (!estId || !lanzId) continue;
                
                const compositeKey = `${estId}_${lanzId}`;
                if (seenKeys.has(compositeKey)) continue;
                
                if (dbConflicts.has(compositeKey)) {
                    const existingAirtableId = dbConflicts.get(compositeKey);
                    if (existingAirtableId !== rec.id) continue;
                }
                seenKeys.add(compositeKey);
            }
            // VALIDACIÓN DE INTEGRIDAD PARA SOLICITUDES
            else if (tableName === 'solicitudes_pps') {
                // Si no pudimos resolver el ID del estudiante, lo insertamos igual pero con estudiante_id NULL
                // Esto asegura que el registro histórico se guarde (usando nombre_alumno y legajo como texto)
                if (!mapped.estudiante_id) {
                    console.warn(`   ⚠️ Solicitud huérfana (Estudiante no encontrado): ${rec.id}. Se importará sin vínculo.`);
                    // No hacemos 'continue', permitimos que pase.
                }
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
        console.error(`   ⚠️ Hubo errores al subir datos a '${tableName}'.`);
    } else {
        console.log(`   ✨ ${tableName} sincronizada (${mappedRecords.length} registros).`);
    }
}

// --- Mapeadores ---

const cleanArray = (val) => (Array.isArray(val) ? val[0] : val) || null;
const cleanDate = (val) => val || null;
const cleanNum = (val) => (val ? Number(val) : null);

const mapEstudiante = (f, airtableId) => {
    const data = {
        legajo: f['Legajo'], nombre: f['Nombre'], genero: f['Género'],
        orientacion_elegida: f['Orientación Elegida'], dni: cleanNum(f['DNI']),
        fecha_nacimiento: cleanDate(f['Fecha de Nacimiento']), correo: f['Correo'],
        telefono: f['Teléfono'], notas_internas: f['Notas Internas'],
        fecha_finalizacion: cleanDate(f['Fecha de Finalización']), finalizaron: !!f['Finalizaron']
    };
    // Guardar en caché para Hydration de Convocatorias
    cacheEstudiantes.set(airtableId, data);
    return data;
};

const mapInstitucion = (f) => ({
    nombre: f['Nombre'], direccion: f['Dirección'], telefono: f['Teléfono'],
    convenio_nuevo: !!f['Convenio Nuevo'], tutor: f['Tutor']
});

const mapLanzamiento = (f, airtableId) => {
    const data = {
        nombre_pps: f['Nombre PPS'], fecha_inicio: cleanDate(f['Fecha Inicio']),
        fecha_finalizacion: cleanDate(f['Fecha Finalización']), direccion: f['Dirección'],
        horario_seleccionado: f['Horario Seleccionado'], orientacion: f['Orientación'],
        horas_acreditadas: cleanNum(f['Horas Acreditadas']), cupos_disponibles: cleanNum(f['Cupos disponibles']),
        estado_convocatoria: f['Estado de Convocatoria'], informe: f['Informe'],
        estado_gestion: f['Estado de Gestión'], notas_gestion: f['Notas de Gestión'],
        fecha_relanzamiento: cleanDate(f['Fecha de Relanzamiento']), permite_certificado: !!f['Permite Certificado'],
    };
    // Guardar en caché para Hydration de Convocatorias
    cacheLanzamientos.set(airtableId, data);
    return data;
};

const mapConvocatoria = (f) => {
    const lanzAirtableId = cleanArray(f['Lanzamiento Vinculado']);
    const estAirtableId = cleanArray(f['Estudiante Inscripto']);
    
    // HYDRATION: Recuperar datos planos desde la caché en memoria
    const lanzamientoData = cacheLanzamientos.get(lanzAirtableId) || {};
    const estudianteData = cacheEstudiantes.get(estAirtableId) || {};

    return {
        lanzamiento_id: idMap.get(lanzAirtableId),
        estudiante_id: idMap.get(estAirtableId),
        estado_inscripcion: f['Estado'],
        termino_cursar: f['¿Terminó de cursar?'],
        cursando_electivas: f['Cursando Materias Electivas'], 
        finales_adeuda: f['Finales que adeuda'],
        otra_situacion_academica: f['Otra situación académica'], 
        informe_subido: !!f['Informe Subido'],
        fecha_entrega_informe: cleanDate(f['Fecha_Entrega_Informe']), 
        horario_seleccionado: f['Horario'],
        certificado_url: f['Certificado'] ? JSON.stringify(f['Certificado']) : null,

        // Snapshots
        nombre_pps: lanzamientoData.nombre_pps || null,
        fecha_inicio: lanzamientoData.fecha_inicio || null,
        fecha_finalizacion: lanzamientoData.fecha_finalizacion || null,
        direccion: lanzamientoData.direccion || null,
        orientacion: lanzamientoData.orientacion || null,
        horas_acreditadas: lanzamientoData.horas_acreditadas || null,
        legajo: estudianteData.legajo || null,
        dni: estudianteData.dni || null,
        correo: estudianteData.correo || null,
        fecha_nacimiento: estudianteData.fecha_nacimiento || null,
        telefono: estudianteData.telefono || null,
    };
};

const mapPractica = (f) => ({
    estudiante_id: idMap.get(cleanArray(f['Estudiante Inscripto'])),
    lanzamiento_id: idMap.get(cleanArray(f['Lanzamiento Vinculado'])),
    nombre_institucion: cleanArray(f['Nombre (de Institución)']), 
    horas_realizadas: cleanNum(f['Horas Realizadas']), 
    fecha_inicio: cleanDate(f['Fecha de Inicio']),
    fecha_finalizacion: cleanDate(f['Fecha de Finalización']), 
    estado: f['Estado'],
    especialidad: f['Especialidad'], 
    nota: f['Nota']
});

// 🔥 LÓGICA DE UNIFICACIÓN DE ESTADOS 🔥
const normalizeSolicitudStatus = (rawStatus) => {
    if (!rawStatus) return 'Pendiente';
    
    const lower = String(rawStatus).trim().toLowerCase();

    // Regla 1: Pendiente -> Archivado (Sin gestión)
    if (lower === 'pendiente') return 'Archivado';

    // Regla 2: En conversaciones / Puesta en contacto -> No se pudo concretar
    if (lower === 'en conversaciones' || lower === 'puesta en contacto') return 'No se pudo concretar';

    // Regla 3: Realizando convenio -> Realizada
    if (lower === 'realizando convenio') return 'Realizada';

    // Regla 4 (Generalización): Cualquier variante de "Realizada" o "Finalizada" -> Realizada
    if (lower.includes('realizada') || lower.includes('finalizada') || lower.includes('pps realizada')) return 'Realizada';

    // Si es "Rechazada", "Cancelada" o "Archivado", se mantiene
    return rawStatus;
};

const mapSolicitud = (f) => {
    // Resolvemos el estudiante ID usando el mapa creado en el paso 'estudiantes'
    const estAirtableId = cleanArray(f['Legajo Link']);
    const supabaseEstId = idMap.get(estAirtableId);

    // Aplicar transformación de estado
    const estadoOriginal = f['Estado de seguimiento'];
    const estadoUnificado = normalizeSolicitudStatus(estadoOriginal);

    return {
        estudiante_id: supabaseEstId, // Puede ser null si no se migró el estudiante (Orphan)
        
        // Mapeo directo a columnas snake_case
        nombre_institucion: f['Nombre de la Institución'],
        estado_seguimiento: estadoUnificado, // USAR ESTADO UNIFICADO
        actualizacion: cleanDate(f['Actualización']),
        notas: f['Notas'],
        
        // Snapshots importantes (por si se borra el estudiante o es huérfano)
        nombre_alumno: f['Nombre'],
        legajo: String(f['Legajo'] || ''),
        email: f['Email'],
        
        // Campos detallados del formulario
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
    };
};

const mapPenalizacion = (f) => ({
    estudiante_id: idMap.get(cleanArray(f['Estudiante'])),
    tipo_incumplimiento: f['Tipo de Incumplimiento'], 
    fecha_incidente: cleanDate(f['Fecha del Incidente']),
    notas: f['Notas'], 
    puntaje_penalizacion: cleanNum(f['Puntaje Penalización']),
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
    
    const rawCargado = f['Cargado'];
    let isCargado = false;
    if (rawCargado === true) isCargado = true;
    else if (typeof rawCargado === 'string' && ['si','sí','cargado','done'].includes(rawCargado.toLowerCase())) isCargado = true;

    return {
        estudiante_id: idMap.get(cleanArray(f['Nombre'])),
        fecha_solicitud: f['Created Time'] || rec.createdTime,
        estado: isCargado ? 'Cargado' : 'Pendiente',
        informe_final_url: informeFiles, 
        planilla_horas_url: horasFiles,
        planilla_asistencia_url: asistenciaFiles,
        sugerencias_mejoras: f['Sugerencia de mejoras para las PPS']
    };
};

// --- Ejecución Principal ---

async function main() {
    console.log("=== INICIANDO MIGRACIÓN A SUPABASE CON UNIFICACIÓN DE ESTADOS ===");
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
                continue; 
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
