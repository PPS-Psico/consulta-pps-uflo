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

// Helper to clean weird JSON/Array string formats like ["Name"] or {Name}
const cleanInstitutionName = (val: any): string => {
    if (val === null || val === undefined) return 'N/A';
    if (Array.isArray(val)) return cleanInstitutionName(val[0]);
    let str = String(val);
    if (str.startsWith('["') && str.endsWith('"]')) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return cleanInstitutionName(parsed[0]);
            }
        } catch (e) {}
    }
    // Updated regex to include curly braces {}
    return str.replace(/[\[\]\{\}"]/g, '').trim();
}

const NOTA_OPTIONS = ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];
// Mobile options filtered as requested: Only numbers, Desaprobado, or reset to Sin calificar
const MOBILE_NOTA_OPTIONS = ['Sin calificar', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

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
  compact?: boolean;
  mobileLayout?: boolean;
}> = ({ practica, handleNotaChange, savingNotaId, justUpdatedPracticaId, compact = false, mobileLayout = false }) => {
    const nota = practica[FIELD_NOTA_PRACTICAS] || 'Sin calificar';
    const institucion = cleanInstitutionName(practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
    
    // Editable if it is "Sin calificar" OR any of the intermediate states ("No Entregado", "Entregado (sin corregir)")
    const isEditable = nota === 'Sin calificar' || nota === 'Entregado (sin corregir)' || nota === 'No Entregado';
    
    // Mobile KPI Layout
    if (mobileLayout) {
         const isNumeric = !isNaN(parseInt(nota, 10)) || nota === 'Desaprobado';
         
         const getMobileColor = (n: string) => {
            if (n === 'Desaprobado') return 'text-red-600 dark:text-red-400';
            const num = parseInt(n, 10);
            if (!isNaN(num)) {
                return num >= 4 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400';
            }
            return 'text-slate-400 dark:text-slate-500';
         };

         // If it's numeric or "Desaprobado", show it. Otherwise show "Sin / Calif."
         const displayNota = isNumeric ? nota : (
             <>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 leading-none mb-0.5">Sin</span>
                <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 leading-none">Calif.</span>
             </>
         );

         return (
             <div className={`relative flex flex-col items-center justify-center rounded-xl w-16 h-14 border shadow-sm overflow-hidden transition-colors ${isEditable ? 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700'}`}>
                  {/* Visual Layer */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0 p-1">
                      {isNumeric ? (
                           <span className={`font-black text-2xl leading-none ${nota === 'Desaprobado' ? 'text-[10px] break-all leading-tight' : ''} ${getMobileColor(nota)}`}>
                               {nota === 'Desaprobado' ? 'DESAPROBADO' : nota}
                           </span>
                      ) : displayNota}
                  </div>

                  {/* Interaction Layer - Overlay for selecting */}
                  {isEditable && (
                      <select
                        value={(nota === 'No Entregado' || nota === 'Entregado (sin corregir)') ? 'Sin calificar' : nota}
                        onChange={(e) => handleNotaChange(practica.id, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 appearance-none"
                        aria-label={`Calificación para ${institucion}`}
                      >
                         {MOBILE_NOTA_OPTIONS.map(option => (
                            <option key={option} value={option}>{option}</option>
                         ))}
                      </select>
                  )}
              </div>
         );
    }

    // Desktop / Read-only Standard Layout
    if (!isEditable) {
        const notaClass = `inline-block px-3 py-1 rounded-full text-xs font-bold transition-transform hover:scale-105 cursor-default ${notaColors[nota] || notaColors['Sin calificar']}`;
        return <div className={notaClass} title={`Nota: ${nota}`}>{nota}</div>;
    }

    // Desktop Editable Layout
    const dynamicSelectClasses = selectNotaColors[nota] || selectNotaColors['Sin calificar'];

    return (
        <div className={`flex items-center gap-2 w-full ${compact ? 'justify-end' : ''}`}>
            <div className={`relative ${compact ? 'w-32' : 'flex-1'}`}>
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
            {justUpdatedPracticaId === practica.id && !compact && (
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
            aValue = normalizeStringForComparison(cleanInstitutionName(a[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]));
            bValue = normalizeStringForComparison(cleanInstitutionName(b[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]));
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
      <div className="overflow-x-auto hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
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
              const institucion = cleanInstitutionName(practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
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

      {/* Mobile Compact List View - REDESIGNED for Metrics focus */}
      <div className="md:hidden space-y-5">
        {sortedPracticas.map(practica => {
          const institucion = cleanInstitutionName(practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
          const status = practica[FIELD_ESTADO_PRACTICA];
          const statusVisuals = getStatusVisuals(status || '');
          const especialidadVisuals = getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS] || '');

          return (
            <div key={practica.id} className={`relative bg-white dark:bg-slate-900/80 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-black/40 border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 ${justUpdatedPracticaId === practica.id ? 'animate-flash-success ring-2 ring-emerald-400' : ''}`}>
              
              {/* Sutil Decorative Side Bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b ${especialidadVisuals.gradient}`}></div>

              <div className="p-5 pl-6 flex gap-4">
                 {/* Left Column: Info Principal */}
                 <div className="flex-1 flex flex-col gap-3">
                     <div>
                        <span className={`${especialidadVisuals.tag} shadow-none px-2 py-0.5 text-[10px] uppercase tracking-wider border-transparent mb-1.5`}>
                            {practica[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A'}
                        </span>
                        <h3 className="font-black text-slate-800 dark:text-slate-100 text-base leading-snug">{institucion}</h3>
                     </div>

                     <div className="flex flex-col gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5">
                            <span className="material-icons !text-sm opacity-70">date_range</span>
                            <span>{formatDate(practica[FIELD_FECHA_INICIO_PRACTICAS])} - {formatDate(practica[FIELD_FECHA_FIN_PRACTICAS])}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${statusVisuals.labelClass}`}>
                                <span className="material-icons !text-xs">{statusVisuals.icon}</span>
                                {status || 'N/A'}
                            </span>
                        </div>
                     </div>
                 </div>
                 
                 {/* Right Column: Metrics (Hours & Grade) - Aligned Vertically */}
                 <div className="flex flex-col gap-3 items-end justify-start min-w-[70px]">
                    {/* Hours Box */}
                    <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl w-16 h-14 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                        <span className="font-black text-lg leading-none">{practica[FIELD_HORAS_PRACTICAS] || 0}</span>
                        <span className="text-[9px] font-bold uppercase mt-0.5 opacity-80">Hs</span>
                    </div>

                    {/* Grade Box - KPI Style */}
                    <NotaEditor 
                        practica={practica} 
                        handleNotaChange={handleLocalNotaChange} 
                        savingNotaId={savingNotaId} 
                        justUpdatedPracticaId={justUpdatedPracticaId} 
                        compact
                        mobileLayout
                    />
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