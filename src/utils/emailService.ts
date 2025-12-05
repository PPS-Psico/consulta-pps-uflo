
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

// Define rich defaults so the system works out-of-the-box without saving templates in UI first
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
 * Genera un HTML profesional y responsivo (Estrategia Premium).
 * Detecta bloques, saludos e íconos para construir una "Tarjeta Digital".
 */
export const generateHtmlTemplate = (textBody: string, title: string = "Comunicación UFLO"): string => {
    // 1. Limpieza inicial
    let safeText = textBody
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. Extracción Agresiva del Saludo
    // Busca líneas que empiecen con Hola/Estimado, permitiendo espacios antes
    const greetingRegex = /^\s*(Hola|Estimado|Estimada|Buenas|Buen día)(.*?)(\n|$)/im;
    const greetingMatch = safeText.match(greetingRegex);
    
    let subHeaderHtml = '';
    
    if (greetingMatch) {
        // Extraemos el saludo completo (ej: "Hola Juan,")
        const greetingText = greetingMatch[0].trim();
        subHeaderHtml = `<h2 style="margin: 0; color: #3b82f6; font-size: 20px; font-weight: 600; line-height: 1.4;">${greetingText}</h2>`;
        
        // Lo eliminamos del cuerpo para evitar duplicados
        safeText = safeText.replace(greetingMatch[0], '').trim();
    }

    // 3. Procesamiento de Bloques Especiales (**Titulo:** Contenido)
    // Convertimos bloques de texto markdown-style en tarjetas de alerta visuales.
    // Usamos split para procesar por párrafos y detectar bloques
    const lines = safeText.split(/\n+/); // Split por uno o más saltos de línea
    let processedBody = '';
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        if (!trimmedLine) return;

        // Detectar bloques destacados: **Titulo:** Contenido
        const blockMatch = trimmedLine.match(/^\*\*(.*?)\*\*[:]?\s*(.*)/);
        
        if (blockMatch) {
            // Es un bloque destacado
            const blockTitle = blockMatch[1].trim();
            const blockContent = blockMatch[2].trim();
            
            processedBody += `
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 15px 0; background-color: #f1f5f9; border-left: 4px solid #2563eb; border-radius: 4px;">
                <tr>
                    <td style="padding: 15px;">
                        <strong style="display: block; color: #1e3a8a; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">${blockTitle}</strong>
                        <span style="color: #334155; font-size: 14px; line-height: 1.5;">${blockContent}</span>
                    </td>
                </tr>
            </table>`;
        } else if (trimmedLine.match(/^([📍🗓️💡👉])\s*(.*)/)) {
            // Es una lista con íconos
            const iconMatch = trimmedLine.match(/^([📍🗓️💡👉])\s*(.*)/);
            if (iconMatch) {
                processedBody += `
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 8px;">
                    <tr>
                        <td valign="top" width="24" style="font-size: 18px; line-height: 1;">${iconMatch[1]}</td>
                        <td valign="top" style="font-size: 14px; color: #475569; line-height: 1.5;">${iconMatch[2]}</td>
                    </tr>
                </table>`;
            }
        } else if (trimmedLine.match(/^(Saludos|Atentamente|Cariños|Blas|Coordinador|Licenciatura)/i)) {
            // Es parte de la firma
            processedBody += `<div style="color: #64748b; font-size: 13px; line-height: 1.4; margin-top: 4px;">${trimmedLine}</div>`;
        } else {
            // Párrafo normal con negritas inline
            const paragraphWithBold = trimmedLine.replace(/\*\*(.*?)\*\*/g, '<strong style="color: #0f172a;">$1</strong>');
            processedBody += `<p style="margin: 0 0 12px 0; font-size: 15px; line-height: 1.6; color: #334155;">${paragraphWithBold}</p>`;
        }
    });

    // Agregar separador visual antes de la firma si detectamos "Saludos" o similar
    processedBody = processedBody.replace(
        /(<div.*?>(Saludos|Atentamente).*?<\/div>)/i,
        '<div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; margin-bottom: 10px;"></div>$1'
    );

    // 7. Estructura Maestra (Table-based layout)
    return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <center style="width: 100%; background-color: #f8fafc; padding: 40px 0;">
        <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); max-width: 600px; width: 100%;">
            <!-- Header Azul UFLO -->
            <tr>
                <td style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); padding: 30px 40px; text-align: center;">
                     <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">${title}</h1>
                </td>
            </tr>
            
            <!-- Cuerpo Principal -->
            <tr>
                <td style="padding: 40px;">
                    ${subHeaderHtml}
                    <div style="height: 20px;"></div>
                    ${processedBody}
                </td>
            </tr>

            <!-- Footer Gris -->
            <tr>
                <td style="background-color: #f1f5f9; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
                    <p style="margin: 0; color: #64748b; font-size: 12px; font-weight: 600;">Universidad de Flores - Comahue</p>
                    <p style="margin: 5px 0 0 0; color: #94a3b8; font-size: 11px;">Panel de Gestión Académica de PPS</p>
                </td>
            </tr>
        </table>
    </center>
</body>
</html>
    `;
}

/**
 * Envía un correo utilizando la infraestructura interna de Supabase (Edge Function).
 */
export const sendSmartEmail = async (scenario: EmailScenario, data: EmailData): Promise<{ success: boolean; message?: string }> => {
    // 1. Verificar si la automatización está activa localmente
    const configKeys = SCENARIO_CONFIG[scenario];
    const isActive = localStorage.getItem(configKeys.active) === 'true';
    
    if (!isActive) {
        return { success: true, message: 'Automación desactivada' };
    }

    if (!data.studentEmail) {
        return { success: false, message: 'El alumno no tiene email registrado.' };
    }

    // 2. Obtener Plantilla
    const specificDefault = DEFAULT_TEMPLATES[scenario];
    const storedSubject = localStorage.getItem(configKeys.subject) || specificDefault.subject;
    const storedBody = localStorage.getItem(configKeys.body) || specificDefault.body;

    // 3. Reemplazar Variables en Texto Plano
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

    // 4. Generar HTML Premium
    const emailTitle = scenario === 'seleccion' ? 'Asignación de Práctica' : scenario === 'sac' ? 'Acreditación Finalizada' : 'Novedades de tu Solicitud';
    const htmlBody = generateHtmlTemplate(textBody, emailTitle);

    console.log(`[Email Debug] Enviando a: ${data.studentEmail}`);
    console.log(`[Email Debug] HTML Generado (primeros 100 chars):`, htmlBody.substring(0, 100));

    // 5. Invocar Función Interna
    try {
        const { error } = await supabase.functions.invoke('send-email', {
            body: {
                to: data.studentEmail,
                subject: finalSubject,
                text: textBody, 
                html: htmlBody,
                name: "Administrador" 
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
