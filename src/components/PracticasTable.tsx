
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

// Helper para limpiar nombres que vienen como arrays/JSON de Airtable
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
    return str.replace(/[\[\]\{\}"]/g, '').trim();
}

// Opciones restringidas: Sin calificar y notas del 4 al 10
const NOTA_OPTIONS = ['Sin calificar', '4', '5', '6', '7', '8', '9', '10'];

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

// --- COMPONENTE EDITOR DE NOTA (Nativo para evitar bugs de UI) ---
const NotaEditor: React.FC<{
  practica: Practica;
  handleNotaChange: (practicaId: string, nota: string) => void;
  savingNotaId: string | null;
  justUpdatedPracticaId: string | null;
  compact?: boolean;
}> = ({ practica, handleNotaChange, savingNotaId, justUpdatedPracticaId, compact = false }) => {
    
    const notaActual = practica[FIELD_NOTA_PRACTICAS] || 'Sin calificar';
    const isSaving = savingNotaId === practica.id;
    const isSuccess = justUpdatedPracticaId === practica.id;

    // Determinar color basado en la nota numérica
    const getBadgeColor = (n: string) => {
        if (n === 'Sin calificar') return 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 border-dashed hover:border-blue-300';
        
        const num = parseInt(n, 10);
        if (isNaN(num)) {
             // Por si viene un "Desaprobado" antiguo u otro texto
             if (n.toLowerCase().includes('desaprobado')) return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
             return 'bg-slate-100 text-slate-600 border-slate-200';
        }
        
        if (num >= 8) return 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800'; // 8-10 (Verde)
        if (num >= 6) return 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800'; // 6-7 (Azul)
        if (num >= 4) return 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'; // 4-5 (Amarillo/Aprobado bajo)
        
        return 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'; // < 4 (Rojo)
    };

    const styleClass = getBadgeColor(notaActual);
    const displayText = notaActual === 'Sin calificar' ? 'Calificar' : notaActual;

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        if (newValue !== notaActual) {
             handleNotaChange(practica.id, newValue);
        }
    };

    return (
        <div className={`relative group flex items-center ${compact ? 'justify-end' : 'justify-center'}`}>
            <div className={`
                relative flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-bold transition-all duration-200 w-full max-w-[110px]
                ${styleClass}
                ${isSaving ? 'opacity-70 cursor-wait' : 'hover:shadow-md cursor-pointer'}
            `}>
                {isSaving ? (
                    <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    <>
                        <span className="truncate">{displayText}</span>
                        <span className="material-icons !text-[14px] opacity-50 group-hover:opacity-100 -mr-1">expand_more</span>
                    </>
                )}
                
                {/* Selector nativo invisible posicionado encima para capturar el clic */}
                {!isSaving && (
                    <select
                        value={NOTA_OPTIONS.includes(notaActual) ? notaActual : 'Sin calificar'}
                        onChange={onSelectChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer appearance-none z-20"
                        title="Cambiar nota"
                    >
                        {NOTA_OPTIONS.map(option => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {isSuccess && !compact && (
                <div className="absolute -right-6 text-emerald-500 animate-fade-in-up pointer-events-none">
                    <span className="material-icons !text-base">check_circle</span>
                </div>
            )}
        </div>
    );
};

const PracticasTable: React.FC<PracticasTableProps> = ({ practicas, handleNotaChange }) => {
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'ascending' | 'descending' }>({ key: 'fechaInicio', direction: 'descending' });
  const [savingNotaId, setSavingNotaId] = useState<string | null>(null);
  const [justUpdatedPracticaId, setJustUpdatedPracticaId] = useState<string | null>(null);

  const handleLocalNotaChange = async (practicaId: string, nota: string) => {
    setSavingNotaId(practicaId);
    try {
        await handleNotaChange(practicaId, nota);
        setJustUpdatedPracticaId(practicaId);
        setTimeout(() => setJustUpdatedPracticaId(null), 2000);
    } catch (error) {
        console.error("Error actualizando nota:", error);
    } finally {
        setSavingNotaId(null);
    }
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
      <div className="overflow-x-auto hidden md:block rounded-2xl border border-slate-200 dark:border-slate-800"> 
        <table className="w-full min-w-[800px] text-sm">
          <thead className="bg-gray-50 dark:bg-slate-950 border-b border-gray-200 dark:border-slate-800">
            <tr>
              <SortableHeader label="Institución" sortKey="institucion" sortConfig={sortConfig} requestSort={requestSort} className="text-left w-2/5" />
              <SortableHeader label="Especialidad" sortKey="especialidad" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Horas" sortKey="horas" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Periodo" sortKey="fechaInicio" sortConfig={sortConfig} requestSort={requestSort} />
              <SortableHeader label="Estado" sortKey="estado" sortConfig={sortConfig} requestSort={requestSort} />
              <th scope="col" className="p-4 text-center font-bold text-gray-600 dark:text-slate-400 text-xs uppercase tracking-wider w-32">Nota</th>
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
                    justUpdatedPracticaId === practica.id ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''
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
                  <td className="p-4 align-middle w-32 text-center relative">
                    <NotaEditor 
                        practica={practica} 
                        handleNotaChange={handleLocalNotaChange} 
                        savingNotaId={savingNotaId} 
                        justUpdatedPracticaId={justUpdatedPracticaId} 
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Compact List View */}
      <div className="md:hidden space-y-5">
        {sortedPracticas.map(practica => {
          const institucion = cleanInstitutionName(practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]);
          const status = practica[FIELD_ESTADO_PRACTICA];
          const statusVisuals = getStatusVisuals(status || '');
          const especialidadVisuals = getEspecialidadClasses(practica[FIELD_ESPECIALIDAD_PRACTICAS] || '');

          return (
            <div key={practica.id} className={`relative bg-white dark:bg-slate-900/80 rounded-3xl shadow-lg shadow-slate-200/50 dark:shadow-black/40 border border-slate-100 dark:border-slate-800 overflow-hidden transition-all duration-300 ${justUpdatedPracticaId === practica.id ? 'ring-2 ring-emerald-400' : ''}`}>
              
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
                 
                 {/* Right Column: Metrics (Hours & Grade) */}
                 <div className="flex flex-col gap-3 items-end justify-start min-w-[70px]">
                    <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-xl w-16 h-14 border border-blue-100 dark:border-blue-800/50 shadow-sm">
                        <span className="font-black text-lg leading-none">{practica[FIELD_HORAS_PRACTICAS] || 0}</span>
                        <span className="text-[9px] font-bold uppercase mt-0.5 opacity-80">Hs</span>
                    </div>

                    <NotaEditor 
                        practica={practica} 
                        handleNotaChange={handleLocalNotaChange} 
                        savingNotaId={savingNotaId} 
                        justUpdatedPracticaId={justUpdatedPracticaId} 
                        compact
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
