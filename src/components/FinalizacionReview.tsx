
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import {
    TABLE_NAME_FINALIZACION,
    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_INFORME_FINAL_FINALIZACION,
    FIELD_PLANILLA_HORAS_FINALIZACION,
    FIELD_PLANILLA_ASISTENCIA_FINALIZACION,
    FIELD_SUGERENCIAS_MEJORAS_FINALIZACION,
    TABLE_NAME_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_FINALIZARON_ESTUDIANTES,
    FIELD_FECHA_FINALIZACION_ESTUDIANTES
} from '../constants';
import { fetchAllData } from '../services/supabaseService';
import { finalizacionPPSArraySchema, estudianteArraySchema } from '../schemas';
import type { EstudianteFields } from '../types';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import CollapsibleSection from './CollapsibleSection';
import { formatDate, normalizeStringForComparison } from '../utils/formatters';
import { sendSmartEmail } from '../utils/emailService';

// --- Tipos y Helpers ---

interface Attachment {
    url: string;
    filename: string;
    type?: string;
}

const normalizeAttachments = (attachment: any): Attachment[] => {
    if (!attachment) return [];
    let data = attachment;
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            data = parsed;
        } catch (e) {
            // Si no es JSON válido, asumimos que es una URL directa
            return [{ url: data, filename: 'Archivo Adjunto', type: 'unknown' }];
        }
    }
    
    const arr = Array.isArray(data) ? data : [data];
    
    return arr.map((a: any) => {
        if (typeof a === 'string') {
            return { url: a, filename: 'Archivo Adjunto', type: 'unknown' };
        }
        // Soporte para estructura de Supabase Storage o Airtable
        return { 
            url: a.url || a.signedUrl || '', 
            filename: a.filename || a.name || 'Archivo', 
            type: a.type 
        };
    }).filter((a: Attachment) => !!a.url);
};

const getFileType = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext || '')) return 'image';
    if (ext === 'pdf') return 'pdf';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext || '')) return 'office';
    return 'other';
};

// Estado normalizado: 'pendiente' | 'en proceso' | 'cargado'
const getNormalizationState = (request: any): string => {
    const rawState = request[FIELD_ESTADO_FINALIZACION];
    const stateStr = Array.isArray(rawState) ? rawState[0] : rawState;
    return normalizeStringForComparison(stateStr);
};

