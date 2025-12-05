
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { deleteFinalizationRequest } from '../services/dataService';
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
import JSZip from 'jszip';
import FileSaver from 'file-saver';

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
            return [{ url: data, filename: 'Archivo Adjunto', type: 'unknown' }];
        }
    }
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((a: any) => {
        if (typeof a === 'string') {
            return { url: a, filename: 'Archivo Adjunto', type: 'unknown' };
        }
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
    cachedBlobs?: Record<string, string>; // Pass cached blobs
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ files, initialIndex, isOpen, onClose, cachedBlobs }) => {
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
        if (!currentFile) return;

        const fileType = getFileType(currentFile.filename);
        
        setIsLoadingPreview(true);
        setHasError(false);
        setBlobUrl(null);

        // Check cache first
        if (cachedBlobs && cachedBlobs[currentFile.url]) {
            setBlobUrl(cachedBlobs[currentFile.url]);
            setIsLoadingPreview(false);
            return;
        }

        if (activeBlobUrl.current) {
            URL.revokeObjectURL(activeBlobUrl.current);
            activeBlobUrl.current = null;
        }

        // Fetch Blob for PDFs if not cached
        if (fileType === 'pdf') {
            fetch(currentFile.url)
                .then(response => {
                    if (!response.ok) throw new Error('Network response was not ok');
                    return response.blob();
                })
                .then(blob => {
                    const objectUrl = URL.createObjectURL(blob);
                    activeBlobUrl.current = objectUrl;
                    setBlobUrl(objectUrl);
                    setIsLoadingPreview(false);
                })
                .catch((err: any) => {
                    console.warn("Fallo carga PDF por Blob, intentando URL directa:", err);
                    setBlobUrl(currentFile.url); 
                    setIsLoadingPreview(false);
                });
        } else {
            setBlobUrl(currentFile.url);
            if (fileType !== 'image') {
                setIsLoadingPreview(false);
            }
        }
        
        return () => {
            if (activeBlobUrl.current) {
                URL.revokeObjectURL(activeBlobUrl.current);
                activeBlobUrl.current = null;
            }
        };
    }, [currentIndex, isOpen, files, cachedBlobs]);

    if (!isOpen || files.length === 0) return null;

    const currentFile = files[currentIndex];
    
    if (!currentFile) return null;

    const fileType = getFileType(currentFile.filename);
    const hasNext = currentIndex < files.length - 1;
    const hasPrev = currentIndex > 0;
    const displayUrl = blobUrl || currentFile.url;

    const renderContent = () => {
        if (hasError) return <div className="text-white">Error al cargar vista previa.</div>;
        if (fileType === 'image') return <img src={displayUrl} alt={currentFile.filename} className={`max-w-[90vw] max-h-[85vh] object-contain ${isLoadingPreview ? 'opacity-0' : 'opacity-100'}`} onLoad={() => setIsLoadingPreview(false)} onError={() => { setHasError(true); setIsLoadingPreview(false); }} />;
        if (fileType === 'pdf') return <iframe src={displayUrl} className="w-[90vw] h-[85vh] bg-white rounded-lg" title="PDF Preview" onError={() => setHasError(true)} />;
        if (fileType === 'office') return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(currentFile.url)}`} className="w-[90vw] h-[85vh] bg-white rounded-lg" title="Office Preview" />;
        return <div className="text-white text-center"><p className="mb-4">Vista previa no disponible.</p><a href={currentFile.url} download target="_blank" rel="noopener noreferrer" className="bg-blue-600 px-4 py-2 rounded-lg">Descargar</a></div>;
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col animate-fade-in" onClick={onClose}>
            <div className="flex-shrink-0 flex justify-between items-center p-4 text-white z-50 h-16 bg-black/50" onClick={e => e.stopPropagation()}>
                <h3 className="font-bold truncate max-w-md">{currentFile.filename}</h3>
                <button onClick={onClose}><span className="material-icons">close</span></button>
            </div>
            <div className="flex-grow relative flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
                 {isLoadingPreview && fileType !== 'office' && !hasError && <div className="absolute inset-0 flex items-center justify-center"><div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div></div>}
                 {renderContent()}
                 {hasPrev && <button onClick={() => setCurrentIndex(prev => prev - 1)} className="absolute left-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80"><span className="material-icons">chevron_left</span></button>}
                 {hasNext && <button onClick={() => setCurrentIndex(prev => prev + 1)} className="absolute right-4 p-2 bg-black/50 rounded-full text-white hover:bg-black/80"><span className="material-icons">chevron_right</span></button>}
            </div>
        </div>,
        document.body
    );
};

const RequestListItem: React.FC<{
    request: any;
    onUpdateStatus: (id: string, status: string) => void;
    onDelete: (record: any) => void;
    isUpdating: boolean;
    searchTerm: string;
    onPreview: (files: Attachment[], initialIndex: number, cachedBlobs: Record<string, string>) => void;
    isArchived?: boolean;
}> = ({ request, onUpdateStatus, onDelete, isUpdating, searchTerm, onPreview, isArchived = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    // Cache for preloaded blobs to speed up preview
    const [cachedBlobs, setCachedBlobs] = useState<Record<string, string>>({}); 
    
    const status = getNormalizationState(request);
    const isCargado = status === 'cargado';
    const isEnProceso = status === 'en proceso';
    
    let visualStatus = 'Pendiente';
    let statusColor = 'bg-amber-500'; 
    
    if (isCargado) {
        visualStatus = 'Finalizada';
        statusColor = 'bg-emerald-500';
    } else if (isEnProceso) {
        visualStatus = 'En Proceso SAC';
        statusColor = 'bg-indigo-500';
    } else {
        visualStatus = 'Pendiente';
        statusColor = 'bg-amber-500'; 
    }
    
    const statusBadgeClass = isCargado 
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200' 
        : isEnProceso 
            ? 'bg-indigo-100 text-indigo-700 border-indigo-200' 
            : 'bg-amber-100 text-amber-700 border-amber-200'; 

    const planillaHoras = normalizeAttachments(request[FIELD_PLANILLA_HORAS_FINALIZACION]);
    const informes = normalizeAttachments(request[FIELD_INFORME_FINAL_FINALIZACION]);
    const asistencias = normalizeAttachments(request[FIELD_PLANILLA_ASISTENCIA_FINALIZACION]);
    const allFiles = [...planillaHoras, ...informes, ...asistencias];
    const totalFiles = allFiles.length;

    // Preload files in background for pending requests to make preview instant
    useEffect(() => {
        if (isCargado || allFiles.length === 0) return;

        const preload = async () => {
            const newCache: Record<string, string> = {};
            
            // Prioritize files users likely click first (PDFs/Images)
            const filesToLoad = allFiles.filter(f => {
                const type = getFileType(f.filename);
                return type === 'pdf' || type === 'image';
            });

            await Promise.all(filesToLoad.map(async (file) => {
                try {
                    const response = await fetch(file.url);
                    if (response.ok) {
                        const blob = await response.blob();
                        const url = URL.createObjectURL(blob);
                        newCache[file.url] = url;
                    }
                } catch (err) {
                    console.warn("Failed to preload", file.filename);
                }
            }));

            setCachedBlobs(prev => ({ ...prev, ...newCache }));
        };
        
        // Slight delay to not block initial UI rendering
        const timer = setTimeout(preload, 1000);
        return () => {
            clearTimeout(timer);
            // Cleanup object URLs
            Object.values(cachedBlobs).forEach(url => URL.revokeObjectURL(url));
        };
    }, []); // Run once on mount

    const handlePreview = (e: React.MouseEvent, fileType: 'horas' | 'informe' | 'asistencia', indexInType: number) => {
        e.stopPropagation();
        const baseIndex = fileType === 'horas' ? 0 : fileType === 'informe' ? planillaHoras.length : planillaHoras.length + informes.length;
        onPreview(allFiles, baseIndex + indexInType, cachedBlobs);
    };

    const handleDownloadZip = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (allFiles.length === 0) return;

        setIsDownloadingZip(true);
        try {
            const zip = new JSZip();
            
            // Ensure we are working with strings safely
            const rawName = request.studentName;
            const rawLegajo = request.studentLegajo;
            const sName = typeof rawName === 'string' ? rawName : 'Estudiante';
            const sLegajo = rawLegajo ? String(rawLegajo) : 'SinLegajo';
            
            const folderName = `Acreditacion_${sName.replace(/\s+/g, '_')}_${sLegajo}`;
            
            const folder = zip.folder(folderName);

            if (!folder) throw new Error("Could not create zip folder");

            const fetchPromises = allFiles.map(async (file) => {
                try {
                    // Use cached blob if available
                    const cachedUrl = cachedBlobs[file.url];
                    let blob: Blob;
                    
                    if (cachedUrl) {
                         const response = await fetch(cachedUrl);
                         blob = await response.blob();
                    } else {
                        const response = await fetch(file.url);
                        if (!response.ok) throw new Error('Network error');
                        blob = await response.blob();
                    }
                    folder.file(file.filename, blob);
                } catch (err: any) {
                    const e = err as Error;
                    console.error(`Error downloading ${file.filename}`, e);
                    const msg = e && e.message ? e.message : String(e);
                    folder.file(`${file.filename}.error.txt`, "Error downloading file: " + msg);
                }
            });

            await Promise.all(fetchPromises);
            const content = await zip.generateAsync({ type: "blob" });
            FileSaver.saveAs(content as Blob, `${folderName}.zip`);

        } catch (err: any) {
            console.error("Zip Error:", err);
            alert("Error al generar el archivo ZIP.");
        } finally {
            setIsDownloadingZip(false);
        }
    };

    const Highlight = ({ text }: { text: string }) => {
        if (!searchTerm.trim()) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
        return <span>{parts.map((part, i) => part.toLowerCase() === searchTerm.toLowerCase() ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-400/50 dark:text-yellow-900 rounded px-0.5">{part}</mark> : part)}</span>;
    };

    return (
        <div 
            className={`group relative bg-white dark:bg-gray-900 rounded-xl border transition-all duration-300 ${
                isExpanded 
                    ? 'border-blue-400 dark:border-indigo-500 ring-1 ring-blue-100 dark:ring-indigo-500/30 shadow-lg' 
                    : 'border-slate-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-indigo-500/50 hover:shadow-md'
            }`}
        >
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 ${isExpanded ? 'w-1 rounded-tl-xl rounded-bl-xl' : 'w-1.5 rounded-l-xl'} ${statusColor}`}></div>

            {/* Header Area - Clickable to Toggle */}
            <div 
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-4 pl-6 cursor-pointer"
            >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-colors ${isCargado ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-gray-800 dark:border-gray-700'}`}>
                            {request.studentName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">
                                <Highlight text={request.studentName} />
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-mono bg-slate-50 dark:bg-slate-800 px-1.5 rounded border border-slate-100 dark:border-slate-700">
                                    <Highlight text={String(request.studentLegajo || '---')} />
                                </span>
                                <span>•</span>
                                <span>Solicitado: {formatDate(request.createdTime)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                        {totalFiles > 0 && (
                             <button 
                                onClick={handleDownloadZip}
                                disabled={isDownloadingZip}
                                className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors"
                                title="Descargar todos los archivos en ZIP"
                             >
                                {isDownloadingZip ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <span className="material-icons !text-sm">download</span>}
                                ZIP
                            </button>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${statusBadgeClass}`}>
                            {visualStatus}
                        </span>
                        <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <span className="material-icons !text-xl">expand_more</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area - Protected from Toggles */}
            <div className={`grid transition-all duration-500 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100 border-t border-slate-100 dark:border-gray-800' : 'grid-rows-[0fr] opacity-0 h-0 overflow-hidden'}`}>
                <div className="overflow-hidden cursor-default" onClick={(e) => e.stopPropagation()}>
                    <div className="p-4 pl-6 pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Planilla Horas</h5>
                                {planillaHoras.length > 0 ? planillaHoras.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'horas', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">table_view</span>
                                        <span className="text-xs font-medium truncate flex-1 text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">{file.filename}</span>
                                        <span className="material-icons !text-sm text-slate-300 group-hover:text-blue-400">visibility</span>
                                    </button>
                                )) : <p className="text-xs text-slate-400 italic pl-1">No adjunto</p>}
                            </div>
                            
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informe Final</h5>
                                {informes.length > 0 ? informes.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'informe', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">description</span>
                                        <span className="text-xs font-medium truncate flex-1 text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">{file.filename}</span>
                                        <span className="material-icons !text-sm text-slate-300 group-hover:text-blue-400">visibility</span>
                                    </button>
                                )) : <p className="text-xs text-slate-400 italic pl-1">No adjunto</p>}
                            </div>

                             <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Asistencias</h5>
                                {asistencias.length > 0 ? asistencias.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'asistencia', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">verified_user</span>
                                        <span className="text-xs font-medium truncate flex-1 text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">{file.filename}</span>
                                        <span className="material-icons !text-sm text-slate-300 group-hover:text-blue-400">visibility</span>
                                    </button>
                                )) : <p className="text-xs text-slate-400 italic pl-1">No adjunto</p>}
                            </div>
                        </div>
                        
                        {request[FIELD_SUGERENCIAS_MEJORAS_FINALIZACION] && (
                            <div className="mb-6 p-3 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                <h6 className="text-xs font-bold text-amber-700 dark:text-amber-500 mb-1 flex items-center gap-1"><span className="material-icons !text-xs">lightbulb</span> Sugerencias del alumno</h6>
                                <p className="text-xs text-slate-600 dark:text-slate-400 italic">"{request[FIELD_SUGERENCIAS_MEJORAS_FINALIZACION]}"</p>
                            </div>
                        )}

                        {/* Actions */}
                        {!isArchived && (
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <button 
                                    onClick={() => onDelete(request)}
                                    disabled={isUpdating}
                                    className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                    <span className="material-icons !text-sm">delete</span> Eliminar
                                </button>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => onUpdateStatus(request.id, 'En Proceso')}
                                        disabled={isUpdating || isEnProceso || isCargado}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isEnProceso ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                    >
                                        {isEnProceso ? 'En Proceso' : 'Marcar en Proceso'}
                                    </button>
                                    
                                    {!isCargado && (
                                        <button
                                            onClick={() => onUpdateStatus(request.id, 'Cargado')}
                                            disabled={isUpdating}
                                            className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                                        >
                                            <span className="material-icons !text-sm">check_circle</span>
                                            Confirmar Carga en SAC
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FinalizacionReview: React.FC = () => {
    const [loadingState, setLoadingState] = useState<'initial' | 'loading' | 'loaded' | 'error'>('initial');
    const [requests, setRequests] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const queryClient = useQueryClient();
    
    // Preview State
    const [previewFiles, setPreviewFiles] = useState<Attachment[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [cachedBlobsState, setCachedBlobsState] = useState<Record<string, string>>({});

    const fetchData = useCallback(async () => {
        setLoadingState('loading');
        try {
            const { records: finalizations, error: finError } = await fetchAllData(
                TABLE_NAME_FINALIZACION, 
                finalizacionPPSArraySchema,
                [FIELD_FECHA_SOLICITUD_FINALIZACION, FIELD_ESTADO_FINALIZACION, FIELD_ESTUDIANTE_FINALIZACION, FIELD_INFORME_FINAL_FINALIZACION, FIELD_PLANILLA_HORAS_FINALIZACION, FIELD_PLANILLA_ASISTENCIA_FINALIZACION, FIELD_SUGERENCIAS_MEJORAS_FINALIZACION]
            );

            if (finError) throw new Error(typeof finError.error === 'string' ? finError.error : finError.error.message);
            
            const studentIds = [...new Set(finalizations.map((r: any) => {
                const raw = r[FIELD_ESTUDIANTE_FINALIZACION];
                return Array.isArray(raw) ? raw[0] : raw;
            }).filter(Boolean))];

            const { records: students } = await fetchAllData<EstudianteFields>(
                TABLE_NAME_ESTUDIANTES,
                estudianteArraySchema,
                [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES],
                { id: studentIds }
            );
            
            const studentMap = new Map(students.map((s: any) => [s.id, s]));
            
            const enriched = finalizations.map((req: any) => {
                const sIdRaw = req[FIELD_ESTUDIANTE_FINALIZACION];
                const sId = Array.isArray(sIdRaw) ? sIdRaw[0] : sIdRaw;
                const student = studentMap.get(sId);
                return {
                    ...req,
                    studentName: student?.[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido',
                    studentLegajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || '---',
                    studentEmail: student?.[FIELD_CORREO_ESTUDIANTES] || '',
                };
            });
            
            // Sort by date desc
            enriched.sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
            
            setRequests(enriched);
            setLoadingState('loaded');
        } catch (e: any) {
            console.error(e);
            setLoadingState('error');
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
             const request = requests.find(r => r.id === id);
             if (!request) return;
             
             // 1. Update status
             await db.finalizacion.update(id, { [FIELD_ESTADO_FINALIZACION]: status });
             
             // 2. Send Email
             if (status === 'Cargado') {
                 // Update Student Record to "Finalizó"
                 const sIdRaw = request[FIELD_ESTUDIANTE_FINALIZACION];
                 const sId = Array.isArray(sIdRaw) ? sIdRaw[0] : sIdRaw;
                 if (sId) {
                     await db.estudiantes.update(sId, { 
                         [FIELD_FINALIZARON_ESTUDIANTES]: true,
                         [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: new Date().toISOString() 
                     });
                 }
                 
                 // Ensure strings for safety
                 const studentName = String(request.studentName);
                 const studentEmail = String(request.studentEmail);

                 const emailRes = await sendSmartEmail('sac', {
                     studentName: studentName,
                     studentEmail: studentEmail,
                     ppsName: 'Práctica Profesional Supervisada'
                 });
                 
                 if (!emailRes.success) {
                     console.warn('Email failed:', emailRes.message);
                     setToastInfo({ message: 'Estado actualizado, pero falló el envío del email.', type: 'error' });
                 } else {
                     setToastInfo({ message: 'Acreditación confirmada y email enviado.', type: 'success' });
                 }
             } else {
                 setToastInfo({ message: 'Estado actualizado.', type: 'success' });
             }
        },
        onSuccess: () => fetchData(),
        onError: (e: any) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' })
    });

    const deleteMutation = useMutation({
        mutationFn: async (record: any) => {
             const { error } = await deleteFinalizationRequest(record.id, record);
             if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Solicitud eliminada y archivos borrados.', type: 'success' });
            fetchData();
        },
        onError: (e: any) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
        onSettled: () => setDeletingId(null)
    });
    
    const handleDelete = (record: any) => {
        if (window.confirm('¿Estás seguro de eliminar esta solicitud y todos sus archivos adjuntos? Esta acción no se puede deshacer.')) {
            setDeletingId(record.id);
            deleteMutation.mutate(record);
        }
    };

    const handlePreview = (files: Attachment[], index: number, cachedBlobs: Record<string, string>) => {
        setPreviewFiles(files);
        setPreviewIndex(index);
        setCachedBlobsState(cachedBlobs);
        setIsPreviewOpen(true);
    };

    const { activeList, historyList } = useMemo(() => {
        const active: any[] = [];
        const history: any[] = [];
        const searchLower = searchTerm.toLowerCase();
        
        requests.forEach(req => {
             if (searchTerm && !req.studentName.toLowerCase().includes(searchLower) && !String(req.studentLegajo).includes(searchLower)) {
                 return;
             }
             const status = getNormalizationState(req);
             if (status === 'cargado') {
                 history.push(req);
             } else {
                 active.push(req);
             }
        });
        return { activeList: active, historyList: history };
    }, [requests, searchTerm]);

    if (loadingState === 'loading' || loadingState === 'initial') return <Loader />;
    if (loadingState === 'error') return <EmptyState icon="error" title="Error" message="No se pudieron cargar las solicitudes." />;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {isPreviewOpen && (
                <FilePreviewModal 
                    isOpen={isPreviewOpen} 
                    onClose={() => setIsPreviewOpen(false)} 
                    files={previewFiles} 
                    initialIndex={previewIndex} 
                    cachedBlobs={cachedBlobsState}
                />
            )}

            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative w-full md:w-96">
                    <input 
                        type="text" 
                        placeholder="Buscar por estudiante o legajo..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">search</span>
                </div>
            </div>

            {/* Active Requests */}
            {activeList.length > 0 ? (
                <div className="space-y-4">
                     <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                        Pendientes de Carga ({activeList.length})
                     </h3>
                    <div className="grid grid-cols-1 gap-4">
                        {activeList.map(req => (
                            <RequestListItem 
                                key={req.id} 
                                request={req} 
                                onUpdateStatus={(id, s) => updateStatusMutation.mutate({id, status: s})} 
                                onDelete={handleDelete}
                                isUpdating={updateStatusMutation.isPending || deletingId === req.id}
                                searchTerm={searchTerm}
                                onPreview={handlePreview}
                            />
                        ))}
                    </div>
                </div>
            ) : (
                 <div className="py-12 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400">
                    <span className="material-icons !text-4xl mb-2 opacity-50">task_alt</span>
                    <p className="font-medium">No hay solicitudes pendientes</p>
                </div>
            )}

            {/* History */}
            {historyList.length > 0 && (
                <CollapsibleSection 
                    title="Historial de Acreditaciones" 
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
                                request={req} 
                                onUpdateStatus={() => {}} // History items often read-only or revertable
                                onDelete={handleDelete}
                                isUpdating={deletingId === req.id}
                                searchTerm={searchTerm}
                                onPreview={handlePreview}
                                isArchived={true}
                            />
                        ))}
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
};

export default FinalizacionReview;
