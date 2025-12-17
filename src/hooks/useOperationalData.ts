
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { mockDb } from '../services/mockDb';
import {
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS,
    TABLE_NAME_PPS,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    TABLE_NAME_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_FECHA_INICIO_LANZAMIENTOS
} from '../constants';
import { parseToUTCDate, normalizeStringForComparison } from '../utils/formatters';

export interface OperationalData {
    endingLaunches: any[];
    pendingRequests: any[];
    pendingFinalizations: any[];
}

export const useOperationalData = (isTestingMode = false) => {
    return useQuery({
        queryKey: ['operationalData', isTestingMode],
        queryFn: async (): Promise<OperationalData> => {
            const now = new Date();
            const currentYear = now.getFullYear();
            now.setHours(0, 0, 0, 0);

            let launches: any[] = [];
            let requests: any[] = [];
            let finals: any[] = [];

            if (isTestingMode) {
                // Fetch from Mock DB to allow dynamic updates within the session
                launches = await mockDb.getAll('lanzamientos_pps');
                requests = await mockDb.getAll('solicitudes_pps');
                finals = await mockDb.getAll('finalizacion_pps');
            } else {
                 // Fetch from Supabase
                 const [launchesRes, requestsRes, finalsRes] = await Promise.all([
                    supabase.from(TABLE_NAME_LANZAMIENTOS_PPS).select(`*, ${FIELD_NOTAS_GESTION_LANZAMIENTOS}`),
                    supabase.from(TABLE_NAME_PPS).select('*'),
                    supabase.from(TABLE_NAME_FINALIZACION).select('*').eq(FIELD_ESTADO_FINALIZACION, 'Pendiente')
                 ]);
                 launches = launchesRes.data || [];
                 requests = requestsRes.data || [];
                 finals = finalsRes.data || [];
            }
            
            // 1. Process Launches
            const endingLaunches = launches.map((l: any) => {
                 const endDate = parseToUTCDate(l[FIELD_FECHA_FIN_LANZAMIENTOS]);
                 
                 const daysLeft = endDate 
                    ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) 
                    : 999;
                 
                 return { 
                     ...l, 
                     daysLeft,
                     estado_gestion: l[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión',
                     notas_gestion: l[FIELD_NOTAS_GESTION_LANZAMIENTOS]
                 };
            }).filter((l: any) => {
                // Same filtering logic for both modes
                const startDate = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                if (!startDate || startDate.getUTCFullYear() !== currentYear) {
                    return false;
                }

                const status = l.estado_gestion;
                if (status === 'Relanzamiento Confirmado' || status === 'Archivado' || status === 'No se Relanza') {
                    return false;
                }

                if (l.daysLeft < 0) return true; 
                if (l.daysLeft <= 30) return true; 

                return false;
            });

            // 2. Process Requests
            const terminalStatuses = [
                'finalizada', 'cancelada', 'rechazada', 'archivado', 'pps realizada', 'realizada', 'no se pudo concretar'
            ];

            const pendingRequests = requests.map((r: any) => ({
                ...r,
                updated: r[FIELD_ULTIMA_ACTUALIZACION_PPS] || r.created_at,
                estado_seguimiento: r[FIELD_ESTADO_PPS]
            })).filter((r: any) => {
                const status = normalizeStringForComparison(r.estado_seguimiento);
                if (terminalStatuses.includes(status)) return false;
                return true;
            });

            // 3. Process Finalizations (Already filtered in SQL, filter again for mock)
            const pendingFinalizations = finals.filter((f: any) => f[FIELD_ESTADO_FINALIZACION] === 'Pendiente');

            return {
                endingLaunches,
                pendingRequests,
                pendingFinalizations
            };
        }
    });
};
