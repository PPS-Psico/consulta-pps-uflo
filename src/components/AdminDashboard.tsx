
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMetricsData } from '../hooks/useMetricsData';
import { useSmartAnalysis } from '../hooks/useSmartAnalysis';
import { useOperationalData } from '../hooks/useOperationalData';
import SmartBriefing from './SmartBriefing';
import Toast from './Toast';
import { AdminDashboardSkeleton } from './Skeletons';
import EmptyState from './EmptyState';
import { MetricsDashboard } from './MetricsDashboard';

interface AdminDashboardProps {
    isTestingMode?: boolean;
}

const OperationalCard: React.FC<{
    title: string;
    count: number;
    icon: string;
    color: 'rose' | 'amber' | 'blue' | 'emerald';
    onClick: () => void;
}> = ({ title, count, icon, color, onClick }) => {
    
    const colors = {
        rose: 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800 hover:border-rose-300',
        amber: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:border-amber-300',
        blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:border-blue-300',
        emerald: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:border-emerald-300',
    };

    const iconColors = {
        rose: 'text-rose-500',
        amber: 'text-amber-500',
        blue: 'text-blue-500',
        emerald: 'text-emerald-500',
    };

    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 hover:-translate-y-1 hover:shadow-lg w-full group ${colors[color]}`}
        >
            <div className={`mb-3 p-3 bg-white dark:bg-slate-800 rounded-full shadow-sm ${iconColors[color]}`}>
                <span className="material-icons !text-3xl">{icon}</span>
            </div>
            <span className="text-3xl font-black mb-1">{count}</span>
            <span className="font-bold text-xs uppercase tracking-wider opacity-80">{title}</span>
        </button>
    );
};

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isTestingMode = false }) => {
    const { authenticatedUser } = useAuth();
    const navigate = useNavigate();
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // 1. Fetch Statistical Data (For Metrics Dashboard)
    const targetYear = new Date().getFullYear();
    const { data: metrics, isLoading: isMetricsLoading, error: metricsError } = useMetricsData({ targetYear, isTestingMode });
    
    // 2. Fetch Operational Data (For Smart Analysis / AI)
    const { data: opData, isLoading: isOpLoading, error: opError } = useOperationalData(isTestingMode);

    // Smart Analysis Hook
    const analysis = useSmartAnalysis(opData, isOpLoading);

    // Show loading only if initial critical data is loading
    if (isMetricsLoading || isOpLoading) return <AdminDashboardSkeleton />;
    
    if (metricsError || opError) {
        const errorMsg = (metricsError as any)?.message || (opError as any)?.message || "Ocurrió un error desconocido.";
        return (
            <EmptyState 
                icon="error" 
                title="Error cargando el dashboard" 
                message={errorMsg} 
            />
        );
    }
    
    // Derived Counts for Operational Cards
    const endingLaunches = opData?.endingLaunches || [];
    const expiredCount = endingLaunches.filter((l: any) => l.daysLeft < 0).length;
    const upcomingCount = endingLaunches.filter((l: any) => l.daysLeft >= 0 && l.daysLeft <= 30).length;
    const requestsCount = opData?.pendingRequests.length || 0;
    const accreditationsCount = opData?.pendingFinalizations.length || 0;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}

            {/* --- SMART BRIEFING (Artificial Intelligence UI) --- */}
            <SmartBriefing 
                status={analysis.status}
                summary={analysis.summary}
                insights={analysis.insights}
                score={analysis.systemScore}
                userName={authenticatedUser?.nombre || 'Admin'}
            />
            
            {/* --- GESTIÓN INMEDIATA (Operational Cards) --- */}
            <div>
                 <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 px-1">Gestión Inmediata</h3>
                 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <OperationalCard 
                        title="Vencidas" 
                        count={expiredCount} 
                        icon="event_busy" 
                        color="rose" 
                        onClick={() => navigate('/admin/gestion?filter=vencidas')}
                    />
                    <OperationalCard 
                        title="Vencen Pronto" 
                        count={upcomingCount} 
                        icon="timer" 
                        color="amber" 
                        onClick={() => navigate('/admin/gestion?filter=proximas')}
                    />
                    <OperationalCard 
                        title="Solicitudes" 
                        count={requestsCount} 
                        icon="login" 
                        color="blue" 
                        onClick={() => navigate('/admin/solicitudes?tab=ingreso')}
                    />
                    <OperationalCard 
                        title="Acreditaciones" 
                        count={accreditationsCount} 
                        icon="school" 
                        color="emerald" 
                        onClick={() => navigate('/admin/solicitudes?tab=egreso')}
                    />
                </div>
            </div>

            {/* --- METRICS OVERVIEW --- */}
            <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800">
                 <MetricsDashboard isTestingMode={isTestingMode} />
            </div>
        </div>
    );
};

export default AdminDashboard;
