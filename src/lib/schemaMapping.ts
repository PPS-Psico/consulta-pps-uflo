import {
    AIRTABLE_TABLE_NAME_ESTUDIANTES,
    AIRTABLE_TABLE_NAME_PRACTICAS,
    AIRTABLE_TABLE_NAME_PPS,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    AIRTABLE_TABLE_NAME_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_INSTITUCIONES,
    AIRTABLE_TABLE_NAME_FINALIZACION,
    AIRTABLE_TABLE_NAME_PENALIZACIONES,
    AIRTABLE_TABLE_NAME_AUTH_USERS
} from '../constants';

/**
 * Mapeo entre los nombres de campos de la aplicación (Frontend) y las columnas de la base de datos (Supabase SQL).
 * App Field (Key) -> DB Column (Value)
 */
export const DB_FIELD_MAPPING: Record<string, Record<string, string>> = {
    [AIRTABLE_TABLE_NAME_ESTUDIANTES]: {
        "Legajo": "legajo",
        "Nombre": "nombre",
        "Nombre (Separado)": "nombre_separado",
        "Apellido (Separado)": "apellido_separado",
        "Género": "genero",
        "Orientación Elegida": "orientacion_elegida",
        "DNI": "dni",
        "Fecha de Nacimiento": "fecha_nacimiento",
        "Correo": "correo",
        "Teléfono": "telefono",
        "Notas Internas": "notas_internas",
        "Fecha de Finalización": "fecha_finalizacion",
        "Finalizaron": "finalizaron"
    },
    [AIRTABLE_TABLE_NAME_INSTITUCIONES]: {
        "Nombre": "nombre",
        "Dirección": "direccion",
        "Teléfono": "telefono",
        "Convenio Nuevo": "convenio_nuevo",
        "Tutor": "tutor"
    },
    [AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS]: {
        "Nombre PPS": "nombre_pps",
        "Fecha Inicio": "fecha_inicio",
        "Fecha Finalización": "fecha_finalizacion",
        "Dirección": "direccion",
        "Horario Seleccionado": "horario_seleccionado",
        "Orientación": "orientacion",
        "Horas Acreditadas": "horas_acreditadas",
        "Cupos disponibles": "cupos_disponibles",
        "Estado de Convocatoria": "estado_convocatoria",
        "Plazo Inscripción (días)": "plazo_inscripcion_dias",
        "Informe": "informe",
        "Estado de Gestión": "estado_gestion",
        "Notas de Gestión": "notas_gestion",
        "Fecha de Relanzamiento": "fecha_relanzamiento",
        "Permite Certificado": "permite_certificado",
        "Plantilla Seguro": "plantilla_seguro_url",
        "Airtable ID": "airtable_id"
    },
    [AIRTABLE_TABLE_NAME_CONVOCATORIAS]: {
        "Lanzamiento Vinculado": "lanzamiento_id",
        "Estudiante Inscripto": "estudiante_id",
        "Estado": "estado",
        "¿Terminó de cursar?": "termino_cursar",
        "Cursando Materias Electivas": "cursando_electivas",
        "Finales que adeuda": "finales_adeuda",
        "Otra situación académica": "otra_situacion_academica",
        "Informe Subido": "informe_subido",
        "Fecha_Entrega_Informe": "fecha_entrega_informe",
        "Certificado": "certificado_url",
        "Horario": "horario_seleccionado",
        // Campos Snapshot del Estudiante
        "Legajo": "legajo",
        "DNI": "dni",
        "Correo": "correo",
        "Teléfono": "telefono",
        "Fecha de Nacimiento": "fecha_nacimiento",
        // Campos Snapshot del Lanzamiento
        "Dirección": "direccion",
        "Nombre PPS": "nombre_pps",
        "Fecha Inicio": "fecha_inicio",
        "Fecha Finalización": "fecha_finalizacion",
        "Orientación": "orientacion",
        "Horas Acreditadas": "horas_acreditadas"
    },
    [AIRTABLE_TABLE_NAME_PRACTICAS]: {
        "Estudiante Inscripto": "estudiante_id",
        "Lanzamiento Vinculado": "lanzamiento_id",
        "Horas Realizadas": "horas_realizadas",
        "Fecha de Inicio": "fecha_inicio",
        "Fecha de Finalización": "fecha_finalizacion",
        "Estado": "estado",
        "Especialidad": "especialidad",
        "Nota": "nota",
        "Nombre (de Institución)": "nombre_institucion"
    },
    [AIRTABLE_TABLE_NAME_PPS]: {
        // Campos que ya funcionaban
        "Nombre de la Institución": "nombre_institucion",
        "Estado de seguimiento": "estado_seguimiento",
        "Notas": "notas",
        "Actualización": "actualizacion",
        
        // Relación con Estudiante
        "Legajo Link": "estudiante_id", 
        
        // Campos del formulario con nombres simplificados
        "Email": "email",
        "Nombre": "nombre",
        "Legajo": "legajo",
        "Orientación Sugerida": "orientacion_sugerida",
        "Localidad": "localidad",
        "Dirección completa": "direccion_completa",
        "Correo electrónico de contacto de la institución": "email_institucion",
        "Teléfono de contacto de la institución": "telefono_institucion",
        "Nombre del referente de la institución": "referente_institucion",
        "¿La institución tiene convenio firmado con UFLO?": "convenio_uflo",
        "¿La institución cuenta con un psicólogo/a que pueda actuar como tutor/a de la práctica?": "tutor_disponible",
        "Contacto del tutor (Teléfono o Email)": "contacto_tutor",
        "Práctica para uno o más estudiantes": "tipo_practica",
        "Breve descripción de la institución y de sus actividades principales": "descripcion_institucion"
    },
    [AIRTABLE_TABLE_NAME_PENALIZACIONES]: {
        "Estudiante": "estudiante_id",
        "Convocatoria Afectada": "convocatoria_afectada",
        "Tipo de Incumplimiento": "tipo_incumplimiento",
        "Fecha del Incidente": "fecha_incidente",
        "Notas": "notas",
        "Puntaje Penalización": "puntaje_penalizacion"
    },
    [AIRTABLE_TABLE_NAME_FINALIZACION]: {
        "Nombre": "estudiante_id",
        "Created Time": "fecha_solicitud",
        "Estado": "estado",
        "Informes": "informe_final_url",
        "Excel de Seguimiento": "planilla_horas_url",
        "Planillas de asistencias ": "planilla_asistencia_url",
        "Sugerencia de mejoras para las PPS": "sugerencias_mejoras",
    },
    [AIRTABLE_TABLE_NAME_AUTH_USERS]: {}
};

