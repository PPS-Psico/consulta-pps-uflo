
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { 
    TABLE_NAME_ESTUDIANTES, 
    TABLE_NAME_PRACTICAS, 
    TABLE_NAME_CONVOCATORIAS,
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_FINALIZARON_ESTUDIANTES, 
    FIELD_FECHA_INICIO_PRACTICAS, 
    FIELD_ESTUDIANTE_LINK_PRACTICAS, 
    FIELD_FECHA_FINALIZACION_ESTUDIANTES,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS
} from '../constants';
import { StudentInfo } from '../types';
import { safeGetId, parseToUTCDate } from '../utils/formatters';

// --- MOCK DATA GENERATOR (Strictly aligned to User Story) ---
const generateSpecificMockData = () => {
    const totalStudents = 202; 
    const totalGraduates = 50; 
    const currentYear = new Date().getFullYear();
    
    const students: StudentInfo[] = [];

    // 1. Generar los 50 Egresados (solo de este año)
    for (let i = 0; i < totalGraduates; i++) {
        const createdDate = new Date(currentYear, 2, Math.floor(Math.random() * 20) + 1);
        const finishedDate = new Date(currentYear, 5 + Math.floor(Math.random() * 6), Math.floor(Math.random() * 28) + 1);
        
        students.push({
            id: `grad-${i}`,
            legajo: `E-${1000 + i}`,
            nombre: `Egresado 2025 ${i + 1}`,
            orientacion: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'][Math.floor(Math.random() * 4)],
            createdAt: createdDate.toISOString(),
            finalizedAt: finishedDate.toISOString(),
            totalHoras: 250,
            status: 'finished',
            isFinished: true
        });
    }

    // 2. Generar los 152 Activos
    const activeCount = totalStudents - totalGraduates;
    for (let i = 0; i < activeCount; i++) {
        let createdDate;
        if (Math.random() < 0.8) {
             createdDate = new Date(currentYear, 2, Math.floor(Math.random() * 28) + 1); 
        } else {
             createdDate = new Date(currentYear, Math.floor(Math.random() * 8) + 3, 1); 
        }

        students.push({
            id: `act-${i}`,
            legajo: `A-${2000 + i}`,
            nombre: `Alumno Activo ${i + 1}`,
            orientacion: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'][Math.floor(Math.random() * 4)],
            createdAt: createdDate.toISOString(),
            finalizedAt: undefined, 
            totalHoras: Math.floor(Math.random() * 200),
            status: 'active',
            isFinished: false
        });
    }

    return students;
};

