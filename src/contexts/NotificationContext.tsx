
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';
import { 
    TABLE_NAME_PPS, 
    TABLE_NAME_FINALIZACION, 
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_EMPRESA_PPS_SOLICITUD,
    TABLE_NAME_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_LEGAJO_PPS,
    FIELD_ESTADO_PPS,
    FIELD_ESTADO_FINALIZACION,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS
} from '../constants';
import Toast from '../components/Toast';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    type: 'solicitud_pps' | 'acreditacion' | 'info' | 'recordatorio';
    link: string;
    isRead: boolean;
}

interface NotificationContextType {
    notifications: AppNotification[];
    unreadCount: number;
    markAsRead: (id: string) => void;
    markAllAsRead: () => void;
    clearNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { authenticatedUser, isSuperUserMode, isJefeMode, isDirectivoMode } = useAuth();
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    
    // Persistencia Local: Set de IDs leídos
    const [readNotificationIds, setReadNotificationIds] = useState<Set<string>>(new Set());

    const navigate = useNavigate();

    // Only admins need to listen to these events
    const isAdmin = isSuperUserMode || isJefeMode || isDirectivoMode;
    const userId = authenticatedUser?.id || 'guest';
    const STORAGE_KEY = `read_notifications_v2_${userId}`;

    // 0. CARGAR LEÍDOS DESDE LOCALSTORAGE
    useEffect(() => {
        if (!isAdmin) return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    setReadNotificationIds(new Set(parsed));
                }
            }
        } catch (e) {
            console.warn("Error cargando notificaciones leídas del storage", e);
        }
    }, [isAdmin, STORAGE_KEY]);

    // Helper para guardar en storage
    const persistReadIds = (newSet: Set<string>) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(newSet)));
        setReadNotificationIds(newSet);
    };

    // 1. LOAD PENDING NOTIFICATIONS & GENERATE REMINDERS
    useEffect(() => {
        if (!isAdmin || !authenticatedUser) return;

        const fetchNotificationsAndReminders = async () => {
            try {
                const now = new Date();
                const loadedNotifications: AppNotification[] = [];

                // --- A. NOTIFICACIONES DE NUEVOS EVENTOS (Lo que ya tenías) ---
                
                // Fetch Pending PPS Requests
                const { data: pendingPPS } = await supabase
                    .from(TABLE_NAME_PPS)
                    .select(`id, created_at, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}`)
                    .eq(FIELD_ESTADO_PPS, 'Pendiente')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (pendingPPS) {
                    pendingPPS.forEach((req: any) => {
                        const notifId = `pps-${req.id}`;
                        loadedNotifications.push({
                            id: notifId,
                            title: 'Solicitud PPS Pendiente',
                            message: `${req[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Estudiante'} solicitó iniciar en ${req[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución'}.`,
                            timestamp: new Date(req.created_at),
                            type: 'solicitud_pps',
                            link: '/admin/solicitudes?tab=ingreso',
                            isRead: readNotificationIds.has(notifId)
                        });
                    });
                }

                // Fetch Pending Finalizations
                const { data: pendingFinals } = await supabase
                    .from(TABLE_NAME_FINALIZACION)
                    .select(`id, created_at, ${FIELD_ESTUDIANTE_FINALIZACION}`)
                    .eq(FIELD_ESTADO_FINALIZACION, 'Pendiente')
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (pendingFinals) {
                    const studentIds = [...new Set(pendingFinals.map((f: any) => f[FIELD_ESTUDIANTE_FINALIZACION]).filter(Boolean))];
                    let studentMap: Record<string, string> = {};
                    
                    if (studentIds.length > 0) {
                         const { data: students } = await supabase
                            .from(TABLE_NAME_ESTUDIANTES)
                            .select(`id, ${FIELD_NOMBRE_ESTUDIANTES}`)
                            .in('id', studentIds);
                         if (students) {
                             students.forEach((s: any) => {
                                 studentMap[s.id] = s[FIELD_NOMBRE_ESTUDIANTES];
                             });
                         }
                    }

                    pendingFinals.forEach((req: any) => {
                        const notifId = `fin-${req.id}`;
                        const sName = studentMap[req[FIELD_ESTUDIANTE_FINALIZACION]] || 'Un estudiante';
                        loadedNotifications.push({
                            id: notifId,
                            title: 'Acreditación Pendiente',
                            message: `${sName} espera revisión de documentos.`,
                            timestamp: new Date(req.created_at),
                            type: 'acreditacion',
                            link: '/admin/solicitudes?tab=egreso',
                            isRead: readNotificationIds.has(notifId)
                        });
                    });
                }

                // --- B. RECORDATORIOS AUTOMÁTICOS (NUEVO) ---

                // 1. Solicitudes "Estancadas" (Sin movimiento > 4 días)
                // Calculamos la fecha de corte (hace 4 días)
                const fourDaysAgo = new Date();
                fourDaysAgo.setDate(now.getDate() - 4);
                const fourDaysAgoStr = fourDaysAgo.toISOString();

                const { data: stagnantRequests } = await supabase
                    .from(TABLE_NAME_PPS)
                    .select(`id, ${FIELD_ULTIMA_ACTUALIZACION_PPS}, ${FIELD_SOLICITUD_NOMBRE_ALUMNO}, ${FIELD_EMPRESA_PPS_SOLICITUD}, ${FIELD_ESTADO_PPS}`)
                    // Filtramos las que NO están en un estado final
                    .not(FIELD_ESTADO_PPS, 'in', '("Finalizada","Cancelada","Rechazada","Archivado","Pendiente")') // Pendiente ya sale arriba, buscamos las que están "en gestión" pero colgadas
                    .lt(FIELD_ULTIMA_ACTUALIZACION_PPS, fourDaysAgoStr) // Menor que hace 4 días = más viejo
                    .limit(10);

                if (stagnantRequests) {
                    stagnantRequests.forEach((req: any) => {
                        // Generamos ID basado en la fecha de actualización para que si se actualiza, salga de nuevo
                        const lastUpdateRaw = req[FIELD_ULTIMA_ACTUALIZACION_PPS];
                        const notifId = `stag-${req.id}-${lastUpdateRaw}`; 
                        
                        const lastUpdate = new Date(lastUpdateRaw);
                        const daysDiff = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 3600 * 24));
                        
                        loadedNotifications.push({
                            id: notifId,
                            title: 'Seguimiento Demorado',
                            message: `La solicitud de ${req[FIELD_SOLICITUD_NOMBRE_ALUMNO]} en ${req[FIELD_EMPRESA_PPS_SOLICITUD]} lleva ${daysDiff} días sin actualizarse (${req[FIELD_ESTADO_PPS]}).`,
                            timestamp: new Date(), // Mostramos con hora actual para que suba
                            type: 'recordatorio',
                            link: `/admin/solicitudes?tab=ingreso`,
                            isRead: readNotificationIds.has(notifId)
                        });
                    });
                }

                // 2. PPS Por Finalizar (Faltan 3 días o menos)
                const threeDaysFromNow = new Date();
                threeDaysFromNow.setDate(now.getDate() + 3);
                
                // Usamos el inicio del día de hoy para incluir las que vencen hoy
                const todayStart = new Date();
                todayStart.setHours(0,0,0,0);

                const { data: endingLaunches } = await supabase
                    .from(TABLE_NAME_LANZAMIENTOS_PPS)
                    .select(`id, ${FIELD_NOMBRE_PPS_LANZAMIENTOS}, ${FIELD_FECHA_FIN_LANZAMIENTOS}`)
                    .gte(FIELD_FECHA_FIN_LANZAMIENTOS, todayStart.toISOString())
                    .lte(FIELD_FECHA_FIN_LANZAMIENTOS, threeDaysFromNow.toISOString())
                    .not(FIELD_ESTADO_GESTION_LANZAMIENTOS, 'in', '("Archivado","No se Relanza")') // Solo las activas
                    .limit(10);

                if (endingLaunches) {
                    endingLaunches.forEach((lanz: any) => {
                        // ID basado en la fecha de fin, para que solo se marque leido una vez por fecha de cierre
                        const notifId = `end-${lanz.id}-${lanz[FIELD_FECHA_FIN_LANZAMIENTOS]}`;
                        
                        const endDate = new Date(lanz[FIELD_FECHA_FIN_LANZAMIENTOS]);
                        const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24));
                        const dayText = daysLeft <= 0 ? 'HOY' : `${daysLeft} días`;

                        loadedNotifications.push({
                            id: notifId,
                            title: 'PPS Finaliza Pronto',
                            message: `La PPS "${lanz[FIELD_NOMBRE_PPS_LANZAMIENTOS]}" finaliza en ${dayText}. ¿Requiere gestión de cierre o relanzamiento?`,
                            timestamp: new Date(),
                            type: 'recordatorio',
                            link: '/admin/dashboard',
                            isRead: readNotificationIds.has(notifId)
                        });
                    });
                }

                // Sort merged list by date desc (Reminders at top as they have timestamp = now)
                loadedNotifications.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

                setNotifications(loadedNotifications);

            } catch (err) {
                console.error("Error loading notification history:", err);
            }
        };

        // Se ejecuta cada vez que cambia readNotificationIds para re-aplicar el estado de lectura
        // Esto es importante para la carga inicial
        fetchNotificationsAndReminders();

    }, [isAdmin, authenticatedUser, readNotificationIds]); 

    // 2. LISTEN FOR NEW EVENTS (REALTIME)
    useEffect(() => {
        if (!isAdmin || !authenticatedUser) return;

        const channelName = `admin-notifications-${authenticatedUser.id}`;
        
        const channel = supabase.channel(channelName)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_NAME_PPS },
                async (payload: any) => {
                    if (!payload || !payload.new) return;
                    
                    const newRecord = payload.new;
                    let studentName = newRecord[FIELD_SOLICITUD_NOMBRE_ALUMNO];
                    const institution = newRecord[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución';
                    
                    if (!studentName && newRecord[FIELD_LEGAJO_PPS]) {
                        try {
                            const { data } = await supabase
                                .from(TABLE_NAME_ESTUDIANTES)
                                .select(FIELD_NOMBRE_ESTUDIANTES)
                                .eq('id', newRecord[FIELD_LEGAJO_PPS])
                                .maybeSingle();
                            if (data) studentName = data[FIELD_NOMBRE_ESTUDIANTES];
                        } catch (err) {}
                    }

                    setNotifications(prev => {
                        const notifId = `pps-${newRecord.id}`;
                        if (prev.some(n => n.id === notifId)) return prev;
                        const newNotif: AppNotification = {
                            id: notifId,
                            title: 'Nueva Solicitud de PPS',
                            message: `${studentName || 'Un estudiante'} ha solicitado iniciar PPS en ${institution}.`,
                            timestamp: new Date(),
                            type: 'solicitud_pps',
                            link: '/admin/solicitudes?tab=ingreso',
                            isRead: false
                        };
                        setToast({ message: newNotif.title, type: 'success' });
                        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch (e) {}
                        return [newNotif, ...prev];
                    });
                }
            )
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_NAME_FINALIZACION },
                async (payload: any) => {
                    if (!payload || !payload.new) return;
                    const newRecord = payload.new;
                    let studentName = 'Un estudiante';
                    const studentId = newRecord[FIELD_ESTUDIANTE_FINALIZACION]; 

                    if (studentId) {
                        try {
                            const { data } = await supabase
                                .from(TABLE_NAME_ESTUDIANTES)
                                .select(FIELD_NOMBRE_ESTUDIANTES)
                                .eq('id', studentId) 
                                .maybeSingle();
                            if (data && data[FIELD_NOMBRE_ESTUDIANTES]) studentName = data[FIELD_NOMBRE_ESTUDIANTES];
                        } catch (err) {}
                    }

                     setNotifications(prev => {
                        const notifId = `fin-${newRecord.id}`;
                        if (prev.some(n => n.id === notifId)) return prev;
                        const newNotif: AppNotification = {
                            id: notifId,
                            title: 'Nueva Solicitud de Acreditación',
                            message: `${studentName} ha enviado su documentación final.`,
                            timestamp: new Date(),
                            type: 'acreditacion',
                            link: '/admin/solicitudes?tab=egreso',
                            isRead: false
                        };
                        setToast({ message: newNotif.title, type: 'success' });
                        try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(() => {}); } catch (e) {}
                        return [newNotif, ...prev];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin, authenticatedUser]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        
        // Persist in storage
        const newSet = new Set<string>(readNotificationIds);
        newSet.add(id);
        persistReadIds(newSet);

        const target = notifications.find(n => n.id === id);
        if (target && target.link) {
            navigate(target.link);
        }
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        
        const newSet = new Set<string>(readNotificationIds);
        notifications.forEach(n => newSet.add(n.id));
        persistReadIds(newSet);
    };

    const clearNotifications = () => {
        // Al limpiar, asumimos que el usuario quiere "descartarlas" todas.
        // Las marcamos como leídas en el storage para que no reaparezcan como nuevas si recarga,
        // y vaciamos la lista visual.
        markAllAsRead();
        setNotifications([]);
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <NotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications }}>
            {children}
            {toast && (
                <Toast 
                    message={toast.message} 
                    type={toast.type} 
                    onClose={() => setToast(null)} 
                    duration={5000}
                />
            )}
        </NotificationContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationProvider');
    }
    return context;
};
