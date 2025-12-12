
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
        subject: "Acreditación de Prácticas en SAC ✅",
        body: `Hola {{nombre_alumno}},

Queremos avisarte que tus horas de la PPS "{{nombre_pps}}" fueron acreditadas correctamente y ya podés visualizarlas en el sistema SAC.

¡Felicitaciones por la finalización de esta etapa!

Saludos,

Blas
Coordinador de Prácticas Profesionales Supervisadas
Licenciatura en Psicología
UFLO`
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
 * Configuración visual para las TARJETAS DE RECOMENDACIONES
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
    return { titleColor: '#334155', bg: '#f8fafc', border: '#e2e8f0' };
};

const getDataConfig = (label: string) => {
    const lower = label.toLowerCase();
    if (lower.includes('instituci')) return { icon: '📍', color: '#dc2626' }; 
    if (lower.includes('horario') || lower.includes('comisi')) return { icon: '📅', color: '#2563eb' }; 
    return { icon: '👉', color: '#475569' };
};

/**
 * Genera un HTML estilizado y responsive.
 */
export const generateHtmlTemplate = (textBody: string, title: string = "Comunicación Institucional"): string => {
    const cleanText = stripGreeting(textBody)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = cleanText.split(/\n/);
    let contentHtml = '';
    
    // Fuente moderna
    const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    
    let isSignatureBlock = false;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Detección de inicio de firma
        if (line.match(/^(Saludos|Atentamente|Cariños),?$/i)) {
            isSignatureBlock = true;
            contentHtml += `<div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
                <p style="margin: 0; color: #64748b; font-size: 14px; font-family: ${fontStack};">${line}</p>`;
            continue;
        }

        if (isSignatureBlock) {
             if (!line) continue;
             // Blas en negrita y color oscuro
             if (line.includes('Blas')) {
                 contentHtml += `<p style="margin: 4px 0 0 0; color: #0f172a; font-weight: 700; font-size: 16px; font-family: ${fontStack};">${line}</p>`;
             } else {
                 // Cargos en gris y más pequeños
                 contentHtml += `<p style="margin: 2px 0 0 0; color: #64748b; font-size: 13px; font-family: ${fontStack};">${line}</p>`;
             }
             continue;
        }

        if (!line) {
            contentHtml += `<div style="height: 12px; font-size: 1px; line-height: 12px;">&nbsp;</div>`;
            continue;
        }

        // 1. Bloques destacados (**Título:**)
        const blockMatch = line.match(/^\*\*(.*?)\*\*[:]?\s*(.*)/);
        // 2. Datos Clave (Etiqueta: Valor)
        const dataMatch = line.match(/^([^:]+):[:]?\s*(.*)/);

        if (blockMatch) {
            const blockTitle = blockMatch[1].trim();
            const blockContent = blockMatch[2].trim();
            if (blockTitle.toLowerCase().includes('disfrutalo')) continue;
            const style = getBlockConfig(blockTitle);
            
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
        else {
            const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            // Estilo especial para "Felicitaciones"
            if (line.includes('Felicitaciones')) {
                 contentHtml += `
                 <div style="margin: 24px 0; padding: 16px; background-color: #f0fdf4; border-radius: 8px; border: 1px solid #bbf7d0; text-align: center;">
                    <h3 style="color: #166534; font-family: ${fontStack}; font-size: 18px; margin: 0; font-weight: 700;">
                        ✨ ${boldLine} ✨
                    </h3>
                 </div>`;
            } 
            else if (line.includes('Recomendaciones') || line.includes('💡')) {
                 contentHtml += `<h3 style="color: #1e293b; font-family: ${fontStack}; font-size: 17px; margin: 25px 0 15px 0; font-weight: 700; letter-spacing: -0.3px;">${boldLine}</h3>`;
            } else {
                 contentHtml += `<p style="margin: 0 0 16px 0; color: #475569; font-family: ${fontStack}; font-size: 15px; line-height: 1.6;">${boldLine}</p>`;
            }
        }
    }
    
    if (isSignatureBlock) {
        contentHtml += `</div>`; // Cerrar el div de la firma si quedó abierto
    }

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: ${fontStack};">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding: 40px 10px;">
                    
                    <!-- Main Container -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
                        
                        <!-- Header Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #00B2A9 0%, #1e40af 100%); padding: 32px 40px;">
                                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="left">
                                            <div style="color: #ffffff; font-family: ${fontStack};">
                                                <span style="display: block; font-weight: 900; font-size: 28px; letter-spacing: -0.5px;">UFLO</span>
                                                <span style="display: block; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 3px; opacity: 0.9;">Universidad</span>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                        
                        <!-- Main Content -->
                        <tr>
                            <td style="padding: 40px;">
                                <h1 style="margin: 0 0 24px 0; text-align: left; line-height: 1.2; color: #0f172a; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                                    ${title}
                                </h1>
                                <div style="font-size: 15px; color: #334155;">
                                    ${contentHtml}
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0;">
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; font-family: ${fontStack};">
                                    <strong>Facultad de Psicología y Ciencias Sociales</strong><br>
                                    Prácticas Profesionales Supervisadas<br>
                                    <span style="color: #cbd5e1;">&copy; ${new Date().getFullYear()} Universidad de Flores</span>
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

    const firstName = data.studentName.split(' ')[0];
    const htmlTitle = `Hola, <span style="color: #2563eb;">${firstName}</span>`;
    
    const htmlBody = generateHtmlTemplate(textBody, htmlTitle);
    const cleanTextBody = stripGreeting(textBody);

    try {
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                to: data.studentEmail,
                subject: finalSubject,
                text: cleanTextBody, 
                html: htmlBody,
                name: data.studentName 
            }
        });

        if (error) throw new Error(error.message || "Error en el servidor de correo");

        incrementCounter();
        return { success: true };

    } catch (error: any) {
        console.error(`[EmailService] Error enviando correo interno (${scenario}):`, error);
        return { success: false, message: error.message || 'Error de envío' };
    }
};
