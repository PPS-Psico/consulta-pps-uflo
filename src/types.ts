
import { z } from 'zod';
import {
    estudianteFieldsSchema,
    practicaFieldsSchema,
    solicitudPPSFieldsSchema,
    lanzamientoPPSFieldsSchema,
    convocatoriaFieldsSchema,
    institucionFieldsSchema,
    penalizacionFieldsSchema,
    finalizacionPPSFieldsSchema,
    authUserFieldsSchema,
    ALL_ORIENTACIONES,
} from './schemas';

import {
    FIELD_PENALIZACION_ESTUDIANTE_LINK,
    FIELD_PENALIZACION_TIPO,
    FIELD_PENALIZACION_FECHA,
    FIELD_PENALIZACION_NOTAS,
    FIELD_PENALIZACION_PUNTAJE,
    FIELD_PENALIZACION_CONVOCATORIA_LINK,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS
} from './constants';

// --- Base Record Type ---
// Represents a flat database row
export interface DBRecord {
  id: string;
  created_at?: string;
  // Alias alias for compatibility during migration
  createdTime?: string;
}

// Generic App Record Type
export type AppRecord<T> = T & DBRecord;
// Deprecated alias for backwards compatibility during refactor
export type AirtableRecord<T> = AppRecord<T>;

export interface AppError {
  type: string;
  message: string;
}

export interface AppErrorResponse {
  error: AppError | string;
}
// Deprecated alias
export type AirtableErrorResponse = AppErrorResponse;

// --- App-specific Types ---

export interface Attachment {
  url: string;
  filename?: string;
}

export type Orientacion = typeof ALL_ORIENTACIONES[number];
export { ALL_ORIENTACIONES }; // Re-export

export type TabId = 'inicio' | 'informes' | 'solicitudes' | 'practicas' | 'profile' | 'calendario' | 'finalizacion';

export interface CriteriosCalculados {
  horasTotales: number;
  horasFaltantes250: number;
  cumpleHorasTotales: boolean;
  horasOrientacionElegida: number;
  horasFaltantesOrientacion: number;
  cumpleHorasOrientacion: boolean;
  orientacionesCursadasCount: number;
  orientacionesUnicas: string[];
  cumpleRotacion: boolean;
}

// --- Table Fields Interfaces (Inferred from Zod) ---

export type EstudianteFields = z.infer<typeof estudianteFieldsSchema>;

// Extend PracticaFields to explicitly allow manual join fields if needed
export type PracticaFields = z.infer<typeof practicaFieldsSchema> & {
    [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]?: string[] | string;
    [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]?: string | string[];
};

export type SolicitudPPSFields = z.infer<typeof solicitudPPSFieldsSchema>;
export type LanzamientoPPSFields = z.infer<typeof lanzamientoPPSFieldsSchema>;
export type ConvocatoriaFields = z.infer<typeof convocatoriaFieldsSchema>;
export type InstitucionFields = z.infer<typeof institucionFieldsSchema>;
export type FinalizacionPPSFields = z.infer<typeof finalizacionPPSFieldsSchema>;
export type PenalizacionFields = z.infer<typeof penalizacionFieldsSchema>;
export type AuthUserFields = z.infer<typeof authUserFieldsSchema>;

export type Penalizacion = PenalizacionFields & DBRecord;
export type FinalizacionPPS = FinalizacionPPSFields & DBRecord;

// Types with ID (Flat)
export type Practica = PracticaFields & DBRecord;
export type SolicitudPPS = SolicitudPPSFields & DBRecord;
export type LanzamientoPPS = LanzamientoPPSFields & DBRecord;
export type Convocatoria = ConvocatoriaFields & DBRecord;

// --- Component-specific & complex types ---

export interface InformeTask {
  convocatoriaId: string;
  practicaId?: string;
  ppsName: string;
  informeLink?: string;
  fechaFinalizacion: string;
  informeSubido: boolean;
  nota?: string | null;
  fechaEntregaInforme?: string | null;
}

export type SelectedStudent = { nombre: string; legajo: string };
export type GroupedSeleccionados = { [key: string]: SelectedStudent[] };

export interface EnrichedStudent {
    enrollmentId: string;
    studentId: string;
    nombre: string;
    legajo: string;
    correo: string;
    status: string;
    
    // Datos Académicos
    terminoCursar: boolean;
    cursandoElectivas: boolean;
    finalesAdeuda: string;
    notasEstudiante: string;
    
    // Datos Calculados
    totalHoras: number;
    penalizacionAcumulada: number;
    puntajeTotal: number;
    
    // Gestión
    horarioSeleccionado: string;
}

export interface InformeCorreccionStudent {
  studentId: string;
  studentName: string;
  convocatoriaId: string;
  practicaId?: string | null;
  informeSubido: boolean | null;
  nota: string;
  lanzamientoId: string;
  orientacion?: string | null;
  fechaInicio?: string | null;
  fechaFinalizacionPPS?: string | null;
  fechaEntregaInforme?: string | null;
}

export interface InformeCorreccionPPS {
  lanzamientoId: string;
  ppsName: string | null;
  orientacion: string | null;
  informeLink?: string | null;
  fechaFinalizacion?: string | null;
  students: InformeCorreccionStudent[];
}

export interface FlatCorreccionStudent extends InformeCorreccionStudent {
    ppsName: string | null;
    informeLink?: string | null;
    correctionDeadline?: string;
}

export interface CalendarEvent {
    id: string;
    name: string;
    schedule: string;
    orientation: string;
    location: string;
    colorClasses: {
        tag: string;
        dot: string;
    };
    startDate?: string | null;
    endDate?: string | null;
}

export type ReportType = '2024' | '2025' | 'comparative';

export interface TimelineMonthData {
    monthName: string;
    ppsCount: number;
    cuposTotal: number;
    institutions: { name: string; cupos: number; variants: string[] }[];
}

interface KPISnapshot {
    current: number;
    previous: number;
}

export interface ExecutiveReportData {
    reportType: 'singleYear';
    year: number;
    period: {
        current: { start: string; end: string };
        previous: { start: string; end: string };
    };
    summary: string;
    kpis: {
        activeStudents: KPISnapshot;
        studentsWithoutAnyPps: KPISnapshot;
        newStudents: KPISnapshot;
        finishedStudents: KPISnapshot;
        newPpsLaunches: KPISnapshot;
        totalOfferedSpots: KPISnapshot;
        newAgreements: KPISnapshot;
    };
    launchesByMonth: TimelineMonthData[];
    newAgreementsList: string[];
}

interface KPIComparison {
    year2024: number;
    year2025: number;
}
export interface ComparativeExecutiveReportData {
    reportType: 'comparative';
    summary: string;
    kpis: {
        activeStudents: KPIComparison;
        studentsWithoutAnyPps: KPIComparison;
        finishedStudents: KPIComparison;
        newStudents: KPIComparison;
        newPpsLaunches: KPIComparison;
        totalOfferedSpots: KPIComparison;
        newAgreements: KPIComparison;
    };
    launchesByMonth: {
        year2024: TimelineMonthData[];
        year2025: TimelineMonthData[];
    };
    newAgreements: {
        year2024: string[];
        year2025: string[];
    };
}

export type AnyReportData = ExecutiveReportData | ComparativeExecutiveReportData;

export interface StudentInfo {
  legajo: string;
  nombre: string;
  institucion?: string;
  fechaFin?: string;
  ppsId?: string;
  [key: string]: any; // Allow other properties
}
