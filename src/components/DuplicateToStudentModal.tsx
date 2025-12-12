
import React, { useState } from 'react';
import AdminSearch from './AdminSearch';
import { AirtableRecord, EstudianteFields } from '../types';
import { FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES } from '../constants';

interface DuplicateToStudentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (studentId: string) => void;
    sourceRecordLabel: string;
}

const DuplicateToStudentModal: React.FC<DuplicateToStudentModalProps> = ({ isOpen, onClose, onConfirm, sourceRecordLabel }) => {
    const [selectedStudent, setSelectedStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);

    if (!isOpen) return null;

    const handleConfirm = () => {
        if (selectedStudent) {
            onConfirm(selectedStudent.id);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
<<<<<<< HEAD
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
=======
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50">
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="material-icons text-blue-600">content_copy</span>
                        Duplicar Práctica
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        Estás duplicando: <span className="font-semibold">{sourceRecordLabel}</span>.
                        <br/>Selecciona el estudiante al que se asignará esta copia.
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            Asignar a Estudiante
                        </label>
                        <AdminSearch 
                            onStudentSelect={(s) => setSelectedStudent(s)} 
                        />
                    </div>

                    {selectedStudent && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-center justify-between">
                            <div>
                                <p className="text-sm font-bold text-blue-900 dark:text-blue-100">{selectedStudent[FIELD_NOMBRE_ESTUDIANTES]}</p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">Legajo: {selectedStudent[FIELD_LEGAJO_ESTUDIANTES]}</p>
                            </div>
                            <span className="material-icons text-blue-600">check_circle</span>
                        </div>
                    )}
                </div>

<<<<<<< HEAD
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 rounded-b-xl">
=======
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
>>>>>>> d3beb595dba178068b98ee9380159c31ab5c2e7f
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm}
                        disabled={!selectedStudent}
                        className="px-5 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span className="material-icons !text-sm">content_copy</span>
                        Duplicar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DuplicateToStudentModal;
