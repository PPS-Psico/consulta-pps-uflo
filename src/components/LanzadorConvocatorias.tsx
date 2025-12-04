
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { InstitucionFields, LanzamientoPPSFields, AirtableRecord, LanzamientoPPS } from '../types';
import {
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  FIELD_INFORME_LANZAMIENTOS,
  FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
  TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_ESTADO_GESTION_LANZAMIENTOS,
  FIELD_NOTAS_GESTION_LANZAMIENTOS
} from '../constants';
import Card from './Card';
import Loader from './Loader';
import Toast from './Toast';
import { ALL_ORIENTACIONES } from '../types';
import { normalizeStringForComparison, formatDate, getEspecialidadClasses } from '../utils/formatters';
import SubTabs from './SubTabs';
import EmptyState from './EmptyState';
import RecordEditModal from './RecordEditModal';
import { schema } from '../lib/dbSchema';

const mockInstitutions = [
  { id: 'recInstMock1', [FIELD_NOMBRE_INSTITUCIONES]: 'Hospital de Juguete' },
  { id: 'recInstMock2', [FIELD_NOMBRE_INSTITUCIONES]: 'Escuela de Pruebas' },
  { id: 'recInstMock3', [FIELD_NOMBRE_INSTITUCIONES]: 'Empresa Ficticia S.A.' },
];

