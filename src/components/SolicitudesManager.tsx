
import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'react-router-dom';
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import { mockDb } from '../services/mockDb';
import type { SolicitudPPS, SolicitudPPSFields } from '../types';
import {
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
    FIELD_LEGAJO_PPS
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import Card from './Card';
import { formatDate, getStatusVisuals, normalizeStringForComparison } from '../utils/formatters';
import SubTabs from './SubTabs';
import FinalizacionReview from './FinalizacionReview';
import { sendSmartEmail } from '../utils/emailService';
import CollapsibleSection from './CollapsibleSection';

const cleanValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    if (Array.isArray(val)) return cleanValue(val[0]);
    
    const str = String(val);
    if (str.startsWith('["') && str.endsWith('"]')) {
        try {
            const parsed = JSON.parse(str);
            if (Array.isArray(parsed) && parsed.length > 0) {
                return cleanValue(parsed[0]);
            }
        } catch (e) {}
    }
    return str.replace(/[\[\]"]/g, '').trim();
}

const InfoField: React.FC<{ label: string; value?: string | null; fullWidth?: boolean }> = ({ label, value, fullWidth }) => (
    <div className={`${fullWidth ? 'col-span-full' : ''} group`}>
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5 group-hover:text-blue-500 transition-colors">{label}</p>
        <p className="text-slate-800 dark:text-slate-200 text-sm font-medium whitespace-pre-wrap break-words">
            {cleanValue(value) || <span className="text-slate-300 dark:text-slate-600 italic">Sin datos</span>}
        </p>
    </div>
);

const RequestListItem: React.FC<{
    req: any;
    onDelete: (id: string) => void;
    onUpdate: (id: string, fields: Partial<SolicitudPPSFields>) => Promise<void>;
    isUpdatingParent: boolean;
}> = ({ req, onDelete, onUpdate, isUpdatingParent }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Local state for editing
    const [status, setStatus] = useState(req[FIELD_ESTADO_PPS] || 'Pendiente');
    const [notes, setNotes] = useState(req[FIELD_NOTAS_PPS] || '');
    const [isLocalSaving, setIsLocalSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    const statusVisuals = getStatusVisuals(req[FIELD_ESTADO_PPS]);
    // Normalizamos para comparar con los estados "finales"
    const normalizedStatus = normalizeStringForComparison(req[FIELD_ESTADO_PPS] || '');
    const isStagnant = req._daysSinceUpdate > 4 && !['finalizada', 'cancelada', 'rechazada', 'archivado', 'realizada', 'no se pudo concretar'].includes(normalizedStatus);
    const institucion = cleanValue(req[FIELD_EMPRESA_PPS_SOLICITUD]);
    const instEmail = cleanValue(req[FIELD_SOLICITUD_EMAIL_INSTITUCION]);
    
    const updateTimeDisplay = req[FIELD_ULTIMA_ACTUALIZACION_PPS] || req.createdTime || new Date().toISOString();

    useEffect(() => {
        setHasChanges(
            status !== (req[FIELD_ESTADO_PPS] || 'Pendiente') || 
            notes !== (req[FIELD_NOTAS_PPS] || '')
        );
    }, [status, notes, req]);

    const handleSave = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!hasChanges) return;
        
        setIsLocalSaving(true);
        await onUpdate(req.id, {
            [FIELD_ESTADO_PPS]: status,
            [FIELD_NOTAS_PPS]: notes
        });
        setIsLocalSaving(false);
        setHasChanges(false);
    };

    const handleCancel = (e: React.MouseEvent) => {
        e.stopPropagation();
        setStatus(req[FIELD_ESTADO_PPS] || 'Pendiente');
        setNotes(req[FIELD_NOTAS_PPS] || '');
        setHasChanges(false);
        setIsExpanded(false);
    };

    const handleDraftEmail = (e: React.MouseEvent) => {
        e.stopPropagation();
        const subject = `Propuesta de Convenio PPS - UFLO - Alumno: ${req._studentName}`;
        const body = `Estimados ${institucion},\n\nMe comunico desde la coordinación de Prácticas Profesionales de la Universidad de Flores (UFLO).\n\nEl estudiante ${req._studentName} (Legajo: ${req._studentLegajo}) nos ha informado de su interés en realizar sus prácticas en su institución.\n\nQuisiéramos iniciar el proceso de vinculación institucional para formalizar este acuerdo.\n\nQuedo a la espera de su respuesta.\n\nSaludos cordiales,\n\nCoordinación PPS`;
        const mailto = `mailto:${instEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailto, '_blank');
        
        // Sugerir cambio de estado si estaba pendiente
        if (status === 'Pendiente') {
            setStatus('En conversaciones');
            setHasChanges(true);
        }
    };

    return (
        <div 
            className={`group relative bg-white dark:bg-gray-900 rounded-xl border transition-all duration-500 overflow-hidden ${
                isExpanded 
                    ? 'border-blue-400 dark:border-indigo-500 ring-1 ring-blue-100 dark:ring-indigo-500/30 shadow-lg z-10' 
                    : 'border-slate-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-indigo-500/50 hover:shadow-md'
            } ${isStagnant && !isExpanded ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
        >
            {/* Status Strip */}
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 ${isExpanded ? 'w-1' : 'w-1.5'} ${statusVisuals.accentBg}`}></div>

            {/* Header Row - Clickable for Toggle */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 pl-5 cursor-pointer"
            >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 min-w-0">
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-colors ${isExpanded ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800' : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-gray-800 dark:text-slate-400 dark:border-gray-700'}`}>
                            {req._studentName.charAt(0)}
                        </div>

                        <div className="min-w-0">
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">
                                    {institucion || 'Institución s/n'}
                                </h4>
                                {isStagnant && !isExpanded && (
                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
                                        !
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-medium">{req._studentName}</span>
                                <span className="text-slate-300 dark:text-slate-600">•</span>
                                <span className="font-mono">{req._studentLegajo}</span>
                            </div>
                        </div>
                    </div>

                    {/* Status Badge (Header) */}
                    <div className="flex items-center gap-3 self-end sm:self-center pl-14 sm:pl-0">
                         <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide transition-all ${statusVisuals.labelClass} ${isExpanded ? 'scale-105 shadow-sm' : ''}`}>
                             {req[FIELD_ESTADO_PPS] || 'Pendiente'}
                         </span>
                         <div className="text-slate-400 p-1">
                             <span className={`material-icons transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>expand_more</span>
                         </div>
                    </div>
                </div>
            </div>

            {/* Expanded Content (Accordion) */}
            <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-slate-100 dark:border-gray-800' : 'grid-rows-[0fr] opacity-0 h-0 overflow-hidden'}`}>
                <div className="overflow-hidden cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 pl-5 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left Column: Details */}
                            <div className="space-y-6">
                                <div className="bg-slate-50/50 dark:bg-gray-950/50 p-4 rounded-xl border border-slate-200/60 dark:border-gray-800">
                                    <h5 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-3 flex items-center gap-2">
                                        <span className="material-icons !text-sm">apartment</span>
                                        Datos de la Institución
                                    </h5>
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="Localidad" value={req[FIELD_SOLICITUD_LOCALIDAD]} />
                                        <InfoField label="Dirección" value={req[FIELD_SOLICITUD_DIRECCION]} />
                                        <InfoField label="Referente" value={req[FIELD_SOLICITUD_REFERENTE]} />
                                        <InfoField label="Convenio UFLO" value={req[FIELD_SOLICITUD_TIENE_CONVENIO]} />
                                        <InfoField label="Descripción" value={req[FIELD_SOLICITUD_DESCRIPCION]} fullWidth />
                                    </div>
                                </div>

                                <div className="bg-slate-50/50 dark:bg-gray-950/50 p-4 rounded-xl border border-slate-200/60 dark:border-gray-800 relative">
                                    <h5 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-3 flex items-center gap-2">
                                        <span className="material-icons !text-sm">contact_phone</span>
                                        Contacto y Tutoría
                                    </h5>
                                    {instEmail && (
                                        <button 
                                            onClick={handleDraftEmail}
                                            className="absolute top-3 right-3 text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800 font-bold flex items-center gap-1 hover:bg-emerald-200 dark:hover:bg-emerald-800/50 transition-colors"
                                            title="Redactar correo de presentación"
                                        >
                                            <span className="material-icons !text-sm">forward_to_inbox</span>
                                            Redactar Correo
                                        </button>
                                    )}
                                    <div className="grid grid-cols-2 gap-4">
                                        <InfoField label="Email Inst." value={req[FIELD_SOLICITUD_EMAIL_INSTITUCION]} fullWidth />
                                        <InfoField label="Teléfono Inst." value={req[FIELD_SOLICITUD_TELEFONO_INSTITUCION]} />
                                        <InfoField label="Tiene Tutor" value={req[FIELD_SOLICITUD_TIENE_TUTOR]} />
                                        <InfoField label="Datos Tutor" value={req[FIELD_SOLICITUD_CONTACTO_TUTOR]} fullWidth />
                                        <InfoField label="Tipo Práctica" value={req[FIELD_SOLICITUD_TIPO_PRACTICA]} />
                                        <InfoField label="Email Alumno" value={req._studentEmail || cleanValue(req[FIELD_SOLICITUD_EMAIL_ALUMNO])} />
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Management */}
                            <div className="flex flex-col h-full">
                                <div className="bg-white dark:bg-gray-800 p-5 rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm h-full flex flex-col">
                                    <h5 className="text-sm font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                                        <span className="material-icons text-slate-400">admin_panel_settings</span>
                                        Gestión del Trámite
                                    </h5>
                                    
                                    <div className="space-y-4 flex-grow">
                                        <div>
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Estado Actual</label>
                                            <select
                                                value={status}
                                                onChange={(e) => setStatus(e.target.value)}
                                                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-shadow text-slate-900 dark:text-white"
                                            >
                                                {/* Unified List */}
                                                <option value="Pendiente">Pendiente (Inicio)</option>
                                                <option value="En conversaciones">En conversaciones (En curso)</option>
                                                <option value="Realizada">Realizada (Finalizado OK)</option>
                                                <option value="No se pudo concretar">No se pudo concretar (Cancelado)</option>
                                                <option value="Rechazada">Rechazada</option>
                                                <option value="Cancelada">Cancelada</option>
                                                <option value="Archivado">Archivado</option>
                                            </select>
                                        </div>
                                        
                                        <div className="flex-grow flex flex-col">
                                            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Notas de Seguimiento</label>
                                            <textarea
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows={6}
                                                className="w-full flex-grow p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                                placeholder="Escribe aquí los avances..."
                                            />
                                        </div>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="mt-6 pt-4 border-t border-slate-100 dark:border-gray-700 flex items-center justify-between">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDelete(req.id); }}
                                            className="text-xs font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-2 rounded-lg transition-colors flex items-center gap-1"
                                        >
                                            <span className="material-icons !text-sm">delete</span> Eliminar
                                        </button>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={handleCancel}
                                                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                            <button 
                                                onClick={handleSave} 
                                                disabled={!hasChanges || isLocalSaving || isUpdatingParent}
                                                className={`px-5 py-2 text-sm font-bold text-white rounded-lg shadow-sm flex items-center gap-2 transition-all ${
                                                    hasChanges 
                                                        ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-md hover:-translate-y-0.5 active:scale-95' 
                                                        : 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed text-slate-500'
                                                }`}
                                            >
                                                {isLocalSaving || isUpdatingParent ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-sm">save</span>}
                                                Guardar
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-4 text-[10px] text-slate-400 text-right pb-4 px-4">
                             Actualizado: {formatDate(updateTimeDisplay)} • {req._daysSinceUpdate} días sin cambios
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
    const location = useLocation();
    const [activeTabId, setActiveTabId] = useState('ingreso');
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const queryClient = useQueryClient();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const tab = params.get('tab');
        if (tab === 'egreso') {
            setActiveTabId('egreso');
        } else if (tab === 'ingreso') {
            setActiveTabId('ingreso');
        }
    }, [location.search]);

    const tabs = [
        { id: 'ingreso', label: 'Solicitudes de PPS', icon: 'login' },
        { id: 'egreso', label: 'Solicitudes de Finalización', icon: 'logout' },
    ];

    const { data: requestsData, isLoading, error } = useQuery({
        queryKey: ['adminSolicitudes', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                 const mockRequests = await mockDb.getAll('solicitudes_pps');
                 
                 // Transform mock data to match component expectations
                 return mockRequests.map((req: any) => {
                     // Safety check for date, default to NOW if missing
                     const createdDate = new Date(req.created_at || Date.now());
                     const updateDate = new Date(req[FIELD_ULTIMA_ACTUALIZACION_PPS] || req.created_at || Date.now());
                     
                     // Ensure dates are valid
                     const safeCreatedTime = isNaN(createdDate.getTime()) ? new Date().toISOString() : createdDate.toISOString();
                     const safeUpdateTime = isNaN(updateDate.getTime()) ? new Date() : updateDate;
                     
                     return {
                        ...req,
                        id: req.id,
                        createdTime: safeCreatedTime,
                        _studentName: req[FIELD_SOLICITUD_NOMBRE_ALUMNO] || req.nombre_alumno || 'Estudiante Mock',
                        _studentLegajo: req[FIELD_SOLICITUD_LEGAJO_ALUMNO] || req.legajo || '12345',
                        _studentEmail: req[FIELD_SOLICITUD_EMAIL_ALUMNO] || req.email || 'test@email.com',
                        _daysSinceUpdate: Math.floor((new Date().getTime() - safeUpdateTime.getTime()) / (1000 * 3600 * 24))
                    };
                 });
            }

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

            if (error) throw new Error(error.message);
            if (!data) return [];

            return data.map((req: any) => {
                const student = req.estudiante;
                const name = student?.[FIELD_NOMBRE_ESTUDIANTES] || cleanValue(req[FIELD_SOLICITUD_NOMBRE_ALUMNO]) || 'Desconocido';
                const legajo = student?.[FIELD_LEGAJO_ESTUDIANTES] || cleanValue(req[FIELD_SOLICITUD_LEGAJO_ALUMNO]) || '---';
                const email = student?.[FIELD_CORREO_ESTUDIANTES] || cleanValue(req[FIELD_SOLICITUD_EMAIL_ALUMNO]);

                // Default to current time if dates are missing to avoid crashes
                const updatedAt = new Date(req[FIELD_ULTIMA_ACTUALIZACION_PPS] || req.created_at || Date.now());
                const safeUpdateDate = isNaN(updatedAt.getTime()) ? new Date() : updatedAt;

                const daysSinceUpdate = Math.floor((new Date().getTime() - safeUpdateDate.getTime()) / (1000 * 3600 * 24));

                return {
                    ...req,
                    id: String(req.id),
                    createdTime: req.created_at,
                    _studentName: name, 
                    _studentLegajo: String(legajo),
                    _studentEmail: email,
                    _daysSinceUpdate: daysSinceUpdate
                };
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ recordId, fields }: { recordId: string, fields: any }) => {
             if (isTestingMode) {
                 await mockDb.update('solicitudes_pps', recordId, fields);
                 return;
             }
             
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
        onSuccess: () => {
            setToastInfo({ message: 'Solicitud actualizada.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['adminSolicitudes', isTestingMode] });
        },
        onError: (err: any) => {
            setToastInfo({ message: `Error: ${err.message}`, type: 'error' });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (isTestingMode) {
                await mockDb.delete('solicitudes_pps', id);
                return;
            }
            await db.solicitudes.delete(id);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Solicitud eliminada.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['adminSolicitudes', isTestingMode] });
        }
    });

    const handleDelete = (id: string) => {
        if (window.confirm('¿Eliminar permanentemente?')) deleteMutation.mutate(id);
    };

    const handleUpdate = async (id: string, fields: Partial<SolicitudPPSFields>) => {
        await updateMutation.mutateAsync({ recordId: id, fields });
    };

    const { activeList, historyList } = useMemo(() => {
        if (!requestsData) return { activeList: [], historyList: [] };
        
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = (req: any) => 
            String(req._studentName || '').toLowerCase().includes(searchLower) || 
            String(req._studentLegajo || '').toLowerCase().includes(searchLower) || 
            (req[FIELD_EMPRESA_PPS_SOLICITUD] || '').toLowerCase().includes(searchLower);

        const active: any[] = [];
        const history: any[] = [];
        
        // Define terminal states that go to history
        const historyStatuses = ['finalizada', 'cancelada', 'rechazada', 'archivado', 'realizada', 'no se pudo concretar'];

        requestsData.forEach((req: any) => {
            if (!matchesSearch(req)) return;
            
            const status = normalizeStringForComparison(req[FIELD_ESTADO_PPS]);
            
            if (statusFilter === 'requieren_atencion') {
                if (!historyStatuses.includes(status) && req._daysSinceUpdate > 4) {
                    active.push(req);
                }
            } else if (statusFilter !== 'all' && normalizeStringForComparison(statusFilter) !== status) {
                return;
            } else {
                if (historyStatuses.includes(status)) {
                    history.push(req);
                } else {
                    active.push(req);
                }
            }
        });

        active.sort((a, b) => b._daysSinceUpdate - a._daysSinceUpdate);
        
        // Safe sort for history
        history.sort((a, b) => {
            const timeA = new Date(a.createdTime || 0).getTime();
            const timeB = new Date(b.createdTime || 0).getTime();
            return timeB - timeA;
        });

        return { activeList: active, historyList: history };
    }, [requestsData, searchTerm, statusFilter]);

    if (isLoading) return <div className="flex justify-center p-12"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message={error.message} />;

    return (
        <Card title="Gestión de Solicitudes" icon="list_alt" description="Administra las solicitudes de PPS iniciadas por los estudiantes.">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="mb-6">
                 <SubTabs tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId} />
            </div>

            {activeTabId === 'egreso' ? (
                <FinalizacionReview isTestingMode={isTestingMode} />
            ) : (
                <div className="animate-fade-in-up space-y-6">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="relative w-full md:w-96">
                            <input 
                                type="text" 
                                placeholder="Buscar por estudiante, legajo o institución..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                            />
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">search</span>
                        </div>
                        
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">Estado:</span>
                            <select 
                                value={statusFilter} 
                                onChange={e => setStatusFilter(e.target.value)}
                                className="w-full md:w-48 py-2.5 px-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white"
                            >
                                <option value="all">Todos</option>
                                <option value="requieren_atencion">⚠️ Requieren Atención (+4 días)</option>
                                <option value="Pendiente">Pendiente</option>
                                <option value="En conversaciones">En conversaciones</option>
                                <option value="Realizada">Realizada</option>
                                <option value="No se pudo concretar">No se pudo concretar</option>
                                <option value="Archivado">Archivado</option>
                            </select>
                        </div>
                    </div>

                    {/* Active Requests Section */}
                    {activeList.length > 0 && (
                        <div className="space-y-4">
                             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                                En Gestión ({activeList.length})
                             </h3>
                             <div className="grid grid-cols-1 gap-4">
                                 {activeList.map(req => (
                                     <RequestListItem 
                                        key={req.id} 
                                        req={req} 
                                        onDelete={handleDelete} 
                                        onUpdate={handleUpdate}
                                        isUpdatingParent={updateMutation.isPending}
                                     />
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* History Section */}
                    {historyList.length > 0 && (
                         <CollapsibleSection 
                            title="Historial y Finalizadas" 
                            count={historyList.length}
                            icon="history"
                            iconBgColor="bg-slate-100 dark:bg-gray-800"
                            iconColor="text-slate-500 dark:text-slate-400"
                            borderColor="border-slate-200 dark:border-slate-700"
                            defaultOpen={false}
                        >
                            <div className="grid grid-cols-1 gap-4 mt-4">
                                {historyList.map(req => (
                                     <RequestListItem 
                                        key={req.id} 
                                        req={req} 
                                        onDelete={handleDelete}
                                        onUpdate={handleUpdate}
                                        isUpdatingParent={updateMutation.isPending}
                                     />
                                 ))}
                            </div>
                        </CollapsibleSection>
                    )}

                    {activeList.length === 0 && historyList.length === 0 && (
                        <div className="py-12">
                            <EmptyState icon="inbox" title="Sin Resultados" message="No se encontraron solicitudes con los filtros actuales." />
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
};

export default SolicitudesManager;
