
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GroupedSeleccionados, SelectedStudent } from '../types';
import EmptyState from './EmptyState';

interface SeleccionadosModalProps {
  isOpen: boolean;
  onClose: () => void;
  seleccionados: GroupedSeleccionados | null;
  convocatoriaName: string;
}

// Reusable component for the student list
const StudentList: React.FC<{ students: SelectedStudent[] }> = ({ students }) => (
  <ul className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
    {students.map((student) => (
      <li key={student.legajo} className="flex items-center justify-between py-3 first:pt-1 last:pb-1">
        <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 text-xs font-bold">
                {student.nombre.charAt(0)}
            </div>
            <span className={`font-medium text-sm ${student.nombre === 'Nombre Desconocido' ? 'text-slate-400 italic' : 'text-slate-700 dark:text-slate-200'}`}>
            {student.nombre}
            </span>
        </div>
        <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
          {student.legajo}
        </span>
      </li>
    ))}
  </ul>
);

const SeleccionadosModal: React.FC<SeleccionadosModalProps> = ({
  isOpen,
  onClose,
  seleccionados,
  convocatoriaName,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isOpen]);

  if (!isOpen || !mounted) return null;

  const hasSeleccionados = seleccionados && Object.keys(seleccionados).length > 0;
  
  const isSingleUnspecifiedGroup = hasSeleccionados &&
    Object.keys(seleccionados).length === 1 &&
    Object.keys(seleccionados)[0] === 'No especificado';

  const renderContent = () => {
    if (!hasSeleccionados) {
      return (
        <EmptyState
          icon="person_off"
          title="Lista no disponible"
          message="Aún no se ha publicado la lista de alumnos seleccionados para esta convocatoria."
        />
      );
    }
    
    if (isSingleUnspecifiedGroup) {
      const students = seleccionados['No especificado'];
      return (
        <div className="bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700 overflow-hidden">
            <div className="max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
                <StudentList students={students} />
            </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
        {Object.entries(seleccionados).map(([horario, students]) => (
          <div key={horario} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm">
            <h3 className="font-semibold text-xs text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-2 rounded-lg mb-3 uppercase tracking-wide flex items-center gap-2">
              <span className="material-icons !text-sm">schedule</span>
              {horario}
            </h3>
            <StudentList students={students as SelectedStudent[]} />
          </div>
        ))}
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in"
      aria-labelledby="seleccionados-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-[95vw] sm:w-full max-w-lg max-h-[85dvh] sm:max-h-[90vh] bg-slate-50 dark:bg-slate-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200/70 dark:border-slate-700/80 animate-scale-in"
      >
        {/* Header */}
        <div className="px-6 py-5 flex-shrink-0 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 shadow-inner">
                    <span className="material-icons !text-2xl">groups</span>
                </div>
                <div>
                    <h2 id="seleccionados-modal-title" className="text-lg font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                        Alumnos Seleccionados
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 line-clamp-1" title={convocatoriaName}>
                        {convocatoriaName}
                    </p>
                </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 -mr-2 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Cerrar modal"
            >
              <span className="material-icons !text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow custom-scrollbar">
          {renderContent()}
        </div>
        
        <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end safe-area-bottom">
             <button onClick={onClose} className="px-6 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-sm transition-colors">
                 Cerrar
             </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default SeleccionadosModal;
