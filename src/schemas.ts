

import { z } from 'zod';
import {
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOTAS_INTERNAS_ESTUDIANTES,
    FIELD_GENERO_ESTUDIANTES,
    FIELD_NOMBRE_SEPARADO_ESTUDIANTES,
    FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
    FIELD_FECHA_FINALIZACION_ESTUDIANTES,
    FIELD_FINALIZARON_ESTUDIANTES,
    FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES,

    FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_NOTA_PRACTICAS,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_INSTITUCION_LINK_PRACTICAS,

    FIELD_SOLICITUD_LEGAJO_ALUMNO,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_NOTAS_PPS,
    FIELD_SOLICITUD_EMAIL_ALUMNO,
    FIELD_SOLICITUD_ORIENTACION_SUGERIDA,
    FIELD_SOLICITUD_LOCALIDAD,
    FIELD_SOLICITUD_DIRECCION,
    FIELD_SOLICITUD_EMAIL_INSTITUCION,
    FIELD_SOLICITUD_TELEFONO_INSTITUCION,
    FIELD_SOLICITUD_REFERENTE,
    FIELD_SOLICITUD_TIENE_CONVENIO,
    FIELD_SOLICITUD_TIENE_TUTOR,
    FIELD_SOLICITUD_CONTACTO_TUTOR,
    FIELD_SOLICITUD_TIPO_PRACTICA,
    FIELD_SOLICITUD_DESCRIPCION,
    FIELD_LEGAJO_PPS,

    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS,
    FIELD_PLANTILLA_SEGURO_LANZAMIENTOS,
    FIELD_INFORME_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS,
    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
    FIELD_TELEFONO_INSTITUCION_LANZAMIENTOS,
    FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS,
    FIELD_AIRTABLE_ID,

    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_FECHA_FIN_CONVOCATORIAS,
    FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_HORAS_ACREDITADAS_CONVOCATORIAS,
    FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_ORIENTACION_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_LEGAJO_CONVOCATORIAS,
    FIELD_DNI_CONVOCATORIAS,
    FIELD_CORREO_CONVOCATORIAS,
    FIELD_FECHA_NACIMIENTO_CONVOCATORIAS,
    FIELD_TELEFONO_CONVOCATORIAS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_CERTIFICADO_CONVOCATORIAS,

    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_TELEFONO_INSTITUCIONES,
    FIELD_DIRECCION_INSTITUCIONES,
    FIELD_CONVENIO_NUEVO_INSTITUCIONES,
    FIELD_TUTOR_INSTITUCIONES,

    FIELD_PENALIZACION_ESTUDIANTE_LINK,
    FIELD_PENALIZACION_TIPO,
    FIELD_PENALIZACION_FECHA,
    FIELD_PENALIZACION_NOTAS,
    FIELD_PENALIZACION_PUNTAJE,
    FIELD_PENALIZACION_CONVOCATORIA_LINK,

    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_INFORME_FINAL_FINALIZACION,
    FIELD_PLANILLA_HORAS_FINALIZACION,
    FIELD_PLANILLA_ASISTENCIA_FINALIZACION,
    FIELD_SUGERENCIAS_MEJORAS_FINALIZACION,

    FIELD_LEGAJO_AUTH,
    FIELD_NOMBRE_AUTH,
    FIELD_PASSWORD_HASH_AUTH,
    FIELD_SALT_AUTH,
    FIELD_ROLE_AUTH,
    FIELD_ORIENTACIONES_AUTH,

} from './constants';
import type { AirtableRecord } from './types';

export const ALL_ORIENTACIONES = ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'] as const;

