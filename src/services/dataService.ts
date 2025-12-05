
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

export const fetchStudentData = async (legajo: string): Promise<{ studentDetails: EstudianteFields | null; studentAirtableId: string | null; }> => {
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
      createdTime: data.created_at,
      [C.FIELD_USER_ID_ESTUDIANTES]: data.user_id, // Map explicit for clarity, though it matches
  } as unknown as EstudianteFields; // Forced casting due to partial mismatch in strictness, but safe for now

  return { studentDetails, studentAirtableId: data.id };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
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

  // Type assertion for joined query result which is hard to type perfectly with generic client
  type PracticaRowWithJoin = {
      id: string;
      created_at: string;
      nombre_institucion: string | null;
      lanzamiento_id: string | null;
      lanzamiento: { nombre_pps: string | null } | null;
      [key: string]: any;
  };

  return (data as unknown as PracticaRowWithJoin[]).map((row) => {
      const linkedName = row.lanzamiento?.nombre_pps;
      const lanzId = row.lanzamiento_id;
      
      return {
          ...row,
          id: row.id,
          createdTime: row.created_at,
          [C.FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: row.nombre_institucion || linkedName || 'Institución desconocida',
          [C.FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: lanzId || null, 
      } as Practica;
  });
};

export const fetchSolicitudes = async (legajo: string, studentAirtableId: string | null): Promise<SolicitudPPS[]> => {
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
    .not(C.FIELD_ESTADO_PPS, 'eq', 'Archivado')
    .order(C.COL_SOLICITUD_UPDATED_AT, { ascending: false });

  if (error) return [];

  return data.map(row => ({
      ...row,
      id: row.id,
      createdTime: row.created_at,
      [C.FIELD_LEGAJO_PPS]: row.estudiante_id, 
  })) as unknown as SolicitudPPS[];
};

export const fetchFinalizacionRequest = async (legajo: string, studentAirtableId: string | null): Promise<FinalizacionPPS | null> => {
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
  } as unknown as FinalizacionPPS;
}

export const fetchConvocatoriasData = async (legajo: string, studentAirtableId: string | null, isSuperUserMode: boolean): Promise<{
    lanzamientos: LanzamientoPPS[],
    myEnrollments: Convocatoria[],
    allLanzamientos: LanzamientoPPS[],
    institutionAddressMap: Map<string, string>,
}> => {
    
  // Define explicit type for joined result
  type EnrollmentWithJoin = {
      id: string;
      created_at: string;
      lanzamiento_id: string | null;
      estudiante_id: string | null;
      nombre_pps: string | null;
      fecha_inicio: string | null;
      fecha_finalizacion: string | null;
      direccion: string | null;
      orientacion: string | null;
      horas_acreditadas: number | null;
      lanzamiento: {
          nombre_pps: string | null;
          fecha_inicio: string | null;
          fecha_finalizacion: string | null;
          direccion: string | null;
          orientacion: string | null;
          horas_acreditadas: number | null;
      } | null;
      [key: string]: any;
  };

  const [enrollmentsRes, activeLaunchesRes] = await Promise.all([
      studentAirtableId ? supabase
          .from(C.TABLE_NAME_CONVOCATORIAS)
          .select(`*, lanzamiento:lanzamientos_pps!fk_convocatoria_lanzamiento(*)`)
          .eq(C.FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, studentAirtableId) 
          : { data: [], error: null },
      
      supabase
          .from(C.TABLE_NAME_LANZAMIENTOS_PPS)
          .select('*')
          .order(C.FIELD_FECHA_INICIO_LANZAMIENTOS, { ascending: false }),
  ]);

  const myEnrollments: Convocatoria[] = (enrollmentsRes.data as unknown as EnrollmentWithJoin[] || []).map((row) => {
      const launch = row.lanzamiento;
      return {
          ...row,
          id: row.id,
          createdTime: row.created_at,
          [C.FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: row.lanzamiento_id,
          [C.FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: row.estudiante_id,
          // Prioritize row data, fallback to joined launch data
          [C.FIELD_NOMBRE_PPS_CONVOCATORIAS]: row.nombre_pps || launch?.nombre_pps,
          [C.FIELD_FECHA_INICIO_CONVOCATORIAS]: row.fecha_inicio || launch?.fecha_inicio,
          [C.FIELD_FECHA_FIN_CONVOCATORIAS]: row.fecha_finalizacion || launch?.fecha_finalizacion,
          [C.FIELD_DIRECCION_CONVOCATORIAS]: row.direccion || launch?.direccion,
          [C.FIELD_ORIENTACION_CONVOCATORIAS]: row.orientacion || launch?.orientacion,
          [C.FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: row.horas_acreditadas || launch?.horas_acreditadas
      } as unknown as Convocatoria;
  });

  const allRawLanzamientos = (activeLaunchesRes.data || []).map((l: any) => ({
      ...l,
      id: l.id,
      createdTime: l.created_at
  } as LanzamientoPPS));
  
  const lanzamientos = allRawLanzamientos.filter(l => 
      l[C.FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] !== 'Oculto' && 
      l[C.FIELD_ESTADO_GESTION_LANZAMIENTOS] !== 'Archivado' &&
      l[C.FIELD_ESTADO_GESTION_LANZAMIENTOS] !== 'No se Relanza'
  );
  
  const allLanzamientos = allRawLanzamientos;

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

    type SeleccionadoRow = {
        horario_seleccionado: string | null;
        estudiante: { nombre: string | null; legajo: string | null } | null;
    };

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
    
    (data as unknown as SeleccionadoRow[]).forEach((row) => {
        const horario = row.horario_seleccionado || 'No especificado';
        // Handle array or single object from join depending on relationship cardinality (usually single for FK)
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

        if (filesToDelete.length > 0) {
            const { error: storageError } = await supabase.storage
                .from('documentos_finalizacion')
                .remove(filesToDelete);
            
            if (storageError) {
                console.error("Error removing files from storage:", storageError);
            }
        }

        await db.finalizacion.delete(id);
        return { success: true, error: null };

    } catch (error) {
        console.error("Error deleting finalization request:", error);
        return { success: false, error };
    }
};
