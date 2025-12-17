import React from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';
import Select from './Select';

interface OrientacionSelectorProps {
  selectedOrientacion: string;
  onOrientacionChange: (orientacion: Orientacion | "") => void;
  showSaveConfirmation: boolean;
}

const OrientacionSelector: React.FC<OrientacionSelectorProps> = React.memo(({ selectedOrientacion, onOrientacionChange, showSaveConfirmation }) => {
  return (
    <div className="animate-fade-in-up flex flex-col justify-center h-full p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 rounded-xl bg-white dark:bg-slate-700 shadow-sm">
          <span className="material-icons text-indigo-500 dark:text-indigo-400 !text-xl">psychology</span>
        </div>
        <h3 className="text-slate-800 dark:text-slate-100 font-bold text-base leading-tight">
          Define tu Especialidad
        </h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
        Selecciona tu orientación principal para visualizar tu progreso específico.
      </p>
      <div className="relative">
        {showSaveConfirmation && (
          <div className="absolute right-0 -top-8 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800 animate-fade-in-up shadow-sm flex items-center gap-1">
            <span className="material-icons !text-sm">check_circle</span>
            Guardado
          </div>
        )}
        <Select
            id="orientacion-elegida-select" 
            aria-label="Seleccionar orientación principal"
            value={selectedOrientacion}
            onChange={(e) => onOrientacionChange(e.target.value as Orientacion | "")}
            className="text-sm font-medium w-full bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-600 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl"
        >
            <option value="">🎯 Seleccionar...</option>
            {ALL_ORIENTACIONES.map(o => (
              <option key={o} value={o}>{o}</option>
            ))}
        </Select>
      </div>
    </div>
  );
});

OrientacionSelector.displayName = 'OrientacionSelector';
export default OrientacionSelector;