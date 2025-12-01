
import React, { useState, useMemo } from 'react';
import type { Practica } from '../types';
import {
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_ESTADO_PRACTICA,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_NOTA_PRACTICAS
} from '../constants';
import {
  formatDate,
  getEspecialidadClasses,
  getStatusVisuals,
  normalizeStringForComparison
} from '../utils/formatters';
import EmptyState from './EmptyState';

const NOTA_OPTIONS = ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

const notaColors: Record<string, string> = {
  '10': 'bg-gradient-to-r from-emerald-400 to-teal-400 text-white shadow-lg shadow-emerald-500/20 dark:from-emerald-500 dark:to-teal-500',
  '9': 'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
  '8': 'bg-blue-100 text-blue-800 border border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
  '7': 'bg-sky-100 text-sky-800 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/30',
  '6': 'bg-yellow-100 text-yellow-800 border border-yellow-200 dark:bg-yellow-500/20 dark:text-yellow-300 dark:border-yellow-500/30',
  '5': 'bg-orange-100 text-orange-800 border border-orange-200 dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-500/30',
  '4': 'bg-red-100 text-red-800 border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  'Desaprobado': 'bg-red-100 text-red-800 font-bold border border-red-200 dark:bg-red-500/20 dark:text-red-300 dark:border-red-500/30',
  'No Entregado': 'bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
  'Entregado (sin corregir)': 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-500/30',
  'Sin calificar': 'bg-slate-50 text-slate-500 border border-slate-200 dark:bg-slate-800/50 dark:text-slate-500 dark:border-slate-700'
};

const selectNotaColors: Record<string, string> = {
  '10': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200',
  '9': 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-900 dark:text-emerald-200',
  '8': 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-200',
  '7': 'bg-sky-50 dark:bg-sky-900/30 text-sky-900 dark:text-sky-200',
  '6': 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-900 dark:text-yellow-200',
  '5': 'bg-orange-50 dark:bg-orange-900/30 text-orange-900 dark:text-orange-200',
  '4': 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200',
  'Desaprobado': 'bg-red-50 dark:bg-red-900/30 text-red-900 dark:text-red-200',
  'No Entregado': 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-200',
  'Entregado (sin corregir)': 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-900 dark:text-indigo-200',
  'Sin calificar': 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-200'
};

interface PracticasTableProps {
    practicas: Practica[];
    handleNotaChange: (practicaId: string, nota: string, convocatoriaId?: string) => void;
}

