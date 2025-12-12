
import { useState, useEffect, useMemo, useCallback } from 'react';
import { fetchAllData, updateRecord, createRecord, updateRecords } from '../services/supabaseService';
import type { LanzamientoPPS, InstitucionFields, LanzamientoPPSFields, PracticaFields } from '../types';
import {
  TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_ESTADO_GESTION_LANZAMIENTOS,
  FIELD_NOTAS_GESTION_LANZAMIENTOS,
  FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
  TABLE_NAME_PRACTICAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_HORAS_PRACTICAS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_TELEFONO_INSTITUCIONES,
  FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import { lanzamientoPPSArraySchema, institucionArraySchema, practicaArraySchema } from '../schemas';

// MOCK DATA FOR TESTING
const mockLanzamientos: any[] = [
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
export type FilterType = 'all' | 'vencidas' | 'proximas';

const getGroupName = (name: unknown): string => {
    const strName = String(name || '');
    if (!strName) return 'Sin Nombre';
    return strName.split(' - ')[0].trim();
};

interface UseGestionConvocatoriasProps {
    forcedOrientations?: string[];
    isTestingMode?: boolean;
    initialFilter?: FilterType;
}

export const useGestionConvocatorias = ({ forcedOrientations, isTestingMode = false, initialFilter = 'all' }: UseGestionConvocatoriasProps) => {
    const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
    const [institutionsMap, setInstitutionsMap] = useState<Map<string, { id: string; phone?: string }>>(new Map());
    const [loadingState, setLoadingState] = useState<LoadingState>('initial');
    const [error, setError] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [orientationFilter, setOrientationFilter] = useState('all');
    const [filterType, setFilterType] = useState<FilterType>(initialFilter);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isLinking, setIsLinking] = useState(false);

    // Update filterType when initialFilter changes (e.g. from navigation)
    useEffect(() => {
        if (initialFilter) setFilterType(initialFilter);
    }, [initialFilter]);

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
            fetchAllData<LanzamientoPPSFields>(
                TABLE_NAME_LANZAMIENTOS_PPS,
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
                undefined, // No filters needed, processing in memory
                [{ field: FIELD_FECHA_FIN_LANZAMIENTOS, direction: 'desc' }]
            ),
            fetchAllData<InstitucionFields>(
                TABLE_NAME_INSTITUCIONES,
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
                const name = record[FIELD_NOMBRE_INSTITUCIONES];
                if (name) {
                    newInstitutionsMap.set(normalizeStringForComparison(name as string), {
                        id: record.id,
                        phone: record[FIELD_TELEFONO_INSTITUCIONES]
                    });
                }
            });
            setInstitutionsMap(newInstitutionsMap);

            const mappedRecords = lanzamientosRes.records.map(r => r as LanzamientoPPS);
            
            const currentYear = new Date().getFullYear(); 
            // We assume "current cycle" means 2025 data to prep for 2026.
            const filterYear = 2025; 

            const filteredRecords = mappedRecords.filter(pps => {
                const name = String(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '');
                if (name.toLowerCase().includes('uflo')) return false;

                const startDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                if (!startDate) return false;

                // Keep if it's from 2025+ OR if it's explicitly marked for management
                const isRelevantDate = startDate.getUTCFullYear() >= filterYear;
                const isManaged = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] && 
                                  pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] !== 'Pendiente de Gestión' && 
                                  pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] !== 'Archivado';

                return isRelevantDate || isManaged;
            });

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
            console.log("TEST MODE: Simulating save for", id, updates);
            await new Promise(resolve => setTimeout(resolve, 500));
            setLanzamientos(prev => prev.map(pps => pps.id === id ? { ...pps, ...updates } : pps));
            setToastInfo({ message: 'Cambios (simulados) guardados.', type: 'success' });
            setUpdatingIds(prev => { const newSet = new Set(prev); newSet.delete(id); return newSet; });
            return true;
        }

        const { error: updateError } = await updateRecord(TABLE_NAME_LANZAMIENTOS_PPS, id, updates);
        
        let success = false;
        if (updateError) {
            setToastInfo({ message: 'Error al actualizar la práctica.', type: 'error' });
        } else {
            setToastInfo({ message: 'Práctica actualizada exitosamente.', type: 'success' });
            fetchData();
            success = true;
        }

        setUpdatingIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
        });

        return success;
    }, [fetchData, isTestingMode]);

    const handleUpdateInstitutionPhone = useCallback(async (institutionId: string, phone: string): Promise<boolean> => {
      if (isTestingMode) {
          console.log("TEST MODE: Simulating phone update for", institutionId, phone);
          await new Promise(resolve => setTimeout(resolve, 500));
          setInstitutionsMap(prev => {
              const newMap = new Map(prev);
              for (const [key, val] of newMap.entries()) {
                  const instValue = val as { id: string; phone?: string };
                  if (instValue.id === institutionId) {
                      newMap.set(key, { ...instValue, phone });
                      break;
                  }
              }
              return newMap;
          });
          setToastInfo({ message: 'Teléfono (simulado) guardado.', type: 'success' });
          return true;
      }

      const { error: updateError } = await updateRecord(TABLE_NAME_INSTITUCIONES, institutionId, {
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
        setIsSyncing(true);
        setTimeout(() => setIsSyncing(false), 1000);
    };

    const handleLinkOrphans = async () => {
        setIsLinking(true);
        setTimeout(() => setIsLinking(false), 1000);
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
        
        // Priority 1: Confirmed Relaunches (For Calendar/Planning)
        // AND anything that is clearly for the Next Cycle (2026+) based on Start Date
        const relanzamientosConfirmados = processableItems.filter(pps => {
            const status = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS];
            const startDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            
            // Explicitly confirmed
            if (status === 'Relanzamiento Confirmado') return true;
            
            // Implicitly confirmed because it's scheduled for 2026+
            if (startDate && startDate.getUTCFullYear() >= 2026) return true;
            
            return false;
        });

        // CREATE A SET OF CONFIRMED INSTITUTION NAMES TO AVOID DUPLICATES IN PENDING LIST
        // This ensures that if "Fundación X" has a 2026 record, the old 2025 expired record is hidden.
        const confirmedNames = new Set(relanzamientosConfirmados.map(r => 
            normalizeStringForComparison(getGroupName(r[FIELD_NOMBRE_PPS_LANZAMIENTOS]))
        ));

        // Priority 2: PENDIENTES DE GESTIÓN (Unified Inbox for 2026)
        const pendingMap = new Map<string, LanzamientoPPS & { daysLeft?: number }>();
        const now = new Date();

        processableItems.forEach(pps => {
            // Skip if it's already in the Confirmed list (by ID) to avoid dupes if logic overlaps
            if (relanzamientosConfirmados.some(c => c.id === pps.id)) return;

            const status = pps[FIELD_ESTADO_GESTION_LANZAMIENTOS] || '';
            if (status === 'Archivado' || status === 'No se Relanza') {
                return;
            }

            const name = pps[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (!name) return;
            
            const groupName = getGroupName(name);
            const normalizedKey = normalizeStringForComparison(groupName);

            // LOGIC CHANGE: If this institution already has a confirmed/2026 relaunch, do NOT add older records to pending.
            if (confirmedNames.has(normalizedKey)) {
                return;
            }

            // Calculate urgency
            const endDateStr = pps[FIELD_FECHA_FIN_LANZAMIENTOS];
            const endDate = parseToUTCDate(endDateStr);
            const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 999;

            if (!pendingMap.has(normalizedKey)) {
                pendingMap.set(normalizedKey, { ...pps, daysLeft });
            } else {
                // If we have duplicates (shifts), keep the one with lowest daysLeft (most urgent)
                const existing = pendingMap.get(normalizedKey)!;
                if (daysLeft < (existing.daysLeft || 999)) {
                    pendingMap.set(normalizedKey, { ...pps, daysLeft });
                }
            }
        });
        
        let pendientesDeGestion = Array.from(pendingMap.values());
        
        // --- FILTER BY URGENCY ---
        if (filterType === 'vencidas') {
            pendientesDeGestion = pendientesDeGestion.filter(p => (p.daysLeft !== undefined && p.daysLeft < 0));
        } else if (filterType === 'proximas') {
            pendientesDeGestion = pendientesDeGestion.filter(p => (p.daysLeft !== undefined && p.daysLeft >= 0 && p.daysLeft <= 30));
        }

        // Sort: Urgent first, then alphabetical
        pendientesDeGestion.sort((a, b) => {
             const dlA = a.daysLeft !== undefined ? a.daysLeft : 999;
             const dlB = b.daysLeft !== undefined ? b.daysLeft : 999;
             if (Math.abs(dlA) !== Math.abs(dlB)) return dlA - dlB;

             const nameA = a[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
             const nameB = b[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
             return nameA.localeCompare(nameB);
        });

        return { 
            relanzamientosConfirmados, 
            pendientesDeGestion,
            // Legacy empty arrays to satisfy interface if needed elsewhere
            activasYPorFinalizar: [], 
            finalizadasParaReactivar: [], 
            activasIndefinidas: [] 
        };
    }, [lanzamientos, searchTerm, orientationFilter, forcedOrientations, filterType]);

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
        filterType,
        setFilterType,
        isSyncing,
        isLinking,
        handleSave,
        handleUpdateInstitutionPhone,
        handleSync,
        handleLinkOrphans,
        filteredData,
    };
};
