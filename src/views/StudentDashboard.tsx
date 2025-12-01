
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import PracticasTable from '../components/PracticasTable';
import SolicitudesList from '../components/SolicitudesList';
import EmptyState from '../components/EmptyState';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import WelcomeBanner from '../components/WelcomeBanner';
import InformesList from '../components/InformesList';
import WhatsAppExportButton from '../components/WhatsAppExportButton';
import { useAuth } from '../contexts/AuthContext';
import type { AuthUser } from '../contexts/AuthContext';
import type { TabId, Orientacion, SolicitudPPSFields } from '../types';
import DashboardLoadingSkeleton from '../components/DashboardLoadingSkeleton';
import ErrorState from '../components/ErrorState';
import ProfileView from '../components/ProfileView';
import HomeView from '../components/HomeView';
import PrintableReport from '../components/PrintableReport';
import { useStudentPanel } from '../contexts/StudentPanelContext';
import FinalizacionForm from '../components/FinalizacionForm';
import { 
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    TABLE_NAME_PPS,
    FIELD_LEGAJO_PPS,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_SOLICITUD_LEGAJO_ALUMNO,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_SOLICITUD_EMAIL_ALUMNO,
    FIELD_SOLICITUD_LOCALIDAD,
    FIELD_SOLICITUD_DIRECCION,
    FIELD_SOLICITUD_REFERENTE,
    FIELD_SOLICITUD_TIENE_CONVENIO,
    FIELD_SOLICITUD_TIENE_TUTOR,
    FIELD_SOLICITUD_CONTACTO_TUTOR,
    FIELD_SOLICITUD_TIPO_PRACTICA,
    FIELD_SOLICITUD_DESCRIPCION,
    FIELD_SOLICITUD_EMAIL_INSTITUCION,
    FIELD_SOLICITUD_TELEFONO_INSTITUCION,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES
} from '../constants';
import { useNavigate } from 'react-router-dom';
import { useModal } from '../contexts/ModalContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';

// Export individual views for Router
export { default as StudentPracticas } from '../components/PracticasTable';
export { default as StudentSolicitudes } from '../components/SolicitudesList';

