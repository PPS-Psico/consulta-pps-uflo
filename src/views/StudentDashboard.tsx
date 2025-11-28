
import React, { useState, useCallback } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import WelcomeBanner from '../components/WelcomeBanner';
import WhatsAppExportButton from '../components/WhatsAppExportButton';
import DashboardLoadingSkeleton from '../components/DashboardLoadingSkeleton';
import ErrorState from '../components/ErrorState';
import ProfileView from '../components/ProfileView';
import HomeView from '../components/HomeView';
import PrintableReport from '../components/PrintableReport';
import { useStudentPanel } from '../contexts/StudentPanelContext';
import FinalizacionForm from '../components/FinalizacionForm';
import { FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES } from '../constants';
import { useNavigate } from 'react-router-dom';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import type { Orientacion, TabId } from '../types';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import InformesList from '../components/InformesList';
import SolicitudesList from '../components/SolicitudesList';
import PracticasTable from '../components/PracticasTable';

// Export individual views for Router
export { default as StudentPracticas } from '../components/PracticasTable';
export { default as StudentSolicitudes } from '../components/SolicitudesList';

// --- COMPONENT: StudentHome (For Router Index) ---
// This component only renders the "Home/Inicio" content.
// It assumes it's being rendered inside a StudentView layout that already has Welcome/Criterios.
export const StudentHome: React.FC = () => {
    const navigate = useNavigate();
    const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);
    
    const {
        studentDetails,
        lanzamientos,
        allLanzamientos,
        institutionAddressMap,
        enrollStudent,
        criterios,
        enrollmentMap,
        completedLanzamientoIds,
        informeTasks
    } = useStudentPanel();

    const handleOpenFinalization = useCallback(() => {
        setIsFinalizationModalOpen(true);
    }, []);

    return (
        <>
             {isFinalizationModalOpen && (
                <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
                    <button 
                        onClick={() => setIsFinalizationModalOpen(false)}
                        className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-700/80 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-50 dark:text-slate-300 transition-colors shadow-sm backdrop-blur-sm"
                    >
                        <span className="material-icons">close</span>
                    </button>
                    <FinalizacionForm studentAirtableId={studentDetails?.id || null} />
                </div>
                </div>
            )}
            <HomeView 
                myEnrollments={enrollmentMap ? Array.from(enrollmentMap.values()) : []} 
                allLanzamientos={allLanzamientos} 
                informeTasks={informeTasks} 
                lanzamientos={lanzamientos} 
                onNavigate={(id) => navigate(`/student/${id === 'inicio' ? '' : id}`)}
                student={studentDetails}
                onInscribir={enrollStudent.mutate}
                institutionAddressMap={institutionAddressMap}
                enrollmentMap={enrollmentMap}
                completedLanzamientoIds={completedLanzamientoIds}
                criterios={criterios}
                onOpenFinalization={handleOpenFinalization}
            />
        </>
    );
};


