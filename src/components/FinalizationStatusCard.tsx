
import React from 'react';
import { addBusinessDays } from '../utils/formatters';

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
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 shadow-xl text-white animate-fade-in-up mb-6">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
                 <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white shadow-sm">
                            <span className="material-icons !text-3xl">verified</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black tracking-tight">¡Acreditación Completada!</h2>
                            <p className="text-emerald-50 font-medium text-sm mt-1 max-w-md leading-relaxed opacity-90">
                                Tus horas ya han sido cargadas en el sistema académico (SAC). El trámite ha finalizado exitosamente.
                            </p>
                        </div>
                    </div>
                    <a 
                        href="https://autogestion.uflo.edu.ar/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-white text-emerald-700 font-bold rounded-xl shadow-lg hover:bg-emerald-50 hover:scale-105 transition-all flex items-center gap-2 text-sm whitespace-nowrap"
                    >
                        Ir al SAC <span className="material-icons !text-sm">open_in_new</span>
                    </a>
                </div>
            </div>
        );
    }

    // Pending Calculation
    const totalTime = targetDate.getTime() - startDate.getTime();
    const elapsedTime = now.getTime() - startDate.getTime();
    // Evitar porcentajes negativos o mayores a 100 visualmente (aunque 100+ significa demorado)
    let percentage = 0;
    if (totalTime > 0) {
        percentage = Math.min(100, Math.max(0, (elapsedTime / totalTime) * 100));
    }
    
    const daysLeft = Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-200 dark:border-blue-800/50 p-6 shadow-lg shadow-blue-500/5 animate-fade-in-up mb-6">
            <div className="flex items-start gap-4">
                 <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
                     <span className="material-icons !text-2xl animate-[spin_4s_linear_infinite]">settings_suggest</span>
                 </div>
                 <div className="flex-grow">
                     <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Acreditación en Trámite</h3>
                     <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                         Tu solicitud ha sido recibida y está siendo procesada por el equipo administrativo.
                     </p>
                     
                     <div className="mt-5">
                         <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                             <span>Proceso administrativo</span>
                             <span className={daysLeft < 0 ? "text-rose-500" : "text-blue-600"}>
                                 {daysLeft > 0 ? `${daysLeft} días hábiles restantes` : 'Finalizando...'}
                             </span>
                         </div>
                         <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden shadow-inner">
                             <div 
                                 className={`h-3 rounded-full transition-all duration-1000 ease-out relative ${daysLeft < 0 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`}
                                 style={{ width: `${percentage}%` }}
                             >
                                 <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]"></div>
                             </div>
                         </div>
                         <div className="flex justify-between items-center mt-2">
                             <p className="text-xs text-slate-400 italic">
                                 Solicitado el {new Date(requestDate).toLocaleDateString()}
                             </p>
                             {daysLeft < 0 && (
                                 <span className="text-xs font-bold text-rose-500 flex items-center gap-1">
                                     <span className="material-icons !text-xs">warning</span> Demorado
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
