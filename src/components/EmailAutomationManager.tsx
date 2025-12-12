import React, { useState, useEffect } from 'react';
import Card from './Card';
import Input from './Input';
import Toast from './Toast';
import Button from './Button';
import { supabase } from '../lib/supabaseClient';
import {
    KEY_SELECTION_SUBJECT, KEY_SELECTION_BODY, KEY_SELECTION_ACTIVE,
    KEY_REQUEST_SUBJECT, KEY_REQUEST_BODY, KEY_REQUEST_ACTIVE,
    KEY_SAC_SUBJECT, KEY_SAC_BODY, KEY_SAC_ACTIVE,
    KEY_EMAIL_COUNT, KEY_EMAIL_MONTH
} from '../constants';
import { generateHtmlTemplate, stripGreeting } from '../utils/emailService';

interface AutomationScenario {
    id: string;
    label: string;
    description: string;
    icon: string;
    variables: string[];
    storageKeys: {
        subject: string;
        body: string;
        active: string;
    };
    defaultSubject: string;
    defaultBody: string;
}

const SCENARIOS: AutomationScenario[] = [
    {
        id: 'seleccion',
        label: 'Alumno Seleccionado',
        description: 'Se envía cuando marcas a un estudiante como "Seleccionado" en una convocatoria.',
        icon: 'how_to_reg',
        variables: ['{{nombre_alumno}}', '{{nombre_pps}}', '{{horario}}'],
        storageKeys: {
            subject: KEY_SELECTION_SUBJECT,
            body: KEY_SELECTION_BODY,
            active: KEY_SELECTION_ACTIVE
        },
        defaultSubject: "Confirmación de Asignación PPS: {{nombre_pps}} 🎓",
        defaultBody: `Hola {{nombre_alumno}},

Espero que estés muy bien.

Nos complace informarte que has sido seleccionado/a para realizar tu Práctica Profesional Supervisada en:

Institución: {{nombre_pps}}
Horario/Comisión asignada: {{horario}}

💡 Recomendaciones para tu Práctica

**Puntualidad y Asistencia:** La puntualidad es la primera señal de compromiso profesional. Si surge un imprevisto de fuerza mayor, avisá con la mayor antelación posible tanto a la institución como a la Universidad. Recordá que faltar sin previo aviso es motivo suficiente de suspensión de la PPS.

**Ética y Confidencialidad:** Vas a trabajar con personas y, en muchos casos, con información sensible. El secreto profesional y el respeto por la privacidad son fundamentales desde el primer momento.

**Rol Activo:** No te quedes solo con "observar". Preguntá, mostrá interés, llevá cuaderno para anotar y participá de los espacios de supervisión. La PPS te devuelve lo que vos le pongas de energía.

**Documentación Final:** No te olvides de terminar la PPS con tu planilla de asistencia firmada y conservarla (exceptuando las Online que no se firma). Recordá que tenés 30 días para la entrega del informe final una vez finalizada la PPS.

Por favor, respondenos a este correo confirmando que recibiste la información y que aceptás la vacante asignada.

¡Te deseamos un excelente comienzo!

Saludos,

Blas
Coordinador de Prácticas Profesionales Supervisadas
Licenciatura en Psicología
UFLO`
    },
    {
        id: 'solicitud',
        label: 'Avance de Solicitud (Autogestión)',
        description: 'Se envía cuando actualizas el estado de una solicitud de PPS (ej: a "En conversaciones").',
        icon: 'assignment_turned_in',
        variables: ['{{nombre_alumno}}', '{{estado_nuevo}}', '{{institucion}}', '{{notas}}'],
        storageKeys: {
            subject: KEY_REQUEST_SUBJECT,
            body: KEY_REQUEST_BODY,
            active: KEY_REQUEST_ACTIVE
        },
        defaultSubject: "Actualización de tu Solicitud de PPS - UFLO",
        defaultBody: `Hola {{nombre_alumno}},

Hay novedades sobre tu solicitud de PPS en "{{institucion}}".

Nuevo Estado: {{estado_nuevo}}

Comentarios:
{{notas}}

Seguimos gestionando tu solicitud.`
    },
    {
        id: 'sac',
        label: 'Carga en SAC / Finalización',
        description: 'Se envía cuando se confirma la carga de horas en el sistema académico.',
        icon: 'school',
        variables: ['{{nombre_alumno}}', '{{nombre_pps}}'],
        storageKeys: {
            subject: KEY_SAC_SUBJECT,
            body: KEY_SAC_BODY,
            active: KEY_SAC_ACTIVE
        },
        defaultSubject: "PPS Acreditada en SAC - UFLO",
        defaultBody: `Hola {{nombre_alumno}},

Te informamos que tus horas de la PPS "{{nombre_pps}}" ya han sido cargadas y acreditadas en el sistema académico (SAC).

¡Felicitaciones por completar esta etapa!`
    }
];

