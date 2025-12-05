
import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import WelcomeBannerAdmin from '../components/WelcomeBannerAdmin';
import Loader from '../components/Loader';

// Components for Testing Mode
import AdminDashboard from '../components/AdminDashboard';
import LanzadorView from './admin/LanzadorView';
import GestionView from './admin/GestionView';
import SolicitudesManager from '../components/SolicitudesManager';
import HerramientasView from './admin/HerramientasView';
import MetricsView from './admin/MetricsView'; // Imported

interface AdminViewProps {
    isTestingMode?: boolean;
}

const AdminView: React.FC<AdminViewProps> = ({ isTestingMode = false }) => {
    const { authenticatedUser } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    
    // State for local tabs in testing mode
    const [localTab, setLocalTab] = useState('dashboard');

    const tabs = [
        { id: 'dashboard', label: 'Inicio', icon: 'dashboard', path: '/admin/dashboard' },
        { id: 'metrics', label: 'Métricas', icon: 'analytics', path: '/admin/metrics' },
        { id: 'lanzador', label: 'Lanzador', icon: 'rocket_launch', path: '/admin/lanzador' },
        { id: 'gestion', label: 'Gestión', icon: 'tune', path: '/admin/gestion' },
        { id: 'solicitudes', label: 'Solicitudes', icon: 'list_alt', path: '/admin/solicitudes' },
        { id: 'herramientas', label: 'Herramientas', icon: 'construction', path: '/admin/herramientas' },
    ];

    const isActive = (tabId: string, path: string) => {
        if (isTestingMode) return localTab === tabId;
        return location.pathname.startsWith(path);
    }

    const handleTabClick = (tabId: string, path: string) => {
        if (isTestingMode) {
            setLocalTab(tabId);
        } else {
            navigate(path);
        }
    }

    const renderContent = () => {
        if (!isTestingMode) {
            return (
                <React.Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
                    <Outlet />
                </React.Suspense>
            );
        }

        switch (localTab) {
            case 'dashboard': return <AdminDashboard isTestingMode={true} />;
            case 'metrics': return <MetricsView onStudentSelect={(s) => navigate(`/admin/estudiantes/${s.legajo}`)} isTestingMode={true} />;
            case 'lanzador': return <LanzadorView isTestingMode={true} />;
            case 'gestion': return <GestionView isTestingMode={true} />;
            case 'solicitudes': return <SolicitudesManager isTestingMode={true} />;
            case 'herramientas': return <HerramientasView onStudentSelect={(s) => navigate(`/admin/estudiantes/${s.legajo}`)} isTestingMode={true} />;
            default: return <AdminDashboard isTestingMode={true} />;
        }
    }

    return (
        <div className="space-y-6">
            <WelcomeBannerAdmin name={authenticatedUser?.nombre || 'Administrador'} />
            
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map(tab => {
                        const active = isActive(tab.id, tab.path);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id, tab.path)}
                                className={`
                                    whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                                    ${active 
                                        ? 'border-blue-500 text-blue-600 dark:text-blue-400' 
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'}
                                `}
                            >
                                <span className="material-icons !text-lg">{tab.icon}</span>
                                {tab.label}
                            </button>
                        );
                    })}
                    {/* Dynamic Tab for Student Profile (Only in normal mode) */}
                    {!isTestingMode && location.pathname.includes('/estudiantes/') && (
                         <button
                            className="whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 border-blue-500 text-blue-600 dark:text-blue-400"
                         >
                            <span className="material-icons !text-lg">school</span>
                            Alumno {params.legajo}
                            <span 
                                className="material-icons !text-sm ml-2 text-slate-400 hover:text-red-500" 
                                onClick={(e) => { e.stopPropagation(); navigate('/admin/herramientas'); }}
                            >close</span>
                         </button>
                    )}
                </nav>
            </div>

            <div className="pt-6">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminView;
