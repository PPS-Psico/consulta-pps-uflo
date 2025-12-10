
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
}> = ({ title, count, icon, color, onClick, label }) => {
    const colorClasses = {
        red: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:border-rose-300',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:border-amber-300',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-300',
    };

    const iconBg = {
        red: 'bg-white dark:bg-rose-950 text-rose-600',
        amber: 'bg-white dark:bg-amber-950 text-amber-600',
        emerald: 'bg-white dark:bg-emerald-950 text-emerald-600',
        blue: 'bg-white dark:bg-blue-950 text-blue-600',
    };

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-md text-left group ${colorClasses[color]}`}
        >
            <div className="flex justify-between items-start w-full mb-3">
                <div className={`p-2.5 rounded-xl shadow-sm ${iconBg[color]}`}>
                    <span className="material-icons !text-xl">{icon}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-current">
                    <span className="text-xs font-bold uppercase">Ver</span>
                    <span className="material-icons !text-sm">arrow_forward</span>
                </div>
            </div>
            
            <div className="mt-auto">
                <span className="text-3xl font-black tracking-tight block mb-1">
                    {count}
                </span>
                <h4 className="font-bold text-sm opacity-90">{title}</h4>
                <p className="text-xs font-medium opacity-70 mt-1">{label}</p>
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
    
    // 1. Cierres Vencidos (Lanzamientos cuya fecha fin ya pasó y siguen 'Pendiente de Gestión')
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
    const upcomingCount = (opData?.endingLaunches || []).filter((l: any) => l.daysLeft >= 0 && l.daysLeft <= 30).length;


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
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <span className="material-icons text-slate-400">dashboard</span>
                    Gestión Operativa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
