
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
            // Safe string conversion for any type with fallbacks
            const nameVal = request.studentName || 'Estudiante';
            const sName = typeof nameVal === 'string' ? nameVal : String(nameVal);
            
            const legajoVal = request.studentLegajo || 'SinLegajo';
            const sLegajo = typeof legajoVal === 'string' ? legajoVal : String(legajoVal);
            
            const folderName = `Acreditacion_${sName.replace(/\s+/g, '_')}_${sLegajo}`;
            
            const folder = zip.folder(folderName);

            if (!folder) throw new Error("Could not create zip folder");

            const fetchPromises = allFiles.map(async (file) => {
                try {
                    // Use cached blob if available
                    const cachedUrl = cachedBlobs[file.url];
                    if (cachedUrl) {
                         const response = await fetch(cachedUrl);
                         const blob = await response.blob();
                         folder.file(file.filename, blob);
                    } else {
                        const response = await fetch(file.url);
                        if (!response.ok) throw new Error('Network error');
                        const blob = await response.blob();
                        folder.file(file.filename, blob);
                    }
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
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{file.filename}</span>
                                    </button>
                                )) : <span className="text-xs text-slate-400 italic">No adjunto</span>}
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informes</h5>
                                {informes.length > 0 ? informes.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'informe', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">description</span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{file.filename}</span>
                                    </button>
                                )) : <span className="text-xs text-slate-400 italic">No adjunto</span>}
                            </div>
                            <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Asistencias</h5>
                                {asistencias.length > 0 ? asistencias.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'asistencia', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">checklist</span>
                                        <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{file.filename}</span>
                                    </button>
                                )) : <span className="text-xs text-slate-400 italic">No adjunto</span>}
                            </div>
                        </div>

                        {request[FIELD_SUGERENCIAS_MEJORAS_FINALIZACION] && (
                            <div className="mb-6 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-lg">
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-50 mb-1">Comentarios del Alumno:</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300 italic">"{request[FIELD_SUGERENCIAS_MEJORAS_FINALIZACION]}"</p>
                            </div>
                        )}

                        <div className="flex justify-between items-center pt-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onDelete(request); }}
                                className="text-xs font-bold text-rose-600 hover:text-rose-800 flex items-center gap-1 px-3 py-2 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                            >
                                <span className="material-icons !text-base">delete</span> Eliminar
                            </button>

                            <div className="flex gap-2">
                                {isArchived ? (
                                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(String(request.id), 'Pendiente'); }} disabled={isUpdating} className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-lg shadow-sm transition-all">
                                        Revertir a Pendiente
                                    </button>
                                ) : isEnProceso ? (
                                    <>
                                        <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(String(request.id), 'Pendiente'); }} disabled={isUpdating} className="px-3 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-bold">Volver</button>
                                        <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(String(request.id), 'Cargado'); }} disabled={isUpdating} className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                                            {isUpdating ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-sm">check_circle</span>} Confirmar Carga SAC
                                        </button>
                                    </>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); onUpdateStatus(String(request.id), 'En Proceso'); }} disabled={isUpdating} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                                        {isUpdating ? <div className="w-3 h-3 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-sm">arrow_forward</span>} Aprobar para SAC
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
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
    const [currentCachedBlobs, setCurrentCachedBlobs] = useState<Record<string, string>>({});

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
                    studentId: studentId, 
                    createdTime: req.createdTime
                };
            }).sort((a, b) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
        }
    });

    const updateStatusMutation = useMutation<any, Error, { id: string; newStatus: string }>({
        mutationFn: async ({ id, newStatus }) => {
            const request = data?.find(r => r.id === id);
            if (request && request.studentId) {
                if (newStatus === 'Cargado') {
                     await db.estudiantes.update(request.studentId, {
                        [FIELD_FINALIZARON_ESTUDIANTES]: true,
                        [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: new Date().toISOString().split('T')[0]
                     });
                     if (request.studentEmail) {
                        const emailRes = await sendSmartEmail('sac', {
                             studentName: String(request.studentName || ''),
                             studentEmail: String(request.studentEmail || ''),
                             ppsName: 'Práctica Profesional Supervisada'
                        });
                        if (!emailRes.success && emailRes.message !== 'Automación desactivada') console.warn("Email send failed:", emailRes.message);
                    }
                } else {
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
            queryClient.invalidateQueries({ queryKey: ['adminDashboardOverview'] }); 
            setToastInfo({ message: 'Estado actualizado correctamente.', type: 'success' });
        },
        onError: (err: any) => setToastInfo({ message: `Error al actualizar: ${err?.message || String(err)}`, type: 'error' }),
        onSettled: () => setUpdatingId(null)
    });

    const deleteMutation = useMutation<any, Error, any>({
        mutationFn: (record: any) => {
            const id = record?.id ? String(record.id) : '';
            if (!id) throw new Error("ID not found");
            return deleteFinalizationRequest(id, record);
        },
        onSuccess: () => {
             setToastInfo({ message: 'Solicitud y archivos eliminados.', type: 'success' });
             queryClient.invalidateQueries({ queryKey: ['finalizacionRequests'] });
        },
        onError: (e: any) => setToastInfo({ message: 'Error al eliminar.', type: 'error' })
    });

    const handleDelete = (record: any) => {
        if (window.confirm('¿Eliminar solicitud de acreditación permanentemente? Esto borrará también los archivos adjuntos.')) deleteMutation.mutate(record);
    }

    const handleUpdateStatus = (id: string, newStatus: string) => {
        if (newStatus === 'Cargado' && !window.confirm('¿Confirmar acreditación final? Se actualizará el estado del alumno y se enviará el correo de confirmación.')) return;
        setUpdatingId(id);
        updateStatusMutation.mutate({ id, newStatus });
    };

    const handlePreview = useCallback((files: Attachment[], initialIndex: number, cachedBlobs: Record<string, string>) => {
        setPreviewFiles(files);
        setPreviewIndex(initialIndex);
        setCurrentCachedBlobs(cachedBlobs);
        setIsPreviewOpen(true);
    }, []);

    const filteredData = useMemo(() => {
        if (!data) return { pending: [], inProcess: [], archived: [] };
        const searchLower = searchTerm.toLowerCase();
        const matches = data.filter(item => item.studentName.toLowerCase().includes(searchLower) || String(item.studentLegajo).includes(searchLower));
        const pending: typeof data = [], inProcess: typeof data = [], archived: typeof data = [];
        matches.forEach(item => {
            const state = getNormalizationState(item);
            if (state === 'cargado') archived.push(item);
            else if (state === 'en proceso') inProcess.push(item);
            else pending.push(item);
        });
        return { pending, inProcess, archived };
    }, [data, searchTerm]);

    if (isLoading) return <div className="p-8 flex justify-center"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message="No se pudieron cargar las solicitudes." />;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <FilePreviewModal 
                isOpen={isPreviewOpen} 
                onClose={() => setIsPreviewOpen(false)} 
                files={previewFiles} 
                initialIndex={previewIndex} 
                cachedBlobs={currentCachedBlobs}
            />
            
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                 <div className="relative w-full md:w-96">
                    <input type="text" placeholder="Buscar por estudiante o legajo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">search</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="material-icons !text-lg">filter_list</span>
                    <span>Mostrando {filteredData.pending.length + filteredData.inProcess.length} activas</span>
                </div>
            </div>

            {filteredData.pending.length === 0 && filteredData.inProcess.length === 0 && filteredData.archived.length === 0 ? (
                 <EmptyState icon="inbox" title="Bandeja Vacía" message="No hay solicitudes de finalización que coincidan con tu búsqueda." />
            ) : (
                <>
                    {filteredData.pending.length > 0 && (
                        <div className="space-y-4">
                             <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1 flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-amber-400"></span> 1. Pendientes de Revisión ({filteredData.pending.length})
                             </h3>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {filteredData.pending.map((req) => (
                                    <RequestListItem key={req.id} request={req} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isUpdating={updatingId === req.id} searchTerm={searchTerm} onPreview={handlePreview} />
                                ))}
                             </div>
                        </div>
                    )}
                    {filteredData.inProcess.length > 0 && (
                        <div className="space-y-4">
                             <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider px-1 flex items-center gap-2">
                                 <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span> 2. Carga al SAC ({filteredData.inProcess.length})
                             </h3>
                             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                 {filteredData.inProcess.map((req) => (
                                     <RequestListItem key={req.id} request={req} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isUpdating={updatingId === req.id} searchTerm={searchTerm} onPreview={handlePreview} />
                                 ))}
                             </div>
                        </div>
                    )}
                    {filteredData.archived.length > 0 && (
                        <CollapsibleSection title="Finalizadas y Cargadas" count={filteredData.archived.length} icon="verified" iconBgColor="bg-emerald-100 dark:bg-emerald-900/30" iconColor="text-emerald-600 dark:text-emerald-400" borderColor="border-emerald-200 dark:border-emerald-900" defaultOpen={false}>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
                                 {filteredData.archived.map((req) => (
                                     <RequestListItem key={req.id} request={req} onUpdateStatus={handleUpdateStatus} onDelete={handleDelete} isUpdating={updatingId === req.id} searchTerm={searchTerm} onPreview={handlePreview} isArchived={true} />
                                 ))}
                            </div>
                        </CollapsibleSection>
                    )}
                </>
            )}
        </div>
    );
};

export default FinalizacionReview;