export const mapFieldToDb = (tableName: string, fieldName: string): string => {
    const dbField = DB_FIELD_MAPPING[tableName]?.[fieldName];
    return dbField || fieldName.toLowerCase().replace(/ /g, '_');
};

export const mapFieldsToDb = (tableName: string, fields: Record<string, any>): Record<string, any> => {
    const mapped: Record<string, any> = {};
    for (const key in fields) {
        const dbKey = mapFieldToDb(tableName, key);
        mapped[dbKey] = fields[key];
    }
    return mapped;
};

export const mapDbRowToFields = (tableName: string, row: Record<string, any>): Record<string, any> => {
    const mapping = DB_FIELD_MAPPING[tableName] || {};
    const reverseMapping: Record<string, string> = {};
    
    // Build reverse mapping (DB Column -> App Field)
    Object.entries(mapping).forEach(([appField, dbCol]) => {
        reverseMapping[dbCol] = appField;
    });

    const fields: Record<string, any> = {};
    
    for (const col in row) {
        if (col === 'id' || col === 'created_at' || row[col] === null) continue;
        
        const appKey = reverseMapping[col];
        
        if (appKey) {
            const isForeignKey = 
                (col.endsWith('_id') && col !== 'airtable_id') || 
                col === 'convocatoria_afectada' ||
                col === 'estudiante_id' ||
                col === 'lanzamiento_id';
            
            if (isForeignKey) {
                 fields[appKey] = [row[col]];
            } else {
                 fields[appKey] = row[col];
            }
        }
    }

    // --- Special Transformations ---
    if (tableName === AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS && row['plantilla_seguro_url']) {
        fields['Plantilla Seguro'] = [{ url: row['plantilla_seguro_url'] }];
    }

    if (tableName === AIRTABLE_TABLE_NAME_CONVOCATORIAS && row['certificado_url']) {
        fields['Certificado'] = [{ url: row['certificado_url'] }];
    }

    if (tableName === AIRTABLE_TABLE_NAME_FINALIZACION) {
        // Importante: Supabase devuelve columnas JSONB como objetos/arrays JS directamente.
        // Los asignamos tal cual para que el componente FinalizacionReview los reciba como array.
        if (row['informe_final_url']) fields['Informes'] = row['informe_final_url'];
        if (row['planilla_horas_url']) fields['Excel de Seguimiento'] = row['planilla_horas_url'];
        if (row['planilla_asistencia_url']) fields['Planillas de asistencias '] = row['planilla_asistencia_url'];
    }

    return fields;
};