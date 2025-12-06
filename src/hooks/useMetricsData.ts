
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';

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
            // Utilizamos la función optimizada 'get_dashboard_metrics' que retorna JSONB precalculado.
            try {
                const { data, error } = await supabase.rpc('get_dashboard_metrics', { target_year: targetYear });
                
                if (error) {
                    console.error("RPC Error (get_dashboard_metrics):", error);
                    
                    // Mensaje amigable para errores comunes de configuración
                    if (error.code === '42883' || error.message.includes('function not found')) {
                         throw new Error("Falta configurar la función en la base de datos. Por favor, ejecuta el script 'scripts/supabase_metrics_rpc.sql' en el Editor SQL de Supabase.");
                    }
                    throw new Error(`Error al obtener métricas del servidor: ${error.message}`);
                }

                if (!data) {
                    throw new Error("El servidor no devolvió datos. Verifica que la función 'get_dashboard_metrics' esté devolviendo JSON válido.");
                }

                return data as any; 

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
