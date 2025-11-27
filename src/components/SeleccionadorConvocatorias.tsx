
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import emailjs from '@emailjs/browser';
import { db } from '../lib/db';
import { toggleStudentSelection } from '../services/dataService';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_PENALIZACION_ESTUDIANTE_LINK,
    FIELD_PENALIZACION_PUNTAJE,
    FIELD_CORREO_ESTUDIANTES,
} from '../constants';
import { normalizeStringForComparison, getEspecialidadClasses, formatDate } from '../utils/formatters';
import type { LanzamientoPPS, ConvocatoriaFields, AirtableRecord } from '../types';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import SubTabs from './SubTabs';
import Input from './Input';

// --- LOCAL STORAGE KEYS ---
const STORAGE_KEY_SUBJECT = 'pps_email_subject';
const STORAGE_KEY_BODY = 'pps_email_body';
const STORAGE_KEY_AUTOMATION = 'pps_email_automation';
const STORAGE_KEY_SERVICE_ID = 'pps_email_service_id';
const STORAGE_KEY_TEMPLATE_ID = 'pps_email_template_id';
const STORAGE_KEY_PUBLIC_KEY = 'pps_email_public_key';

// --- Tipos y Constantes Auxiliares ---

interface EnrichedStudent {
    enrollmentId: string;
    studentId: string;
    nombre: string;
    legajo: string;
    correo: string;
    status: string;
    
    // Datos Académicos
    terminoCursar: boolean;
    cursandoElectivas: boolean;
    finalesAdeuda: string;
    notasEstudiante: string;
    
    // Datos Calculados
    totalHoras: number;
    penalizacionAcumulada: number;
    puntajeTotal: number;
    
    // Gestión
    horarioSeleccionado: string;
}

const SCORE_WEIGHTS = {
    TERMINO_CURSAR: 100,
    CURSANDO_ELECTIVAS: 50,
    BASE_FINALES: 30, // Puntaje base si debe finales
    PER_HOUR: 0.5,    // 0.5 puntos por hora realizada
};

const calculateScore = (
    enrollment: AirtableRecord<ConvocatoriaFields>,
    hours: number,
    penalties: number
): number => {
    let academicScore = 0;
    const termino = enrollment.fields[FIELD_TERMINO_CURSAR_CONVOCATORIAS] === 'Sí';
    const electivas = enrollment.fields[FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS] === 'Sí';
    
    if (termino) {
        academicScore = SCORE_WEIGHTS.TERMINO_CURSAR;
    } else if (electivas) {
        academicScore = SCORE_WEIGHTS.CURSANDO_ELECTIVAS;
    } else {
        academicScore = SCORE_WEIGHTS.BASE_FINALES;
    }

    const hoursScore = hours * SCORE_WEIGHTS.PER_HOUR;
    const penaltyScore = penalties; 

    return Math.round(academicScore + hoursScore - penaltyScore);
};

// Plantilla por defecto
const DEFAULT_EMAIL_SUBJECT = "Selección PPS: {{ppsName}} - UFLO";
const DEFAULT_EMAIL_BODY = `¡Buenas noticias!

Te informamos que has sido SELECCIONADO/A para realizar la Práctica Profesional Supervisada (PPS) en:
"{{ppsName}}"

--------------------------------------------------
📋 DETALLES DE TU ASIGNACIÓN:
--------------------------------------------------
• Institución: {{ppsName}}
• Horario asignado: {{schedule}}
• Estado: Seleccionado

👉 PRÓXIMOS PASOS:
Por favor, mantente atento/a a tu correo. En breve recibirás instrucciones específicas para el inicio o la firma de documentos.

IMPORTANTE: Si no puedes cumplir con este horario o deseas renunciar a la vacante, avísanos inmediatamente respondiendo a este correo para poder asignarla a otro compañero.

Atentamente,
Departamento de PPS - UFLO`;

