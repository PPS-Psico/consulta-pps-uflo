
import React, { useState, useEffect } from 'react';
import { useFinalizacionLogic } from '../hooks/useFinalizacionLogic';
import { Attachment, getFileType, getNormalizationState, getStoragePath } from '../utils/attachmentUtils';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import CollapsibleSection from './CollapsibleSection';
import { formatDate } from '../utils/formatters';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabaseClient';
import { 
    FIELD_PLANILLA_HORAS_FINALIZACION,
    FIELD_INFORME_FINAL_FINALIZACION,
    FIELD_PLANILLA_ASISTENCIA_FINALIZACION,
    FIELD_SUGERENCIAS_MEJORAS_FINALIZACION
} from '../constants';

// Helper to normalize attachments data structure (string JSON or array)
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

interface FilePreviewModalProps {
    files: Attachment[];
    initialIndex: number;
    isOpen: boolean;
    onClose: () => void;
}

const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ files, initialIndex, isOpen, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [isLoadingContent, setIsLoadingContent] = useState(true);
    const [signedUrls, setSignedUrls] = useState<string[]>([]);
    const [urlsLoaded, setUrlsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
            setHasError(false);
            setUrlsLoaded(false);
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen, initialIndex]);

    useEffect(() => {
        if (!isOpen || files.length === 0) return;
        const fetchAllUrls = async () => {
            const promises = files.map(async (file) => {
                const path = getStoragePath(file.url);
                if (!path) return file.url; 
                try {
                    const { data, error } = await supabase.storage.from('documentos_finalizacion').createSignedUrl(path, 3600);
                    if (error || !data) return file.url;
                    return data.signedUrl;
                } catch (e) { return file.url; }
            });
            const results = await Promise.all(promises);
            setSignedUrls(results);
            setUrlsLoaded(true);
            setIsLoadingContent(false);
        };
        fetchAllUrls();
    }, [isOpen, files]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNext();
            if (e.key === 'ArrowLeft') handlePrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentIndex]); 

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsLoadingContent(true);
        setHasError(false);
        setCurrentIndex((prev) => (prev + 1) % files.length);
    };
    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsLoadingContent(true);
        setHasError(false);
        setCurrentIndex((prev) => (prev - 1 + files.length) % files.length);
    };

    if (!isOpen || files.length === 0) return null;
    const currentFile = files[currentIndex];
    const displayUrl = urlsLoaded ? signedUrls[currentIndex] : null;
    const fileType = getFileType(currentFile.filename);

    const renderContent = () => {
        if (!urlsLoaded) return <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>;
        if (hasError || !displayUrl) return <div className="text-white text-center p-4">Error al cargar vista previa.</div>;
        
        if (fileType === 'image') {
            return <img src={displayUrl} alt={currentFile.filename} className={`max-w-[95vw] max-h-[85vh] object-contain transition-opacity duration-200 ${isLoadingContent ? 'opacity-50' : 'opacity-100'}`} onLoad={() => setIsLoadingContent(false)} onError={() => { setHasError(true); setIsLoadingContent(false); }} />;
        }
        if (fileType === 'pdf') {
            return <iframe src={displayUrl} className="w-[90vw] h-[85vh] bg-white rounded-lg shadow-2xl" title="PDF Preview" onLoad={() => setIsLoadingContent(false)} onError={() => setHasError(true)} />;
        }
        if (fileType === 'office') {
             return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(displayUrl)}`} className="w-[90vw] h-[85vh] bg-white rounded-lg" title="Office Preview" onLoad={() => setIsLoadingContent(false)} />;
        }
        return (
            <div className="text-white text-center">
                <span className="material-icons !text-6xl mb-4 opacity-80">description</span>
                <p className="mb-6 text-lg">Vista previa no disponible para este formato.</p>
                <a href={displayUrl} download target="_blank" rel="noopener noreferrer" className="bg-blue-600 px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">Descargar Archivo</a>
            </div>
        );
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex flex-col animate-fade-in" onClick={onClose}>
            <div className="flex-shrink-0 flex justify-between items-center p-4 text-white z-50 h-16 bg-gradient-to-b from-black/80 to-transparent" onClick={e => e.stopPropagation()}>
                <div className="flex flex-col">
                    <h3 className="font-bold text-lg truncate max-w-md">{currentFile.filename}</h3>
                    <span className="text-xs text-gray-400">{currentIndex + 1} de {files.length}</span>
                </div>
                <div className="flex items-center gap-4">
                    {urlsLoaded && <a href={displayUrl!} download target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"><span className="material-icons">download</span></a>}
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/20 transition-colors"><span className="material-icons">close</span></button>
                </div>
            </div>
            <div className="flex-grow relative flex items-center justify-center p-2 sm:p-4 overflow-hidden" onClick={e => e.stopPropagation()}>
                 {renderContent()}
                 {files.length > 1 && (
                    <>
                        <button onClick={handlePrev} className="absolute left-2 sm:left-6 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-all hover:scale-110 border border-white/10 backdrop-blur-sm"><span className="material-icons !text-3xl">chevron_left</span></button>
                        <button onClick={handleNext} className="absolute right-2 sm:right-6 p-3 rounded-full bg-black/40 hover:bg-black/70 text-white/70 hover:text-white transition-all hover:scale-110 border border-white/10 backdrop-blur-sm"><span className="material-icons !text-3xl">chevron_right</span></button>
                    </>
                 )}
            </div>
        </div>,
        document.body
    );
};

const RequestListItem: React.FC<{
    request: any;
    onUpdateStatus: (id: string, status: string) => void;
    onDelete: (record: any) => void;
    onCopy: (text: string) => void;
    isUpdating: boolean;
    searchTerm: string;
    onPreview: (files: Attachment[], initialIndex: number) => void;
    isArchived?: boolean;
}> = ({ request, onUpdateStatus, onDelete, onCopy, isUpdating, searchTerm, onPreview, isArchived = false }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isDownloadingZip, setIsDownloadingZip] = useState(false);
    
    const status = getNormalizationState(request);
    const isCargado = status === 'cargado';
    const isEnProceso = status === 'en proceso';
    
    let visualStatus = 'Pendiente';
    let statusColor = 'bg-amber-500'; 
    if (isCargado) { visualStatus = 'Finalizada'; statusColor = 'bg-emerald-500'; }
    else if (isEnProceso) { visualStatus = 'En Proceso SAC'; statusColor = 'bg-indigo-500'; }
    
    const statusBadgeClass = isCargado ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800' : isEnProceso ? 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800' : 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800'; 

    const planillaHoras: Attachment[] = normalizeAttachments(request[FIELD_PLANILLA_HORAS_FINALIZACION]);
    const informes: Attachment[] = normalizeAttachments(request[FIELD_INFORME_FINAL_FINALIZACION]);
    const asistencias: Attachment[] = normalizeAttachments(request[FIELD_PLANILLA_ASISTENCIA_FINALIZACION]);
    const allFiles: Attachment[] = [...planillaHoras, ...informes, ...asistencias];

    const handlePreview = (e: React.MouseEvent, fileType: 'horas' | 'informe' | 'asistencia', indexInType: number) => {
        e.stopPropagation();
        const baseIndex = fileType === 'horas' ? 0 : fileType === 'informe' ? planillaHoras.length : planillaHoras.length + informes.length;
        onPreview(allFiles, baseIndex + indexInType);
    };

    const handleDownloadZip = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (allFiles.length === 0) return;
        setIsDownloadingZip(true);
        try {
            // Lazy load JSZip and FileSaver
            const JSZip = (await import('jszip')).default;
            const FileSaver = (await import('file-saver')).default;

            const zip = new JSZip();
            const folderName = `Acreditacion_${(request.studentName as string).replace(/\s+/g, '_')}_${request.studentLegajo}`;
            const folder = zip.folder(folderName);
            if (!folder) throw new Error("Could not create zip folder");

            const fetchPromises = allFiles.map(async (file: Attachment) => {
                try {
                    const path = getStoragePath(file.url);
                    let blob: Blob;
                    if (path) {
                        const { data, error } = await supabase.storage.from('documentos_finalizacion').download(path);
                        if (error || !data) throw new Error(error?.message || 'Error downloading from storage');
                        blob = data;
                    } else {
                        const response = await fetch(file.url);
                        if (!response.ok) throw new Error('Network error');
                        blob = await response.blob();
                    }
                    folder.file(file.filename, blob);
                } catch (err: any) {
                    folder.file(`${file.filename}.error.txt`, "Error: " + err.message);
                }
            });
            await Promise.all(fetchPromises);
            const content = await zip.generateAsync({ type: "blob" });
            FileSaver.saveAs(content as Blob, `${folderName}.zip`);
        } catch (err: any) {
            console.error("Zip Error:", err);
        } finally {
            setIsDownloadingZip(false);
        }
    };

    const handleCopyExcel = (e: React.MouseEvent) => {
        e.stopPropagation();
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const legajo = request.studentLegajo || '';
        const nombre = request.studentName || '';
        // Format: DD/MM/YYYY [TAB] LEGAJO [TAB] NOMBRE
        const textToCopy = `${dateStr}\t${legajo}\t${nombre}`;
        onCopy(textToCopy);
    };

    const Highlight = ({ text }: { text: string }) => {
        if (!searchTerm.trim()) return <span>{text}</span>;
        const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
        return <span>{parts.map((part, i) => part.toLowerCase() === searchTerm.toLowerCase() ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-400/50 dark:text-yellow-900 rounded px-0.5">{part}</mark> : part)}</span>;
    };

    return (
        <div className={`group relative bg-white dark:bg-gray-900 rounded-xl border transition-all duration-300 ${isExpanded ? 'border-blue-400 dark:border-indigo-500 ring-1 ring-blue-100 dark:ring-indigo-500/30 shadow-lg' : 'border-slate-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-indigo-500/50 hover:shadow-md'}`}>
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all duration-300 ${isExpanded ? 'w-1 rounded-tl-xl rounded-bl-xl' : 'w-1.5 rounded-l-xl'} ${statusColor}`}></div>
            <div onClick={() => setIsExpanded(!isExpanded)} className="p-4 pl-6 cursor-pointer">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border transition-colors ${isCargado ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-gray-800 dark:border-gray-700'}`}>{request.studentName.charAt(0)}</div>
                        <div className="min-w-0">
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 truncate text-base"><Highlight text={String(request.studentName || '')} /></h4>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-mono bg-slate-50 dark:bg-slate-800 px-1.5 rounded border border-slate-100 dark:border-slate-700"><Highlight text={String(request.studentLegajo || '---')} /></span>
                                <span>•</span><span>Solicitado: {formatDate(request.createdTime)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-center">
                        {allFiles.length > 0 && (
                             <button onClick={handleDownloadZip} disabled={isDownloadingZip} className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-800 transition-colors">
                                {isDownloadingZip ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <span className="material-icons !text-sm">download</span>} ZIP
                            </button>
                        )}
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wide ${statusBadgeClass}`}>{visualStatus}</span>
                        <div className={`text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><span className="material-icons !text-xl">expand_more</span></div>
                    </div>
                </div>
            </div>

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
                                    </button>
                                )) : <p className="text-xs text-slate-400 italic pl-1">No adjunto</p>}
                            </div>
                             <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Informe Final</h5>
                                {informes.length > 0 ? informes.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'informe', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">description</span>
                                        <span className="text-xs font-medium truncate flex-1 text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">{file.filename}</span>
                                    </button>
                                )) : <p className="text-xs text-slate-400 italic pl-1">No adjunto</p>}
                            </div>
                             <div className="space-y-2">
                                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Asistencias</h5>
                                {asistencias.length > 0 ? asistencias.map((file, idx) => (
                                    <button key={idx} onClick={(e) => handlePreview(e, 'asistencia', idx)} className="w-full flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-gray-800/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-slate-200 dark:border-gray-700 transition-colors group text-left">
                                        <span className="material-icons !text-lg text-slate-400 group-hover:text-blue-500">verified_user</span>
                                        <span className="text-xs font-medium truncate flex-1 text-slate-600 dark:text-slate-300 group-hover:text-blue-700 dark:group-hover:text-blue-300">{file.filename}</span>
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

                        {!isArchived && (
                            <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-700/50">
                                <button onClick={() => onDelete(request)} disabled={isUpdating} className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"><span className="material-icons !text-sm">delete</span> Eliminar</button>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleCopyExcel}
                                        className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 flex items-center gap-2"
                                        title="Copiar datos para Excel"
                                    >
                                        <span className="material-icons !text-sm">content_copy</span>
                                        Copiar
                                    </button>
                                    <button onClick={() => onUpdateStatus(request.id, 'En Proceso')} disabled={isUpdating || isEnProceso || isCargado} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${isEnProceso ? 'bg-indigo-100 text-indigo-700 cursor-default' : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700'}`}>{isEnProceso ? 'En Proceso' : 'Marcar en Proceso'}</button>
                                    {!isCargado && <button onClick={() => onUpdateStatus(request.id, 'Cargado')} disabled={isUpdating} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg transition-all flex items-center gap-2"><span className="material-icons !text-sm">check_circle</span> Confirmar Carga en SAC</button>}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

interface FinalizacionReviewProps {
    isTestingMode?: boolean;
}

const FinalizacionReview: React.FC<FinalizacionReviewProps> = ({ isTestingMode = false }) => {
    const { 
        requests, isLoading, error, 
        searchTerm, setSearchTerm, 
        toastInfo, setToastInfo, 
        deletingId, updateStatusMutation, handleDelete, 
        activeList, historyList 
    } = useFinalizacionLogic(isTestingMode);
    
    const [previewFiles, setPreviewFiles] = useState<Attachment[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const handlePreview = (files: Attachment[], index: number) => {
        setPreviewFiles(files);
        setPreviewIndex(index);
        setIsPreviewOpen(true);
    };
    
    const handleCopyData = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setToastInfo({ message: 'Datos copiados para Excel.', type: 'success' });
        });
    };

    if (isLoading) return <Loader />;
    if (error) return <EmptyState icon="error" title="Error" message="No se pudieron cargar las solicitudes." />;

    return (
        <div className="space-y-8 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            {isPreviewOpen && <FilePreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} files={previewFiles} initialIndex={previewIndex} />}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-slate-50 dark:bg-gray-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                <div className="relative w-full md:w-96">
                    <input type="text" placeholder="Buscar por estudiante o legajo..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-slate-900 dark:text-white"/>
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">search</span>
                </div>
            </div>
            {activeList.length > 0 ? (
                <div className="space-y-4">
                     <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1"><span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>Pendientes de Carga ({activeList.length})</h3>
                    <div className="grid grid-cols-1 gap-4">
                        {activeList.map((req: any) => (
                            <RequestListItem 
                                key={req.id} 
                                request={req} 
                                onUpdateStatus={(id, s) => updateStatusMutation.mutate({id, status: s})} 
                                onDelete={handleDelete} 
                                onCopy={handleCopyData}
                                isUpdating={updateStatusMutation.isPending || deletingId === req.id} 
                                searchTerm={searchTerm} 
                                onPreview={handlePreview} 
                            />
                        ))}
                    </div>
                </div>
            ) : <div className="py-12 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-slate-400"><span className="material-icons !text-4xl mb-2 opacity-50">task_alt</span><p className="font-medium">No hay solicitudes pendientes</p></div>}
            {historyList.length > 0 && (
                <CollapsibleSection title="Historial de Acreditaciones" count={historyList.length} icon="history" iconBgColor="bg-slate-100 dark:bg-gray-800" iconColor="text-slate-500 dark:text-slate-400" borderColor="border-slate-200 dark:border-slate-700" defaultOpen={false}>
                     <div className="grid grid-cols-1 gap-4 mt-4">
                        {historyList.map((req: any) => (
                            <RequestListItem 
                                key={req.id} 
                                request={req} 
                                onUpdateStatus={() => {}} 
                                onDelete={handleDelete} 
                                onCopy={handleCopyData}
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
