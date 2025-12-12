
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import {
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS,
    TABLE_NAME_PPS,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    TABLE_NAME_FINALIZACION,
    FIELD_ESTADO_FINALIZACION
} from '../constants';

export interface OperationalData {
    endingLaunches: any[];
    pendingRequests: any[];
    pendingFinalizations: any[];
}

export const useOperationalData = (isTestingMode = false) => {
    return useQuery({
        queryKey: ['operationalData', isTestingMode],
        queryFn: async (): Promise<OperationalData> => {
            if (isTestingMode) {
                 return {
                    endingLaunches: [],
                    pendingFinalizations: [],
                    pendingRequests: []
                 };
            }

            const now = new Date();
            // Normalizar el "ahora" al inicio del día para comparaciones de fecha justas
            now.setHours(0, 0, 0, 0);
            
            // 1. Lanzamientos
            // Traemos TODOS los lanzamientos que no estén explícitamente archivados o cancelados.
            const { data: launches } = await supabase
                .from(TABLE_NAME_LANZAMIENTOS_PPS)
                .select(`*, ${FIELD_NOTAS_GESTION_LANZAMIENTOS}`)
                .not(FIELD_ESTADO_GESTION_LANZAMIENTOS, 'in', '("Archivado","No se Relanza")');

            const endingLaunches = (launches || []).map((l: any) => {
                 const endDate = new Date(l[FIELD_FECHA_FIN_LANZAMIENTOS]);
                 endDate.setHours(23, 59, 59, 999);
                 
                 const diffTime = endDate.getTime() - now.getTime();
                 const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                 
                 return { 
                     ...l, 
                     daysLeft,
                     estado_gestion: l[FIELD_ESTADO_GESTION_LANZAMIENTOS],
                     notas_gestion: l[FIELD_NOTAS_GESTION_LANZAMIENTOS]
                 };
            }).filter((l: any) => {
                // Check if truly managed
                const isConfirmed = l.estado_gestion === 'Relanzamiento Confirmado';
                
                // Si ya está confirmado, no nos preocupa operativamente A MENOS que haya algo raro.
                if (isConfirmed) return false; 

                // Si no está confirmado (es NULL, Pendiente, o En Conversación)...
                
                // a) Ya venció (fecha fin < hoy) -> CRÍTICO
                if (l.daysLeft < 0) return true; 
                
                // b) Vence pronto (hoy a 30 días) -> ALERTA
                if (l.daysLeft <= 30) return true; 

                return false;
            });

            // 2. Requests pending or stagnant
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select('*')
                .not(FIELD_ESTADO_PPS, 'in', '("Finalizada","Cancelada","Rechazada","Archivado","PPS Realizada")');
            
            const pendingRequests = (requests || []).map((r: any) => ({
                ...r,
                updated: r[FIELD_ULTIMA_ACTUALIZACION_PPS] || r.created_at,
                estado_seguimiento: r[FIELD_ESTADO_PPS]
            }));

            // 3. Pending Accreditations
            const { data: finals } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select('*')
                .eq(FIELD_ESTADO_FINALIZACION, 'Pendiente');

            return {
                endingLaunches,
                pendingRequests,
                pendingFinalizations: finals || []
            };
        }
    });
};
