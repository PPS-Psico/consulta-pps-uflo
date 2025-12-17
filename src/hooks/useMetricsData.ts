import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { mockDb } from '../services/mockDb';
import { 
    TABLE_NAME_ESTUDIANTES, 
    TABLE_NAME_PRACTICAS, 
    TABLE_NAME_CONVOCATORIAS, 
    TABLE_NAME_LANZAMIENTOS_PPS,
    TABLE_NAME_FINALIZACION, 
    TABLE_NAME_INSTITUCIONES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_FINALIZARON_ESTUDIANTES, 
    FIELD_FECHA_INICIO_PRACTICAS, 
    FIELD_ESTUDIANTE_LINK_PRACTICAS, 
    FIELD_FECHA_FINALIZACION_ESTUDIANTES,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DNI_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_HORAS_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_ESTUDIANTE_FINALIZACION, 
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_NOMBRE_INSTITUCIONES, 
    FIELD_CONVENIO_NUEVO_INSTITUCIONES, 
    FIELD_TUTOR_INSTITUCIONES,
    FIELD_USER_ID_ESTUDIANTES,
    TABLE_NAME_PPS,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_SOLICITUD_LEGAJO_ALUMNO,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTADO_PPS,
    FIELD_LEGAJO_PPS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS
} from '../constants';
import { StudentInfo } from '../types';
import { safeGetId, parseToUTCDate, normalizeStringForComparison, formatDate } from '../utils/formatters';

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    return name.split(/ [-–] /)[0].trim();
};

const cleanRawValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str.replace(/[\[\]"]/g, '').trim();
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// SHARED LOGIC: Processes arrays of data (either from Supabase or MockDb)
const processAllData = (allData: any, targetYear: number) => {
     // Prepare Maps and Sets
     const studentEntryMap = new Map<string, Date>();
     const studentTotalHours = new Map<string, number>();
     const studentHasPractice = new Set<string>();
     const studentHasActivePractice = new Set<string>();
     const activeStudentIdsThisYear = new Set<string>();
     const studentFinalizationRequests = new Map<string, Date>();

     // Process Practices
     allData.practicas.forEach((p: any) => {
         const link = safeGetId(p[FIELD_ESTUDIANTE_LINK_PRACTICAS]);
         if (!link) return;
         studentHasPractice.add(link);
         if (normalizeStringForComparison(p[FIELD_ESTADO_PRACTICA]) === 'en curso') {
             studentHasActivePractice.add(link);
         }
         const horas = Number(p[FIELD_HORAS_PRACTICAS] || 0);
         studentTotalHours.set(link, (studentTotalHours.get(link) || 0) + horas);
         
         const fechaInicioStr = p[FIELD_FECHA_INICIO_PRACTICAS];
         if (fechaInicioStr) {
             const date = parseToUTCDate(fechaInicioStr);
             if (date) {
                 const currentEarliest = studentEntryMap.get(link);
                 if (!currentEarliest || date < currentEarliest) studentEntryMap.set(link, date);
                 if (date.getUTCFullYear() === targetYear) activeStudentIdsThisYear.add(link);
             }
         }
     });

     // Process Finalizations
     allData.finalizaciones.forEach((f: any) => {
        const link = safeGetId(f[FIELD_ESTUDIANTE_FINALIZACION]);
        const dateStr = f[FIELD_FECHA_SOLICITUD_FINALIZACION] || f.created_at;
        if (link && dateStr) {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) studentFinalizationRequests.set(link, date);
        }
     });

     // Process Students
     const allStudents = allData.estudiantes.map((s: any) => {
        let isFinishedThisYear = false;
        let isHistoricGraduate = false;
        const finalDateStr = s[FIELD_FECHA_FINALIZACION_ESTUDIANTES];
        const adminFinalDate = finalDateStr ? parseToUTCDate(finalDateStr) : null;
        
        if (s[FIELD_FINALIZARON_ESTUDIANTES] === true && adminFinalDate) {
            if (adminFinalDate.getUTCFullYear() >= targetYear) isFinishedThisYear = true;
            else isHistoricGraduate = true;
        }

        // Logic for finalization request overriding
        const requestDate = studentFinalizationRequests.get(s.id);
        if (requestDate) {
             if (requestDate.getFullYear() === targetYear) {
                 isFinishedThisYear = true;
                 isHistoricGraduate = false;
             }
        }
        
        const hasAccount = !!(s[FIELD_DNI_ESTUDIANTES] && s[FIELD_CORREO_ESTUDIANTES]) || true; // In mock we assume true
        const hours = studentTotalHours.get(s.id) || 0;
        const earliestActivity = studentEntryMap.get(s.id);
        const creationDate = new Date(s.created_at);
        let effectiveStartDate = creationDate;
        if (earliestActivity && earliestActivity < creationDate) effectiveStartDate = earliestActivity;
        
        return {
            id: s.id,
            legajo: s[FIELD_LEGAJO_ESTUDIANTES],
            nombre: s[FIELD_NOMBRE_ESTUDIANTES],
            orientacion: s.orientacion_elegida,
            createdAt: s.created_at,
            effectiveStartDate: effectiveStartDate.toISOString(),
            finalizedAt: isFinishedThisYear ? (finalDateStr || requestDate?.toISOString()) : undefined,
            isFinishedThisYear,
            isHistoricGraduate,
            hasActivityThisYear: activeStudentIdsThisYear.has(s.id),
            hasAccount,
            totalHoras: hours,
            hasActivePractice: studentHasActivePractice.has(s.id)
        };
     });

     // Lists for Dashboard
     const validStudents = allStudents; // Filter out bad data if needed
     const finishedList = validStudents.filter((s: any) => s.isFinishedThisYear);
     // Active definition: Not finished, not historic, AND has activity this year OR was created this year
     const activeList = validStudents.filter((s: any) => !s.isFinishedThisYear && !s.isHistoricGraduate);
     const inactiveButEnrolledList = validStudents.filter((s: any) => !s.isFinishedThisYear && !s.isHistoricGraduate && !s.hasActivityThisYear);
     const proximosAFinalizar = activeList.filter((s: any) => (s.totalHoras >= 230 && s.totalHoras < 250) || (s.totalHoras >= 250 && s.hasActivePractice));
     const sinNingunaPps = activeList.filter((s: any) => !studentHasPractice.has(s.id));
     const alumnosParaAcreditar = activeList.filter((s: any) => s.totalHoras >= 250 && !s.hasActivePractice); // Simple criteria

     // Process Launches (Institutions)
     const launchesForYear = allData.lanzamientos.filter((l: any) => {
         const date = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
         return date && date.getUTCFullYear() === targetYear;
     });
     
     const totalCupos = launchesForYear.reduce((sum: number, l: any) => sum + (Number(l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]) || 0), 0);
     
     const ppsLaunchedMap = new Map<string, { groupName: string, totalCupos: number, variants: number }>();
     launchesForYear.forEach((l: any) => {
         const name = String(l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Sin Nombre');
         const groupName = getGroupName(name);
         const cupos = Number(l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);

         if (!ppsLaunchedMap.has(groupName)) {
             ppsLaunchedMap.set(groupName, { groupName, totalCupos: 0, variants: 0 });
         }
         const item = ppsLaunchedMap.get(groupName)!;
         item.totalCupos += cupos;
         item.variants += 1;
     });
     
     const ppsLanzadasList = Array.from(ppsLaunchedMap.values()).map(item => ({
        nombre: item.groupName,
        legajo: item.variants > 1 ? `${item.variants} comisiones` : 'Única',
        cupos: item.totalCupos
    }));

    const activeInstitutionsList = ppsLanzadasList.map(i => ({ ...i, legajo: 'Activa' }));
    
    // New Agreements
    const newAgreementsList: any[] = [];
    allData.instituciones.forEach((inst: any) => {
        if (inst[FIELD_CONVENIO_NUEVO_INSTITUCIONES]) {
             newAgreementsList.push({
                 nombre: inst[FIELD_NOMBRE_INSTITUCIONES],
                 legajo: inst[FIELD_TUTOR_INSTITUCIONES] || 'Sin tutor',
                 cupos: 'N/A'
             });
        }
    });
    
    // Monthly Launches
    const now = new Date();
    const currentMonth = now.getUTCMonth();
    const monthlyLaunchesMap = new Map<string, any>();
    allData.lanzamientos.forEach((l: any) => {
        const d = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        // For testing, mock current month if not matching
        if (d && d.getUTCMonth() === currentMonth && d.getUTCFullYear() === targetYear) {
             const name = String(l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Sin Nombre');
             const groupName = getGroupName(name);
             const cupos = Number(l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);

             if (!monthlyLaunchesMap.has(groupName)) {
                 monthlyLaunchesMap.set(groupName, { groupName, totalCupos: 0, variants: [] });
             }
             const group = monthlyLaunchesMap.get(groupName)!;
             group.totalCupos += cupos;
             group.variants.push({ id: l.id, name, cupos });
        }
    });
    const lanzamientosMesActual = Array.from(monthlyLaunchesMap.values());

    return {
        alumnosActivos: { value: activeList.length, list: activeList },
        alumnosFinalizados: { value: finishedList.length, list: finishedList },
        alumnosEnPPS: { value: activeList.length - sinNingunaPps.length, list: activeList.filter((s:any) => studentHasPractice.has(s.id)) }, // Approximate for demo
        alumnosConPpsEsteAno: { value: activeList.length, list: activeList }, // Simplify for demo
        alumnosActivosSinPpsEsteAno: { value: inactiveButEnrolledList.length, list: inactiveButEnrolledList },
        
        ppsLanzadas: { value: ppsLanzadasList.length, list: ppsLanzadasList },
        cuposOfrecidos: { value: totalCupos, list: [] },
        
        alumnosProximosAFinalizar: { value: proximosAFinalizar.length, list: proximosAFinalizar },
        alumnosSinNingunaPPS: { value: sinNingunaPps.length, list: sinNingunaPps },
        
        alumnosParaAcreditar: { value: alumnosParaAcreditar.length, list: alumnosParaAcreditar },
        
        nuevosConvenios: { value: newAgreementsList.length, list: newAgreementsList },
        activeInstitutions: { value: activeInstitutionsList.length, list: activeInstitutionsList },
        
        cuposTotalesConRelevamiento: { value: 0, list: [] },
        lanzamientosMesActual: lanzamientosMesActual,
        
        rawStudents: validStudents 
    };
};

export const useMetricsData = ({ targetYear, isTestingMode = false }: { targetYear: number; isTestingMode?: boolean; }) => {
    return useQuery({
        queryKey: ['metricsData', targetYear, isTestingMode],
        queryFn: async () => {
            let rawData;
            
            if (isTestingMode) {
                // Fetch from MockDb
                const [est, prac, lanz, conv, fin, inst, req] = await Promise.all([
                    mockDb.getAll('estudiantes'),
                    mockDb.getAll('practicas'),
                    mockDb.getAll('lanzamientos_pps'),
                    mockDb.getAll('convocatorias'),
                    mockDb.getAll('finalizacion_pps'),
                    mockDb.getAll('instituciones'),
                    mockDb.getAll('solicitudes_pps')
                ]);
                rawData = { estudiantes: est, practicas: prac, lanzamientos: lanz, convocatorias: conv, finalizaciones: fin, instituciones: inst, solicitudes: req };
            } else {
                 // Fetch from Supabase
                 const [est, prac, lanz, conv, fin, inst, req] = await Promise.all([
                    supabase.from(TABLE_NAME_ESTUDIANTES).select('*'),
                    supabase.from(TABLE_NAME_PRACTICAS).select('*'),
                    supabase.from(TABLE_NAME_LANZAMIENTOS_PPS).select('*'),
                    supabase.from(TABLE_NAME_CONVOCATORIAS).select('*'),
                    supabase.from(TABLE_NAME_FINALIZACION).select('*'),
                    supabase.from(TABLE_NAME_INSTITUCIONES).select('*'),
                    supabase.from(TABLE_NAME_PPS).select('*')
                ]);
                rawData = { 
                    estudiantes: est.data || [], 
                    practicas: prac.data || [], 
                    lanzamientos: lanz.data || [], 
                    convocatorias: conv.data || [], 
                    finalizaciones: fin.data || [], 
                    instituciones: inst.data || [],
                    solicitudes: req.data || []
                };
            }
            
            return processAllData(rawData, targetYear);
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};
