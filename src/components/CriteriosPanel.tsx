
import React, { useMemo, useState } from 'react';
import { HORAS_OBJETIVO_TOTAL } from '../constants';
import ProgressBar from './ProgressBar';
import RotationTracker from './RotationTracker';
import ProgressCircle from './ProgressCircle';
import OrientacionSelector from './OrientacionSelector';
import ConfirmModal from './ConfirmModal';
import type { CriteriosCalculados, Orientacion } from '../types';

// Componente mejorado para el botón de certificación
const CertificationButton: React.FC<{ onClick: () => void; isReady: boolean; compact?: boolean }> = ({ onClick, isReady, compact }) => {
  const [showModal, setShowModal] = useState(false);
  const [capturedState, setCapturedState] = useState<'ready' | 'pending'>('pending');

  const handleClick = () => {
    setCapturedState(isReady ? 'ready' : 'pending');
    setShowModal(true);
  };

  const handleConfirm = () => {
      onClick();
      setShowModal(false);
  };

  const btnClasses = compact
    ? `w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold transition-all shadow-sm mt-5 active:scale-95 ${isReady ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-teal-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'}`
    : `group relative overflow-hidden inline-flex items-center gap-3 py-3 px-6 rounded-xl transition-all duration-300 focus:outline-none focus:ring-4 shadow-lg hover:-translate-y-1 active:transform active:scale-95 cursor-pointer ${isReady ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold shadow-teal-200 dark:shadow-none focus:ring-teal-300 dark:focus:ring-teal-800 hover:shadow-xl hover:shadow-teal-500/30 dark:hover:shadow-teal-400/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold focus:ring-slate-300 dark:focus:ring-slate-600 hover:bg-slate-300 dark:hover:bg-slate-600'}`;

  return (
    <>
        <button onClick={handleClick} type="button" className={btnClasses} aria-label="Solicitar acreditación final">
             {compact ? (
                 <>
                    <span className="material-icons !text-lg">{isReady ? 'verified' : 'lock'}</span>
                    <span>{isReady ? 'Solicitar Acreditación' : 'Requisitos Pendientes'}</span>
                 </>
             ) : (
                 <>
                    <span className={`material-icons !text-lg transition-transform duration-300 relative z-10 ${isReady ? 'group-hover:rotate-12 group-hover:scale-110' : ''}`}>
                        {isReady ? 'school' : 'lock_clock'}
                    </span>
                    <span className="relative z-10 tracking-wide drop-shadow-sm">Solicitar Acreditación</span>
                    {isReady && <span className="material-icons !text-sm opacity-80 transition-transform duration-300 relative z-10 group-hover:translate-x-0.5">arrow_forward</span>}
                 </>
             )}
        </button>

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
                        <ul className="list-disc pl-5 mb-4 space-y-2 text-sm text-left bg-teal-50 dark:bg-teal-900/20 p-3 rounded-lg border border-teal-100 dark:border-teal-800/50">
                            <li><strong>Planilla de Seguimiento de Horas</strong> (firmada)</li>
                            <li><strong>Planilla de Asistencia</strong></li>
                            <li><strong>Informe Final</strong> de la práctica</li>
                        </ul>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                             <span className="material-icons !text-sm mt-0.5">info</span>
                             <p>El proceso administrativo de revisión y acreditación puede demorar hasta <strong>14 días hábiles</strong> desde el envío de la solicitud.</p>
                        </div>
                    </>
                ) : (
                    <>
                        <p className="mb-2">Según el sistema, aún no cumples todos los requisitos obligatorios:</p>
                        <ul className="list-disc pl-5 mb-4 space-y-1 text-sm text-left">
                            <li><strong>250 Horas Totales</strong></li>
                            <li><strong>70 Horas en tu Especialidad</strong></li>
                            <li><strong>Rotación por 3 áreas distintas</strong></li>
                        </ul>
                        <p className="text-sm">Si crees que es un error (ej: tienes horas antiguas no digitalizadas) y posees la documentación respaldatoria, puedes continuar bajo tu responsabilidad.</p>
                    </>
                )
            }
            confirmText={capturedState === 'ready' ? "Comenzar" : "Continuar de todos modos"}
            cancelText="Volver"
        />
    </>
  );
};

interface CriteriosPanelProps {
  criterios: CriteriosCalculados;
  selectedOrientacion: Orientacion | "";
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
  onRequestFinalization: () => void;
}

