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
    colorClass: string;
}> = ({ icon, title, description, onClick, colorClass }) => (
    <button 
        type="button"
        onClick={onClick}
        className="flex-1 bg-white dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex items-center gap-4 hover:border-solid hover:shadow-md transition-all duration-200 group text-left w-full"
    >
        <div className={`flex-shrink-0 p-3 rounded-full bg-opacity-10 group-hover:bg-opacity-20 transition-colors ${colorClass}`}>
            <span className={`material-icons !text-2xl ${colorClass.replace('bg-', 'text-')}`}>{icon}</span>
        </div>
        <div>
            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {description}
            </p>
        </div>
    </button>
);

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
    <div className="space-y-6">
        {/* Action Buttons Area */}
        {(onCreateSolicitud || onRequestFinalization) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {onCreateSolicitud && (
                    <ActionButton 
                        icon="add_business" 
                        title="Solicitar Nueva PPS" 
                        description="Propuesta de autogestión."
                        onClick={onCreateSolicitud}
                        colorClass="bg-blue-500 text-blue-600"
                    />
                )}
                {onRequestFinalization && (
                    <ActionButton 
                        icon={isAccreditationReady ? "school" : "lock_clock"}
                        title="Solicitar Acreditación" 
                        description={isAccreditationReady ? "Finalización de carrera." : "Revisión de criterios."}
                        onClick={handleAccreditationClick}
                        colorClass={isAccreditationReady ? "bg-emerald-500 text-emerald-600" : "bg-slate-400 text-slate-500"}
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
            <div className="mt-4">
                <EmptyState 
                    icon="list_alt"
                    title="No Hay Solicitudes Activas"
                    message="Utiliza los botones superiores para iniciar una nueva solicitud o trámite."
                    className="border-none shadow-none bg-transparent"
                />
            </div>
        ) : (
            <div className="space-y-3">
                <div className="flex items-center gap-2 mb-2 px-1">
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