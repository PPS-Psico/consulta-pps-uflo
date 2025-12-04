
import React from 'react';
import { addBusinessDays, getBusinessDaysDiff } from '../utils/formatters';

interface FinalizationStatusCardProps {
    status: string;
    requestDate: string;
}

const FinalizationStatusCard: React.FC<FinalizationStatusCardProps> = ({ status, requestDate }) => {
    const startDate = new Date(requestDate);
    // Objetivo: 14 días hábiles
    const targetDate = addBusinessDays(startDate, 14);
    const now = new Date();
    
    const isFinished = status.toLowerCase() === 'cargado' || status.toLowerCase() === 'finalizada';
    
    if (isFinished) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 shadow-xl shadow-emerald-900/20 text-white animate-fade-in-up mb-6 border border-emerald-500/50">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
                
                 <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white shadow-sm ring-1 ring-white/30">
                            <span className="material-icons !text-3xl">verified</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight text-white">¡Acreditación Completada!</h2>
                            <p className="text-emerald-50 font-medium text-sm mt-1 max-w-md leading-relaxed opacity-95 text-shadow-sm">
                                Tus horas ya han sido cargadas en el sistema académico (SAC). El trámite ha finalizado exitosamente.
                            </p>
                        </div>
                    </div>
                    <a 
                        href="https://autogestion.uflo.edu.ar/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl shadow-lg hover:bg-emerald-50 hover:scale-105 transition-all flex items-center gap-2 text-sm whitespace-nowrap ring-2 ring-white/50"
                    >
                        Ir al SAC <span className="material-icons !text-sm">open_in_new</span>
                    </a>
                </div>
            </div>
        );
    }

    // Pending Calculation
    const totalBusinessDays = 14;
    let daysDisplay = getBusinessDaysDiff(now, targetDate);
    
    // Calculate percentage based on business days passed
    const daysPassed = totalBusinessDays - Math.max(0, daysDisplay);
    let percentage = Math.min(100, Math.max(0, (daysPassed / totalBusinessDays) * 100));

    if (daysDisplay < 0) {
        percentage = 100;
    }

    return (
        <div className="relative overflow-hidden bg-white dark:bg-slate-900 rounded-2xl border border-blue-100 dark:border-slate-700/60 p-6 shadow-lg dark:shadow-black/40 animate-fade-in-up mb-6 group">
            {/* Background Effects for Dark Mode - Enhanced */}
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/50 dark:to-blue-900/10 pointer-events-none"></div>
            
            <div className="relative z-10 flex items-start gap-5">
                 <div className="p-3.5 bg-blue-50 dark:bg-slate-800 border border-blue-100 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-2xl shadow-sm dark:shadow-inner">
                     <span className="material-icons !text-3xl animate-[spin_4s_linear_infinite]">settings_suggest</span>
                 </div>
                 
                 <div className="flex-grow min-w-0">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                            <h3 className="text-xl font-extrabold text-slate-800 dark:text-white tracking-tight">Acreditación en Trámite</h3>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                Tu solicitud está siendo procesada por el equipo administrativo.
                            </p>
                        </div>
                        <div className="hidden sm:block text-right">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                                En proceso
                            </span>
                        </div>
                     </div>
                     
                     <div className="mt-6">
                         <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                             <span>Progreso estimado</span>
                             <span className={daysDisplay < 0 ? "text-rose-500 dark:text-rose-400" : "text-blue-600 dark:text-blue-400"}>
                                 {daysDisplay > 0 ? `${daysDisplay} días hábiles restantes` : daysDisplay === 0 ? 'Vence hoy' : `Demorado ${Math.abs(daysDisplay)} días`}
                             </span>
                         </div>
                         
                         <div className="relative w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-700">
                             <div 
                                 className={`h-full rounded-full transition-all duration-1000 ease-out relative ${daysDisplay < 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-500'}`}
                                 style={{ width: `${percentage}%` }}
                             >
                                 <div className="absolute inset-0 bg-white/30 animate-[shimmer_2s_infinite]"></div>
                             </div>
                         </div>
                         
                         <div className="flex justify-between items-center mt-3">
                             <p className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                 <span className="material-icons !text-sm">calendar_today</span>
                                 Solicitado el {new Date(requestDate).toLocaleDateString()}
                             </p>
                             {daysDisplay < 0 && (
                                 <span className="text-xs font-bold text-rose-500 dark:text-rose-400 flex items-center gap-1 bg-rose-50 dark:bg-rose-900/20 px-2 py-0.5 rounded border border-rose-100 dark:border-rose-800">
                                     <span className="material-icons !text-xs">warning</span> Demora detectada
                                 </span>
                             )}
                         </div>
                     </div>
                 </div>
            </div>
        </div>
    );
};

export default FinalizationStatusCard;
