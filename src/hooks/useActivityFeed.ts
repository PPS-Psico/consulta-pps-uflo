
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
    // New fields for richer UI
    rawStatus?: string;
    institution?: string;
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
                        title: 'Solicita iniciar PPS',
                        description: 'Pendiente de revisión inicial',
                        timestamp: new Date(), // Now
                        user: 'Ana García',
                        avatarLetter: 'A',
                        statusColor: 'amber',
                        rawStatus: 'Pendiente',
                        institution: 'Clínica Modelo'
                    },
                    {
                        id: 'mock2',
                        type: 'request',
                        title: 'Avance en Solicitud',
                        description: 'Convenio en proceso de firma',
                        timestamp: new Date(Date.now() - 1000 * 60 * 45),
                        user: 'Carlos Ruiz',
                        avatarLetter: 'C',
                        statusColor: 'blue',
                        rawStatus: 'En conversaciones',
                        institution: 'Fundación Sí'
                    },
                    {
                        id: 'mock3',
                        type: 'finalization',
                        title: 'Documentación Final',
                        description: 'Subió informe final para revisión',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
                        user: 'Lucía Mendez',
                        avatarLetter: 'L',
                        statusColor: 'emerald'
                    },
                     {
                        id: 'mock4',
                        type: 'enrollment',
                        title: 'Nueva Inscripción',
                        description: 'Se inscribió en la convocatoria',
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5),
                        user: 'Marcos Paz',
                        avatarLetter: 'M',
                        statusColor: 'blue',
                        institution: 'Hospital de Niños'
                    }
                ];
            }

            // 1. Fetch Latest Enrollments (Inscripciones)
            const { data: enrollments } = await supabase
                .from(TABLE_NAME_CONVOCATORIAS)
                .select(`id, created_at, ${FIELD_NOMBRE_PPS_CONVOCATORIAS}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
                .limit(10);

            // 2. Fetch Latest Requests (Solicitudes) - EXCLUYENDO ARCHIVADOS
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`id, created_at, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}, ${FIELD_ESTADO_PPS}`)
                .neq(FIELD_ESTADO_PPS, 'Archivado') // FILTRO CLAVE: No mostrar archivados
                .order('created_at', { ascending: false })
                .limit(15);

            // 3. Fetch Latest Finalizations (Acreditaciones)
            const { data: finalizations } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select(`id, created_at, ${FIELD_ESTADO_FINALIZACION}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
                .limit(10);

            const items: ActivityItem[] = [];

            enrollments?.forEach((e: any) => {
                const name = e.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
                const ppsName = e[FIELD_NOMBRE_PPS_CONVOCATORIAS] || 'Convocatoria';
                items.push({
                    id: `env-${e.id}`,
                    type: 'enrollment',
                    title: 'Se postuló a',
                    description: ppsName,
                    timestamp: new Date(e.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'blue',
                    institution: ppsName
                });
            });

            requests?.forEach((r: any) => {
                const name = r[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Estudiante';
                const status = r[FIELD_ESTADO_PPS] || 'Pendiente';
                const inst = r[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución';
                
                // Determinar color basado en estado
                let color: 'amber' | 'blue' | 'purple' = 'blue';
                if (status === 'Pendiente') color = 'amber';
                
                items.push({
                    id: `req-${r.id}`,
                    type: 'request',
                    title: status === 'Pendiente' ? 'Nueva Solicitud' : 'Gestión en Curso',
                    description: status, 
                    timestamp: new Date(r.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: color,
                    rawStatus: status,
                    institution: inst
                });
            });

            finalizations?.forEach((f: any) => {
                const name = f.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
                items.push({
                    id: `fin-${f.id}`,
                    type: 'finalization',
                    title: 'Solicitó Acreditación',
                    description: `Estado: ${f[FIELD_ESTADO_FINALIZACION]}`,
                    timestamp: new Date(f.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'emerald',
                    rawStatus: f[FIELD_ESTADO_FINALIZACION]
                });
            });

            // Sort by most recent
            return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 25);
        },
        refetchInterval: 30000 
    });
};