const StudentRow: React.FC<{ 
    student: EnrichedStudent; 
    onToggleSelection: (student: EnrichedStudent) => void;
    onUpdateSchedule: (id: string, newSchedule: string) => void;
    isUpdating: boolean;
}> = ({ student, onToggleSelection, onUpdateSchedule, isUpdating }) => {
    const [localSchedule, setLocalSchedule] = useState(student.horarioSeleccionado);
    const [isScheduleDirty, setIsScheduleDirty] = useState(false);
    const isSelected = normalizeStringForComparison(student.status) === 'seleccionado';

    const handleScheduleBlur = () => {
        if (isScheduleDirty && localSchedule !== student.horarioSeleccionado) {
            onUpdateSchedule(student.enrollmentId, localSchedule);
            setIsScheduleDirty(false);
        }
    };

    const finalesText = student.finalesAdeuda 
        ? `Adeuda: ${student.finalesAdeuda}` 
        : 'Adeuda finales';

    return (
        <div className={`p-4 rounded-xl border transition-all duration-300 ${isSelected ? 'bg-emerald-50/50 border-emerald-200 dark:bg-emerald-900/10 dark:border-emerald-800' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-600'}`}>
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center">
                
                {/* Columna 1: Datos Personales y Puntaje */}
                <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="flex flex-col items-center gap-0.5">
                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm border ${student.puntajeTotal >= 100 ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`} title={`Puntaje Calculado: ${student.puntajeTotal}`}>
                                {student.puntajeTotal}
                            </div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ptos.</span>
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100">{student.nombre}</h4>
                            <p className="text-xs text-slate-500 font-mono">{student.legajo}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">Hs: {student.totalHoras}</span>
                        {student.penalizacionAcumulada > 0 && (
                            <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded font-semibold">Penaliz: -{student.penalizacionAcumulada}</span>
                        )}
                    </div>
                </div>

                {/* Columna 2: Situación Académica */}
                <div className="flex-1 text-sm space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-slate-500 text-xs uppercase font-semibold">Estado:</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                            {student.terminoCursar ? 'Terminó de Cursar' : 
                             student.cursandoElectivas ? 'Cursando Electivas' : 
                             finalesText}
                        </span>
                    </div>
                    {student.notasEstudiante && (
                        <div className="text-xs italic text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                            "{student.notasEstudiante}"
                        </div>
                    )}
                </div>

                {/* Columna 3: Horario */}
                <div className="flex-1 min-w-[250px]">
                    <label className="text-xs font-semibold text-slate-500 block mb-1">Horario Preferido</label>
                    <input 
                        type="text"
                        value={localSchedule}
                        onChange={(e) => { setLocalSchedule(e.target.value); setIsScheduleDirty(true); }}
                        onBlur={handleScheduleBlur}
                        className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                        placeholder="Editar horario..."
                    />
                </div>

                {/* Columna 4: Acciones */}
                <div className="flex-shrink-0 flex justify-end lg:w-48 gap-2">
                    <button
                        onClick={() => onToggleSelection(student)}
                        disabled={isUpdating}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-bold transition-all shadow-sm flex items-center justify-center gap-2 ${
                            isSelected 
                                ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700'
                        }`}
                    >
                        {isUpdating ? (
                            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <>
                                <span className="material-icons !text-lg">{isSelected ? 'check' : 'add'}</span>
                                {isSelected ? 'Listo' : 'Elegir'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

const SeleccionadorConvocatorias: React.FC<{ isTestingMode?: boolean }> = ({ isTestingMode = false }) => {
    const [selectedLanzamiento, setSelectedLanzamiento] = useState<LanzamientoPPS | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    
    // Estado para pestañas globales del seleccionador (fuera de una convocatoria)
    const [activeGlobalTab, setActiveGlobalTab] = useState('selection'); // 'selection' | 'email_config'
    
    // Estados para la configuración del correo
    const [emailSubject, setEmailSubject] = useState(() => localStorage.getItem(STORAGE_KEY_SUBJECT) || DEFAULT_EMAIL_SUBJECT);
    const [emailBody, setEmailBody] = useState(() => localStorage.getItem(STORAGE_KEY_BODY) || DEFAULT_EMAIL_BODY);
    const [isEmailAutomationEnabled, setIsEmailAutomationEnabled] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY_AUTOMATION);
        return saved !== null ? saved === 'true' : true;
    });
    // Estados para credenciales EmailJS (Iniciales)
    const [serviceId, setServiceId] = useState(() => localStorage.getItem(STORAGE_KEY_SERVICE_ID) || '');
    const [templateId, setTemplateId] = useState(() => localStorage.getItem(STORAGE_KEY_TEMPLATE_ID) || '');
    const [publicKey, setPublicKey] = useState(() => localStorage.getItem(STORAGE_KEY_PUBLIC_KEY) || '');

    // Check for missing config
    const isConfigMissing = !serviceId || !templateId || !publicKey;


    const queryClient = useQueryClient();

    // 1. Fetch Open Launches
    const { data: openLaunches = [], isLoading: isLoadingLaunches } = useQuery({
        queryKey: ['openLaunchesForSelector', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) return [];
            
            const records = await db.lanzamientos.getAll({
                filterByFormula: `OR({${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierta', {${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierto')`
            });
            
            return records.map(r => ({ ...r.fields, id: r.id } as LanzamientoPPS))
                .filter(l => {
                    const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
                    return status === 'abierta' || status === 'abierto';
                });
        }
    });

    const candidatesQueryKey = ['candidatesForLaunch', selectedLanzamiento?.id];

    // 2. Fetch Candidates for Selected Launch
    const { data: candidates = [], isLoading: isLoadingCandidates, refetch: refetchCandidates } = useQuery({
        queryKey: candidatesQueryKey,
        queryFn: async () => {
            if (!selectedLanzamiento) return [];
            
            const launchId = selectedLanzamiento.id;
            
            // Fetch Enrollments
            const enrollments = await db.convocatorias.getAll({
                filterByFormula: `SEARCH('${launchId}', {${FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS}} & '')`
            });
            
            if (enrollments.length === 0) return [];

            const studentIds = enrollments.map(e => {
                const raw = e.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
                return Array.isArray(raw) ? raw[0] : raw;
            }).filter(Boolean) as string[];
            
            // Parallel fetch for details
            const [studentsRes, practicasRes, penaltiesRes] = await Promise.all([
                db.estudiantes.getAll({
                    filterByFormula: `OR(${studentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`
                }),
                db.practicas.getAll({
                    filterByFormula: `OR(${studentIds.map(id => `SEARCH('${id}', {${FIELD_ESTUDIANTE_LINK_PRACTICAS}} & '')`).join(',')})`
                }),
                db.penalizaciones.getAll({
                    filterByFormula: `OR(${studentIds.map(id => `SEARCH('${id}', {${FIELD_PENALIZACION_ESTUDIANTE_LINK}} & '')`).join(',')})`
                })
            ]);

            const studentMap = new Map(studentsRes.map(s => [s.id, s.fields]));
            
            // Aggregate Data
            const enrichedList: EnrichedStudent[] = enrollments.map(enrollment => {
                const sIdRaw = enrollment.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
                const sId = Array.isArray(sIdRaw) ? sIdRaw[0] : sIdRaw;

                const studentDetails = sId ? studentMap.get(String(sId)) : null;
                
                if (!studentDetails) return null;

                // Calc total hours
                const studentPractices = practicasRes.filter(p => {
                     const links = p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                     return Array.isArray(links) ? links.includes(String(sId)) : links === String(sId);
                });
                const totalHoras = studentPractices.reduce((sum, p) => sum + (p.fields[FIELD_HORAS_PRACTICAS] || 0), 0);

                // Calc penalties
                const studentPenalties = penaltiesRes.filter(p => {
                    const links = p.fields[FIELD_PENALIZACION_ESTUDIANTE_LINK];
                    return Array.isArray(links) ? links.includes(String(sId)) : links === String(sId);
                });
                const penalizacionAcumulada = studentPenalties.reduce((sum, p) => sum + (p.fields[FIELD_PENALIZACION_PUNTAJE] || 0), 0);

                // Score
                const puntajeTotal = calculateScore(enrollment, totalHoras, penalizacionAcumulada);

                return {
                    enrollmentId: enrollment.id,
                    studentId: String(sId),
                    nombre: studentDetails[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido',
                    legajo: studentDetails[FIELD_LEGAJO_ESTUDIANTES] || '',
                    correo: studentDetails[FIELD_CORREO_ESTUDIANTES] || '',
                    status: enrollment.fields[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] || 'Inscripto',
                    terminoCursar: enrollment.fields[FIELD_TERMINO_CURSAR_CONVOCATORIAS] === 'Sí',
                    cursandoElectivas: enrollment.fields[FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS] === 'Sí',
                    finalesAdeuda: enrollment.fields[FIELD_FINALES_ADEUDA_CONVOCATORIAS] || '',
                    notasEstudiante: enrollment.fields[FIELD_OTRA_SITUACION_CONVOCATORIAS] || '',
                    horarioSeleccionado: enrollment.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || '',
                    totalHoras,
                    penalizacionAcumulada,
                    puntajeTotal
                };
            }).filter((item): item is EnrichedStudent => item !== null);

            return enrichedList.sort((a, b) => b.puntajeTotal - a.puntajeTotal);
        },
        enabled: !!selectedLanzamiento
    });

    // --- SAVE CONFIGURATION ---
    const handleSaveEmailConfig = () => {
        const sId = serviceId.trim();
        const tId = templateId.trim();
        const pKey = publicKey.trim();

        setServiceId(sId);
        setTemplateId(tId);
        setPublicKey(pKey);

        localStorage.setItem(STORAGE_KEY_SUBJECT, emailSubject);
        localStorage.setItem(STORAGE_KEY_BODY, emailBody);
        localStorage.setItem(STORAGE_KEY_AUTOMATION, String(isEmailAutomationEnabled));
        
        // Save keys
        localStorage.setItem(STORAGE_KEY_SERVICE_ID, sId);
        localStorage.setItem(STORAGE_KEY_TEMPLATE_ID, tId);
        localStorage.setItem(STORAGE_KEY_PUBLIC_KEY, pKey);
        
        setToastInfo({ message: 'Configuración y credenciales guardadas.', type: 'success' });
    };

    // --- AUTOMATIC EMAIL SENDING ---
    const sendAutomaticEmail = async (student: EnrichedStudent) => {
        // Read FRESH from localStorage to ensure we have the latest config
        // even if it was updated in another tab or component
        const isEnabled = localStorage.getItem(STORAGE_KEY_AUTOMATION) === 'true';
        
        if (!isEnabled) {
             return { success: true }; // Not an error, just skipped
        }

        const freshServiceId = localStorage.getItem(STORAGE_KEY_SERVICE_ID);
        const freshTemplateId = localStorage.getItem(STORAGE_KEY_TEMPLATE_ID);
        const freshPublicKey = localStorage.getItem(STORAGE_KEY_PUBLIC_KEY);
        const freshSubject = localStorage.getItem(STORAGE_KEY_SUBJECT) || emailSubject;
        const freshBody = localStorage.getItem(STORAGE_KEY_BODY) || emailBody;

        if (!student.correo) {
            return { success: false, reason: 'no_email' };
        }
        
        if (!freshServiceId || !freshTemplateId || !freshPublicKey) {
             console.warn("EmailJS no configurado correctamente.");
             return { success: false, reason: 'missing_config' };
        }

        try {
            const ppsName = selectedLanzamiento?.[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica Profesional';
            
            // Substitutions
            let finalSubject = freshSubject.replace(/{{ppsName}}/g, ppsName);
            let finalBody = freshBody
                .replace(/{{studentName}}/g, student.nombre)
                .replace(/{{ppsName}}/g, ppsName)
                .replace(/{{schedule}}/g, student.horarioSeleccionado || 'A confirmar');

            const templateParams = {
                to_name: student.nombre,
                to_email: student.correo,
                subject: finalSubject,
                message: finalBody, 
            };

            await emailjs.send(
                freshServiceId.trim(),
                freshTemplateId.trim(),
                templateParams,
                freshPublicKey.trim()
            );
            return { success: true };
        } catch (error: any) {
            console.error("Failed to send automatic email:", error);
            
            let errorText = 'Error desconocido';
            if (typeof error === 'string') errorText = error;
            else if (error.text) errorText = error.text;
            else if (error.message) errorText = error.message;
            else errorText = JSON.stringify(error);

            return { success: false, reason: 'api_error', message: errorText };
        }
    };

    const toggleMutation = useMutation({
        mutationFn: async (student: EnrichedStudent) => {
            if (!selectedLanzamiento) return;
            const isCurrentlySelected = normalizeStringForComparison(student.status) === 'seleccionado';
            
            // 1. Update DB (Supabase)
            const result = await toggleStudentSelection(
                student.enrollmentId, 
                !isCurrentlySelected, 
                student.studentId, 
                selectedLanzamiento
            );

            // 2. If successfully SELECTED (turned ON), try to send email.
            // ALLOWING in TestingMode now for verification.
            let emailResult: { success: boolean; reason?: string; message?: string } = { success: false };
            if (result.success && !isCurrentlySelected) { 
               emailResult = await sendAutomaticEmail(student);
            }

            return { ...result, emailResult, student };
        },
        onMutate: async (student) => {
             // Optimistic Update: Toggle status immediately in UI
             await queryClient.cancelQueries({ queryKey: candidatesQueryKey });
             const previousData = queryClient.getQueryData<EnrichedStudent[]>(candidatesQueryKey);
             
             const isCurrentlySelected = normalizeStringForComparison(student.status) === 'seleccionado';
             const newStatus = isCurrentlySelected ? 'Inscripto' : 'Seleccionado';

             queryClient.setQueryData<EnrichedStudent[]>(candidatesQueryKey, old => 
                 old?.map(s => s.enrollmentId === student.enrollmentId ? { ...s, status: newStatus } : s)
             );
             
             return { previousData };
        },
        onSuccess: (data) => {
             if (data?.success) {
                 // Email logic notifications (without refetching, unless error)
                 if (data.emailResult?.success) {
                     // Silent success for email to avoid spamming toasts on quick clicks
                 } else if (data.emailResult?.reason === 'missing_config') {
                     setToastInfo({ message: 'Estado actualizado. Correo NO enviado: Faltan credenciales en Automatizaciones.', type: 'error' });
                 } else if (data.emailResult?.reason === 'api_error') {
                     setToastInfo({ message: `Estado actualizado. Error enviando correo: ${data.emailResult.message}`, type: 'error' });
                 } else if (data.emailResult?.reason === 'no_email') {
                     setToastInfo({ message: `Estado actualizado. Correo no enviado: Alumno sin email.`, type: 'error' });
                 }
             } else {
                 setToastInfo({ message: `Error en base de datos: ${data?.error}`, type: 'error' });
                 // If DB error, revert via refetch
                 refetchCandidates(); 
             }
        },
        onError: (err, _newTodo, context) => {
             setToastInfo({ message: `Error de conexión: ${err.message}`, type: 'error' });
             if (context?.previousData) {
                 queryClient.setQueryData(candidatesQueryKey, context.previousData);
             }
        },
        onSettled: () => setUpdatingId(null)
    });

    const scheduleMutation = useMutation({
        mutationFn: async ({ id, schedule }: { id: string, schedule: string }) => {
            return db.convocatorias.update(id, { horario: schedule });
        },
        onSuccess: () => {
             setToastInfo({ message: 'Horario actualizado.', type: 'success' });
             refetchCandidates();
        }
    });

    // Mutation to Close Call
    const closeLaunchMutation = useMutation({
        mutationFn: async () => {
            if (!selectedLanzamiento) return;
            return db.lanzamientos.update(selectedLanzamiento.id, {
                estadoConvocatoria: 'Cerrado'
            });
        },
        onSuccess: () => {
            setToastInfo({ message: 'Convocatoria cerrada exitosamente. Los alumnos ya pueden ver los resultados.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['openLaunchesForSelector'] });
            setSelectedLanzamiento(null);
        },
        onError: (err: Error) => {
            setToastInfo({ message: `Error al cerrar: ${err.message}`, type: 'error' });
        }
    });

    const handleToggle = (student: EnrichedStudent) => {
        setUpdatingId(student.enrollmentId);
        toggleMutation.mutate(student);
    };

    const handleUpdateSchedule = (id: string, newSchedule: string) => {
        scheduleMutation.mutate({ id, schedule: newSchedule });
    };

    const handleCloseLaunch = () => {
        if (window.confirm('¿Estás seguro de cerrar esta convocatoria? Esto hará visibles los resultados a los alumnos.')) {
            closeLaunchMutation.mutate();
        }
    };

    if (isLoadingLaunches) return <div className="flex justify-center p-10"><Loader /></div>;

    // View: Launch Candidate List (Drill Down)
    if (selectedLanzamiento) {
        return (
            <div className="animate-fade-in-up space-y-6">
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
                
                {/* Header with Back Button */}
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSelectedLanzamiento(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors text-slate-500 dark:text-slate-400">
                                <span className="material-icons">arrow_back</span>
                            </button>
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Cupos: {selectedLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} | Postulantes: {candidates.length}
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={handleCloseLaunch}
                            disabled={closeLaunchMutation.isPending}
                            className="bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-200 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800 font-bold py-2 px-4 rounded-lg text-sm transition-colors flex items-center gap-2"
                        >
                             {closeLaunchMutation.isPending ? (
                                 <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                             ) : (
                                 <span className="material-icons !text-base">lock</span>
                             )}
                            Cerrar Convocatoria
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2 px-2 border-t border-slate-100 dark:border-slate-700 pt-3">
                         <div className="text-xs px-3 py-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-lg border border-blue-100 dark:border-blue-800 flex items-center gap-2 group relative cursor-help w-fit">
                            <span className="font-bold">Criterio:</span> Puntaje descendente
                            <span className="material-icons !text-sm opacity-70">help</span>
                            
                            <div className="absolute left-0 top-full mt-2 w-64 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                <p className="font-bold mb-1 border-b border-slate-600 pb-1">Fórmula de Puntaje:</p>
                                <ul className="space-y-1 list-disc pl-3">
                                    <li>Terminó de cursar: <strong>+100 pts</strong></li>
                                    <li>Cursando electivas: <strong>+50 pts</strong></li>
                                    <li>Adeuda finales: <strong>+30 pts</strong></li>
                                    <li>Horas acumuladas: <strong>+0.5 pts/hora</strong></li>
                                    <li>Penalizaciones: <strong>- Puntos</strong></li>
                                </ul>
                                <div className="absolute -top-1 left-4 w-2 h-2 bg-slate-800 rotate-45"></div>
                            </div>
                         </div>
                    </div>
                </div>

                {/* Candidates List */}
                {isLoadingCandidates ? (
                    <Loader />
                ) : candidates.length === 0 ? (
                    <EmptyState icon="group_off" title="Sin Postulantes" message="Aún no hay estudiantes inscriptos en esta convocatoria." />
                ) : (
                    <div className="space-y-3">
                        {candidates.map(student => (
                            <StudentRow
                                key={student.enrollmentId}
                                student={student}
                                onToggleSelection={handleToggle}
                                onUpdateSchedule={handleUpdateSchedule}
                                isUpdating={updatingId === student.enrollmentId}
                            />
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // View: Global Tabs (Selection & Config)
    return (
        <div className="animate-fade-in-up">
             {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
             <div className="mb-6">
                <SubTabs 
                    tabs={[
                        { id: 'selection', label: 'Seleccionar Convocatoria', icon: 'list_alt' },
                        { id: 'email_config', label: 'Configuración Global de Correo', icon: 'mail_outline' }
                    ]}
                    activeTabId={activeGlobalTab}
                    onTabChange={setActiveGlobalTab}
                />
            </div>

            {activeGlobalTab === 'selection' && (
                <>
                     <div className="mb-6 px-1">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Convocatorias Abiertas</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">Selecciona una para gestionar a los postulantes.</p>
                     </div>
                    
                    {openLaunches.length === 0 ? (
                        <EmptyState icon="event_busy" title="Sin Convocatorias Abiertas" message="No hay lanzamientos activos en este momento." />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {openLaunches.map(lanz => {
                                const visuals = getEspecialidadClasses(lanz[FIELD_ORIENTACION_LANZAMIENTOS]);
                                return (
                                    <button 
                                        key={lanz.id} 
                                        onClick={() => setSelectedLanzamiento(lanz)}
                                        className="text-left p-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={visuals.tag}>{lanz[FIELD_ORIENTACION_LANZAMIENTOS]}</span>
                                            <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full">
                                                {lanz[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} Cupos
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                            {lanz[FIELD_NOMBRE_PPS_LANZAMIENTOS]}
                                        </h4>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                                            <span className="material-icons !text-base">calendar_today</span>
                                            Inicio: {formatDate(lanz[FIELD_FECHA_INICIO_LANZAMIENTOS])}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {activeGlobalTab === 'email_config' && (
                 <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                     <div className="flex items-center gap-3 mb-6">
                         <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
                            <span className="material-icons !text-2xl">settings_suggest</span>
                         </div>
                         <div>
                             <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Automatización de Correos</h3>
                             <p className="text-sm text-slate-600 dark:text-slate-400">Configura las credenciales de EmailJS para habilitar el envío automático.</p>
                         </div>
                     </div>
                    
                     <div className="space-y-6">
                         
                         {isConfigMissing && (
                             <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-sm flex items-start gap-3">
                                 <span className="material-icons !text-lg mt-0.5">warning_amber</span>
                                 <div>
                                     <span className="font-bold">Configuración Incompleta:</span> Debes ingresar tus credenciales de EmailJS para que el sistema pueda enviar correos. Crea una cuenta gratuita en <a href="https://www.emailjs.com/" target="_blank" rel="noreferrer" className="underline hover:text-amber-900 dark:hover:text-amber-100">emailjs.com</a>.
                                 </div>
                             </div>
                         )}

                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" checked={isEmailAutomationEnabled} onChange={(e) => setIsEmailAutomationEnabled(e.target.checked)} className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </div>
                                <span className="font-medium text-slate-800 dark:text-slate-200">Activar envío automático al seleccionar</span>
                            </label>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 ml-14">
                                Cuando actives a un alumno, el sistema intentará enviarle este correo inmediatamente.
                            </p>
                        </div>

                         {/* Sección de Credenciales EmailJS */}
                         <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Credenciales de EmailJS</h4>
                            
                            <div>
                                <label htmlFor="serviceId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Service ID</label>
                                <Input id="serviceId" value={serviceId} onChange={e => setServiceId(e.target.value)} placeholder="ej. service_xxxxx" className="text-sm" />
                            </div>
                            <div>
                                <label htmlFor="templateId" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Template ID</label>
                                <Input id="templateId" value={templateId} onChange={e => setTemplateId(e.target.value)} placeholder="ej. template_xxxxx" className="text-sm" />
                            </div>
                             <div>
                                <label htmlFor="publicKey" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Public Key</label>
                                <Input id="publicKey" value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder="ej. user_xxxxx" className="text-sm" type="password" />
                            </div>
                         </div>

                        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">Plantilla del Mensaje</h4>
                            <div>
                                <label htmlFor="emailSubject" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Asunto del Correo</label>
                                <Input id="emailSubject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Asunto..." className="text-sm" />
                                <p className="text-xs text-slate-500 mt-1">Variables disponibles: <code>{'{{ppsName}}'}</code></p>
                            </div>
                            
                            <div>
                                <label htmlFor="emailBody" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cuerpo del Mensaje</label>
                                <textarea 
                                    id="emailBody"
                                    rows={10}
                                    value={emailBody} 
                                    onChange={(e) => setEmailBody(e.target.value)} 
                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono"
                                />
                                <p className="text-xs text-slate-500 mt-1">Variables disponibles: <code>{'{{studentName}}'}</code>, <code>{'{{ppsName}}'}</code>, <code>{'{{schedule}}'}</code></p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button 
                                onClick={handleSaveEmailConfig}
                                className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-all flex items-center gap-2 active:scale-95"
                            >
                                <span className="material-icons !text-base">save</span>
                                Guardar Configuración
                            </button>
                        </div>
                     </div>
                 </div>
            )}
        </div>
    );
};

export default SeleccionadorConvocatorias;
