
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
    const finalesText = student.finalesAdeuda ? `Adeuda: ${student.finalesAdeuda}` : 'Adeuda finales';

    const handleScheduleBlur = () => {
        if (isScheduleDirty && localSchedule !== student.horarioSeleccionado) {
            onUpdateSchedule(student.enrollmentId, localSchedule);
            setIsScheduleDirty(false);
        }
    };

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${isSelected ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${student.puntajeTotal >= 100 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100'}`}>{student.puntajeTotal}</div>
                         <div><h4 className="font-bold text-slate-800 dark:text-slate-100">{student.nombre}</h4><p className="text-xs text-slate-500">{student.legajo}</p></div>
                    </div>
                </div>
                <div className="flex-1 text-sm"><span className="text-slate-500 text-xs uppercase font-semibold mr-2">Estado:</span>{student.terminoCursar ? 'Terminó de Cursar' : student.cursandoElectivas ? 'Cursando Electivas' : finalesText}</div>
                <div className="flex-1"><input type="text" value={localSchedule} onChange={(e) => {setLocalSchedule(e.target.value); setIsScheduleDirty(true);}} onBlur={handleScheduleBlur} className="w-full text-sm px-3 py-1.5 rounded border dark:bg-slate-900 dark:border-slate-600" placeholder="Horario..." /></div>
                <button onClick={() => onToggleSelection(student)} disabled={isUpdating} className={`py-1.5 px-4 rounded-lg text-sm font-bold ${isSelected ? 'bg-emerald-600 text-white' : 'bg-white border text-slate-700'}`}>{isUpdating ? '...' : isSelected ? (isReviewMode ? 'Confirmado' : 'Listo') : 'Elegir'}</button>
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
                <h3 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Convocatorias Abiertas</h3>
                {openLaunches.length === 0 ? <EmptyState icon="event_busy" title="Sin Convocatorias" message="No hay lanzamientos activos." /> : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {openLaunches.map(lanz => (
                            <button key={lanz.id} onClick={() => setSelectedLanzamiento(lanz)} className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:border-blue-500 transition-all">
                                <div className="flex justify-between mb-2"><span className={getEspecialidadClasses(lanz[FIELD_ORIENTACION_LANZAMIENTOS]).tag}>{lanz[FIELD_ORIENTACION_LANZAMIENTOS]}</span><span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">{lanz[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} Cupos</span></div>
                                <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100">{lanz[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</h4>
                                <p className="text-sm text-slate-500 mt-2">Inicio: {formatDate(lanz[FIELD_FECHA_INICIO_LANZAMIENTOS])}</p>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedLanzamiento(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"><span className="material-icons">arrow_back</span></button>
                    <div><h3 className="text-lg font-bold dark:text-white">{selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</h3><p className="text-xs text-slate-500">{selectedCandidates.length} seleccionados</p></div>
                </div>
                {viewMode === 'selection' ? (
                     <button onClick={() => setViewMode('review')} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold text-sm">Revisar y Cerrar</button>
                ) : (
                     <div className="flex gap-2">
                        <button onClick={() => setViewMode('selection')} className="text-slate-600 dark:text-slate-300 font-bold px-4 py-2">Volver</button>
                        <button onClick={handleConfirmAndCloseTable} disabled={isClosingTable} className="bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">{isClosingTable ? 'Cerrando...' : 'Confirmar Cierre'}</button>
                     </div>
                )}
            </div>
            {isLoadingCandidates ? <Loader /> : (
                <div className="space-y-3">
                    {(viewMode === 'selection' ? candidates : selectedCandidates).map(student => (
                        <StudentRow key={student.enrollmentId} student={student} onToggleSelection={handleToggle} onUpdateSchedule={handleUpdateSchedule} isUpdating={updatingId === student.enrollmentId} isReviewMode={viewMode === 'review'} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default SeleccionadorConvocatorias;
