
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import type { SolicitudPPS, SolicitudPPSFields } from '../types';
import {
    FIELD_LEGAJO_PPS,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTADO_PPS,
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_NOTAS_PPS,
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_SOLICITUD_EMAIL_ALUMNO,
    FIELD_SOLICITUD_LOCALIDAD,
    FIELD_SOLICITUD_DIRECCION,
    FIELD_SOLICITUD_EMAIL_INSTITUCION,
    FIELD_SOLICITUD_TELEFONO_INSTITUCION,
    FIELD_SOLICITUD_REFERENTE,
    FIELD_SOLICITUD_TIENE_CONVENIO,
    FIELD_SOLICITUD_TIENE_TUTOR,
    FIELD_SOLICITUD_CONTACTO_TUTOR,
    FIELD_SOLICITUD_TIPO_PRACTICA,
    FIELD_SOLICITUD_DESCRIPCION,
    FIELD_SOLICITUD_LEGAJO_ALUMNO,
    TABLE_NAME_PPS,
    TABLE_NAME_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    COL_SOLICITUD_UPDATED_AT,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import Card from './Card';
import { formatDate, getStatusVisuals } from '../utils/formatters';
import SubTabs from './SubTabs';
import FinalizacionReview from './FinalizacionReview';
import { sendSmartEmail } from '../utils/emailService';

const cleanValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return cleanValue(val[0]);
    
    const str = String(val);
    
    // Robust check for Airtable stringified arrays '["value"]'
    if (str.startsWith('["') && str.endsWith('"]')) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return cleanValue(parsed[0]);
            }
        } catch (e) {
            // Fallback to regex if parse fails
        }
    }
    
    return str.replace(/[\[\]"]/g, '').trim();
}

const InfoField: React.FC<{ label: string; value?: string | null; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
    <div className={`mb-4 ${fullWidth ? 'col-span-full' : ''}`}>
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-slate-800 dark:text-slate-200 text-sm whitespace-pre-wrap break-words">
            {cleanValue(value) || ''}
        </p>
    </div>
);

const SolicitudDetailModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    record: SolicitudPPS;
    onSave: (recordId: string, fields: Partial<SolicitudPPSFields>) => void;
    isSaving: boolean;
}> = ({ isOpen, onClose, record, onSave, isSaving }) => {
    const [status, setStatus] = useState(record[FIELD_ESTADO_PPS] || 'Pendiente');
    const [notes, setNotes] = useState(record[FIELD_NOTAS_PPS] || '');

    if (!isOpen) return null;

    const studentName = (record as any)._studentName || cleanValue(record[FIELD_SOLICITUD_NOMBRE_ALUMNO]) || 'Desconocido';
    const studentLegajo = (record as any)._studentLegajo || cleanValue(record[FIELD_SOLICITUD_LEGAJO_ALUMNO]) || '---';
    const studentEmail = cleanValue(record[FIELD_SOLICITUD_EMAIL_ALUMNO]) || (record as any)._studentEmail;

    const handleSave = () => {
        onSave(record.id, {
            [FIELD_ESTADO_PPS]: status,
            [FIELD_NOTAS_PPS]: notes,
            [FIELD_ULTIMA_ACTUALIZACION_PPS]: new Date().toISOString().split('T')[0]
        });
    };

    const handleArchive = () => {
        if (window.confirm('¿Seguro que deseas archivar esta solicitud?')) {
            onSave(record.id, { [FIELD_ESTADO_PPS]: 'Archivado' });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {cleanValue(record[FIELD_EMPRESA_PPS_SOLICITUD]) || 'Institución s/n'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-500 dark:text-slate-400">Solicitud de Autogestión</span>
                            <span className="text-slate-300">|</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getStatusVisuals(status).labelClass}`}>
                                {status}
                            </span>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <span className="material-icons">close</span>
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-8">
                            <section>
                                <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2 mb-4 border-b border-blue-100 dark:border-blue-900 pb-2">
                                    <span className="material-icons !text-lg">person</span>
                                    Datos del Estudiante
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoField label="Nombre" value={studentName} />
                                    <InfoField label="Legajo" value={String(studentLegajo)} />
                                    <InfoField label="Email" value={studentEmail} fullWidth />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2 mb-4 border-b border-indigo-100 dark:border-indigo-900 pb-2">
                                    <span className="material-icons !text-lg">apartment</span>
                                    Detalles de la Institución
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoField label="Localidad" value={record[FIELD_SOLICITUD_LOCALIDAD]} />
                                    <InfoField label="Dirección" value={record[FIELD_SOLICITUD_DIRECCION]} />
                                    <InfoField label="Referente" value={record[FIELD_SOLICITUD_REFERENTE]} />
                                    <InfoField label="Convenio con UFLO" value={record[FIELD_SOLICITUD_TIENE_CONVENIO]} />
                                    <InfoField label="Descripción" value={record[FIELD_SOLICITUD_DESCRIPCION]} fullWidth />
                                </div>
                            </section>
                            
                             <section>
                                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2 mb-4 border-b border-emerald-100 dark:border-emerald-900 pb-2">
                                    <span className="material-icons !text-lg">contact_phone</span>
                                    Contactos y Tutoría
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <InfoField label="Email Institucional" value={record[FIELD_SOLICITUD_EMAIL_INSTITUCION]} fullWidth />
                                    <InfoField label="Teléfono Institucional" value={record[FIELD_SOLICITUD_TELEFONO_INSTITUCION]} />
                                    <InfoField label="¿Cuenta con Tutor?" value={record[FIELD_SOLICITUD_TIENE_TUTOR]} />
                                    <InfoField label="Contacto Tutor" value={record[FIELD_SOLICITUD_CONTACTO_TUTOR]} fullWidth />
                                    <InfoField label="Tipo Práctica" value={record[FIELD_SOLICITUD_TIPO_PRACTICA]} fullWidth />
                                </div>
                            </section>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-xl border border-slate-200 dark:border-slate-700 h-fit sticky top-0">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                <span className="material-icons text-slate-500">admin_panel_settings</span>
                                Gestión de Solicitud
                            </h3>
                            
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                        Estado de Seguimiento
                                    </label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="Pendiente">Pendiente</option>
                                        <option value="En conversaciones">En conversaciones</option>
                                        <option value="Realizando convenio">Realizando convenio</option>
                                        <option value="Puesta en contacto">Puesta en contacto</option>
                                        <option value="Rechazada">Rechazada</option>
                                        <option value="Cancelada">Cancelada</option>
                                        <option value="Finalizada">Finalizada</option>
                                        <option value="Archivado">Archivado</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                        Notas de Gestión
                                    </label>
                                    <textarea
                                        rows={8}
                                        value={notes}
                                        onChange={(e) => setNotes(e.target.value)}
                                        placeholder="Escribe notas sobre el avance de la solicitud..."
                                        className="w-full p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                    />
                                </div>
                                
                                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 items-center">
                                    <button onClick={handleArchive} className="mr-auto text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex items-center gap-1">
                                        <span className="material-icons !text-base">archive</span> Archivar
                                    </button>

                                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors">Cancelar</button>
                                    <button onClick={handleSave} disabled={isSaving} className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md hover:shadow-lg transition-all disabled:opacity-70 flex items-center gap-2 active:scale-95">
                                        {isSaving ? <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> Guardando...</> : <><span className="material-icons !text-base">save</span> Guardar Cambios</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface SolicitudesManagerProps {
    isTestingMode?: boolean;
}

const SolicitudesManager: React.FC<SolicitudesManagerProps> = ({ isTestingMode = false }) => {
    const [activeTabId, setActiveTabId] = useState('ingreso');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selectedRecord, setSelectedRecord] = useState<SolicitudPPS | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const queryClient = useQueryClient();

    const tabs = [
        { id: 'ingreso', label: 'Solicitudes de PPS', icon: 'login' },
        { id: 'egreso', label: 'Solicitudes de Finalización', icon: 'logout' },
    ];

    // 1. Optimized Fetch Data with SQL Join.
    // Simplified to rely on the DB source of truth rather than manual mapping.
    const { data: requestsData, isLoading, error, refetch } = useQuery({
        queryKey: ['adminSolicitudes', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) return [];

            // Perform a JOIN with estudiantes using Supabase and explicit foreign key
            const { data, error } = await supabase
                .from(TABLE_NAME_PPS)
                .select(`
                    *,
                    estudiante:${TABLE_NAME_ESTUDIANTES}!fk_solicitud_estudiante (
                        ${FIELD_NOMBRE_ESTUDIANTES},
                        ${FIELD_LEGAJO_ESTUDIANTES},
                        ${FIELD_CORREO_ESTUDIANTES}
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error("Error fetching solicitudes:", error);
                throw new Error(error.message);
            }
            
            if (!data) return [];

            return data.map((req: any) => {
                // Priority 1: Joined Data from DB
                // Priority 2: Snapshot Data stored in the Request record itself (Robust Fallback)
                
                const student = req.estudiante;
                const name = student?.[FIELD_NOMBRE_ESTUDIANTES] || cleanValue(req[FIELD_SOLICITUD_NOMBRE_ALUMNO]) || 'Desconocido';
                const legajo = student?.[FIELD_LEGAJO_ESTUDIANTES] || cleanValue(req[FIELD_SOLICITUD_LEGAJO_ALUMNO]) || '---';
                const email = student?.[FIELD_CORREO_ESTUDIANTES] || cleanValue(req[FIELD_SOLICITUD_EMAIL_ALUMNO]);

                // Flatten structure for easier UI consumption
                return {
                    ...req,
                    // Ensure IDs are strings
                    id: String(req.id),
                    createdTime: req.created_at,
                    _studentName: name, 
                    _studentLegajo: String(legajo),
                    _studentEmail: email 
                } as SolicitudPPS & { _studentName: string, _studentLegajo: string, _studentEmail: string };
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ recordId, fields }: { recordId: string, fields: any }) => {
             if (isTestingMode) return;
             
             // 1. Send Email Notification if Status Changed
             const originalRecord = requestsData?.find(r => r.id === recordId);
             if (originalRecord && fields[FIELD_ESTADO_PPS] && fields[FIELD_ESTADO_PPS] !== originalRecord[FIELD_ESTADO_PPS]) {
                 const emailData = {
                     studentName: (originalRecord as any)._studentName,
                     studentEmail: (originalRecord as any)._studentEmail,
                     institution: cleanValue(originalRecord[FIELD_EMPRESA_PPS_SOLICITUD]),
                     newState: fields[FIELD_ESTADO_PPS],
                     notes: fields[FIELD_NOTAS_PPS] || originalRecord[FIELD_NOTAS_PPS]
                 };
                 
                 const emailRes = await sendSmartEmail('solicitud', emailData);
                 if (!emailRes.success && emailRes.message !== 'Automación desactivada') {
                     console.warn('Failed to send email notification:', emailRes.message);
                 }
             }

             return db.solicitudes.update(recordId, fields);
        },
        onMutate: async ({ recordId, fields }) => {
            await queryClient.cancelQueries({ queryKey: ['adminSolicitudes', isTestingMode] });
            const previousData = queryClient.getQueryData<SolicitudPPS[]>(['adminSolicitudes', isTestingMode]);
            
            queryClient.setQueryData<SolicitudPPS[]>(['adminSolicitudes', isTestingMode], old => {
                if (!old) return [];
                return old.map(record => record.id === recordId ? { ...record, ...fields } : record);
            });
            
            setSelectedRecord(null);
            return { previousData };
        },
        onSuccess: () => {
            setToastInfo({ message: 'Solicitud actualizada.', type: 'success' });
        },
        onError: (err: any, _newTodo, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['adminSolicitudes', isTestingMode], context.previousData);
            }
            setToastInfo({ message: `Error al actualizar: ${err.message}`, type: 'error' });
        }
    });

    const filteredRequests = useMemo(() => {
        if (!requestsData) return [];
        return requestsData.filter(req => {
            const searchLower = searchTerm.toLowerCase();
            const studentName = String(req._studentName || '').toLowerCase();
            const studentLegajo = String(req._studentLegajo || '').toLowerCase();
            const institution = (req[FIELD_EMPRESA_PPS_SOLICITUD] || '').toLowerCase();
            const status = (req[FIELD_ESTADO_PPS] || '').toLowerCase();

            const matchesSearch = studentName.includes(searchLower) || 
                                  studentLegajo.includes(searchLower) || 
                                  institution.includes(searchLower);
            
            const matchesStatus = statusFilter === 'all' || status === statusFilter.toLowerCase();
            return matchesSearch && matchesStatus;
        });
    }, [requestsData, searchTerm, statusFilter]);

    if (isLoading) return <div className="flex justify-center p-12"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message={`No se pudieron cargar las solicitudes: ${error.message}`} />;

    return (
        <Card title="Gestión de Solicitudes" icon="list_alt" description="Administra las solicitudes de PPS iniciadas por los estudiantes.">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="mb-6">
                 <SubTabs tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId} />
            </div>

            {activeTabId === 'egreso' ? (
                <FinalizacionReview />
            ) : (
                <>
                    <div className="mt-6 flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="relative w-full md:w-96">
                            <input 
                                type="text" 
                                placeholder="Buscar por estudiante, legajo o institución..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">search</span>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Estado:</span>
                            <select 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full md:w-48 py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="all">Todos</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En conversaciones">En conversaciones</option>
                                <option value="Realizando convenio">Realizando convenio</option>
                                <option value="Puesta en contacto">Puesta en contacto</option>
                                <option value="Rechazada">Rechazada</option>
                                <option value="Cancelada">Cancelada</option>
                                <option value="Finalizada">Finalizada</option>
                                <option value="Archivado">Archivado</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-6 overflow-hidden border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
                        {filteredRequests.length === 0 ? (
                            <div className="p-12">
                                <EmptyState 
                                    icon="inbox" 
                                    title="Sin Resultados" 
                                    message="No se encontraron solicitudes con los filtros actuales." 
                                    action={
                                        <button 
                                            onClick={() => refetch()} 
                                            className="mt-4 flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                        >
                                            <span className="material-icons !text-sm">refresh</span> Actualizar
                                        </button>
                                    }
                                />
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-50 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold">Estudiante</th>
                                            <th className="px-6 py-4 font-semibold">Institución</th>
                                            <th className="px-6 py-4 font-semibold">Estado</th>
                                            <th className="px-6 py-4 font-semibold">Actualización</th>
                                            <th className="px-6 py-4 font-semibold text-right">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-800">
                                        {filteredRequests.map(req => {
                                            const statusVisuals = getStatusVisuals(req[FIELD_ESTADO_PPS]);
                                            return (
                                                <tr 
                                                    key={req.id} 
                                                    onClick={() => setSelectedRecord(req)}
                                                    className="hover:bg-slate-50/80 dark:hover:bg-slate-700/30 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4">
                                                        <p className="font-bold text-slate-800 dark:text-slate-100">{req._studentName}</p>
                                                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400">{req._studentLegajo}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <p className="text-slate-700 dark:text-slate-300 font-medium">{cleanValue(req[FIELD_EMPRESA_PPS_SOLICITUD]) || 'Sin especificar'}</p>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`${statusVisuals.labelClass} flex items-center gap-1 w-fit`}>
                                                            <span className="material-icons !text-sm">{statusVisuals.icon}</span>
                                                            {req[FIELD_ESTADO_PPS] || 'Pendiente'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 dark:text-slate-400 font-mono text-xs">
                                                        {formatDate(req[FIELD_ULTIMA_ACTUALIZACION_PPS] || req.createdTime)}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button 
                                                            className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 p-2 rounded-lg transition-colors"
                                                            title="Ver Detalle"
                                                        >
                                                            <span className="material-icons !text-lg">visibility</span>
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {selectedRecord && (
                        <SolicitudDetailModal
                            isOpen={!!selectedRecord}
                            onClose={() => setSelectedRecord(null)}
                            record={selectedRecord}
                            onSave={(recordId, fields) => updateMutation.mutate({ recordId, fields })}
                            isSaving={updateMutation.isPending}
                        />
                    )}
                </>
            )}
        </Card>
    );
};

export default SolicitudesManager;