// --- COMPONENT: StudentDashboard (Standalone Widget) ---
// This component is the "Full Dashboard" used by Admins/Jefes.
// It handles its own tabs state and renders the full layout (Welcome + Criterios + Tabs).
interface StudentDashboardProps {
  user?: AuthUser;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  showExportButton?: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, activeTab, onTabChange, showExportButton = false }) => {
  const { isSuperUserMode, authenticatedUser } = useAuth();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);
  const navigate = useNavigate();

  const currentUser = user || authenticatedUser;

  const {
    studentDetails,
    practicas,
    solicitudes,
    lanzamientos,
    allLanzamientos,
    institutionAddressMap,
    isLoading,
    error,
    updateOrientation,
    updateInternalNotes,
    updateNota,
    enrollStudent,
    confirmInforme,
    refetchAll,
    criterios,
    enrollmentMap,
    completedLanzamientoIds,
    informeTasks
  } = useStudentPanel();

  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(showExportButton ? 'practicas' : 'inicio');
  const currentActiveTab = activeTab ?? internalActiveTab;
  const setCurrentActiveTab = onTabChange ?? setInternalActiveTab;
  
  const selectedOrientacion = (studentDetails?.[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] || "") as Orientacion | "";
  const studentNameForPanel = studentDetails?.[FIELD_NOMBRE_ESTUDIANTES] || currentUser?.nombre || 'Estudiante';

  const handleOrientacionChange = useCallback((orientacion: Orientacion | "") => {
    updateOrientation.mutate(orientacion, {
      onSuccess: () => {
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 2000);
      }
    });
  }, [updateOrientation]);

  const handleNotaChange = useCallback((practicaId: string, nota: string, convocatoriaId?: string) => {
    updateNota.mutate({ practicaId, nota, convocatoriaId });
  }, [updateNota]);

  const handleOpenFinalization = useCallback(() => {
      setIsFinalizationModalOpen(true);
  }, []);
  
  // Admin View Tabs
  const studentDataTabs = [
      { 
          id: 'inicio' as TabId, label: 'Inicio', icon: 'home', 
          content: <HomeView 
              myEnrollments={enrollmentMap ? Array.from(enrollmentMap.values()) : []} 
              allLanzamientos={allLanzamientos} 
              informeTasks={informeTasks} 
              lanzamientos={lanzamientos} 
              onNavigate={(id) => setCurrentActiveTab(id)}
              student={studentDetails}
              onInscribir={enrollStudent.mutate}
              institutionAddressMap={institutionAddressMap}
              enrollmentMap={enrollmentMap}
              completedLanzamientoIds={completedLanzamientoIds}
              criterios={criterios}
              onOpenFinalization={handleOpenFinalization}
          /> 
      },
      { id: 'solicitudes' as TabId, label: `Mis Solicitudes`, icon: 'list_alt', content: <SolicitudesList solicitudes={solicitudes} />, badge: solicitudes.length > 0 ? solicitudes.length : undefined },
      { id: 'practicas' as TabId, label: `Mis Prácticas`, icon: 'work_history', content: <PracticasTable practicas={practicas} handleNotaChange={handleNotaChange} />, badge: practicas.length > 0 ? practicas.length : undefined },
      { id: 'profile' as TabId, label: 'Mi Perfil', icon: 'person', content: <ProfileView studentDetails={studentDetails} isLoading={isLoading} updateInternalNotes={updateInternalNotes} /> }
  ];

  if (isLoading) return <DashboardLoadingSkeleton />;
  if (error) return <ErrorState error={error.message} onRetry={() => refetchAll()} />;
  
  return (
    <>
      {isFinalizationModalOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
              <button 
                onClick={() => setIsFinalizationModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-700/80 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-50 dark:text-slate-300 transition-colors shadow-sm backdrop-blur-sm"
              >
                  <span className="material-icons">close</span>
              </button>
              <FinalizacionForm studentAirtableId={currentUser?.id || null} />
          </div>
        </div>
      )}

      <div className="print-only">
          <PrintableReport 
              studentDetails={studentDetails} 
              criterios={criterios} 
              practicas={practicas} 
          />
      </div>

      <div className="no-print space-y-8 animate-fade-in-up">
        <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
        <CriteriosPanel 
            criterios={criterios} 
            selectedOrientacion={selectedOrientacion} 
            handleOrientacionChange={handleOrientacionChange} 
            showSaveConfirmation={showSaveConfirmation} 
            onRequestFinalization={handleOpenFinalization} 
        />
        
        <Card>
          <Tabs
            tabs={studentDataTabs}
            activeTabId={currentActiveTab}
            onTabChange={(id) => setCurrentActiveTab(id as TabId)}
          />
        </Card>
      </div>
      
      {showExportButton && (
        <>
          <WhatsAppExportButton practicas={practicas} criterios={criterios} selectedOrientacion={selectedOrientacion} studentNameForPanel={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
            <button
            onClick={() => window.print()}
            className="fixed bottom-6 right-24 z-50 w-14 h-14 bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center
                        transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-400"
            aria-label="Imprimir reporte"
          >
            <span className="material-icons !text-2xl">print</span>
          </button>
        </>
      )}
    </>
  );
};

export default StudentDashboard;
