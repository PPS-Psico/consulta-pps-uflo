
import React, { useMemo, useState } from 'react';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION } from '../constants';
import ProgressCircle from './ProgressCircle';
import OrientacionSelector from './OrientacionSelector';
import ConfirmModal from './ConfirmModal';
import type { CriteriosCalculados, Orientacion } from '../types';

// Componente: Widget de Estado (Rediseñado para modo claro limpio)
const StatusWidget = ({ 
  icon, 
  label, 
  value, 
  subValue, 
  isCompleted 
}: { 
  icon: string, 
  label: string, 
  value: React.ReactNode, 
  subValue?: string, 
  isCompleted: boolean 
}) => (
  <div className={`
    relative overflow-hidden rounded-[1.5rem] p-6 flex flex-col justify-between h-full transition-all duration-500 group
    ${isCompleted 
      ? 'bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 dark:from-emerald-950/30 dark:to-emerald-900/10 dark:border-emerald-500/30 shadow-sm' 
      : 'bg-white border border-slate-200 shadow-sm hover:shadow-md dark:bg-[#1E293B] dark:border-slate-800'
    }
  `}>
    
    {/* Animated Background Blob for Completed */}
    {isCompleted && (
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-400/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
    )}

    {/* Header */}
    <div className="flex justify-between items-start z-10">
        <div className={`
            w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500
            ${isCompleted 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110' 
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }
        `}>
            <span className="material-icons !text-lg">{isCompleted ? 'check' : icon}</span>
        </div>
        {isCompleted && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800 backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">Listo</span>
            </div>
        )}
    </div>

    {/* Content */}
    <div className="mt-8 z-10">
        <h4 className="text-[11px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5">
            {label}
        </h4>
        <div className="flex items-baseline gap-1.5">
            <span className={`text-3xl font-black tracking-tight transition-colors duration-300 ${isCompleted ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                {value}
            </span>
            {subValue && (
                <span className="text-xs font-semibold text-slate-400">
                    {subValue}
                </span>
            )}
        </div>
    </div>
  </div>
);

interface CriteriosPanelProps {
  criterios: CriteriosCalculados;
  selectedOrientacion: Orientacion | "";
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
  onRequestFinalization: () => void;
}

const CriteriosPanel: React.FC<CriteriosPanelProps> = ({ 
    criterios, 
    selectedOrientacion, 
    handleOrientacionChange, 
    showSaveConfirmation, 
    onRequestFinalization 
}) => {
  const [showModal, setShowModal] = useState(false);
  
  const todosLosCriteriosCumplidos = useMemo(() => 
    criterios.cumpleHorasTotales && 
    criterios.cumpleRotacion && 
    criterios.cumpleHorasOrientacion && 
    !criterios.tienePracticasPendientes,
    [criterios]
  );

  const handleButtonClick = () => {
      if (todosLosCriteriosCumplidos) {
          onRequestFinalization();
      } else {
          setShowModal(true);
      }
  };

  const handleForceContinue = () => {
      setShowModal(false);
      onRequestFinalization();
  };

  // Dynamic Styles for the big Action Card
  const actionCardStyles = useMemo(() => {
    if (todosLosCriteriosCumplidos) {
        return {
            container: "bg-white dark:bg-slate-900 border-2 border-emerald-500/30 dark:border-emerald-500/50 shadow-xl shadow-emerald-500/10 dark:shadow-emerald-900/20 hover:border-emerald-500 hover:shadow-2xl hover:-translate-y-1",
            iconBg: "bg-emerald-500 text-white shadow-lg shadow-emerald-500/40",
            icon: "verified",
            title: "text-slate-900 dark:text-white",
            text: "text-emerald-600 dark:text-emerald-400 font-bold",
            glow: "block"
        };
    }
    return {
        container: "bg-white dark:bg-[#0B1120] border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-700",
        iconBg: "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-600",
        icon: "lock",
        title: "text-slate-800 dark:text-slate-200",
        text: "text-slate-500 dark:text-slate-500",
        glow: "hidden"
    };
  }, [todosLosCriteriosCumplidos]);

  return (
    <section className="animate-fade-in-up">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* --- COLUMNA IZQUIERDA: ESTADÍSTICAS PRINCIPALES --- */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* 1. MAIN PROGRESS CARD */}
            <div className="col-span-1 sm:col-span-2 relative overflow-hidden rounded-[2rem] bg-white dark:bg-[#0F172A] p-8 shadow-xl shadow-slate-200/50 dark:shadow-none ring-1 ring-slate-100 dark:ring-white/10 group transition-all duration-300">
                {/* Dynamic Background */}
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-blue-50 dark:bg-blue-600/20 rounded-full blur-[80px] transition-colors duration-700 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-64 h-64 bg-indigo-50 dark:bg-indigo-600/20 rounded-full blur-[80px] transition-colors duration-700 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                    <div className="flex-1 text-center md:text-left">
                        <h2 className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase tracking-widest mb-3 flex items-center justify-center md:justify-start gap-2">
                             <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Progreso General
                        </h2>
                        <div className="flex items-baseline justify-center md:justify-start gap-2 mb-4">
                            <span className="text-6xl md:text-7xl font-black tracking-tighter text-slate-900 dark:text-white drop-shadow-sm">
                                {Math.round(criterios.horasTotales)}
                            </span>
                            <span className="text-xl text-slate-400 font-bold">/ {HORAS_OBJETIVO_TOTAL} hs</span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-md mx-auto md:mx-0">
                            {todosLosCriteriosCumplidos 
                                ? "Has completado todos los requisitos de horas. ¡Gran trabajo!" 
                                : "Continúa sumando horas en distintas áreas para completar tu formación."}
                        </p>
                    </div>
                    
                    <div className="flex-shrink-0 transform scale-110">
                         <ProgressCircle 
                            value={criterios.horasTotales} 
                            max={HORAS_OBJETIVO_TOTAL} 
                            size={140} 
                            strokeWidth={10}
                        />
                    </div>
                </div>
            </div>

            {/* 2. SPECIALTY WIDGET */}
            <div className="col-span-1 h-full">
                {selectedOrientacion ? (
                     <StatusWidget 
                        icon="psychology"
                        label={`Especialidad: ${selectedOrientacion}`}
                        value={Math.round(criterios.horasOrientacionElegida)}
                        subValue={`/ ${HORAS_OBJETIVO_ORIENTACION}`}
                        isCompleted={criterios.cumpleHorasOrientacion}
                     />
                ) : (
                    <div className="h-full bg-white dark:bg-[#1E293B] rounded-[1.5rem] p-6 border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-col justify-center items-center text-center hover:border-blue-400 dark:hover:border-blue-500 transition-colors group cursor-pointer shadow-sm">
                        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 group-hover:text-blue-500 transition-colors">
                            <span className="material-icons !text-2xl">add</span>
                        </div>
                        <OrientacionSelector
                            selectedOrientacion={selectedOrientacion}
                            onOrientacionChange={handleOrientacionChange}
                            showSaveConfirmation={showSaveConfirmation}
                        />
                    </div>
                )}
            </div>

            {/* 3. ROTATION WIDGET */}
            <div className="col-span-1 h-full">
                <StatusWidget 
                    icon="autorenew"
                    label="Áreas Rotadas"
                    value={criterios.orientacionesCursadasCount}
                    subValue="/ 3"
                    isCompleted={criterios.cumpleRotacion}
                />
            </div>
        </div>

        {/* --- COLUMNA DERECHA: ACCIÓN FINAL (The Goal) --- */}
        <div className="md:col-span-4 flex flex-col h-full">
             <button
                onClick={handleButtonClick}
                className={`relative h-full w-full rounded-[2rem] p-8 flex flex-col items-center justify-center text-center transition-all duration-500 group overflow-hidden ${actionCardStyles.container}`}
             >
                {/* Glow Effect if Completed */}
                <div className={`absolute inset-0 bg-gradient-to-tr from-emerald-100/50 to-transparent dark:from-emerald-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ${actionCardStyles.glow}`}></div>
                
                <div className="absolute top-0 right-0 p-6">
                    {todosLosCriteriosCumplidos && (
                         <span className="flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                        </span>
                    )}
                </div>

                <div className={`mb-6 p-5 rounded-2xl transition-all duration-500 transform ${actionCardStyles.iconBg} ${todosLosCriteriosCumplidos ? 'scale-110 group-hover:rotate-12' : ''}`}>
                    <span className="material-icons !text-4xl">
                        {actionCardStyles.icon}
                    </span>
                </div>

                <h3 className={`text-xl font-bold mb-3 transition-colors ${actionCardStyles.title}`}>
                    Trámite de Acreditación
                </h3>
                
                <p className={`text-xs font-medium max-w-[220px] leading-relaxed transition-colors ${actionCardStyles.text}`}>
                    {todosLosCriteriosCumplidos 
                        ? "Has desbloqueado el trámite final. Toca para iniciar." 
                        : "Completa las métricas restantes para habilitar esta opción."}
                </p>
             </button>
        </div>
      </div>

      <ConfirmModal
            isOpen={showModal}
            onClose={() => setShowModal(false)}
            onConfirm={handleForceContinue}
            type="warning"
            title="Requisitos Pendientes"
            message={
                <div className="text-left">
                    <p className="mb-3">El sistema indica que aún te faltan requisitos para acreditar:</p>
                    <ul className="space-y-3 text-sm mt-2 mb-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                        {!criterios.cumpleHorasTotales && <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span> Completar 250 horas totales.</li>}
                        {!criterios.cumpleHorasOrientacion && <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span> Completar 70 horas de especialidad.</li>}
                        {!criterios.cumpleRotacion && <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span> Rotar por 3 áreas distintas.</li>}
                        {criterios.tienePracticasPendientes && <li className="flex items-center gap-3 text-slate-700 dark:text-slate-300"><span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0"></span> Cerrar prácticas en curso.</li>}
                    </ul>
                    <p className="text-xs text-slate-500 italic">Si consideras que esto es un error y tienes la documentación para respaldarlo, puedes iniciar el trámite igual.</p>
                </div>
            }
            confirmText="Iniciar de todas formas"
            cancelText="Entendido" 
        />

    </section>
  );
};

export default React.memo(CriteriosPanel);