const CriteriosPanel: React.FC<CriteriosPanelProps> = ({ criterios, selectedOrientacion, handleOrientacionChange, showSaveConfirmation, onRequestFinalization }) => {
  const todosLosCriteriosCumplidos = useMemo(() => 
    criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion,
    [criterios]
  );

  return (
    <section className="animate-fade-in-up">
      {/* Container Base Styles - Shared */}
      <div 
        className={`relative bg-gradient-to-br from-white to-slate-50/80 dark:from-gray-900/90 dark:to-black/90 backdrop-blur-xl p-0 sm:p-8 rounded-[2rem] transition-all duration-700 overflow-hidden ${
          todosLosCriteriosCumplidos 
            ? 'border border-teal-400/50 dark:border-teal-500/30 shadow-lg shadow-teal-500/5' 
            : 'border border-slate-200 dark:border-slate-800 shadow-sm'
        }`}
      >
        {/* Background Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary-100/40 to-transparent dark:from-primary-900/10 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-secondary-100/40 to-transparent dark:from-secondary-900/10 rounded-full blur-3xl -z-10" />
        {todosLosCriteriosCumplidos && (
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(8)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-1.5 h-1.5 bg-gradient-to-r from-teal-400 to-cyan-400 rounded-full animate-particle-fade"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${i * 0.5}s`,
                    animationDuration: `${3 + Math.random() * 2}s`
                  }}
                />
              ))}
            </div>
        )}

        {/* --- DESKTOP LAYOUT (Hidden on Mobile) --- */}
        <div className="hidden md:grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8 z-10">
              <ProgressCircle 
                value={criterios.horasTotales} 
                max={HORAS_OBJETIVO_TOTAL}
              />
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-3 mb-4 justify-center sm:justify-start">
                  <h3 className="text-3xl font-extrabold text-gray-900 dark:text-gray-50 tracking-tight">
                    Horas Totales
                  </h3>
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-lg leading-relaxed font-medium mb-4">
                  Has completado {todosLosCriteriosCumplidos ? 'exitosamente' : 'un total de'} <strong className="font-black text-primary-600 dark:text-primary-400 text-xl">{Math.round(criterios.horasTotales)}</strong> de <strong className="font-black text-gray-800 dark:text-gray-100 text-xl">{HORAS_OBJETIVO_TOTAL}</strong> horas requeridas.
                </p>
                {todosLosCriteriosCumplidos && (
                    <div className="mt-6">
                      <CertificationButton onClick={onRequestFinalization} isReady={todosLosCriteriosCumplidos} />
                    </div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-6 border-t-2 lg:border-t-0 lg:border-l-2 border-gray-200/60 dark:border-white/10 pt-8 lg:pt-0 lg:pl-8 z-10">
              <RotationTracker
                count={criterios.orientacionesCursadasCount}
                orientacionesUnicas={criterios.orientacionesUnicas}
              />
              {selectedOrientacion ? (
                <ProgressBar
                  label={`Horas en ${selectedOrientacion}`}
                  value={criterios.horasOrientacionElegida}
                  max={criterios.horasFaltantesOrientacion + criterios.horasOrientacionElegida}
                  unit="hs"
                  isComplete={criterios.cumpleHorasOrientacion}
                />
              ) : (
                <OrientacionSelector
                  selectedOrientacion={selectedOrientacion}
                  onOrientacionChange={handleOrientacionChange}
                  showSaveConfirmation={showSaveConfirmation}
                />
              )}
            </div>
        </div>

        {/* --- MOBILE LAYOUT (Data Widget) --- */}
        <div className="md:hidden p-6">
            <div className="flex items-stretch">
                {/* Izquierda: Protagonista (Número Gigante) */}
                {/* Usamos w-2/5 para darle un poco menos de la mitad, asegurando que el numero respire */}
                <div className="w-[38%] flex flex-col items-center justify-center border-r border-slate-200 dark:border-slate-800 pr-2">
                     <span className={`text-6xl xs:text-7xl font-black tracking-tighter leading-none ${todosLosCriteriosCumplidos ? 'text-transparent bg-clip-text bg-gradient-to-br from-teal-500 to-cyan-600' : 'text-slate-900 dark:text-white'}`}>
                         {Math.round(criterios.horasTotales)}
                     </span>
                     <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest mt-2 text-center leading-tight">
                         Horas<br/>Totales
                     </span>
                </div>

                {/* Derecha: Detalles Compactos */}
                <div className="flex-1 pl-5 flex flex-col justify-center gap-5 min-w-0 py-1">
                    {/* Rotación */}
                     <div className="relative">
                         <RotationTracker
                            count={criterios.orientacionesCursadasCount}
                            orientacionesUnicas={criterios.orientacionesUnicas}
                            compact
                          />
                     </div>
                    
                    {/* Especialidad */}
                    <div className="relative">
                        {selectedOrientacion ? (
                            <ProgressBar
                              label={`${selectedOrientacion}`}
                              value={criterios.horasOrientacionElegida}
                              max={criterios.horasFaltantesOrientacion + criterios.horasOrientacionElegida}
                              unit="hs"
                              isComplete={criterios.cumpleHorasOrientacion}
                              compact
                            />
                        ) : (
                            <button 
                                onClick={() => {
                                     // Scroll to config or similar (placeholder interaction)
                                     const selector = document.getElementById('orientacion-selector-mobile');
                                     if(selector) selector.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                }}
                                className="w-full text-left group"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Especialidad</span>
                                    <span className="text-[10px] font-bold text-blue-500 flex items-center gap-1">
                                        Configurar <span className="material-icons !text-xs">arrow_forward</span>
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="w-0 h-full bg-slate-300"></div>
                                </div>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Botón Full Width si está listo, o selector si falta especialidad */}
            {(!selectedOrientacion) && (
                <div id="orientacion-selector-mobile" className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                     <OrientacionSelector
                        selectedOrientacion={selectedOrientacion}
                        onOrientacionChange={handleOrientacionChange}
                        showSaveConfirmation={showSaveConfirmation}
                    />
                </div>
            )}
            
            {/* NOTA: Se ha ocultado el botón de 'Solicitar Acreditación' en móviles porque requiere PC */}
        </div>

      </div>
    </section>
  );
};

export default React.memo(CriteriosPanel);
