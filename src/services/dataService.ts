
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask,
  EstudianteFields,
  GroupedSeleccionados,
  FinalizacionPPS
} from '../types';
import * as C from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';

// --- MOCK DATA (Legacy) ---
const mockStudentDetails: EstudianteFields = {
  [C.FIELD_LEGAJO_ESTUDIANTES]: '99999',
  [C.FIELD_NOMBRE_ESTUDIANTES]: 'Usuario de Prueba',
  [C.FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: 'Clinica',
  [C.FIELD_DNI_ESTUDIANTES]: 12345678,
  [C.FIELD_CORREO_ESTUDIANTES]: 'testing@uflo.edu.ar',
  [C.FIELD_TELEFONO_ESTUDIANTES]: '1122334455',
  [C.FIELD_GENERO_ESTUDIANTES]: 'Otro',
};

const mockPracticas: Practica[] = [
  { id: 'prac_mock_1', [C.FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Hospital Central', [C.FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [C.FIELD_HORAS_PRACTICAS]: 120, [C.FIELD_FECHA_INICIO_PRACTICAS]: '2023-08-01', [C.FIELD_FECHA_FIN_PRACTICAS]: '2023-12-15', [C.FIELD_ESTADO_PRACTICA]: 'Finalizada', [C.FIELD_NOTA_PRACTICAS]: '9' },
  { id: 'prac_mock_2', [C.FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Colegio San Martín', [C.FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [C.FIELD_HORAS_PRACTICAS]: 80, [C.FIELD_FECHA_INICIO_PRACTICAS]: '2024-03-01', [C.FIELD_FECHA_FIN_PRACTICAS]: '2024-07-15', [C.FIELD_ESTADO_PRACTICA]: 'En curso' },
  { id: 'prac_mock_3', [C.FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Empresa Tech Solutions', [C.FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [C.FIELD_HORAS_PRACTICAS]: 50, [C.FIELD_FECHA_INICIO_PRACTICAS]: '2024-08-01', [C.FIELD_FECHA_FIN_PRACTICAS]: '2024-10-01', [C.FIELD_ESTADO_PRACTICA]: 'Finalizada' },
] as any;

const mockSolicitudes: SolicitudPPS[] = [
    { id: 'sol_mock_1', [C.FIELD_EMPRESA_PPS_SOLICITUD]: 'Consultora Global', [C.FIELD_ESTADO_PPS]: 'En conversaciones', [C.FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-05-20', [C.FIELD_NOTAS_PPS]: 'Se contactó para coordinar entrevista.' }
] as any;

const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_mock_1', [C.FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hogar de Ancianos "Amanecer"', [C.FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-09-01', [C.FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta', [C.FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
    { id: 'lanz_mock_2', [C.FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Fundación "Crecer Juntos"', [C.FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-08-15', [C.FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado', [C.FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
] as any;

const mockMyEnrollments: Convocatoria[] = [
    { id: 'conv_mock_1', [C.FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [C.FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: 'lanz_mock_2', [C.FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Fundación "Crecer Juntos"', [C.FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15' },
] as any;


// --- CORE FETCH FUNCTIONS ---

export const fetchStudentData = async (legajo: string): Promise<{ studentDetails: EstudianteFields | null; studentAirtableId: string | null; }> => {
  if (legajo === '99999') {
    return Promise.resolve({ studentDetails: mockStudentDetails, studentAirtableId: 'recTestingUser123' });
  }

  const { data, error } = await supabase
    .from(C.TABLE_NAME_ESTUDIANTES)
    .select('*')
    .eq(C.FIELD_LEGAJO_ESTUDIANTES, legajo)
    .single();

  if (error || !data) {
      console.warn("Student not found:", error);
      return { studentDetails: null, studentAirtableId: null };
  }

  const studentDetails: EstudianteFields = {
      ...data,
      createdTime: data.created_at // Alias for legacy compatibility
  };

  return { studentDetails, studentAirtableId: data.id };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
  if (legajo === '99999') return Promise.resolve(mockPracticas);

  const { studentAirtableId } = await fetchStudentData(legajo);
  if (!studentAirtableId) return [];

  const { data, error } = await supabase
    .from(C.TABLE_NAME_PRACTICAS)
    .select(`
        *,
        lanzamiento:lanzamientos_pps!fk_practica_lanzamiento (
            nombre_pps
        )
    `)
    .eq(C.FIELD_ESTUDIANTE_LINK_PRACTICAS, studentAirtableId);

  if (error) {
      console.error("Error fetching practicas:", error);
      return [];
  }

  return data.map((row: any) => {
      const linkedName = row.lanzamiento?.nombre_pps;
      
      return {
          ...row,
          id: row.id,
          createdTime: row.created_at,
          [C.FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: row.nombre_institucion || linkedName || 'Institución desconocida',
          [C.FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: row.lanzamiento_id ? [row.lanzamiento_id] : [], 
      } as Practica;
  });
};

export const fetchSolicitudes = async (legajo: string, studentAirtableId: string | null): Promise<SolicitudPPS[]> => {
  if (legajo === '99999') return Promise.resolve(mockSolicitudes);

  let targetId = studentAirtableId;
  if (!targetId) {
       const { studentAirtableId: fetchedId } = await fetchStudentData(legajo);
       targetId = fetchedId;
  }
  if (!targetId) return [];

  const { data, error } = await supabase
    .from(C.TABLE_NAME_PPS)
    .select('*')
    .eq(C.FIELD_LEGAJO_PPS, targetId)
    .not(C.FIELD_ESTADO_PPS, 'eq', 'Archivado') // Hide archived from active view
    .order(C.COL_SOLICITUD_UPDATED_AT, { ascending: false });

  if (error) return [];

  return data.map(row => ({
      ...row,
      id: row.id,
      createdTime: row.created_at,
      [C.FIELD_LEGAJO_PPS]: [row.estudiante_id], 
  })) as SolicitudPPS[];
};

export const fetchFinalizacionRequest = async (legajo: string, studentAirtableId: string | null): Promise<FinalizacionPPS | null> => {
  if (legajo === '99999') return null;
  
  let targetId = studentAirtableId;
  if (!targetId) {
       const { studentAirtableId: fetchedId } = await fetchStudentData(legajo);
       targetId = fetchedId;
  }
  if (!targetId) return null;

  const { data, error } = await supabase
      .from(C.TABLE_NAME_FINALIZACION)
      .select('*')
      .eq(C.FIELD_ESTUDIANTE_FINALIZACION, targetId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
      
  if (error || !data) return null;
  
  return {
      ...data,
      id: data.id,
      createdTime: data.created_at
  } as FinalizacionPPS;
}

export const fetchConvocatoriasData = async (legajo: string, studentAirtableId: string | null, isSuperUserMode: boolean): Promise<{
    lanzamientos: LanzamientoPPS[],
    myEnrollments: Convocatoria[],
    allLanzamientos: LanzamientoPPS[],
    institutionAddressMap: Map<string, string>,
}> => {
  if (legajo === '99999') {
    return Promise.resolve({
      lanzamientos: mockLanzamientos.filter(l => l[C.FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] !== 'Oculto'),
      myEnrollments: mockMyEnrollments,
      allLanzamientos: mockLanzamientos,
      institutionAddressMap: new Map(),
    });
  }
  
  const [enrollmentsRes, activeLaunchesRes] = await Promise.all([
      studentAirtableId ? supabase
          .from(C.TABLE_NAME_CONVOCATORIAS)
          .select(`*, lanzamiento:lanzamientos_pps!fk_convocatoria_lanzamiento(*)`)
          .eq(C.FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, studentAirtableId) 
          : { data: [], error: null },
      
      supabase
          .from(C.TABLE_NAME_LANZAMIENTOS_PPS)
          .select('*')
          .neq(C.FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, 'Oculto')
          .order(C.FIELD_FECHA_INICIO_LANZAMIENTOS, { ascending: false }),
  ]);

  const myEnrollments: Convocatoria[] = (enrollmentsRes.data || []).map((row: any) => {
      const launch = row.lanzamiento || {};
      return {
          ...row,
          id: row.id,
          createdTime: row.created_at,
          [C.FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [row.lanzamiento_id],
          [C.FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [row.estudiante_id],
          [C.FIELD_NOMBRE_PPS_CONVOCATORIAS]: row.nombre_pps || launch.nombre_pps,
          [C.FIELD_FECHA_INICIO_CONVOCATORIAS]: row.fecha_inicio || launch.fecha_inicio,
          [C.FIELD_FECHA_FIN_CONVOCATORIAS]: row.fecha_finalizacion || launch.fecha_finalizacion,
          [C.FIELD_DIRECCION_CONVOCATORIAS]: row.direccion || launch.direccion,
          [C.FIELD_ORIENTACION_CONVOCATORIAS]: row.orientacion || launch.orientacion,
          [C.FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: row.horas_acreditadas || launch.horas_acreditadas
      } as Convocatoria;
  });

  const lanzamientos = (activeLaunchesRes.data || []).map((l: any) => ({
      ...l,
      id: l.id,
      createdTime: l.created_at
  } as LanzamientoPPS));
  
  const myLinkedLaunches = (enrollmentsRes.data || []).map((row: any) => row.lanzamiento).filter(Boolean).map((l: any) => ({...l, id: l.id, createdTime: l.created_at} as LanzamientoPPS));
  const allLanzamientos = [...lanzamientos, ...myLinkedLaunches];

  const institutionAddressMap = new Map<string, string>();
  lanzamientos.forEach(l => {
      const name = l[C.FIELD_NOMBRE_PPS_LANZAMIENTOS];
      const address = l[C.FIELD_DIRECCION_LANZAMIENTOS];
      if (name && address) {
          institutionAddressMap.set(normalizeStringForComparison(name), address);
      }
  });

  return { lanzamientos, myEnrollments, allLanzamientos, institutionAddressMap };
};

export const fetchSeleccionados = async (lanzamiento: LanzamientoPPS): Promise<GroupedSeleccionados | null> => {
    const lanzamientoId = lanzamiento.id;
    if (!lanzamientoId) return null;

    const { data, error } = await supabase
        .from(C.TABLE_NAME_CONVOCATORIAS)
        .select(`
            horario_seleccionado,
            estudiante:estudiantes!fk_convocatoria_estudiante (
                nombre,
                legajo
            )
        `)
        .eq(C.FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, lanzamientoId)
        .ilike(C.FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, '%seleccionado%'); 

    if (error) {
        console.error("Error fetching seleccionados:", error);
        return null;
    }

    if (!data || data.length === 0) return null;

    const grouped: GroupedSeleccionados = {};
    
    data.forEach((row: any) => {
        const horario = row.horario_seleccionado || 'No especificado';
        const student = Array.isArray(row.estudiante) ? row.estudiante[0] : row.estudiante;
        
        if (student) {
            if (!grouped[horario]) grouped[horario] = [];
            grouped[horario].push({ 
                nombre: student.nombre || 'Nombre Desconocido', 
                legajo: String(student.legajo || '---') 
            });
        }
    });
    
    if (Object.keys(grouped).length === 0) return null;

    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return grouped;
};

export const toggleStudentSelection = async (
    convocatoriaId: string,
    isSelecting: boolean,
    studentId: string,
    lanzamiento: LanzamientoPPS
): Promise<{ success: boolean, error?: string }> => {
    const newStatus = isSelecting ? 'Seleccionado' : 'Inscripto';
    try {
        await db.convocatorias.update(convocatoriaId, { [C.FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: newStatus });
        return { success: true };
    } catch (e: any) {
        const message = e?.error?.message || e.message || 'Unknown error updating selection status';
        return { success: false, error: message };
    }
};

export const autoCloseExpiredPractices = async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    
    const { data: expired } = await supabase
        .from(C.TABLE_NAME_PRACTICAS)
        .select('id')
        .eq(C.FIELD_ESTADO_PRACTICA, 'En curso')
        .lt(C.FIELD_FECHA_FIN_PRACTICAS, today);

    if (!expired || expired.length === 0) return 0;

    const ids = expired.map(r => r.id);
    
    const { error } = await supabase
        .from(C.TABLE_NAME_PRACTICAS)
        .update({ [C.FIELD_ESTADO_PRACTICA]: 'Finalizada' })
        .in('id', ids);
    
    if (error) {
        console.error("Error auto-closing:", error);
        return 0;
    }
    return ids.length;
};

export const deleteFinalizationRequest = async (id: string, record: any): Promise<{ success: boolean, error: any }> => {
    try {
        // 1. Collect file paths
        const filesToDelete: string[] = [];
        const fileFields = [
            C.FIELD_INFORME_FINAL_FINALIZACION, 
            C.FIELD_PLANILLA_HORAS_FINALIZACION, 
            C.FIELD_PLANILLA_ASISTENCIA_FINALIZACION
        ];

        fileFields.forEach(field => {
            const raw = record[field];
            if (raw) {
                let attachments = [];
                try {
                    attachments = typeof raw === 'string' ? JSON.parse(raw) : raw;
                } catch (e) {
                     console.warn("Error parsing attachment JSON for deletion:", e);
                }

                if (Array.isArray(attachments)) {
                    attachments.forEach((att: any) => {
                        // The URL typically looks like: .../storage/v1/object/public/documentos_finalizacion/FOLDER/FILE
                        // We need the path AFTER the bucket name.
                        if (att.url) {
                            const urlParts = att.url.split('/documentos_finalizacion/');
                            if (urlParts.length > 1) {
                                filesToDelete.push(urlParts[1]);
                            }
                        }
                    });
                }
            }
        });

        // 2. Delete files from Storage
        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('documentos_finalizacion')
                .remove(filesToDelete);
            
            if (storageError) {
                console.error("Error removing files from storage:", storageError);
                // We continue to delete the record even if storage deletion fails partially
            }
        }

        // 3. Delete Record
        await db.finalizacion.delete(id);
        return { success: true, error: null };

    } catch (error) {
        console.error("Error deleting finalization request:", error);
        return { success: false, error };
    }
};
