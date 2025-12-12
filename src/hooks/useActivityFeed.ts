
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
<<<<<<< HEAD
    // New fields for richer UI
    rawStatus?: string;
    institution?: string;
=======
<<<<<<< HEAD
    // New fields for richer UI
    rawStatus?: string;
    institution?: string;
=======
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
}

export const useActivityFeed = (isTestingMode = false) => {
    return useQuery({
        queryKey: ['activityFeed', isTestingMode],
        queryFn: async (): Promise<ActivityItem[]> => {
            if (isTestingMode) {
                return [
                    {
                        id: 'mock1',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                        type: 'request',
                        title: 'Solicita iniciar PPS',
                        description: 'Pendiente de revisión inicial',
                        timestamp: new Date(), // Now
                        user: 'Ana García',
                        avatarLetter: 'A',
                        statusColor: 'amber',
                        rawStatus: 'Pendiente',
                        institution: 'Clínica Modelo'
<<<<<<< HEAD
=======
=======
                        type: 'enrollment',
                        title: 'Nueva Inscripción',
                        description: 'Se inscribió en Hospital de Niños',
                        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
                        user: 'Ana García',
                        avatarLetter: 'A',
                        statusColor: 'blue'
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                    },
                    {
                        id: 'mock2',
                        type: 'request',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                        title: 'Avance en Solicitud',
                        description: 'Convenio en proceso de firma',
                        timestamp: new Date(Date.now() - 1000 * 60 * 45),
                        user: 'Carlos Ruiz',
                        avatarLetter: 'C',
                        statusColor: 'blue',
                        rawStatus: 'En conversaciones',
                        institution: 'Fundación Sí'
<<<<<<< HEAD
=======
=======
                        title: 'Solicitud PPS',
                        description: 'Solicitó iniciar en Fundación Sí',
                        timestamp: new Date(Date.now() - 1000 * 60 * 45), // 45 min ago
                        user: 'Carlos Ruiz',
                        avatarLetter: 'C',
                        statusColor: 'purple'
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                    },
                    {
                        id: 'mock3',
                        type: 'finalization',
                        title: 'Documentación Final',
                        description: 'Subió informe final para revisión',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
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
<<<<<<< HEAD
=======
=======
                        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
                        user: 'Lucía Mendez',
                        avatarLetter: 'L',
                        statusColor: 'emerald'
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                    }
                ];
            }

            // 1. Fetch Latest Enrollments (Inscripciones)
            const { data: enrollments } = await supabase
                .from(TABLE_NAME_CONVOCATORIAS)
                .select(`id, created_at, ${FIELD_NOMBRE_PPS_CONVOCATORIAS}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                .limit(10);

            // 2. Fetch Latest Requests (Solicitudes) - EXCLUYENDO ARCHIVADOS
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`id, created_at, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}, ${FIELD_ESTADO_PPS}`)
                .neq(FIELD_ESTADO_PPS, 'Archivado') // FILTRO CLAVE: No mostrar archivados
                .order('created_at', { ascending: false })
                .limit(15);
<<<<<<< HEAD
=======
=======
                .limit(5);

            // 2. Fetch Latest Requests (Solicitudes)
            const { data: requests } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`id, created_at, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}, ${FIELD_ESTADO_PPS}`)
                .order('created_at', { ascending: false })
                .limit(5);
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47

            // 3. Fetch Latest Finalizations (Acreditaciones)
            const { data: finalizations } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select(`id, created_at, ${FIELD_ESTADO_FINALIZACION}, estudiante:${TABLE_NAME_ESTUDIANTES}(${FIELD_NOMBRE_ESTUDIANTES})`)
                .order('created_at', { ascending: false })
<<<<<<< HEAD
                .limit(10);
=======
<<<<<<< HEAD
                .limit(10);
=======
                .limit(5);
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47

            const items: ActivityItem[] = [];

            enrollments?.forEach((e: any) => {
                const name = e.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
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
<<<<<<< HEAD
=======
=======
                items.push({
                    id: `env-${e.id}`,
                    type: 'enrollment',
                    title: 'Nueva Inscripción',
                    description: `Se postuló a ${e[FIELD_NOMBRE_PPS_CONVOCATORIAS]}`,
                    timestamp: new Date(e.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'blue'
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                });
            });

            requests?.forEach((r: any) => {
                const name = r[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Estudiante';
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
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
<<<<<<< HEAD
=======
=======
                items.push({
                    id: `req-${r.id}`,
                    type: 'request',
                    title: 'Solicitud de Autogestión',
                    description: `Para ${r[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución'} (${r[FIELD_ESTADO_PPS]})`,
                    timestamp: new Date(r.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'purple'
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                });
            });

            finalizations?.forEach((f: any) => {
                const name = f.estudiante?.[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
                items.push({
                    id: `fin-${f.id}`,
                    type: 'finalization',
<<<<<<< HEAD
=======
<<<<<<< HEAD
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                    title: 'Solicitó Acreditación',
                    description: `Estado: ${f[FIELD_ESTADO_FINALIZACION]}`,
                    timestamp: new Date(f.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'emerald',
                    rawStatus: f[FIELD_ESTADO_FINALIZACION]
<<<<<<< HEAD
=======
=======
                    title: 'Acreditación Solicitada',
                    description: `Documentación subida. Estado: ${f[FIELD_ESTADO_FINALIZACION]}`,
                    timestamp: new Date(f.created_at),
                    user: name,
                    avatarLetter: name.charAt(0).toUpperCase(),
                    statusColor: 'emerald'
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
                });
            });

            // Sort by most recent
<<<<<<< HEAD
            return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 25);
        },
        refetchInterval: 30000 
=======
<<<<<<< HEAD
            return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 25);
        },
        refetchInterval: 30000 
=======
            return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 8);
        },
        refetchInterval: 30000 // Actualizar cada 30 segundos para dar sensación de "vivo"
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
>>>>>>> 592db3d9f8020721dcc0c886cb2f3638043e1d47
    });
};
