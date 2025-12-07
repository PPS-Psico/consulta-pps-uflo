
import React, { useState, useMemo } from 'react';
import SolicitudCard from './SolicitudCard';
import EmptyState from './EmptyState';
import ConfirmModal from './ConfirmModal';
import type { SolicitudPPS, CriteriosCalculados, FinalizacionPPS } from '../types';
import FinalizationStatusCard from './FinalizationStatusCard';
import { FIELD_ESTADO_FINALIZACION, FIELD_FECHA_SOLICITUD_FINALIZACION, FIELD_ESTADO_PPS } from '../constants';
import { normalizeStringForComparison } from '../utils/formatters';

interface SolicitudesListProps {
  solicitudes: SolicitudPPS[];
  onCreateSolicitud?: () => void;
  onRequestFinalization?: () => void;
  criterios?: CriteriosCalculados;
  finalizacionRequest?: FinalizacionPPS | null;
}

const ActionButton: React.FC<{
    icon: string;
    title: string;
    description: string;
    onClick?: () => void;
    colorScheme: 'blue' | 'teal' | 'slate'; 
}> = ({ icon, title, description, onClick, colorScheme }) => {
    
    const colors = {
        blue: {
            container: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-blue-500/10',
            iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
            title: 'text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400',
            desc: 'text-slate-500 dark:text-slate-400'
        },
        teal: {
             container: 'bg-gradient-to-br from-teal-50 to-white dark:from-teal-900/20 dark:to-slate-900 border-teal-200 dark:border-teal-800 hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-teal-500/20',
             iconBg: 'bg-teal-100 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400',
             title: 'text-teal-900 dark:text-teal-100 group-hover:text-teal-700 dark:group-hover:text-teal-300',
             desc: 'text-teal-700/70 dark:text-teal-300/70'
        },
        slate: {
             container: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500',
             iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
             title: 'text-slate-800 dark:text-slate-100 group-hover:text-slate-700 dark:group-hover:text-slate-300',
             desc: 'text-slate-500 dark:text-slate-400'
        }
    };

    const theme = colors[colorScheme];

    return (
        <button 
            type="button"
            onClick={onClick}
            className={`flex-1 border rounded-2xl p-5 flex items-center gap-5 hover:shadow-lg transition-all duration-300 group text-left w-full hover:-translate-y-0.5 ${theme.container}`}
        >
            <div className={`flex-shrink-0 p-3 rounded-xl transition-colors duration-300 group-hover:scale-110 ${theme.iconBg}`}>
                <span className="material-icons !text-3xl">{icon}</span>
            </div>
            <div>
                <h4 className={`font-bold text-base transition-colors ${theme.title}`}>
                    {title}
                </h4>
                <p className={`text-sm mt-1 leading-snug ${theme.desc}`}>
                    {description}
                </p>
            </div>
        </button>
    );
};

