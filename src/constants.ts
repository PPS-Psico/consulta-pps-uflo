
// --- Supabase Configuration ---
export const SUPABASE_URL = "https://qxnxtnhtbpsgzprqtrjl.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4bnh0bmh0YnBzZ3pwcnF0cmpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NjIzNDEsImV4cCI6MjA3OTAzODM0MX0.Lwj2kZPjYaM6M7VbUX48hSnCh3N2YB6iMJtdhFP9brU";

// Table Names (Mapped to Supabase SQL Tables)
export const TABLE_NAME_PPS = 'solicitudes_pps';
export const TABLE_NAME_PRACTICAS = 'practicas';
export const TABLE_NAME_ESTUDIANTES = 'estudiantes';
export const TABLE_NAME_AUTH_USERS = 'auth_users';
export const TABLE_NAME_LANZAMIENTOS_PPS = 'lanzamientos_pps';
export const TABLE_NAME_CONVOCATORIAS = 'convocatorias';
export const TABLE_NAME_INSTITUCIONES = 'instituciones';
export const TABLE_NAME_FINALIZACION = 'finalizacion_pps';
export const TABLE_NAME_PENALIZACIONES = 'penalizaciones';

// --- DB COLUMN NAMES (PostgreSQL Actual Columns) ---
// These are now the Source of Truth for the UI Field Constants as well
export const COL_ID = 'id';
export const COL_CREATED_AT = 'created_at';

// --- UI FIELD KEYS (Unified with DB Columns) ---
// Formerly legacy Airtable names, now updated to snake_case DB columns

// Estudiantes
export const FIELD_LEGAJO_ESTUDIANTES = 'legajo';
export const FIELD_NOMBRE_ESTUDIANTES = 'nombre';
export const FIELD_NOMBRE_SEPARADO_ESTUDIANTES = 'nombre_separado';
export const FIELD_APELLIDO_SEPARADO_ESTUDIANTES = 'apellido_separado';
export const FIELD_GENERO_ESTUDIANTES = 'genero';
export const FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES = 'orientacion_elegida';
export const FIELD_DNI_ESTUDIANTES = 'dni';
export const FIELD_FECHA_NACIMIENTO_ESTUDIANTES = 'fecha_nacimiento';
export const FIELD_CORREO_ESTUDIANTES = 'correo';
export const FIELD_TELEFONO_ESTUDIANTES = 'telefono';
export const FIELD_NOTAS_INTERNAS_ESTUDIANTES = 'notas_internas';
export const FIELD_FECHA_FINALIZACION_ESTUDIANTES = 'fecha_finalizacion';
export const FIELD_FINALIZARON_ESTUDIANTES = 'finalizaron';
export const FIELD_USER_ID_ESTUDIANTES = 'user_id';
export const FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES = 'must_change_password';
export const FIELD_ROLE_ESTUDIANTES = 'role'; // Nuevo campo

// Prácticas
export const FIELD_NOMBRE_BUSQUEDA_PRACTICAS = 'legajo_busqueda'; // Legacy/Aux field kept for search if needed
export const FIELD_ESTUDIANTE_LINK_PRACTICAS = 'estudiante_id';
export const FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS = 'nombre_institucion'; 
export const FIELD_HORAS_PRACTICAS = 'horas_realizadas';
export const FIELD_FECHA_INICIO_PRACTICAS = 'fecha_inicio';
export const FIELD_FECHA_FIN_PRACTICAS = 'fecha_finalizacion';
export const FIELD_ESTADO_PRACTICA = 'estado';
export const FIELD_ESPECIALIDAD_PRACTICAS = 'especialidad';
export const FIELD_NOTA_PRACTICAS = 'nota';
export const FIELD_LANZAMIENTO_VINCULADO_PRACTICAS = 'lanzamiento_id';
export const FIELD_INSTITUCION_LINK_PRACTICAS = 'institucion_id';

