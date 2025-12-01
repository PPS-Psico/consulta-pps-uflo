
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { 
    FIELD_FECHA_FIN_LANZAMIENTOS, 
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_TELEFONO_INSTITUCIONES,
    FIELD_ESTADO_FINALIZACION,
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_SOLICITUD_LEGAJO_ALUMNO,
    TABLE_NAME_LANZAMIENTOS_PPS,
    TABLE_NAME_INSTITUCIONES,
    TABLE_NAME_FINALIZACION,
    TABLE_NAME_PPS,
    TABLE_NAME_ESTUDIANTES,
    COL_FINALIZACION_ESTADO,
    COL_SOLICITUD_ESTADO,
    COL_SOLICITUD_UPDATED_AT,
    COL_LANZAMIENTO_FECHA_FIN,
    COL_LANZAMIENTO_ESTADO_GESTION,
} from '../constants';
import { parseToUTCDate, formatDate, normalizeStringForComparison } from '../utils/formatters';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Card from './Card';
import Toast from './Toast';

const RELAUNCH_STATUS_OPTIONS = [
    'Pendiente de Gestión', 
    'En Conversación', 
    'Esperando Respuesta',
    'Relanzamiento Confirmado', 
    'No se Relanza'
];

const SectionHeader: React.FC<{ title: string; icon: string; count?: number; colorClass?: string }> = ({ title, icon, count, colorClass = "text-slate-700 dark:text-slate-200" }) => (
    <div className="flex items-center gap-3 mb-6">
        <div className={`p-2.5 rounded-xl bg-white dark:bg-slate-700 shadow-sm ${colorClass}`}>
            <span className="material-icons !text-2xl">{icon}</span>
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            {title}
            {count !== undefined && (
                <span className="text-sm bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-600">
                    {count}
                </span>
            )}
        </h3>
    </div>
);

