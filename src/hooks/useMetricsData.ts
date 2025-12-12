

import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { 
    TABLE_NAME_ESTUDIANTES, 
    TABLE_NAME_PRACTICAS, 
    TABLE_NAME_CONVOCATORIAS, 
    TABLE_NAME_LANZAMIENTOS_PPS,
    TABLE_NAME_FINALIZACION, 
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
    FIELD_FECHA_SOLICITUD_FINALIZACION 
} from '../constants';
import { StudentInfo } from '../types';
import { safeGetId, parseToUTCDate, normalizeStringForComparison } from '../utils/formatters';

// --- MOCK DATA GENERATOR ---
const generateSpecificMockData = () => {
    const totalStudents = 202; 
    const totalGraduates = 50; 
    const currentYear = new Date().getFullYear();
    const students: StudentInfo[] = [];

    const baseStudents = 80;
    for (let i = 0; i < baseStudents; i++) {
        students.push({
            id: `hist-${i}`,
            legajo: `H-${500 + i}`,
            nombre: `Alumno Histórico ${i + 1}`,
            orientacion: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'][Math.floor(Math.random() * 4)],
            createdAt: new Date(currentYear - 1, 11, 1).toISOString(),
            finalizedAt: undefined,
            totalHoras: Math.floor(Math.random() * 150) + 50,
            status: 'active',
            isFinished: false,
            dni: 123,
            email: 'test@test.com'
        });
    }

    const newStudentsCount = totalStudents - totalGraduates - baseStudents;
    for (let i = 0; i < newStudentsCount; i++) {
        let month;
        const rand = Math.random();
        if (rand < 0.4) month = 2; 
        else if (rand < 0.7) month = 3; 
        else month = Math.floor(Math.random() * 7) + 4; 

        const createdDate = new Date(currentYear, month, Math.floor(Math.random() * 28) + 1);
        
        students.push({
            id: `new-${i}`,
            legajo: `N-${2000 + i}`,
            nombre: `Ingresante ${i + 1}`,
            orientacion: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'][Math.floor(Math.random() * 4)],
            createdAt: createdDate.toISOString(),
            finalizedAt: undefined,
            totalHoras: Math.floor(Math.random() * 100),
            status: 'active',
            isFinished: false,
            dni: 123,
            email: 'test@test.com'
        });
    }

    for (let i = 0; i < totalGraduates; i++) {
        const createdDate = new Date(currentYear, 0, 15);
        const endMonth = Math.random() > 0.3 ? 10 + Math.floor(Math.random() * 2) : 6 + Math.floor(Math.random() * 4);
        const finishedDate = new Date(currentYear, endMonth, Math.floor(Math.random() * 28) + 1);
        
        students.push({
            id: `grad-${i}`,
            legajo: `E-${1000 + i}`,
            nombre: `Egresado 2025 ${i + 1}`,
            orientacion: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'][Math.floor(Math.random() * 4)],
            createdAt: createdDate.toISOString(),
            finalizedAt: finishedDate.toISOString(),
            totalHoras: 250,
            status: 'finished',
            isFinished: true,
            dni: 123,
            email: 'test@test.com'
        });
    }
    return students;
};