export const estudianteFieldsSchema = z.object({
  [FIELD_LEGAJO_ESTUDIANTES]: z.coerce.string().optional(),
  [FIELD_NOMBRE_ESTUDIANTES]: z.string().optional(),
  [FIELD_NOMBRE_SEPARADO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_APELLIDO_SEPARADO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_GENERO_ESTUDIANTES]: z.enum(['Varon', 'Mujer', 'Otro']).optional().nullable(),
  [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_DNI_ESTUDIANTES]: z.number().optional().nullable(),
  [FIELD_FECHA_NACIMIENTO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_CORREO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_TELEFONO_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_NOTAS_INTERNAS_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: z.string().optional().nullable(),
  [FIELD_FINALIZARON_ESTUDIANTES]: z.boolean().optional().nullable(),
  [FIELD_MUST_CHANGE_PASSWORD_ESTUDIANTES]: z.boolean().optional().nullable(),
  'created_at': z.string().optional(),
}).passthrough();

export const practicaFieldsSchema = z.object({
  [FIELD_NOMBRE_BUSQUEDA_PRACTICAS]: z.union([z.string(), z.number()]).optional(),
  [FIELD_ESTUDIANTE_LINK_PRACTICAS]: z.string().optional(), // Single ID in DB
  [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_HORAS_PRACTICAS]: z.number().optional().nullable(),
  [FIELD_FECHA_INICIO_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_FECHA_FIN_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_ESTADO_PRACTICA]: z.string().optional().nullable(),
  [FIELD_ESPECIALIDAD_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_NOTA_PRACTICAS]: z.string().optional().nullable(),
  [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: z.string().optional(), // Single ID in DB
  [FIELD_INSTITUCION_LINK_PRACTICAS]: z.string().optional(), // Single ID in DB
}).passthrough();

export const solicitudPPSFieldsSchema = z.object({
    [FIELD_SOLICITUD_LEGAJO_ALUMNO]: z.union([z.string(), z.number()]).optional().nullable(),
    [FIELD_SOLICITUD_NOMBRE_ALUMNO]: z.string().optional().nullable(),
    [FIELD_EMPRESA_PPS_SOLICITUD]: z.string().optional().nullable(),
    [FIELD_ESTADO_PPS]: z.string().optional().nullable(),
    [FIELD_ULTIMA_ACTUALIZACION_PPS]: z.string().optional().nullable(),
    [FIELD_NOTAS_PPS]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_EMAIL_ALUMNO]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_ORIENTACION_SUGERIDA]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_LOCALIDAD]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_DIRECCION]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_EMAIL_INSTITUCION]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_TELEFONO_INSTITUCION]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_REFERENTE]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_TIENE_CONVENIO]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_TIENE_TUTOR]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_CONTACTO_TUTOR]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_TIPO_PRACTICA]: z.string().optional().nullable(),
    [FIELD_SOLICITUD_DESCRIPCION]: z.string().optional().nullable(),
    [FIELD_LEGAJO_PPS]: z.string().optional().nullable(), // FK, can be null
}).passthrough();

