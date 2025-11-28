import React, { useState, useEffect } from 'react';
import Card from './Card';
import Input from './Input';
import Toast from './Toast';
import Button from './Button';
import emailjs from '@emailjs/browser';
import {
    KEY_SELECTION_SUBJECT, KEY_SELECTION_BODY, KEY_SELECTION_ACTIVE,
    KEY_REQUEST_SUBJECT, KEY_REQUEST_BODY, KEY_REQUEST_ACTIVE,
    KEY_SAC_SUBJECT, KEY_SAC_BODY, KEY_SAC_ACTIVE,
    KEY_SERVICE_ID, KEY_TEMPLATE_ID, KEY_PUBLIC_KEY,
    KEY_EMAIL_COUNT, KEY_EMAIL_MONTH, MONTHLY_LIMIT
} from '../constants';

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
        defaultSubject: "Selección PPS: {{nombre_pps}} - UFLO",
        defaultBody: `¡Buenas noticias, {{nombre_alumno}}!

Has sido seleccionado/a para realizar la Práctica Profesional Supervisada en:
"{{nombre_pps}}"

Horario asignado: {{horario}}

Por favor, mantente atento a las instrucciones para el inicio.`
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
    
    // Credenciales Globales
    const [serviceId, setServiceId] = useState('');
    const [templateId, setTemplateId] = useState('');
    const [publicKey, setPublicKey] = useState('');
    const [isConfigExpanded, setIsConfigExpanded] = useState(true); 

    // Testing state
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);

    // Contador de Emails
    const [emailCount, setEmailCount] = useState(0);
    const [isEditingCount, setIsEditingCount] = useState(false);

    // Estado de edición de escenarios
    const [editingScenarioId, setEditingScenarioId] = useState<string | null>(null);
    const [currentSubject, setCurrentSubject] = useState('');
    const [currentBody, setCurrentBody] = useState('');
    const [activeStates, setActiveStates] = useState<Record<string, boolean>>({});

    useEffect(() => {
        // Cargar credenciales
        const sId = localStorage.getItem(KEY_SERVICE_ID) || '';
        const tId = localStorage.getItem(KEY_TEMPLATE_ID) || '';
        const pKey = localStorage.getItem(KEY_PUBLIC_KEY) || '';

        setServiceId(sId);
        setTemplateId(tId);
        setPublicKey(pKey);

        // Si ya hay credenciales, colapsar el panel por defecto
        if (sId && tId && pKey) {
            setIsConfigExpanded(false);
        }

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
            // Nuevo mes, reiniciar contador
            localStorage.setItem(KEY_EMAIL_MONTH, currentMonthKey);
            localStorage.setItem(KEY_EMAIL_COUNT, '0');
            setEmailCount(0);
        } else {
            setEmailCount(storedCount);
        }
    }, []);

    const incrementEmailCount = () => {
        const newCount = emailCount + 1;
        setEmailCount(newCount);
        localStorage.setItem(KEY_EMAIL_COUNT, String(newCount));
    };

    const handleManualCountUpdate = (newVal: string) => {
        const val = parseInt(newVal, 10);
        if (!isNaN(val) && val >= 0) {
            setEmailCount(val);
            localStorage.setItem(KEY_EMAIL_COUNT, String(val));
        }
    };

    const handleSaveCredentials = () => {
        if (!serviceId || !templateId || !publicKey) {
            setToastInfo({ message: 'Por favor completa todos los campos.', type: 'error' });
            return;
        }
        localStorage.setItem(KEY_SERVICE_ID, serviceId.trim());
        localStorage.setItem(KEY_TEMPLATE_ID, templateId.trim());
        localStorage.setItem(KEY_PUBLIC_KEY, publicKey.trim());
        
        setToastInfo({ message: 'Credenciales guardadas correctamente.', type: 'success' });
        setIsConfigExpanded(false);
    };

    const handleSendTest = async () => {
        if (!testEmail) {
            setToastInfo({ message: 'Ingresa un correo para la prueba.', type: 'error' });
            return;
        }
        if (!serviceId || !templateId || !publicKey) {
            setToastInfo({ message: 'Guarda las credenciales primero.', type: 'error' });
            return;
        }

        setIsSendingTest(true);
        try {
            // Usamos la plantilla de "Selección" como ejemplo para la prueba
            const templateParams = {
                to_email: testEmail,
                to_name: "Usuario de Prueba",
                from_name: "Departamento PPS - UFLO",
                reply_to: "blas.rivera@uflouniversidad.edu.ar",
                subject: "Prueba de Conexión EmailJS - Mi Panel",
                message: "Este es un correo de prueba para verificar que la integración funciona correctamente. \n\nSi lees esto, ¡la configuración es exitosa!",
            };

            await emailjs.send(serviceId, templateId, templateParams, publicKey);
            incrementEmailCount();
            setToastInfo({ message: 'Correo de prueba enviado con éxito. Revisa tu bandeja (y Spam).', type: 'success' });
        } catch (error: any) {
            console.error("Error sending test:", error);
            let errorMsg = "Error desconocido";
            if (error.text) errorMsg = error.text;
            else if (error.message) errorMsg = error.message;
            else if (typeof error === 'object') errorMsg = JSON.stringify(error);
            
            setToastInfo({ message: `Fallo el envío: ${errorMsg}`, type: 'error' });
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

    const percentUsed = Math.min((emailCount / MONTHLY_LIMIT) * 100, 100);
    let progressColor = 'bg-blue-600';
    if (percentUsed > 75) progressColor = 'bg-amber-500';
    if (percentUsed > 90) progressColor = 'bg-red-600';

    return (
        <div className="space-y-8 animate-fade-in-up pb-10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {/* CREDENCIALES GLOBALES */}
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden transition-all">
                {/* Header / Resumen Collapsed */}
                <div className={`p-6 flex flex-col sm:flex-row justify-between items-center gap-4 ${!isConfigExpanded ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50' : ''}`} onClick={() => !isConfigExpanded && setIsConfigExpanded(true)}>
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${!serviceId ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                            <span className="material-icons !text-2xl">settings_suggest</span>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Configuración Global EmailJS</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {!isConfigExpanded && serviceId 
                                    ? <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"><span className="material-icons !text-sm">check_circle</span> Credenciales configuradas</span> 
                                    : "Define las credenciales para el envío automático."}
                            </p>
                        </div>
                    </div>
                    {!isConfigExpanded && (
                         <Button variant="secondary" size="sm" onClick={(e) => { e.stopPropagation(); setIsConfigExpanded(true); }} icon="edit">
                             Editar Credenciales
                         </Button>
                    )}
                </div>

                {/* Formulario Expandible */}
                {isConfigExpanded && (
                    <div className="px-6 pb-6 animate-fade-in">
                        <div className="mt-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Service ID</label>
                                    <Input value={serviceId} onChange={e => setServiceId(e.target.value)} placeholder="service_xxx" className="text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Template ID (Genérico)</label>
                                    <Input value={templateId} onChange={e => setTemplateId(e.target.value)} placeholder="template_xxx" className="text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Public Key</label>
                                    <Input value={publicKey} onChange={e => setPublicKey(e.target.value)} placeholder="user_xxx" type="password" className="text-sm" />
                                </div>
                            </div>
                            
                            {/* Test Area */}
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-end gap-3">
                                <div className="flex-grow w-full">
                                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Probar Configuración (Enviar correo de prueba)</label>
                                     <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="tu_correo@ejemplo.com" className="text-sm" />
                                </div>
                                <Button onClick={handleSendTest} disabled={isSendingTest} size="md" icon="send" variant="secondary">
                                    {isSendingTest ? 'Enviando...' : 'Probar'}
                                </Button>
                            </div>

                            <div className="mt-6 flex justify-end gap-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                                {serviceId && (
                                    <Button variant="secondary" size="sm" onClick={() => setIsConfigExpanded(false)}>Cancelar</Button>
                                )}
                                <Button onClick={handleSaveCredentials} size="sm" icon="save">Guardar y Ocultar</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ESTADO DE CUOTA */}
            <Card title="Estado de Cuota Mensual" icon="analytics" className="border-blue-200 dark:border-blue-800/50 bg-gradient-to-br from-white to-blue-50/30 dark:from-slate-800 dark:to-slate-800">
                <div className="flex flex-col sm:flex-row items-center gap-6 mt-2">
                    {/* Progress Circle / Number */}
                    <div className="flex-shrink-0 text-center">
                         <div className="text-4xl font-black text-slate-800 dark:text-slate-100">
                            {isEditingCount ? (
                                <input 
                                    type="number" 
                                    value={emailCount} 
                                    onChange={e => handleManualCountUpdate(e.target.value)}
                                    onBlur={() => setIsEditingCount(false)}
                                    className="w-24 text-center bg-white border border-slate-300 rounded p-1 text-3xl"
                                    autoFocus
                                />
                            ) : (
                                <span className="cursor-pointer border-b border-dashed border-slate-400" title="Click para corregir manualmente" onClick={() => setIsEditingCount(true)}>
                                    {emailCount}
                                </span>
                            )}
                             <span className="text-xl text-slate-400 font-medium"> / {MONTHLY_LIMIT}</span>
                         </div>
                         <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Enviados este mes</p>
                    </div>

                    {/* Bar */}
                    <div className="flex-grow w-full">
                        <div className="w-full h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
                            <div 
                                className={`h-full transition-all duration-1000 ease-out ${progressColor}`} 
                                style={{ width: `${percentUsed}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <span>0%</span>
                            <span>{Math.round(percentUsed)}% Utilizado</span>
                            <span>100%</span>
                        </div>
                    </div>

                    {/* Remaining */}
                     <div className="flex-shrink-0 text-right hidden sm:block">
                         <p className={`text-2xl font-bold ${MONTHLY_LIMIT - emailCount < 20 ? 'text-red-600' : 'text-emerald-600'}`}>
                             {Math.max(0, MONTHLY_LIMIT - emailCount)}
                         </p>
                         <p className="text-xs text-slate-500">Restantes</p>
                    </div>
                </div>
                <p className="text-xs text-slate-400 mt-4 italic text-center sm:text-left">
                    * Este contador es una estimación local basada en los envíos realizados desde este navegador.
                </p>
            </Card>

            {/* ESCENARIOS */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Escenarios de Envío Automático</h3>
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
                                                     <label className="block text-xs font-bold text-slate-500 uppercase">Cuerpo del Mensaje</label>
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
                                                <textarea 
                                                    id="body-editor"
                                                    value={currentBody}
                                                    onChange={e => setCurrentBody(e.target.value)}
                                                    rows={8}
                                                    className="w-full rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
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