const useMetricsData = ({ targetYear, isTestingMode = false }: { targetYear: number; isTestingMode?: boolean; }) => {
    return useQuery({
        queryKey: ['metricsData', targetYear, isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                const allStudents = generateSpecificMockData();
                const activeOnly = allStudents.filter(s => !s.isFinished);
                const finishedOnly = allStudents.filter(s => s.isFinished);
                
                return {
                    alumnosActivos: { value: activeOnly.length, list: activeOnly },
                    alumnosFinalizados: { value: finishedOnly.length, list: finishedOnly },
                    alumnosEnPPS: { value: Math.floor(activeOnly.length * 0.7), list: activeOnly.slice(0, 10) },
                    alumnosConPpsEsteAno: { value: allStudents.length, list: [] }, 
                    alumnosActivosSinPpsEsteAno: { value: Math.floor(activeOnly.length * 0.3), list: [] },
                    alumnosProximosAFinalizar: { value: 15, list: activeOnly.slice(0, 15) },
                    alumnosSinNingunaPPS: { value: 10, list: activeOnly.slice(activeOnly.length - 10) },
                    alumnosParaAcreditar: { value: 5, list: activeOnly.slice(0, 5) },
                    ppsLanzadas: { value: 25, list: [] },
                    nuevosConvenios: { value: 5, list: [] },
                    activeInstitutions: { value: 20, list: [] },
                    cuposOfrecidos: { value: 711, list: [] },
                    cuposTotalesConRelevamiento: { value: 95, list: [] },
                    lanzamientosMesActual: [],
                    rawStudents: allStudents 
                };
            }
            
            try {
                // 1. Fetch Students
                const { data: studentsData, error: studentsError } = await supabase
                    .from(TABLE_NAME_ESTUDIANTES as any)
                    .select(`id, ${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, ${FIELD_DNI_ESTUDIANTES}, ${FIELD_CORREO_ESTUDIANTES}, orientacion_elegida, created_at, ${FIELD_FINALIZARON_ESTUDIANTES}, ${FIELD_FECHA_FINALIZACION_ESTUDIANTES}`);

                if (studentsError) throw studentsError;

                // 2. Fetch TODAS las Prácticas (con horas y estado)
                const { data: allPracticasData, error: allPracticasError } = await supabase
                    .from(TABLE_NAME_PRACTICAS as any)
                    .select(`${FIELD_ESTUDIANTE_LINK_PRACTICAS}, ${FIELD_FECHA_INICIO_PRACTICAS}, ${FIELD_HORAS_PRACTICAS}, ${FIELD_ESTADO_PRACTICA}`);
                
                if (allPracticasError) throw allPracticasError;

                // 3. Fetch TODAS las Inscripciones
                const { data: allEnrollmentsData, error: allEnrollmentsError } = await supabase
                    .from(TABLE_NAME_CONVOCATORIAS as any)
                    .select(`${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}, created_at`);

                if (allEnrollmentsError) throw allEnrollmentsError;

                // 4. Fetch TODAS las Solicitudes de Finalización (NEW: Para contar finalizados reales)
                const { data: allFinalizationsData, error: finalizationError } = await supabase
                    .from(TABLE_NAME_FINALIZACION as any)
                    .select(`${FIELD_ESTUDIANTE_FINALIZACION}, ${FIELD_FECHA_SOLICITUD_FINALIZACION}, created_at`);
                
                if (finalizationError) throw finalizationError;

                // 5. Procesamiento de Fechas y Datos de Prácticas
                const studentEarliestActivity = new Map<string, Date>();
                const studentTotalHours = new Map<string, number>();
                const studentHasPractice = new Set<string>();
                const studentHasActivePractice = new Set<string>(); // New: Track "En curso"

                // A. Procesar prácticas (Fechas, Horas y Existencia)
                allPracticasData.forEach((p: any) => {
                    const link = safeGetId(p[FIELD_ESTUDIANTE_LINK_PRACTICAS]);
                    if (!link) return;

                    // Marcamos que tiene prácticas
                    studentHasPractice.add(link);

                    // Track if practice is "En curso"
                    if (normalizeStringForComparison(p[FIELD_ESTADO_PRACTICA]) === 'en curso') {
                        studentHasActivePractice.add(link);
                    }

                    // Sumar horas
                    const horas = Number(p[FIELD_HORAS_PRACTICAS] || 0);
                    const currentTotal = studentTotalHours.get(link) || 0;
                    studentTotalHours.set(link, currentTotal + horas);

                    // Fecha más temprana
                    const fechaInicioStr = p[FIELD_FECHA_INICIO_PRACTICAS];
                    if (fechaInicioStr) {
                        const date = parseToUTCDate(fechaInicioStr);
                        if (date) {
                            const currentEarliest = studentEarliestActivity.get(link);
                            if (!currentEarliest || date < currentEarliest) {
                                studentEarliestActivity.set(link, date);
                            }
                        }
                    }
                });

                // B. Procesar fechas de inscripción (Convocatorias)
                allEnrollmentsData.forEach((e: any) => {
                    const link = safeGetId(e[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]);
                    const fechaInscripcionStr = e.created_at;
                    if (link && fechaInscripcionStr) {
                         const date = new Date(fechaInscripcionStr);
                         if (!isNaN(date.getTime())) {
                              const currentEarliest = studentEarliestActivity.get(link);
                              if (!currentEarliest || date < currentEarliest) {
                                  studentEarliestActivity.set(link, date);
                              }
                         }
                    }
                });
                
                // C. Procesar solicitudes de finalización (ID -> Fecha Solicitud)
                // Usamos un mapa para saber QUIÉN solicitó y CUÁNDO (para filtrar por año)
                const studentFinalizationRequests = new Map<string, Date>();
                allFinalizationsData.forEach((f: any) => {
                    const link = safeGetId(f[FIELD_ESTUDIANTE_FINALIZACION]);
                    // Usamos el campo de fecha o el created_at como fallback
                    const dateStr = f[FIELD_FECHA_SOLICITUD_FINALIZACION] || f.created_at;
                    if (link && dateStr) {
                        const date = new Date(dateStr);
                        if (!isNaN(date.getTime())) {
                             studentFinalizationRequests.set(link, date);
                        }
                    }
                });

                // 6. Fetch Convocatorias del año (solo para métricas de "Actividad Reciente")
                const { data: convocatoriasThisYearData, error: convocatoriasError } = await supabase
                    .from(TABLE_NAME_CONVOCATORIAS as any)
                    .select(`${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}, created_at`)
                    .gte('created_at', `${targetYear}-01-01T00:00:00`);

                if (convocatoriasError) throw convocatoriasError;

                // 7. Fetch Lanzamientos
                const { data: lanzamientosData, error: lanzamientosError } = await supabase
                    .from(TABLE_NAME_LANZAMIENTOS_PPS as any)
                    .select(`id, ${FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS}, ${FIELD_FECHA_INICIO_LANZAMIENTOS}, ${FIELD_NOMBRE_PPS_LANZAMIENTOS}`);

                if (lanzamientosError) throw lanzamientosError;

                // --- PROCESAMIENTO GENERAL ---

                const totalCupos = (lanzamientosData || []).reduce((sum, lanz) => {
                    const date = parseToUTCDate(lanz[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    if (date && date.getUTCFullYear() === targetYear) {
                        return sum + (lanz[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);
                    }
                    return sum;
                }, 0);

                const lanzamientosCount = (lanzamientosData || []).filter(l => {
                    const date = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    return date && date.getUTCFullYear() === targetYear;
                }).length;

                // --- CÁLCULO DE LANZAMIENTOS MES ACTUAL ---
                const now = new Date();
                const currentMonth = now.getUTCMonth();
                const currentYear = now.getUTCFullYear();

                const monthlyLaunchesMap = new Map<string, { groupName: string, totalCupos: number, variants: { id: string, name: string, cupos: number }[] }>();

                (lanzamientosData as any[] || []).forEach(l => {
                    const d = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    // Check if date is valid and matches current month/year
                    if (d && d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear) {
                         const name = String(l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Sin Nombre');
                         const groupName = name.split(' - ')[0].trim();
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


                // Identificar Actividad Actual (Practicas e inscripciones de este año)
                const activeStudentIdsThisYear = new Set<string>();
                allPracticasData.forEach((p: any) => {
                     const date = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
                     if (date && date.getUTCFullYear() === targetYear) {
                         const link = safeGetId(p[FIELD_ESTUDIANTE_LINK_PRACTICAS]);
                         if (link) activeStudentIdsThisYear.add(link);
                     }
                });
                convocatoriasThisYearData?.forEach((c: any) => {
                    const link = safeGetId(c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]);
                    if (link) activeStudentIdsThisYear.add(link);
                });

                // --- Mapeo de Estudiantes ---
                const allStudents = (studentsData || []).map((s: any) => {
                    // Check administrative flag first
                    let isFinishedThisYear = false;
                    let isHistoricGraduate = false;
                    
                    const finalDateStr = s[FIELD_FECHA_FINALIZACION_ESTUDIANTES];
                    const adminFinalDate = finalDateStr ? parseToUTCDate(finalDateStr) : null;
                    
                    // Si el admin dice que finalizó, es finalizado.
                    if (s[FIELD_FINALIZARON_ESTUDIANTES] === true && adminFinalDate) {
                        if (adminFinalDate.getUTCFullYear() >= targetYear) isFinishedThisYear = true;
                        else isHistoricGraduate = true;
                    }

                    // Check requested finalization (Override & Addition)
                    // Si pidió finalizar este año, lo contamos como finalizado para las métricas.
                    // Esto incluye "Pendiente" y "Cargado".
                    const requestDate = studentFinalizationRequests.get(s.id);
                    if (requestDate) {
                        if (requestDate.getFullYear() === targetYear) {
                            isFinishedThisYear = true;
                            isHistoricGraduate = false; // Reset historic if they have a fresh request this year
                        } else if (requestDate.getFullYear() < targetYear && !isFinishedThisYear) {
                            // Solo si no está marcado como finalizado este año, consideramos fecha anterior
                            isHistoricGraduate = true;
                        }
                    }

                    const hasAccount = !!(s[FIELD_DNI_ESTUDIANTES] && s[FIELD_CORREO_ESTUDIANTES]);
                    const hours = studentTotalHours.get(s.id) || 0;

                    // FECHA REAL DE INICIO
                    const earliestActivity = studentEarliestActivity.get(s.id);
                    const creationDate = new Date(s.created_at);
                    
                    let effectiveStartDate = creationDate;
                    if (earliestActivity && earliestActivity < creationDate) {
                        effectiveStartDate = earliestActivity;
                    }

                    return {
                        id: s.id,
                        legajo: s[FIELD_LEGAJO_ESTUDIANTES],
                        nombre: s[FIELD_NOMBRE_ESTUDIANTES],
                        orientacion: s.orientacion_elegida,
                        createdAt: s.created_at,
                        effectiveStartDate: effectiveStartDate.toISOString(), 
                        finalizedAt: isFinishedThisYear ? (finalDateStr || studentFinalizationRequests.get(s.id)?.toISOString()) : undefined,
                        isFinishedThisYear,
                        isHistoricGraduate,
                        hasActivityThisYear: activeStudentIdsThisYear.has(s.id),
                        hasAccount,
                        totalHoras: hours,
                        hasActivePractice: studentHasActivePractice.has(s.id) // Map active practice status
                    };
                });

                // --- Listas Finales ---
                
                const validStudents = allStudents.filter(s => s.hasAccount);

                const finishedList = validStudents.filter(s => s.isFinishedThisYear);

                const activeList = validStudents.filter(s => 
                    !s.isFinishedThisYear && 
                    !s.isHistoricGraduate && 
                    s.hasActivityThisYear
                );

                const inactiveButEnrolledList = validStudents.filter(s => 
                    !s.isFinishedThisYear && 
                    !s.isHistoricGraduate && 
                    !s.hasActivityThisYear
                );

                // --- CALCULO MÉTRICAS ESPECÍFICAS (Sobre activeList) ---

                // Próximos a Finalizar: 
                // - Entre 230 y 249 horas (Están cerca)
                // - 250+ horas PERO con práctica activa (Están pasados de horas pero siguen cursando, no finalizaron trámite)
                const proximosAFinalizar = activeList.filter(s => 
                    (s.totalHoras >= 230 && s.totalHoras < 250) || 
                    (s.totalHoras >= 250 && s.hasActivePractice)
                );

                // Sin Ninguna PPS: Activos que no tienen ningún registro en practicas.
                // Si están en activeList y no tienen prácticas, significa que su actividad es solo una inscripción.
                const sinNingunaPps = activeList.filter(s => !studentHasPractice.has(s.id));

                return {
                    alumnosActivos: { value: activeList.length, list: activeList },
                    alumnosFinalizados: { value: finishedList.length, list: finishedList },
                    
                    // Nota: "alumnosEnPPS" suele referirse a los activos en general en este dashboard simplificado,
                    // o se puede refinar para ser solo los que tienen una práctica con estado "En curso".
                    // Por ahora mantenemos la lógica anterior de activeList como base.
                    alumnosEnPPS: { value: activeList.length, list: activeList }, 
                    alumnosConPpsEsteAno: { value: activeList.length, list: activeList }, // Placeholder similar
                    
                    alumnosActivosSinPpsEsteAno: { value: inactiveButEnrolledList.length, list: inactiveButEnrolledList },
                    
                    ppsLanzadas: { value: lanzamientosCount, list: [] },
                    cuposOfrecidos: { value: totalCupos, list: [] },
                    
                    alumnosProximosAFinalizar: { value: proximosAFinalizar.length, list: proximosAFinalizar },
                    alumnosSinNingunaPPS: { value: sinNingunaPps.length, list: sinNingunaPps },
                    
                    alumnosParaAcreditar: { value: 0, list: [] },
                    nuevosConvenios: { value: 0, list: [] },
                    activeInstitutions: { value: 0, list: [] },
                    cuposTotalesConRelevamiento: { value: 0, list: [] },
                    lanzamientosMesActual: lanzamientosMesActual,
                    
                    rawStudents: validStudents 
                };

            } catch (err: any) {
                console.error("Metrics Error:", err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 5, 
        refetchOnWindowFocus: false,
        retry: 1
    });
};

export { useMetricsData };
