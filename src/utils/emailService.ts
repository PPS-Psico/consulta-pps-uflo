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

export const stripGreeting = (text: string): string => {
    return text
        .replace(/^[\s\S]*?(Hola|Estimad[oa]|Buen día|Buenas tardes).*?(\n|$)/im, '')
        .replace(/^\s*Espero que estés muy bien\.?\s*/im, '')
        .trim();
};

/**
 * Configuración visual para las TARJETAS DE RECOMENDACIONES (Estilo Premium Minimalista)
 */
const getBlockConfig = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('puntualidad') || lower.includes('asistencia')) {
        return { titleColor: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }; // Blue-100 theme
    }
    if (lower.includes('ética') || lower.includes('confidencialidad')) {
        return { titleColor: '#047857', bg: '#ecfdf5', border: '#a7f3d0' }; // Emerald-100 theme
    }
    if (lower.includes('rol') || lower.includes('activo')) {
        return { titleColor: '#7e22ce', bg: '#faf5ff', border: '#e9d5ff' }; // Purple-100 theme
    }
    if (lower.includes('documentación')) {
        return { titleColor: '#be123c', bg: '#fff1f2', border: '#fecdd3' }; // Rose-100 theme
    }
    // Default
    return { titleColor: '#334155', bg: '#f8fafc', border: '#e2e8f0' };
};

/**
 * Configuración visual para datos clave (Institución, Horario) - Estilo Clean Ticket
 */
const getDataConfig = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('instituci')) return { icon: '📍', color: '#dc2626' }; // Pin rojo
    if (lower.includes('horario') || lower.includes('comisi')) return { icon: '📅', color: '#2563eb' }; // Cal azul
    return { icon: '👉', color: '#475569' };
};

/**
 * Genera un HTML realmente Premium, estructurado y RESPONSIVE.
 * Tipografía actualizada a System UI Stack para modernidad.
 */