const EmailAutomationManager: React.FC = () => {
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    
    // Testing state
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Contador de Emails
    const [emailCount, setEmailCount] = useState(0);

    // Estado de edición de escenarios
    const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
    const [currentSubject, setCurrentSubject] = useState('');
    const [currentBody, setCurrentBody] = useState('');
    const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Cargar estados activos
        const states: Record<string, boolean> = {};
        SCENARIOS.forEach(s => {
            const stored = localStorage.getItem(s.storageKeys.active);
            states[s.id] = stored !== null ? stored === 'true' : false;
        });
        setActiveStates(states);

        // Inicializar contador mensual
        const now = new Date();
        const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`; 
        const storedMonthKey = localStorage.getItem(KEY_EMAIL_MONTH);
        const storedCount = parseInt(localStorage.getItem(KEY_EMAIL_COUNT) || '0', 10);

        if (storedMonthKey !== currentMonthKey) {
            localStorage.setItem(KEY_EMAIL_MONTH, currentMonthKey);
            localStorage.setItem(KEY_EMAIL_COUNT, '0');
            setEmailCount(0);
        } else {
            setEmailCount(storedCount);
        }
    }, []);

    const handleSendTest = async () => {
        if (!testEmail) {
            setToastInfo({ message: 'Ingresa un correo para la prueba.', type: 'error' });
            return;
        }

        setIsSendingTest(true);
        try {
            // Obtenemos la plantilla ACTUAL
            const selectionScenario = SCENARIOS[0]; 
            const savedBody = localStorage.getItem(selectionScenario.storageKeys.body) || selectionScenario.defaultBody;
            const savedSubject = localStorage.getItem(selectionScenario.storageKeys.subject) || selectionScenario.defaultSubject;
            
            const studentName = 'Estudiante de Prueba';

            const rawTextBody = savedBody
                .replace('{{nombre_alumno}}', studentName)
                .replace('{{nombre_pps}}', 'Clínica Demo UFLO')
                .replace('{{horario}}', 'Lunes 14hs');

            const subject = savedSubject
                .replace('{{nombre_pps}}', 'Clínica Demo');

            // 1. Generar HTML Premium
            // Construir el título interno (H1) como un saludo personal, igual que en producción
            const firstName = studentName.split(' ')[0];
            const htmlTitle = `Hola, ${firstName}`;
            const htmlBody = generateHtmlTemplate(rawTextBody, htmlTitle);
            
            // 2. Generar texto plano limpio (sin saludo, para que no se duplique si el backend lo agrega)
            const cleanTextBody = stripGreeting(rawTextBody);

            console.log(">>> GENERATING TEST EMAIL <<<");
            console.log("HTML Length:", htmlBody.length);
            console.log("Subject:", subject);

            const { error } = await supabase.functions.invoke('send-email', {
                body: {
                    to: testEmail,
                    subject: `[PRUEBA] ${subject}`,
                    text: cleanTextBody, 
                    html: htmlBody, // IMPORTANTE: El frontend envía esto. El backend debe usarlo.
                    name: studentName
                }
            });

            if (error) {
                console.error("Supabase Invoke Error:", error);
                throw error;
            }

            setToastInfo({ message: 'Correo de prueba enviado con formato Premium.', type: 'success' });
        } catch (error: any) {
            console.error("Error sending test:", error);
            setToastInfo({ message: `Fallo el envío: ${error.message || 'Error desconocido'}`, type: 'error' });
        } finally {
            setIsSendingTest(false);
        }
    };

    const handleEditClick = (scenario: AutomationScenario) => {
        setEditingScenarioId(scenario.id);
        setCurrentSubject(localStorage.getItem(scenario.storageKeys.subject) || scenario.defaultSubject);
        setCurrentBody(localStorage.getItem(scenario.storageKeys.body) || scenario.defaultBody);
    };

    const handleSaveScenario = (scenario: AutomationScenario) => {
        localStorage.setItem(scenario.storageKeys.subject, currentSubject);
        localStorage.setItem(scenario.storageKeys.body, currentBody);
        setToastInfo({ message: `Plantilla para "${scenario.label}" guardada.`, type: 'success' });
        setEditingScenarioId(null);
    };

    const toggleActive = (scenario: AutomationScenario) => {
        const newState = !activeStates[scenario.id];
        setActiveStates(prev => ({ ...prev, [scenario.id]: newState }));
        localStorage.setItem(scenario.storageKeys.active, String(newState));
    };

    const insertVariable = (variable: string) => {
        const textarea = document.getElementById('body-editor') as HTMLTextAreaElement;
        if (textarea) {
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const text = currentBody;
            const newText = text.substring(0, start) + variable + text.substring(end);
            setCurrentBody(newText);
            setTimeout(() => {
                textarea.focus();
                textarea.selectionStart = textarea.selectionEnd = start + variable.length;
            }, 0);
        } else {
             setCurrentBody(prev => prev + variable);
        }
    };

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {/* PANEL DE CONTROL INTERNO */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400">
                        <span className="material-icons !text-2xl">mark_email_read</span>
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Servidor de Correo Activo</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            El sistema está configurado para enviar correos con diseño <strong>Premium</strong> (Tarjeta Digital).
                        </p>
                    </div>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700">
                    <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Diagnóstico de Conexión</h4>
                    <div className="flex flex-col sm:flex-row items-end gap-3">
                        <div className="flex-grow w-full">
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Enviar correo de prueba a:</label>
                                <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="cualquier_correo@ejemplo.com" className="text-sm" />
                        </div>
                        <Button onClick={handleSendTest} disabled={isSendingTest} size="md" icon="send" variant="secondary">
                            {isSendingTest ? 'Enviando...' : 'Probar Diseño'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* ESCENARIOS */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Plantillas de Notificación</h3>
                <div className="grid grid-cols-1 gap-6">
                    {SCENARIOS.map(scenario => {
                        const isEditing = editingScenarioId === scenario.id;
                        const isActive = activeStates[scenario.id];

                        return (
                            <div key={scenario.id} className={`bg-white dark:bg-slate-800 rounded-xl border shadow-sm transition-all ${isActive ? 'border-blue-200 dark:border-blue-800' : 'border-slate-200 dark:border-slate-700 opacity-90'}`}>
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-full ${isActive ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                            <span className="material-icons !text-2xl">{scenario.icon}</span>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{scenario.label}</h3>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">{scenario.description}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-4 self-end sm:self-center">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-bold ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                                {isActive ? 'ACTIVADO' : 'DESACTIVADO'}
                                            </span>
                                            <button 
                                                onClick={() => toggleActive(scenario)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isActive ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => isEditing ? setEditingScenarioId(null) : handleEditClick(scenario)}
                                            className={`p-2 rounded-lg border transition-colors ${isEditing ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-slate-200 hover:bg-slate-50 text-slate-600 dark:border-slate-700 dark:hover:bg-slate-700 dark:text-slate-300'}`}
                                        >
                                            <span className="material-icons !text-xl">{isEditing ? 'expand_less' : 'edit'}</span>
                                        </button>
                                    </div>
                                </div>

                                {/* EDITOR AREA */}
                                {isEditing && (
                                    <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50/50 dark:bg-slate-900/30 animate-fade-in">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-1.5">Asunto del Correo</label>
                                                <Input value={currentSubject} onChange={e => setCurrentSubject(e.target.value)} placeholder="Asunto..." />
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-1.5">
                                                     <label className="block text-xs font-bold text-slate-500 uppercase">Cuerpo del Mensaje (Soporta **negrita** para títulos)</label>
                                                     <div className="flex gap-1">
                                                         {scenario.variables.map(v => (
                                                             <button 
                                                                key={v} 
                                                                onClick={() => insertVariable(v)}
                                                                className="text-[10px] bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:hover:bg-blue-900/50 dark:hover:text-blue-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
                                                                title="Insertar variable"
                                                             >
                                                                 {v}
                                                             </button>
                                                         ))}
                                                     </div>
                                                </div>
                                                <div className="text-xs text-slate-400 mb-2 px-2 border-l-2 border-blue-200">
                                                    Tip: Usa <strong>**Título:**</strong> para crear cajas de alerta visuales con íconos.
                                                    <br/>
                                                    Nota: No incluyas el saludo inicial ("Hola..."), el sistema lo agrega automáticamente.
                                                </div>
                                                <textarea 
                                                    id="body-editor"
                                                    value={currentBody}
                                                    onChange={e => setCurrentBody(e.target.value)}
                                                    rows={16} 
                                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono leading-relaxed"
                                                />
                                            </div>
                                            <div className="flex justify-end gap-2">
                                                <Button variant="secondary" size="sm" onClick={() => setEditingScenarioId(null)}>Cancelar</Button>
                                                <Button variant="primary" size="sm" onClick={() => handleSaveScenario(scenario)} icon="save">Guardar Plantilla</Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default EmailAutomationManager;