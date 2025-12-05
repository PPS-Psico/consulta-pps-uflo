
import { supabase } from '../lib/supabaseClient';
import {
    KEY_SELECTION_SUBJECT, KEY_SELECTION_BODY, KEY_SELECTION_ACTIVE,
    KEY_REQUEST_SUBJECT, KEY_REQUEST_BODY, KEY_REQUEST_ACTIVE,
    KEY_SAC_SUBJECT, KEY_SAC_BODY, KEY_SAC_ACTIVE,
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

const DEFAULT_TEMPLATES: Record<EmailScenario, { subject: string; body: string }> = {
    'seleccion': {
        subject: "Confirmación de Asignación PPS: {{nombre_pps}} 🎓",
        body: `Hola {{nombre_alumno}},

Espero que estés muy bien.

Nos complace informarte que has sido seleccionado/a para realizar tu Práctica Profesional Supervisada en:

📍 Institución: {{nombre_pps}}
🗓️ Horario/Comisión asignada: {{horario}}

💡 Recomendaciones para tu Práctica

**Puntualidad y Asistencia:** La puntualidad es la primera señal de compromiso profesional. Si surge un imprevisto de fuerza mayor, avisá con la mayor antelación posible tanto a la institución como a la Universidad. Recordá que faltar sin previo aviso es motivo suficiente de suspensión de la PPS.

**Ética y Confidencialidad:** Vas a trabajar con personas y, en muchos casos, con información sensible. El secreto profesional y el respeto por la privacidad son fundamentales desde el primer momento.

**Rol Activo:** No te quedes solo con "observar". Preguntá, mostrá interés, llevá cuaderno para anotar y participá de los espacios de supervisión. La PPS te devuelve lo que vos le pongas de energía.

**Disfrutalo:** No olvides que es tu primer acercamiento real al rol profesional. Aprovechá cada instancia para aprender, incluso de las dificultades.

**Documentación Final:** No te olvides de terminar la PPS con tu planilla de asistencia firmada y conservarla (exceptuando las Online que no se firma). Recordá que tenés 30 días para la entrega del informe final una vez finalizada la PPS.

Por favor, respondenos a este correo confirmando que recibiste la información y que aceptás la vacante asignada.

¡Te deseamos un excelente comienzo!

Saludos,

Blas
Coordinador de Prácticas Profesionales Supervisadas
Licenciatura en Psicología
UFLO`
    },
    'solicitud': {
        subject: "Actualización de tu Solicitud de PPS - UFLO",
        body: `Hola {{nombre_alumno}},

Hay novedades sobre tu solicitud de PPS en "{{institucion}}".

Nuevo Estado: {{estado_nuevo}}

Comentarios:
{{notas}}

Seguimos gestionando tu solicitud.`
    },
    'sac': {
        subject: "PPS Acreditada en SAC - UFLO",
        body: `Hola {{nombre_alumno}},

Te informamos que tus horas de la PPS "{{nombre_pps}}" ya han sido cargadas y acreditadas en el sistema académico (SAC).

¡Felicitaciones por completar esta etapa!`
    }
};

interface EmailData {
    studentName: string;
    studentEmail: string;
    ppsName?: string;
    schedule?: string;
    institution?: string;
    newState?: string;
    notes?: string;
}

const incrementCounter = () => {
    const now = new Date();
    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;
    
    const storedMonthKey = localStorage.getItem(KEY_EMAIL_MONTH);
    let currentCount = 0;

    if (storedMonthKey === currentMonthKey) {
        currentCount = parseInt(localStorage.getItem(KEY_EMAIL_COUNT) || '0', 10);
    } else {
        localStorage.setItem(KEY_EMAIL_MONTH, currentMonthKey);
    }

    localStorage.setItem(KEY_EMAIL_COUNT, String(currentCount + 1));
};

/**
 * Limpia el saludo inicial del texto para evitar duplicados con el backend.
 */
export const stripGreeting = (text: string): string => {
    return text
        .replace(/^[\s\S]*?(Hola|Estimad[oa]|Buen día|Buenas tardes).*?(\n|$)/i, '') // Elimina línea de saludo
        .replace(/^\s*Espero que estés muy bien\.?\s*/i, '') // Elimina frase común de cortesía
        .trim();
};

/**
 * Detecta keywords en el título para asignar íconos y colores
 */
const getBlockStyle = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('puntualidad') || lower.includes('asistencia')) return { icon: '⏰', bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' }; // Blue
    if (lower.includes('ética') || lower.includes('confidencialidad')) return { icon: '🔒', bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' }; // Green
    if (lower.includes('rol') || lower.includes('activo')) return { icon: '🚀', bg: '#faf5ff', border: '#e9d5ff', text: '#6b21a8' }; // Purple
    if (lower.includes('disfruta')) return { icon: '✨', bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' }; // Orange
    if (lower.includes('documentación') || lower.includes('final')) return { icon: '📄', bg: '#fff1f2', border: '#fecdd3', text: '#9f1239' }; // Rose
    return { icon: '📌', bg: '#f8fafc', border: '#e2e8f0', text: '#334155' }; // Slate default
};

/**
 * Genera un HTML "Premium" basado en tablas.
 */
export const generateHtmlTemplate = (textBody: string, title: string = "Comunicación UFLO"): string => {
    // 1. Limpiar saludo y caracteres especiales HTML
    const cleanText = stripGreeting(textBody)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Dividimos por saltos de línea
    const lines = cleanText.split(/\n/); 
    let contentHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmedLine = line.trim();
        
        if (!trimmedLine) {
            // Espacio vacío
            contentHtml += `<div style="height: 12px; line-height: 12px; font-size: 1px;">&nbsp;</div>`;
            continue;
        }

        // Detectar bloques destacados: **Titulo:** Contenido
        const blockMatch = trimmedLine.match(/^\*\*(.*?)\*\*[:]?\s*(.*)/);
        
        if (blockMatch) {
            const blockTitle = blockMatch[1].trim();
            const blockContent = blockMatch[2].trim();
            const style = getBlockStyle(blockTitle);
            
            contentHtml += `
            <!-- Bloque Destacado -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 15px; background-color: ${style.bg}; border-radius: 8px; border: 1px solid ${style.border}; border-collapse: separate;">
                <tr>
                    <td width="50" align="center" valign="middle" style="padding: 0; border-right: 1px solid ${style.border}; font-size: 24px; line-height: 1;">
                        <div style="padding: 12px;">${style.icon}</div>
                    </td>
                    <td style="padding: 12px 15px; vertical-align: middle;">
                        <div style="color: ${style.text}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: bold; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${blockTitle}</div>
                        <div style="color: #475569; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5;">${blockContent}</div>
                    </td>
                </tr>
            </table>`;
        } 
        // Detectar líneas de datos con íconos explícitos (📍, 🗓️)
        else if (trimmedLine.match(/^([📍🗓️💡👉])\s*(.*)/)) {
            const iconMatch = trimmedLine.match(/^([📍🗓️💡👉])\s*(.*)/);
            if (iconMatch) {
                contentHtml += `
                <div style="margin-bottom: 12px; padding: 12px 15px; background-color: #ffffff; border-left: 4px solid #3b82f6; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                    <table border="0" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                            <td width="25" style="padding-right: 10px; font-size: 18px; vertical-align: middle;">${iconMatch[1]}</td>
                            <td style="color: #1e293b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 600; vertical-align: middle;">${iconMatch[2]}</td>
                        </tr>
                    </table>
                </div>`;
            }
        } 
        // Firma
        else if (trimmedLine.match(/^(Saludos|Atentamente|Cariños|Blas|Coordinador|Licenciatura)/i)) {
             contentHtml += `<div style="color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 13px; margin-top: 4px;">${trimmedLine}</div>`;
        } 
        // Párrafo normal
        else {
            const paragraphWithBold = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>');
            contentHtml += `<p style="margin: 0 0 10px 0; color: #334155; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6;">${paragraphWithBold}</p>`;
        }
    }

    // Separador antes de la firma si existe
    if (contentHtml.includes('Saludos') || contentHtml.includes('Atentamente')) {
         contentHtml = contentHtml.replace(/(<div.*?>(Saludos|Atentamente).*?<\/div>)/i, '<hr style="border: 0; border-top: 1px dashed #cbd5e1; margin: 25px 0;" />$1');
    }

    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <style type="text/css">
            body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; }
            table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
            <tr>
                <td align="center" style="padding: 40px 15px;">
                    <!-- Tarjeta Principal -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);">
                        <!-- Header Azul/Gradiente -->
                        <tr>
                            <td style="padding: 30px 40px; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);">
                                <h1 style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; text-shadow: 0 2px 4px rgba(0,0,0,0.1);">${title}</h1>
                                <p style="margin: 8px 0 0 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #e0f2fe; font-size: 14px; font-weight: 500;">Prácticas Profesionales Supervisadas</p>
                            </td>
                        </tr>
                        
                        <!-- Contenido -->
                        <tr>
                            <td style="padding: 40px 40px 30px 40px; background-color: #ffffff;">
                                ${contentHtml}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 12px; color: #94a3b8; font-weight: 500;">
                                    Universidad de Flores - Facultad de Psicología
                                </p>
                                <p style="margin: 5px 0 0 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 11px; color: #cbd5e1;">
                                    Sistema de Gestión Académica
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    `;
}

export const sendSmartEmail = async (scenario: EmailScenario, data: EmailData): Promise<{ success: boolean; message?: string }> => {
    const configKeys = SCENARIO_CONFIG[scenario];
    const isActive = localStorage.getItem(configKeys.active) === 'true';
    
    if (!isActive) {
        return { success: true, message: 'Automación desactivada' };
    }

    if (!data.studentEmail) {
        return { success: false, message: 'El alumno no tiene email registrado.' };
    }

    const specificDefault = DEFAULT_TEMPLATES[scenario];
    const storedSubject = localStorage.getItem(configKeys.subject) || specificDefault.subject;
    const storedBody = localStorage.getItem(configKeys.body) || specificDefault.body;

    let finalSubject = storedSubject;
    let textBody = storedBody;
    
    finalSubject = finalSubject.replace(/{{nombre_pps}}/g, data.ppsName || '');
    finalSubject = finalSubject.replace(/{{institucion}}/g, data.institution || '');
    
    textBody = textBody
        .replace(/{{nombre_alumno}}/g, data.studentName)
        .replace(/{{nombre_pps}}/g, data.ppsName || '')
        .replace(/{{horario}}/g, data.schedule || '')
        .replace(/{{institucion}}/g, data.institution || '')
        .replace(/{{estado_nuevo}}/g, data.newState || '')
        .replace(/{{notas}}/g, data.notes || '');

    // 1. Generar HTML Premium
    // Usamos el ASUNTO como título del header de la tarjeta, o un fallback
    const emailHeaderTitle = finalSubject.replace(/^[\[\(].*?[\]\)]\s*/, ''); // Remover [PRUEBA] si existe
    const htmlBody = generateHtmlTemplate(textBody, emailHeaderTitle);
    
    // 2. Generar texto plano limpio (sin saludo redundante)
    const cleanTextBody = stripGreeting(textBody);

    try {
        console.log(`[Email] Sending to ${data.studentEmail} with HTML content.`);
        // IMPORTANTE: Enviamos el HTML en el cuerpo de la request
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                to: data.studentEmail,
                subject: finalSubject,
                text: cleanTextBody, 
                html: htmlBody, // <--- Campo HTML explícito
                name: data.studentName 
            }
        });

        if (error) {
            console.error("Supabase Function Error:", error);
            throw new Error(error.message || "Error en el servidor de correo");
        }

        incrementCounter();
        return { success: true };

    } catch (error: any) {
        console.error(`[EmailService] Error enviando correo interno (${scenario}):`, error);
        return { success: false, message: error.message || 'Error de envío' };
    }
};
