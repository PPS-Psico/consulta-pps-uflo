
import React from 'react';
import { addBusinessDays, getBusinessDaysDiff, normalizeStringForComparison, formatDate } from '../utils/formatters';

interface FinalizationStatusCardProps {
    status: string;
    requestDate: string;
    studentName?: string;
}

const FinalizationStatusCard: React.FC<FinalizationStatusCardProps> = ({ status, requestDate, studentName }) => {
    const startDate = new Date(requestDate);
    const targetDate = addBusinessDays(startDate, 14);
    const now = new Date();
    
    const normalizedStatus = normalizeStringForComparison(status);
    const isFinished = normalizedStatus === 'cargado' || normalizedStatus === 'finalizada';
    const isEnProceso = normalizedStatus === 'en proceso';
    
    // Cálculos de progreso
    let daysDisplay = getBusinessDaysDiff(now, targetDate);
    const totalBusinessDays = 14;
    const daysPassed = totalBusinessDays - Math.max(0, daysDisplay);
    
    // Porcentaje de barra
    let percentage = Math.min(100, Math.max(5, (daysPassed / totalBusinessDays) * 100)); 
    if (isEnProceso && percentage < 50) percentage = 50;
    if (daysDisplay < 0) percentage = 100;
    
    const firstName = studentName?.split(' ')[0] || 'Estudiante';
    const isOverdue = daysDisplay < 0;

    // --- VISTA DE ÉXITO (YA CARGADO) ---
    if (isFinished) {
        return (
            <div className="max-w-4xl mx-auto mt-8 animate-fade-in-up">
                <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-900 dark:to-teal-900 p-10 sm:p-14 shadow-2xl text-white text-center border border-emerald-400/30 dark:border-emerald-700/50">
                    <div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-white/10 blur-3xl pointer-events-none"></div>
                    <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-emerald-300/20 blur-3xl pointer-events-none"></div>
                    
                    <div className="relative z-10 flex flex-col items-center gap-8">
                        <div className="h-24 w-24 bg-white dark:bg-emerald-950 rounded-full flex items-center justify-center shadow-lg animate-bounce-slow text-emerald-600 dark:text-emerald-400 ring-8 ring-white/20">
                            <span className="material-icons !text-5xl">verified</span>
                        </div>
                        
                        <div className="space-y-4 max-w-2xl">
                            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-sm">
                                ¡Felicitaciones, {firstName}!
                            </h1>
                            <p className="text-lg sm:text-xl text-emerald-50 font-medium leading-relaxed opacity-95">
                                Tu acreditación ha sido completada exitosamente. <br/>
                                Tus horas de Práctica Profesional Supervisada ya se encuentran cargadas en el sistema académico.
                            </p>
                        </div>

                        <div className="mt-4">
                            <a 
                                href="https://alumno.uflo.edu.ar" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="group inline-flex items-center gap-3 px-8 py-4 bg-white dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold rounded-2xl shadow-xl hover:bg-emerald-50 dark:hover:bg-emerald-900 hover:scale-105 transition-all duration-300"
                            >
                                <span>Verificar en Autogestión</span>
                                <span className="material-icons !text-xl group-hover:translate-x-1 transition-transform">open_in_new</span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // --- CONFIGURACIÓN DE CONTENIDO SEGÚN ESTADO ---
    let bannerTitle = "¡Solicitud Recibida!";
    let bannerText = "Felicitaciones por finalizar tu recorrido de prácticas. Estamos evaluando tu solicitud y validando la documentación presentada.";
    let bannerStatus = "Solicitud Enviada";
    let bannerColorClass = "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800";
    
    let step1State: 'active' | 'completed' = 'active';
    let step2State: 'pending' | 'active' = 'pending';

    if (isEnProceso) {
        bannerTitle = `Todo marcha bien, ${firstName}.`;
        bannerText = "Tus documentos fueron validados correctamente y el expediente se encuentra en proceso de acreditación interna.";
        bannerStatus = "En Proceso";
        bannerColorClass = "text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800";
        step1State = 'completed';
        step2State = 'active';
    }

    return (
        <div className="max-w-7xl mx-auto mt-6 animate-fade-in-up pb-12 space-y-8">
            
            {/* BANNER SUPERIOR */}
            <div className="relative overflow-hidden bg-white dark:bg-[#0F172A] rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl p-8 sm:p-10">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-bl from-blue-50/50 to-transparent dark:from-blue-900/10 rounded-full blur-3xl -mr-40 -mt-40 pointer-events-none"></div>
                <div className="relative z-10">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border ${bannerColorClass}`}>
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-current"></span>
                        </span>
                        {bannerStatus}
                    </div>
                    <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white leading-tight mb-4 tracking-tight">
                        {bannerTitle}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-lg leading-relaxed max-w-3xl">
                        {bannerText}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* --- TIMELINE --- */}
                <div className="hidden lg:block lg:col-span-8 pl-2 sm:pl-0">
                    <div className="bg-white/60 dark:bg-[#0F172A]/60 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 p-8 backdrop-blur-md h-full flex flex-col justify-center shadow-sm">
                        <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-3 mb-12 text-lg uppercase tracking-wide">
                            Etapas del Proceso
                        </h3>
                        
                        <div className="relative space-y-0 pl-4 sm:pl-6">
                             <div className="absolute left-[28px] sm:left-[36px] top-6 bottom-16 w-0.5 bg-slate-200 dark:bg-slate-700/50">
                                 <div 
                                    className="absolute top-0 left-0 w-full bg-blue-500 transition-all duration-1000 ease-in-out" 
                                    style={{ height: isEnProceso ? '60%' : '20%' }}
                                 ></div>
                             </div>

                            {/* Step 1 */}
                            <div className="relative flex gap-6 pb-16 group">
                                <div className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center z-10 shadow-sm transition-all duration-500 ${step1State === 'completed' ? 'bg-emerald-500 border-emerald-100 dark:border-emerald-900/50 text-white' : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900/50 text-blue-600'}`}>
                                    <span className="material-icons !text-2xl">
                                        {step1State === 'completed' ? 'check' : 'inventory_2'}
                                    </span>
                                </div>
                                <div className="pt-2">
                                    <h4 className={`text-lg font-bold mb-2 flex items-center gap-2 ${step1State === 'completed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-900 dark:text-white'}`}>
                                        Validación Documental
                                        {step1State === 'completed' && <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Completada</span>}
                                    </h4>
                                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed max-w-lg">
                                        Revisión de planillas y firmas. Si hay algún inconveniente, te notificaremos vía email.
                                    </p>
                                </div>
                            </div>

                            {/* Step 2 */}
                            <div className="relative flex gap-6 pb-16 group">
                                <div className={`flex-shrink-0 w-14 h-14 rounded-full border-4 flex items-center justify-center z-10 shadow-sm transition-all duration-500 ${step2State === 'active' ? 'bg-white dark:bg-slate-800 border-indigo-200 dark:border-indigo-800 ring-4 ring-indigo-50 dark:ring-indigo-900/20 scale-110' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                    <span className={`material-icons !text-2xl ${step2State === 'active' ? 'text-indigo-600 dark:text-indigo-400 animate-pulse' : 'text-slate-400'}`}>admin_panel_settings</span>
                                </div>
                                <div className="pt-2">
                                    <h4 className={`text-lg font-bold mb-2 ${step2State === 'active' ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-500'}`}>
                                        Circuito Administrativo
                                        {step2State === 'active' && <span className="ml-2 text-[10px] bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">En Curso</span>}
                                    </h4>
                                    <p className={`text-sm leading-relaxed max-w-lg ${step2State === 'active' ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400 dark:text-slate-600'}`}>
                                        Una vez validada, entran en juego varios sectores de la universidad para la carga y acreditación de tus PPS.
                                    </p>
                                </div>
                            </div>

                            {/* Step 3 */}
                            <div className="relative flex gap-6 group">
                                <div className="flex-shrink-0 w-14 h-14 rounded-full bg-slate-50 dark:bg-slate-900 border-4 border-slate-200 dark:border-slate-800 flex items-center justify-center z-10 shadow-sm">
                                    <span className="material-icons !text-2xl text-slate-300 dark:text-slate-600">flag</span>
                                </div>
                                <div className="pt-2">
                                    <h4 className="text-lg font-bold text-slate-400 dark:text-slate-600 mb-1">Finalización</h4>
                                    <p className="text-slate-400 dark:text-slate-600 text-sm italic">
                                        Carga definitiva en el sistema SAC.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- SIDEBAR --- */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                    
                    {/* CARD ESTIMACIÓN REDISEÑADA */}
                    <div className="bg-white dark:bg-[#0F172A] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-lg overflow-hidden relative group">
                        {/* Status Stripe */}
                        <div className={`h-1.5 w-full ${isOverdue ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}></div>

                        <div className="p-6 pb-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-base uppercase tracking-wider">Tiempo Estimado</h3>
                                <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-full text-slate-400 dark:text-slate-500">
                                     <span className="material-icons !text-xl">timer</span>
                                </div>
                            </div>
                            
                            {/* Big Number Display */}
                            <div className="flex flex-col items-center justify-center mb-8">
                                <span className={`text-7xl font-black tracking-tighter leading-none ${isOverdue ? "text-rose-500 dark:text-rose-400" : "text-slate-900 dark:text-white"}`}>
                                    {Math.max(0, daysDisplay)}
                                </span>
                                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-2">
                                    Días Hábiles Restantes
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-8 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverdue ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                                    style={{ width: `${percentage}%` }}
                                ></div>
                            </div>

                            {/* Date Grid - Symmetrical & Clean */}
                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <div className="flex flex-col items-center border-r border-slate-100 dark:border-slate-800">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Solicitado</span>
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">
                                        {formatDate(startDate.toISOString())}
                                    </span>
                                </div>
                                <div className="flex flex-col items-center">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Resolución Aprox.</span>
                                    <span className={`text-sm font-bold font-mono ${isOverdue ? 'text-rose-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {formatDate(targetDate.toISOString())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* CARD SOPORTE */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-white dark:from-slate-800 dark:to-slate-900 pointer-events-none"></div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-slate-600">
                                    <span className="material-icons !text-xl">support_agent</span>
                                </div>
                                <h3 className="font-bold text-slate-800 dark:text-white text-lg">¿Necesitas ayuda?</h3>
                            </div>
                            
                            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
                                Por favor, contáctanos <strong>únicamente</strong> si el plazo de 14 días hábiles se ha cumplido y aún no visualizas tus horas en el sistema.
                            </p>

                            <a 
                                href={isOverdue 
                                    ? `mailto:blas.rivera@uflouniversidad.edu.ar?subject=Consulta Acreditación - ${studentName}`
                                    : undefined
                                }
                                className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm
                                    ${isOverdue 
                                        ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md cursor-pointer hover:-translate-y-0.5' 
                                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-600 cursor-not-allowed'
                                    }`}
                                onClick={(e) => { if(!isOverdue) e.preventDefault(); }}
                            >
                                <span className="material-icons !text-lg">{isOverdue ? 'mail' : 'lock_clock'}</span>
                                {isOverdue ? 'Contactar Soporte' : 'Espera el plazo'}
                            </a>

                            {!isOverdue && (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center mt-3">
                                    Botón habilitado al finalizar el plazo estimado.
                                </p>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default FinalizationStatusCard;
