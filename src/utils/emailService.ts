import emailjs from '@emailjs/browser';
import {
    KEY_SELECTION_SUBJECT, KEY_SELECTION_BODY, KEY_SELECTION_ACTIVE,
    KEY_REQUEST_SUBJECT, KEY_REQUEST_BODY, KEY_REQUEST_ACTIVE,
    KEY_SAC_SUBJECT, KEY_SAC_BODY, KEY_SAC_ACTIVE,
    KEY_SERVICE_ID, KEY_TEMPLATE_ID, KEY_PUBLIC_KEY,
    KEY_EMAIL_COUNT, KEY_EMAIL_MONTH
} from '../constants';

type EmailScenario = 'seleccion' | 'solicitud' | 'sac';

interface ScenarioKeys {
    subject: string;
    body: string;
    active: string;
}

const SCENARIO_CONFIG: Record<EmailScenario, ScenarioKeys> = {
    'seleccion': {
        subject: KEY_SELECTION_SUBJECT,
        body: KEY_SELECTION_BODY,
        active: KEY_SELECTION_ACTIVE
    },
    'solicitud': {
        subject: KEY_REQUEST_SUBJECT,
        body: KEY_REQUEST_BODY,
        active: KEY_REQUEST_ACTIVE
    },
    'sac': {
        subject: KEY_SAC_SUBJECT,
        body: KEY_SAC_BODY,
        active: KEY_SAC_ACTIVE
    }
};

interface EmailData {
    studentName: string;
    studentEmail: string;
    ppsName?: string;
    schedule?: string; // For selection
    institution?: string; // For requests
    newState?: string; // For requests
    notes?: string; // For requests
}

/**
 * Incrementa el contador de correos enviados en el mes actual.
 * Se llama automáticamente al enviar un correo con éxito.
 */
const incrementCounter = () => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    
    const storedMonthKey = localStorage.getItem(KEY_EMAIL_MONTH);
    let currentCount = 0;

    if (storedMonthKey === currentMonthKey) {
        currentCount = parseInt(localStorage.getItem(KEY_EMAIL_COUNT) || '0', 10);
    } else {
        // New month, reset count
        localStorage.setItem(KEY_EMAIL_MONTH, currentMonthKey);
    }

    localStorage.setItem(KEY_EMAIL_COUNT, String(currentCount + 1));
};

/**
 * Envía un correo inteligente basado en el escenario.
 * Verifica credenciales, estado de activación y realiza sustitución de variables.
 */
export const sendSmartEmail = async (scenario: EmailScenario, data: EmailData): Promise<{ success: boolean; message?: string }> => {
    // 1. Check if scenario is active
    const configKeys = SCENARIO_CONFIG[scenario];
    const isActive = localStorage.getItem(configKeys.active) === 'true';
    
    if (!isActive) {
        return { success: true, message: 'Automación desactivada' }; // Not an error, just skipped
    }

    // 2. Check credentials
    const serviceId = localStorage.getItem(KEY_SERVICE_ID);
    const templateId = localStorage.getItem(KEY_TEMPLATE_ID);
    const publicKey = localStorage.getItem(KEY_PUBLIC_KEY);

    if (!serviceId || !templateId || !publicKey) {
        console.warn(`[EmailService] Credenciales faltantes. No se envió el correo de ${scenario}.`);
        return { success: false, message: 'Credenciales EmailJS faltantes' };
    }

    if (!data.studentEmail) {
        return { success: false, message: 'El alumno no tiene email registrado.' };
    }

    // 3. Get Template Content
    // Defaults should ideally be in constants or handled if localstorage is empty, 
    // but for now we assume setup was done via the manager tool.
    const storedSubject = localStorage.getItem(configKeys.subject) || 'Actualización PPS UFLO';
    const storedBody = localStorage.getItem(configKeys.body) || 'Tienes una actualización sobre tu PPS.';

    // 4. Replace Variables
    let finalSubject = storedSubject;
    let finalBody = storedBody;
    
    // Common replacements
    finalSubject = finalSubject.replace(/{{nombre_pps}}/g, data.ppsName || '');
    finalSubject = finalSubject.replace(/{{institucion}}/g, data.institution || '');
    
    finalBody = finalBody
        .replace(/{{nombre_alumno}}/g, data.studentName)
        .replace(/{{nombre_pps}}/g, data.ppsName || '')
        .replace(/{{horario}}/g, data.schedule || '')
        .replace(/{{institucion}}/g, data.institution || '')
        .replace(/{{estado_nuevo}}/g, data.newState || '')
        .replace(/{{notas}}/g, data.notes || '');

    // 5. Send
    const templateParams = {
        to_name: data.studentName,
        to_email: data.studentEmail,
        from_name: "Departamento PPS - UFLO",
        reply_to: "blas.rivera@uflouniversidad.edu.ar",
        subject: finalSubject,
        message: finalBody, 
    };

    try {
        await emailjs.send(serviceId, templateId, templateParams, publicKey);
        incrementCounter();
        return { success: true };
    } catch (error: any) {
        console.error(`[EmailService] Error enviando correo (${scenario}):`, error);
        return { success: false, message: error.text || error.message || 'Error de envío' };
    }
};
