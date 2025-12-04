
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient'; // Import needed for direct ID fetching
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
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FINALIZARON_ESTUDIANTES,
    TABLE_NAME_PRACTICAS,
    TABLE_NAME_ESTUDIANTES,
    TABLE_NAME_INSTITUCIONES
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
const BASE_TABLE_CONFIGS: Record<string, TableConfig> = {
    estudiantes: { 
        label: 'Estudiantes', 
        icon: 'school', 
        tableName: TABLE_NAME_ESTUDIANTES,
        schema: schema.estudiantes,
        displayFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_FINALIZARON_ESTUDIANTES],
        searchFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES],
        fieldConfig: [
            { key: FIELD_NOMBRE_ESTUDIANTES, label: 'Nombre Completo', type: 'text' },
            { key: FIELD_LEGAJO_ESTUDIANTES, label: 'Legajo', type: 'text' },
            { key: FIELD_DNI_ESTUDIANTES, label: 'DNI', type: 'number' },
            { key: FIELD_CORREO_ESTUDIANTES, label: 'Correo', type: 'email' },
            { key: FIELD_TELEFONO_ESTUDIANTES, label: 'Teléfono', type: 'tel' },
            { key: FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, label: 'Orientación Elegida', type: 'select', options: ['', 'Clinica', 'Educacional', 'Laboral', 'Comunitaria'] },
            { key: FIELD_NOTAS_INTERNAS_ESTUDIANTES, label: 'Notas Internas', type: 'textarea' },
            { key: FIELD_FINALIZARON_ESTUDIANTES, label: 'Finalizó PPS', type: 'checkbox' },
        ]
    },
    practicas: {
        label: 'Prácticas',
        icon: 'work_history',
        tableName: TABLE_NAME_PRACTICAS,
        schema: schema.practicas,
        // Note: Searching by Student Name or Launch Name is tricky with server-side pagination without joins.
        // We fallback to searching fields present in the table or accept limitation.
        displayFields: ['__studentName', '__lanzamientoName', FIELD_ESPECIALIDAD_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_ESTADO_PRACTICA],
        searchFields: [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS],
        fieldConfig: [
            { key: FIELD_ESTUDIANTE_LINK_PRACTICAS, label: 'ID Estudiante (UUID)', type: 'text' }, // Fallback if dynamic fails
            { key: FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, label: 'ID Lanzamiento (UUID)', type: 'text' }, // Fallback
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
            className="fixed z-[100] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-xl py-1 min-w-[160px] animate-fade-in text-sm"
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

interface BatchUpdateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (field: string, value: any) => void;
    tableConfig: TableConfig;
    isUpdating: boolean;
    count: number;
}

const BatchUpdateModal: React.FC<BatchUpdateModalProps> = ({ isOpen, onClose, onConfirm, tableConfig, isUpdating, count }) => {
    const [selectedField, setSelectedField] = useState<string>('');
    const [value, setValue] = useState<any>('');

    useEffect(() => {
        if (isOpen) {
            setSelectedField('');
            setValue('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const fieldConfig = tableConfig.fieldConfig.find(f => f.key === selectedField);
    
    const handleConfirm = () => {
        if (!selectedField) return;
        onConfirm(selectedField, value);
    };

    return (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span className="material-icons text-blue-600">playlist_add_check</span>
                        Edición en Lote
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Se actualizarán <strong>{count}</strong> registros con el filtro actual.
                    </p>
                </div>
                
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Campo a modificar</label>
                        <select 
                            value={selectedField} 
                            onChange={e => { setSelectedField(e.target.value); setValue(''); }}
                            className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-slate-50 dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Seleccionar campo...</option>
                            {tableConfig.fieldConfig.map(f => (
                                <option key={f.key} value={f.key}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    {fieldConfig && (
                        <div className="animate-fade-in">
                            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Nuevo Valor</label>
                            {fieldConfig.type === 'checkbox' ? (
                                <div className="flex items-center gap-2 mt-2">
                                    <input 
                                        type="checkbox" 
                                        checked={!!value} 
                                        onChange={e => setValue(e.target.checked)} 
                                        className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{value ? 'Sí' : 'No'}</span>
                                </div>
                            ) : fieldConfig.type === 'select' ? (
                                <select 
                                    value={value} 
                                    onChange={e => setValue(e.target.value)}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <option value="">Seleccionar...</option>
                                    {fieldConfig.options?.map((opt: any) => {
                                        const val = typeof opt === 'string' ? opt : opt.value;
                                        const label = typeof opt === 'string' ? opt : opt.label;
                                        return <option key={val} value={val}>{label}</option>;
                                    })}
                                </select>
                            ) : fieldConfig.type === 'textarea' ? (
                                <textarea 
                                    value={value} 
                                    onChange={e => setValue(e.target.value)} 
                                    rows={3}
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            ) : (
                                <input 
                                    type={fieldConfig.type} 
                                    value={value} 
                                    onChange={e => setValue(e.target.value)} 
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">
                        Cancelar
                    </button>
                    <button 
                        onClick={handleConfirm} 
                        disabled={!selectedField || isUpdating}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isUpdating ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">save</span>}
                        Aplicar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
};

interface DuplicateTargetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (studentId: string) => void;
    // We'll use a search component instead of passing ALL students
}

const DuplicateTargetModal: React.FC<DuplicateTargetModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<{id: string, label: string}[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (searchTerm.length < 2) {
                setSearchResults([]);
                return;
            }
            setIsSearching(true);
            try {
                const { records } = await db.estudiantes.getPage(1, 20, {
                    searchTerm,
                    searchFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES]
                });
                setSearchResults(records.map(r => ({
                    id: r.id,
                    label: `${r[FIELD_NOMBRE_ESTUDIANTES]} (${r[FIELD_LEGAJO_ESTUDIANTES]})`
                })));
            } catch(e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }, 400);
        return () => clearTimeout(t);
    }, [searchTerm]);


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Duplicar Práctica</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Busca al alumno para asignar la copia de este registro.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="relative">
                         <input
                            type="text"
                            placeholder="Buscar alumno por nombre o legajo..."
                            value={searchTerm}
                            onChange={e => { setSearchTerm(e.target.value); setSelectedStudentId(null); }}
                            className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            autoFocus
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg">search</span>
                        {isSearching && (
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        )}
                    </div>
                    
                    {/* Results List */}
                    <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900">
                        {searchResults.length > 0 ? (
                            searchResults.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setSelectedStudentId(s.id)}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center justify-between hover:bg-blue-50 dark:hover:bg-blue-900/20 ${selectedStudentId === s.id ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-semibold' : 'text-slate-700 dark:text-slate-300'}`}
                                >
                                    {s.label}
                                    {selectedStudentId === s.id && <span className="material-icons !text-sm text-blue-600">check</span>}
                                </button>
                            ))
                        ) : (
                             <div className="p-4 text-center text-xs text-slate-400 italic">
                                 {searchTerm ? "No se encontraron alumnos." : "Empieza a escribir para buscar."}
                             </div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                    <button 
                        onClick={() => selectedStudentId && onConfirm(selectedStudentId)}
                        disabled={!selectedStudentId}
                        className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        <span className="material-icons !text-base">content_copy</span>
                        Duplicar
                    </button>
                </div>
            </div>
        </div>
    );
}

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
      className={`px-6 py-4 cursor-pointer select-none group hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 shadow-[0_1px_0_0_rgba(226,232,240,1)] dark:shadow-[0_1px_0_0_rgba(51,65,85,1)] ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span className="text-xs font-extrabold text-slate-700 dark:text-slate-400 uppercase tracking-wider">{label}</span>
        <span className={`material-icons !text-sm transition-opacity ${isActive ? 'opacity-100 text-blue-600 dark:text-blue-400' : 'opacity-30 group-hover:opacity-70 text-slate-500'}`}>{icon}</span>
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
    <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4 px-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-slate-700 dark:text-slate-400 w-full sm:w-auto justify-center sm:justify-start">
            <div className="flex items-center gap-2">
                <span>Filas:</span>
                <select 
                    value={itemsPerPage} 
                    onChange={(e) => { onItemsPerPageChange(Number(e.target.value)); onPageChange(1); }}
                    className="bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer text-slate-900 dark:text-white"
                >
                    {ITEMS_PER_PAGE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
            <span>
                Total: <strong>{totalItems}</strong> registros
            </span>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={() => onPageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
            >
                <span className="material-icons !text-xl">chevron_left</span>
            </button>
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 min-w-[80px] text-center">
                Pág {currentPage} de {totalPages || 1}
            </span>
            <button 
                onClick={() => onPageChange(currentPage + 1)} 
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors text-slate-600 dark:text-slate-300"
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
    const [editingRecord, setEditingRecord] = useState<AppRecord<any> | { isCreating: true; initialData?: any } | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number; y: number; record: AppRecord<any> } | null>(null);
    
    // Special state for Practice duplication
    const [duplicatingRecord, setDuplicatingRecord] = useState<AppRecord<any> | null>(null);

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
    // Autocomplete lists
    const [studentOptionsForFilter, setStudentOptionsForFilter] = useState<{id: string, label: string}[]>([]);
    const [launchOptionsForFilter, setLaunchOptionsForFilter] = useState<{id: string, label: string}[]>([]);
    
    // Estudiantes Filter
    const [finalizedFilter, setFinalizedFilter] = useState('all');

    // Bulk Action State
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [isBulkUpdating, setIsBulkUpdating] = useState(false);

    const queryClient = useQueryClient();

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setCurrentPage(1); 
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);
    
    // 2. Prepare Dynamic Configuration
    const tableConfig = useMemo(() => {
        const config = { ...BASE_TABLE_CONFIGS[activeTable] } as TableConfig;
        
        // Inject options dynamically
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
            
            // Note: We don't load ALL students/launches here anymore for performance.
            // The RecordEditModal will need to handle async search or simplified text input for IDs if not using lookupData.
        }
        return config;
    }, [activeTable]);

    // --- Filter Logic ---

    // Fetch available launches for filter dropdown if institution selected
    useEffect(() => {
        if (activeTable === 'practicas' && selectedInstitutionForFilter) {
            db.lanzamientos.getAll({ 
                filters: { [FIELD_NOMBRE_PPS_LANZAMIENTOS]: selectedInstitutionForFilter }, // Using partial match via service logic or exact if configured
                sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]
            }).then(records => {
                 setLaunchOptionsForFilter(records.map(l => ({
                     id: l.id,
                     label: `${l[FIELD_NOMBRE_PPS_LANZAMIENTOS]} (${formatDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])})`
                 })));
            });
        } else {
            setLaunchOptionsForFilter([]);
        }
    }, [activeTable, selectedInstitutionForFilter]);

    // Fetch student options for autocomplete filter
    useEffect(() => {
        if (activeTable === 'practicas' && studentSearchText.length > 2) {
             db.estudiantes.getPage(1, 10, { searchTerm: studentSearchText, searchFields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES] })
                .then(({ records }) => {
                    setStudentOptionsForFilter(records.map(s => ({
                        id: s.id,
                        label: `${s[FIELD_NOMBRE_ESTUDIANTES]} (${s[FIELD_LEGAJO_ESTUDIANTES]})`
                    })));
                });
        }
    }, [activeTable, studentSearchText]);

    const queryFilters = useMemo(() => {
        const filters: Record<string, any> = {};
        
        if (activeTable === 'practicas') {
            if (selectedLaunchFilter) {
                 filters[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] = selectedLaunchFilter;
            } else if (selectedInstitutionForFilter) {
                filters[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] = selectedInstitutionForFilter;
            }

            if (selectedStudentFilter) {
                filters[FIELD_ESTUDIANTE_LINK_PRACTICAS] = selectedStudentFilter;
            }
        }

        if (activeTable === 'estudiantes') {
            if (finalizedFilter !== 'all') {
                filters[FIELD_FINALIZARON_ESTUDIANTES] = finalizedFilter === 'true';
            }
        }

        return Object.keys(filters).length > 0 ? filters : undefined;
    }, [activeTable, selectedLaunchFilter, selectedInstitutionForFilter, selectedStudentFilter, finalizedFilter]);


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

            // Join data for display (HYDRATION OPTIMIZATION)
            if (activeTable === 'practicas' && records.length > 0) {
                // Extract IDs from the CURRENT PAGE only
                const studentIds = new Set(records.map(r => {
                     const val = r[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                     return Array.isArray(val) ? val[0] : val;
                }).filter(Boolean));
                
                const launchIds = new Set(records.map(r => {
                     const val = r[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
                     return Array.isArray(val) ? val[0] : val;
                }).filter(Boolean));

                // Fetch only what is needed
                const [estudiantesRes, lanzamientosRes] = await Promise.all([
                    studentIds.size > 0 ? db.estudiantes.getAll({ 
                        filters: { id: Array.from(studentIds) },
                        fields: [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES] 
                    }) : [],
                    launchIds.size > 0 ? db.lanzamientos.getAll({ 
                        filters: { id: Array.from(launchIds) },
                        fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS] 
                    }) : []
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
             // Close duplicating modal if open
             setDuplicatingRecord(null);
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

    const handleDelete = (recordId: string) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este registro? Esta acción no se puede deshacer.')) {
            deleteMutation.mutate(recordId);
        }
    };

    const tableTabs = Object.entries(BASE_TABLE_CONFIGS).map(([key, { label, icon }]) => ({ id: key, label, icon }));

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
        setCurrentPage(1); // Reset to first page on sort change
    };

    const handleRowContextMenu = (e: React.MouseEvent, record: AppRecord<any>) => {
        e.preventDefault();
        setSelectedRowId(record.id);
        setContextMenu({ x: e.clientX, y: e.clientY, record });
    };

    const handleDuplicate = () => {
        if (!contextMenu?.record) return;
        const record = contextMenu.record;
        
        if (activeTable === 'practicas') {
            // Open specific modal for Practices to choose a new student
            setDuplicatingRecord(record);
            setContextMenu(null);
            return;
        }

        // Standard duplication for other tables
        const { id, createdTime, created_at, ...fields } = record;
        const newFields = JSON.parse(JSON.stringify(fields));

        const primaryFieldKey = tableConfig.displayFields[0];
        if (newFields[primaryFieldKey] && typeof newFields[primaryFieldKey] === 'string') {
             newFields[primaryFieldKey] = `${newFields[primaryFieldKey]} (Copia)`;
        }

        delete newFields['__studentName'];
        delete newFields['__lanzamientoName'];

        setEditingRecord({ isCreating: true, initialData: newFields });
        setContextMenu(null);
    };
    
    const handleConfirmDuplicate = (studentId: string) => {
        if (!duplicatingRecord) return;
        const { id, createdTime, created_at, ...fields } = duplicatingRecord;
        const newFields = JSON.parse(JSON.stringify(fields));
        
        // Remove computed fields
        delete newFields['__studentName'];
        delete newFields['__lanzamientoName'];
        
        // Assign new student
        newFields[FIELD_ESTUDIANTE_LINK_PRACTICAS] = studentId;

        // Flatten launch ID if needed
        const launchIdRaw = newFields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS];
        if (Array.isArray(launchIdRaw) && launchIdRaw.length > 0) {
             newFields[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS] = launchIdRaw[0];
        }
        
        newFields[FIELD_NOTA_PRACTICAS] = 'Sin calificar'; 
        
        createMutation.mutate(newFields);
    };

    // GENERIC BATCH UPDATE LOGIC
    const executeBatchUpdate = async (field: string, newValue: any) => {
        if (!window.confirm(`¿Está seguro que desea establecer "${newValue}" en el campo "${field}" para TODOS los registros filtrados? Esta acción no se puede deshacer.`)) {
            return;
        }

        setIsBulkUpdating(true);
        setToastInfo({ message: 'Actualizando registros...', type: 'success' });

        try {
            // 1. Reconstruct the query to fetch ALL matching IDs (ignoring pagination)
            let query = supabase.from(tableConfig.tableName).select('id');
            
            // Apply filters (AND) from the hook state
            // We manually reconstruct the filter logic here since we can't easily share the query builder
            if (queryFilters) {
                Object.entries(queryFilters).forEach(([key, value]) => {
                     // Basic equality or special handling if needed, matching supabaseService logic
                     if (Array.isArray(value)) {
                         query = query.in(key, value);
                     } else if (key === FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS) {
                         query = query.ilike(key, `%${value}%`);
                     } else {
                         query = query.eq(key, value);
                     }
                });
            }

            // Apply search (OR)
            if (debouncedSearch && tableConfig.searchFields.length > 0) {
                 const term = debouncedSearch.replace(/[^\w\s]/gi, '');
                 if (term) {
                     const orQuery = tableConfig.searchFields.map(f => `${f}.ilike.%${term}%`).join(',');
                     query = query.or(orQuery);
                 }
            }

            const { data: idsToUpdate, error: fetchError } = await query;

            if (fetchError) throw fetchError;
            
            if (!idsToUpdate || idsToUpdate.length === 0) {
                 setToastInfo({ message: 'No se encontraron registros para actualizar.', type: 'error' });
                 setIsBulkUpdating(false);
                 return;
            }

            // 2. Prepare updates
            const updates = idsToUpdate.map(record => ({
                id: record.id,
                fields: { [field]: newValue }
            }));

            // 3. Execute batch update
            await db[activeTable].updateMany(updates as any);
            
            setToastInfo({ message: `Se actualizaron ${updates.length} registros correctamente.`, type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['databaseEditor', activeTable] });
            setIsBatchModalOpen(false);

        } catch (e: any) {
             console.error("Batch Update Error:", e);
             setToastInfo({ message: `Error al actualizar: ${e.message}`, type: 'error' });
        } finally {
            setIsBulkUpdating(false);
        }
    };

    const renderCellValue = (record: AppRecord<any>, fieldConfig: any) => {
        const key = fieldConfig.key;
        let value = record[key];

        if (key === FIELD_HORAS_PRACTICAS) {
             return (
                <span className="font-bold text-slate-800 dark:text-slate-200">
                    {value || 0} <span className="text-xs font-normal text-slate-500">hs</span>
                </span>
             );
        }

        if (key === FIELD_ESTADO_PRACTICA) {
            const visuals = getStatusVisuals(String(value || ''));
            return (
                <span className={`${visuals.labelClass} px-2 py-0.5 rounded-full text-xs border flex items-center gap-1 w-fit`}>
                    <span className="material-icons !text-sm">{visuals.icon}</span>
                    <span className="capitalize">{String(value || 'N/A')}</span>
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
            return <span className="font-mono text-xs whitespace-nowrap text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{formatDate(value)}</span>;
        }
        
        if (key === FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES || key === FIELD_ESPECIALIDAD_PRACTICAS) {
            if (!value) return <span className="text-slate-400">-</span>;
            const visuals = getEspecialidadClasses(String(value));
            return <span className={`${visuals.tag} whitespace-nowrap shadow-none border-0`}>{String(value)}</span>;
        }

        return <span className="truncate block max-w-[200px] text-sm text-slate-700 dark:text-slate-300" title={String(value || '')}>{String(value || '')}</span>;
    };
    
    // --- MOBILE CARD RENDERER ---
    const renderMobileCard = (record: AppRecord<any>) => {
        const primaryFieldKey = tableConfig.displayFields[0];
        const primaryValue = record[primaryFieldKey];
        
        return (
            <div 
                key={record.id} 
                className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 space-y-3 transition-all hover:shadow-md"
                onClick={() => setSelectedRowId(selectedRowId === record.id ? null : record.id)}
            >
                {/* Card Header */}
                <div className="flex justify-between items-start gap-2 border-b border-slate-100 dark:border-slate-700/50 pb-2 mb-2">
                    <div className="font-bold text-slate-900 dark:text-slate-100 text-base truncate flex-1">
                        {String(primaryValue)}
                    </div>
                     <div className="flex gap-2 shrink-0">
                        <button 
                            onClick={(e) => { e.stopPropagation(); setEditingRecord(record); }}
                            className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30"
                        >
                            <span className="material-icons !text-lg">edit</span>
                        </button>
                         <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(record.id); }}
                            className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/30"
                        >
                            <span className="material-icons !text-lg">delete</span>
                        </button>
                    </div>
                </div>

                {/* Card Body: Fields Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    {tableConfig.displayFields.slice(1).map(key => {
                        const fieldConfig = tableConfig.fieldConfig.find(f => f.key === key) || { key, label: key };
                        const label = fieldConfig.label;
                        
                        return (
                            <div key={key} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{label}:</span>
                                <div className="text-slate-700 dark:text-slate-300 font-medium break-words">
                                    {renderCellValue(record, fieldConfig)}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
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
                    onTabChange={(id) => { setActiveTable(id as TableKey); setSearchTerm(''); setSortConfig({ key: '', direction: 'asc' }); setSelectedInstitutionForFilter(''); }} 
                />
            </div>

            <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700/60 pt-6">
                <div className="space-y-4 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        {/* Search - Hidden for Practices which uses specific filters */}
                        {activeTable !== 'practicas' && (
                            <div className="relative w-full md:w-72 group">
                                <input 
                                    type="search" 
                                    placeholder="Buscar..." 
                                    value={searchTerm} 
                                    onChange={e => setSearchTerm(e.target.value)} 
                                    className="w-full pl-10 pr-10 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm text-slate-900 dark:text-slate-100" 
                                />
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg pointer-events-none">search</span>
                                {searchTerm && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" style={{ opacity: isLoading ? 1 : 0 }} />
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="flex items-center gap-2 w-full md:w-auto">
                             {/* Generic Batch Update Button - Visible if records exist */}
                             {totalItems > 0 && (
                                <button
                                    onClick={() => setIsBatchModalOpen(true)}
                                    className="hidden md:flex w-full md:w-auto bg-indigo-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm items-center justify-center gap-2 transition-all shrink-0 hover:bg-indigo-700 shadow-md"
                                >
                                    <span className="material-icons !text-lg">playlist_add_check</span>
                                    Edición en Lote
                                </button>
                             )}

                            {/* Delete Selection Button */}
                            <button 
                                onClick={() => selectedRowId && handleDelete(selectedRowId)} 
                                disabled={!selectedRowId}
                                className={`hidden md:flex w-full md:w-auto bg-white dark:bg-slate-800 border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 font-bold py-2.5 px-5 rounded-lg text-sm items-center justify-center gap-2 transition-all shrink-0 ${!selectedRowId ? 'opacity-50 cursor-not-allowed' : 'hover:bg-rose-50 dark:hover:bg-rose-900/30 shadow-sm'}`}
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
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-4 animate-fade-in shadow-sm">
                            
                            {/* 1. Input Text to filter by Institution */}
                            <div className="col-span-1 sm:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Institución</label>
                                <div className="relative">
                                     <input
                                        type="text"
                                        placeholder="Nombre de institución..."
                                        value={selectedInstitutionForFilter}
                                        onChange={(e) => {
                                            setSelectedInstitutionForFilter(e.target.value);
                                            setSelectedLaunchFilter(''); // Reset launch filter
                                            setCurrentPage(1);
                                        }}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    />
                                </div>
                            </div>

                            {/* 2. Filter by Launch (Autocomplete based on Institution Text) */}
                            <div className="col-span-1 sm:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Lanzamiento (Específico)</label>
                                <div className="relative">
                                    <select 
                                        value={selectedLaunchFilter} 
                                        onChange={(e) => { setSelectedLaunchFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400"
                                        disabled={!selectedInstitutionForFilter || launchOptionsForFilter.length === 0}
                                    >
                                        <option value="">Todos los lanzamientos</option>
                                        {launchOptionsForFilter.map(l => (
                                            <option key={l.id} value={l.id}>{l.label}</option>
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
                                        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {studentOptionsForFilter.length > 0 ? (
                                                studentOptionsForFilter.map(s => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            setStudentSearchText(s.label);
                                                            setSelectedStudentFilter(s.id);
                                                            setShowStudentOptions(false);
                                                            setCurrentPage(1);
                                                        }}
                                                        className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 block truncate transition-colors"
                                                    >
                                                        {s.label}
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
                    
                    {/* Filter for Estudiantes */}
                    {activeTable === 'estudiantes' && (
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-12 gap-4 animate-fade-in shadow-sm">
                            <div className="col-span-1 sm:col-span-4">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Estado Finalización</label>
                                <div className="relative">
                                    <select 
                                        value={finalizedFilter} 
                                        onChange={(e) => { setFinalizedFilter(e.target.value); setCurrentPage(1); }}
                                        className="w-full rounded-lg border border-slate-300 dark:border-slate-600 p-2.5 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="all">Todos</option>
                                        <option value="true">Finalizaron</option>
                                        <option value="false">En Curso / No Finalizaron</option>
                                    </select>
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 pointer-events-none !text-base">expand_more</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                
                {isLoading && records.length === 0 && <div className="py-10"><Loader /></div>}
                {error && <EmptyState icon="error" title="Error de Carga" message={error.message} />}
                
                {(!isLoading || records.length > 0) && !error && (
                    <>
                        {/* --- DESKTOP TABLE VIEW --- */}
                        <div className="hidden md:block bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[800px] text-sm text-left">
                                    <thead className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
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
                                                            ? 'bg-blue-100 dark:bg-blue-900/40 ring-1 ring-inset ring-blue-300 dark:ring-blue-700' 
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
                        </div>

                        {/* --- MOBILE CARD VIEW --- */}
                        <div className="md:hidden space-y-4">
                            {records.length > 0 ? records.map(record => renderMobileCard(record)) : (
                                <div className="py-12"><EmptyState icon="search_off" title="Sin Resultados" message="No hay registros que coincidan con tu búsqueda." /></div>
                            )}
                        </div>
                        
                        <PaginationControls 
                            currentPage={currentPage} 
                            totalPages={totalPages} 
                            onPageChange={setCurrentPage} 
                            itemsPerPage={itemsPerPage} 
                            onItemsPerPageChange={setItemsPerPage} 
                            totalItems={totalItems} 
                        />
                    </>
                )}
            </div>

            {editingRecord && (
                <RecordEditModal 
                    isOpen={!!editingRecord} 
                    onClose={() => setEditingRecord(null)} 
                    record={'isCreating' in editingRecord ? null : editingRecord}
                    initialData={'isCreating' in editingRecord ? editingRecord.initialData : undefined}
                    tableConfig={tableConfig} 
                    onSave={(recordId, fields) => {
                        if (recordId) { updateMutation.mutate({ recordId, fields }); } else { createMutation.mutate(fields); }
                    }} 
                    isSaving={updateMutation.isPending || createMutation.isPending} 
                />
            )}
            
            {isBatchModalOpen && (
                <BatchUpdateModal
                    isOpen={isBatchModalOpen}
                    onClose={() => setIsBatchModalOpen(false)}
                    onConfirm={executeBatchUpdate}
                    tableConfig={tableConfig}
                    isUpdating={isBulkUpdating}
                    count={totalItems}
                />
            )}
            
            {duplicatingRecord && (
                <DuplicateTargetModal
                    isOpen={!!duplicatingRecord}
                    onClose={() => setDuplicatingRecord(null)}
                    onConfirm={handleConfirmDuplicate}
                    students={studentOptionsForFilter} // Reusing the filter options which are lightweight
                />
            )}
        </Card>
    );
};

export default DatabaseEditor;
