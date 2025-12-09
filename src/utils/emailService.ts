
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
 * Detecta keywords en el título para asignar íconos y colores basados en la identidad UFLO.
 */
const getBlockStyle = (title: string) => {
    const lower = title.toLowerCase();
    // Azul Digital UFLO
    if (lower.includes('puntualidad') || lower.includes('asistencia')) return { icon: '⏰', bg: '#eff6ff', border: '#bfdbfe', text: '#2337c9' };
    // Turquesa Digital UFLO
    if (lower.includes('ética') || lower.includes('confidencialidad')) return { icon: '🔒', bg: '#f0fdfa', border: '#99f6e4', text: '#0d9488' }; // Teal-ish
    // Púrpura (UFLO tiene un morado en el gradiente principal)
    if (lower.includes('rol') || lower.includes('activo')) return { icon: '🚀', bg: '#faf5ff', border: '#e9d5ff', text: '#7e22ce' };
    // Rojo/Rosa (Avisos importantes)
    if (lower.includes('documentación') || lower.includes('final')) return { icon: '📄', bg: '#fff1f2', border: '#fecdd3', text: '#be123c' };
    
    // Default Slate
    return { icon: '📌', bg: '#f8fafc', border: '#e2e8f0', text: '#334155' };
};

/**
 * Asigna icono basado en la etiqueta del campo de datos
 */
const getDataIcon = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('instituc') || lower.includes('lugar')) return '📍';
    if (lower.includes('horario') || lower.includes('comisi')) return '🗓️';
    if (lower.includes('estado')) return '📊';
    return '👉';
};

/**
 * Genera un HTML "Premium" basado en tablas, siguiendo el Manual de Identidad UFLO.
 * Usa tipografía Roboto y los gradientes oficiales.
 */
