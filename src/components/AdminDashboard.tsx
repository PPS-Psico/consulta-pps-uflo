
import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { 
    FIELD_FECHA_FIN_PRACTICAS, 
    FIELD_ESTADO_PRACTICA, 
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_ESTADO_FINALIZACION,
    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_ESTADO_PPS,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_LEGAJO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_TELEFONO_INSTITUCIONES,
} from '../constants';
import { parseToUTCDate, formatDate, normalizeStringForComparison } from '../utils/formatters';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Card from './Card';
import Toast from './Toast';
import SolicitudesManager from './SolicitudesManager';

// --- Constants ---
const RELAUNCH_STATUS_OPTIONS = [
    'Pendiente de Gestión', 
    'En Conversación', 
    'Esperando Respuesta',
    'Relanzamiento Confirmado', 
    'No se Relanza'
];

// --- Helper Components ---

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

const ActionButton: React.FC<{ icon: string; label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'success' }> = ({ icon, label, onClick, variant = 'secondary' }) => {
    const styles = {
        primary: "bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50",
        secondary: "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700/50 dark:text-slate-300 dark:hover:bg-slate-700",
        success: "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:hover:bg-emerald-900/50",
    };

    return (
        <button 
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${styles[variant]}`}
        >
            <span className="material-icons !text-sm">{icon}</span>
            {label}
        </button>
    );
};

// --- Dashboard Component ---

const AdminDashboard: React.FC = () => {
    const queryClient = useQueryClient();
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    // State for editing phone numbers inline
    const [editingInstitutionId, setEditingInstitutionId] = useState<string | null>(null);
    const [tempPhone, setTempPhone] = useState('');
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

    const { data, isLoading, error } = useQuery({
        queryKey: ['adminDashboardOverview'],
        queryFn: async () => {
            const [lanzamientosRes, institucionesRes, finalizacionesRes, solicitudesRes, estudiantesRes] = await Promise.all([
                db.lanzamientos.getAll(),
                db.instituciones.getAll(),
                db.finalizacion.getAll(),
                db.solicitudes.getAll(),
                db.estudiantes.getAll({ fields: [FIELD_NOMBRE_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES] })
            ]);

            // Create maps for quick lookup
            const studentsMap = new Map(estudiantesRes.map(s => [s.id, s.fields]));
            const institutionsMap = new Map(institucionesRes.map(i => [normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES]), i]));

            return {
                lanzamientos: lanzamientosRes,
                instituciones: institutionsMap,
                finalizaciones: finalizacionesRes,
                solicitudes: solicitudesRes,
                studentsMap
            };
        },
        refetchInterval: 60000 // Refresh every minute
    });

    // Mutation to update phone number
    const updatePhoneMutation = useMutation({
        mutationFn: async ({ id, phone }: { id: string; phone: string }) => {
            return db.instituciones.update(id, { telefono: phone });
        },
        onSuccess: () => {
            setToastInfo({ message: 'Teléfono actualizado correctamente.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] });
            setEditingInstitutionId(null);
        },
        onError: () => {
            setToastInfo({ message: 'Error al guardar el teléfono.', type: 'error' });
        }
    });

    // Mutation to update launch status (relaunch flow)
    const updateLaunchStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            setUpdatingStatusId(id);
            return db.lanzamientos.update(id, { estadoGestion: status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] });
            setUpdatingStatusId(null);
        },
        onError: () => {
            setToastInfo({ message: 'Error al actualizar el estado.', type: 'error' });
            setUpdatingStatusId(null);
        }
    });
    
    // Mutation to archive request (direct from dashboard)
    const archiveRequestMutation = useMutation({
        mutationFn: async (id: string) => {
            return db.solicitudes.update(id, { [FIELD_ESTADO_PPS]: 'Archivado' });
        },
        onSuccess: () => {
             setToastInfo({ message: 'Solicitud archivada.', type: 'success' });
             queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] });
        },
        onError: () => {
             setToastInfo({ message: 'Error al archivar.', type: 'error' });
        }
    });

    const metrics = useMemo(() => {
        if (!data) return null;

        const now = new Date();
        const sixtyDaysFromNow = new Date();
        sixtyDaysFromNow.setDate(now.getDate() + 60);
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(now.getDate() - 90);

        // 1. Instituciones con Lanzamientos por Finalizar (para Relanzamiento)
        const endingLaunches = data.lanzamientos.filter(l => {
            const endDateStr = l.fields[FIELD_FECHA_FIN_LANZAMIENTOS];
            if (!endDateStr) return false;

            const endDate = parseToUTCDate(endDateStr);
            if (!endDate) return false;
            
            const statusGestion = l.fields[FIELD_ESTADO_GESTION_LANZAMIENTOS] || '';
            // Exclude if already archived or confirmed for relaunch (unless checking specifically)
            if (['Archivado', 'No se Relanza'].includes(statusGestion)) return false;

            // Include if end date is within next 60 days OR if it ended in the last 90 days (needs follow up)
            return (endDate <= sixtyDaysFromNow && endDate >= ninetyDaysAgo);
        }).map(l => {
            const endDateStr = l.fields[FIELD_FECHA_FIN_LANZAMIENTOS];
            const endDate = parseToUTCDate(endDateStr);
            const daysLeft = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : 0;
            
            const ppsName = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
            const groupName = ppsName.split(' - ')[0].trim();
            const institution = data.instituciones.get(normalizeStringForComparison(groupName));

            return {
                id: l.id,
                ppsName: ppsName,
                institutionName: groupName,
                institutionId: institution?.id,
                phone: institution?.fields[FIELD_TELEFONO_INSTITUCIONES],
                fechaFin: endDateStr,
                daysLeft,
                gestionStatus: l.fields[FIELD_ESTADO_GESTION_LANZAMIENTOS] || 'Pendiente de Gestión',
            };
        }).sort((a, b) => a.daysLeft - b.daysLeft); // Most urgent first (negative days means overdue)

        // 2. Pending Finalizations (Document Review)
        const pendingFinalizations = data.finalizaciones.filter(f => {
            return f.fields[FIELD_ESTADO_FINALIZACION] === 'Pendiente';
        }).map(f => {
            const studentId = (f.fields[FIELD_ESTUDIANTE_FINALIZACION] as any)?.[0] || f.fields[FIELD_ESTUDIANTE_FINALIZACION];
            const student = studentId ? data.studentsMap.get(studentId) : null;
            return {
                id: f.id,
                studentName: student?.[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido',
                fechaSolicitud: f.fields[FIELD_FECHA_SOLICITUD_FINALIZACION] || f.createdTime,
            };
        });

        // 3. Pending Requests (Solicitudes)
        const pendingRequests = data.solicitudes.filter(s => {
            const status = normalizeStringForComparison(s.fields[FIELD_ESTADO_PPS]);
            const excludedStatuses = ['finalizada', 'cancelada', 'rechazada', 'pps realizada', 'realizada', 'solicitud invalida', 'no se pudo concretar', 'archivado'];
            return !excludedStatuses.includes(status);
        }).map(s => {
            // Handle potential array for student link
            const rawStudentLink = s.fields[FIELD_LEGAJO_PPS];
            const studentId = Array.isArray(rawStudentLink) ? rawStudentLink[0] : rawStudentLink;
            
            // Extract Institution Name (handle potential lookup array)
            const rawInst = s.fields[FIELD_EMPRESA_PPS_SOLICITUD];
            const institucion = Array.isArray(rawInst) ? rawInst[0] : rawInst;

            const student = studentId ? data.studentsMap.get(String(studentId)) : null;
            
            return {
                id: s.id,
                studentName: student?.[FIELD_NOMBRE_ESTUDIANTES] || s.fields['Nombre'] || 'Desconocido',
                institucion: institucion || 'Sin especificar',
                estado: s.fields[FIELD_ESTADO_PPS] || 'Pendiente',
                updated: s.fields[FIELD_ULTIMA_ACTUALIZACION_PPS] || s.createdTime,
            };
        }).sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());

        return { endingLaunches, pendingFinalizations, pendingRequests };
    }, [data]);

    const handleWhatsApp = (phone: string | undefined, institutionName: string) => {
        if (!phone) return;
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const text = `Hola, nos comunicamos desde UFLO por el convenio de prácticas con ${institutionName}. Nos gustaría coordinar la renovación para el próximo ciclo.`;
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
    if (error || !metrics) return <EmptyState icon="error" title="Error" message="No se pudieron cargar los datos del dashboard." />;

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}

            {/* --- SUMMARY METRICS ROW --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-md">
                    <div className="p-4 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                        <span className="material-icons !text-3xl">autorenew</span>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{metrics.endingLaunches.length}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">PPS por Relanzar</p>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-md">
                    <div className="p-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                        <span className="material-icons !text-3xl">verified_user</span>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{metrics.pendingFinalizations.length}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Acreditaciones Pendientes</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-sm flex items-center gap-5 transition-transform hover:-translate-y-1 hover:shadow-md">
                    <div className="p-4 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <span className="material-icons !text-3xl">assignment_ind</span>
                    </div>
                    <div>
                        <p className="text-4xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{metrics.pendingRequests.length}</p>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Solicitudes Nuevas</p>
                    </div>
                </div>
            </div>

            {/* --- SECTION 1: RELAUNCH MANAGEMENT (FULL WIDTH) --- */}
            <Card className="border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-b from-amber-50/30 to-white dark:from-amber-900/10 dark:to-slate-800">
                <SectionHeader title="Prácticas por Finalizar / Relanzar" icon="next_week" count={metrics.endingLaunches.length} colorClass="text-amber-600 bg-amber-100 dark:bg-amber-900/20" />
                
                {metrics.endingLaunches.length === 0 ? (
                    <div className="text-center py-8 bg-white/50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <span className="material-icons text-slate-300 !text-5xl mb-2">event_available</span>
                        <p className="text-slate-500 font-medium">No hay convenios próximos a vencer.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {metrics.endingLaunches.map(launch => (
                            <div key={launch.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
                                    
                                    {/* Left: Info */}
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
                                    
                                    {/* Right: Actions */}
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                        
                                        {/* Phone Controls */}
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

                                        {/* Status Dropdown */}
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

            {/* --- SECTION 2 & 3: PENDING REVIEWS & REQUESTS (STACKED) --- */}
            
            <Card className="border-emerald-200/50 dark:border-emerald-800/30">
                <SectionHeader title="Pendientes de Acreditación" icon="task_alt" count={metrics.pendingFinalizations.length} colorClass="text-emerald-600 bg-emerald-100 dark:bg-emerald-900/20" />
                
                {metrics.pendingFinalizations.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-slate-500 italic">¡Todo al día! No hay revisiones pendientes.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {metrics.pendingFinalizations.map(f => (
                            <div key={f.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex justify-between items-center group hover:border-emerald-300 transition-all">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">{f.studentName}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Solicitado: {formatDate(f.fechaSolicitud)}</p>
                                </div>
                                <button className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors">
                                    Revisar
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Card className="border-blue-200/50 dark:border-blue-800/30">
                <SectionHeader title="Solicitudes de Alumnos" icon="inbox" count={metrics.pendingRequests.length} colorClass="text-blue-600 bg-blue-100 dark:bg-blue-900/20" />
                
                {metrics.pendingRequests.length === 0 ? (
                    <div className="text-center py-6">
                        <p className="text-sm text-slate-500 italic">No hay solicitudes nuevas.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {metrics.pendingRequests.map(req => (
                            <div key={req.id} className="p-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h4 className="font-bold text-slate-800 dark:text-slate-200 text-base">{req.studentName}</h4>
                                        <span className="text-xs text-slate-400 font-mono bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{formatDate(req.updated)}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                        <span className="material-icons !text-base text-slate-400">business</span>
                                        <span className="font-medium">{req.institucion}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold px-3 py-1.5 rounded-lg uppercase tracking-wide border ${
                                        req.estado.toLowerCase().includes('conversacion') ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 
                                        req.estado.toLowerCase().includes('contacto') ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                        'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                        {req.estado}
                                    </span>
                                    <button 
                                        onClick={() => archiveRequestMutation.mutate(req.id)}
                                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded-full transition-colors"
                                        title="Archivar Solicitud"
                                    >
                                        <span className="material-icons !text-xl">archive</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>
        </div>
    );
};

export default AdminDashboard;