// --- COMPONENT: StudentHome (For Router Index) ---
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

    // Helper to get student ID safely
    const getStudentId = () => {
        if (!studentDetails) return null;
        return (studentDetails as any).id || null;
    };

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
                    <FinalizacionForm studentAirtableId={getStudentId()} />
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
  const { openSolicitudPPSModal, showModal } = useModal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  // Helper to safely get student ID
  const getStudentId = () => {
    if (studentDetails && (studentDetails as any).id) return (studentDetails as any).id;
    return currentUser?.id || null;
  };

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

  // Create new PPS Request Mutation
  const createSolicitudMutation = useMutation({
      mutationFn: async (formData: any) => {
          const studentId = getStudentId();
          if (!studentId) throw new Error("Error identificando al estudiante.");

          const newRecord: Partial<SolicitudPPSFields> = {
              [FIELD_LEGAJO_PPS]: [studentId],
              [FIELD_SOLICITUD_LEGAJO_ALUMNO]: studentDetails?.[FIELD_LEGAJO_ESTUDIANTES],
              [FIELD_SOLICITUD_NOMBRE_ALUMNO]: studentDetails?.[FIELD_NOMBRE_ESTUDIANTES],
              [FIELD_SOLICITUD_EMAIL_ALUMNO]: studentDetails?.[FIELD_CORREO_ESTUDIANTES],
              
              [FIELD_EMPRESA_PPS_SOLICITUD]: formData.nombreInstitucion,
              [FIELD_SOLICITUD_LOCALIDAD]: formData.localidad,
              [FIELD_SOLICITUD_DIRECCION]: formData.direccion,
              [FIELD_SOLICITUD_EMAIL_INSTITUCION]: formData.emailInstitucion,
              [FIELD_SOLICITUD_TELEFONO_INSTITUCION]: formData.telefonoInstitucion,
              [FIELD_SOLICITUD_REFERENTE]: formData.referente,
              [FIELD_SOLICITUD_TIENE_CONVENIO]: formData.tieneConvenio,
              [FIELD_SOLICITUD_TIENE_TUTOR]: formData.tieneTutor,
              [FIELD_SOLICITUD_CONTACTO_TUTOR]: formData.contactoTutor,
              [FIELD_SOLICITUD_TIPO_PRACTICA]: formData.tipoPractica,
              [FIELD_SOLICITUD_DESCRIPCION]: formData.descripcion,
              
              [FIELD_ESTADO_PPS]: 'Pendiente',
              [FIELD_ULTIMA_ACTUALIZACION_PPS]: new Date().toISOString().split('T')[0]
          };

          await db.solicitudes.create(newRecord as any);
      },
      onSuccess: () => {
          showModal('Solicitud Enviada', 'Tu solicitud de PPS ha sido registrada. Te notificaremos cuando haya novedades.');
          queryClient.invalidateQueries({ queryKey: ['solicitudes'] }); // Refresh list
      },
      onError: (err: any) => {
          showModal('Error', `Hubo un problema al enviar la solicitud: ${err.message}`);
      }
  });

  const handleCreateSolicitud = useCallback(() => {
      openSolicitudPPSModal(async (data) => {
          await createSolicitudMutation.mutateAsync(data);
      });
  }, [openSolicitudPPSModal, createSolicitudMutation]);
  
  // Tab Contents
  const homeContent = useMemo(() => <HomeView 
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
  />, [enrollmentMap, allLanzamientos, informeTasks, lanzamientos, studentDetails, enrollStudent.mutate, institutionAddressMap, completedLanzamientoIds, criterios, handleOpenFinalization]);
  
  const informesContent = useMemo(() => <InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} />, [informeTasks, confirmInforme]);
  const solicitudesContent = useMemo(() => <SolicitudesList solicitudes={solicitudes} onCreateSolicitud={handleCreateSolicitud} onRequestFinalization={handleOpenFinalization} />, [solicitudes, handleCreateSolicitud, handleOpenFinalization]);
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
            <Card className="border-slate-300/50 bg-slate-50/30 dark:bg-slate-800/30 dark:border-slate-700">
              <EmptyState icon="search_off" title="Sin Resultados" message="No se encontró información de prácticas o solicitudes para este estudiante." action={<button onClick={refetchAll} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-105">Actualizar Datos</button>} />
            </Card>
          </div>
        </div>
        {showExportButton && (
            <>
             <WhatsAppExportButton practicas={practicas} criterios={criterios} selectedOrientacion={selectedOrientacion} studentNameForPanel={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
             <button onClick={() => window.print()} className="fixed bottom-6 right-24 z-50 w-14 h-14 bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-400" aria-label="Imprimir reporte">
                <span className="material-icons !text-2xl">print</span>
             </button>
            </>
        )}
        {isFinalizationModalOpen && (
            <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-800 rounded-2xl shadow-2xl">
                <button 
                    onClick={() => setIsFinalizationModalOpen(false)}
                    className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-slate-700/80 rounded-full hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-50 dark:text-slate-300 transition-colors shadow-sm backdrop-blur-sm"
                >
                    <span className="material-icons">close</span>
                </button>
                <FinalizacionForm studentAirtableId={getStudentId()} />
            </div>
            </div>
        )}
      </>
    );
  }
  
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
              <FinalizacionForm studentAirtableId={getStudentId()} />
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
        
        {hasData ? (
          <Card>
            <Tabs
              tabs={studentDataTabs}
              activeTabId={currentActiveTab}
              onTabChange={(id) => setCurrentActiveTab(id as TabId)}
            />
          </Card>
        ) : (
           // Should technically fall into empty state above, but double check here
           <div className="space-y-8">
                <Card icon="list_alt" title="Comenzar">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
                         <button 
                            onClick={handleCreateSolicitud}
                            className="p-6 rounded-xl border border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition-all flex flex-col items-center text-center group"
                         >
                             <span className="material-icons !text-4xl text-slate-400 group-hover:text-blue-600 mb-3">add_business</span>
                             <h4 className="font-bold text-slate-700 group-hover:text-blue-700">Solicitar Nueva PPS</h4>
                             <p className="text-sm text-slate-500 mt-1">Autogestión de práctica</p>
                         </button>
                         <button 
                            onClick={handleOpenFinalization}
                            className="p-6 rounded-xl border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 transition-all flex flex-col items-center text-center group"
                         >
                             <span className="material-icons !text-4xl text-slate-400 group-hover:text-emerald-600 mb-3">school</span>
                             <h4 className="font-bold text-slate-700 group-hover:text-emerald-700">Solicitar Acreditación</h4>
                             <p className="text-sm text-slate-500 mt-1">Finalización de carrera</p>
                         </button>
                   </div>
                </Card>
           </div>
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