interface AdminDashboardProps {
    isTestingMode?: boolean;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ isTestingMode = false }) => {
    const queryClient = useQueryClient();
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
    const [tempPhone, setTempPhone] = useState('');
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['adminDashboardOverview', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                 return { endingLaunches: [], pendingFinalizations: [], pendingRequests: [] };
            }

            // Date filters for Launches
            const now = new Date();
            const sixtyDaysFromNow = new Date();
            sixtyDaysFromNow.setDate(now.getDate() + 60);
            const ninetyDaysAgo = new Date();
            ninetyDaysAgo.setDate(now.getDate() - 90);

            // 1. Fetch Ending Launches directly filtered from DB
            // We need to fetch 'instituciones' manually later because there is no FK.
            const { data: launchesData } = await supabase
                .from(TABLE_NAME_LANZAMIENTOS_PPS)
                .select('*')
                .gte(COL_LANZAMIENTO_FECHA_FIN, ninetyDaysAgo.toISOString())
                .lte(COL_LANZAMIENTO_FECHA_FIN, sixtyDaysFromNow.toISOString())
                .not(COL_LANZAMIENTO_ESTADO_GESTION, 'in', '("Archivado","No se Relanza")');

            // Fetch needed institutions for these launches to get phone numbers
            const institutionNames = new Set((launchesData || []).map((l: any) => {
                const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                return name.split(' - ')[0].trim();
            }));
            
            const { data: institutionsData } = await supabase
                .from(TABLE_NAME_INSTITUCIONES)
                .select('id, nombre, telefono')
                .in('nombre', Array.from(institutionNames));

            const institutionsMap = new Map();
            (institutionsData || []).forEach((i: any) => {
                institutionsMap.set(normalizeStringForComparison(i.nombre), i);
            });

            const endingLaunches = (launchesData || []).map((l: any) => {
                const endDateStr = l[FIELD_FECHA_FIN_LANZAMIENTOS];
                const endDate = parseToUTCDate(endDateStr);
                const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0;
                
                const ppsName = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                const groupName = ppsName.split(' - ')[0].trim();
                const institution = institutionsMap.get(normalizeStringForComparison(groupName));

                return {
                    id: l.id,
                    ppsName: ppsName,
                    institutionName: groupName,
                    institutionId: institution?.id,
                    phone: institution?.telefono, // FIELD_TELEFONO_INSTITUCIONES
                    fechaFin: endDateStr,
                    daysLeft,
                    gestionStatus: l[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión',
                };
            }).sort((a: any, b: any) => a.daysLeft - b.daysLeft);


            // 2. Fetch Pending Finalizations (JOINED)
            // Explicit FK used to prevent ambiguity
            const { data: finalizationsData } = await supabase
                .from(TABLE_NAME_FINALIZACION)
                .select(`
                    id, 
                    created_at,
                    fecha_solicitud,
                    estudiante:estudiantes!fk_finalizacion_estudiante (nombre, legajo)
                `)
                .eq(COL_FINALIZACION_ESTADO, 'Pendiente');

            const pendingFinalizations = (finalizationsData || []).map((f: any) => ({
                id: f.id,
                studentName: f.estudiante?.nombre || 'Desconocido',
                fechaSolicitud: f[FIELD_FECHA_SOLICITUD_FINALIZACION] || f.created_at,
            }));


            // 3. Fetch Pending Requests (JOINED)
            // Explicit FK used to prevent ambiguity
            const { data: requestsData } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`
                    id,
                    created_at,
                    nombre_institucion,
                    estado_seguimiento,
                    actualizacion,
                    nombre_alumno,
                    estudiante:estudiantes!fk_solicitud_estudiante (nombre, legajo)
                `)
                .not(COL_SOLICITUD_ESTADO, 'in', '("Finalizada","Cancelada","Rechazada","PPS Realizada","Realizada","Solicitud Invalida","No se pudo concretar","Archivado")')
                .order('created_at', { ascending: false });

            const pendingRequests = (requestsData || []).map((s: any) => {
                // Prioritize joined data, fallback to manual fields
                const studentName = s.estudiante?.nombre || s[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Desconocido';
                return {
                    id: s.id,
                    studentName: studentName,
                    institucion: s[FIELD_EMPRESA_PPS_SOLICITUD] || 'Sin especificar',
                    estado: s[FIELD_ESTADO_PPS] || 'Pendiente',
                    updated: s[FIELD_ULTIMA_ACTUALIZACION_PPS] || s.created_at,
                };
            });

            return { endingLaunches, pendingFinalizations, pendingRequests };
        },
        refetchInterval: 60000, // Refresh every minute
        staleTime: 1000 * 60 * 5, // Cache data for 5 minutes to make navigation instant
    });

    const updatePhoneMutation = useMutation({
        mutationFn: async ({ id, phone }: { id: string; phone: string }) => {
            if (isTestingMode) return;
            return db.instituciones.update(id, { [FIELD_TELEFONO_INSTITUCIONES]: phone });
        },
        onSuccess: () => {
            setToastInfo({ message: 'Teléfono actualizado.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] });
            setEditingInstitutionId(null);
        },
        onError: () => setToastInfo({ message: 'Error al guardar.', type: 'error' })
    });

    const updateLaunchStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            setUpdatingStatusId(id);
            if (isTestingMode) return;
            return db.lanzamientos.update(id, { [FIELD_ESTADO_GESTION_LANZAMIENTOS]: status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] });
            setUpdatingStatusId(null);
        },
        onError: () => {
            setToastInfo({ message: 'Error al actualizar.', type: 'error' });
            setUpdatingStatusId(null);
        }
    });
    
    const archiveRequestMutation = useMutation({
        mutationFn: async (id: string) => {
            if (isTestingMode) return;
            return db.solicitudes.update(id, { [FIELD_ESTADO_PPS]: 'Archivado' });
        },
        onSuccess: () => {
             setToastInfo({ message: 'Solicitud archivada.', type: 'success' });
             queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] });
        }
    });

    const handleWhatsApp = (phone: string | undefined, institutionName: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const text = `Hola, nos comunicamos desde UFLO por el convenio de prácticas con ${institutionName}.`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleEditPhone = (instId: string, currentPhone: string | undefined) => {
        setEditingInstitutionId(instId);
        setTempPhone(currentPhone || '');
    };

    const savePhone = () => {
        if (editingInstitutionId && tempPhone.trim()) {
            updatePhoneMutation.mutate({ id: editingInstitutionId, phone: tempPhone });
        } else {
            setEditingInstitutionId(null);
        }
    };

    if (isLoading) return <Loader />;
    if (error || !data) return <EmptyState icon="error" title="Error" message="No se pudieron cargar los datos." />;

    const { endingLaunches, pendingFinalizations, pendingRequests } = data;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}

            {/* --- SUMMARY METRICS --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-md">
                    <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <span className="material-icons !text-3xl">autorenew</span>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{endingLaunches.length}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">PPS por Relanzar</p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-md">
                    <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <span className="material-icons !text-3xl">verified_user</span>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{pendingFinalizations.length}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Acreditaciones Pendientes</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-md">
                    <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <span className="material-icons !text-3xl">assignment_ind</span>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{pendingRequests.length}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Solicitudes Nuevas</p>
                    </div>
                </div>
            </div>

            {/* --- SECTION 1: RELAUNCH MANAGEMENT --- */}
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-900/10 dark:to-slate-800">
                <SectionHeader title="Prácticas por Finalizar / Relanzar" icon="next_week" count={endingLaunches.length} colorClass="text-amber-600 bg-amber-100 dark:bg-amber-900/20" />
                
                {endingLaunches.length === 0 ? (
                    <div className="text-center py-8 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="material-icons text-slate-300 !text-5xl mb-2">event_available</span>
                        <p className="text-slate-500 font-medium">No hay convenios próximos a vencer.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {endingLaunches.map((launch: any) => (
                            <div key={launch.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
                                    
                                    <div className="flex-grow min-w-0">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-bold text-base text-slate-800 dark:text-slate-100 truncate" title={launch.institutionName}>
                                                {launch.institutionName}
                                            </h4>
                                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${launch.daysLeft < 0 ? 'bg-red-50 text-red-700 border-red-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                                                {launch.daysLeft < 0 ? `Venció hace ${Math.abs(launch.daysLeft)} días` : `Vence en ${launch.daysLeft} días`}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">{launch.ppsName}</p>
                                    </div>
                                    
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        <div className="min-w-[180px] flex justify-end">
                                            {launch.institutionId ? (
                                                editingInstitutionId === launch.institutionId ? (
                                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded border border-blue-300 shadow-sm animate-fade-in">
                                                        <input 
                                                            type="tel" 
                                                            value={tempPhone} 
                                                            onChange={e => setTempPhone(e.target.value)}
                                                            className="w-24 px-2 py-1 text-sm border-none bg-transparent focus:ring-0 outline-none"
                                                            placeholder="Teléfono"
                                                            autoFocus
                                                        />
                                                        <button onClick={savePhone} className="text-emerald-600 hover:bg-emerald-50 rounded p-1"><span className="material-icons !text-base">check</span></button>
                                                        <button onClick={() => setEditingInstitutionId(null)} className="text-rose-500 hover:bg-rose-50 rounded p-1"><span className="material-icons !text-base">close</span></button>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-3">
                                                        {launch.phone ? (
                                                            <button 
                                                                onClick={() => handleWhatsApp(launch.phone, launch.institutionName)}
                                                                className="flex items-center gap-2 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
                                                            >
                                                                <span className="material-icons !text-sm">chat</span>
                                                                WhatsApp
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                onClick={() => handleEditPhone(launch.institutionId!, '')}
                                                                className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                                                            >
                                                                <span className="material-icons !text-xs">add_call</span> Agregar Tel
                                                            </button>
                                                        )}
                                                        {launch.phone && (
                                                            <button onClick={() => handleEditPhone(launch.institutionId!, launch.phone)} className="text-slate-400 hover:text-blue-500" title="Editar teléfono">
                                                                <span className="material-icons !text-sm">edit</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                )
                                            ) : (
                                                <span className="text-xs text-red-400 italic bg-red-50 px-2 py-1 rounded">Sin Institución</span>
                                            )}
                                        </div>

                                        <div className="relative min-w-[200px]">
                                            {updatingStatusId === launch.id && (
                                                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-10">
                                                    <div className="w-3 h-3 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                                                </div>
                                            )}
                                            <select 
                                                value={launch.gestionStatus}
                                                onChange={(e) => updateLaunchStatusMutation.mutate({ id: launch.id, status: e.target.value })}
                                                disabled={updatingStatusId === launch.id}
                                                className={`w-full text-xs font-semibold py-2 pl-3 pr-8 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all cursor-pointer appearance-none
                                                    ${launch.gestionStatus === 'Relanzamiento Confirmado' ? 'text-emerald-800 bg-emerald-50 border-emerald-200' : 
                                                      launch.gestionStatus === 'En Conversación' ? 'text-amber-800 bg-amber-50 border-amber-200' :
                                                      launch.gestionStatus === 'Esperando Respuesta' ? 'text-blue-800 bg-blue-50 border-blue-200' :
                                                      'text-slate-700 bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600'}
                                                `}
                                            >
                                                {RELAUNCH_STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                            </select>
                                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                                                <span className="material-icons !text-lg text-slate-400">expand_more</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <Card className="border-emerald-200/50 dark:border-emerald-800/30">
                    <SectionHeader title="Pendientes de Acreditación" icon="task_alt" count={pendingFinalizations.length} colorClass="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20" />
                    
                    {pendingFinalizations.length === 0 ? (
                        <div className="text-center py-6"><p className="text-sm text-slate-500 italic">¡Todo al día!</p></div>
                    ) : (
                        <div className="space-y-3">
                            {pendingFinalizations.map((f: any) => (
                                <div key={f.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{f.studentName}</h4>
                                        <p className="text-xs text-slate-500">Solicitado: {formatDate(f.fechaSolicitud)}</p>
                                    </div>
                                    <button className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1 rounded-md transition-colors">
                                        Revisar
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                <Card className="border-blue-200/50 dark:border-blue-800/30">
                    <SectionHeader title="Solicitudes de Alumnos" icon="inbox" count={pendingRequests.length} colorClass="text-blue-600 bg-blue-100 dark:bg-blue-900/20" />
                    
                    {pendingRequests.length === 0 ? (
                        <div className="text-center py-6"><p className="text-sm text-slate-500 italic">No hay solicitudes nuevas.</p></div>
                    ) : (
                        <div className="space-y-3">
                            {pendingRequests.map((req: any) => (
                                <div key={req.id} className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex justify-between items-center gap-4">
                                    <div className="min-w-0">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{req.studentName}</h4>
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                            <span className="material-icons !text-xs">business</span>
                                            <span className="truncate">{req.institucion}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600">{req.estado}</span>
                                        <button onClick={() => archiveRequestMutation.mutate(req.id)} className="p-1 text-slate-400 hover:bg-slate-200 rounded" title="Archivar">
                                            <span className="material-icons !text-lg">archive</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboard;