const SolicitudesList: React.FC<SolicitudesListProps> = ({ 
    solicitudes, 
    onCreateSolicitud, 
    onRequestFinalization,
    criterios,
    finalizacionRequest
}) => {
  const [showModal, setShowModal] = useState(false);
  const [capturedState, setCapturedState] = useState<'ready' | 'incomplete'>('incomplete');
  
  const isAccreditationReady = criterios 
    ? criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion
    : false;

  // Lógica de Agrupación
  const { activeRequests, historyRequests } = useMemo(() => {
      const active: SolicitudPPS[] = [];
      const history: SolicitudPPS[] = [];
      
      const finishedStatuses = ['finalizada', 'cancelada', 'rechazada', 'no se pudo concretar', 'pps realizada', 'solicitud invalida', 'realizada'];
      const hiddenStatuses = ['archivado'];

      solicitudes.forEach(sol => {
          const status = normalizeStringForComparison(sol[FIELD_ESTADO_PPS]);
          
          // Force hide "Archivado" for students
          if (hiddenStatuses.includes(status)) return;
          
          if (finishedStatuses.some(s => status.includes(s))) {
              history.push(sol);
          } else {
              active.push(sol);
          }
      });
      
      return { activeRequests: active, historyRequests: history };
  }, [solicitudes]);


  const handleAccreditationClick = () => {
    if (!onRequestFinalization) return;
    setCapturedState(isAccreditationReady ? 'ready' : 'incomplete');
    setShowModal(true);
  };

  const handleConfirm = () => {
      if (onRequestFinalization) onRequestFinalization();
      setShowModal(false);
  };

  return (
    <div className="space-y-8">
        
        {/* Tarjeta de Estado de Finalización (si existe trámite activo) */}
        {finalizacionRequest && (
            <FinalizationStatusCard 
                status={finalizacionRequest[FIELD_ESTADO_FINALIZACION] || 'Pendiente'} 
                requestDate={finalizacionRequest[FIELD_FECHA_SOLICITUD_FINALIZACION] || finalizacionRequest.createdTime || ''} 
            />
        )}

        {/* Action Buttons Area */}
        {(onCreateSolicitud || onRequestFinalization) && !finalizacionRequest && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {onCreateSolicitud && (
                    <ActionButton 
                        icon="add_business" 
                        title="Solicitar Nueva PPS" 
                        description="Inicia un trámite de autogestión."
                        onClick={onCreateSolicitud}
                        colorScheme="blue"
                    />
                )}
                {onRequestFinalization && (
                    <div className="hidden md:block">
                        <ActionButton 
                            icon={isAccreditationReady ? "verified" : "lock_clock"}
                            title="Solicitar Acreditación"
                            description={isAccreditationReady ? "¡Objetivos cumplidos! Iniciar cierre." : "Verificar estado y requisitos."}
                            onClick={handleAccreditationClick}
                            colorScheme={isAccreditationReady ? "teal" : "slate"}
                        />
                    </div>
                )}
            </div>
        )}

        <ConfirmModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleConfirm}
            type={capturedState === 'ready' ? 'info' : 'warning'}
            title={capturedState === 'ready' ? "Iniciar Trámite de Acreditación" : "Requisitos Incompletos"}
            message={
                capturedState === 'ready' ? (
                    <>
                        <p className="mb-3">¡Felicitaciones! Has cumplido con todos los objetivos académicos. Antes de continuar, asegúrate de tener listos los siguientes documentos digitales:</p>
                        <ul className="list-disc pl-5 mb-4 space-y-2 text-sm text-left bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800/50 text-slate-700 dark:text-slate-300">
                            <li><strong>Planilla de Seguimiento completa</strong></li>
                            <li><strong>Planillas de asistencias</strong></li>
                            <li><strong>Todos los informes finales Aprobados</strong></li>
                        </ul>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                             <span className="material-icons !text-sm mt-0.5">info</span>
                             <p>El proceso administrativo de revisión y acreditación puede demorar hasta <strong>14 días hábiles</strong> desde el envío de la solicitud.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="mb-2 text-slate-700 dark:text-slate-300">Según el sistema, aún no cumples todos los requisitos obligatorios:</p>
                        <ul className="list-disc pl-5 mb-4 space-y-1 text-sm text-left text-slate-600 dark:text-slate-400">
                            <li><strong>250 Horas Totales</strong></li>
                            <li><strong>70 Horas en tu Especialidad</strong></li>
                            <li><strong>Rotación por 3 áreas distintas</strong></li>
                        </ul>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Si crees que es un error y posees la documentación respaldatoria, puedes continuar bajo tu responsabilidad.</p>
                    </>
                )
            }
            confirmText={capturedState === 'ready' ? "Comenzar" : "Continuar de todos modos"}
            cancelText="Volver"
        />

        {/* --- SECCIÓN 1: SOLICITUDES ACTIVAS --- */}
        {activeRequests.length > 0 && (
            <div className="space-y-4 animate-fade-in-up">
                 <div className="flex items-center gap-3 px-1 pb-1">
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Gestiones en Curso
                    </span>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow"></div>
                </div>
                {activeRequests.map((solicitud) => (
                    <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
            </div>
        )}

        {/* --- SECCIÓN 2: HISTORIAL (Colapsable) --- */}
        {historyRequests.length > 0 && (
            <div className="pt-4">
                <details className="group">
                    <summary className="flex items-center gap-2 cursor-pointer list-none text-sm font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 w-fit">
                        <span className="material-icons transition-transform group-open:rotate-90 text-slate-400">chevron_right</span>
                        Ver Historial y Finalizadas ({historyRequests.length})
                    </summary>
                    <div className="mt-4 space-y-4 pl-2 border-l-2 border-slate-200 dark:border-slate-700 ml-3.5">
                        {historyRequests.map((solicitud) => (
                            <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                        ))}
                    </div>
                </details>
            </div>
        )}

        {/* Empty State General */}
        {activeRequests.length === 0 && historyRequests.length === 0 && !finalizacionRequest && (
            <div className="mt-6">
                <EmptyState 
                    icon="list_alt"
                    title="No Hay Solicitudes Activas"
                    message="Utiliza los botones superiores para iniciar una nueva solicitud o trámite."
                    className="border-none shadow-none bg-transparent dark:bg-transparent"
                />
            </div>
        )}
    </div>
  );
};

export default React.memo(SolicitudesList);
