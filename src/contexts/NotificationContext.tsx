

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
    FIELD_LEGAJO_PPS
} from '../constants';
import Toast from '../components/Toast';

export interface AppNotification {
    id: string;
    title: string;
    message: string;
    timestamp: Date;
    type: 'solicitud_pps' | 'acreditacion' | 'info';
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
    const navigate = useNavigate();

    // Only admins need to listen to these events
    const isAdmin = isSuperUserMode || isJefeMode || isDirectivoMode;

    const addNotification = useCallback((notif: Omit<AppNotification, 'id' | 'timestamp' | 'isRead'>) => {
        console.log("📢 Agregando notificación:", notif.title);
        const newNotif: AppNotification = {
            ...notif,
            id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
            timestamp: new Date(),
            isRead: false,
        };

        setNotifications(prev => [newNotif, ...prev]);
        
        // Play sound (optional, simple beep)
        try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(() => {}); // Ignore autoplay errors
        } catch (e) {}

        // Show visual toast
        setToast({ message: newNotif.title, type: 'success' });
    }, []);

    useEffect(() => {
        if (!isAdmin || !authenticatedUser) return;

        console.log("🔔 Inicializando sistema de notificaciones Realtime...");
        console.log("   User ID:", authenticatedUser.id);

        // Unique channel per user session to prevent conflicts
        const channelName = `admin-notifications-${authenticatedUser.id}`;
        
        const channel = supabase.channel(channelName)
            // Listener: Nueva Solicitud de PPS
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_NAME_PPS },
                async (payload: any) => {
                    console.log("🔔 Realtime Event DETECTADO (Solicitud PPS):", payload);
                    if (!payload || !payload.new) return;
                    
                    const newRecord = payload.new;
                    
                    // Intentamos obtener los datos del snapshot guardado en la solicitud
                    let studentName = newRecord[FIELD_SOLICITUD_NOMBRE_ALUMNO];
                    const institution = newRecord[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución';
                    
                    // Fallback de seguridad: Si no viene el nombre (por error de guardado), lo buscamos con el ID
                    if (!studentName && newRecord[FIELD_LEGAJO_PPS]) {
                        try {
                            // Usamos una consulta ligera para obtener solo el nombre
                            const { data, error } = await supabase
                                .from(TABLE_NAME_ESTUDIANTES)
                                .select(FIELD_NOMBRE_ESTUDIANTES)
                                .eq('id', newRecord[FIELD_LEGAJO_PPS])
                                .maybeSingle();
                            
                            if (data) studentName = data[FIELD_NOMBRE_ESTUDIANTES];
                            if (error) console.warn("⚠️ Error buscando nombre estudiante (posible RLS blocking):", error);
                        } catch (err) {
                            console.error("Error recuperando nombre de estudiante para notificación:", err);
                        }
                    }

                    addNotification({
                        title: 'Nueva Solicitud de PPS',
                        message: `${studentName || 'Un estudiante'} ha solicitado iniciar PPS en ${institution}.`,
                        type: 'solicitud_pps',
                        link: '/admin/solicitudes?tab=ingreso' 
                    });
                }
            )
            // Listener: Nueva Solicitud de Finalización
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_NAME_FINALIZACION },
                async (payload: any) => {
                    console.log("🔔 Realtime Event DETECTADO (Finalización):", payload);
                    if (!payload || !payload.new) return;
                    
                    const newRecord = payload.new;
                    let studentName = 'Un estudiante';

                    // Fetch student name using the ID from the payload
                    const studentId = newRecord[FIELD_ESTUDIANTE_FINALIZACION]; 

                    if (studentId) {
                        try {
                            const { data, error } = await supabase
                                .from(TABLE_NAME_ESTUDIANTES)
                                .select(FIELD_NOMBRE_ESTUDIANTES)
                                .eq('id', studentId) 
                                .maybeSingle();
                            
                            if (!error && data && data[FIELD_NOMBRE_ESTUDIANTES]) {
                                studentName = data[FIELD_NOMBRE_ESTUDIANTES];
                            } else if (error) {
                                // If RLS blocks this, we might get an error, but we still want to notify
                                console.warn("⚠️ Error buscando nombre (RLS posiblemente bloquea SELECT):", error);
                                studentName = "Un Estudiante (Ver Admin)";
                            }
                        } catch (err) {
                             console.error("Exception fetching student name:", err);
                        }
                    }

                    addNotification({
                        title: 'Nueva Solicitud de Acreditación',
                        message: `${studentName} ha enviado su documentación final.`,
                        type: 'acreditacion',
                        link: '/admin/solicitudes?tab=egreso'
                    });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Conexión Realtime Establecida (${channelName})`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error(`❌ Error en canal de notificaciones:`, err);
                } else if (status === 'TIMED_OUT') {
                     console.warn(`⚠️ Timeout conectando notificaciones.`);
                } else {
                    console.log(`ℹ️ Estado Realtime: ${status}`);
                }
            });

        return () => {
            console.log("🔕 Desconectando notificaciones...");
            supabase.removeChannel(channel);
        };
    }, [isAdmin, authenticatedUser, addNotification]);

    const markAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        // If it has a link, navigate
        const target = notifications.find(n => n.id === id);
        if (target && target.link) {
            navigate(target.link);
        }
    };

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    };

    const clearNotifications = () => {
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
