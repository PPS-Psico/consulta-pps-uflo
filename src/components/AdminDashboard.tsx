
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSmartAnalysis } from '../hooks/useSmartAnalysis';
import { useOperationalData } from '../hooks/useOperationalData';
import SmartBriefing from './SmartBriefing';
import Toast from './Toast';
import { AdminDashboardSkeleton } from './Skeletons';
import EmptyState from './EmptyState';
import ActivityFeed from './ActivityFeed';
import { differenceInDays } from 'date-fns';

interface AdminDashboardProps {
    isTestingMode?: boolean;
}

const ManagementCard: React.FC<{
    title: string;
    count: number;
    icon: string;
    color: 'red' | 'amber' | 'emerald' | 'blue';
    onClick: () => void;
    label: string;
    subCount?: number;
    subLabel?: string;
}> = ({ title, count, icon, color, onClick, label, subCount, subLabel }) => {
    
    // Configuración de colores dinámica
    const styles = {
        red: {
            hoverBorder: 'group-hover:border-rose-300 dark:group-hover:border-rose-700',
            iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
            countText: 'text-rose-700 dark:text-rose-400',
            hoverBg: 'hover:bg-rose-50/50 dark:hover:bg-rose-900/10'
        },
        amber: {
            hoverBorder: 'group-hover:border-amber-300 dark:group-hover:border-amber-700',
            iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
            countText: 'text-amber-700 dark:text-amber-400',
            hoverBg: 'hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
        },
        emerald: {
            hoverBorder: 'group-hover:border-emerald-300 dark:group-hover:border-emerald-700',
            iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
            countText: 'text-emerald-700 dark:text-emerald-400',
            hoverBg: 'hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
        },
        blue: {
            hoverBorder: 'group-hover:border-blue-300 dark:group-hover:border-blue-700',
            iconBg: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
            countText: 'text-blue-700 dark:text-blue-400',
            hoverBg: 'hover:bg-blue-50/50 dark:hover:bg-blue-900/10'
        },
    };

    const style = styles[color];

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg text-left group ${style.hoverBorder} ${style.hoverBg}`}
        >
            <div className="flex justify-between items-start w-full mb-4">
                <div className={`p-3 rounded-xl shadow-sm transition-colors ${style.iconBg}`}>
                    <span className="material-icons !text-2xl">{icon}</span>
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0 text-slate-400 dark:text-slate-500">
                    <span className="material-icons !text-xl">arrow_forward</span>
                </div>
            </div>
            
            <div className="mt-auto w-full">
                <div className="flex justify-between items-end mb-1">
                    <span className={`text-4xl font-black tracking-tight ${style.countText}`}>
                        {count}
                    </span>
                    {subCount !== undefined && subCount > 0 && (
                        <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-full mb-1 border border-slate-200 dark:border-slate-700">
                            {subCount} {subLabel}
                        </span>
                    )}
                </div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{title}</h4>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{label}</p>
            </div>
        </button>
    );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isTestingMode = false }) => {
    const { authenticatedUser } = useAuth();
    const navigate = useNavigate();
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // Fetch Operational Data
    const { data: opData, isLoading: isOpLoading, error: opError } = useOperationalData(isTestingMode);

    // Smart Analysis Hook
    const analysis = useSmartAnalysis(opData, isOpLoading);

    if (isOpLoading) return <AdminDashboardSkeleton />;
    
    if (opError) {
        return (
            <EmptyState 
                icon="error" 
                title="Error cargando el dashboard" 
                message={(opError as any)?.message || "Ocurrió un error desconocido."} 
            />
        );
    }
    
    // Calcular contadores para las tarjetas
    const now = new Date();
    
    // 1. Cierres Vencidos (Lanzamientos cuya fecha fin ya pasó)
    const overdueCount = (opData?.endingLaunches || []).filter((l: any) => l.daysLeft < 0).length;
    
    // 2. Solicitudes Demoradas (+5 días sin actualización)
    let stagnantCount = 0;
    (opData?.pendingRequests || []).forEach((r: any) => {
        if (!r.updated) return;
        const lastUpdate = new Date(r.updated);
        if (differenceInDays(now, lastUpdate) > 5) stagnantCount++;
    });

    // 3. Acreditaciones Pendientes
    const accreditationCount = (opData?.pendingFinalizations || []).length;

    // 4. Próximos a Vencer (0 a 30 días)
    const upcomingLaunches = (opData?.endingLaunches || []).filter((l: any) => l.daysLeft >= 0 && l.daysLeft <= 30);
    const upcomingCount = upcomingLaunches.length;
    
    // 4b. Urgentes (0 a 7 días) - Para destacar
    const urgentCount = upcomingLaunches.filter((l: any) => l.daysLeft <= 7).length;


    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}

            {/* --- SECCIÓN 1: INTELIGENCIA ARTIFICIAL --- */}
            <SmartBriefing 
                status={analysis.status === 'loading' ? 'stable' : analysis.status}
                summary={analysis.summary}
                insights={analysis.insights}
                score={analysis.systemScore}
                userName={authenticatedUser?.nombre || 'Admin'}
            />
            
            {/* --- SECCIÓN 2: GESTIÓN INMEDIATA (Tarjetas) --- */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-5 flex items-center gap-2 px-1">
                    <span className="material-icons text-indigo-500 dark:text-indigo-400">dashboard</span>
                    Gestión Operativa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <ManagementCard
                        title="Cierres Vencidos"
                        count={overdueCount}
                        label="Requieren archivo o relanzamiento"
                        icon="event_busy"
                        color="red"
                        onClick={() => navigate('/admin/gestion?filter=vencidas')}
                    />
                    <ManagementCard
                        title="Solicitudes Demoradas"
                        count={stagnantCount}
                        label="Sin respuesta hace +5 días"
                        icon="hourglass_empty"
                        color="amber"
                        onClick={() => navigate('/admin/solicitudes?tab=ingreso')}
                    />
                    <ManagementCard
                        title="Acreditaciones"
                        count={accreditationCount}
                        label="Documentación a revisar"
                        icon="verified"
                        color="emerald"
                        onClick={() => navigate('/admin/solicitudes?tab=egreso')}
                    />
                    <ManagementCard
                        title="Vencimientos Próximos"
                        count={upcomingCount}
                        label="Cierran este mes"
                        icon="update"
                        color="blue"
                        subCount={urgentCount}
                        subLabel="en 7 días"
                        onClick={() => navigate('/admin/gestion?filter=proximas')}
                    />
                </div>
            </div>

            {/* --- SECCIÓN 3: FEED DE ACTIVIDAD (Diseño Timeline) --- */}
            <div className="pt-4">
                 <ActivityFeed isTestingMode={isTestingMode} />
            </div>
        </div>
    );
};

export default AdminDashboard;
