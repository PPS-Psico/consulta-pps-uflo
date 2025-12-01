
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { schema } from '../lib/dbSchema';
import type { AppRecord } from '../types';
import SubTabs from './SubTabs';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import RecordEditModal from './RecordEditModal';
import { formatDate, normalizeStringForComparison, getEspecialidadClasses, getStatusVisuals } from '../utils/formatters';
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
    FIELD_FECHA_INICIO_LANZAMIENTOS
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
    schema: any;
    fieldConfig: FieldConfig[];
    displayFields: string[];
    searchFields: string[];
}

// Base configuration without dynamic data
const BASE_TABLE_CONFIGS: Record<string, Omit<TableConfig, 'fieldConfig'> & { fieldConfig: Omit<FieldConfig, 'options'>[] }> = {
    estudiantes: { 
        label: 'Estudiantes', 
        icon: 'school', 
        schema: schema.estudiantes,
        displayFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES],
        searchFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES],
        fieldConfig: [
            { key: FIELD_NOMBRE_ESTUDIANTES, label: 'Nombre Completo', type: 'text' },
            { key: FIELD_LEGAJO_ESTUDIANTES, label: 'Legajo', type: 'text' },
            { key: FIELD_DNI_ESTUDIANTES, label: 'DNI', type: 'number' },
            { key: FIELD_CORREO_ESTUDIANTES, label: 'Correo', type: 'email' },
            { key: FIELD_TELEFONO_ESTUDIANTES, label: 'Teléfono', type: 'tel' },
            { key: FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, label: 'Orientación Elegida', type: 'select' }, // Options injected later
            { key: FIELD_NOTAS_INTERNAS_ESTUDIANTES, label: 'Notas Internas', type: 'textarea' },
        ]
    },
    practicas: {
        label: 'Prácticas',
        icon: 'work_history',
        schema: schema.practicas,
        displayFields: ['__studentName', '__lanzamientoName', FIELD_ESPECIALIDAD_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_ESTADO_PRACTICA, FIELD_NOTA_PRACTICAS],
        searchFields: [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS],
        fieldConfig: [
            { key: FIELD_ESTUDIANTE_LINK_PRACTICAS, label: 'Estudiante', type: 'select' }, // Dynamic options
            { key: FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, label: 'Lanzamiento (PPS)', type: 'select' }, // Dynamic options
            { key: FIELD_FECHA_INICIO_PRACTICAS, label: 'Fecha Inicio', type: 'date' },
            { key: FIELD_FECHA_FIN_PRACTICAS, label: 'Fecha Fin', type: 'date' },
            { key: FIELD_HORAS_PRACTICAS, label: 'Horas', type: 'number' },
            { key: FIELD_ESTADO_PRACTICA, label: 'Estado', type: 'select' }, // Options injected
            { key: FIELD_ESPECIALIDAD_PRACTICAS, label: 'Especialidad', type: 'select' }, // Options injected
            { key: FIELD_NOTA_PRACTICAS, label: 'Nota', type: 'select' }, // Options injected
        ]
    },
    instituciones: { 
        label: 'Instituciones', 
        icon: 'apartment', 
        schema: schema.instituciones,
        displayFields: [FIELD_NOMBRE_INSTITUCIONES, FIELD_TELEFONO_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES],
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

type TableKey = keyof typeof BASE_TABLE_CONFIGS;

interface ContextMenuProps {
    x: number;
    y: number;
    onEdit: () => void;
    onDuplicate: () => void;
    onDelete: () => void;
    onClose: () => void;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, onEdit, onDuplicate, onDelete, onClose }) => {
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
            className="fixed z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-fade-in text-sm"
            style={{ top: y, left: x }}
        >
            <button onClick={onEdit} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span className="material-icons !text-base">edit</span> Editar
            </button>
            <button onClick={onDuplicate} className="w-full text-left px-4 py-2 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <span className="material-icons !text-base">content_copy</span> Duplicar
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
}> = ({ label, sortKey, sortConfig, requestSort, className = "text-left" }) => {
  const isActive = sortConfig.key === sortKey;
  const icon = isActive ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';
  
  return (
    <th
      scope="col"
      className={`px-6 py-4 cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(51,65,85,1)] ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`material-icons !text-sm transition-opacity ${isActive ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-30 group-hover:opacity-70'}`}>{icon}</span>
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
                className="bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
            >
                {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
            <span className="hidden sm:inline border-l border-slate-300 dark:border-slate-600 pl-4">
                Total: <strong>{totalItems}</strong> registros
            </span>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
                <span className="material-icons !text-xl">chevron_left</span>
            </button>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 min-w-[80px] text-center">
                Pág {currentPage} de {totalPages || 1}
            </span>
            <button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
                <span className="material-icons !text-xl">chevron_right</span>
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
    const [editingRecord, setEditingRecord] = useState<AppRecord<any> | { isCreating: true } | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: AppRecord<any> } | null>(null);
    
    // Server-side state
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    
    // Practicas Filters
    const [selectedInstitutionForFilter, setSelectedInstitutionForFilter] = useState('');
    const [selectedLaunchFilter, setSelectedLaunchFilter] = useState('');
    const [selectedStudentFilter, setSelectedStudentFilter] = useState('');
    const [studentSearchText, setStudentSearchText] = useState('');
    const [showStudentOptions, setShowStudentOptions] = useState(false);

    const queryClient = useQueryClient();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); 
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
    // 1. Fetch Lookup Data (Students & Launches)
    const { data: lookupData } = useQuery({
        queryKey: ['lookupData'],
        queryFn: async () => {
            if (isTestingMode) return { students: [], launches: [] };
            const [studentsRes, launchesRes] = await Promise.all([
                db.estudiantes.getAll({ fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES] }),
                db.lanzamientos.getAll({ fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS] })
            ]);
            
            return {
                students: studentsRes.sort((a, b) => (a[FIELD_NOMBRE_ESTUDIANTES] || '').localeCompare(b[FIELD_NOMBRE_ESTUDIANTES] || '')),
                launches: launchesRes.sort((a, b) => new Date(b[FIELD_FECHA_INICIO_LANZAMIENTOS] || '').getTime() - new Date(a[FIELD_FECHA_INICIO_LANZAMIENTOS] || '').getTime())
            };
        },
        enabled: !isTestingMode,
        staleTime: Infinity, 
    });

    // 2. Prepare Dynamic Configuration
    const tableConfig = useMemo(() => {
        const config = { ...BASE_TABLE_CONFIGS[activeTable] } as TableConfig;
        
        // Inject options dynamically based on fetched data
        if (activeTable === 'estudiantes') {
            const orientacionField = config.fieldConfig.find(f => f.key === FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES);
            if (orientacionField) orientacionField.options = ['', ...ALL_ORIENTACIONES];
        } 
        else if (activeTable === 'practicas') {
            const statusField = config.fieldConfig.find(f => f.key === FIELD_ESTADO_PRACTICA);
            if (statusField) statusField.options = ['En curso', 'Finalizada', 'Convenio Realizado', 'No se pudo concretar'];
            
            const espField = config.fieldConfig.find(f => f.key === FIELD_ESPECIALIDAD_PRACTICAS);
            if (espField) espField.options = ALL_ORIENTACIONES;

            const notaField = config.fieldConfig.find(f => f.key === FIELD_NOTA_PRACTICAS);
            if (notaField) notaField.options = ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'];

            // Dynamic Options
            const studentField = config.fieldConfig.find(f => f.key === FIELD_ESTUDIANTE_LINK_PRACTICAS);
            if (studentField) {
                studentField.options = (lookupData?.students || []).map(s => ({
                    value: s.id,
                    label: `${s[FIELD_NOMBRE_ESTUDIANTES]} (${s[FIELD_LEGAJO_ESTUDIANTES]})`
                }));
            }

            const launchField = config.fieldConfig.find(f => f.key === FIELD_LANZAMIENTO_VINCULADO_PRACTICAS);
            if (launchField) {
                launchField.options = (lookupData?.launches || []).map(l => ({
                    value: l.id,
                    label: `${l[FIELD_NOMBRE_PPS_LANZAMIENTOS]} (${formatDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])})`
                }));
            }
        }
        return config;
    }, [activeTable, lookupData]);

    // --- Filter Logic ---

    const uniqueInstitutions = useMemo(() => {
        if (!lookupData?.launches) return [];
        const names = new Set<string>();
        lookupData.launches.forEach(l => {
            const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (name) {
                const baseName = name.split(' - ')[0].trim();
                names.add(baseName);
            }
        });
        return Array.from(names).sort();
    }, [lookupData?.launches]);

    const availableLaunches = useMemo(() => {
        if (!selectedInstitutionForFilter || !lookupData?.launches) return [];
        return lookupData.launches.filter(l => {
             const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
             // Match start of string to allow variations
             return name.toLowerCase().startsWith(selectedInstitutionForFilter.toLowerCase());
        }).sort((a, b) => new Date(b[FIELD_FECHA_INICIO_LANZAMIENTOS] || '').getTime() - new Date(a[FIELD_FECHA_INICIO_LANZAMIENTOS] || '').getTime());
    }, [selectedInstitutionForFilter, lookupData?.launches]);

    const queryFilters = useMemo(() => {
        if (activeTable !== 'practicas') return undefined;
        const filters: Record<string, any> = {};
        
        // 1. Launch / Institution Filter Logic (HYBRID MODE)
        if (selectedLaunchFilter) {
            // User selected a specific launch from the second dropdown.
            // We have the ID. We also need the name and date for the hybrid matching strategy.
            // The UI passed the launch ID as selectedLaunchFilter.
            const launch = lookupData?.launches.find(l => l.id === selectedLaunchFilter);
            if (launch) {
                // Construct a special composite value: "ID|NAME|DATE"
                // This triggers the OR logic in supabaseService (Strict ID OR (Name match AND Date match))
                const rawName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                // Clean name for lookup (remove things after " - ")
                const instName = rawName.split(' - ')[0].trim();
                const date = launch[FIELD_FECHA_INICIO_LANZAMIENTOS] || '';
                
                // Pass the special composite value
                filters[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] = `${launch.id}|${instName}|${date}`;
            } else {
                // Fallback to simple ID if lookup fails (rare)
                filters[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] = selectedLaunchFilter;
            }

        } else if (selectedInstitutionForFilter) {
            // LEGACY MODE: User only selected Institution name. Filter by text matching.
            filters[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] = selectedInstitutionForFilter;
        }

        // 2. Student Filter
        if (selectedStudentFilter) {
            filters[FIELD_ESTUDIANTE_LINK_PRACTICAS] = selectedStudentFilter;
        }

        return Object.keys(filters).length > 0 ? filters : undefined;
    }, [activeTable, selectedLaunchFilter, selectedInstitutionForFilter, selectedStudentFilter, lookupData?.launches]);

    const filteredStudents = useMemo(() => {
        if (!studentSearchText.trim() || !lookupData?.students) return [];
        const searchLower = studentSearchText.toLowerCase();
        return lookupData.students.filter(s => 
            (s[FIELD_NOMBRE_ESTUDIANTES] || '').toLowerCase().includes(searchLower) ||
            String(s[FIELD_LEGAJO_ESTUDIANTES] || '').toLowerCase().includes(searchLower)
        ).slice(0, 20); // Limit for performance
    }, [studentSearchText, lookupData]);

    const queryKey = ['databaseEditor', activeTable, currentPage, itemsPerPage, sortConfig, debouncedSearch, isTestingMode, queryFilters];

    const { data: queryResult, isLoading, error } = useQuery({
        queryKey,
        queryFn: async () => {
             if (isTestingMode) return { records: [], total: 0 };

            const { records, total, error } = await db[activeTable].getPage(
                currentPage,
                itemsPerPage,
                {
                    searchTerm: debouncedSearch,
                    searchFields: tableConfig.searchFields,
                    sort: sortConfig.key ? { field: sortConfig.key, direction: sortConfig.direction } : undefined,
                    filters: queryFilters
                }
            );

            if (error) throw new Error(error.error as string);

            // Join data for display
            if (activeTable === 'practicas' && records.length > 0) {
                const enrichedRecords = records.map(p => {
                    const rawStudentId = p[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                    const studentId = Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId;
                    
                    const rawLanzamientoId = p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                    const lanzamientoId = Array.isArray(rawLanzamientoId) ? rawLanzamientoId[0] : rawLanzamientoId;
                    
                    const student = lookupData?.students.find(s => s.id === studentId);
                    const launch = lookupData?.launches.find(l => l.id === lanzamientoId);
    
                    return {
                        ...p,
                        __studentName: student ? `${student[FIELD_NOMBRE_ESTUDIANTES]} (${student[FIELD_LEGAJO_ESTUDIANTES]})` : 'Desconocido',
                        __lanzamientoName: launch ? launch[FIELD_NOMBRE_PPS_LANZAMIENTOS] : (cleanDisplayValue(p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'N/A')
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

    const updateMutation = useMutation({
        mutationFn: ({ recordId, fields }: { recordId: string, fields: any }) => {
             if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].update(recordId, fields);
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
            if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].create(fields);
        },
        onSuccess: () => {
             setToastInfo({ message: 'Registro creado.', type: 'success' });
             setEditingRecord(null);
             queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] }); 
        },
        onError: (e) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
    });

    const deleteMutation = useMutation({
        mutationFn: (recordId: string) => {
            if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].delete(recordId);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Registro eliminado.', type: 'success' });
            setContextMenu(null);
            setSelectedRowId(null);
            queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] });
        },
        onError: (e) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
    });

    const duplicateMutation = useMutation({
        mutationFn: (record: AppRecord<any>) => {
            const { id, createdTime, created_at, ...originalFields } = record;
            const newFields: { [key: string]: any } = { ...originalFields };

            // Append (Copia) to primary field
            const primaryFieldKey = BASE_TABLE_CONFIGS[activeTable].displayFields[0];
            if (newFields[primaryFieldKey]) {
                 newFields[primaryFieldKey] = `${newFields[primaryFieldKey]} (Copia)`;
            }
            // Remove computed fields
             delete newFields['__studentName'];
             delete newFields['__lanzamientoName'];

            if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].create(newFields);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Registro duplicado.', type: 'success' });
            setContextMenu(null);
            queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] });
        },
        onError: (e) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
    });

    const tableTabs = Object.entries(BASE_TABLE_CONFIGS).map(([key, { label, icon }]) => ({ id: key, label, icon }));

    useEffect(() => {
        setCurrentPage(1);
        setSearchTerm('');
        setSelectedLaunchFilter('');
        setSelectedInstitutionForFilter('');
        setSelectedStudentFilter('');
        setStudentSearchText('');
        setShowStudentOptions(false);
        setContextMenu(null);
        setSelectedRowId(null);
    }, [activeTable]);
    
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRowId) {
                const activeTag = document.activeElement?.tagName;
                if (activeTag !== 'INPUT' && activeTag !== 'TEXTAREA' && activeTag !== 'SELECT') {
                    handleDelete(selectedRowId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRowId]);

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
        setSelectedRowId(record.id);
        setContextMenu({ x: e.clientX, y: e.clientY, record });
    };

    const handleDelete = (recordId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
            deleteMutation.mutate(recordId);
        }
    };

    const handleDuplicate = () => {
        if (!contextMenu?.record) return;
        const record = contextMenu.record;
        const { id, createdTime, created_at, ...fields } = record;
        
        const newFields = JSON.parse(JSON.stringify(fields));

        if (activeTable === 'practicas') {
            newFields[FIELD_ESTUDIANTE_LINK_PRACTICAS] = ''; 
            newFields[FIELD_NOTA_PRACTICAS] = 'Sin calificar';
        } else {
             const primaryFieldKey = tableConfig.displayFields[0];
             if (newFields[primaryFieldKey] && typeof newFields[primaryFieldKey] === 'string') {
                  newFields[primaryFieldKey] = `${newFields[primaryFieldKey]} (Copia)`;
             }
        }

        delete newFields['__studentName'];
        delete newFields['__lanzamientoName'];

        setEditingRecord({ ...newFields, isCreating: true });
        setContextMenu(null);
    };

    const renderCellValue = (record: AppRecord<any>, fieldConfig: any) => {
        const key = fieldConfig.key;
        let value = record[key];

        if (key === FIELD_ESTADO_PRACTICA) {
            const visuals = getStatusVisuals(String(value || ''));
            return (
                <span className={`${visuals.labelClass} px-2 py-0.5 rounded-full text-xs border flex items-center gap-1 w-fit`}>
                    <span className="material-icons !text-sm">{visuals.icon}</span>
                    <span className="capitalize">{String(value || 'N/A')}</span>
                </span>
            );
        }

        if (key === FIELD_NOTA_PRACTICAS) {
             const nota = String(value || 'Sin calificar');
             let colorClass = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700';
             
             if (nota === '10') colorClass = 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300';
             else if (['8', '9'].includes(nota)) colorClass = 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300';
             else if (['4', '5', '6', '7'].includes(nota)) colorClass = 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300';
             else if (nota === 'Desaprobado') colorClass = 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300';

             return (
                <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${colorClass}`}>
                    {nota}
                </span>
             );
        }

        if (fieldConfig.type === 'checkbox') {
            return value ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200">Sí</span>
            ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">No</span>
            );
        }

        if (fieldConfig.type === 'date') {
            return <span className="font-mono text-xs whitespace-nowrap text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 px-1.5 py-0.5 rounded">{formatDate(value)}</span>;
        }
        
        if (key === FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES || key === FIELD_ESPECIALIDAD_PRACTICAS) {
            if (!value) return <span className="text-slate-400">-</span>;
            const visuals = getEspecialidadClasses(String(value));
            return <span className={`${visuals.tag} whitespace-nowrap shadow-none border-0`}>{String(value)}</span>;
        }

        return <span className="truncate block max-w-[200px] text-sm" title={String(value || '')}>{String(value || '')}</span>;
    };

    return (
        <Card title="Editor de Base de Datos" icon="storage">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={() => { setEditingRecord(contextMenu.record); setContextMenu(null); }}
                    onDuplicate={handleDuplicate}
                    onDelete={() => { handleDelete(contextMenu.record.id); setContextMenu(null); }}
                    onClose={() => setContextMenu(null)}
                />
            )}

            <div className="mt-4">
                <SubTabs 
                    tabs={tableTabs} 
                    activeTabId={activeTable} 
                    onTabChange={(id) => { setActiveTable(id as TableKey); setSearchTerm(''); setSortConfig({ key: '', direction: 'asc' }); }} 
                />
            </div>

            <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700/60 pt-6">
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="relative w-full md:w-72 group">
                            <input 
                                type="search" 
                                placeholder="Buscar..." 
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
                        
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <button 
                                onClick={() => selectedRowId && handleDelete(selectedRowId)} 
                                disabled={!selectedRowId}
                                className={`w-full md:w-auto bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 font-bold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shrink-0 ${!selectedRowId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm'}`}
                            >
                                <span className="material-icons !text-lg">delete</span>
                                Eliminar
                            </button>

                            <button onClick={() => setEditingRecord({ isCreating: true })} className="w-full md:w-auto bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shrink-0 shadow-md hover:shadow-lg">
                                <span className="material-icons !text-lg">add_circle</span>
                                Nuevo Registro
                            </button>
                        </div>
                    </div>
                    
                    {/* Specific Filters for Practicas */}
                    {activeTable === 'practicas' && (
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-4 animate-fade-in">
                            
                            {/* 1. Filter by Institution Name */}
                            <div className="col-span-1 sm:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Institución</label>
                                <div className="relative">
                                    <select 
                                        value={selectedInstitutionForFilter} 
                                        onChange={(e) => { 
                                            setSelectedInstitutionForFilter(e.target.value);
                                            setSelectedLaunchFilter(''); // Reset specific launch when institution changes
                                            setCurrentPage(1); 
                                        }}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="">Todas las instituciones</option>
                                        {uniqueInstitutions.map(inst => (
                                            <option key={inst} value={inst}>{inst}</option>
                                        ))}
                                    </select>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 pointer-events-none !text-base">expand_more</span>
                                </div>
                            </div>

                            {/* 2. Filter by Launch Date (Dependent on Institution) */}
                            <div className="col-span-1 sm:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Lanzamiento (Fecha)</label>
                                <div className="relative">
                                    <select 
                                        value={selectedLaunchFilter} 
                                        onChange={(e) => { setSelectedLaunchFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                                        disabled={!selectedInstitutionForFilter}
                                    >
                                        <option value="">Todas las convocatorias</option>
                                        {availableLaunches.map(l => (
                                            <option key={l.id} value={l.id}>
                                                {formatDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])} ({l[FIELD_NOMBRE_PPS_LANZAMIENTOS]})
                                            </option>
                                        ))}
                                    </select>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 pointer-events-none !text-base">expand_more</span>
                                </div>
                            </div>
                            
                            {/* 3. Student Autocomplete */}
                            <div className="col-span-1 sm:col-span-4 relative">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Estudiante</label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder={selectedStudentFilter ? "Estudiante seleccionado" : "Escriba para buscar..."}
                                        value={studentSearchText}
                                        onChange={(e) => {
                                            setStudentSearchText(e.target.value);
                                            if (selectedStudentFilter) setSelectedStudentFilter(''); // Reset logic
                                            setShowStudentOptions(true);
                                        }}
                                        onFocus={() => setShowStudentOptions(true)}
                                        className={`w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 pr-8 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none ${selectedStudentFilter ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 font-semibold text-blue-700 dark:text-blue-300' : ''}`}
                                    />
                                    {/* Clear button */}
                                    {(selectedStudentFilter || studentSearchText) && (
                                        <button 
                                            onClick={() => { setSelectedStudentFilter(''); setStudentSearchText(''); setCurrentPage(1); }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500"
                                            title="Limpiar filtro de estudiante"
                                        >
                                            <span className="material-icons !text-lg">close</span>
                                        </button>
                                    )}
                                    
                                    {/* Dropdown Results */}
                                    {showStudentOptions && studentSearchText && !selectedStudentFilter && (
                                        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredStudents.length > 0 ? (
                                                filteredStudents.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            setStudentSearchText(`${s[FIELD_NOMBRE_ESTUDIANTES]} (${s[FIELD_LEGAJO_ESTUDIANTES]})`);
                                                            setSelectedStudentFilter(s.id);
                                                            setShowStudentOptions(false);
                                                            setCurrentPage(1);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 block truncate"
                                                    >
                                                        <span className="font-medium">{s[FIELD_NOMBRE_ESTUDIANTES]}</span>
                                                        <span className="text-slate-400 text-xs ml-2">{s[FIELD_LEGAJO_ESTUDIANTES]}</span>
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-4 py-2 text-sm text-slate-500 italic">No se encontraron resultados.</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {isLoading && records.length === 0 && <div className="py-10"><Loader /></div>}
                {error && <EmptyState icon="error" title="Error de Carga" message={error.message} />}
                
                {(!isLoading || records.length > 0) && !error && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {tableConfig.displayFields.map(key => {
                                            const fieldConfig = tableConfig.fieldConfig.find(f => f.key === key);
                                            const label = fieldConfig ? fieldConfig.label : (key.startsWith('__') ? key.substring(2).replace(/([A-Z])/g, ' $1') : key);
                                            const className = key === '__lanzamientoName' || key === FIELD_NOMBRE_ESTUDIANTES ? "min-w-[250px]" : "";
                                            return <SortableHeader key={key} label={label} sortKey={key} sortConfig={sortConfig} requestSort={requestSort} className={className} />;
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {records.length > 0 ? records.map((record, idx) => {
                                        const isSelected = selectedRowId === record.id;
                                        return (
                                            <tr 
                                                key={record.id} 
                                                onClick={() => setSelectedRowId(isSelected ? null : record.id)}
                                                onDoubleClick={() => setEditingRecord(record)}
                                                onContextMenu={(e) => handleRowContextMenu(e, record)}
                                                className={`transition-colors cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 ring-1 ring-inset ring-blue-300 dark:ring-blue-700' 
                                                        : idx % 2 === 0 ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'bg-slate-50/30 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                                                }`}
                                            >
                                                {tableConfig.displayFields.map(key => {
                                                    const fieldConfig = tableConfig.fieldConfig.find(f => f.key === key) || { key };
                                                    return (
                                                        <td key={key} className="px-6 py-3 text-slate-700 dark:text-slate-300 align-middle">
                                                            {renderCellValue(record, fieldConfig)}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        );
                                    }) : (
                                        <tr>
                                            <td colSpan={tableConfig.displayFields.length}>
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
                    tableConfig={tableConfig} 
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
