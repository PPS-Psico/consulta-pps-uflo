
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import PracticasTable from '../components/PracticasTable';
import SolicitudesList from '../components/SolicitudesList';
import EmptyState from '../components/EmptyState';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import WelcomeBanner from '../components/WelcomeBanner';
import ConvocatoriasList from '../components/ConvocatoriasList';
import InformesList from '../components/InformesList';
import WhatsAppExportButton from '../components/WhatsAppExportButton';
import { useAuth } from '../contexts/AuthContext';
import type { AuthUser } from '../contexts/AuthContext';
import type { TabId, Orientacion } from '../types';
import DashboardLoadingSkeleton from '../components/DashboardLoadingSkeleton';
import ErrorState from '../components/ErrorState';
import ProfileView from '../components/ProfileView';
import HomeView from '../components/HomeView';
import PrintableReport from '../components/PrintableReport';
import { useStudentPanel } from '../contexts/StudentPanelContext';
import FinalizacionForm from '../components/FinalizacionForm';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { supabase } from '../lib/supabaseClient';

interface StudentDashboardProps {
  user: AuthUser;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  showExportButton?: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, activeTab, onTabChange, showExportButton = false }) => {
  const { isSuperUserMode } = useAuth();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [isFinalizationModalOpen, setIsFinalizationModalOpen] = useState(false);

  useEffect(() => {
      const checkPasswordStatus = async () => {
          if (user.id) {
              const { data } = await supabase
                  .from('estudiantes')
                  .select('must_change_password')
                  .eq('id', user.id)
                  .single();
              
              if (data && data.must_change_password) {
                  setMustChangePassword(true);
              }
          }
      };
      checkPasswordStatus();
  }, [user.id]);


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

  // --- DERIVED STATE & MEMOIZATION ---
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(showExportButton ? 'practicas' : 'inicio');
  const currentActiveTab = activeTab ?? internalActiveTab;
  const setCurrentActiveTab = onTabChange ?? setInternalActiveTab;
  
  const selectedOrientacion = (studentDetails?.['Orientación Elegida'] || "") as Orientacion | "";
  const studentNameForPanel = studentDetails?.['Nombre'] || user.nombre;

  // --- MUTATION HANDLERS ---
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
  
  // --- MEMOIZED TAB CONTENT ---
  const homeContent = useMemo(() => <HomeView 
      myEnrollments={enrollmentMap ? Array.from(enrollmentMap.values()) : []} 
      allLanzamientos={allLanzamientos} 
      informeTasks={informeTasks} 
      lanzamientos={lanzamientos} 
      onNavigate={setCurrentActiveTab}
      student={studentDetails}
      onInscribir={enrollStudent.mutate}
      institutionAddressMap={institutionAddressMap}
      enrollmentMap={enrollmentMap}
      completedLanzamientoIds={completedLanzamientoIds}
      criterios={criterios}
      onOpenFinalization={handleOpenFinalization}
  />, [enrollmentMap, allLanzamientos, informeTasks, lanzamientos, setCurrentActiveTab, studentDetails, enrollStudent.mutate, institutionAddressMap, completedLanzamientoIds, criterios, handleOpenFinalization]);
  
  const informesContent = useMemo(() => <InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} />, [informeTasks, confirmInforme]);
  const solicitudesContent = useMemo(() => <SolicitudesList solicitudes={solicitudes} />, [solicitudes]);
  const practicasContent = useMemo(() => <PracticasTable practicas={practicas} handleNotaChange={handleNotaChange} />, [practicas, handleNotaChange]);
  const profileContent = useMemo(() => <ProfileView studentDetails={studentDetails} isLoading={isLoading} updateInternalNotes={updateInternalNotes} />, [studentDetails, isLoading, updateInternalNotes]);

  const studentDataTabs = useMemo(() => {
    const tabs: { id: TabId; label: string; icon: string; content: React.ReactNode; badge?: number }[] = [
      { id: 'inicio', label: 'Inicio', icon: 'home', content: homeContent },
      { id: 'informes', label: `Informes`, icon: 'assignment_turned_in', content: informesContent, badge: informeTasks.length > 0 ? informeTasks.length : undefined },
      { id: 'solicitudes', label: `Mis Solicitudes`, icon: 'list_alt', content: solicitudesContent, badge: solicitudes.length > 0 ? solicitudes.length : undefined },
      { id: 'practicas', label: `Mis Prácticas`, icon: 'work_history', content: practicasContent, badge: practicas.length > 0 ? practicas.length : undefined }
    ];

    if (showExportButton) {
      return tabs.filter(tab => tab.id === 'informes' || tab.id === 'solicitudes' || tab.id === 'practicas');
    }
    
    tabs.push({
        id: 'profile' as TabId,
        label: 'Mi Perfil',
        icon: 'person',
        content: profileContent,
        badge: undefined
    });
    return tabs;

  }, [
      informeTasks.length, solicitudes.length, practicas.length, showExportButton,
      homeContent, informesContent, solicitudesContent, practicasContent, profileContent
  ]);
  
  useEffect(() => {
    const isCurrentTabValid = studentDataTabs.some(tab => tab.id === currentActiveTab);
    if (!isCurrentTabValid && studentDataTabs.length > 0) {
      setCurrentActiveTab(studentDataTabs[0].id);
    }
  }, [studentDataTabs, currentActiveTab, setCurrentActiveTab]);

  const hasData = useMemo(() => practicas.length > 0 || solicitudes.length > 0 || lanzamientos.length > 0 || informeTasks.length > 0, [practicas, solicitudes, lanzamientos, informeTasks]);
  const showEmptyState = useMemo(() => !isLoading && !hasData && isSuperUserMode, [isLoading, hasData, isSuperUserMode]);

  if (isLoading) return <DashboardLoadingSkeleton />;
  if (error) return <ErrorState error={error.message} onRetry={() => refetchAll()} />;

  if (showEmptyState) {
    return (
      <>
        <div className="print-only">
          <PrintableReport studentDetails={studentDetails} criterios={criterios} practicas={practicas} />
        </div>
        <div className="no-print">
          <div className="space-y-8 animate-fade-in-up">
            <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={false} />
            <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} onRequestFinalization={handleOpenFinalization} />
            <Card className="border-slate-300/50 bg-slate-50/30">
              <EmptyState icon="search_off" title="Sin Resultados" message="No se encontró información de prácticas o solicitudes para este estudiante." action={<button onClick={refetchAll} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-105">Actualizar Datos</button>} />
            </Card>
          </div>
          <WhatsAppExportButton practicas={practicas} criterios={criterios} selectedOrientacion={selectedOrientacion} studentNameForPanel={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
           <button onClick={() => window.print()} className="fixed bottom-6 right-24 z-50 w-14 h-14 bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-400" aria-label="Imprimir reporte">
             <span className="material-icons !text-2xl">print</span>
           </button>
        </div>
      </>
    );
  }
  
  return (
    <>
      {/* MODAL CAMBIO DE CONTRASEÑA */}
      <ChangePasswordModal isOpen={mustChangePassword} />

      {/* MODAL DE FINALIZACIÓN */}
      {isFinalizationModalOpen && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
              <button 
                onClick={() => setIsFinalizationModalOpen(false)}
                className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-700/80 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-50 dark:text-slate-300 transition-colors shadow-sm backdrop-blur-sm"
              >
                  <span className="material-icons">close</span>
              </button>
              <FinalizacionForm studentAirtableId={user.id || null} />
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

      {/* --- VISTA DE ESCRITORIO --- */}
      <div className="hidden md:block no-print space-y-8 animate-fade-in-up">
        <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
        <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} onRequestFinalization={handleOpenFinalization} />
        
        {hasData && (
          <Card>
            <Tabs
              tabs={studentDataTabs}
              activeTabId={currentActiveTab}
              onTabChange={(id) => setCurrentActiveTab(id as TabId)}
            />
          </Card>
        )}
      </div>

      {/* --- VISTA MÓVIL --- */}
      <div className="md:hidden no-print space-y-8 animate-fade-in-up">
          {currentActiveTab === 'inicio' && (
              <>
                  <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
                  {homeContent}
              </>
          )}

          {currentActiveTab === 'informes' && (
              <Card icon="assignment_turned_in" title="Entrega de Informes Finales" description="Sube tu informe final al campus y luego confirma la entrega aquí.">
                  {informesContent}
              </Card>
          )}

          {currentActiveTab === 'solicitudes' && (
              <Card icon="list_alt" title="Mis Solicitudes de PPS" description="Seguimiento del estado de las Prácticas Profesionales Supervisadas que has solicitado.">
                  {solicitudesContent}
              </Card>
          )}
          
          {currentActiveTab === 'practicas' && (
              <>
                  <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} onRequestFinalization={handleOpenFinalization} />
                  <Card icon="work_history" title="Historial de Prácticas" description="Detalle de todas las prácticas que has realizado y sus calificaciones.">
                    {practicasContent}
                  </Card>
              </>
          )}

          {currentActiveTab === 'profile' && (
                <Card icon="person" title="Mi Perfil">
                  {profileContent}
              </Card>
          )}
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
