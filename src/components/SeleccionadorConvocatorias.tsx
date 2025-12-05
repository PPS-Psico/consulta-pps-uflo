
import React from 'react';
import { useSeleccionadorLogic } from '../hooks/useSeleccionadorLogic';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
} from '../constants';
import { normalizeStringForComparison, getEspecialidadClasses, formatDate } from '../utils/formatters';
import type { EnrichedStudent } from '../types';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';

const StudentRow: React.FC<{ 
    student: EnrichedStudent; 
    onToggleSelection: (student: EnrichedStudent) => void;
    onUpdateSchedule: (id: string, newSchedule: string) => void;
    isUpdating: boolean;
    isReviewMode?: boolean;
}> = ({ student, onToggleSelection, onUpdateSchedule, isUpdating, isReviewMode = false }) => {
    const [localSchedule, setLocalSchedule] = React.useState(student.horarioSeleccionado);
    const [isScheduleDirty, setIsScheduleDirty] = React.useState(false);
    const isSelected = normalizeStringForComparison(student.status) === 'seleccionado';
    
    // Lógica de texto de estado
    const statusText = student.terminoCursar ? 'Terminó de Cursar' : 
                       student.cursandoElectivas ? 'Cursando Electivas' : 
                       (student.finalesAdeuda ? `Adeuda: ${student.finalesAdeuda}` : 'Adeuda finales');

    const handleScheduleBlur = () => {
        if (isScheduleDirty && localSchedule !== student.horarioSeleccionado) {
            onUpdateSchedule(student.enrollmentId, localSchedule);
            setIsScheduleDirty(false);
        }
    };

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${isSelected ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                
                {/* 1. Score & Basic Info */}
                <div className="flex-1 min-w-[220px]">
                    <div className="flex items-center gap-3 mb-2">
                         <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold border shadow-sm ${student.puntajeTotal >= 100 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`} title="Puntaje Total">
                            {student.puntajeTotal}
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">{student.nombre}</h4>
                            <p className="text-xs text-slate-500 font-mono">{student.legajo}</p>
                        </div>
                    </div>
                    {/* Metrics Badges */}
                    <div className="flex items-center gap-2 text-xs pl-1">
                        <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" title="Horas Realizadas">
                            <span className="material-icons !text-xs">schedule</span>
                            {student.totalHoras} hs
                        </span>
                        {student.penalizacionAcumulada > 0 && (
                            <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded border border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800" title="Penalización">
                                <span className="material-icons !text-xs">gavel</span>
                                -{student.penalizacionAcumulada}
                            </span>
                        )}
                    </div>
                </div>

                {/* 2. Academic Status & Notes */}
                <div className="flex-1 text-sm space-y-1.5 border-l border-slate-100 dark:border-slate-700 pl-0 lg:pl-4 border-l-0 lg:border-l">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs uppercase font-bold tracking-wider">Estado:</span>
                        <span className={`font-semibold ${student.terminoCursar ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {statusText}
                        </span>
                    </div>
                    {student.notasEstudiante && (
                        <div className="text-xs italic text-slate-600 dark:text-slate-400 bg-yellow-50 dark:bg-yellow-900/10 p-2 rounded border border-yellow-100 dark:border-yellow-800/30 flex items-start gap-1">
                            <span className="material-icons !text-xs text-yellow-600 mt-0.5">sticky_note_2</span>
                            <span>"{student.notasEstudiante}"</span>
                        </div>
                    )}
                </div>

                {/* 3. Schedule Input */}
                <div className="flex-1 min-w-[200px]">
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Horario Asignado</label>
                    <input 
                        type="text" 
                        value={localSchedule} 
                        onChange={(e) => {setLocalSchedule(e.target.value); setIsScheduleDirty(true);}} 
                        onBlur={handleScheduleBlur} 
                        className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all" 
                        placeholder="Definir horario..." 
                    />
                </div>

                {/* 4. Action Button */}
                <button 
                    onClick={() => onToggleSelection(student)} 
                    disabled={isUpdating} 
                    className={`flex-shrink-0 py-2 px-5 rounded-lg text-sm font-bold shadow-sm transition-all active:scale-95 flex items-center gap-2 ${
                        isSelected 
                            ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-600 ring-offset-2 dark:ring-offset-slate-800' 
                            : 'bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600'
                    }`}
                >
                    {isUpdating ? (
                         <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>
                            <span className="material-icons !text-lg">{isSelected ? 'check' : 'add'}</span>
                            {isSelected ? (isReviewMode ? 'Confirmado' : 'Listo') : 'Elegir'}
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

interface SeleccionadorProps {
    isTestingMode?: boolean;
    onNavigateToInsurance?: (lanzamientoId: string) => void;
}

const SeleccionadorConvocatorias: React.FC<SeleccionadorProps> = ({ isTestingMode = false, onNavigateToInsurance }) => {
    const {
        selectedLanzamiento, setSelectedLanzamiento,
        viewMode, setViewMode,
        toastInfo, setToastInfo,
        updatingId, isClosingTable,
        openLaunches, isLoadingLaunches,
        candidates, isLoadingCandidates,
        selectedCandidates,
        handleToggle, handleUpdateSchedule, handleConfirmAndCloseTable, closeLaunchMutation
    } = useSeleccionadorLogic(isTestingMode, onNavigateToInsurance);

    if (isLoadingLaunches) return <Loader />;

    if (!selectedLanzamiento) {
        return (
            <div className="animate-fade-in-up">
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
                <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">Seleccionar Convocatoria Abierta</h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Elige una convocatoria para gestionar sus postulantes.</p>
                
                {openLaunches.length === 0 ? (
                     <EmptyState icon="event_busy" title="Sin Convocatorias Abiertas" message="No hay lanzamientos activos en este momento." />
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {openLaunches.map(lanz => {
                            const visuals = getEspecialidadClasses(lanz[FIELD_ORIENTACION_LANZAMIENTOS]);
                            return (
                                <button 
                                    key={lanz.id} 
                                    onClick={() => setSelectedLanzamiento(lanz)}
                                    className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={visuals.tag}>{lanz[FIELD_ORIENTACION_LANZAMIENTOS]}</span>
                                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                            {lanz[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} Cupos
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {lanz[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                                    </h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                                        <span className="material-icons !text-base">calendar_today</span>
                                        Inicio: {formatDate(lanz[FIELD_FECHA_INICIO_LANZAMIENTOS])}
                                    </p>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedLanzamiento(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                            <span className="material-icons">arrow_back</span>
                        </button>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Cupos: {selectedLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} | Postulantes: {candidates.length} | Seleccionados: {selectedCandidates.length}
                            </p>
                        </div>
                    </div>
                    {viewMode === 'selection' ? (
                         <div className="flex gap-2">
                            <button 
                                onClick={() => setViewMode('review')} 
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md hover:bg-blue-700 transition-colors"
                            >
                                Revisar y Cerrar
                            </button>
                         </div>
                    ) : (
                         <div className="flex gap-2">
                            <button onClick={() => setViewMode('selection')} className="text-slate-600 dark:text-slate-300 font-bold px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
                                Volver
                            </button>
                            <button 
                                onClick={handleConfirmAndCloseTable} 
                                disabled={isClosingTable} 
                                className="bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-md hover:bg-emerald-700 transition-colors disabled:opacity-70"
                            >
                                {isClosingTable ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> : <span className="material-icons !text-base">lock</span>}
                                {isClosingTable ? 'Cerrando...' : 'Confirmar Cierre'}
                            </button>
                         </div>
                    )}
                </div>

                {/* Helper Info */}
                <div className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                     <div className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-2 group relative cursor-help">
                        <span className="font-bold">Criterio:</span> Puntaje descendente
                        <span className="material-icons !text-sm opacity-70">help</span>
                        
                        {/* Tooltip con la fórmula */}
                        <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            <p className="font-bold mb-1 border-b border-slate-600 pb-1">Fórmula de Puntaje:</p>
                            <ul className="space-y-1 list-disc pl-3">
                                <li>Terminó de cursar: <strong>+100 pts</strong></li>
                                <li>Cursando electivas: <strong>+50 pts</strong></li>
                                <li>Adeuda finales: <strong>+30 pts</strong></li>
                                <li>Horas acumuladas: <strong>+0.5 pts/hora</strong></li>
                                <li>Penalizaciones: <strong>- Puntos</strong></li>
                            </ul>
                            <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 rotate-45"></div>
                        </div>
                     </div>
                </div>
            </div>

            {isLoadingCandidates ? <Loader /> : (
                <div className="space-y-3">
                    {(viewMode === 'selection' ? candidates : selectedCandidates).map(student => (
                        <StudentRow 
                            key={student.enrollmentId} 
                            student={student} 
                            onToggleSelection={handleToggle} 
                            onUpdateSchedule={handleUpdateSchedule} 
                            isUpdating={updatingId === student.enrollmentId} 
                            isReviewMode={viewMode === 'review'} 
                        />
                    ))}
                    {viewMode === 'review' && selectedCandidates.length === 0 && (
                        <EmptyState icon="group_off" title="Sin Seleccionados" message="No has seleccionado ningún estudiante para esta mesa." />
                    )}
                </div>
            )}
        </div>
    );
};

export default SeleccionadorConvocatorias;
