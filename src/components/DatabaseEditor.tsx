
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { schema } from '../lib/dbSchema';
import type { AppRecord, LanzamientoPPSFields, InstitucionFields, AirtableRecord, EstudianteFields } from '../types';
import SubTabs from './SubTabs';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import RecordEditModal from './RecordEditModal';
import DuplicateToStudentModal from './DuplicateToStudentModal';
import AdminSearch from './AdminSearch';
import { formatDate, getEspecialidadClasses, normalizeStringForComparison } from '../utils/formatters';
import Card from './Card';
import { ALL_ORIENTACIONES } from '../types';
import { 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_PPS_LANZAMIENTOS, 
    FIELD_ESTUDIANTE_LINK_PRACTICAS, 
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, 
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, 
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_DNI_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
    FIELD_NOTAS_INTERNAS_ESTUDIANTES,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_NOTA_PRACTICAS,
    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_TELEFONO_INSTITUCIONES,
    FIELD_DIRECCION_INSTITUCIONES,
    FIELD_CONVENIO_NUEVO_INSTITUCIONES,
    FIELD_TUTOR_INSTITUCIONES,
    FIELD_FINALIZARON_ESTUDIANTES,
    TABLE_NAME_PRACTICAS,
    TABLE_NAME_ESTUDIANTES,
    TABLE_NAME_INSTITUCIONES,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_NOMBRE_SEPARADO_ESTUDIANTES,
    FIELD_APELLIDO_SEPARADO_ESTUDIANTES
} from '../constants';

interface FieldConfig {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'checkbox';
    options?: readonly string[] | { value: string; label: string }[];
}

interface TableConfig {
    label: string;
    icon: string;
    tableName: string; // Real DB table name
    schema: any;
    fieldConfig: FieldConfig[];
    displayFields: string[];
    searchFields: string[];
}

// Base configuration without dynamic data
const EDITABLE_TABLES: Record<string, TableConfig> = {
    estudiantes: { 
        label: 'Estudiantes', 
        icon: 'school', 
        tableName: TABLE_NAME_ESTUDIANTES,
        schema: schema.estudiantes,
        displayFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_FINALIZARON_ESTUDIANTES],
        searchFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_NOMBRE_SEPARADO_ESTUDIANTES, FIELD_APELLIDO_SEPARADO_ESTUDIANTES],
        fieldConfig: [
            { key: FIELD_LEGAJO_ESTUDIANTES, label: 'Legajo', type: 'text' },
            { key: FIELD_NOMBRE_SEPARADO_ESTUDIANTES, label: 'Nombre (Pila)', type: 'text' },
            { key: FIELD_APELLIDO_SEPARADO_ESTUDIANTES, label: 'Apellido', type: 'text' },
            { key: FIELD_DNI_ESTUDIANTES, label: 'DNI', type: 'number' },
            { key: FIELD_CORREO_ESTUDIANTES, label: 'Correo', type: 'email' },
            { key: FIELD_TELEFONO_ESTUDIANTES, label: 'Teléfono', type: 'tel' },
            { key: FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, label: 'Orientación Elegida', type: 'select', options: ['', 'Clinica', 'Educacional', 'Laboral', 'Comunitaria'] },
            { key: FIELD_NOTAS_INTERNAS_ESTUDIANTES, label: 'Notas Internas', type: 'textarea' },
            { key: FIELD_FINALIZARON_ESTUDIANTES, label: 'Finalizó PPS', type: 'checkbox' },
            // Nombre Completo se mantiene para visualización pero no se edita directamente para priorizar separados
            { key: FIELD_NOMBRE_ESTUDIANTES, label: 'Nombre Completo (Auto)', type: 'text' }, 
        ]
    },
    practicas: {
        label: 'Prácticas',
        icon: 'work_history',
        tableName: TABLE_NAME_PRACTICAS,
        schema: schema.practicas,
        displayFields: ['__studentName', '__lanzamientoName', FIELD_ESPECIALIDAD_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_ESTADO_PRACTICA],
        searchFields: [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS],
        fieldConfig: [
            { key: FIELD_ESTUDIANTE_LINK_PRACTICAS, label: 'ID Estudiante (UUID)', type: 'text' }, 
            { key: FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, label: 'ID Lanzamiento (UUID)', type: 'text' },
            { key: FIELD_FECHA_INICIO_PRACTICAS, label: 'Fecha Inicio', type: 'date' },
            { key: FIELD_FECHA_FIN_PRACTICAS, label: 'Fecha Fin', type: 'date' },
            { key: FIELD_HORAS_PRACTICAS, label: 'Horas Acreditadas', type: 'number' },
            { key: FIELD_ESTADO_PRACTICA, label: 'Estado', type: 'select', options: ['En curso', 'Finalizada', 'Convenio Realizado', 'No se pudo concretar'] },
            { key: FIELD_ESPECIALIDAD_PRACTICAS, label: 'Especialidad', type: 'select', options: ALL_ORIENTACIONES },
            { key: FIELD_NOTA_PRACTICAS, label: 'Nota', type: 'select', options: ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'] },
        ]
    },
    instituciones: { 
        label: 'Instituciones', 
        icon: 'apartment', 
        tableName: TABLE_NAME_INSTITUCIONES,
        schema: schema.instituciones,
        displayFields: [FIELD_NOMBRE_INSTITUCIONES, FIELD_DIRECCION_INSTITUCIONES, FIELD_TELEFONO_INSTITUCIONES, FIELD_TUTOR_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES],
        searchFields: [FIELD_NOMBRE_INSTITUCIONES, FIELD_DIRECCION_INSTITUCIONES],
        fieldConfig: [
            { key: FIELD_NOMBRE_INSTITUCIONES, label: 'Nombre', type: 'text' },
            { key: FIELD_TELEFONO_INSTITUCIONES, label: 'Teléfono', type: 'tel' },
            { key: FIELD_DIRECCION_INSTITUCIONES, label: 'Dirección', type: 'text' },
            { key: FIELD_CONVENIO_NUEVO_INSTITUCIONES, label: 'Convenio Nuevo', type: 'checkbox' },
            { key: FIELD_TUTOR_INSTITUCIONES, label: 'Tutor', type: 'text' },
        ]
    },
};