// Solicitud de PPS
export const FIELD_EMPRESA_PPS_SOLICITUD = 'nombre_institucion';
export const FIELD_ESTADO_PPS = 'estado_seguimiento';
export const FIELD_ULTIMA_ACTUALIZACION_PPS = 'actualizacion';
export const FIELD_NOTAS_PPS = 'notas';
export const FIELD_LEGAJO_PPS = 'estudiante_id';
export const FIELD_SOLICITUD_LEGAJO_ALUMNO = 'legajo';
export const FIELD_SOLICITUD_NOMBRE_ALUMNO = 'nombre_alumno';
export const FIELD_SOLICITUD_EMAIL_ALUMNO = 'email';
export const FIELD_SOLICITUD_ORIENTACION_SUGERIDA = 'orientacion_sugerida';
export const FIELD_SOLICITUD_LOCALIDAD = 'localidad';
export const FIELD_SOLICITUD_DIRECCION = 'direccion_completa';
export const FIELD_SOLICITUD_EMAIL_INSTITUCION = 'email_institucion';
export const FIELD_SOLICITUD_TELEFONO_INSTITUCION = 'telefono_institucion';
export const FIELD_SOLICITUD_REFERENTE = 'referente_institucion';
export const FIELD_SOLICITUD_TIENE_CONVENIO = 'convenio_uflo';
export const FIELD_SOLICITUD_TIENE_TUTOR = 'tutor_disponible';
export const FIELD_SOLICITUD_CONTACTO_TUTOR = 'contacto_tutor';
export const FIELD_SOLICITUD_TIPO_PRACTICA = 'tipo_practica';
export const FIELD_SOLICITUD_DESCRIPCION = 'descripcion_institucion';

// AuthUsers (Legacy/Aux)
export const FIELD_LEGAJO_AUTH = 'legajo';
export const FIELD_NOMBRE_AUTH = 'nombre';
export const FIELD_PASSWORD_HASH_AUTH = 'password_hash';
export const FIELD_SALT_AUTH = 'salt';
export const FIELD_ROLE_AUTH = 'role';
export const FIELD_ORIENTACIONES_AUTH = 'orientaciones';

// Lanzamientos de PPS
export const FIELD_NOMBRE_PPS_LANZAMIENTOS = 'nombre_pps';
export const FIELD_FECHA_INICIO_LANZAMIENTOS = 'fecha_inicio';
export const FIELD_FECHA_FIN_LANZAMIENTOS = 'fecha_finalizacion';
export const FIELD_DIRECCION_LANZAMIENTOS = 'direccion';
export const FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS = 'horario_seleccionado';
export const FIELD_ORIENTACION_LANZAMIENTOS = 'orientacion';
export const FIELD_HORAS_ACREDITADAS_LANZAMIENTOS = 'horas_acreditadas';
export const FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS = 'cupos_disponibles';
export const FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS = 'estado_convocatoria';
export const FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS = 'plazo_inscripcion_dias';
export const FIELD_PLANTILLA_SEGURO_LANZAMIENTOS = 'plantilla_seguro_url';
export const FIELD_INFORME_LANZAMIENTOS = 'informe';
export const FIELD_ESTADO_GESTION_LANZAMIENTOS = 'estado_gestion';
export const FIELD_NOTAS_GESTION_LANZAMIENTOS = 'notas_gestion';
export const FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS = 'fecha_relanzamiento';
export const FIELD_TELEFONO_INSTITUCION_LANZAMIENTOS = 'telefono'; 
export const FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS = 'permite_certificado';
export const FIELD_AIRTABLE_ID = 'airtable_id';

// Instituciones
export const FIELD_NOMBRE_INSTITUCIONES = 'nombre';
export const FIELD_TELEFONO_INSTITUCIONES = 'telefono';
export const FIELD_DIRECCION_INSTITUCIONES = 'direccion';
export const FIELD_CONVENIO_NUEVO_INSTITUCIONES = 'convenio_nuevo';
export const FIELD_TUTOR_INSTITUCIONES = 'tutor';