interface FilePreviewModalProps {
    files: Attachment[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ files, initialIndex, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [hasError, setHasError] = useState(false);
    const activeBlobUrl = useRef<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setHasError(false);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, initialIndex]);

    useEffect(() => {
        if (!isOpen || files.length === 0) return;
        const currentFile = files[currentIndex];
        const fileType = getFileType(currentFile.filename);
        setIsLoadingPreview(true);
        setHasError(false);

        if (activeBlobUrl.current) {
            URL.revokeObjectURL(activeBlobUrl.current);
            activeBlobUrl.current = null;
            setBlobUrl(null);
        }

        if (fileType === 'image' || fileType === 'pdf') {
            fetch(currentFile.url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.blob();
                })
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    activeBlobUrl.current = objectUrl;
                    setBlobUrl(objectUrl);
                    if (fileType === 'pdf') setIsLoadingPreview(false);
                })
                .catch(err => {
                    console.warn("Fallo carga por Blob, intentando URL directa:", err);
                    setBlobUrl(currentFile.url); 
                    if (fileType === 'pdf') setIsLoadingPreview(false);
                });
        } else {
            // Office files are loaded via iframe directly
            setIsLoadingPreview(false); 
        }

        return () => {
            if (activeBlobUrl.current) {
                URL.revokeObjectURL(activeBlobUrl.current);
                activeBlobUrl.current = null;
            }
        };
    }, [currentIndex, isOpen, files]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { onClose(); } 
            else if (e.key === 'ArrowRight') { setCurrentIndex((prev) => (prev < files.length - 1 ? prev + 1 : prev)); } 
            else if (e.key === 'ArrowLeft') { setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev)); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, files.length, onClose]);

    if (!isOpen || files.length === 0) return null;

    const currentFile = files[currentIndex];
    const fileType = getFileType(currentFile.filename);
    const hasNext = currentIndex < files.length - 1;
    const hasPrev = currentIndex > 0;
    
    const renderFallback = () => (
        <div className="text-white text-center p-8 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl max-w-md mx-auto relative z-50 animate-fade-in">
            <span className="material-icons !text-6xl mb-4 text-rose-400">description</span>
            <p className="text-lg mb-2 font-semibold">Vista previa no disponible</p>
            <p className="text-sm text-slate-400 mb-6">Este tipo de archivo no se puede visualizar aquí o hubo un error al cargarlo.</p>
            <a href={currentFile.url} download target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-bold hover:bg-blue-700 transition-colors shadow-lg cursor-pointer" onClick={(e) => e.stopPropagation()}>
                <span className="material-icons !text-lg">download</span>
                Descargar Archivo
            </a>
        </div>
    );

    const renderContent = () => {
        if (hasError) return renderFallback();

        const displayUrl = blobUrl || currentFile.url;
        
        if (fileType === 'image') {
            return (
                <div className="relative w-full h-full flex items-center justify-center">
                    <img 
                        src={displayUrl} 
                        alt={currentFile.filename} 
                        className={`max-w-[90vw] max-h-[85vh] object-contain relative z-10 shadow-2xl transition-opacity duration-300 ${isLoadingPreview ? 'opacity-0' : 'opacity-100'}`} 
                        onLoad={() => setIsLoadingPreview(false)} 
                        onError={() => { setHasError(true); setIsLoadingPreview(false); }} 
                    />
                </div>
            );
        }
        if (fileType === 'pdf') {
             return (
                <div className="w-[90vw] h-[85vh] bg-slate-700 rounded-lg overflow-hidden relative shadow-2xl flex flex-col">
                    {isLoadingPreview && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-800">
                            <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                        </div>
                    )}
                    <iframe src={displayUrl} className="w-full h-full" title="PDF Preview" onError={() => setHasError(true)} />
                </div>
             );
        }
        if (fileType === 'office') {
             const encodedUrl = encodeURIComponent(currentFile.url);
             const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodedUrl}`;
             
             return (
                <div className="w-[90vw] h-[85vh] bg-white rounded-lg overflow-hidden relative shadow-2xl">
                    <iframe 
                        src={officeUrl} 
                        className="w-full h-full" 
                        title="Office Preview" 
                        frameBorder="0"
                        onError={() => setHasError(true)}
                    />
                </div>
             );
        }
        return renderFallback();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col animate-fade-in" onClick={onClose}>
            <div className="flex-shrink-0 flex justify-between items-center p-4 text-white bg-gradient-to-b from-black/80 to-transparent z-50 h-16" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 min-w-0 overflow-hidden">
                     <div className="min-w-0 flex flex-col">
                        <h3 className="font-bold truncate text-sm sm:text-base text-gray-100">{currentFile.filename}</h3>
                        <span className="text-xs opacity-60 font-mono">{currentIndex + 1} / {files.length}</span>
                     </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={currentFile.url} download target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center" title="Descargar">
                        <span className="material-icons !text-xl text-gray-300 hover:text-white">download</span>
                    </a>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center justify-center" title="Cerrar">
                        <span className="material-icons !text-2xl text-gray-300 hover:text-white">close</span>
                    </button>
                </div>
            </div>
            <div className="flex-grow relative flex items-center justify-center p-2 sm:p-4 w-full h-[calc(100vh-64px)]">
                 {isLoadingPreview && fileType !== 'office' && fileType !== 'pdf' && !hasError && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                    </div>
                 )}
                 
                 <div className="w-full h-full flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
                    {renderContent()}
                 </div>

                 {hasPrev && <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => prev - 1); }} className="absolute left-2 sm:left-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all z-50 backdrop-blur-md border border-white/10 group outline-none"><span className="material-icons !text-3xl group-hover:-translate-x-0.5 transition-transform">chevron_left</span></button>}
                 {hasNext && <button onClick={(e) => { e.stopPropagation(); setCurrentIndex((prev) => prev + 1); }} className="absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 p-3 bg-black/40 hover:bg-black/70 text-white rounded-full transition-all z-50 backdrop-blur-md border border-white/10 group outline-none"><span className="material-icons !text-3xl group-hover:translate-x-0.5 transition-transform">chevron_right</span></button>}
            </div>
        </div>,
        document.body
    );
};

// Componente para la fila minimalista "En Proceso SAC"
const SacProcessRow: React.FC<{
    request: any;
    onUpdateStatus: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    isUpdating: boolean;
    searchTerm: string;
}> = ({ request, onUpdateStatus, onDelete, isUpdating, searchTerm }) => {
    
    const Highlight = ({ text }: { text: string }) => {
        if (!searchTerm.trim()) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
        return <span>{parts.map((part, i) => part.toLowerCase() === searchTerm.toLowerCase() ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-400/50 dark:text-yellow-900 rounded px-0.5">{part}</mark> : part)}</span>;
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all duration-200 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 group">
            <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
                 <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                    {request.studentName.charAt(0)}
                </div>
                <div className="min-w-0">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate"><Highlight text={request.studentName} /></h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono"><Highlight text={request.studentLegajo} /></p>
                </div>
            </div>
            
            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                 <button 
                    onClick={() => onDelete(request.id)} 
                    disabled={isUpdating}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors"
                    title="Eliminar Solicitud"
                >
                    <span className="material-icons !text-lg">delete</span>
                </button>
                <button 
                    onClick={() => onUpdateStatus(request.id, 'Pendiente')} 
                    disabled={isUpdating}
                    className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-medium px-3 py-2"
                >
                    Volver a Pendiente
                </button>
                <button 
                    onClick={() => onUpdateStatus(request.id, 'Cargado')} 
                    disabled={isUpdating}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all shadow hover:shadow-md disabled:opacity-50 font-bold text-xs"
                >
                    {isUpdating ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons !text-sm">send</span>}
                    Confirmar Acreditación
                </button>
            </div>
        </div>
    );
};

const RequestCard: React.FC<{
    request: any;
    onUpdateStatus: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    isUpdating: boolean;
    searchTerm: string;
    onPreview: (files: Attachment[], initialIndex: number) => void;
    isArchived?: boolean;
}> = ({ request, onUpdateStatus, onDelete, isUpdating, searchTerm, onPreview, isArchived = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const status = getNormalizationState(request);
    const isCargado = status === 'cargado';
    
    let suggestionsText = '';
    const suggestionsRaw = request[FIELD_SUGERENCIAS_MEJORAS_FINALIZACION];
    if (suggestionsRaw) suggestionsText = Array.isArray(suggestionsRaw) ? suggestionsRaw.filter(Boolean).join(' ').trim() : suggestionsRaw.trim();
    const hasSuggestions = suggestionsText.length > 0;

    const planillaHoras = normalizeAttachments(request[FIELD_PLANILLA_HORAS_FINALIZACION]);
    const informes = normalizeAttachments(request[FIELD_INFORME_FINAL_FINALIZACION]);
    const asistencias = normalizeAttachments(request[FIELD_PLANILLA_ASISTENCIA_FINALIZACION]);
    const allFiles = [...planillaHoras, ...informes, ...asistencias];

    const handlePreview = (e: React.MouseEvent, fileType: 'horas' | 'informe' | 'asistencia', indexInType: number) => {
        e.stopPropagation();
        const baseIndex = fileType === 'horas' ? 0 : fileType === 'informe' ? planillaHoras.length : planillaHoras.length + informes.length;
        onPreview(allFiles, baseIndex + indexInType);
    };

    const Highlight = ({ text }: { text: string }) => {
        if (!searchTerm.trim()) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
        return <span>{parts.map((part, i) => part.toLowerCase() === searchTerm.toLowerCase() ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-400/50 dark:text-yellow-900 rounded px-0.5">{part}</mark> : part)}</span>;
    };

    return (
        <div className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all duration-300 overflow-hidden ${isExpanded ? 'shadow-lg ring-1 ring-blue-200 dark:ring-blue-900 border-blue-300 dark:border-blue-700' : 'border-slate-200 dark:border-slate-700 hover:border-blue-300/50'} ${isCargado ? 'opacity-80 hover:opacity-100' : ''}`}>
            <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 cursor-pointer flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-800 dark:to-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm ${isCargado ? 'bg-slate-400' : 'bg-blue-600'}`}>{request.studentName.charAt(0)}</div>
                    <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 leading-tight truncate"><Highlight text={request.studentName} /></h3>
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            <span className="font-mono"><Highlight text={request.studentLegajo} /></span><span className="text-slate-300 dark:text-slate-600">|</span><span>Solicitado: {formatDate(request.createdTime)}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end pl-14 lg:pl-0">
                    {planillaHoras.length > 0 && (<button onClick={(e) => handlePreview(e, 'horas', 0)} className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border border-emerald-200 rounded-lg transition-colors text-xs font-bold shadow-sm"><span className="material-icons !text-base">table_view</span><span className="hidden sm:inline">Planilla</span></button>)}
                    
                    {isCargado ? (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                            <span className="material-icons !text-sm">check_circle</span><span className="hidden sm:inline">Cargado</span>
                        </span>
                    ) : (
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800">
                            <span className="material-icons !text-sm">hourglass_empty</span><span className="hidden sm:inline">Pendiente</span>
                        </span>
                    )}

                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(request.id); }} 
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-full transition-colors"
                        title="Eliminar Solicitud"
                    >
                        <span className="material-icons !text-xl">delete</span>
                    </button>
                    
                    <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><span className="material-icons">expand_more</span></div>
                </div>
            </div>
            {isExpanded && (
                <div className="px-5 pb-6 pt-2 bg-slate-50/50 dark:bg-slate-900/20 border-t border-slate-200 dark:border-slate-700 animate-fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><span className="material-icons !text-sm">description</span> Informes Finales</h4>
                            {informes.length > 0 ? (<div className="space-y-2">{informes.map((file, idx) => (<button key={`inf-${idx}`} onClick={(e) => handlePreview(e, 'informe', idx)} className="w-full text-left flex items-center gap-2 p-2 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 hover:shadow-sm group transition-all"><span className="material-icons !text-base text-slate-400 group-hover:text-blue-500">article</span><span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.filename}</span></button>))}</div>) : (<p className="text-sm text-slate-400 italic">No se adjuntaron informes.</p>)}
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><span className="material-icons !text-sm">event_available</span> Planillas de Asistencia</h4>
                            {asistencias.length > 0 ? (<div className="space-y-2">{asistencias.map((file, idx) => (<button key={`asist-${idx}`} onClick={(e) => handlePreview(e, 'asistencia', idx)} className="w-full text-left flex items-center gap-2 p-2 bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 rounded-lg hover:border-blue-400 hover:shadow-sm group transition-all"><span className="material-icons !text-base text-slate-400 group-hover:text-blue-500">checklist</span><span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate">{file.filename}</span></button>))}</div>) : (<p className="text-sm text-slate-400 italic">No se adjuntaron planillas.</p>)}
                        </div>
                    </div>
                    {hasSuggestions && (<div className="mt-6"><h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-2"><span className="material-icons !text-sm">comment</span> Comentarios del Alumno</h4><div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/50 rounded-lg p-4 text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">"{suggestionsText}"</div></div>)}
                    
                    <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
                        {isArchived ? (
                             <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(request.id, 'Pendiente'); }} disabled={isUpdating} className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-lg transition-colors font-medium text-sm"><span className="material-icons !text-base">undo</span> Revertir a Pendiente</button>
                        ) : (
                            /* Action button for Pending State -> Move to SAC Process */
                            <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(request.id, 'En Proceso'); }} disabled={isUpdating} className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow hover:shadow-md disabled:opacity-50 font-bold text-sm">
                                {isUpdating ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="material-icons !text-lg">fact_check</span>} Aprobar para SAC
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const FinalizacionReview: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [previewFiles, setPreviewFiles] = useState<Attachment[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['finalizacionRequests'],
        queryFn: async () => {
            const [finalizacionRes, estudiantesRes] = await Promise.all([
                fetchAllData<any>(TABLE_NAME_FINALIZACION, finalizacionPPSArraySchema),
                fetchAllData<EstudianteFields>(TABLE_NAME_ESTUDIANTES, estudianteArraySchema, [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES])
            ]);
            const studentMap = new Map(estudiantesRes.records.map(s => [s.id, s]));
            return finalizacionRes.records.map(req => {
                const rawStudentId = req[FIELD_ESTUDIANTE_FINALIZACION];
                const studentId = Array.isArray(rawStudentId) ? rawStudentId[0] : rawStudentId;
                const student = studentId ? studentMap.get(studentId) : null;
                return {
                    id: req.id,
                    ...req, 
                    studentName: student?.[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido',
                    studentLegajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || '---',
                    studentEmail: student?.[FIELD_CORREO_ESTUDIANTES],
                    studentId: studentId, // Ensure studentId is available for mutation logic
                    createdTime: req.createdTime
                };
            }).sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
            const request = data?.find(r => r.id === id);
            
            // AUTOMATION: Update student status based on finalization request status
            if (request && request.studentId) {
                if (newStatus === 'Cargado') {
                     // Confirming: Mark student as finished
                     await db.estudiantes.update(request.studentId, {
                        [FIELD_FINALIZARON_ESTUDIANTES]: true,
                        [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: new Date().toISOString().split('T')[0]
                     });

                     // Email Notification
                     if (request.studentEmail) {
                        const emailRes = await sendSmartEmail('sac', {
                             studentName: request.studentName,
                             studentEmail: request.studentEmail,
                             ppsName: 'Práctica Profesional Supervisada'
                        });
                        if (!emailRes.success && emailRes.message !== 'Automación desactivada') {
                             console.warn("Email send failed:", emailRes.message);
                        }
                    }
                } else {
                    // Reverting/Moving back: Unmark student if they were previously marked
                    // This ensures stats are correct if an admin made a mistake
                    await db.estudiantes.update(request.studentId, {
                       [FIELD_FINALIZARON_ESTUDIANTES]: false,
                       [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: null
                    });
                }
            }

            return db.finalizacion.update(id, { [FIELD_ESTADO_FINALIZACION]: newStatus });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['finalizacionRequests'] });
            queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] }); // Update dashboard stats
            setToastInfo({ message: 'Estado actualizado correctamente.', type: 'success' });
        },
        onError: (err: Error) => {
            setToastInfo({ message: `Error al actualizar: ${err.message}`, type: 'error' });
        },
        onSettled: () => setUpdatingId(null)
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => db.finalizacion.delete(id),
        onSuccess: () => {
             setToastInfo({ message: 'Solicitud eliminada.', type: 'success' });
             queryClient.invalidateQueries({ queryKey: ['finalizacionRequests'] });
        },
        onError: (e: any) => setToastInfo({ message: 'Error al eliminar.', type: 'error' })
    });

    const handleDelete = (id: string) => {
        if (window.confirm('¿Eliminar solicitud de acreditación permanentemente?')) {
            deleteMutation.mutate(id);
        }
    }

    const handleUpdateStatus = (id: string, newStatus: string) => {
        if (newStatus === 'Cargado' && !window.confirm('¿Confirmar acreditación final? Se actualizará el estado del alumno y se enviará el correo de confirmación.')) {
            return;
        }
        setUpdatingId(id);
        updateStatusMutation.mutate({ id, newStatus });
    };

    const handlePreview = useCallback((files: Attachment[], initialIndex: number) => {
        setPreviewFiles(files);
        setPreviewIndex(initialIndex);
        setIsPreviewOpen(true);
    }, []);

    const filteredData = useMemo(() => {
        if (!data) return { pending: [], inProcess: [], archived: [] };
        
        const searchLower = searchTerm.toLowerCase();
        const matches = data.filter(item => 
            item.studentName.toLowerCase().includes(searchLower) || 
            item.studentLegajo.includes(searchLower)
        );

        const pending: typeof data = [];
        const inProcess: typeof data = [];
        const archived: typeof data = [];

        matches.forEach(item => {
            const state = getNormalizationState(item);
            if (state === 'cargado') {
                archived.push(item);
            } else if (state === 'en proceso') {
                inProcess.push(item);
            } else {
                pending.push(item); // Default 'pendiente'
            }
        });

        return { pending, inProcess, archived };
    }, [data, searchTerm]);


    if (isLoading) return <div className="p-8 flex justify-center"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message="No se pudieron cargar las solicitudes." />;

    const hasAnyData = filteredData.pending.length > 0 || filteredData.inProcess.length > 0 || filteredData.archived.length > 0;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <FilePreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} files={previewFiles} initialIndex={previewIndex} />
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Revisión de Finalizaciones</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Gestiona el ciclo de acreditación final.</p>
                </div>
                <div className="relative w-full sm:w-72">
                     <input type="text" placeholder="Buscar por nombre o legajo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow shadow-sm"/>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg pointer-events-none">search</span>
                </div>
            </div>

            {!hasAnyData ? (
                 <EmptyState icon="inbox" title="Bandeja Vacía" message="No hay solicitudes que coincidan con tu búsqueda." />
            ) : (
                <>
                    {/* ETAPA 1: PENDIENTES DE REVISIÓN */}
                    <div className="space-y-4">
                        {filteredData.pending.length > 0 && (
                             <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-2">
                                 1. Revisión de Documentación ({filteredData.pending.length})
                             </h3>
                        )}
                        {filteredData.pending.map((req) => (
                            <RequestCard key={req.id} request={req} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isUpdating={updatingId === req.id} searchTerm={searchTerm} onPreview={handlePreview} />
                        ))}
                    </div>

                    {/* ETAPA 2: EN PROCESO DE CARGA SAC */}
                    {filteredData.inProcess.length > 0 && (
                        <div className="space-y-4">
                             <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-2 flex items-center gap-2">
                                 <span className="material-icons !text-sm">pending_actions</span> 2. Cargar al SAC ({filteredData.inProcess.length})
                             </h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 {filteredData.inProcess.map((req) => (
                                     <SacProcessRow 
                                        key={req.id} 
                                        request={req} 
                                        onUpdateStatus={handleUpdateStatus} 
                                        onDelete={handleDelete}
                                        isUpdating={updatingId === req.id}
                                        searchTerm={searchTerm}
                                     />
                                 ))}
                             </div>
                        </div>
                    )}

                    {/* ETAPA 3: HISTORIAL (CARGADOS) */}
                    {filteredData.archived.length > 0 && (
                        <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-700">
                             <CollapsibleSection
                                title="Historial de Finalizadas"
                                count={filteredData.archived.length}
                                icon="task_alt"
                                iconBgColor="bg-slate-100 dark:bg-slate-800"
                                iconColor="text-emerald-600 dark:text-emerald-400"
                                borderColor="border-slate-200 dark:border-slate-700"
                                defaultOpen={false}
                            >
                                <div className="space-y-4 mt-4">
                                     {filteredData.archived.map((req) => (
                                         <RequestCard 
                                            key={req.id} 
                                            request={req} 
                                            onUpdateStatus={handleUpdateStatus} 
                                            onDelete={handleDelete}
                                            isUpdating={updatingId === req.id} 
                                            searchTerm={searchTerm} 
                                            onPreview={handlePreview}
                                            isArchived={true} 
                                        />
                                     ))}
                                </div>
                            </CollapsibleSection>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default FinalizacionReview;
