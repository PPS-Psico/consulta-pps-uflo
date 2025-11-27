
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { fetchAllAirtableData, updateAirtableRecord, createAirtableRecord, updateAirtableRecords } from '../services/airtableService';
import type { LanzamientoPPS, InstitucionFields, AirtableRecord, LanzamientoPPSFields, PracticaFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_ESTADO_GESTION_LANZAMIENTOS,
  FIELD_NOTAS_GESTION_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
  AIRTABLE_TABLE_NAME_PRACTICAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_TELEFONO_INSTITUCIONES,
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate, getEspecialidadClasses, formatDate } from '../utils/formatters';
import { lanzamientoPPSArraySchema, institucionArraySchema, practicaArraySchema } from '../schemas';
import Loader from './Loader';
import Toast from './Toast';
import EmptyState from './EmptyState';

// MOCK DATA FOR TESTING
const mockLanzamientos: LanzamientoPPS[] = [
    { id: 'lanz_test_1', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Hospital de Prueba (Activa)', [FIELD_FECHA_FIN_LANZAMIENTOS]: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Clinica', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Pendiente de Gestión', [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 5 },
    { id: 'lanz_test_2', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Escuela Simulada (Finalizada)', [FIELD_FECHA_FIN_LANZAMIENTOS]: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Educacional', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Pendiente de Gestión' },
    { id: 'lanz_test_3', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'Consultora Ficticia (Confirmada)', [FIELD_FECHA_FIN_LANZAMIENTOS]: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Laboral', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Relanzamiento Confirmado', [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 'lanz_test_4', [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'ONG de Prueba (Sin fecha fin)', [FIELD_FECHA_INICIO_LANZAMIENTOS]: new Date().toISOString(), [FIELD_ORIENTACION_LANZAMIENTOS]: 'Comunitaria', [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'En Conversación', [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 2 },
];
const mockInstitutionsMap = new Map([
    [normalizeStringForComparison('Hospital de Prueba (Activa)'), { id: 'inst_test_1', phone: '1122334455' }],
    [normalizeStringForComparison('Escuela Simulada (Finalizada)'), { id: 'inst_test_2' }],
]);

type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';
const GESTION_STATUS_OPTIONS = ['Pendiente de Gestión', 'En Conversación', 'Relanzamiento Confirmado', 'No se Relanza', 'Archivado'];

interface GestionCardProps {
  pps: LanzamientoPPS;
  onSave: (id: string, updates: Partial<LanzamientoPPS>) => Promise<boolean>;
  isUpdating: boolean;
  cardType: 'activasYPorFinalizar' | 'finalizadasParaReactivar' | 'relanzamientosConfirmados' | 'activasIndefinidas';
  institution?: { id: string; phone?: string };
  onSavePhone: (institutionId: string, phone: string) => Promise<boolean>;
}

const GestionCard: React.FC<GestionCardProps> = React.memo(({ pps, onSave, isUpdating, cardType, institution, onSavePhone }) => {
  const [status, setStatus] = useState(pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión');
  const [notes, setNotes] = useState(pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '');
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const especialidadVisuals = getEspecialidadClasses(pps[FIELD_ORIENTACION_LANZAMIENTOS]); 
  
  const hasChanges = useMemo(() => {
    const originalStatus = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión';
    const originalNotes = pps[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '';
    
    const statusChanged = status !== originalStatus;
    const notesChanged = notes !== originalNotes;

    return statusChanged || notesChanged;
  }, [status, notes, pps]);

  const handleSave = async () => {
    if (!hasChanges) return;
    
    const updates: Partial<LanzamientoPPS> = {
      [FIELD_ESTADO_GESTION_LANZAMIENTOS]: status,
      [FIELD_NOTAS_GESTION_LANZAMIENTOS]: notes,
    };
    
    const success = await onSave(pps.id, updates);
    if (success) {
      setIsJustSaved(true);
      setTimeout(() => setIsJustSaved(false), 2000);
    }
  };

  const handleWhatsAppClick = () => {
    if (!institution?.phone) return;
    const cleanPhone = institution.phone.replace(/[^0-9]/g, '');
    const url = `https://wa.me/${cleanPhone}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleSavePhone = async () => {
    if (!institution || !newPhone.trim()) return;
    const success = await onSavePhone(institution.id, newPhone.trim());
    if (success) {
      setIsEditingPhone(false);
      setNewPhone('');
    }
  };
  
  const headerBg = isJustSaved ? 'bg-emerald-100 dark:bg-emerald-900/30' : especialidadVisuals.headerBg;
  const headerIconColor = isJustSaved ? 'text-emerald-700 dark:text-emerald-300' : especialidadVisuals.headerText;
  const headerTextColor = isJustSaved ? 'text-emerald-900 dark:text-emerald-200' : especialidadVisuals.headerText;
  
  const cardIcon = useMemo(() => {
    if (cardType === 'activasIndefinidas') return 'hourglass_empty';
    if (cardType === 'activasYPorFinalizar') return 'pending_actions';
    if (cardType === 'finalizadasParaReactivar') return 'history';
    return 'event_repeat';
  }, [cardType]);
  
  const timeBadge = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (cardType === 'activasIndefinidas') {
        return { text: 'Sin fecha de fin', color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-600', icon: 'date_range' };
    }

    if (cardType === 'activasYPorFinalizar') {
        const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
        if (!endDate) return null;

        const diffTime = endDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return null;

        if (diffDays === 0) {
            return { text: 'Finaliza hoy', color: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 ring-red-200 dark:ring-red-700', icon: 'event_busy' };
        }
        
        const text = `Finaliza en ${diffDays} día${diffDays !== 1 ? 's' : ''}`;
        
        if (diffDays <= 30) {
             return { text, color: 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 ring-amber-200 dark:ring-amber-700', icon: 'hourglass_top' };
        }

        return { text, color: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 ring-green-200 dark:ring-green-700', icon: 'event_available' };
    }

    if (cardType === 'finalizadasParaReactivar') {
        return { text: `Finalizó ${formatDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS])}`, color: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-slate-200 dark:ring-slate-600', icon: 'history_toggle_off' };
    }
    
    if (cardType === 'relanzamientosConfirmados') {
        const relaunchDateValue = pps[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS];
        const text = relaunchDateValue ? `Relanza ${formatDate(relaunchDateValue)}` : 'Relanzamiento Confirmado';
        return { text, color: 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-800 dark:text-indigo-200 ring-indigo-200 dark:ring-indigo-700', icon: 'flight_takeoff' };
    }
    
    return null;
  }, [pps, cardType]);

  const isEnConversacion = status === 'En Conversación';
  const actionButtonClass = "font-bold py-2 px-4 rounded-lg text-sm transition-all duration-300 shadow-md flex items-center justify-center gap-2 w-44";
  const cupos = pps[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS];

  return (
    <div className={`relative bg-white dark:bg-slate-800/50 rounded-xl border shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-px group overflow-hidden ${isEnConversacion ? 'border-sky-300 dark:border-sky-500 ring-2 ring-sky-50 dark:ring-sky-900/50' : 'border-slate-200/60 dark:border-slate-700/60'}`}>
        <div className={`p-4 border-b border-slate-200/60 dark:border-slate-700 flex justify-between items-start gap-3 transition-colors duration-500 ${headerBg}`}>
            <div className="flex-grow">
                <div className="flex items-center gap-2.5">
                    <span className={`material-icons !text-lg ${headerIconColor}`}>{cardIcon}</span>
                    <h4 className={`font-extrabold tracking-tight ${headerTextColor}`}>
                        {pps[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                    </h4>
                </div>
                <div className="mt-2 ml-9">
                    <span className={`${especialidadVisuals.tag} shadow-sm`}>{pps[FIELD_ORIENTACION_LANZAMIENTOS]}</span>
                </div>
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                {timeBadge?.text && (
                <div className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ring-1 ${timeBadge.color}`}>
                    <span className="material-icons !text-sm">{timeBadge.icon}</span>
                    <span>{timeBadge.text}</span>
                </div>
                )}
                {cupos != null && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full ring-1 ring-slate-200 dark:ring-slate-600">
                        <span className="material-icons !text-sm">groups</span>
                        <span>{cupos} cupo{cupos !== 1 ? 's' : ''}</span>
                    </div>
                )}
            </div>
        </div>
        
        <div className="p-4 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-800/50 dark:to-slate-800/20 space-y-4">
            <div className="space-y-3">
                <div>
                    <label htmlFor={`status-${pps.id}`} className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Estado de Gestión</label>
                    <div className="relative">
                        <select 
                            id={`status-${pps.id}`} 
                            value={status}
                            onChange={(e) => setStatus(e.target.value)}
                            className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm outline-none appearance-none focus:border-slate-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-blue-400 transition"
                        >
                            {GESTION_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
                            <span className="material-icons !text-base text-slate-500 dark:text-slate-400">expand_more</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor={`notes-${pps.id}`} className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1 block">Notas de Gestión</label>
                    <textarea 
                        id={`notes-${pps.id}`}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3} 
                        className="w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-slate-500 dark:focus:border-blue-400 focus:ring-1 focus:ring-slate-500 dark:focus:ring-blue-400 transition" 
                        placeholder="Conversaciones, próximos pasos..."
                    />
                </div>
            </div>

            <div className="flex justify-end items-stretch gap-3 pt-2">
                 {isEditingPhone ? (
                    <div className="flex items-center gap-2 w-44">
                        <input
                            type="tel"
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="Nº de teléfono"
                            className="flex-grow w-full text-sm rounded-lg border border-slate-300 dark:border-slate-600 p-2 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                            autoFocus
                        />
                        <button onClick={handleSavePhone} className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors" aria-label="Guardar teléfono"><span className="material-icons !text-base">check</span></button>
                        <button onClick={() => setIsEditingPhone(false)} className="p-2 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-800/50 transition-colors" aria-label="Cancelar"><span className="material-icons !text-base">close</span></button>
                    </div>
                 ) : institution?.phone ? (
                    <button
                        onClick={handleWhatsAppClick}
                        type="button"
                        className={`${actionButtonClass} bg-green-600 text-white hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 hover:-translate-y-px transform active:scale-95`}
                        title={`Contactar a ${institution.phone}`}
                    >
                        <span className="material-icons !text-base">chat</span>
                        <span>Contactar</span>
                    </button>
                ) : (
                     <button
                        onClick={() => setIsEditingPhone(true)}
                        type="button"
                        className={`${actionButtonClass} bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-200 hover:bg-sky-200 dark:hover:bg-sky-800/50 hover:-translate-y-px transform active:scale-95`}
                        disabled={!institution}
                     >
                         <span className="material-icons !text-base">add_call</span>
                         <span>Cargar Teléfono</span>
                     </button>
                )}

                <button
                onClick={handleSave}
                disabled={isUpdating || !hasChanges || isJustSaved}
                className={`${actionButtonClass} relative overflow-hidden
                    ${isJustSaved
                        ? 'bg-emerald-600 text-white cursor-default'
                        : isUpdating
                            ? 'bg-slate-500 text-white cursor-wait'
                            : hasChanges
                                ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 hover:bg-slate-700 dark:hover:bg-slate-100 hover:-translate-y-px transform active:scale-95'
                                : 'bg-slate-300 dark:bg-slate-600 text-slate-500 dark:text-slate-400 cursor-not-allowed'
                    }
                `}
                >
                {isUpdating ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">{isJustSaved ? 'check_circle_outline' : 'save'}</span>}
                <span>{isUpdating ? 'Guardando...' : (isJustSaved ? '¡Guardado!' : 'Guardar Cambios')}</span>
                </button>
            </div>
        </div>
    </div>
  );
});

const CollapsibleSection: React.FC<{ title: string; count: number; children: React.ReactNode; defaultOpen?: boolean; icon: string; iconBgColor: string; iconColor: string; borderColor: string; actions?: React.ReactNode; }> = ({ title, count, children, defaultOpen = true, icon, iconBgColor, iconColor, borderColor, actions }) => (
    <details className="group/details" open={defaultOpen}>
        <summary className="list-none flex items-center gap-4 cursor-pointer mb-4 p-2 rounded-lg transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
            <div className={`flex-shrink-0 size-10 rounded-lg flex items-center justify-center ${iconBgColor}`}>
                <span className={`material-icons ${iconColor}`}>{icon}</span>
            </div>
            <div className="flex-grow">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{title}</h3>
            </div>
            {actions && <div className="flex-shrink-0">{actions}</div>}
            <span className="text-base font-bold text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 h-8 w-8 flex items-center justify-center rounded-full">{count}</span>
            <span className="material-icons text-slate-400 dark:text-slate-500 transition-transform duration-300 group-open/details:rotate-90">chevron_right</span>
        </summary>
        <div className={`pl-4 ml-5 border-l-2 ${borderColor}`}>
            {children}
        </div>
    </details>
);

interface UseGestionConvocatoriasProps {
    forcedOrientations?: string[];
    isTestingMode?: boolean;
}

export const useGestionConvocatorias = ({ forcedOrientations, isTestingMode = false }: UseGestionConvocatoriasProps) => {
    const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
    const [institutionsMap, setInstitutionsMap] = useState<Map<string, { id: string; phone?: string }>>(new Map());
    const [loadingState, setLoadingState] = useState<LoadingState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [orientationFilter, setOrientationFilter] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    const fetchData = useCallback(async () => {
        setLoadingState('loading');
        setError(null);

        if (isTestingMode) {
            setLanzamientos(mockLanzamientos);
            setInstitutionsMap(mockInstitutionsMap);
            setLoadingState('loaded');
            return;
        }
        
        const [lanzamientosRes, institucionesRes] = await Promise.all([
            fetchAllAirtableData<LanzamientoPPSFields>(
                AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
                lanzamientoPPSArraySchema,
                [
                    FIELD_NOMBRE_PPS_LANZAMIENTOS,
                    FIELD_FECHA_INICIO_LANZAMIENTOS,
                    FIELD_FECHA_FIN_LANZAMIENTOS,
                    FIELD_ORIENTACION_LANZAMIENTOS,
                    FIELD_ESTADO_GESTION_LANZAMIENTOS,
                    FIELD_NOTAS_GESTION_LANZAMIENTOS,
                    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
                    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
                    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
                ],
                undefined,
                [{ field: FIELD_FECHA_FIN_LANZAMIENTOS, direction: 'desc' }]
            ),
            fetchAllAirtableData<InstitucionFields>(
                AIRTABLE_TABLE_NAME_INSTITUCIONES,
                institucionArraySchema,
                [FIELD_NOMBRE_INSTITUCIONES, FIELD_TELEFONO_INSTITUCIONES]
            )
        ]);

        if (lanzamientosRes.error || institucionesRes.error) {
            const errorObj = (lanzamientosRes.error || institucionesRes.error)?.error;
            const errorMsg = typeof errorObj === 'string' ? errorObj : errorObj?.message || 'Error al cargar los datos.';
            setError('No se pudieron cargar los datos. ' + errorMsg);
            setLoadingState('error');
        } else {
            const newInstitutionsMap = new Map<string, { id: string; phone?: string }>();
            institucionesRes.records.forEach(record => {
                const name = record.fields[FIELD_NOMBRE_INSTITUCIONES];
                if (name) {
                    newInstitutionsMap.set(normalizeStringForComparison(name as string), {
                        id: record.id,
                        phone: record.fields[FIELD_TELEFONO_INSTITUCIONES]
                    });
                }
            });
            setInstitutionsMap(newInstitutionsMap);

            const mappedRecords = lanzamientosRes.records.map((r: AirtableRecord<LanzamientoPPSFields>) => ({ ...r.fields as any, id: r.id } as LanzamientoPPS));
            const filteredRecords = mappedRecords.filter(pps => 
                !String(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').toLowerCase().includes('uflo')
            );
            setLanzamientos(filteredRecords);
            setLoadingState('loaded');
        }
    }, [isTestingMode]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSave = useCallback(async (id: string, updates: Partial<LanzamientoPPS>): Promise<boolean> => {
        setUpdatingIds(prev => new Set(prev).add(id));
        if (isTestingMode) {
             await new Promise(r => setTimeout(r, 500));
             setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
             return true;
        }
        const { error: updateError } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, id, updates);
        if (!updateError) fetchData();
        setUpdatingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        return !updateError;
    }, [fetchData, isTestingMode]);

    const handleUpdateInstitutionPhone = useCallback(async (institutionId: string, phone: string): Promise<boolean> => {
      if (isTestingMode) {
          return true;
      }
      const { error: updateError } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_INSTITUCIONES, institutionId, {
          [FIELD_TELEFONO_INSTITUCIONES]: phone
      });
      if (updateError) {
          setToastInfo({ message: 'Error al guardar el teléfono.', type: 'error' });
          return false;
      } else {
          setToastInfo({ message: 'Teléfono guardado exitosamente.', type: 'success' });
          setInstitutionsMap(prevMap => {
              const newMap = new Map(prevMap);
              for (const [key, value] of newMap.entries()) {
                  const instValue = value as { id: string, phone?: string };
                  if (instValue.id === institutionId) {
                      newMap.set(key, { ...instValue, phone });
                      break;
                  }
              }
              return newMap;
          });
          return true;
      }
    }, [isTestingMode]);

    const handleSync = async () => {
        alert("Esta función creará nuevos lanzamientos para prácticas antiguas. Use 'Reparar Vínculos' para arreglar enlaces existentes.");
    };
    
    // --- NEW FUNCTION: Link Orphan Practices ---
    const handleLinkOrphans = async () => {
        if (!window.confirm('Esta acción buscará prácticas sin vínculo técnico y las conectará al lanzamiento correcto (por Nombre y Fecha). Abrir la consola (F12) para ver detalles.')) {
            return;
        }
        
        setIsLinking(true);
        setToastInfo({ message: 'Procesando...', type: 'success' });
        
        // Allow UI to render toast
        await new Promise(r => setTimeout(r, 100));

        console.group("--- Vinculación de Huérfanos ---");
        
        try {
            // 1. Get all practices
            const { records: allPractices, error } = await fetchAllAirtableData<PracticaFields>(
                AIRTABLE_TABLE_NAME_PRACTICAS,
                practicaArraySchema,
                [
                    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
                    FIELD_FECHA_INICIO_PRACTICAS,
                    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS
                ]
            );

            if (error) throw new Error("Error al obtener prácticas: " + error);

            const orphans = allPractices.filter(p => {
                const links = p.fields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                return !links || (Array.isArray(links) && links.length === 0);
            });

            console.log(`Total Prácticas: ${allPractices.length}`);
            console.log(`Huérfanas: ${orphans.length}`);

            if (orphans.length === 0) {
                setToastInfo({ message: 'No hay prácticas huérfanas.', type: 'success' });
                setIsLinking(false);
                console.groupEnd();
                return;
            }

            // 2. Build Launch Map
            // Helper: Normalize Date (YYYY-MM-DD)
            const normalizeDate = (dateStr: any) => {
                if (!dateStr) return '';
                // Handle ISO strings or simple date strings
                return String(dateStr).split('T')[0].trim();
            };

            const launchMap = new Map<string, string>();
            
            lanzamientos.forEach(l => {
                const nameRaw = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                const dateRaw = l[FIELD_FECHA_INICIO_LANZAMIENTOS];
                
                const nameKey = normalizeStringForComparison(nameRaw);
                const dateKey = normalizeDate(dateRaw);
                
                if (nameKey && dateKey) {
                    // Create a composite key
                    const key = `${nameKey}::${dateKey}`;
                    launchMap.set(key, l.id);
                    // console.log(`Lanzamiento Indexado: ${key}`);
                }
            });
            
            console.log(`Lanzamientos indexados: ${launchMap.size}`);

            const updates: { id: string; fields: Partial<PracticaFields> }[] = [];
            
            orphans.forEach(p => {
                const nameRaw = p.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                // Handle lookup array vs string
                const nameStr = Array.isArray(nameRaw) ? nameRaw[0] : nameRaw;
                const dateRaw = p.fields[FIELD_FECHA_INICIO_PRACTICAS];

                const nameKey = normalizeStringForComparison(nameStr);
                const dateKey = normalizeDate(dateRaw);

                if (nameKey && dateKey) {
                    const key = `${nameKey}::${dateKey}`;
                    const launchId = launchMap.get(key);

                    if (launchId) {
                        console.log(`MATCH: Práctica "${nameStr}" (${dateKey}) -> Lanzamiento ID ${launchId}`);
                        updates.push({
                            id: p.id,
                            fields: { [FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]: [launchId] }
                        });
                    } else {
                        console.warn(`NO MATCH: Práctica "${nameStr}" (${dateKey}) - Key: ${key}`);
                        // Optional: Try loose matching on date (e.g. same month?)
                        // For now, strict date matching (ignoring time) is best to avoid false positives.
                    }
                } else {
                    console.log(`SKIPPED: Práctica ${p.id} sin nombre o fecha suficientes.`);
                }
            });

            console.log(`Se encontraron ${updates.length} coincidencias para vincular.`);

            if (updates.length > 0) {
                // Batch update
                const BATCH_SIZE = 10;
                for (let i = 0; i < updates.length; i += BATCH_SIZE) {
                    const batch = updates.slice(i, i + BATCH_SIZE);
                    await updateAirtableRecords(AIRTABLE_TABLE_NAME_PRACTICAS, batch);
                    console.log(`Lote ${i / BATCH_SIZE + 1} actualizado.`);
                }
                setToastInfo({ message: `Vinculación completada: ${updates.length} prácticas.`, type: 'success' });
                fetchData(); // Refresh UI
            } else {
                setToastInfo({ message: 'No se encontraron coincidencias automáticas.', type: 'error' });
            }

        } catch (e: any) {
            console.error(e);
            setToastInfo({ message: `Error: ${e.message}`, type: 'error' });
        } finally {
            console.groupEnd();
            setIsLinking(false);
        }
    };
    
    const filteredData = useMemo(() => {
         let processableItems = [...lanzamientos];

        if (forcedOrientations && forcedOrientations.length > 0) {
            const normalizedForced = forcedOrientations.map(normalizeStringForComparison);
            processableItems = processableItems.filter(pps => {
                const ppsOrientations = (pps[FIELD_ORIENTACION_LANZAMIENTOS] || '').split(',').map(o => normalizeStringForComparison(o.trim()));
                return ppsOrientations.some(o => normalizedForced.includes(o));
            });
        } else if (orientationFilter !== 'all') {
             processableItems = processableItems.filter(pps => normalizeStringForComparison(pps[FIELD_ORIENTACION_LANZAMIENTOS]) === normalizeStringForComparison(orientationFilter));
        }

        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            processableItems = processableItems.filter(pps => (pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').toLowerCase().includes(lowercasedTerm));
        }
        
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today

        // Priority 1: Active PPS (with end date)
        const activasYPorFinalizar = processableItems.filter(pps => {
            const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
            return endDate && endDate >= now;
        }).sort((a, b) => (parseToUTCDate(a[FIELD_FECHA_FIN_LANZAMIENTOS])?.getTime() || 0) - (parseToUTCDate(b[FIELD_FECHA_FIN_LANZAMIENTOS])?.getTime() || 0));

        // Priority 2: Active PPS (without end date) but recent
        const fiveMonthsAgo = new Date(now);
        fiveMonthsAgo.setMonth(now.getMonth() - 5);

        const activasIndefinidas = processableItems.filter(pps => {
            // Must not have an end date to be in this category
            const hasEndDate = !!pps[FIELD_FECHA_FIN_LANZAMIENTOS];
            if (hasEndDate) {
                return false;
            }

            const startDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            // Hide if no start date is present, or if the start date is older than 5 months
            return startDate ? startDate >= fiveMonthsAgo : false;
        });
        
        // Get all remaining PPS (i.e., finished ones)
        const finishedPps = processableItems.filter(pps => {
            const endDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
            return endDate && endDate < now;
        });
        
        // Priority 3: Confirmed Relaunches from the finished pile
        const relanzamientosConfirmados = finishedPps.filter(
            pps => pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'Relanzamiento Confirmado'
        );
        
        // Priority 4: Finished PPS needing action from the finished pile
        const finalizadasParaReactivar = finishedPps.filter(pps => {
            const status = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || '';
            return status !== 'Relanzamiento Confirmado' && status !== 'Archivado' && status !== 'No se Relanza';
        });

        return { activasYPorFinalizar, finalizadasParaReactivar, relanzamientosConfirmados, activasIndefinidas };
    }, [lanzamientos, searchTerm, orientationFilter, forcedOrientations]);

    return {
        institutionsMap,
        loadingState,
        error,
        toastInfo,
        setToastInfo,
        updatingIds,
        searchTerm,
        setSearchTerm,
        orientationFilter,
        setOrientationFilter,
        isSyncing,
        isLinking, // Export new state
        handleSave,
        handleUpdateInstitutionPhone,
        handleSync,
        handleLinkOrphans, // Export new function
        filteredData,
    };
};

interface ConvocatoriaManagerProps {
  forcedOrientations?: string[];
  isTestingMode?: boolean;
}

const ConvocatoriaManager: React.FC<ConvocatoriaManagerProps> = ({ forcedOrientations, isTestingMode = false }) => {
    const {
        institutionsMap,
        loadingState,
        error,
        toastInfo,
        setToastInfo,
        updatingIds,
        searchTerm,
        setSearchTerm,
        orientationFilter,
        setOrientationFilter,
        isSyncing,
        isLinking,
        handleSave,
        handleUpdateInstitutionPhone,
        handleSync,
        handleLinkOrphans,
        filteredData,
    } = useGestionConvocatorias({ forcedOrientations, isTestingMode });

    if (loadingState === 'loading' || loadingState === 'initial') return <div className="flex justify-center p-10"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message={error} />;

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
             <div className="p-4 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-4">
                 <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Panel de Gestión de Prácticas</h2>
                 <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <div className="relative w-full sm:w-72">
                        <input id="pps-filter" type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Filtrar por nombre de PPS..." className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500">search</span>
                    </div>
                 </div>
            </div>

             {filteredData.activasYPorFinalizar.length > 0 && (
                <div className="space-y-4">
                    {filteredData.activasYPorFinalizar.map(pps => (
                        <GestionCard 
                            key={pps.id} 
                            pps={pps} 
                            onSave={handleSave} 
                            isUpdating={updatingIds.has(pps.id)} 
                            cardType="activasYPorFinalizar" 
                            institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                            onSavePhone={handleUpdateInstitutionPhone} 
                        />
                    ))}
                </div>
            )}

            {filteredData.activasIndefinidas.length > 0 && (
                <CollapsibleSection 
                    title="Activas sin Fecha de Fin" 
                    count={filteredData.activasIndefinidas.length}
                    icon="hourglass_empty"
                    iconBgColor="bg-slate-200 dark:bg-slate-700"
                    iconColor="text-slate-600 dark:text-slate-300"
                    borderColor="border-slate-300 dark:border-slate-600"
                >
                    <div className="space-y-4 mt-4">
                         {filteredData.activasIndefinidas.map(pps => (
                            <GestionCard 
                                key={pps.id} 
                                pps={pps} 
                                onSave={handleSave} 
                                isUpdating={updatingIds.has(pps.id)} 
                                cardType="activasIndefinidas" 
                                institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                                onSavePhone={handleUpdateInstitutionPhone} 
                            />
                        ))}
                    </div>
                </CollapsibleSection>
            )}

             {filteredData.relanzamientosConfirmados.length > 0 && (
                <CollapsibleSection 
                    title="Relanzamientos Confirmados" 
                    count={filteredData.relanzamientosConfirmados.length}
                    icon="flight_takeoff"
                    iconBgColor="bg-indigo-100 dark:bg-indigo-900/50"
                    iconColor="text-indigo-600 dark:text-indigo-300"
                    borderColor="border-indigo-300 dark:border-indigo-600"
                >
                    <div className="space-y-4 mt-4">
                        {filteredData.relanzamientosConfirmados.map(pps => (
                            <GestionCard 
                                key={pps.id} 
                                pps={pps} 
                                onSave={handleSave} 
                                isUpdating={updatingIds.has(pps.id)} 
                                cardType="relanzamientosConfirmados" 
                                institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                                onSavePhone={handleUpdateInstitutionPhone} 
                            />
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {filteredData.finalizadasParaReactivar.length > 0 && (
                <CollapsibleSection 
                    title="Finalizadas (Para Reactivar)" 
                    count={filteredData.finalizadasParaReactivar.length}
                    icon="history"
                    iconBgColor="bg-slate-100 dark:bg-slate-800"
                    iconColor="text-slate-500 dark:text-slate-400"
                    borderColor="border-slate-300 dark:border-slate-700"
                    defaultOpen={false}
                >
                    <div className="space-y-4 mt-4">
                        {filteredData.finalizadasParaReactivar.map(pps => (
                            <GestionCard 
                                key={pps.id} 
                                pps={pps} 
                                onSave={handleSave} 
                                isUpdating={updatingIds.has(pps.id)} 
                                cardType="finalizadasParaReactivar" 
                                institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                                onSavePhone={handleUpdateInstitutionPhone} 
                            />
                        ))}
                    </div>
                </CollapsibleSection>
            )}

             <CollapsibleSection 
                title="Acciones Avanzadas" 
                count={2}
                icon="build_circle"
                iconBgColor="bg-rose-100 dark:bg-rose-900/50"
                iconColor="text-rose-600 dark:text-rose-300"
                borderColor="border-rose-300 dark:border-rose-600"
                defaultOpen={true}
            >
                <div className="space-y-4 mt-4">
                    {/* Sync Tool */}
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Sincronizar Prácticas Antiguas</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-lg mt-1">
                                Crea registros de "Lanzamiento" para prácticas de los últimos 2 años que no lo tengan.
                            </p>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || isTestingMode}
                            className="bg-rose-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-rose-700"
                        >
                            <span className="material-icons">{isSyncing ? 'sync' : 'history'}</span>
                            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
                        </button>
                    </div>

                    {/* Link Tool (NEW) */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                        <div>
                            <h4 className="font-semibold text-blue-800 dark:text-blue-100">Vincular Prácticas Huérfanas</h4>
                            <p className="text-sm text-blue-600 dark:text-blue-300 max-w-lg mt-1">
                                Busca prácticas sin ID de lanzamiento y las conecta automáticamente si el Nombre y la Fecha coinciden exactamente.
                            </p>
                        </div>
                        <button
                            onClick={handleLinkOrphans}
                            disabled={isLinking || isTestingMode}
                            className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700"
                        >
                            <span className="material-icons">{isLinking ? 'autorenew' : 'link'}</span>
                            <span>{isLinking ? 'Vinculando...' : 'Reparar Vínculos'}</span>
                        </button>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default ConvocatoriaManager;
