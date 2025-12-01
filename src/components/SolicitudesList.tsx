
import React, { useState } from 'react';
import SolicitudCard from './SolicitudCard';
import EmptyState from './EmptyState';
import ConfirmModal from './ConfirmModal';
import type { SolicitudPPS, CriteriosCalculados } from '../types';

interface SolicitudesListProps {
  solicitudes: SolicitudPPS[];
  onCreateSolicitud?: () => void;
  onRequestFinalization?: () => void;
  criterios?: CriteriosCalculados;
}

const ActionButton: React.FC<{
    icon: string;
    title: string;
    description: string;
    onClick?: () => void;
    // We use a colorScheme prop instead of raw class to handle dark mode variants better
    colorScheme: 'blue' | 'emerald' | 'slate'; 
}> = ({ icon, title, description, onClick, colorScheme }) => {
    
    const colors = {
        blue: {
            containerHover: 'hover:border-blue-400 dark:hover:border-blue-500/50 hover:shadow-blue-500/10',
            iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400',
            titleHover: 'group-hover:text-blue-700 dark:group-hover:text-blue-400',
        },
        emerald: {
             containerHover: 'hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-emerald-500/10',
             iconBg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
             titleHover: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-400',
        },
        slate: {
             containerHover: 'hover:border-slate-400 dark:hover:border-slate-500/50',
             iconBg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
             titleHover: 'group-hover:text-slate-700 dark:group-hover:text-slate-300',
        }
    };

    const theme = colors[colorScheme];

    return (
        <button 
            type="button"
            onClick={onClick}
            className={`flex-1 bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-5 flex items-center gap-5 hover:border-solid hover:shadow-lg transition-all duration-300 group text-left w-full hover:-translate-y-0.5 ${theme.containerHover}`}
        >
            <div className={`flex-shrink-0 p-3 rounded-xl transition-colors duration-300 group-hover:scale-110 ${theme.iconBg}`}>
                <span className="material-icons !text-3xl">{icon}</span>
            </div>
            <div>
                <h4 className={`font-bold text-slate-800 dark:text-slate-100 text-base transition-colors ${theme.titleHover}`}>
                    {title}
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-snug">
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
    criterios
}) => {
  const [showWarning, setShowWarning] = useState(false);
  
  const isAccreditationReady = criterios ? (criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion) : false;

  const handleAccreditationClick = () => {
    if (!onRequestFinalization) return;
    
    if (isAccreditationReady) {
        onRequestFinalization();
    } else {
        setShowWarning(true);
    }
  };

  return (
    <div className="space-y-8">
        {/* Action Buttons Area */}
        {(onCreateSolicitud || onRequestFinalization) && (
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
                    <ActionButton 
                        icon={isAccreditationReady ? "school" : "lock_clock"}
                        title="Solicitar Acreditación" 
                        description={isAccreditationReady ? "Finalización de carrera." : "Revisión de criterios."}
                        onClick={handleAccreditationClick}
                        colorScheme={isAccreditationReady ? "emerald" : "slate"}
                    />
                )}
            </div>
        )}

        <ConfirmModal
            isOpen={showWarning}
            onClose={() => setShowWarning(false)}
            onConfirm={() => onRequestFinalization && onRequestFinalization()}
            title="Requisitos de Acreditación"
            message={
                <>
                    <p className="mb-2">Este trámite está reservado para estudiantes que han cumplido con los 3 criterios obligatorios:</p>
                    <ul className="list-disc pl-5 mb-4 space-y-1 text-sm">
                        <li><strong>250 Horas Totales</strong></li>
                        <li><strong>70 Horas en su Especialidad</strong></li>
                        <li><strong>Rotación por 3 áreas</strong></li>
                    </ul>
                    <p className="font-bold text-amber-600 dark:text-amber-400 mb-2">IMPORTANTE: El plazo administrativo de resolución es de 14 días hábiles.</p>
                    <p>Según el sistema, aún no cumples estos requisitos. Si crees que es un error y tienes la documentación, puedes avanzar.</p>
                </>
            }
            confirmText="Iniciar Trámite"
            cancelText="Volver"
        />

        {/* List or Empty State */}
        {solicitudes.length === 0 ? (
            <div className="mt-6">
                <EmptyState 
                    icon="list_alt"
                    title="No Hay Solicitudes Activas"
                    message="Utiliza los botones superiores para iniciar una nueva solicitud o trámite."
                    className="border-none shadow-none bg-transparent"
                />
            </div>
        ) : (
            <div className="space-y-4">
                <div className="flex items-center gap-3 px-1 pb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Historial de Solicitudes</span>
                    <div className="h-px bg-slate-200 dark:bg-slate-700 flex-grow"></div>
                </div>
                {solicitudes.map((solicitud) => (
                    <SolicitudCard key={solicitud.id} solicitud={solicitud} />
                ))}
            </div>
        )}
    </div>
  );
};

export default React.memo(SolicitudesList);