// Convocatorias
export const FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS = 'lanzamiento_id';
export const FIELD_NOMBRE_PPS_CONVOCATORIAS = 'nombre_pps';
export const FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS = 'estudiante_id';
export const FIELD_FECHA_INICIO_CONVOCATORIAS = 'fecha_inicio';
export const FIELD_FECHA_FIN_CONVOCATORIAS = 'fecha_finalizacion';
export const FIELD_DIRECCION_CONVOCATORIAS = 'direccion';
export const FIELD_HORARIO_FORMULA_CONVOCATORIAS = 'horario_seleccionado';
export const FIELD_HORAS_ACREDITADAS_CONVOCATORIAS = 'horas_acreditadas';
export const FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS = 'cupos_disponibles';
export const FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS = 'estado_inscripcion';
export const FIELD_ORIENTACION_CONVOCATORIAS = 'orientacion';
export const FIELD_TERMINO_CURSAR_CONVOCATORIAS = 'termino_cursar';
export const FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS = 'cursando_electivas';
export const FIELD_FINALES_ADEUDA_CONVOCATORIAS = 'finales_adeuda';
export const FIELD_OTRA_SITUACION_CONVOCATORIAS = 'otra_situacion_academica';
export const FIELD_LEGAJO_CONVOCATORIAS = 'legajo';
export const FIELD_DNI_CONVOCATORIAS = 'dni';
export const FIELD_CORREO_CONVOCATORIAS = 'correo';
export const FIELD_FECHA_NACIMIENTO_CONVOCATORIAS = 'fecha_nacimiento';
export const FIELD_TELEFONO_CONVOCATORIAS = 'telefono';
export const FIELD_INFORME_SUBIDO_CONVOCATORIAS = 'informe_subido';
export const FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS = 'fecha_entrega_informe';
export const FIELD_CERTIFICADO_CONVOCATORIAS = 'certificado_url';

// Finalizacion PPS
export const FIELD_ESTUDIANTE_FINALIZACION = 'estudiante_id';
export const FIELD_FECHA_SOLICITUD_FINALIZACION = 'fecha_solicitud';
export const FIELD_ESTADO_FINALIZACION = 'estado';
export const FIELD_INFORME_FINAL_FINALIZACION = 'informe_final_url';
export const FIELD_PLANILLA_HORAS_FINALIZACION = 'planilla_horas_url';
export const FIELD_PLANILLA_ASISTENCIA_FINALIZACION = 'planilla_asistencia_url';
export const FIELD_SUGERENCIAS_MEJORAS_FINALIZACION = 'sugerencias_mejoras';

// Historial de Penalizaciones
export const FIELD_PENALIZACION_ESTUDIANTE_LINK = 'estudiante_id';
export const FIELD_PENALIZACION_TIPO = 'tipo_incumplimiento';
export const FIELD_PENALIZACION_NOTAS = 'notas';
export const FIELD_PENALIZACION_FECHA = 'fecha_incidente';
export const FIELD_PENALIZACION_PUNTAJE = 'puntaje_penalizacion';
export const FIELD_PENALIZACION_CONVOCATORIA_LINK = 'convocatoria_afectada';


