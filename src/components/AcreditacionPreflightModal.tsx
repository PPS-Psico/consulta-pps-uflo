import React from 'react';
import { createPortal } from 'react-dom';
import type { CriteriosCalculados, InformeTask } from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';

interface AcreditacionPreflightModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    criterios: CriteriosCalculados;
    informeTask: InformeTask;
}

const AcreditacionPreflightModal: React.FC<AcreditacionPreflightModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    criterios,
    informeTask
}) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-icons text-emerald-600 dark:text-emerald-400">check_circle</span>
                        Confirmar Criterios de Acreditación
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Verifica los criterios antes de continuar
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    {/* Horas Objetivo */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Horas Objetivo</h4>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Obtenidas: <span className="font-medium text-slate-900 dark:text-white">{criterios.horasObjetivo}</span>
                                </p>
                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                    Total: <span className="font-medium text-slate-900 dark:text-white">{HORAS_OBJETIVO_TOTAL}</span>
                                </p>
                            </div>
                            <div className={`p-3 rounded-lg ${
                                criterios.horasObjetivo >= HORAS_OBJETIVO_TOTAL
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                            }`}>
                                <p className="text-sm font-semibold ${
                                    criterios.horasObjetivo >= HORAS_OBJETIVO_TOTAL ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                                }`}>
                                    {criterios.horasObjetivo >= HORAS_OBJETIVO_TOTAL ? '✓ Cumple' : '✗ Insuficiente'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Horas por Orientación */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Horas por Orientación</h4>
                        <div className="space-y-2">
                            {Object.entries(HORAS_OBJETIVO_ORIENTACION).map(([orientacion, horas]) => (
                                <div key={orientacion} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{orientacion}</span>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm text-slate-600 dark:text-slate-400">Obtenidas: {criterios.horasPorOrientacion?.[orientacion] || 0}</span>
                                        <span className="text-xs text-slate-500 dark:text-slate-500">de {horas}</span>
                                        <div className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                            criterios.horasPorOrientacion?.[orientacion] >= horas
                                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                        }`}>
                                            {criterios.horasPorOrientacion?.[orientacion] >= horas ? '✓' : '✗'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Rotaciones */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Rotaciones Realizadas</h4>
                        <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.entries(ROTACION_OBJETIVO_ORIENTACIONES).map(([orientacion, rotaciones]) => (
                                    <div key={orientacion} className="space-y-1">
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{orientacion}</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                Obtenidas: <span className="font-medium text-slate-900 dark:text-white">{criterios.rotacionesPorOrientacion?.[orientacion] || 0}</span>
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-500">de {rotaciones}</span>
                                            <div className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                                criterios.rotacionesPorOrientacion?.[orientacion] >= rotaciones
                                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                            }`}>
                                                {criterios.rotacionesPorOrientacion?.[orientacion] >= rotaciones ? '✓' : '✗'}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Informe de Prácticas */}
                    <div className="space-y-2">
                        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Informe de Prácticas</h4>
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                                <strong>Práctica:</strong> {informeTask.ppsName}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                <strong>Institución:</strong> {informeTask.institucion}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                                <strong>Horas totales:</strong> {informeTask.horasTotales}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                                Este informe se generará automáticamente y será enviado al estudiante.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="p-6 flex justify-between border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-lg font-medium transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AcreditacionPreflightModal;