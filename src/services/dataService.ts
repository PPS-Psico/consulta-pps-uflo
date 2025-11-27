
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
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_LEGAJO_PPS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_EMPRESA_PPS_SOLICITUD,
  FIELD_ESTADO_PPS,
  FIELD_NOTAS_PPS,
  FIELD_ESTUDIANTE_LINK_PRACTICAS,
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_AIRTABLE_ID,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import { lanzamientoPPSArraySchema } from '../schemas';
import { fetchAllData } from './supabaseService';

// --- MOCK DATA FOR TESTING USER ---
const mockStudentDetails: EstudianteFields = {
  [FIELD_LEGAJO_ESTUDIANTES]: '99999',
  [FIELD_NOMBRE_ESTUDIANTES]: 'Usuario de Prueba',
  'Orientación Elegida': 'Clinica',
  'DNI': 12345678,
  'Correo': 'testing@uflo.edu.ar',
  'Teléfono': '1122334455',
  [FIELD_GENERO_ESTUDIANTES]: 'Otro',
};

const mockPracticas: Practica[] = [
  { id: 'prac_mock_1', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Hospital Central', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Clinica', [FIELD_HORAS_PRACTICAS]: 120, [FIELD_FECHA_INICIO_PRACTICAS]: '2023-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2023-12-15', [FIELD_ESTADO_PRACTICA]: 'Finalizada', [FIELD_NOTA_PRACTICAS]: '9' },
  { id: 'prac_mock_2', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Colegio San Martín', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Educacional', [FIELD_HORAS_PRACTICAS]: 80, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-03-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-07-15', [FIELD_ESTADO_PRACTICA]: 'En curso' },
  { id: 'prac_mock_3', [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]: 'Empresa Tech Solutions', [FIELD_ESPECIALIDAD_PRACTICAS]: 'Laboral', [FIELD_HORAS_PRACTICAS]: 50, [FIELD_FECHA_INICIO_PRACTICAS]: '2024-08-01', [FIELD_FECHA_FIN_PRACTICAS]: '2024-10-01', [FIELD_ESTADO_PRACTICA]: 'Finalizada' },
];

const mockSolicitudes: SolicitudPPS[] = [
    { id: 'sol_mock_1', [FIELD_EMPRESA_PPS_SOLICITUD]: 'Consultora Global', [FIELD_ESTADO_PPS]: 'En conversaciones', [FIELD_ULTIMA_ACTUALIZACION_PPS]: '2024-05-20', [FIELD_NOTAS_PPS]: 'Se contactó para coordinar entrevista.' }
];

const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_mock_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hogar de Ancianos "Amanecer"', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-09-01', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
    { id: 'lanz_mock_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Fundación "Crecer Juntos"', [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-08-15', [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado', [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com' },
];

const mockMyEnrollments: Convocatoria[] = [
    { id: 'conv_mock_1', [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Seleccionado', [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: ['lanz_mock_2'], [FIELD_NOMBRE_PPS_CONVOCATORIAS]: 'Fundación "Crecer Juntos"', [FIELD_FECHA_INICIO_CONVOCATORIAS]: '2024-08-15' },
];


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

  if (!studentRecord || !(studentRecord.fields as any)[FIELD_LEGAJO_ESTUDIANTES] || !(studentRecord.fields as any)[FIELD_NOMBRE_ESTUDIANTES]) {
    return { studentDetails: null, studentAirtableId: null };
  }
  
  return { studentDetails: studentRecord.fields as EstudianteFields, studentAirtableId: studentRecord.id };
};

export const fetchPracticas = async (legajo: string): Promise<Practica[]> => {
  if (legajo === '99999') {
    return Promise.resolve(mockPracticas);
  }

  const { studentAirtableId } = await fetchStudentData(legajo);
  if (!studentAirtableId) return [];

  // Filter practices linked to this student
  const records = await db.practicas.getAll({
    filterByFormula: `{${FIELD_ESTUDIANTE_LINK_PRACTICAS}} = '${studentAirtableId}'`
  });

  // --- MANUAL JOIN LOGIC ---
  // Fetch ALL launches to link names, as practices table might only have IDs
  const launchRecords = await db.lanzamientos.getAll({
      fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_AIRTABLE_ID]
  });

  const launchMap = new Map<string, string>();
  
  launchRecords.forEach(l => {
      const name = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
      const airtableId = l.fields[FIELD_AIRTABLE_ID];
      if (name) {
          // Map Supabase UUID -> Name
          launchMap.set(l.id, name);
          
          // Map Airtable ID -> Name (Critical for legacy migrated records)
          if (airtableId) {
              const safeAirtableId = Array.isArray(airtableId) ? String(airtableId[0]) : String(airtableId);
              launchMap.set(safeAirtableId, name);
          }
      }
  });

  return records.map(r => {
      const data = { ...(r.fields as any), id: r.id };
      
      // Attempt to resolve the institution name from the linked launch
      let linkedLaunchId: string | undefined;
      const rawLink = data[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
      
      if (Array.isArray(rawLink) && rawLink.length > 0) linkedLaunchId = String(rawLink[0]);
      else if (typeof rawLink === 'string') linkedLaunchId = rawLink;

      let institutionName: string | null = null;

      // 1. Try to get name from linked Launch
      if (linkedLaunchId && launchMap.has(linkedLaunchId)) {
          institutionName = launchMap.get(linkedLaunchId)!;
      }

      // 2. If not found via link, check the existing text field in the practice record (Legacy Name)
      if (!institutionName) {
          const currentName = data[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
          if (Array.isArray(currentName) && currentName.length > 0) {
              institutionName = currentName[0];
          } else if (typeof currentName === 'string' && currentName.trim() !== '') {
              institutionName = currentName;
          }
      }

      // 3. Fallback if absolutely nothing found
      if (!institutionName) {
          institutionName = 'Institución desconocida';
      }

      // Assign the resolved name to the field expected by UI components
      data[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] = [institutionName];
      
      return data;
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

  const records = await db.solicitudes.getAll({ 
    filterByFormula: `{${FIELD_LEGAJO_PPS}} = '${targetId}'`,
    sort: [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]
  });
  
  return records.map(r => ({ ...(r.fields as any), id: r.id }));
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

  const myEnrollments = convocatoriasRecords
      .filter(r => {
          const linkedStudent = r.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
          const linkedLegajo = r.fields[FIELD_LEGAJO_CONVOCATORIAS];
          
          // Defensive check for both string and array formats
          if (studentAirtableId) {
              if (Array.isArray(linkedStudent) && linkedStudent.includes(studentAirtableId)) return true;
              if (typeof linkedStudent === 'string' && linkedStudent === studentAirtableId) return true;
          }
          
          if (Array.isArray(linkedLegajo)) {
            const arr = linkedLegajo as unknown as any[];
            return arr.includes(Number(legajo)) || arr.includes(legajo);
          }
          return String(linkedLegajo) == legajo;
      })
      .map(r => ({ ...(r.fields as any), id: r.id }));
  
  const allLanzamientosRecords = lanzamientosRecords.map(r => ({ ...(r.fields as any), id: r.id }));
  
  const lanzamientos = allLanzamientosRecords.filter(lanzamiento => {
    const estado = normalizeStringForComparison(lanzamiento[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
    return estado !== 'oculto';
  });

  const institutionAddressMap = new Map<string, string>();
  institutionsRecords.forEach(record => {
      const name = record.fields[FIELD_NOMBRE_INSTITUCIONES];
      const address = record.fields[FIELD_DIRECCION_INSTITUCIONES];
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
        const state = String(c.fields[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] || '').toLowerCase();
        const linkedIds = c.fields[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS];
        
        let isLinked = false;
        if (Array.isArray(linkedIds)) isLinked = linkedIds.includes(lanzamientoId);
        else if (typeof linkedIds === 'string') isLinked = linkedIds === lanzamientoId;

        return state.includes('seleccionado') && isLinked;
    });

    if (filteredConvocatorias.length === 0) return null;

    const studentIds = [...new Set(filteredConvocatorias.flatMap(c => {
        const raw = c.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
        return Array.isArray(raw) ? raw : [raw];
    }).filter(Boolean) as string[])];

    if (studentIds.length === 0) return null;

    const studentRecords = await db.estudiantes.getAll();
    const studentMap = new Map(studentRecords.filter(s => studentIds.includes(s.id)).map(r => [r.id, r.fields]));

    const grouped: GroupedSeleccionados = {};
    filteredConvocatorias.forEach(convRecord => {
        const rawStudent = convRecord.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
        const studentId = Array.isArray(rawStudent) ? rawStudent[0] : rawStudent;
        
        const student = studentId ? studentMap.get(String(studentId)) : null;
        
        if (student) {
            const horario = convRecord.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
            if (!grouped[horario]) grouped[horario] = [];
            grouped[horario].push({ nombre: student[FIELD_NOMBRE_ESTUDIANTES] || 'N/A', legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A' });
        }
    });
    
    for (const horario in grouped) {
        grouped[horario].sort((a, b) => a.nombre.localeCompare(b.nombre));
    }

    if (Object.keys(grouped).length === 0) return null;

    return grouped;
};

function getLookupName(fieldValue: any): string | null {
    if (Array.isArray(fieldValue)) return typeof fieldValue[0] === 'string' ? fieldValue[0] : null;
    return typeof fieldValue === 'string' ? fieldValue : null;
}

function findLanzamientoForConvocatoria(convocatoria: Convocatoria, lanzamientosMap: Map<string, LanzamientoPPS>, allLanzamientos: LanzamientoPPS[]): LanzamientoPPS | undefined {
    const rawLink = convocatoria[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS];
    const linkedId = Array.isArray(rawLink) ? rawLink[0] : rawLink;
    
    if (linkedId && lanzamientosMap.has(String(linkedId))) return lanzamientosMap.get(String(linkedId));

    const convPpsName = getLookupName(convocatoria[FIELD_NOMBRE_PPS_CONVOCATORIAS]);
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
    const rawLink = practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
    const linkedId = Array.isArray(rawLink) ? rawLink[0] : rawLink;
    
    if (linkedId) return allLanzamientos.find(l => l.id === String(linkedId));

    const practicaInstitucion = getLookupName(practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
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
            // Find linked practice by ID if possible
            const practica = practicas.find(p => {
                const rawLink = p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                const link = Array.isArray(rawLink) ? rawLink[0] : rawLink;
                return String(link) === pps.id;
            });

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
                    informeSubido: !!(practica as any)[FIELD_INFORME_SUBIDO_CONVOCATORIAS], 
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

// --- NEW FUNCTIONS FOR ENROLLMENT FLOW AUTOMATION ---

/**
 * Toggles a student's selection status for a specific launch.
 * - If selecting: Updates Convocatoria to 'Seleccionado' AND Creates a new 'En curso' Practice record.
 * - If unselecting: Updates Convocatoria to 'Inscripto' AND Deletes the associated Practice record.
 */
export const toggleStudentSelection = async (
    convocatoriaId: string,
    isSelecting: boolean,
    studentId: string,
    lanzamiento: LanzamientoPPS
): Promise<{ success: boolean, error?: string }> => {
    const newStatus = isSelecting ? 'Seleccionado' : 'Inscripto';

    try {
        // 1. Update Convocatoria Status
        await db.convocatorias.update(convocatoriaId, { estadoInscripcion: newStatus });

        if (isSelecting) {
            // 2a. Create Practice Record
            const newPractice = {
                estudianteLink: [studentId],
                lanzamientoVinculado: [lanzamiento.id],
                estado: 'En curso',
                fechaInicio: lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                fechaFin: lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
                especialidad: lanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
                horasRealizadas: lanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
                nombreInstitucion: [lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]!], // Backup text
                nota: 'Sin calificar'
            };
            await db.practicas.create(newPractice);

        } else {
            // 2b. Delete Practice Record
            // Find the practice linked to this student and launch
            const practices = await db.practicas.getAll({
                filterByFormula: `AND({${FIELD_ESTUDIANTE_LINK_PRACTICAS}} = '${studentId}', {${FIELD_LANZAMIENTO_VINCULADO_PRACTICAS}} = '${lanzamiento.id}')`
            });
            
            if (practices.length > 0) {
                // Assuming one practice per launch per student
                await db.practicas.delete(practices[0].id);
            }
        }

        return { success: true };
    } catch (error: any) {
        console.error("Error updating selection:", error);
        return { success: false, error: error.message || 'Unknown error' };
    }
};

/**
 * Automates the closing of practices.
 * Runs a check for all practices with status 'En curso' where the end date has passed.
 * Updates them to 'Finalizada'.
 * 
 * REVISED: Now performs safe client-side filtering to avoid mass updates due to filter incompatibilities.
 */
export const autoCloseExpiredPractices = async (): Promise<number> => {
    try {
        // 1. Fetch ONLY practices that are marked 'En curso'.
        // The supabaseService filter translator handles simple equality {Field} = 'Value' reliably.
        const activePractices = await db.practicas.getAll({
            filterByFormula: `{${FIELD_ESTADO_PRACTICA}} = 'En curso'`
        });

        if (activePractices.length === 0) return 0;

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of day for comparison

        const expiredUpdates: { id: string; fields: Partial<PracticaFields> }[] = [];

        // 2. Filter manually in JavaScript for safety and precision with dates.
        for (const practice of activePractices) {
            const endDateStr = practice.fields[FIELD_FECHA_FIN_PRACTICAS];
            if (!endDateStr) continue; // Skip if no end date

            const endDate = parseToUTCDate(endDateStr);
            
            // If valid date and strictly before today
            if (endDate && endDate < today) {
                expiredUpdates.push({
                    id: practice.id,
                    fields: { [FIELD_ESTADO_PRACTICA]: 'Finalizada' }
                });
            }
        }

        if (expiredUpdates.length === 0) return 0;

        // 3. Perform updates
        await db.practicas.updateMany(expiredUpdates as any);
        
        console.log(`Auto-closed ${expiredUpdates.length} expired practices.`);
        return expiredUpdates.length;

    } catch (error) {
        console.error("Error auto-closing practices:", error);
        return 0;
    }
};