// --- Redundant Column Constants (Kept for backward compat within migration phase) ---
export const COL_ESTUDIANTE_LEGAJO = FIELD_LEGAJO_ESTUDIANTES;
export const COL_ESTUDIANTE_USER_ID = FIELD_USER_ID_ESTUDIANTES;
export const COL_ESTUDIANTE_NOMBRE = FIELD_NOMBRE_ESTUDIANTES;
export const COL_PRACTICA_ESTUDIANTE_ID = FIELD_ESTUDIANTE_LINK_PRACTICAS;
export const COL_PRACTICA_LANZAMIENTO_ID = FIELD_LANZAMIENTO_VINCULADO_PRACTICAS;
export const COL_PRACTICA_INSTITUCION_NOMBRE = FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS;
export const COL_PRACTICA_FECHA_INICIO = FIELD_FECHA_INICIO_PRACTICAS;
export const COL_CONVOCATORIA_ESTUDIANTE_ID = FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS;
export const COL_CONVOCATORIA_LANZAMIENTO_ID = FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS;
export const COL_CONVOCATORIA_ESTADO = FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS;
export const COL_LANZAMIENTO_NOMBRE = FIELD_NOMBRE_PPS_LANZAMIENTOS;
export const COL_LANZAMIENTO_FECHA_INICIO = FIELD_FECHA_INICIO_LANZAMIENTOS;
export const COL_LANZAMIENTO_FECHA_FIN = FIELD_FECHA_FIN_LANZAMIENTOS;
export const COL_LANZAMIENTO_ESTADO = FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS;
export const COL_LANZAMIENTO_ESTADO_GESTION = FIELD_ESTADO_GESTION_LANZAMIENTOS;
export const COL_SOLICITUD_ESTUDIANTE_ID = FIELD_LEGAJO_PPS;
export const COL_SOLICITUD_UPDATED_AT = FIELD_ULTIMA_ACTUALIZACION_PPS;
export const COL_SOLICITUD_ESTADO = FIELD_ESTADO_PPS;
export const COL_SOLICITUD_INSTITUCION = FIELD_EMPRESA_PPS_SOLICITUD;
export const COL_FINALIZACION_ESTUDIANTE_ID = FIELD_ESTUDIANTE_FINALIZACION;
export const COL_FINALIZACION_ESTADO = FIELD_ESTADO_FINALIZACION;

// --- Email Automation Keys ---
export const KEY_SELECTION_SUBJECT = 'pps_email_subject';
export const KEY_SELECTION_BODY = 'pps_email_body';
export const KEY_SELECTION_ACTIVE = 'pps_email_automation';

export const KEY_REQUEST_SUBJECT = 'pps_email_req_subject';
export const KEY_REQUEST_BODY = 'pps_email_req_body';
export const KEY_REQUEST_ACTIVE = 'pps_email_req_active';

export const KEY_SAC_SUBJECT = 'pps_email_sac_subject';
export const KEY_SAC_BODY = 'pps_email_sac_body';
export const KEY_SAC_ACTIVE = 'pps_email_sac_active';

export const KEY_SERVICE_ID = 'pps_email_service_id';
export const KEY_TEMPLATE_ID = 'pps_email_template_id';
export const KEY_PUBLIC_KEY = 'pps_email_public_key';

export const KEY_EMAIL_COUNT = 'pps_email_monthly_count';
export const KEY_EMAIL_MONTH = 'pps_email_current_month_key';
export const MONTHLY_LIMIT = 200;

// --- Academic criteria constants ---
export const HORAS_OBJETIVO_TOTAL = 250;
export const HORAS_OBJETIVO_ORIENTACION = 70;
export const ROTACION_OBJETIVO_ORIENTACIONES = 3;

// --- UI text constants ---
export const ALERT_PRACTICAS_TITLE = 'Aviso Importante';
export const ALERT_PRACTICAS_TEXT = 'La información visualizada es una herramienta de seguimiento interno y no constituye un registro académico oficial; puede contener errores. Para solicitar una corrección, es indispensable enviar un correo electrónico adjuntando la documentación que respalde el cambio (ej: planillas, certificados). No se procesarán solicitudes que no incluyan la documentación requerida.';
export const ALERT_INFORMES_TITLE = 'Sobre las Fechas de Entrega de Informes';
export const ALERT_INFORMES_TEXT = 'Las fechas de entrega de los informes pueden variar levemente, ya que se basan en la proyección de finalización de una PPS. Si la fecha no coincide con la finalización real, no te preocupes: siempre se respetarán los 30 días reglamentarios para entregar el informe. Puedes solicitar una corrección de fecha a través del correo.';


// --- Misc ---
export const EMAIL_SEGUROS = 'mesadeayuda.patagonia@uflouniversidad.edu.ar';
export const TEMPLATE_PPS_NAME = 'Colegio Virgen de Luján';
