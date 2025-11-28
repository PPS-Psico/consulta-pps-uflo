
import { db } from '../lib/db';
import {
  Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, InformeTask,
  EstudianteFields,
  GroupedSeleccionados,
  LanzamientoPPSFields,
  ConvocatoriaFields,
  PracticaFields
} from '../types';
import {
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_INFORME_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS,
  FIELD_FECHA_INICIO_LANZAMIENTOS, 
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_FECHA_INICIO_PRACTICAS, FIELD_NOTA_PRACTICAS, FIELD_ULTIMA_ACTUALIZACION_PPS,
  FIELD_LEGAJO_ESTUDIANTES, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS,
  FIELD_GENERO_ESTUDIANTES,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
  FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_ESTADO_PRACTICA,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_DIRECCION_INSTITUCIONES,
  FIELD_LEGAJO_PPS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_EMPRESA_PPS_SOLICITUD,
  FIELD_ESTADO_PPS,
  FIELD_NOTAS_PPS,
  FIELD_ESTUDIANTE_LINK_PRACTICAS,
  FIELD_AIRTABLE_ID,
  FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
  FIELD_DNI_ESTUDIANTES,
  FIELD_CORREO_ESTUDIANTES,
  FIELD_TELEFONO_ESTUDIANTES
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import { lanzamientoPPSArraySchema } from '../schemas';
import { fetchAllData } from './supabaseService';

// --- MOCK DATA UPDATED FOR FLAT STRUCTURE ---
const mockStudentDetails: EstudianteFields = {
  [FIELD_LEGAJO_ESTUDIANTES]: '99999',
  [FIELD_NOMBRE_ESTUDIANTES]: 'Usuario de Prueba',
  [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: 'Clinica',
  [FIELD_DNI_ESTUDIANTES]: 12345678,
  [FIELD_CORREO_ESTUDIANTES]: 'testing@uflo.edu.ar',
  [FIELD_TELEFONO_ESTUDIANTES]: '1122334455',
  [FIELD_GENERO_ESTUDIANTES]: 'Otro',
};

const mockPracticas: Practica[] = [
  { id: 'prac_mock_1', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Hospital Central', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 120, [FIELD_FECHA_INICIO_PRACTICAS]: '2023-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2023-12-15', [FIELD_ESTADO_PRACTICA]: 'Finalizada', [FIELD_NOTA_PRACTICAS]: '9' },
  { id: 'prac_mock_2', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Colegio San Martín', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-03-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-07-15', [FIELD_ESTADO_PRACTICA]: 'En curso' },
  { id: 'prac_mock_3', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Empresa Tech Solutions', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [FIELD_HORAS_PRACTICAS]: 50, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-10-01', [FIELD_ESTADO_PRACTICA]: 'Finalizada' },
] as any;

const mockSolicitudes: SolicitudPPS[] = [
    { id: 'sol_mock_1', [FIELD_EMPRESA_PPS_SOLICITUD]: 'Consultora Global', [FIELD_ESTADO_PPS]: 'En conversaciones', [FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-05-20', [FIELD_NOTAS_PPS]: 'Se contactó para coordinar entrevista.' }
] as any;

const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_mock_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hogar de Ancianos "Amanecer"', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-09-01', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
    { id: 'lanz_mock_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Fundación "Crecer Juntos"', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-08-15', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
] as any;

const mockMyEnrollments: Convocatoria[] = [
    { id: 'conv_mock_1', [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: 'lanz_mock_2', [FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Fundación "Crecer Juntos"', [FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15' },
] as any;


export const fetchStudentData = async (legajo: string): Promise<{ studentDetails: EstudianteFields | null; studentAirtableId: string | null; }> => {
  if (legajo === '99999') {
    return Promise.resolve({
      studentDetails: mockStudentDetails,
      studentAirtableId: 'recTestingUser123',
    });
  }

  const records = await db.estudiantes.get({ 
      filterByFormula: `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`,
      maxRecords: 1 
  });

  const studentRecord = records[0];

  if (!studentRecord) {
    return { studentDetails: null, studentAirtableId: null };
  }
  
  // Return flat object
  return { studentDetails: studentRecord, studentAirtableId: studentRecord.id };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
  if (legajo === '99999') {
    return Promise.resolve(mockPracticas);
  }

  const { studentAirtableId } = await fetchStudentData(legajo);
  if (!studentAirtableId) return [];

  const records = await db.practicas.getAll({
    filterByFormula: `{${FIELD_ESTUDIANTE_LINK_PRACTICAS}} = '${studentAirtableId}'`
  });

  // --- MANUAL JOIN LOGIC ADAPTED FOR FLAT OBJECTS ---
  const launchRecords = await db.lanzamientos.getAll({
      fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_AIRTABLE_ID]
  });

  const launchMap = new Map<string, string>();
  
  launchRecords.forEach(l => {
      const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
      const airtableId = l[FIELD_AIRTABLE_ID];
      if (name) {
          launchMap.set(l.id, name);
          if (airtableId) {
              launchMap.set(airtableId, name);
          }
      }
  });

  return records.map(r => {
      // Clone to avoid mutating source
      const data = { ...r };
      
      let linkedLaunchId = data[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
      let institutionName: string | null = null;

      if (linkedLaunchId && launchMap.has(linkedLaunchId)) {
          institutionName = launchMap.get(linkedLaunchId)!;
      }

      if (!institutionName) {
          const currentName = data[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
          if (currentName) institutionName = currentName;
      }

      if (!institutionName) {
          institutionName = 'Institución desconocida';
      }

      data[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] = institutionName;
      
      return data as Practica;
  });
};

export const fetchSolicitudes = async (legajo: string, studentAirtableId: string | null): Promise<SolicitudPPS[]> => {
  if (legajo === '99999') {
    return Promise.resolve(mockSolicitudes);
  }

  let targetId = studentAirtableId;
  if (!targetId) {
       const { studentAirtableId: fetchedId } = await fetchStudentData(legajo);
       targetId = fetchedId;
  }
  
  if (!targetId) return [];

  // Using the FK field directly
  const records = await db.solicitudes.getAll({ 
    filterByFormula: `{${FIELD_LEGAJO_PPS}} = '${targetId}'`,
    sort: [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]
  });
  
  return records as SolicitudPPS[];
};

export const fetchConvocatoriasData = async (legajo: string, studentAirtableId: string | null, isSuperUserMode: boolean): Promise<{
    lanzamientos: LanzamientoPPS[],
    myEnrollments: Convocatoria[],
    allLanzamientos: LanzamientoPPS[],
    institutionAddressMap: Map<string, string>,
}> => {
  if (legajo === '99999') {
    return Promise.resolve({
      lanzamientos: mockLanzamientos.filter(l => l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] !== 'Oculto'),
      myEnrollments: mockMyEnrollments,
      allLanzamientos: mockLanzamientos,
      institutionAddressMap: new Map(),
    });
  }

  const [convocatoriasRecords, lanzamientosRecords, institutionsRecords] = await Promise.all([
      db.convocatorias.getAll(),
      db.lanzamientos.getAll({ sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }] }),
      db.instituciones.getAll()
  ]);

  const myEnrollments = convocatoriasRecords.filter(r => {
          const linkedStudent = r[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
          const linkedLegajo = r[FIELD_LEGAJO_CONVOCATORIAS];
          
          if (studentAirtableId && linkedStudent === studentAirtableId) return true;
          if (String(linkedLegajo) == legajo) return true;
          return false;
      }) as Convocatoria[];
  
  const allLanzamientosRecords = lanzamientosRecords as LanzamientoPPS[];
  
  const lanzamientos = allLanzamientosRecords.filter(lanzamiento => {
    const estado = normalizeStringForComparison(lanzamiento[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
    return estado !== 'oculto';
  });

  const institutionAddressMap = new Map<string, string>();
  institutionsRecords.forEach(record => {
      const name = record[FIELD_NOMBRE_INSTITUCIONES];
      const address = record[FIELD_DIRECCION_INSTITUCIONES];
      if (name && address) {
          institutionAddressMap.set(normalizeStringForComparison(name), address);
      }
  });

  return { lanzamientos, myEnrollments, allLanzamientos: allLanzamientosRecords, institutionAddressMap };
};

export const fetchSeleccionados = async (lanzamiento: LanzamientoPPS): Promise<GroupedSeleccionados | null> => {
    if (lanzamiento.id === 'lanz_mock_2') {
        return Promise.resolve({'Turno Mañana': [{ nombre: 'Ana Rodriguez', legajo: '99901' }, { nombre: 'Carlos Gomez', legajo: '99902' }], 'Turno Tarde': [{ nombre: 'Lucia Fernandez', legajo: '99903' }]});
    }

    const lanzamientoId = lanzamiento.id;
    if (!lanzamientoId) return null;
    
    const convocatoriasRecords = await db.convocatorias.getAll();
    const filteredConvocatorias = convocatoriasRecords.filter(c => {
        const state = String(c[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] || '').toLowerCase();
        const linkedId = c[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS];
        return state.includes('seleccionado') && linkedId === lanzamientoId;
    });

    if (filteredConvocatorias.length === 0) return null;

    const studentIds = [...new Set(filteredConvocatorias.map(c => c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]).filter(Boolean) as string[])];

    if (studentIds.length === 0) return null;

    const studentRecords = await db.estudiantes.getAll();
    // Now studentRecords is flat array of objects
    const studentMap = new Map(studentRecords.filter(s => studentIds.includes(s.id)).map(r => [r.id, r]));

    const grouped: GroupedSeleccionados = {};
    filteredConvocatorias.forEach(convRecord => {
        const studentId = convRecord[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
        const student = studentId ? studentMap.get(String(studentId)) : null;
        
        if (student) {
            const horario = convRecord[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
            if (!grouped[horario]) grouped[horario] = [];
            grouped[horario].push({ nombre: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A', legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A' });
        }
    });
    
    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    return grouped;
};

function findLanzamientoForConvocatoria(convocatoria: Convocatoria, lanzamientosMap: Map<string, LanzamientoPPS>, allLanzamientos: LanzamientoPPS[]): LanzamientoPPS | undefined {
    const linkedId = convocatoria[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS];
    if (linkedId && lanzamientosMap.has(linkedId)) return lanzamientosMap.get(linkedId);

    const convPpsName = convocatoria[FIELD_NOMBRE_PPS_CONVOCATORIAS];
    const convStartDate = parseToUTCDate(convocatoria[FIELD_FECHA_INICIO_CONVOCATORIAS]);
    if (!convPpsName || !convStartDate) return undefined;

    const normalizedConvName = normalizeStringForComparison(convPpsName);
    let bestMatch: LanzamientoPPS | undefined;
    let smallestDaysDiff = 32;

    for (const lanzamiento of allLanzamientos) {
        const lanzamientoName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        
        if (!lanzamientoName || !lanzamientoStartDate || normalizeStringForComparison(lanzamientoName) !== normalizedConvName) continue;

        const timeDiff = Math.abs(lanzamientoStartDate.getTime() - convStartDate.getTime());
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff < smallestDaysDiff) {
            smallestDaysDiff = daysDiff;
            bestMatch = lanzamiento;
        }
    }
    return bestMatch;
}

function findLanzamientoForPractica(practica: Practica, allLanzamientos: LanzamientoPPS[]): LanzamientoPPS | undefined {
    const linkedId = practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
    if (linkedId) return allLanzamientos.find(l => l.id === linkedId);

    const practicaInstitucion = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
    const practicaOrientacion = practica[FIELD_ESPECIALIDAD_PRACTICAS];
    const practicaFechaInicio = parseToUTCDate(practica[FIELD_FECHA_INICIO_PRACTICAS]);
    
    if (!practicaInstitucion || !practicaOrientacion || !practicaFechaInicio) return undefined;

    const normalizedPracticaName = normalizeStringForComparison(practicaInstitucion);
    let bestMatch: LanzamientoPPS | undefined;
    let smallestDaysDiff = 32; 

    for (const lanzamiento of allLanzamientos) {
        const lanzamientoName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const lanzamientoFechaInicio = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        
        if (!lanzamientoName || !lanzamientoFechaInicio) continue;
        
        if (normalizeStringForComparison(lanzamientoName) !== normalizedPracticaName) continue;

        const timeDiff = Math.abs(practicaFechaInicio.getTime() - lanzamientoFechaInicio.getTime());
        const daysDiff = timeDiff / (1000 * 3600 * 24);

        if (daysDiff < smallestDaysDiff) {
            smallestDaysDiff = daysDiff;
            bestMatch = lanzamiento;
        }
    }
    return bestMatch;
}

export const processInformeTasks = (myEnrollments: Convocatoria[], practicas: Practica[], allLanzamientos: LanzamientoPPS[]): InformeTask[] => {
    const lanzamientosMap = new Map(allLanzamientos.map(l => [l.id, l]));
    const informeTasks: InformeTask[] = [];
    const processedForInforme = new Set<string>();

    const selectedEnrollments = myEnrollments.filter(e => normalizeStringForComparison(e[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado');
    for (const enrollment of selectedEnrollments) {
        const pps = findLanzamientoForConvocatoria(enrollment, lanzamientosMap, allLanzamientos);
        if (pps && pps[FIELD_INFORME_LANZAMIENTOS] && !processedForInforme.has(pps.id)) {
            const practica = practicas.find(p => p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] === pps.id);

            informeTasks.push({
                convocatoriaId: enrollment.id,
                practicaId: practica?.id,
                ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
                informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
                fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
                informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
                nota: practica?.[FIELD_NOTA_PRACTICAS],
                fechaEntregaInforme: enrollment[FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS],
            });
            processedForInforme.add(pps.id);
        }
    }

    const finalizadaStatuses = ['finalizada', 'pps realizada', 'convenio realizado'];
    for (const practica of practicas) {
        const pps = findLanzamientoForPractica(practica, allLanzamientos);
        if (pps) {
            const estadoPractica = normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]);
            if (finalizadaStatuses.includes(estadoPractica) && pps[FIELD_INFORME_LANZAMIENTOS] && !processedForInforme.has(pps.id)) {
                informeTasks.push({
                    convocatoriaId: `practica-${practica.id}`,
                    practicaId: practica.id,
                    ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
                    informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
                    fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
                    // We don't have enrollment info here easily, assume uploaded if graded? 
                    // Actually better to check if practica has a note
                    informeSubido: !!practica[FIELD_NOTA_PRACTICAS], 
                    nota: practica[FIELD_NOTA_PRACTICAS],
                });
                processedForInforme.add(pps.id);
            }
        }
    }
    
    informeTasks.sort((a, b) => {
        const aIsPending = !a.informeSubido;
        const bIsPending = !b.informeSubido;
        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;

        const dateA = parseToUTCDate(a.fechaFinalizacion)?.getTime() || 0;
        const dateB = parseToUTCDate(b.fechaFinalizacion)?.getTime() || 0;
        return dateA - dateB;
    });

    return informeTasks;
};

export const toggleStudentSelection = async (
    convocatoriaId: string,
    isSelecting: boolean,
    studentId: string,
    lanzamiento: LanzamientoPPS
): Promise<{ success: boolean, error?: string }> => {
    const newStatus = isSelecting ? 'Seleccionado' : 'Inscripto';

    try {
        await db.convocatorias.update(convocatoriaId, { [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: newStatus });
        return { success: true };
    } catch (error: any) {
        console.error("Error updating selection:", error);
        return { success: false, error: error.message || 'Unknown error' };
    }
};

export const autoCloseExpiredPractices = async (): Promise<number> => {
    try {
        const activePractices = await db.practicas.getAll({
            filterByFormula: `{${FIELD_ESTADO_PRACTICA}} = 'En curso'`
        });

        if (activePractices.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiredUpdates: { id: string; fields: Partial<PracticaFields> }[] = [];

        for (const practice of activePractices) {
            const endDateStr = practice[FIELD_FECHA_FIN_PRACTICAS];
            if (!endDateStr) continue;

            const endDate = parseToUTCDate(endDateStr);
            if (endDate && endDate < today) {
                expiredUpdates.push({
                    id: practice.id,
                    fields: { [FIELD_ESTADO_PRACTICA]: 'Finalizada' }
                });
            }
        }

        if (expiredUpdates.length === 0) return 0;
        await db.practicas.updateMany(expiredUpdates);
        
        return expiredUpdates.length;

    } catch (error) {
        console.error("Error auto-closing practices:", error);
        return 0;
    }
};