const mockLastLanzamiento = {
  id: 'recLanzMock1',
  [FIELD_ORIENTACION_LANZAMIENTOS]: 'Clinica',
  [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: 120,
  [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: 5,
  [FIELD_INFORME_LANZAMIENTOS]: 'http://example.com/informe-mock',
  [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: 'Lunes 9 a 13hs; Miércoles 14 a 18hs',
};

type FormData = {
    [key: string]: string | number | undefined | null | string[];
    nombrePPS: string | undefined;
    fechaInicio: string | undefined;
    fechaFin: string | undefined;
    orientacion: string | undefined;
    horasAcreditadas: number | undefined;
    cuposDisponibles: number | undefined;
    informe: string | undefined;
    // horarioSeleccionado se maneja via estado 'schedules'
    estadoConvocatoria: string | undefined;
};

const initialState: FormData = {
    nombrePPS: '',
    fechaInicio: '',
    fechaFin: '',
    orientacion: '',
    horasAcreditadas: 0,
    cuposDisponibles: 1,
    informe: '',
    estadoConvocatoria: 'Abierta',
};

interface LanzadorConvocatoriasProps {
  isTestingMode?: boolean;
  forcedTab?: 'new' | 'history';
}

const InputWrapper: React.FC<{ label: string; icon: string; children: React.ReactNode }> = ({ label, icon, children }) => (
    <div className="group">
        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="material-icons text-slate-400 group-focus-within:text-blue-500 transition-colors !text-xl">{icon}</span>
            </div>
            {children}
        </div>
    </div>
);

const LAUNCH_TABLE_CONFIG = {
    label: 'Lanzamientos',
    schema: schema.lanzamientos,
    fieldConfig: [
        { key: FIELD_NOMBRE_PPS_LANZAMIENTOS, label: 'Nombre PPS', type: 'text' as const },
        { key: FIELD_FECHA_INICIO_LANZAMIENTOS, label: 'Fecha Inicio', type: 'date' as const },
        { key: FIELD_FECHA_FIN_LANZAMIENTOS, label: 'Fecha Finalización', type: 'date' as const },
        { key: FIELD_ORIENTACION_LANZAMIENTOS, label: 'Orientación', type: 'select' as const, options: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'] },
        { key: FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, label: 'Horas Acreditadas', type: 'number' as const },
        { key: FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, label: 'Cupos', type: 'number' as const },
        { key: FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, label: 'Estado Convocatoria', type: 'select' as const, options: ['Abierta', 'Cerrado', 'Oculto'] },
        { key: FIELD_ESTADO_GESTION_LANZAMIENTOS, label: 'Estado Gestión', type: 'select' as const, options: ['Pendiente de Gestión', 'En Conversación', 'Relanzamiento Confirmado', 'No se Relanza', 'Archivado'] },
        { key: FIELD_NOTAS_GESTION_LANZAMIENTOS, label: 'Notas de Gestión', type: 'textarea' as const },
    ]
};

const LanzadorConvocatorias: React.FC<LanzadorConvocatoriasProps> = ({ isTestingMode = false, forcedTab }) => {
    const [internalTab, setInternalTab] = useState('new');
    const activeTab = forcedTab || internalTab;

    const [formData, setFormData] = useState<FormData>(initialState);
    const [schedules, setSchedules] = useState<string[]>(['']); // Lista de horarios
    const [instiSearch, setInstiSearch] = useState('');
    const [selectedInstitution, setSelectedInstitution] = useState<AirtableRecord<InstitucionFields> | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();
    
    // Edit Modal State
    const [editingLaunch, setEditingLaunch] = useState<AirtableRecord<LanzamientoPPSFields> | null>(null);

    const { data: institutions = [], isLoading: isLoadingInstitutions } = useQuery<AirtableRecord<InstitucionFields>[]>({
        queryKey: ['allInstitutionsForLauncher', isTestingMode],
        queryFn: () => {
            if (isTestingMode) {
                return Promise.resolve(mockInstitutions as unknown as AirtableRecord<InstitucionFields>[]);
            }
            return db.instituciones.getAll({ fields: [FIELD_NOMBRE_INSTITUCIONES] });
        },
    });

    const { data: lastLanzamiento, isLoading: isLoadingLastLanzamiento } = useQuery({
        queryKey: ['lastLanzamiento', selectedInstitution?.id, isTestingMode],
        queryFn: async () => {
            if (!selectedInstitution) return null;
            if (isTestingMode) {
                if (mockInstitutions.some(i => i.id === selectedInstitution.id)) {
                    return mockLastLanzamiento as unknown as AirtableRecord<LanzamientoPPSFields>;
                }
                return null;
            }
            
            // Updated query using native filters object
            const records = await db.lanzamientos.get({
                filters: {
                    [FIELD_NOMBRE_PPS_LANZAMIENTOS]: selectedInstitution[FIELD_NOMBRE_INSTITUCIONES] // Exact match logic implicit in service update
                },
                sort: [{ field: 'fecha_inicio', direction: 'desc' }],
                maxRecords: 1,
            });
            return records[0] || null;
        },
        enabled: !!selectedInstitution,
    });
    
    const { data: launchHistory = [], isLoading: isLoadingHistory, refetch: refetchHistory } = useQuery({
        queryKey: ['launchHistory', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) return [];
            return db.lanzamientos.getAll({ sort: [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }] });
        },
        enabled: activeTab === 'history'
    });

    const createLaunchMutation = useMutation({
        mutationFn: (newLaunchData: any) => {
            if (isTestingMode) {
                console.log('TEST MODE: Simulating launch creation with data:', newLaunchData);
                return new Promise(resolve => setTimeout(() => resolve(null), 1000));
            }
            return db.lanzamientos.create(newLaunchData);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Convocatoria lanzada con éxito.', type: 'success' });
            setFormData(initialState);
            setSchedules(['']);
            setInstiSearch('');
            setSelectedInstitution(null);
            if (!isTestingMode) {
                queryClient.invalidateQueries({ queryKey: ['allLanzamientos'] });
                queryClient.invalidateQueries({ queryKey: ['launchHistory'] });
            }
        },
        onError: (error: any) => {
            setToastInfo({ message: `Error al lanzar: ${error.message}`, type: 'error' });
        },
    });
    
    const updateStatusMutation = useMutation({
        mutationFn: ({ id, status }: { id: string, status: string }) => {
             return db.lanzamientos.update(id, { [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: status });
        },
        onSuccess: (_, variables) => {
             setToastInfo({ message: `Estado actualizado a "${variables.status}".`, type: 'success' });
             queryClient.invalidateQueries({ queryKey: ['launchHistory'] });
        },
        onError: (error: any) => {
             setToastInfo({ message: `Error al actualizar estado: ${error.message}`, type: 'error' });
        }
    });

    const updateDetailsMutation = useMutation({
        mutationFn: ({ id, fields }: { id: string, fields: any }) => {
            return db.lanzamientos.update(id, fields);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Lanzamiento actualizado.', type: 'success' });
            setEditingLaunch(null);
            queryClient.invalidateQueries({ queryKey: ['launchHistory'] });
        },
        onError: (error: any) => {
            setToastInfo({ message: `Error al guardar cambios: ${error.message}`, type: 'error' });
        }
    });

    const filteredInstitutions = useMemo(() => {
        if (!instiSearch) return [];
        const normalizedSearch = normalizeStringForComparison(instiSearch);
        return institutions
            .filter(inst => normalizeStringForComparison(inst[FIELD_NOMBRE_INSTITUCIONES]).includes(normalizedSearch))
            .slice(0, 7);
    }, [instiSearch, institutions]);

    const handleSelectInstitution = (inst: AirtableRecord<InstitucionFields>) => {
        setSelectedInstitution(inst);
        setInstiSearch(inst[FIELD_NOMBRE_INSTITUCIONES] || '');
        setFormData(prev => ({ ...prev, nombrePPS: inst[FIELD_NOMBRE_INSTITUCIONES] || '' }));
        setIsDropdownOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Manejo de Horarios
    const handleScheduleChange = (index: number, value: string) => {
        const newSchedules = [...schedules];
        newSchedules[index] = value;
        setSchedules(newSchedules);
    };

    const addSchedule = () => {
        setSchedules([...schedules, '']);
    };

    const removeSchedule = (index: number) => {
        const newSchedules = schedules.filter((_, i) => i !== index);
        setSchedules(newSchedules.length ? newSchedules : ['']);
    };
    
    const handleLoadLastData = () => {
        if (!lastLanzamiento) return;
        
        // Cargar horarios anteriores (separados por punto y coma)
        const prevSchedulesString = lastLanzamiento[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS];
        let prevSchedulesList = [''];
        if (prevSchedulesString) {
            prevSchedulesList = prevSchedulesString.split(';').map(s => s.trim()).filter(Boolean);
            if (prevSchedulesList.length === 0) prevSchedulesList = [''];
        }

        setFormData(prev => ({
            ...prev,
            orientacion: lastLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
            horasAcreditadas: lastLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
            cuposDisponibles: lastLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
            informe: lastLanzamiento[FIELD_INFORME_LANZAMIENTOS],
        }));
        
        setSchedules(prevSchedulesList);
        setToastInfo({ message: 'Datos de la última convocatoria cargados.', type: 'success' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombrePPS || !formData.fechaInicio || !formData.orientacion || !formData.horasAcreditadas) {
            setToastInfo({ message: 'Por favor, complete los campos requeridos.', type: 'error' });
            return;
        }

        // Unir horarios en un solo string
        const horarioFinal = schedules.map(s => s.trim()).filter(Boolean).join('; ');

        const finalPayload = {
            // Map formData keys to DB columns using constants
            [FIELD_NOMBRE_PPS_LANZAMIENTOS]: formData.nombrePPS,
            [FIELD_FECHA_INICIO_LANZAMIENTOS]: formData.fechaInicio,
            [FIELD_FECHA_FIN_LANZAMIENTOS]: formData.fechaFin,
            [FIELD_ORIENTACION_LANZAMIENTOS]: formData.orientacion,
            [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: formData.horasAcreditadas,
            [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: formData.cuposDisponibles,
            [FIELD_INFORME_LANZAMIENTOS]: formData.informe,
            [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: horarioFinal,
            [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: formData.estadoConvocatoria
        };

        createLaunchMutation.mutate(finalPayload);
    };

    const handleStatusAction = (id: string, currentStatus: string, action: 'cerrar' | 'abrir' | 'ocultar') => {
        let newStatus = currentStatus;
        if (action === 'cerrar') newStatus = 'Cerrado';
        if (action === 'abrir') newStatus = 'Abierta';
        if (action === 'ocultar') newStatus = 'Oculto';
        
        updateStatusMutation.mutate({ id, status: newStatus });
    };

    const inputClass = "w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-600 rounded-lg text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all";

    return (
        <Card 
            title={activeTab === 'new' ? "Nuevo Lanzamiento" : "Historial de Lanzamientos"} 
            icon={activeTab === 'new' ? "rocket_launch" : "history"}
            description={activeTab === 'new' ? "Configura y publica una nueva convocatoria." : "Visualiza y administra convocatorias anteriores."}
            className="border-blue-200 dark:border-blue-800/30"
        >
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {!forcedTab && (
                <div className="mt-4">
                    <SubTabs 
                        tabs={[
                            { id: 'new', label: 'Nuevo Lanzamiento', icon: 'add_circle' },
                            { id: 'history', label: 'Historial', icon: 'history' }
                        ]}
                        activeTabId={activeTab}
                        onTabChange={setInternalTab}
                    />
                </div>
            )}

            {activeTab === 'new' && (
                <form onSubmit={handleSubmit} className="mt-6 space-y-8 animate-fade-in">
                    
                    {/* SECCIÓN 1: INSTITUCIÓN */}
                    <div className="bg-slate-50/50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <span className="material-icons text-blue-500 !text-lg">apartment</span>
                                Seleccionar Institución
                            </h3>
                            
                            {/* Botón Mágico de Carga */}
                            {lastLanzamiento && (
                                <button 
                                    type="button" 
                                    onClick={handleLoadLastData} 
                                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors flex items-center gap-1"
                                >
                                    <span className="material-icons !text-sm">auto_fix_high</span>
                                    Copiar datos anteriores
                                </button>
                            )}
                        </div>

                        <div className="relative">
                            <input
                                id="instiSearch"
                                type="text"
                                value={instiSearch}
                                onChange={(e) => {
                                    setInstiSearch(e.target.value);
                                    setSelectedInstitution(null);
                                    setIsDropdownOpen(true);
                                }}
                                onFocus={() => setIsDropdownOpen(true)}
                                placeholder="Escribe el nombre de la institución..."
                                className="w-full pl-12 pr-4 py-3 text-lg font-medium bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-600 rounded-xl focus:border-blue-500 focus:ring-0 transition-colors shadow-sm placeholder:font-normal"
                                autoComplete="off"
                                required
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-2xl">search</span>
                            
                            {isDropdownOpen && filteredInstitutions.length > 0 && (
                                <div className="absolute z-20 mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-600 overflow-hidden animate-fade-in-up">
                                    <ul>
                                        {filteredInstitutions.map(inst => (
                                            <li 
                                                key={inst.id} 
                                                onClick={() => handleSelectInstitution(inst)} 
                                                className="px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0 transition-colors flex items-center gap-3"
                                            >
                                                <span className="material-icons text-slate-400 !text-lg">business</span>
                                                <span className="text-slate-700 dark:text-slate-200">{inst[FIELD_NOMBRE_INSTITUCIONES]}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* SECCIÓN 2: CRONOGRAMA Y DETALLES */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Columna Izquierda */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="material-icons text-slate-400 !text-lg">date_range</span>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Cronograma</h4>
                            </div>
                            
                            <InputWrapper label="Fecha de Inicio" icon="event">
                                <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} className={inputClass} required />
                            </InputWrapper>

                            <InputWrapper label="Fecha de Finalización" icon="event_busy">
                                <input type="date" name="fechaFin" value={formData.fechaFin} onChange={handleChange} className={inputClass} required />
                            </InputWrapper>

                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700 mt-8">
                                <span className="material-icons text-slate-400 !text-lg">info</span>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Detalles Académicos</h4>
                            </div>

                            <InputWrapper label="Orientación" icon="school">
                                <select name="orientacion" value={formData.orientacion} onChange={handleChange} className={inputClass} required>
                                    <option value="">Seleccionar...</option>
                                    {ALL_ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
                                </select>
                            </InputWrapper>

                            <div className="grid grid-cols-2 gap-4">
                                <InputWrapper label="Horas Acreditadas" icon="schedule">
                                    <input type="number" name="horasAcreditadas" value={formData.horasAcreditadas} onChange={handleChange} className={inputClass} required min="1" />
                                </InputWrapper>
                                <InputWrapper label="Cupos Disponibles" icon="group_add">
                                    <input type="number" name="cuposDisponibles" value={formData.cuposDisponibles} onChange={handleChange} className={inputClass} required min="1" />
                                </InputWrapper>
                            </div>
                        </div>

                        {/* Columna Derecha */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
                                <span className="material-icons text-slate-400 !text-lg">schedule</span>
                                <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm">Horarios y Recursos</h4>
                            </div>

                            <div className="space-y-3">
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">
                                    Opciones de Horarios
                                </label>
                                {schedules.map((schedule, idx) => (
                                    <div key={idx} className="flex gap-2">
                                        <input
                                            type="text"
                                            value={schedule}
                                            onChange={(e) => handleScheduleChange(idx, e.target.value)}
                                            placeholder="Ej: Lunes 9 a 13hs"
                                            className={inputClass}
                                            required
                                        />
                                        {schedules.length > 1 && (
                                            <button type="button" onClick={() => removeSchedule(idx)} className="p-2 text-slate-400 hover:text-rose-500 transition-colors">
                                                <span className="material-icons">remove_circle_outline</span>
                                            </button>
                                        )}
                                    </div>
                                ))}
                                <button type="button" onClick={addSchedule} className="text-sm font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1 mt-2">
                                    <span className="material-icons !text-lg">add</span> Agregar otro horario
                                </button>
                            </div>

                            <div className="mt-6">
                                <InputWrapper label="Link al Programa / Informe (Opcional)" icon="link">
                                    <input type="url" name="informe" value={formData.informe} onChange={handleChange} placeholder="https://..." className={inputClass} />
                                </InputWrapper>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={createLaunchMutation.isPending}
                            className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl shadow-lg hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {createLaunchMutation.isPending ? (
                                <><div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"/> Lanzando...</>
                            ) : (
                                <><span className="material-icons">rocket_launch</span> Publicar Convocatoria</>
                            )}
                        </button>
                    </div>
                </form>
            )}

            {activeTab === 'history' && (
                <div className="mt-6 space-y-4">
                    {isLoadingHistory ? <Loader /> : launchHistory.length === 0 ? <EmptyState icon="history_toggle_off" title="Sin Historial" message="No hay lanzamientos registrados." /> : (
                        launchHistory.map(launch => (
                            <div key={launch.id} className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-100">{launch[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</h4>
                                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${launch[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Abierta' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                            {launch[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Inicio: {formatDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS])} &bull; Orientación: {launch[FIELD_ORIENTACION_LANZAMIENTOS]}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => setEditingLaunch(launch)} className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                                        <span className="material-icons !text-xl">edit</span>
                                    </button>
                                    {launch[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] === 'Abierta' ? (
                                        <button onClick={() => handleStatusAction(launch.id, launch[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS], 'cerrar')} className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Cerrar Convocatoria">
                                            <span className="material-icons !text-xl">lock</span>
                                        </button>
                                    ) : (
                                        <button onClick={() => handleStatusAction(launch.id, launch[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS], 'abrir')} className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Reabrir Convocatoria">
                                            <span className="material-icons !text-xl">lock_open</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {editingLaunch && (
                <RecordEditModal 
                    isOpen={!!editingLaunch}
                    onClose={() => setEditingLaunch(null)}
                    record={editingLaunch}
                    tableConfig={LAUNCH_TABLE_CONFIG}
                    onSave={(id, fields) => updateDetailsMutation.mutate({ id: id!, fields })}
                    isSaving={updateDetailsMutation.isPending}
                />
            )}
        </Card>
    );
};

export default LanzadorConvocatorias;
