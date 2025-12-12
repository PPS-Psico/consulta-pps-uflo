
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import {
    TABLE_NAME_PPS,
    TABLE_NAME_FINALIZACION,
    TABLE_NAME_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTADO_FINALIZACION,
    FIELD_ESTADO_PPS,
    FIELD_FECHA_SOLICITUD_FINALIZACION
} from '../constants';

export interface ActivityItem {
    id: string;
    type: 'request' | 'finalization'; // Simplificado solo a estos dos tipos
    title: string;
    description: string;
    timestamp: Date;
    user: string;
    avatarLetter: string;
    statusColor: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple';
    rawStatus?: string;
    institution?: string;
    isNew?: boolean; // Para destacar items muy recientes (< 24hs)
}

export const useActivityFeed = (isTestingMode = false) => {
    return useQuery({
        queryKey: ['activityFeed', isTestingMode],
        queryFn: async (): Promise<ActivityItem[]> => {
            if (isTestingMode) {
                return [
                    {
                        id: 'mock1',
                        type: 'request',
                        title: 'Solicitud de Inicio',
                        description: 'Pendiente de revisión',
                        timestamp: new Date(), // Ahora
                        user: 'Ana García',
                        avatarLetter: 'A',
                        statusColor: 'amber',
                        rawStatus: 'Pendiente',
                        institution: 'Clínica Modelo',
                        isNew: true
                    },
                    {
                        id: 'mock3',
                        type: 'finalization',
                        title: 'Solicitud de Acreditación',
                        description: 'Documentación lista para revisar',
                        timestamp: new Date(Date.now() - 1000 * 60 * 30), // Hace 30 min
                        user: 'Lucía Mendez',
                        avatarLetter: 'L',
                        statusColor: 'emerald',
                        rawStatus: 'Pendiente',
                        isNew: true
                    },
                    {
                        id: 'mock4',
                        type: 'request',
                        title: 'Consulta PPS',
                        description: 'En conversaciones',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25), // Ayer
                        user: 'Marcos Paz',
                        avatarLetter: 'M',
                        statusColor: 'blue',
                        rawStatus: 'En conversaciones',
                        institution: 'Hospital Italiano',
                        isNew: false
                    }
                ];
            }

            // 1. Requests (Solicitudes de Inicio - Autogestión)
            // Traemos las últimas 50, excluyendo las archivadas
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`id, created_at, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}, ${FIELD_ESTADO_PPS}`)
                .neq(FIELD_ESTADO_PPS, 'Archivado')
                .order('created_at', { ascending: false })
                .limit(50);

            // 2. Finalizations (Solicitudes de Acreditación - Egreso)
            // Traemos las últimas 50
            const { data: finalizations } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select(`id, created_at, ${FIELD_FECHA_SOLICITUD_FINALIZACION}, ${FIELD_ESTADO_FINALIZACION}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
                .limit(50);

            const items: ActivityItem[] = [];
            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));

            // Mapper: Solicitudes (Ingreso)
            requests?.forEach((r: any) => {
                const name = r[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Estudiante';
                const status = r[FIELD_ESTADO_PPS] || 'Pendiente';
                const inst = r[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución';
                const date = new Date(r.created_at);
                
                let color: 'amber' | 'blue' | 'purple' | 'rose' = 'blue';
                
                if (status === 'Pendiente') color = 'amber';
                else if (status === 'Realizada') color = 'purple';
                else if (['Rechazada', 'Cancelada', 'No se pudo concretar'].includes(status)) color = 'rose';
                
                items.push({
                    id: `req-${r.id}`,
                    type: 'request',
                    title: 'Solicitud de Inicio',
                    description: status, 
                    timestamp: date,
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: color,
                    rawStatus: status,
                    institution: inst,
                    isNew: date > oneDayAgo && status === 'Pendiente'
                });
            });

            // Mapper: Acreditaciones (Egreso)
            finalizations?.forEach((f: any) => {
                const name = f.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
                const status = f[FIELD_ESTADO_FINALIZACION] || 'Pendiente';
                // Usamos la fecha de solicitud preferentemente, sino created_at
                const dateStr = f[FIELD_FECHA_SOLICITUD_FINALIZACION] || f.created_at;
                const date = new Date(dateStr);
                
                const isPending = status === 'Pendiente';
                
                items.push({
                    id: `fin-${f.id}`,
                    type: 'finalization',
                    title: 'Solicita Acreditación',
                    description: isPending ? 'Documentación lista' : `Estado: ${status}`,
                    timestamp: date,
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: isPending ? 'emerald' : 'blue',
                    rawStatus: status,
                    isNew: date > oneDayAgo && isPending
                });
            });

            // Ordenar por fecha descendente (lo más nuevo arriba)
            return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        },
        refetchInterval: 5000,
        refetchOnWindowFocus: true
    });
};
