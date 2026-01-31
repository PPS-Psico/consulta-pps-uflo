import { formatDate } from "./formatters";

interface WhatsAppData {
  nombrePPS: string;
  direccion: string;
  orientacion: string;
  descripcion: string; // Used for "Objetivo" logic or general details
  actividades: string[];
  horasAcreditadas: string | number;
  cuposDisponibles: string | number;
  horarios: string[];
  fechaInicioInscripcion?: string;
  fechaFinInscripcion?: string;
  fechaInicio?: string;
  reqCv: boolean;
}

export const generateWhatsAppMessage = (data: WhatsAppData): string => {
  // Determine enrollment dates text
  const inscripcionText =
    data.fechaInicioInscripcion && data.fechaFinInscripcion
      ? `Desde *${formatDate(data.fechaInicioInscripcion)}* hasta el *${formatDate(data.fechaFinInscripcion)}*`
      : "Consultar en Campus";

  // Format Schedules
  const cronogramaText =
    data.horarios.length > 0 ? data.horarios.map((s) => `• ${s}`).join("\n") : "A confirmar";

  // Format Activities (often mapped to cronograma detail in template, but we list them generally here)
  const activitiesLines = data.actividades.map((a, i) => `${i + 1}️⃣ *${a.trim()}*`).join("\n");

  // Determine Modality
  let modalidad = "A confirmar";
  const cleanDir = data.direccion.toLowerCase().trim();
  if (
    cleanDir.includes("virtual") ||
    cleanDir.includes("online") ||
    cleanDir.includes("zoom") ||
    cleanDir.includes("meet")
  ) {
    modalidad = "Online 💻";
  } else if (data.direccion && data.direccion.length > 2) {
    modalidad = "Presencial (Capacitación + Campo)";
  }

  return `📢 *¡Nueva Convocatoria PPS: ${data.nombrePPS}!* ☀️

✨ *Institución:* ${data.nombrePPS}
📍 *Lugar:* ${data.direccion || "A confirmar"}

🎯 *Objetivo:* ${data.descripcion ? data.descripcion.split(".")[0] + "." : "Realizar Práctica Profesional Supervisada."}

*Detalles Generales:*
⏱️ *Acredita:* ${data.horasAcreditadas} hs (${data.orientacion}).
👥 *Cupo:* ${data.cuposDisponibles} estudiantes.
📍 *Modalidad:* ${modalidad}

*Actividades / Cronograma:*
${activitiesLines || cronogramaText}

*Horarios:*
${cronogramaText}

*Fechas Clave:*
‼️ *INSCRIPCIÓN:* ${inscripcionText} ‼️
🚀 *Inicio:* ${data.fechaInicio ? formatDate(data.fechaInicio) : "A confirmar"}

🔗 *Inscripción desde Mi Panel*`;
};