const useMetricsData = ({ targetYear, isTestingMode = false }: { targetYear: number; isTestingMode?: boolean; }) => {
    return useQuery({
        queryKey: ['metricsData', targetYear, isTestingMode],
        queryFn: async () => {
            // 1. Testing Mode
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
                    cuposOfrecidos: { value: 711, list: [] }, // Updated to match user request
                    cuposTotalesConRelevamiento: { value: 95, list: [] },
                    lanzamientosMesActual: [],
                    
                    rawStudents: allStudents 
                };
            }
            
            // 2. Production Mode (Real Data)
            try {
                // Fetch Students
                const { data: studentsData, error: studentsError } = await supabase
                    .from(TABLE_NAME_ESTUDIANTES)
                    .select(`id, ${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}, orientacion_elegida, created_at, ${FIELD_FINALIZARON_ESTUDIANTES}, ${FIELD_FECHA_FINALIZACION_ESTUDIANTES}`);

                if (studentsError) throw studentsError;

                // Fetch Practicas (Activity Source 1)
                const { data: practicasData, error: practicasError } = await supabase
                    .from(TABLE_NAME_PRACTICAS)
                    .select(`${FIELD_ESTUDIANTE_LINK_PRACTICAS}, ${FIELD_FECHA_INICIO_PRACTICAS}`)
                    .gte(FIELD_FECHA_INICIO_PRACTICAS, `${targetYear}-01-01`);
                
                if (practicasError) throw practicasError;

                // Fetch Convocatorias (Activity Source 2 - Enrollments)
                const { data: convocatoriasData, error: convocatoriasError } = await supabase
                    .from(TABLE_NAME_CONVOCATORIAS)
                    .select(`${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}, created_at`)
                    .gte('created_at', `${targetYear}-01-01T00:00:00`);

                if (convocatoriasError) throw convocatoriasError;

                // Fetch Lanzamientos (For Cupos)
                // Remove DB-side date filtering to ensure consistency with TimelineView logic
                const { data: lanzamientosData, error: lanzamientosError } = await supabase
                    .from(TABLE_NAME_LANZAMIENTOS_PPS)
                    .select(`${FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS}, ${FIELD_FECHA_INICIO_LANZAMIENTOS}, ${FIELD_NOMBRE_PPS_LANZAMIENTOS}`);

                if (lanzamientosError) throw lanzamientosError;

                // --- 1. Calcular Cupos Ofrecidos (Same logic as TimelineView) ---
                const totalCupos = (lanzamientosData || []).reduce((sum, lanz) => {
                    const date = parseToUTCDate(lanz[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    // Strict year check using the formatter
                    if (date && date.getUTCFullYear() === targetYear) {
                        return sum + (lanz[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0);
                    }
                    return sum;
                }, 0);

                const lanzamientosCount = (lanzamientosData || []).filter(l => {
                    const date = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    return date && date.getUTCFullYear() === targetYear;
                }).length;

                // --- 2. Identificar Estudiantes con Actividad ---
                const activeStudentIds = new Set<string>();

                // A. Desde Prácticas
                practicasData?.forEach(p => {
                     const link = safeGetId(p[FIELD_ESTUDIANTE_LINK_PRACTICAS]);
                     if (link) activeStudentIds.add(link);
                });

                // B. Desde Convocatorias (Inscripciones)
                convocatoriasData?.forEach(c => {
                    const link = safeGetId(c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]);
                    if (link) activeStudentIds.add(link);
                });

                // --- 3. Procesar Estudiantes ---
                const allStudents = (studentsData || []).map(s => {
                    const finalDateStr = s[FIELD_FECHA_FINALIZACION_ESTUDIANTES];
                    const finalDate = finalDateStr ? parseToUTCDate(finalDateStr) : null;
                    const finalYear = finalDate ? finalDate.getUTCFullYear() : 0;
                    
                    // REGLA FINALIZADOS: Tilde TRUE y Fecha >= Año Objetivo
                    const isFinishedThisYear = s[FIELD_FINALIZARON_ESTUDIANTES] === true && finalYear >= targetYear;
                    
                    // REGLA HISTÓRICOS: Si finalizó antes, no cuenta como activo ni como finalizado este año
                    const isHistoricGraduate = s[FIELD_FINALIZARON_ESTUDIANTES] === true && finalYear < targetYear;

                    return {
                        id: s.id,
                        legajo: s[FIELD_LEGAJO_ESTUDIANTES],
                        nombre: s[FIELD_NOMBRE_ESTUDIANTES],
                        orientacion: s.orientacion_elegida,
                        createdAt: s.created_at,
                        finalizedAt: isFinishedThisYear ? finalDateStr : undefined,
                        isFinishedThisYear,
                        isHistoricGraduate,
                        hasActivity: activeStudentIds.has(s.id)
                    };
                });

                // --- 4. Filtrar Listas Finales ---
                
                // FINALIZADOS: Solo los que cerraron ESTE año
                const finishedList = allStudents.filter(s => s.isFinishedThisYear);

                // ACTIVOS: No finalizaron (ni este año ni antes) Y tienen actividad este año
                const activeList = allStudents.filter(s => 
                    !s.isFinishedThisYear && 
                    !s.isHistoricGraduate && 
                    s.hasActivity
                );

                // ACTIVOS SIN PPS (Opcional: Activos en sistema pero sin inscripción este año)
                // Esto ayuda a detectar alumnos "fantasmas" o que abandonaron sin finalizar
                const inactiveButEnrolledList = allStudents.filter(s => 
                    !s.isFinishedThisYear && 
                    !s.isHistoricGraduate && 
                    !s.hasActivity
                );

                // Estudiantes CON PPS (Para la tarjeta de métrica) -> Es básicamente la lista de activos real
                const studentsWithPpsList = activeList;

                return {
                    alumnosActivos: { value: activeList.length, list: activeList },
                    alumnosFinalizados: { value: finishedList.length, list: finishedList },
                    
                    alumnosConPpsEsteAno: { value: studentsWithPpsList.length, list: studentsWithPpsList }, 
                    alumnosEnPPS: { value: studentsWithPpsList.length, list: studentsWithPpsList }, 
                    
                    alumnosActivosSinPpsEsteAno: { value: inactiveButEnrolledList.length, list: inactiveButEnrolledList },
                    
                    // Métricas de Instituciones
                    ppsLanzadas: { value: lanzamientosCount, list: [] },
                    cuposOfrecidos: { value: totalCupos, list: [] }, // AHORA SÍ CALCULADO IGUAL QUE TIMELINE
                    
                    // Placeholders
                    alumnosProximosAFinalizar: { value: 0, list: [] },
                    alumnosSinNingunaPPS: { value: 0, list: [] },
                    alumnosParaAcreditar: { value: 0, list: [] },
                    nuevosConvenios: { value: 0, list: [] },
                    activeInstitutions: { value: 0, list: [] },
                    cuposTotalesConRelevamiento: { value: 0, list: [] },
                    lanzamientosMesActual: [],
                    
                    rawStudents: allStudents
                };

            } catch (err: any) {
                console.error("Metrics Error:", err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 5, // 5 min cache
        refetchOnWindowFocus: false,
        retry: 1
    });
};

export { useMetricsData };
