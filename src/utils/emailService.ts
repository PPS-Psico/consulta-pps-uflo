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
        .replace(/^[\s\S]*?(Hola|Estimad[oa]|Buen día|Buenas tardes).*?(\n|$)/i, '')
        .replace(/^\s*Espero que estés muy bien\.?\s*/i, '')
        .trim();
};

/**
 * Configuración visual para las TARJETAS DE RECOMENDACIONES (Estilo Premium)
 */
const getBlockConfig = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('puntualidad') || lower.includes('asistencia')) {
        return { icon: '⏰', titleColor: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' }; // Blue-100 theme
    }
    if (lower.includes('ética') || lower.includes('confidencialidad')) {
        return { icon: '🔒', titleColor: '#065f46', bg: '#ecfdf5', border: '#a7f3d0' }; // Emerald-100 theme
    }
    if (lower.includes('rol') || lower.includes('activo')) {
        return { icon: '🚀', titleColor: '#6b21a8', bg: '#faf5ff', border: '#e9d5ff' }; // Purple-100 theme
    }
    if (lower.includes('documentación')) {
        return { icon: '📄', titleColor: '#9f1239', bg: '#fff1f2', border: '#fecdd3' }; // Rose-100 theme
    }
    // Default
    return { icon: '📌', titleColor: '#1e293b', bg: '#f8fafc', border: '#e2e8f0' };
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
 * Genera un HTML realmente Premium y estructurado.
 */
export const generateHtmlTemplate = (textBody: string, title: string = "Comunicación Institucional"): string => {
    const cleanText = stripGreeting(textBody)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    const lines = cleanText.split(/\n/);
    let contentHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
            contentHtml += `<div style="height: 12px; font-size: 1px;">&nbsp;</div>`;
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
            
            // Renderizado estilo TARJETA PREMIUM
            // Se usa un contenedor blanco circular para el ícono para asegurar centrado y contraste.
            contentHtml += `
            <div style="margin-bottom: 16px; background-color: ${style.bg}; border: 1px solid ${style.border}; border-radius: 12px; padding: 24px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="60" valign="top" align="center" style="padding-right: 20px;">
                            <!-- Icon Container for Perfect Centering -->
                            <div style="background-color: #ffffff; width: 48px; height: 48px; border-radius: 50%; text-align: center; line-height: 48px; font-size: 24px; box-shadow: 0 4px 6px rgba(0,0,0,0.04); border: 1px solid ${style.border};">
                                ${style.icon}
                            </div>
                        </td>
                        <td valign="top">
                            <div style="color: ${style.titleColor}; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; margin-top: 4px;">
                                ${blockTitle}
                            </div>
                            <div style="color: #475569; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6;">
                                ${blockContent}
                            </div>
                        </td>
                    </tr>
                </table>
            </div>`;
        } 
        else if (dataMatch && (line.includes('Institución') || line.includes('Horario') || line.includes('Estado') || line.includes('Comisión'))) {
            const label = dataMatch[1].trim();
            let value = dataMatch[2].trim();
            
            // Cleanup common parsing artifacts
            if (value.startsWith('/')) value = value.substring(1).trim();

            const config = getDataConfig(label);

            // Renderizado estilo TICKET limpio y moderno
            contentHtml += `
            <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-left: 4px solid ${config.color}; border-radius: 8px; padding: 18px 24px; margin-bottom: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02);">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td width="40" valign="middle" align="center" style="padding-right: 16px;">
                             <div style="font-size: 20px;">${config.icon}</div>
                        </td>
                        <td valign="middle" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                            <div style="font-size: 11px; text-transform: uppercase; color: #94a3b8; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">${label}</div>
                            <div style="font-size: 16px; color: #0f172a; font-weight: 700; letter-spacing: -0.3px;">${value}</div>
                        </td>
                    </tr>
                </table>
            </div>`;
        }
        else if (line.match(/^(Saludos|Atentamente|Cariños|Blas|Coordinador|Licenciatura)/i)) {
             contentHtml += `<div style="color: #64748b; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; margin-top: 5px;">${line}</div>`;
        } 
        else {
            const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            // Detectar si es un título de sección
            if (line.includes('Recomendaciones') || line.includes('💡')) {
                 contentHtml += `<h3 style="color: #334155; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 16px; margin: 30px 0 15px 0; font-weight: 700; display: flex; align-items: center; letter-spacing: -0.3px;">${boldLine}</h3>`;
            } else {
                 contentHtml += `<p style="margin: 0 0 12px 0; color: #475569; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 15px; line-height: 1.6;">${boldLine}</p>`;
            }
        }
    }

    if (contentHtml.includes('Saludos') || contentHtml.includes('Atentamente')) {
         contentHtml = contentHtml.replace(/(<div.*?>(Saludos|Atentamente).*?<\/div>)/i, '<hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 30px 0 20px 0;" />$1');
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
            <tr>
                <td align="center" style="padding: 30px 10px;">
                    
                    <!-- Main Card -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01); width: 100%; max-width: 600px;">
                        
                        <!-- Premium Compact Banner -->
                        <tr>
                            <td style="background: linear-gradient(135deg, #00B2A9 0%, #1e40af 100%); padding: 0;">
                                <div style="padding: 24px 32px;">
                                    <table width="100%" border="0" cellspacing="0" cellpadding="0">
                                        <tr>
                                            <td align="left" valign="middle">
                                                <div style="font-family: 'Arial', sans-serif; line-height: 1;">
                                                    <span style="display: block; font-weight: 900; font-size: 28px; color: #ffffff; letter-spacing: -1px; margin-bottom: 4px;">UFLO</span>
                                                    <span style="display: block; font-weight: 500; font-size: 10px; color: rgba(255,255,255,0.8); text-transform: uppercase; letter-spacing: 3px;">Universidad</span>
                                                </div>
                                            </td>
                                            <!-- Geometric Decoration (CSS only) -->
                                            <td align="right" valign="middle">
                                                <div style="width: 40px; height: 40px; border-radius: 50%; background-color: rgba(255,255,255,0.1);"></div>
                                                <div style="width: 20px; height: 20px; border-radius: 50%; background-color: rgba(255,255,255,0.1); margin-top: -10px; margin-right: 10px;"></div>
                                            </td>
                                        </tr>
                                    </table>
                                </div>
                            </td>
                        </tr>
                        
                        <!-- Content Body -->
                        <tr>
                            <td style="padding: 40px;">
                                <!-- Centered Title with color -->
                                <h1 style="color: #1e293b; font-size: 22px; font-weight: 800; margin: 0 0 25px 0; text-align: center; line-height: 1.3; letter-spacing: -0.5px;">
                                    ${title}
                                </h1>
                                ${contentHtml}
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="background-color: #f8fafc; padding: 25px; text-align: center; border-top: 1px solid #f1f5f9;">
                                <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.6; text-transform: uppercase; letter-spacing: 0.5px;">
                                    <strong>Facultad de Psicología y Ciencias Sociales</strong><br>
                                    Prácticas Profesionales Supervisadas
                                </p>
                            </td>
                        </tr>
                    </table>
                    
                    <!-- Legal Sub-footer -->
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

    // Extract title from subject for the internal card header (removes tags like [PRUEBA])
    const emailHeaderTitle = finalSubject.replace(/^[\[\(].*?[\]\)]\s*/, ''); 
    
    // Generamos el HTML con el nuevo diseño PREMIUM
    const htmlBody = generateHtmlTemplate(textBody, emailHeaderTitle);
    const cleanTextBody = stripGreeting(textBody);

    try {
        console.log(`[Email] Sending to ${data.studentEmail} with UFLO Branded HTML (Premium v3).`);
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