const SortableHeader: React.FC<{
  label: string;
  sortKey: string;
  sortConfig: { key: string | null; direction: 'ascending' | 'descending' };
  requestSort: (key: string) => void;
  className?: string;
}> = ({ label, sortKey, sortConfig, requestSort, className = "text-center" }) => {
  const isActive = sortConfig.key === sortKey;
  const icon = isActive ? (sortConfig.direction === 'ascending' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';

  return (
    <th scope="col" className={`p-0 ${className}`}>
      <button
        type="button"
        onClick={() => requestSort(sortKey)}
        className="w-full h-full p-4 flex items-center gap-2 cursor-pointer select-none group transition-colors hover:bg-gray-200/50 dark:hover:bg-slate-800/50"
      >
        <div className={`flex items-center gap-2 w-full ${className.includes('text-left') ? 'justify-start' : 'justify-center'}`}>
            <span className="font-bold text-gray-600 dark:text-slate-400 text-xs uppercase tracking-wider">{label}</span>
            <span className={`material-icons !text-base transition-opacity ${isActive ? 'opacity-100 text-gray-900 dark:text-slate-200' : 'opacity-40 text-slate-400 group-hover:opacity-80'}`}>{icon}</span>
        </div>
      </button>
    </th>
  );
};

const NotaEditor: React.FC<{
  practica: Practica;
  handleNotaChange: (practicaId: string, nota: string) => void;
  savingNotaId: string | null;
  justUpdatedPracticaId: string | null;
}> = ({ practica, handleNotaChange, savingNotaId, justUpdatedPracticaId }) => {
    const nota = practica[FIELD_NOTA_PRACTICAS] || 'Sin calificar';
    const institucion = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] || 'Institución no asignada';
    const isEditable = nota === 'Sin calificar' || nota === 'Entregado (sin corregir)';
    const notaClass = `inline-block px-3 py-1 rounded-full text-xs font-bold transition-transform hover:scale-105 cursor-default ${notaColors[nota] || notaColors['Sin calificar']}`;
    
    if (!isEditable) {
        return <div className={notaClass} title={`Nota: ${nota}`}>{nota}</div>;
    }

    const dynamicSelectClasses = selectNotaColors[nota] || selectNotaColors['Sin calificar'];

    return (
        <div className="flex items-center gap-2 w-full">
            <div className="relative flex-1">
                <select
                    value={nota}
                    onChange={(e) => handleNotaChange(practica.id, e.target.value)}
                    className={`appearance-none w-full text-sm font-semibold rounded-lg border border-gray-300 dark:border-slate-600 p-2.5 shadow-sm outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 hover:border-blue-400 dark:hover:border-blue-500
                    ${savingNotaId === practica.id ? 'ring-2 ring-blue-500 border-blue-500 shadow-blue-100 dark:ring-blue-600 dark:border-blue-600 dark:shadow-blue-900/50 animate-pulse' : ''} ${dynamicSelectClasses}`}
                    aria-label={`Calificación para ${institucion}`}
                >
                    {NOTA_OPTIONS.map(option => (
                    <option key={option} value={option}>{option}</option>
                    ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                    <span className="material-icons !text-base text-gray-500 dark:text-slate-400">expand_more</span>
                </div>
            </div>
            {justUpdatedPracticaId === practica.id && (
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 animate-fade-in-up whitespace-nowrap" style={{ animationDuration: '300ms' }}>
                    Guardado ✓
                </span>
            )}
        </div>
    );
};

const PracticasTable: React.FC<PracticasTableProps> = ({ practicas, handleNotaChange }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({ key: 'fechaInicio', direction: 'descending' });
  const [savingNotaId, setSavingNotaId] = useState<string | null>(null);
  const [justUpdatedPracticaId, setJustUpdatedPracticaId] = useState<string | null>(null);

  const handleLocalNotaChange = (practicaId: string, nota: string) => {
    handleNotaChange(practicaId, nota);
    setSavingNotaId(practicaId);
    setJustUpdatedPracticaId(practicaId);
    setTimeout(() => setSavingNotaId(null), 1000);
    setTimeout(() => setJustUpdatedPracticaId(null), 1500);
  };

  const sortedPracticas = useMemo(() => {
    let processableItems = [...practicas];
    if (sortConfig.key !== null) {
      processableItems.sort((a, b) => {
        let aValue: string | number, bValue: string | number;
        const safeGetTime = (dateStr?: string | null) => {
          if (!dateStr) return 0;
          const date = new Date(dateStr);
          return isNaN(date.getTime()) ? 0 : date.getTime();
        };
        
        switch (sortConfig.key) {
          case 'institucion':
            aValue = normalizeStringForComparison(a[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
            bValue = normalizeStringForComparison(b[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
            break;
          case 'especialidad':
            aValue = normalizeStringForComparison(a[FIELD_ESPECIALIDAD_PRACTICAS]);
            bValue = normalizeStringForComparison(b[FIELD_ESPECIALIDAD_PRACTICAS]);
            break;
          case 'horas':
            aValue = a[FIELD_HORAS_PRACTICAS] || 0;
            bValue = b[FIELD_HORAS_PRACTICAS] || 0;
            break;
          case 'fechaInicio':
            aValue = safeGetTime(a[FIELD_FECHA_INICIO_PRACTICAS]);
            bValue = safeGetTime(b[FIELD_FECHA_INICIO_PRACTICAS]);
            break;
          case 'estado':
            aValue = normalizeStringForComparison(a[FIELD_ESTADO_PRACTICA]);
            bValue = normalizeStringForComparison(b[FIELD_ESTADO_PRACTICA]);
            break;
          default:
            return 0;
        }
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return processableItems;
  }, [practicas, sortConfig]);

  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  if (practicas.length === 0) {
    return (
      <EmptyState
        icon="work_history"
        title="Sin Prácticas Registradas"
        message="Cuando completes prácticas, aparecerán aquí con su detalle."
      />
    );
  }

  return (
    <div>
      {/* Desktop Table View */}
      <div className="overflow-x-auto hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <SortableHeader label="Institución" sortKey="institucion" sortConfig={sortConfig} requestSort={requestSort} className="text-left w-2/5" />
              <SortableHeader label="Especialidad" sortKey="especialidad" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Horas" sortKey="horas" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Periodo" sortKey="fechaInicio" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Estado" sortKey="estado" sortConfig={sortConfig} requestSort={requestSort} />
              <th scope="col" className="p-4 text-center font-bold text-gray-600 dark:text-slate-400 text-xs uppercase tracking-wider">Nota</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
            {sortedPracticas.map((practica) => {
              const institucion = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] || 'N/A';
              const status = practica[FIELD_ESTADO_PRACTICA];
              const statusVisuals = getStatusVisuals(status || '');

              return (
                <tr 
                  key={practica.id} 
                  className={`transition-colors duration-200 bg-white dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                    justUpdatedPracticaId === practica.id ? 'animate-flash-success' : ''
                  }`}
                >
                  <td className="p-4 align-middle text-slate-900 dark:text-slate-200 font-semibold break-words text-left">{institucion}</td>
                  <td className="p-4 align-middle text-center">
                    <span className={`${getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS] || '').tag} shadow-sm`}>
                      {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                    </span>
                  </td>
                  <td className="p-4 text-center align-middle text-slate-800 dark:text-slate-300 font-medium">{practica[FIELD_HORAS_PRACTICAS] || 0}</td>
                  <td className="p-4 text-center align-middle text-slate-700 dark:text-slate-400">
                    <div className="flex flex-col items-center">
                      <span>{formatDate(practica[FIELD_FECHA_INICIO_PRACTICAS])}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">a</span>
                      <span>{formatDate(practica[FIELD_FECHA_FIN_PRACTICAS])}</span>
                    </div>
                  </td>
                  <td className="p-4 align-middle text-center">
                    <span className={`${statusVisuals.labelClass} gap-1.5 shadow-sm transition-transform hover:scale-105 cursor-default`}>
                      <span className="material-icons !text-base">{statusVisuals.icon}</span>
                      <span>{status || 'N/A'}</span>
                    </span>
                  </td>
                  <td className="p-4 align-middle w-56 text-center">
                    <NotaEditor practica={practica} handleNotaChange={handleLocalNotaChange} savingNotaId={savingNotaId} justUpdatedPracticaId={justUpdatedPracticaId} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact List View */}
      <div className="md:hidden space-y-4">
        {sortedPracticas.map(practica => {
          const institucion = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] || 'N/A';
          const status = practica[FIELD_ESTADO_PRACTICA];
          const statusVisuals = getStatusVisuals(status || '');

          return (
            <div key={practica.id} className={`bg-white dark:bg-slate-900/60 rounded-2xl shadow-md border border-slate-200 dark:border-slate-800 p-4 transition-colors duration-300 ${justUpdatedPracticaId === practica.id ? 'animate-flash-success' : ''}`}>
              {/* Top Row: Institution & Hours */}
              <div className="flex justify-between items-start gap-3">
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-tight">{institucion}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1.5">
                    <span className="material-icons !text-sm text-slate-400">date_range</span>
                    <span>{formatDate(practica[FIELD_FECHA_INICIO_PRACTICAS])} - {formatDate(practica[FIELD_FECHA_FIN_PRACTICAS])}</span>
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">{practica[FIELD_HORAS_PRACTICAS] || 0}</p>
                  <p className="text-xs font-bold text-slate-400 uppercase -mt-0.5">horas</p>
                </div>
              </div>
              {/* Bottom Row: Details and Grade */}
              <div className="flex items-center justify-between flex-wrap gap-3 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60">
                <div className="flex items-center gap-2">
                    <span className={`${getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS] || '').tag} shadow-sm px-2 py-0.5 text-[10px]`}>
                        {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                    </span>
                    <span className={`${statusVisuals.labelClass} gap-1 shadow-sm px-2 py-0.5 text-[10px]`}>
                        <span className="material-icons !text-sm">{statusVisuals.icon}</span>
                        <span>{status || 'N/A'}</span>
                    </span>
                </div>
                <div className="w-full sm:w-auto sm:max-w-[160px]">
                  <NotaEditor practica={practica} handleNotaChange={handleLocalNotaChange} savingNotaId={savingNotaId} justUpdatedPracticaId={justUpdatedPracticaId} />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  );
};

export default React.memo(PracticasTable);
