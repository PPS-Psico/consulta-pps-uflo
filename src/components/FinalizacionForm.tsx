
import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { db } from '../lib/db';
import { supabase } from '../lib/supabaseClient';
import {
    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_INFORME_FINAL_FINALIZACION,
    FIELD_PLANILLA_HORAS_FINALIZACION,
    FIELD_PLANILLA_ASISTENCIA_FINALIZACION,
    FIELD_SUGERENCIAS_MEJORAS_FINALIZACION,
    FIELD_FECHA_FINALIZACION_ESTUDIANTES
} from '../constants';
import Card from './Card';
import Button from './Button';
import Toast from './Toast';
import EmptyState from './EmptyState';

interface FinalizacionFormProps {
    studentAirtableId: string | null;
}

type FileUploadType = 'informe' | 'horas' | 'asistencia';

interface FileState {
    file: File | null;
    uploading: boolean;
    url: string | null;
}

const FinalizacionForm: React.FC<FinalizacionFormProps> = ({ studentAirtableId }) => {
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isSubmitted, setIsSubmitted] = useState(false);
    
    const [files, setFiles] = useState<Record<FileUploadType, FileState>>({
        horas: { file: null, uploading: false, url: null }, // 1. Planilla de Seguimiento
        asistencia: { file: null, uploading: false, url: null }, // 2. Asistencia
        informe: { file: null, uploading: false, url: null }, // 3. Informes
    });
    
    const [sugerencias, setSugerencias] = useState('');

    const fileInputRefs = {
        horas: useRef<HTMLInputElement>(null),
        asistencia: useRef<HTMLInputElement>(null),
        informe: useRef<HTMLInputElement>(null),
    };

    const uploadFile = async (file: File, type: FileUploadType): Promise<string> => {
        if (!studentAirtableId) throw new Error("No se ha identificado al estudiante.");

        const fileExt = file.name.split('.').pop();
        const fileName = `${studentAirtableId}/${type}_${Date.now()}.${fileExt}`;
        const filePath = fileName;

        const { error: uploadError } = await supabase.storage
            .from('documentos_finalizacion')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('documentos_finalizacion')
            .getPublicUrl(filePath);

        return data.publicUrl;
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: FileUploadType) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            // Basic validation
            if (selectedFile.size > 5 * 1024 * 1024) {
                setToastInfo({ message: `El archivo ${type} es demasiado grande (máx 5MB).`, type: 'error' });
                return;
            }
            setFiles(prev => ({
                ...prev,
                [type]: { ...prev[type], file: selectedFile }
            }));
        }
    };

    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!studentAirtableId) throw new Error("ID de estudiante no disponible.");
            if (!files.informe.file || !files.horas.file || !files.asistencia.file) {
                throw new Error("Debes subir todos los archivos requeridos.");
            }

            // 1. Upload all files in parallel
            const uploadPromises = (Object.keys(files) as FileUploadType[]).map(async (key) => {
                setFiles(prev => ({ ...prev, [key]: { ...prev[key], uploading: true } }));
                try {
                    const url = await uploadFile(files[key].file!, key);
                    setFiles(prev => ({ ...prev, [key]: { ...prev[key], uploading: false, url } }));
                    return { key, url, filename: files[key].file!.name };
                } catch (e) {
                    setFiles(prev => ({ ...prev, [key]: { ...prev[key], uploading: false } }));
                    throw e;
                }
            });

            const uploadedFiles = await Promise.all(uploadPromises);
            
            // 2. Create Finalization Record with status 'Pendiente' (No Cargado)
            const dbRecord: any = {
                [FIELD_ESTUDIANTE_FINALIZACION]: [studentAirtableId],
                [FIELD_FECHA_SOLICITUD_FINALIZACION]: new Date().toISOString(),
                [FIELD_ESTADO_FINALIZACION]: 'Pendiente', // Estado inicial "No Cargado"
            };
            
            if (sugerencias.trim()) {
                dbRecord[FIELD_SUGERENCIAS_MEJORAS_FINALIZACION] = sugerencias.trim();
            }

            uploadedFiles.forEach(f => {
                if (f.key === 'informe') dbRecord[FIELD_INFORME_FINAL_FINALIZACION] = [{ url: f.url, filename: f.filename }];
                if (f.key === 'horas') dbRecord[FIELD_PLANILLA_HORAS_FINALIZACION] = [{ url: f.url, filename: f.filename }];
                if (f.key === 'asistencia') dbRecord[FIELD_PLANILLA_ASISTENCIA_FINALIZACION] = [{ url: f.url, filename: f.filename }];
            });

            await db.finalizacion.create(dbRecord);

            return true;
        },
        onSuccess: () => {
            setIsSubmitted(true);
            setToastInfo({ message: 'Solicitud enviada con éxito. Se procesará tu acreditación.', type: 'success' });
        },
        onError: (error: any) => {
            setToastInfo({ message: `Error al enviar: ${error.message}`, type: 'error' });
        }
    });

    const handleDownloadTemplate = (e: React.MouseEvent) => {
        e.preventDefault();
        alert("La descarga del modelo estará disponible pronto. Por favor solicítalo por correo si no lo tienes.");
    };

    if (isSubmitted) {
        return (
            <Card title="Solicitud Recibida" icon="check_circle" className="border-emerald-200 bg-emerald-50/50 shadow-none border-0">
                <EmptyState
                    icon="mark_email_read"
                    title="¡Documentación Enviada!"
                    message="Hemos recibido tus archivos correctamente. Tu solicitud está en estado 'Pendiente' y será revisada por la administración. Recibirás un correo cuando la acreditación sea confirmada."
                />
                <div className="mt-6 text-center">
                    <Button variant="secondary" onClick={() => window.location.reload()}>Volver al Inicio</Button>
                </div>
            </Card>
        );
    }

    const uploadItems = [
        { 
            key: 'horas', 
            label: 'Planilla de Seguimiento', 
            desc: 'Excel de seguimiento de horas firmado.', 
            icon: 'schedule',
            hasTemplate: true 
        },
        { 
            key: 'asistencia', 
            label: 'Planilla de Asistencia', 
            desc: 'Registro diario de asistencia.', 
            icon: 'event_available' 
        },
        { 
            key: 'informe', 
            label: 'Informes', 
            desc: 'Informes finales de la práctica.', 
            icon: 'description' 
        },
    ];

    return (
        <div className="animate-fade-in-up h-full flex flex-col">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
                        <span className="material-icons !text-2xl">verified</span>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Solicitud de Finalización</h2>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Adjunta la documentación final para cerrar tu ciclo de prácticas.</p>
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-900/30">
                {/* Upload Sections */}
                {uploadItems.map((item) => (
                    <div key={item.key} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-100 dark:border-blue-800">
                            <span className="material-icons">{item.icon}</span>
                        </div>
                        <div className="flex-grow">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-800 dark:text-slate-200">{item.label}</h4>
                                {item.hasTemplate && (
                                    <button 
                                        onClick={handleDownloadTemplate}
                                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-0.5"
                                    >
                                        <span className="material-icons !text-xs">download</span>
                                        Descargar Modelo
                                    </button>
                                )}
                            </div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.desc}</p>
                        </div>
                        <div className="flex-shrink-0 w-full sm:w-auto">
                            <input
                                type="file"
                                ref={fileInputRefs[item.key as FileUploadType]}
                                onChange={(e) => handleFileChange(e, item.key as FileUploadType)}
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRefs[item.key as FileUploadType].current?.click()}
                                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold border transition-all flex items-center justify-center gap-2 ${
                                    files[item.key as FileUploadType].file 
                                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400'
                                        : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-200 hover:shadow-sm'
                                }`}
                            >
                                {files[item.key as FileUploadType].file ? (
                                    <>
                                        <span className="material-icons !text-lg">check</span>
                                        Listo
                                    </>
                                ) : (
                                    <>
                                        <span className="material-icons !text-lg">upload</span>
                                        Subir
                                    </>
                                )}
                            </button>
                            {files[item.key as FileUploadType].file && (
                                <p className="text-xs text-center mt-1.5 text-emerald-600 dark:text-emerald-400 truncate max-w-[150px] mx-auto font-medium">
                                    {files[item.key as FileUploadType].file?.name}
                                </p>
                            )}
                        </div>
                    </div>
                ))}

                {/* Sugerencias Section */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="material-icons text-amber-500 !text-xl">tips_and_updates</span>
                        <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-tight">
                            Sugerencias (Opcional)
                        </h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                        ¿Tienes alguna sugerencia para mejorar el proceso de prácticas? Tu opinión es valiosa.
                    </p>
                    <textarea
                        value={sugerencias}
                        onChange={(e) => setSugerencias(e.target.value)}
                        rows={3}
                        className="w-full text-sm rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/50 shadow-inner outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all border-slate-300 dark:border-slate-600"
                        placeholder="Escribe tus comentarios aquí..."
                    />
                </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex justify-end">
                <Button
                    onClick={() => submitMutation.mutate()}
                    isLoading={submitMutation.isPending}
                    disabled={!files.informe.file || !files.horas.file || !files.asistencia.file}
                    icon="send"
                    className="w-full sm:w-auto shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                    Enviar Solicitud y Finalizar
                </Button>
            </div>
        </div>
    );
};

export default FinalizacionForm;