export const generateHtmlTemplate = (textBody: string, title: string = "Comunicación Institucional"): string => {
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
            contentHtml += `<div style="height: 16px; line-height: 16px; font-size: 1px;">&nbsp;</div>`;
            continue;
        }

        // Detectar bloques destacados: **Titulo:** Contenido
        const blockMatch = trimmedLine.match(/^\*\*(.*?)\*\*[:]?\s*(.*)/);
        
        // Detectar líneas de datos clave (Institución:, Horario:, etc) para formatear bonito
        const dataMatch = trimmedLine.match(/^(Institución|Horario|Comisión|Lugar|Fecha|Estado|Nuevo Estado)[:]?\s*(.*)/i);

        if (blockMatch) {
            const blockTitle = blockMatch[1].trim();
            const blockContent = blockMatch[2].trim();
            const style = getBlockStyle(blockTitle);
            
            contentHtml += `
            <!-- Bloque Destacado UFLO Style -->
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px; background-color: ${style.bg}; border-radius: 8px; border-left: 5px solid ${style.text}; border-collapse: separate;">
                <tr>
                    <td width="50" align="center" valign="top" style="padding: 15px 0 15px 15px; font-size: 24px; line-height: 1;">
                        ${style.icon}
                    </td>
                    <td style="padding: 15px; vertical-align: top;">
                        <div style="color: ${style.text}; font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; font-weight: 700; margin-bottom: 6px;">${blockTitle}</div>
                        <div style="color: #334155; font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6;">${blockContent}</div>
                    </td>
                </tr>
            </table>`;
        } 
        // Detectar líneas de datos estructurados para evitar problemas de encoding con emojis directos
        else if (dataMatch) {
            const label = dataMatch[1];
            const value = dataMatch[2];
            const icon = getDataIcon(label);

            contentHtml += `
            <div style="margin-bottom: 15px; padding: 18px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;">
                <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                        <td width="30" style="padding-right: 12px; font-size: 22px; vertical-align: middle;">${icon}</td>
                        <td style="color: #1e293b; font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 17px; font-weight: 500; vertical-align: middle;">
                            <span style="color: #64748b; font-size: 14px; text-transform: uppercase; font-weight: 700; letter-spacing: 0.5px; display: block; margin-bottom: 2px;">${label}</span>
                            ${value}
                        </td>
                    </tr>
                </table>
            </div>`;
        }
        // Firma
        else if (trimmedLine.match(/^(Saludos|Atentamente|Cariños|Blas|Coordinador|Licenciatura)/i)) {
             contentHtml += `<div style="color: #64748b; font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; margin-top: 6px; font-weight: 500;">${trimmedLine}</div>`;
        } 
        // Párrafo normal con soporte para **negrita**
        else {
            const paragraphWithBold = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a; font-weight: 700;">$1</strong>');
            contentHtml += `<p style="margin: 0 0 16px 0; color: #334155; font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.7;">${paragraphWithBold}</p>`;
        }
    }

    // Separador antes de la firma si existe
    if (contentHtml.includes('Saludos') || contentHtml.includes('Atentamente')) {
         contentHtml = contentHtml.replace(/(<div.*?>(Saludos|Atentamente).*?<\/div>)/i, '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 35px 0 20px 0;" />$1');
    }

    return `
    <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
    <html xmlns="http://www.w3.org/1999/xhtml">
    <head>
        <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <!-- Importar Roboto -->
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
        <style type="text/css">
            body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; background-color: #f1f5f9; font-family: 'Roboto', 'Helvetica Neue', Helvetica, Arial, sans-serif; }
            table, td { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; -ms-interpolation-mode: bicubic; }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9;">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f1f5f9;">
            <tr>
                <td align="center" style="padding: 20px 10px;">
                    
                    <!-- Contenedor Principal (Max Width aumentado para aprovechar pantalla) -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 1000px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
                        
                        <!-- Header Slim & Modern -->
                        <tr>
                            <td style="padding: 0;">
                                <div style="background: linear-gradient(90deg, #00B2A9 0%, #005698 100%); padding: 18px 35px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="left" style="font-family: 'Roboto', Helvetica, Arial, sans-serif; color: #ffffff;">
                                                <!-- Logo Horizontal Compacto -->
                                                <span style="font-size: 32px; font-weight: 900; line-height: 1; letter-spacing: -1px; vertical-align: middle;">UFLO</span>
                                                <span style="font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 2px; opacity: 0.9; margin-left: 12px; border-left: 1px solid rgba(255,255,255,0.4); padding-left: 12px; vertical-align: middle; display: inline-block; height: 18px; line-height: 18px;">Universidad</span>
                                            </td>
                                            <!-- Espacio o elemento decorativo opcional a la derecha -->
                                        </tr>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Título del Mensaje -->
                        <tr>
                            <td style="padding: 40px 40px 20px 40px; background-color: #ffffff;">
                                <h1 style="margin: 0; font-family: 'Roboto', sans-serif; color: #0f172a; font-size: 26px; font-weight: 800; line-height: 1.3;">
                                    ${title}
                                </h1>
                            </td>
                        </tr>

                        <!-- Contenido Principal -->
                        <tr>
                            <td style="padding: 10px 40px 50px 40px; background-color: #ffffff;">
                                ${contentHtml}
                            </td>
                        </tr>

                        <!-- Footer Institucional Minimalista -->
                        <tr>
                            <td style="padding: 25px; background-color: #f8fafc; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-family: 'Roboto', sans-serif; font-size: 12px; color: #64748b; line-height: 1.5;">
                                    <strong>UFLO UNIVERSIDAD</strong> &bull; Facultad de Psicología<br/>
                                    Prácticas Profesionales Supervisadas
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Pie Legal -->
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 1000px;">
                        <tr>
                            <td align="center" style="padding: 20px; color: #94a3b8; font-family: 'Roboto', sans-serif; font-size: 11px;">
                                &copy; ${new Date().getFullYear()} UFLO Universidad. Mensaje automático del sistema.
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

    // 1. Generar HTML Premium UFLO (Sin Imágenes)
    const emailHeaderTitle = finalSubject.replace(/^[\[\(].*?[\]\)]\s*/, ''); 
    const htmlBody = generateHtmlTemplate(textBody, emailHeaderTitle);
    
    // 2. Generar texto plano limpio
    const cleanTextBody = stripGreeting(textBody);

    try {
        console.log(`[Email] Sending to ${data.studentEmail} with UFLO Branded HTML (Code-Only).`);
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                to: data.studentEmail,
                subject: finalSubject,
                text: cleanTextBody, 
                html: htmlBody,
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