type TableKey = keyof typeof EDITABLE_TABLES;

interface ContextMenuProps {
    x: number;
    y: number;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onClose: () => void;
    isPracticaTable?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onEdit, onDuplicate, onDelete, onClose, isPracticaTable }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    return (
        <div 
            ref={menuRef}
            className="fixed z-[100] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px] animate-fade-in text-sm"
            style={{ top: y, left: x }}
        >
            <button onClick={onEdit} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span className="material-icons !text-base">edit</span> Editar
            </button>
            <button onClick={onDuplicate} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span className="material-icons !text-base">content_copy</span> {isPracticaTable ? 'Duplicar a otro Alumno' : 'Duplicar'}
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1"></div>
            <button onClick={onDelete} className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2">
                <span className="material-icons !text-base">delete</span> Eliminar
            </button>
        </div>
    );
};

interface DatabaseEditorProps {
  isTestingMode?: boolean;
}

const ITEMS_PER_PAGE_OPTIONS = [10, 25, 50];

const SortableHeader: React.FC<{
  label: string;
  sortKey: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  requestSort: (key: string) => void;
  className?: string;
  hasCheckbox?: boolean;
  onSelectAll?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  allSelected?: boolean;
}> = ({ label, sortKey, sortConfig, requestSort, className = "text-left", hasCheckbox, onSelectAll, allSelected }) => {
  const isActive = sortConfig.key === sortKey;
  const icon = isActive ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';
  
  return (
    <th
      scope="col"
      className={`px-6 py-3 select-none group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
    >
        <div className="flex items-center gap-3">
            {hasCheckbox && (
                <input 
                    type="checkbox" 
                    checked={allSelected} 
                    onChange={onSelectAll}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                />
            )}
            <button onClick={() => requestSort(sortKey)} className="flex items-center gap-2 focus:outline-none">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
                <span className={`material-icons !text-sm transition-opacity ${isActive ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-30 group-hover:opacity-70'}`}>{icon}</span>
            </button>
        </div>
    </th>
  );
};

const PaginationControls: React.FC<{
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage: number;
    onItemsPerPageChange: (items: number) => void;
    totalItems: number;
}> = ({ currentPage, totalPages, onPageChange, itemsPerPage, onItemsPerPageChange, totalItems }) => (
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Filas por pág:</span>
            <select 
                value={itemsPerPage} 
                onChange={(e) => { onItemsPerPageChange(Number(e.target.value)); onPageChange(1); }}
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
            >
                {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="hidden sm:inline">
                | Total: <strong>{totalItems}</strong> registros
            </span>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
                <span className="material-icons">chevron_left</span>
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Pág {currentPage} de {totalPages || 1}
            </span>
            <button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
                <span className="material-icons">chevron_right</span>
            </button>
        </div>
    </div>
);

const cleanDisplayValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str.replace(/[\[\]\{\}"]/g, '').trim();
};


const DatabaseEditor: React.FC<DatabaseEditorProps> = ({ isTestingMode = false }) => {
    const [activeTable, setActiveTable] = useState<TableKey>('estudiantes');
    const [editingRecord, setEditingRecord] = useState<AppRecord<any> | { isCreating: true; initialData?: any } | null>(null);
    const [duplicateTargetRecord, setDuplicateTargetRecord] = useState<AppRecord<any> | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: AppRecord<any> } | null>(null);
    
    // Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const [estudianteSearchSelection, setEstudianteSearchSelection] = useState<string>(''); // Legajo para el filtro de Estudiantes

    const [filterStudentId, setFilterStudentId] = useState<string>('');
    const [selectedStudentLabel, setSelectedStudentLabel] = useState<string>('');

    const [filterInstitutionId, setFilterInstitutionId] = useState<string>('');
    const [filterLaunchId, setFilterLaunchId] = useState<string>('');

    // Filter Data State
    const [allInstitutions, setAllInstitutions] = useState<AirtableRecord<InstitucionFields>[]>([]);
    const [availableLaunches, setAvailableLaunches] = useState<AirtableRecord<LanzamientoPPSFields>[]>([]);
    
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    
    // Bulk Actions State
    const [isBulkEditMode, setIsBulkEditMode] = useState(false);
    const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
    const [bulkStatus, setBulkStatus] = useState('');
    
    const queryClient = useQueryClient();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset state on table change
    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm('');
        setEstudianteSearchSelection(''); // Reset specific student filter
        setFilterStudentId('');
        setSelectedStudentLabel('');
        setFilterInstitutionId('');
        setFilterLaunchId('');
        setContextMenu(null);
        setIsBulkEditMode(false);
        setSelectedRowIds(new Set());
    }, [activeTable]);

    // Load Filter Data for Practicas (Institutions)
    useEffect(() => {
        if (activeTable === 'practicas' && !isTestingMode) {
            db.instituciones.getAll({ fields: [FIELD_NOMBRE_INSTITUCIONES] }).then(recs => {
                // Sort alphabetically
                const sorted = recs.sort((a, b) => (a[FIELD_NOMBRE_INSTITUCIONES] || '').localeCompare(b[FIELD_NOMBRE_INSTITUCIONES] || ''));
                setAllInstitutions(sorted);
            });
        }
    }, [activeTable, isTestingMode]);

    // Load Launches when Institution is selected
    useEffect(() => {
        // Reset launch filter when institution changes to prevent invalid state
        setFilterLaunchId('');

        if (filterInstitutionId && !isTestingMode) {
             const institution = allInstitutions.find(i => i.id === filterInstitutionId);
             const instName = institution?.[FIELD_NOMBRE_INSTITUCIONES];
             if (instName) {
                 db.lanzamientos.getAll({
                     fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS]
                 }).then(recs => {
                     const filtered = recs.filter(l => {
                         const ppsName = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                         return normalizeStringForComparison(ppsName).includes(normalizeStringForComparison(instName));
                     }).sort((a, b) => {
                         const dateA = new Date(a[FIELD_FECHA_INICIO_LANZAMIENTOS] || 0).getTime();
                         const dateB = new Date(b[FIELD_FECHA_INICIO_LANZAMIENTOS] || 0).getTime();
                         return dateB - dateA;
                     });
                     setAvailableLaunches(filtered);
                 });
             }
        } else {
            setAvailableLaunches([]);
        }
    }, [filterInstitutionId, allInstitutions, isTestingMode]);


    const activeTableConfig = EDITABLE_TABLES[activeTable];
    
    // Construct Filters for DB Query
    const dbFilters = useMemo(() => {
        const filters: Record<string, any> = {};
        
        if (activeTable === 'practicas') {
            if (filterStudentId) filters[FIELD_ESTUDIANTE_LINK_PRACTICAS] = filterStudentId;
            
            if (filterLaunchId) {
                const launch = availableLaunches.find(l => l.id === filterLaunchId);
                if (launch) {
                    const compositeValue = `${launch.id}|${launch[FIELD_NOMBRE_PPS_LANZAMIENTOS]}|${launch[FIELD_FECHA_INICIO_LANZAMIENTOS]}`;
                    filters[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] = compositeValue;
                } else {
                    filters[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] = filterLaunchId;
                }
            } else if (filterInstitutionId) {
                const inst = allInstitutions.find(i => i.id === filterInstitutionId);
                if (inst) filters[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] = inst[FIELD_NOMBRE_INSTITUCIONES];
            }
        } else if (activeTable === 'estudiantes') {
            if (estudianteSearchSelection) {
                filters[FIELD_LEGAJO_ESTUDIANTES] = estudianteSearchSelection;
            }
        }
        return filters;
    }, [activeTable, filterStudentId, filterLaunchId, filterInstitutionId, allInstitutions, availableLaunches, estudianteSearchSelection]);

    const queryKey = ['databaseEditor', activeTable, currentPage, itemsPerPage, sortConfig, debouncedSearch, dbFilters, isTestingMode];

    const { data: queryResult, isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
             if (isTestingMode) return { records: [], total: 0 };

            const { records, total, error } = await db[activeTable].getPage(
                currentPage,
                itemsPerPage,
                {
                    searchTerm: debouncedSearch,
                    searchFields: activeTableConfig.searchFields,
                    sort: sortConfig.key ? { field: sortConfig.key, direction: sortConfig.direction } : undefined,
                    filters: dbFilters
                }
            );

            if (error) throw new Error(error.error as string);

            // Special handling for "practicas" joins to display friendly names
            if (activeTable === 'practicas' && records.length > 0) {
                const studentIds = [...new Set(records.map(r => {
                    const raw = r[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                    return Array.isArray(raw) ? raw[0] : raw;
                }).filter(Boolean))] as string[];

                const launchIds = [...new Set(records.map(r => {
                    const raw = r[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                    return Array.isArray(raw) ? raw[0] : raw;
                }).filter(Boolean))] as string[];

                const [estudiantesRes, lanzamientosRes] = await Promise.all([
                    db.estudiantes.getAll({ filters: { id: studentIds }, fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES] }),
                    db.lanzamientos.getAll({ filters: { id: launchIds }, fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS] })
                ]);
    
                const estudiantesMap = new Map(estudiantesRes.map(r => [r.id, r]));
                const lanzamientosMap = new Map(lanzamientosRes.map(r => [r.id, r]));
    
                const enrichedRecords = records.map(p => {
                    const rawStudentId = p[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                    const studentId = Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId;
                    
                    const rawLanzamientoId = p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                    const lanzamientoId = Array.isArray(rawLanzamientoId) ? rawLanzamientoId[0] : rawLanzamientoId;
                    
                    const student = estudiantesMap.get(studentId as string);
                    const studentName = student?.[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido';
                    const studentLegajo = student?.[FIELD_LEGAJO_ESTUDIANTES] || '---';
                    
                    const lanzamientoName = lanzamientosMap.get(lanzamientoId as string)?.[FIELD_NOMBRE_PPS_LANZAMIENTOS] || cleanDisplayValue(p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'N/A';
    
                    return {
                        ...p,
                        __studentName: `${studentName} (${studentLegajo})`,
                        __lanzamientoName: lanzamientoName
                    };
                });
                return { records: enrichedRecords, total };
            }
            
            return { records, total };
        },
        placeholderData: (previousData: any) => previousData,
    });

    const records = queryResult?.records || [];
    const totalItems = queryResult?.total || 0;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const prepareFields = (fields: any) => {
        // Generar Nombre Completo automáticamente si es la tabla de estudiantes
        if (activeTable === 'estudiantes') {
            const nombre = fields[FIELD_NOMBRE_SEPARADO_ESTUDIANTES] || '';
            const apellido = fields[FIELD_APELLIDO_SEPARADO_ESTUDIANTES] || '';
            if (nombre && apellido) {
                // Formato: Nombre Apellido
                fields[FIELD_NOMBRE_ESTUDIANTES] = `${nombre.trim()} ${apellido.trim()}`;
            }
        }
        return fields;
    };

    // Mutations
    const updateMutation = useMutation({
        mutationFn: ({ recordId, fields }: { recordId: string, fields: any }) => {
            const preparedFields = prepareFields(fields);
            return db[activeTable].update(recordId, preparedFields);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Registro actualizado.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] });
            setEditingRecord(null);
        },
        onError: (e) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
    });

    const createMutation = useMutation({
        mutationFn: (fields: any) => {
            const preparedFields = prepareFields(fields);
            return db[activeTable].create(preparedFields);
        },
        onSuccess: () => {
             setToastInfo({ message: 'Registro creado.', type: 'success' });
             setEditingRecord(null);
             setDuplicateTargetRecord(null);
             queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] }); 
        },
        onError: (e) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (recordId: string) => db[activeTable].delete(recordId),
        onSuccess: () => {
            setToastInfo({ message: 'Registro eliminado.', type: 'success' });
            setContextMenu(null);
            setSelectedRowId(null);
            queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] });
        },
        onError: (e) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async (updates: { id: string, fields: any }[]) => {
            return db[activeTable].updateMany(updates);
        },
        onSuccess: (data) => {
            setToastInfo({ message: `${data?.length || 0} registros actualizados.`, type: 'success' });
            setSelectedRowIds(new Set());
            setIsBulkEditMode(false);
            queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] });
        },
        onError: (e) => setToastInfo({ message: `Error en actualización masiva: ${e.message}`, type: 'error' }),
    });

    const tableTabs = Object.entries(EDITABLE_TABLES).map(([key, { label, icon }]) => ({ id: key, label, icon }));

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1);
    };
    
    const handleRowContextMenu = (e: React.MouseEvent, record: AppRecord<any>) => {
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, record });
    };

    const handleDelete = (recordId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
            deleteMutation.mutate(recordId);
        }
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            const ids = new Set<string>(records.map((r: any) => String(r.id)));
            setSelectedRowIds(ids);
        } else {
            setSelectedRowIds(new Set());
        }
    };

    const handleRowSelect = (id: string) => {
        const newSet = new Set(selectedRowIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedRowIds(newSet);
    };

    const handleBulkUpdateStatus = () => {
        if (!bulkStatus) return;
        const updates = Array.from(selectedRowIds).map(id => ({
            id,
            fields: { [FIELD_ESTADO_PRACTICA]: bulkStatus }
        }));
        bulkUpdateMutation.mutate(updates);
    };

    const handleDuplicateWithStudent = (studentId: string) => {
        if (!duplicateTargetRecord) return;
        
        const { id, createdTime, created_at, ...originalFields } = duplicateTargetRecord;
        const newFields: any = { ...originalFields };
        
        // Override with new student ID
        newFields[FIELD_ESTUDIANTE_LINK_PRACTICAS] = [studentId];
        
        // Remove computed
        delete newFields['__studentName'];
        delete newFields['__lanzamientoName'];

        createMutation.mutate(newFields);
    };
    
    const handleSimpleDuplicate = (record: AppRecord<any>) => {
         const { id, createdTime, created_at, ...originalFields } = record;
         const newFields: any = { ...originalFields };
         
         const primaryKey = activeTableConfig.displayFields[0];
         if (newFields[primaryKey] && typeof newFields[primaryKey] === 'string') {
             newFields[primaryKey] += ' (Copia)';
         }
         
         delete newFields['__studentName'];
         delete newFields['__lanzamientoName'];
         
         createMutation.mutate(newFields);
    };


    const renderCellValue = (record: AppRecord<any>, fieldConfig: any) => {
        const key = fieldConfig.key;
        let value = record[key];

        if (fieldConfig.type === 'checkbox') {
            return value ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">Sí</span>
            ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">No</span>
            );
        }

        if (fieldConfig.type === 'date') {
            return <span className="font-mono text-xs whitespace-nowrap">{formatDate(value)}</span>;
        }
        
        if (key === FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES || key === FIELD_ESPECIALIDAD_PRACTICAS) {
            if (!value) return <span className="text-slate-400">-</span>;
            const visuals = getEspecialidadClasses(String(value));
            return <span className={`${visuals.tag} whitespace-nowrap shadow-none border-0`}>{String(value)}</span>;
        }

        return <span className="truncate block max-w-[200px]" title={String(value || '')}>{String(value || '')}</span>;
    };

    // --- Student Selection Handler ---
    const handleStudentSearchSelect = (student: AirtableRecord<any>) => {
        // Al seleccionar en el AdminSearch (dentro de la pestaña Estudiantes), filtramos la tabla por ese legajo
        // en lugar de usar la búsqueda global que falla con números.
        setSearchTerm(''); // Clear text search
        setEstudianteSearchSelection(student[FIELD_LEGAJO_ESTUDIANTES] || '');
        setCurrentPage(1);
    };
    
    // Handler for clearing the specific student filter in Estudiantes tab
    const clearEstudianteFilter = () => {
        setEstudianteSearchSelection('');
        setSearchTerm('');
        setDebouncedSearch('');
    };

    const handleStudentSelect = (student: AirtableRecord<any>) => {
        setFilterStudentId(student.id);
        setSelectedStudentLabel(`${student[FIELD_NOMBRE_ESTUDIANTES]} (${student[FIELD_LEGAJO_ESTUDIANTES]})`);
    };

    const clearStudentFilter = () => {
        setFilterStudentId('');
        setSelectedStudentLabel('');
        // Also clear search term if user wants to start fresh
        setSearchTerm(''); 
    };

    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);


    return (
        <Card title="Editor de Base de Datos" icon="storage">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={() => { setEditingRecord(contextMenu.record); setContextMenu(null); }}
                    onDuplicate={() => {
                        if (activeTable === 'practicas') {
                             setDuplicateTargetRecord(contextMenu.record);
                        } else {
                             handleSimpleDuplicate(contextMenu.record);
                        }
                        setContextMenu(null);
                    }}
                    onDelete={() => { handleDelete(contextMenu.record.id); setContextMenu(null); }}
                    onClose={() => setContextMenu(null)}
                    isPracticaTable={activeTable === 'practicas'}
                />
            )}
            
            {duplicateTargetRecord && (
                <DuplicateToStudentModal 
                    isOpen={!!duplicateTargetRecord}
                    onClose={() => setDuplicateTargetRecord(null)}
                    onConfirm={handleDuplicateWithStudent}
                    sourceRecordLabel={
                        (duplicateTargetRecord as any).__lanzamientoName || 
                        duplicateTargetRecord[activeTableConfig.displayFields[0]] || 
                        'Registro'
                    }
                />
            )}

            <div className="mt-4">
                <SubTabs 
                    tabs={tableTabs} 
                    activeTabId={activeTable} 
                    onTabChange={(id) => { setActiveTable(id as TableKey); setSearchTerm(''); setEstudianteSearchSelection(''); setSortConfig({ key: '', direction: 'asc' }); }} 
                />
            </div>

            <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700/60 pt-6 space-y-4">
                
                {/* --- FILTER BAR FOR PRACTICAS --- */}
                {activeTable === 'practicas' && (
                    <div className="bg-blue-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-blue-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in">
                        
                        {/* Student Filter */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Filtrar por Estudiante</label>
                            
                            {filterStudentId ? (
                                <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-blue-200 dark:border-blue-700/50 shadow-sm animate-fade-in">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">
                                            <span className="material-icons !text-sm">person</span>
                                        </div>
                                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                                            {selectedStudentLabel}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={clearStudentFilter}
                                        className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                                        title="Borrar filtro"
                                    >
                                        <span className="material-icons !text-base">close</span>
                                    </button>
                                </div>
                            ) : (
                                <AdminSearch 
                                    onStudentSelect={handleStudentSelect}
                                    isTestingMode={isTestingMode}
                                />
                            )}
                        </div>
                        
                        {/* Institution/Date Filters */}
                        <div className="flex flex-col gap-2">
                             <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">1. Institución</label>
                                <select 
                                    value={filterInstitutionId} 
                                    onChange={(e) => { setFilterInstitutionId(e.target.value); }}
                                    className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                >
                                    <option value="">Todas las instituciones</option>
                                    {allInstitutions.map(i => (
                                        <option key={i.id} value={i.id}>{i[FIELD_NOMBRE_INSTITUCIONES]}</option>
                                    ))}
                                </select>
                            </div>
                            {filterInstitutionId && (
                                <div className="animate-fade-in">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">2. Convocatoria (Fecha)</label>
                                    <select 
                                        value={filterLaunchId} 
                                        onChange={(e) => setFilterLaunchId(e.target.value)}
                                        className="w-full p-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    >
                                        <option value="">Cualquier fecha</option>
                                        {availableLaunches.map(l => (
                                            <option key={l.id} value={l.id}>
                                                {l[FIELD_NOMBRE_PPS_LANZAMIENTOS]} - {formatDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* --- SEARCH BAR FOR STUDENTS --- */}
                {activeTable === 'estudiantes' && (
                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800 animate-fade-in mb-4">
                         <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Buscar y Filtrar Estudiante</label>
                         <AdminSearch 
                            onStudentSelect={handleStudentSearchSelect}
                            isTestingMode={isTestingMode}
                         />
                         {(searchTerm || estudianteSearchSelection) && (
                             <div className="flex justify-end mt-2">
                                <button onClick={clearEstudianteFilter} className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400">
                                    Limpiar filtro {estudianteSearchSelection ? `(${estudianteSearchSelection})` : ''}
                                </button>
                             </div>
                         )}
                    </div>
                )}

                {/* --- MAIN TOOLBAR --- */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    
                    {/* Left: Generic Search (only if not students, as students has the better search above) */}
                    {activeTable !== 'estudiantes' && (
                        <div className="relative w-full md:w-72 group">
                            <input 
                                type="search" 
                                placeholder="Búsqueda general..." 
                                value={searchTerm} 
                                onChange={e => setSearchTerm(e.target.value)} 
                                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" 
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg pointer-events-none">search</span>
                            {searchTerm && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" style={{ opacity: isLoading ? 1 : 0 }} />
                                </div>
                            )}
                        </div>
                    )}
                    
                    {/* Right: Actions */}
                    <div className={`flex items-center gap-2 w-full md:w-auto ${activeTable === 'estudiantes' ? 'ml-auto' : ''}`}>
                        {isBulkEditMode && (
                            <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 animate-fade-in">
                                <select 
                                    value={bulkStatus} 
                                    onChange={e => setBulkStatus(e.target.value)}
                                    className="text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded px-2 py-1"
                                >
                                    <option value="">Cambiar Estado...</option>
                                    <option value="Finalizada">Finalizada</option>
                                    <option value="En curso">En curso</option>
                                </select>
                                <button 
                                    onClick={handleBulkUpdateStatus}
                                    disabled={selectedRowIds.size === 0 || !bulkStatus}
                                    className="text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Aplicar ({selectedRowIds.size})
                                </button>
                                <button onClick={() => {setIsBulkEditMode(false); setSelectedRowIds(new Set())}} className="text-slate-500 hover:text-slate-700 ml-2"><span className="material-icons !text-base">close</span></button>
                            </div>
                        )}

                        {!isBulkEditMode && activeTable === 'practicas' && (
                            <button 
                                onClick={() => setIsBulkEditMode(true)}
                                className="bg-white border border-slate-300 text-slate-700 font-bold py-2.5 px-4 rounded-lg text-sm flex items-center gap-2 hover:bg-slate-50 shadow-sm"
                            >
                                <span className="material-icons !text-lg">library_add_check</span>
                                Editar en Bloque
                            </button>
                        )}

                        <button onClick={() => setEditingRecord({ isCreating: true })} className="w-full md:w-auto bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shrink-0">
                            <span className="material-icons !text-lg">add_circle</span>
                            Nuevo Registro
                        </button>
                    </div>
                </div>
                
                {isLoading && records.length === 0 && <div className="py-10"><Loader /></div>}
                {error && <EmptyState icon="error" title="Error de Carga" message={error.message} />}
                
                {(!isLoading || records.length > 0) && !error && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {activeTableConfig.displayFields.map((key, idx) => {
                                            const fieldConfig = activeTableConfig.fieldConfig.find(f => f.key === key);
                                            const label = fieldConfig ? fieldConfig.label : (key.startsWith('__') ? key.substring(2).replace(/([A-Z])/g, ' $1') : key);
                                            const className = key === '__lanzamientoName' || key === FIELD_NOMBRE_ESTUDIANTES ? "min-w-[250px]" : "";
                                            return (
                                                <SortableHeader 
                                                    key={key} 
                                                    label={label} 
                                                    sortKey={key} 
                                                    sortConfig={sortConfig} 
                                                    requestSort={requestSort} 
                                                    className={className}
                                                    hasCheckbox={idx === 0 && isBulkEditMode}
                                                    onSelectAll={handleSelectAll}
                                                    allSelected={selectedRowIds.size > 0 && selectedRowIds.size === records.length}
                                                />
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {records.length > 0 ? records.map((record, idx) => {
                                        const isSelected = selectedRowIds.has(record.id);
                                        return (
                                            <tr 
                                                key={record.id} 
                                                onClick={() => isBulkEditMode ? handleRowSelect(record.id) : setSelectedRowId(isSelected ? null : record.id)}
                                                onDoubleClick={() => setEditingRecord(record)}
                                                onContextMenu={(e) => handleRowContextMenu(e, record)}
                                                className={`transition-colors cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-inset ring-blue-300 dark:ring-blue-700' 
                                                        : idx % 2 === 0 ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'bg-slate-50/30 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                                                }`}
                                            >
                                                {activeTableConfig.displayFields.map((key, colIdx) => {
                                                    const fieldConfig = activeTableConfig.fieldConfig.find(f => f.key === key) || { key };
                                                    return (
                                                        <td key={key} className="px-6 py-3 text-slate-700 dark:text-slate-300 align-middle">
                                                            {colIdx === 0 && isBulkEditMode && (
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={isSelected} 
                                                                    onChange={() => handleRowSelect(record.id)}
                                                                    className="mr-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4 cursor-pointer"
                                                                    onClick={e => e.stopPropagation()}
                                                                />
                                                            )}
                                                            {renderCellValue(record, fieldConfig)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={activeTableConfig.displayFields.length}>
                                                <div className="py-12"><EmptyState icon="search_off" title="Sin Resultados" message="No hay registros que coincidan con tu búsqueda." /></div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <PaginationControls 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage} 
                            itemsPerPage={itemsPerPage} 
                            onItemsPerPageChange={setItemsPerPage} 
                            totalItems={totalItems} 
                        />
                    </div>
                )}
            </div>

            {editingRecord && (
                <RecordEditModal 
                    isOpen={!!editingRecord} 
                    onClose={() => setEditingRecord(null)} 
                    record={'isCreating' in editingRecord ? null : editingRecord}
                    initialData={'isCreating' in editingRecord ? editingRecord.initialData : undefined}
                    tableConfig={activeTableConfig} 
                    onSave={(recordId, fields) => {
                        if (recordId) { updateMutation.mutate({ recordId, fields }); } else { createMutation.mutate(fields); }
                    }} 
                    isSaving={updateMutation.isPending || createMutation.isPending} 
                />
            )}
        </Card>
    );
};

export default DatabaseEditor;
