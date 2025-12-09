
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { TABLE_NAME_ESTUDIANTES, FIELD_USER_ID_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_FINALIZARON_ESTUDIANTES } from '../constants';

// --- MOCK DATA FOR TESTING MODE ---
const MOCK_LIST = [{ legajo: 'T0001', nombre: 'Estudiante de Prueba' }];

const useMetricsData = ({ targetYear, isTestingMode = false }: { targetYear: number; isTestingMode?: boolean; }) => {
    return useQuery({
        queryKey: ['metricsData', targetYear, isTestingMode],
        queryFn: async () => {
            // 1. Testing Mode: Return Mock Data immediately
            if (isTestingMode) {
                return {
                    alumnosActivos: { value: 150, list: MOCK_LIST },
                    alumnosEnPPS: { value: 85, list: MOCK_LIST },
                    alumnosProximosAFinalizar: { value: 20, list: MOCK_LIST },
                    alumnosSinNingunaPPS: { value: 10, list: MOCK_LIST },
                    alumnosConPpsEsteAno: { value: 22, list: MOCK_LIST },
                    alumnosActivosSinPpsEsteAno: { value: 128, list: MOCK_LIST },
                    alumnosParaAcreditar: { value: 5, list: MOCK_LIST },
                    alumnosFinalizados: { value: 15, list: MOCK_LIST },
                    ppsLanzadas: { value: 40, list: [] },
                    nuevosConvenios: { value: 5, list: MOCK_LIST },
                    activeInstitutions: { value: 25, list: MOCK_LIST },
                    cuposOfrecidos: { value: 120, list: [] },
                    cuposTotalesConRelevamiento: { value: 95, list: [] },
                    lanzamientosMesActual: [],
                };
            }
            
            // 2. Server-Side Metrics (RPC)
            try {
                const { data, error } = await supabase.rpc('get_dashboard_metrics', { target_year: targetYear });
                
                if (error) {
                    console.error("RPC Error (get_dashboard_metrics):", error);
                    // Mensaje amigable para errores comunes de configuración
                    if (error.code === '42883' || error.message.includes('function not found')) {
                         throw new Error("Falta configurar la función en la base de datos.");
                    }
                    throw new Error(`Error al obtener métricas del servidor: ${error.message}`);
                }

                if (!data) {
                    throw new Error("El servidor no devolvió datos.");
                }

                const metrics = data as any;

                // --- CRITICAL OVERRIDE: FILTER FUTURE STUDENTS ---
                // We fetch the list of students who have a user_id (are registered) and haven't finished.
                // This excludes next-year imports who haven't signed up yet.
                // We overwrite the "Active Students" count from the RPC with this stricter definition.
                
                const { data: realActiveStudents, error: fetchError } = await supabase
                    .from(TABLE_NAME_ESTUDIANTES)
                    .select(`${FIELD_LEGAJO_ESTUDIANTES}, ${FIELD_NOMBRE_ESTUDIANTES}`)
                    .not(FIELD_USER_ID_ESTUDIANTES, 'is', null) // Must have account
                    .eq(FIELD_FINALIZARON_ESTUDIANTES, false);  // Must not be finished

                if (!fetchError && realActiveStudents) {
                    const mappedStudents = realActiveStudents.map(s => ({
                        legajo: s[FIELD_LEGAJO_ESTUDIANTES],
                        nombre: s[FIELD_NOMBRE_ESTUDIANTES]
                    }));
                    
                    // Override Active Students
                    metrics.alumnosActivos = {
                        value: mappedStudents.length,
                        list: mappedStudents
                    };

                    // Re-calculate "Students without PPS" based on this new active list
                    // Logic: RPC returns total without PPS (including ghosts). 
                    // We simply subtract the ghosts (Total RPC Active - Real Active) from the RPC "No PPS" count.
                    // Or safer: We assume if they aren't active, they are the ones without PPS.
                    // Simplified: We just update the "No PPS" list intersection with real active students.
                    
                    if (metrics.alumnosSinNingunaPPS?.list) {
                        const activeLegajos = new Set(mappedStudents.map(s => s.legajo));
                        const filteredNoPpsList = metrics.alumnosSinNingunaPPS.list.filter((s: any) => activeLegajos.has(s.legajo));
                        
                        metrics.alumnosSinNingunaPPS = {
                            value: filteredNoPpsList.length,
                            list: filteredNoPpsList
                        };
                    }
                }

                return metrics; 

            } catch (err: any) {
                console.error("Fatal Metrics Error:", err);
                throw err;
            }
        },
        staleTime: 1000 * 60 * 15, // Cache for 15 minutes
        refetchOnWindowFocus: false,
        retry: 1
    });
};

export { useMetricsData };
