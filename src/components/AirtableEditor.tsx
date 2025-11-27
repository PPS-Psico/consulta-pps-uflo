
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { schema } from '../lib/airtableSchema';
import type { AirtableRecord, InstitucionFields, EstudianteFields, LanzamientoPPSFields } from '../types';
import SubTabs from './SubTabs';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import RecordEditModal from './RecordEditModal';
import { formatDate, normalizeStringForComparison, getEspecialidadClasses, parseToUTCDate } from '../utils/formatters';
import Card from './Card';
import { ALL_ORIENTACIONES } from '../types';
import { FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_INICIO_PRACTICAS } from '../constants';

interface FieldConfig {
    key: string;
    label: string;
    type: 'text' | 'textarea' | 'number' | 'date' | 'email' | 'tel' | 'select' | 'checkbox';
    options?: readonly string[];
}

interface TableConfig {
    label: string;
    schema: any;
    fieldConfig: FieldConfig[];
}

const EDITABLE_TABLES = {
    estudiantes: { 
        label: 'Estudiantes', 
        icon: 'school', 
        schema: schema.estudiantes,
        displayFields: ['nombre', 'legajo', 'dni', 'orientacionElegida'],
        fieldConfig: [
            { key: 'nombre', label: 'Nombre Completo', type: 'text' as const },
            { key: 'legajo', label: 'Legajo', type: 'text' as const },
            { key: 'dni', label: 'DNI', type: 'number' as const },
            { key: 'correo', label: 'Correo', type: 'email' as const },
            { key: 'telefono', label: 'Teléfono', type: 'tel' as const },
            { key: 'orientacionElegida', label: 'Orientación Elegida', type: 'select' as const, options: ['', 'Clinica', 'Educacional', 'Laboral', 'Comunitaria'] },
            { key: 'notasInternas', label: 'Notas Internas', type: 'textarea' as const },
        ]
    },
    practicas: {
        label: 'Prácticas',
        icon: 'work_history',
        schema: schema.practicas,
        displayFields: ['__studentName', '__lanzamientoName', 'especialidad', 'fechaInicio', 'estado'],
        fieldConfig: [
            { key: 'estudianteLink', label: 'ID Estudiante (Record ID)', type: 'text' as const },
            { key: 'lanzamientoVinculado', label: 'ID Lanzamiento (Record ID)', type: 'text' as const },
            { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date' as const },
            { key: 'fechaFin', label: 'Fecha Fin', type: 'date' as const },
            { key: 'horasRealizadas', label: 'Horas', type: 'number' as const },
            { key: 'estado', label: 'Estado', type: 'select' as const, options: ['En curso', 'Finalizada', 'Convenio Realizado', 'No se pudo concretar'] },
            { key: 'especialidad', label: 'Especialidad', type: 'select' as const, options: ALL_ORIENTACIONES },
            { key: 'nota', label: 'Nota', type: 'select' as const, options: ['Sin calificar', 'Entregado (sin corregir)', 'No Entregado', 'Desaprobado', '4', '5', '6', '7', '8', '9', '10'] },
        ]
    },
    instituciones: { 
        label: 'Instituciones', 
        icon: 'apartment', 
        schema: schema.instituciones,
        displayFields: ['nombre', 'telefono', 'convenioNuevo'],
        fieldConfig: [
            { key: 'nombre', label: 'Nombre', type: 'text' as const },
            { key: 'telefono', label: 'Teléfono', type: 'tel' as const },
            { key: 'direccion', label: 'Dirección', type: 'text' as const },
            { key: 'convenioNuevo', label: 'Convenio Nuevo', type: 'checkbox' as const },
            { key: 'tutor', label: 'Tutor', type: 'text' as const },
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

interface AirtableEditorProps {
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
      className={`px-6 py-3 cursor-pointer select-none group hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</span>
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


const getLookupName = (fieldValue: any): string | null => {
    if (Array.isArray(fieldValue)) return typeof fieldValue[0] === 'string' ? fieldValue[0] : null;
    return typeof fieldValue === 'string' ? fieldValue : null;
};

const AirtableEditor: React.FC<AirtableEditorProps> = ({ isTestingMode = false }) => {
    const [activeTable, setActiveTable] = useState<TableKey>('estudiantes');
    const [editingRecord, setEditingRecord] = useState<AirtableRecord<any> | { isCreating: true } | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: AirtableRecord<any> } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [lanzamientoFilter, setLanzamientoFilter] = useState('');
    const [studentFilter, setStudentFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
    
    const queryClient = useQueryClient();

    const { data: launchesList = [] } = useQuery({
        queryKey: ['allLaunchesForFilter', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) return [];
            const records = await db.lanzamientos.getAll({ 
                fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS],
                sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]
            });
            return records.map(r => ({
                id: r.id,
                name: r.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                date: r.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]
            }));
        },
        enabled: activeTable === 'practicas' && !isTestingMode
    });

    const { data, isLoading, error } = useQuery({
        queryKey: ['airtableEditor', activeTable, isTestingMode],
        queryFn: async () => {
             if (isTestingMode) return [];

            if (activeTable === 'practicas') {
                const [practicasRes, estudiantesRes, lanzamientosRes] = await Promise.all([
                    db.practicas.getAll(),
                    db.estudiantes.getAll({ fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES] }),
                    db.lanzamientos.getAll({ fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS] })
                ]);
    
                const estudiantesMap = new Map(estudiantesRes.map(r => [r.id, r.fields]));
                const lanzamientosMap = new Map(lanzamientosRes.map(r => [r.id, r.fields]));
    
                return practicasRes.map(p => {
                    const studentId = (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0];
                    const lanzamientoId = (p.fields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] || [])[0];
                    const studentName = estudiantesMap.get(studentId)?.[FIELD_NOMBRE_ESTUDIANTES] || 'N/A';
                    const studentLegajo = estudiantesMap.get(studentId)?.[FIELD_LEGAJO_ESTUDIANTES] || '';
                    const lanzamientoName = lanzamientosMap.get(lanzamientoId)?.[FIELD_NOMBRE_PPS_LANZAMIENTOS] || getLookupName(p.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'N/A';
    
                    return {
                        ...p,
                        fields: {
                            ...p.fields,
                            __studentName: `${studentName} (${studentLegajo})`,
                            __lanzamientoName: lanzamientoName
                        }
                    };
                });
            }
            
            return db[activeTable as keyof typeof db].getAll();
        },
    });

    const mutationOptions = {
        onSuccess: (message: string) => {
            setToastInfo({ message, type: 'success' as const });
            queryClient.invalidateQueries({ queryKey: ['airtableEditor', activeTable, isTestingMode] });
            setEditingRecord(null);
            setContextMenu(null);
            setSelectedRowId(null);
        },
        onError: (e: Error) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' as const }),
    };

    const updateMutation = useMutation({
        mutationFn: ({ recordId, fields }: { recordId: string, fields: any }) => {
             if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].update(recordId, fields);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro actualizado con éxito.'),
    });

    const createMutation = useMutation({
        mutationFn: (fields: any) => {
            if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].create(fields);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro creado con éxito.'),
    });

    const deleteMutation = useMutation({
        mutationFn: (recordId: string) => {
            if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].delete(recordId);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro eliminado con éxito.'),
    });

    const duplicateMutation = useMutation({
        mutationFn: (record: AirtableRecord<any>) => {
            const { id, createdTime, ...originalFields } = record.fields;
            const newFields: { [key: string]: any } = {};
            const schema = EDITABLE_TABLES[activeTable].schema as any;

            for (const airtableKey in originalFields) {
                const devKey = Object.keys(schema).find(key => schema[key] === airtableKey);
                if (devKey) {
                    newFields[devKey] = originalFields[airtableKey];
                }
            }

            const primaryFieldKey = EDITABLE_TABLES[activeTable].displayFields[0];
            if (newFields[primaryFieldKey]) {
                 newFields[primaryFieldKey] = `${newFields[primaryFieldKey]} (Copia)`;
            }

            if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
            return db[activeTable].create(newFields);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro duplicado con éxito.'),
    });


    const tableTabs = Object.entries(EDITABLE_TABLES).map(([key, { label, icon }]) => ({ id: key, label, icon }));
    const activeTableConfig = EDITABLE_TABLES[activeTable];

    const processedData = useMemo(() => {
        if (!data) return [];
        
        const filtered = data.filter(record => {
            if (activeTable !== 'practicas') {
                const normalizedSearch = normalizeStringForComparison(searchTerm);
                if (normalizedSearch) {
                    const searchMatch = activeTableConfig.displayFields.some(key => {
                        const airtableKey = (activeTableConfig.schema as any)[key] || key;
                        let value = record.fields[airtableKey];
                        if (key.startsWith('__')) {
                            value = record.fields[key];
                        }
                        return normalizeStringForComparison(String(value || '')).includes(normalizedSearch);
                    });
                    if (!searchMatch) return false;
                }
            }
    
            if (activeTable === 'practicas') {
                if (lanzamientoFilter) {
                    const rawValue = record.fields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                    const linkedLaunchIds = Array.isArray(rawValue) ? rawValue.map(String) : (rawValue ? [String(rawValue)] : []);
                    const isDirectMatch = linkedLaunchIds.includes(String(lanzamientoFilter));
                    
                    if (isDirectMatch) return true;

                    const selectedLaunch = launchesList.find(l => l.id === lanzamientoFilter);
                    if (selectedLaunch) {
                         const practiceInstRaw = record.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                         const practiceInstName = getLookupName(practiceInstRaw);
                         const practiceDate = record.fields[FIELD_FECHA_INICIO_PRACTICAS];
                         
                         if (practiceInstName && practiceDate) {
                             const normPractice = normalizeStringForComparison(practiceInstName);
                             const normLaunch = normalizeStringForComparison(selectedLaunch.name);
                             if ((normLaunch.includes(normPractice) || normPractice.includes(normLaunch)) && practiceDate === selectedLaunch.date) {
                                 return true;
                             }
                         }
                    }
                    return false;
                }

                if (studentFilter) {
                   const studName = record.fields['__studentName'] || '';
                   if (!studName.toLowerCase().includes(studentFilter.toLowerCase())) return false;
                }
            }
            return true;
        });
        
        if (sortConfig.key) {
            const sortFieldKey = sortConfig.key;
            const airtableSortField = (activeTableConfig.schema as any)[sortFieldKey] || sortFieldKey;
            
            filtered.sort((a, b) => {
                let valA = a.fields[airtableSortField];
                let valB = b.fields[airtableSortField];

                if (sortFieldKey.startsWith('__')) {
                    valA = a.fields[sortFieldKey];
                    valB = b.fields[sortFieldKey];
                }
                
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return filtered;
    }, [data, searchTerm, lanzamientoFilter, studentFilter, sortConfig, activeTable, activeTableConfig, launchesList]);

    const totalPages = Math.ceil(processedData.length / itemsPerPage);
    const paginatedData = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return processedData.slice(start, start + itemsPerPage);
    }, [processedData, currentPage, itemsPerPage]);
    
    useEffect(() => {
        setCurrentPage(1);
        setLanzamientoFilter(''); 
        setStudentFilter('');
        setContextMenu(null);
        setSelectedRowId(null);
    }, [activeTable]);
    
    // Keyboard support for deletion
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedRowId) {
                // Check if we are focused on an input/textarea (don't delete if editing text)
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
    };
    
    const handleRowContextMenu = (e: React.MouseEvent, record: AirtableRecord<any>) => {
        e.preventDefault();
        setSelectedRowId(record.id);
        setContextMenu({ x: e.clientX, y: e.clientY, record });
    };

    const handleDelete = (recordId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
            deleteMutation.mutate(recordId);
        }
    };

    const renderCellValue = (record: AirtableRecord<any>, fieldConfig: any) => {
        const airtableKey = (activeTableConfig.schema as any)[fieldConfig.key] || fieldConfig.key;
        let value = record.fields[airtableKey];
        if (fieldConfig.key.startsWith('__')) {
            value = record.fields[fieldConfig.key];
            return <span className="truncate block max-w-[350px]" title={String(value || '')}>{String(value || '')}</span>;
        }

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
        
        if (fieldConfig.key === 'orientacion' || fieldConfig.key === 'orientacionElegida' || fieldConfig.key === 'especialidad') {
            if (!value) return <span className="text-slate-400">-</span>;
            const visuals = getEspecialidadClasses(String(value));
            return <span className={`${visuals.tag} whitespace-nowrap shadow-none border-0`}>{String(value)}</span>;
        }

        return <span className="truncate block max-w-[200px]" title={String(value || '')}>{String(value || '')}</span>;
    };

    return (
        <Card title="Editor de Base de Datos" icon="storage">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onEdit={() => { setEditingRecord(contextMenu.record); setContextMenu(null); }}
                    onDuplicate={() => { duplicateMutation.mutate(contextMenu.record); setContextMenu(null); }}
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
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6">
                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-wrap">
                        
                        {/* Generic Search - Only for tables other than Practicas */}
                        {activeTable !== 'practicas' && (
                            <div className="relative w-full md:w-72 group">
                                <input type="search" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg pointer-events-none">search</span>
                                {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><span className="material-icons !text-base">close</span></button>}
                            </div>
                        )}
                        
                        {activeTable === 'practicas' && (
                             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                 <div className="relative w-full sm:w-56">
                                     <input 
                                        type="text" 
                                        placeholder="Filtrar Alumno..." 
                                        value={studentFilter} 
                                        onChange={e => setStudentFilter(e.target.value)} 
                                        className="w-full pl-9 pr-3 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                     />
                                     <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg pointer-events-none">person_search</span>
                                 </div>
                                 
                                 <select 
                                     value={lanzamientoFilter} 
                                     onChange={(e) => setLanzamientoFilter(e.target.value)}
                                     className="w-full sm:w-64 py-2.5 px-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm truncate focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                                 >
                                     <option value="">Filtrar por Lanzamiento...</option>
                                     {launchesList.map(l => (
                                         <option key={l.id} value={l.id}>{l.name} ({formatDate(l.date)})</option>
                                     ))}
                                 </select>

                                 <button onClick={() => { setLanzamientoFilter(''); setStudentFilter(''); }} className="p-2.5 text-slate-500 hover:text-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800" title="Limpiar filtros"><span className="material-icons !text-base">filter_list_off</span></button>
                             </div>
                        )}
                    </div>
                    
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => selectedRowId && handleDelete(selectedRowId)} 
                            disabled={!selectedRowId}
                            className={`w-full md:w-auto bg-white border border-rose-300 text-rose-600 font-bold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 transition-all shrink-0 ${!selectedRowId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-50 shadow-sm'}`}
                        >
                            <span className="material-icons !text-lg">delete</span>
                            Eliminar
                        </button>

                        <button onClick={() => setEditingRecord({ isCreating: true })} className="w-full md:w-auto bg-blue-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shrink-0">
                            <span className="material-icons !text-lg">add_circle</span>
                            Nuevo Registro
                        </button>
                    </div>
                </div>
                
                {isLoading && <div className="py-10"><Loader /></div>}
                {error && <EmptyState icon="error" title="Error de Carga" message={error.message} />}
                
                {data && !isLoading && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[800px] text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                                    <tr>
                                        {activeTableConfig.displayFields.map(key => {
                                            const fieldConfig = activeTableConfig.fieldConfig.find(f => f.key === key);
                                            const label = fieldConfig ? fieldConfig.label : (key.startsWith('__') ? key.substring(2).replace(/([A-Z])/g, ' $1') : key);
                                            const className = key === '__lanzamientoName' || key === 'nombre' ? "min-w-[250px]" : "";
                                            return <SortableHeader key={key} label={label} sortKey={key} sortConfig={sortConfig} requestSort={requestSort} className={className} />;
                                        })}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {paginatedData.length > 0 ? paginatedData.map((record, idx) => {
                                        const isSelected = selectedRowId === record.id;
                                        return (
                                            <tr 
                                                key={record.id} 
                                                onClick={() => setSelectedRowId(isSelected ? null : record.id)}
                                                onDoubleClick={() => setEditingRecord(record)}
                                                onContextMenu={(e) => handleRowContextMenu(e, record)}
                                                className={`transition-colors cursor-pointer ${
                                                    isSelected 
                                                        ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-inset ring-blue-300 dark:ring-blue-700' 
                                                        : idx % 2 === 0 ? 'bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50' : 'bg-slate-50/30 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/70'
                                                }`}
                                            >
                                                {activeTableConfig.displayFields.map(key => {
                                                    const fieldConfig = activeTableConfig.fieldConfig.find(f => f.key === key) || { key };
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
                                            <td colSpan={activeTableConfig.displayFields.length}>
                                                <div className="py-12"><EmptyState icon="search_off" title="Sin Resultados" message="No hay registros que coincidan con tu búsqueda." /></div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                        <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} onItemsPerPageChange={setItemsPerPage} totalItems={processedData.length} />
                    </div>
                )}
            </div>

            {editingRecord && (
                <RecordEditModal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} record={'isCreating' in editingRecord ? null : editingRecord} tableConfig={activeTableConfig} onSave={(recordId, fields) => {
                    if (recordId) { updateMutation.mutate({ recordId, fields }); } else { createMutation.mutate(fields); }
                }} isSaving={updateMutation.isPending || createMutation.isPending} />
            )}
        </Card>
    );
};

export default AirtableEditor;