export const generateHtmlTemplate = (textBody: string, title: string = "Comunicación Institucional"): string => {
    const cleanText = stripGreeting(textBody)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = cleanText.split(/\n/);
    let contentHtml = '';
    
    // Fuente moderna y limpia (System Stack)
    const fontStack = "system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            contentHtml += `<div style="height: 12px; font-size: 1px; line-height: 12px;">&nbsp;</div>`;
            continue;
        }

        // 1. Detectar Bloques Destacados (**Título:** Texto)
        const blockMatch = line.match(/^\*\*(.*?)\*\*[:]?\s*(.*)/);
        
        // 2. Detectar Datos Clave (Etiqueta: Valor)
        const dataMatch = line.match(/^([^:]+):[:]?\s*(.*)/);

        if (blockMatch) {
            const blockTitle = blockMatch[1].trim();
            const blockContent = blockMatch[2].trim();
            
            // Filtro anti-spam visual
            if (blockTitle.toLowerCase().includes('disfrutalo') || blockTitle.toLowerCase().includes('disfrútalo')) continue;

            const style = getBlockConfig(blockTitle);
            
            // Renderizado estilo "Callout" Premium
            contentHtml += `
            <div class="content-block" style="margin-bottom: 12px; background-color: ${style.bg}; border: 1px solid ${style.border}; border-left: 4px solid ${style.titleColor}; border-radius: 6px; padding: 16px 20px;">
                <div style="color: ${style.titleColor}; font-family: ${fontStack}; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
                    ${blockTitle}
                </div>
                <div style="color: #334155; font-family: ${fontStack}; font-size: 15px; line-height: 1.6;">
                    ${blockContent}
                </div>
            </div>`;
        } 
        else if (dataMatch && (line.includes('Institución') || line.includes('Horario') || line.includes('Estado') || line.includes('Comisión'))) {
            const label = dataMatch[1].trim();
            let value = dataMatch[2].trim();
            
            if (value.startsWith('/')) value = value.substring(1).trim();

            const config = getDataConfig(label);

            // Renderizado estilo TICKET limpio
            contentHtml += `
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${config.color}; border-radius: 8px; padding: 15px 20px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="24" valign="middle" align="center" style="padding-right: 12px;">
                             <div style="font-size: 18px;">${config.icon}</div>
                        </td>
                        <td valign="middle" style="font-family: ${fontStack};">
                            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 2px;">${label}</div>
                            <div style="font-size: 15px; color: #0f172a; font-weight: 600;">${value}</div>
                        </td>
                    </tr>
                </table>
            </div>`;
        }
        else if (line.match(/^(Saludos|Atentamente|Cariños|Blas|Coordinador|Licenciatura)/i)) {
             contentHtml += `<div style="color: #64748b; font-family: ${fontStack}; font-size: 14px; margin-top: 4px;">${line}</div>`;
        } 
        else {
            const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            if (line.includes('Recomendaciones') || line.includes('💡')) {
                 contentHtml += `<h3 style="color: #1e293b; font-family: ${fontStack}; font-size: 17px; margin: 25px 0 15px 0; font-weight: 700; letter-spacing: -0.3px;">${boldLine}</h3>`;
            } else {
                 contentHtml += `<p style="margin: 0 0 14px 0; color: #475569; font-family: ${fontStack}; font-size: 15px; line-height: 1.6;">${boldLine}</p>`;
            }
        }
    }

    if (contentHtml.includes('Saludos') || contentHtml.includes('Atentamente')) {
         contentHtml = contentHtml.replace(/(<div.*?>(Saludos|Atentamente).*?<\/div>)/i, '<hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0 20px 0;" />$1');
    }

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Client-specific resets */
            body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
            table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
            img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
            table { border-collapse: collapse !important; }
            body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }
            
            /* Modern Font Stack */
            body, td, th, p, div, li, a, span, h1, h2, h3 {
                font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
            }

            /* Mobile Responsive Styles */
            @media screen and (max-width: 600px) {
                .email-container {
                    width: 100% !important;
                    margin: auto !important;
                }
                .content-padding {
                    padding: 24px !important;
                }
                .header-padding {
                    padding: 24px !important;
                }
                h1 {
                    font-size: 24px !important;
                }
            }
        </style>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding: 20px 10px;">
                    
                    <!-- Main Container -->
                    <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #f1f5f9;">
                        
                        <!-- Header Banner -->
                        <tr>
                            <td class="header-padding" style="background: linear-gradient(135deg, #00B2A9 0%, #1e40af 100%); padding: 32px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="left">
                                            <div style="line-height: 1;">
                                                <span style="display: block; font-weight: 800; font-size: 32px; color: #ffffff; letter-spacing: -1px; margin-bottom: 6px;">UFLO</span>
                                                <span style="display: block; font-weight: 600; font-size: 11px; color: rgba(255,255,255,0.9); text-transform: uppercase; letter-spacing: 2px;">Universidad</span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td class="content-padding" style="padding: 40px;">
                                <h1 style="margin: 0 0 24px 0; text-align: left; line-height: 1.2; color: #1e293b; font-size: 28px; font-weight: 700;">
                                    ${title}
                                </h1>
                                ${contentHtml}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">
                                    Facultad de Psicología y Ciencias Sociales<br>
                                    <span style="color: #cbd5e1;">Prácticas Profesionales Supervisadas</span>
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Sub-footer -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px;">
                        <tr>
                            <td align="center" style="padding: 20px; font-size: 11px; color: #cbd5e1;">
                                &copy; ${new Date().getFullYear()} Universidad de Flores.
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

    // Construir el título interno (H1) con dos tonos usando spans
    const firstName = data.studentName.split(' ')[0];
    const htmlTitle = `<span style="color: #64748b; font-weight: 400;">Hola,</span> <span style="color: #2563eb; font-weight: 800;">${firstName}</span>`;
    
    const htmlBody = generateHtmlTemplate(textBody, htmlTitle);
    const cleanTextBody = stripGreeting(textBody);

    try {
        console.log(`[Email] Sending to ${data.studentEmail} with Responsive Design.`);
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
