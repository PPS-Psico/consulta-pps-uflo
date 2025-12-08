
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import {
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS,
    TABLE_NAME_PPS,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    TABLE_NAME_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS
} from '../constants';

export interface OperationalData {
    endingLaunches: any[];
    pendingRequests: any[];
    pendingFinalizations: any[];
    confirmedRelaunches: any[]; // New field
}

export const useOperationalData = (isTestingMode = false) => {
    return useQuery({
        queryKey: ['operationalData', isTestingMode],
        queryFn: async (): Promise<OperationalData> => {
            if (isTestingMode) {
                 return {
                    endingLaunches: [],
                    pendingFinalizations: [],
                    pendingRequests: [],
                    confirmedRelaunches: []
                 };
            }

            const now = new Date();
            
            // 1. Lanzamientos closing soon (Active & Open) OR Recently Closed but Unmanaged
            const { data: launches } = await supabase
                .from(TABLE_NAME_LANZAMIENTOS_PPS)
                .select(`*, ${FIELD_NOTAS_GESTION_LANZAMIENTOS}`) 
                .in(FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, ['Abierta', 'Abierto', 'Cerrado']) 
                .not(FIELD_ESTADO_GESTION_LANZAMIENTOS, 'in', '("Archivado")'); 

            const endingLaunches = (launches || []).map((l: any) => {
                 const endDate = new Date(l[FIELD_FECHA_FIN_LANZAMIENTOS]);
                 const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                 return { 
                     ...l, 
                     daysLeft,
                     estado_gestion: l[FIELD_ESTADO_GESTION_LANZAMIENTOS],
                     notas_gestion: l[FIELD_NOTAS_GESTION_LANZAMIENTOS]
                 };
            });

            // 2. Confirmed Relaunches (Future planning)
            const { data: relaunches } = await supabase
                .from(TABLE_NAME_LANZAMIENTOS_PPS)
                .select(`id, ${FIELD_NOMBRE_PPS_LANZAMIENTOS}, ${FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS}, ${FIELD_NOTAS_GESTION_LANZAMIENTOS}, ${FIELD_ESTADO_GESTION_LANZAMIENTOS}`)
                .eq(FIELD_ESTADO_GESTION_LANZAMIENTOS, 'Relanzamiento Confirmado');

            // 3. Requests pending or stagnant
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select('*')
                .not(FIELD_ESTADO_PPS, 'in', '("Finalizada","Cancelada","Rechazada","Archivado","PPS Realizada")');
            
            const pendingRequests = (requests || []).map((r: any) => ({
                ...r,
                updated: r[FIELD_ULTIMA_ACTUALIZACION_PPS] || r.created_at,
                estado_seguimiento: r[FIELD_ESTADO_PPS]
            }));

            // 4. Pending Accreditations
            const { data: finals } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select('*')
                .eq(FIELD_ESTADO_FINALIZACION, 'Pendiente');

            return {
                endingLaunches,
                pendingRequests,
                pendingFinalizations: finals || [],
                confirmedRelaunches: relaunches || []
            };
        }
    });
};
