
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import {
    TABLE_NAME_CONVOCATORIAS,
    TABLE_NAME_PPS,
    TABLE_NAME_FINALIZACION,
    TABLE_NAME_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_CONVOCATORIAS,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_ESTADO_PPS
} from '../constants';

export interface ActivityItem {
    id: string;
    type: 'enrollment' | 'request' | 'finalization';
    title: string;
    description: string;
    timestamp: Date;
    user: string;
    avatarLetter: string;
    statusColor: 'blue' | 'emerald' | 'amber' | 'purple';
}

export const useActivityFeed = (isTestingMode = false) => {
    return useQuery({
        queryKey: ['activityFeed', isTestingMode],
        queryFn: async (): Promise<ActivityItem[]> => {
            if (isTestingMode) {
                return [
                    {
                        id: 'mock1',
                        type: 'enrollment',
                        title: 'Nueva Inscripción',
                        description: 'Se inscribió en Hospital de Niños',
                        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
                        user: 'Ana García',
                        avatarLetter: 'A',
                        statusColor: 'blue'
                    },
                    {
                        id: 'mock2',
                        type: 'request',
                        title: 'Solicitud PPS',
                        description: 'Solicitó iniciar en Fundación Sí',
                        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
                        user: 'Carlos Ruiz',
                        avatarLetter: 'C',
                        statusColor: 'purple'
                    },
                    {
                        id: 'mock3',
                        type: 'finalization',
                        title: 'Documentación Final',
                        description: 'Subió informe final para revisión',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                        user: 'Lucía Mendez',
                        avatarLetter: 'L',
                        statusColor: 'emerald'
                    }
                ];
            }

            // 1. Fetch Latest Enrollments (Inscripciones)
            const { data: enrollments } = await supabase
                .from(TABLE_NAME_CONVOCATORIAS)
                .select(`id, created_at, ${FIELD_NOMBRE_PPS_CONVOCATORIAS}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
                .limit(5);

            // 2. Fetch Latest Requests (Solicitudes)
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`id, created_at, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}, ${FIELD_ESTADO_PPS}`)
                .order('created_at', { ascending: false })
                .limit(5);

            // 3. Fetch Latest Finalizations (Acreditaciones)
            const { data: finalizations } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select(`id, created_at, ${FIELD_ESTADO_FINALIZACION}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
                .limit(5);

            const items: ActivityItem[] = [];

            enrollments?.forEach((e: any) => {
                const name = e.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
                items.push({
                    id: `env-${e.id}`,
                    type: 'enrollment',
                    title: 'Nueva Inscripción',
                    description: `Se postuló a ${e[FIELD_NOMBRE_PPS_CONVOCATORIAS]}`,
                    timestamp: new Date(e.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'blue'
                });
            });

            requests?.forEach((r: any) => {
                const name = r[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Estudiante';
                items.push({
                    id: `req-${r.id}`,
                    type: 'request',
                    title: 'Solicitud de Autogestión',
                    description: `Para ${r[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución'} (${r[FIELD_ESTADO_PPS]})`,
                    timestamp: new Date(r.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'purple'
                });
            });

            finalizations?.forEach((f: any) => {
                const name = f.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
                items.push({
                    id: `fin-${f.id}`,
                    type: 'finalization',
                    title: 'Acreditación Solicitada',
                    description: `Documentación subida. Estado: ${f[FIELD_ESTADO_FINALIZACION]}`,
                    timestamp: new Date(f.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'emerald'
                });
            });

            // Sort by most recent
            return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);
        },
        refetchInterval: 30000 // Actualizar cada 30 segundos para dar sensación de "vivo"
    });
};
