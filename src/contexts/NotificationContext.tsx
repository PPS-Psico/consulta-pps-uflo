
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
    FIELD_NOMBRE_ESTUDIANTES
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
        if (!isAdmin) return;

        console.log("🔔 Inicializando sistema de notificaciones Realtime...");

        const channel = supabase.channel('admin-notifications')
            // Listener: Nueva Solicitud de PPS
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_NAME_PPS },
                (payload) => {
                    const newRecord = payload.new;
                    const studentName = newRecord[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Un estudiante';
                    const institution = newRecord[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución';

                    addNotification({
                        title: 'Nueva Solicitud de PPS',
                        message: `${studentName} ha solicitado iniciar PPS en ${institution}.`,
                        type: 'solicitud_pps',
                        link: '/admin/solicitudes' // Tab: Ingreso
                    });
                }
            )
            // Listener: Nueva Solicitud de Finalización
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: TABLE_NAME_FINALIZACION },
                async (payload) => {
                    console.log("Realtime Event Received:", payload);
                    const newRecord = payload.new;
                    let studentName = 'Un estudiante';

                    // Fetch student name because finalizacion table only has ID usually
                    // We use a quick single query here
                    if (newRecord.estudiante_id) {
                        const { data } = await supabase
                            .from(TABLE_NAME_ESTUDIANTES)
                            .select(FIELD_NOMBRE_ESTUDIANTES)
                            .eq('id', newRecord.estudiante_id) // Assuming ID matches
                            .maybeSingle();
                        
                        if (data && data[FIELD_NOMBRE_ESTUDIANTES]) {
                            studentName = data[FIELD_NOMBRE_ESTUDIANTES];
                        }
                    }

                    addNotification({
                        title: 'Nueva Solicitud de Acreditación',
                        message: `${studentName} ha enviado su documentación final.`,
                        type: 'acreditacion',
                        link: '/admin/solicitudes' // This view handles both via tabs, user will need to switch manually or we pass state
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [isAdmin, addNotification]);

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