export const lanzamientoPPSFieldsSchema = z.object({
    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_FECHA_INICIO_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_FECHA_FIN_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_DIRECCION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_ORIENTACION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: z.number().optional().nullable(),
    [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: z.number().optional().nullable(),
    [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS]: z.number().optional().nullable(),
    [FIELD_PLANTILLA_SEGURO_LANZAMIENTOS]: z.union([z.array(z.any()), z.string()]).optional().nullable(), // Can be string (url) or array
    [FIELD_INFORME_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_ESTADO_GESTION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_NOTAS_GESTION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_TELEFONO_INSTITUCION_LANZAMIENTOS]: z.string().optional().nullable(),
    [FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS]: z.boolean().optional().nullable(),
    [FIELD_AIRTABLE_ID]: z.string().optional().nullable(),
}).passthrough();

export const convocatoriaFieldsSchema = z.object({
    [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: z.string().optional().nullable(), // Single ID, Allow null
    [FIELD_NOMBRE_PPS_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: z.string().optional().nullable(), // Single ID, Allow null
    [FIELD_FECHA_INICIO_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_FECHA_FIN_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_DIRECCION_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: z.number().optional().nullable(),
    [FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS]: z.number().optional().nullable(),
    [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_ORIENTACION_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_OTRA_SITUACION_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_LEGAJO_CONVOCATORIAS]: z.union([z.number(), z.string()]).optional().nullable(),
    [FIELD_DNI_CONVOCATORIAS]: z.number().optional().nullable(),
    [FIELD_CORREO_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_TELEFONO_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: z.boolean().optional().nullable(),
    [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: z.string().optional().nullable(),
    [FIELD_CERTIFICADO_CONVOCATORIAS]: z.union([z.array(z.any()), z.string()]).optional().nullable(), // Allow array or string
}).passthrough();

export const institucionFieldsSchema = z.object({
    [FIELD_NOMBRE_INSTITUCIONES]: z.string().optional().nullable(),
    [FIELD_DIRECCION_INSTITUCIONES]: z.string().optional().nullable(),
    [FIELD_TELEFONO_INSTITUCIONES]: z.string().optional().nullable(),
    [FIELD_CONVENIO_NUEVO_INSTITUCIONES]: z.boolean().optional().nullable(),
    [FIELD_TUTOR_INSTITUCIONES]: z.string().optional().nullable(),
}).passthrough();

export const penalizacionFieldsSchema = z.object({
    [FIELD_PENALIZACION_ESTUDIANTE_LINK]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_TIPO]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_FECHA]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_NOTAS]: z.string().optional().nullable(),
    [FIELD_PENALIZACION_PUNTAJE]: z.number().optional().nullable(),
    [FIELD_PENALIZACION_CONVOCATORIA_LINK]: z.string().optional().nullable(),
}).passthrough();

export const finalizacionPPSFieldsSchema = z.object({
    [FIELD_ESTUDIANTE_FINALIZACION]: z.string().optional(),
    [FIELD_FECHA_SOLICITUD_FINALIZACION]: z.string().optional().nullable(),
    [FIELD_ESTADO_FINALIZACION]: z.string().optional().nullable(),
    [FIELD_INFORME_FINAL_FINALIZACION]: z.array(z.any()).optional().nullable(),
    [FIELD_PLANILLA_HORAS_FINALIZACION]: z.array(z.any()).optional().nullable(),
    [FIELD_PLANILLA_ASISTENCIA_FINALIZACION]: z.array(z.any()).optional().nullable(),
    [FIELD_SUGERENCIAS_MEJORAS_FINALIZACION]: z.string().optional().nullable(),
}).passthrough();

export const authUserFieldsSchema = z.object({
    [FIELD_LEGAJO_AUTH]: z.string().optional(),
    [FIELD_NOMBRE_AUTH]: z.string().optional(),
    [FIELD_PASSWORD_HASH_AUTH]: z.string().optional(),
    [FIELD_SALT_AUTH]: z.string().optional(),
    [FIELD_ROLE_AUTH]: z.string().optional(),
    [FIELD_ORIENTACIONES_AUTH]: z.string().optional(),
}).passthrough();

// Flat record schema: mix of TFields + { id, created_at }
const flatRecord = <T extends z.ZodTypeAny>(fieldsSchema: T) => 
    fieldsSchema.and(z.object({
        id: z.string(),
        created_at: z.string().optional()
    }));

export const estudianteArraySchema = z.array(flatRecord(estudianteFieldsSchema));
export const practicaArraySchema = z.array(flatRecord(practicaFieldsSchema));
export const solicitudPPSArraySchema = z.array(flatRecord(solicitudPPSFieldsSchema));
export const lanzamientoPPSArraySchema = z.array(flatRecord(lanzamientoPPSFieldsSchema));
export const convocatoriaArraySchema = z.array(flatRecord(convocatoriaFieldsSchema));
export const institucionArraySchema = z.array(flatRecord(institucionFieldsSchema));
export const penalizacionArraySchema = z.array(flatRecord(penalizacionFieldsSchema));
export const finalizacionPPSArraySchema = z.array(flatRecord(finalizacionPPSFieldsSchema));
export const authUserArraySchema = z.array(flatRecord(authUserFieldsSchema));
