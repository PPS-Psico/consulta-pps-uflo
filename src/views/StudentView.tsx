
import React, { useState, useCallback } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Footer from '../components/Footer';
import AppModals from '../components/AppModals';
import MobileBottomNav from '../components/MobileBottomNav';
import { useAuth } from '../contexts/AuthContext';
import { StudentPanelProvider, useStudentPanel } from '../contexts/StudentPanelContext';
import type { TabId, Orientacion } from '../types';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import WelcomeBanner from '../components/WelcomeBanner';
import CriteriosPanel from '../components/CriteriosPanel';
import { FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES } from '../constants';
import FinalizacionForm from '../components/FinalizacionForm';

// Inner component to consume Context
const StudentLayout: React.FC = () => {
    const { authenticatedUser } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
    const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);

    const {
        studentDetails,
        criterios,
        updateOrientation,
        isLoading,
        practicas
    } = useStudentPanel();

    // Determine active tab from URL
    let activeTab = 'inicio';
    if (location.pathname.includes('/practicas')) activeTab = 'practicas';
    else if (location.pathname.includes('/solicitudes')) activeTab = 'solicitudes';
    else if (location.pathname.includes('/perfil')) activeTab = 'profile';
    else if (location.pathname.includes('/informes')) activeTab = 'informes';

    const isInicio = activeTab === 'inicio';

    const selectedOrientacion = (studentDetails?.[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] || "") as Orientacion | "";
    const studentNameForPanel = studentDetails?.[FIELD_NOMBRE_ESTUDIANTES] || authenticatedUser?.nombre || 'Estudiante';

    const handleOrientacionChange = useCallback((orientacion: Orientacion | "") => {
        updateOrientation.mutate(orientacion, {
          onSuccess: () => {
            setShowSaveConfirmation(true);
            setTimeout(() => setShowSaveConfirmation(false), 2000);
          }
        });
    }, [updateOrientation]);

    const handleOpenFinalization = useCallback(() => {
        setIsFinalizationModalOpen(true);
    }, []);

    const mobileNavTabs = [
      { id: 'inicio' as TabId, label: 'Inicio', icon: 'home', path: '/student' },
      { id: 'practicas' as TabId, label: 'Prácticas', icon: 'work_history', path: '/student/practicas' },
      { id: 'solicitudes' as TabId, label: 'Solicitudes', icon: 'list_alt', path: '/student/solicitudes' },
    ];

    const desktopTabs = [
        { id: 'inicio', label: 'Inicio', icon: 'home', content: null, path: '/student' },
        { id: 'solicitudes', label: 'Mis Solicitudes', icon: 'list_alt', content: null, path: '/student/solicitudes' },
        { id: 'practicas', label: 'Mis Prácticas', icon: 'work_history', content: null, path: '/student/practicas' },
        { id: 'profile', label: 'Mi Perfil', icon: 'person', content: null, path: '/student/perfil' }
    ];

    return (
        <div className="pb-24 md:pb-0 min-h-screen flex flex-col">
            {isFinalizationModalOpen && (
                <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
                        <button 
                            onClick={() => setIsFinalizationModalOpen(false)}
                            className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-700/80 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-50 dark:text-slate-300 transition-colors shadow-sm backdrop-blur-sm"
                        >
                            <span className="material-icons">close</span>
                        </button>
                        <FinalizacionForm studentAirtableId={authenticatedUser?.id || null} />
                    </div>
                </div>
            )}

            <div className="flex-grow flex flex-col gap-8">
                {/* 
                    1. Welcome Banner: 
                    - Mobile: Only visible on 'inicio'
                    - Desktop: Always visible
                */}
                <div className={!isInicio ? 'hidden md:block' : ''}>
                    <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
                </div>
                
                {/* 
                    2. Criterios Panel:
                    - Mobile: Only visible on 'inicio'
                    - Desktop: Always visible
                */}
                <div className={!isInicio ? 'hidden md:block' : ''}>
                    <CriteriosPanel 
                        criterios={criterios} 
                        selectedOrientacion={selectedOrientacion} 
                        handleOrientacionChange={handleOrientacionChange} 
                        showSaveConfirmation={showSaveConfirmation} 
                        onRequestFinalization={handleOpenFinalization} 
                    />
                </div>

                {/* 3. Tabs (Navigation) - Desktop Only */}
                <div className="hidden md:block">
                    <Card className="py-0 px-0">
                        <Tabs 
                            tabs={desktopTabs} 
                            activeTabId={activeTab} 
                            onTabChange={(id) => {
                                const tab = desktopTabs.find(t => t.id === id);
                                if(tab) navigate(tab.path);
                            }}
                        />
                    </Card>
                </div>
                
                {/* 4. Content (Outlet) */}
                <Outlet />
            </div>

            <Footer activeTab={activeTab as TabId} />
            <AppModals />

            <MobileBottomNav 
                tabs={mobileNavTabs}
                activeTabId={activeTab as TabId} 
            />
        </div>
    );
};

const StudentView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    if (!authenticatedUser) return null;

    return (
        <StudentPanelProvider legajo={authenticatedUser.legajo}>
            <StudentLayout />
        </StudentPanelProvider>
    );
};

export default StudentView;
