import React, { useState } from "react";
import ConvocatoriaCardPremium, {
  ConvocatoriaDetailProps,
} from "../components/ConvocatoriaCardPremium";

const DesignSystemView: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  // Toggle helper for testing
  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const sampleData: ConvocatoriaDetailProps = {
    id: "1",
    nombre: "PPS: Randstad",
    orientacion: "Laboral",
    direccion: "Alderete 200, Neuquén Capital",
    descripcion:
      "Esta práctica se desarrolla en la consultora de recursos humanos Randstad. El objetivo es que los estudiantes desarrollen habilidades en el área de Talent Acquisition (Selección de Personal), participando activamente en procesos de reclutamiento y selección de perfiles para diversas industrias.",
    actividades: [
      "Participación en procesos de reclutamiento y selección.",
      "Selección de perfiles para diversas industrias.",
      "Desarrollo de habilidades en Talent Acquisition.",
    ],
    horasAcreditadas: "80 horas de Laboral",
    horariosCursada: "Miércoles y Jueves 10 a 13 hs",
    cupo: "4 Estudiantes",
    requisitoObligatorio: "Subir CV actualizado.",
    timeline: {
      inscripcion: "24/01 - 28/01",
      inicio: "17 de Diciembre",
      fin: "Marzo 2026",
    },
    logoUrl:
      "https://ui-avatars.com/api/?name=Randstad&background=0D8ABC&color=fff&size=128&rounded=false&bold=true",
    status: "abierta",
  };

  const sampleDataClinica: ConvocatoriaDetailProps = {
    ...sampleData,
    id: "2",
    nombre: "H. Castro Rendón",
    orientacion: "Clinica",
    descripcion:
      "Práctica clínica en el Hospital Regional. Rotación por servicios de Salud Mental y Adicciones.",
    logoUrl: undefined, // Test default monogram
    actividades: [
      "Entrevistas de admisión.",
      "Participación en ateneos clínicos.",
      "Observación de grupos terapéuticos.",
    ],
    horasAcreditadas: "120 horas de Clínica",
  };

  return (
    <div
      className={`min-h-screen p-8 transition-colors duration-300 ${isDark ? "bg-slate-950" : "bg-slate-50"}`}
    >
      {/* Header with Dark Mode Toggle */}
      <div className="max-w-7xl mx-auto mb-12 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Design System: Premium Cards
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Prototipo de visualización para nuevas convocatorias.
          </p>
        </div>
        <button
          onClick={toggleTheme}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded-lg font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
        >
          {isDark ? "☀️ Light Mode" : "🌙 Dark Mode"}
        </button>
      </div>

      <div className="max-w-5xl mx-auto space-y-16">
        {/* Case 0: The "Fundación Tiempo" Snippet Adapted to Horizon */}
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200">
            Adaptación: Fundación Tiempo (Datos del Snippet)
          </div>
          <ConvocatoriaCardPremium
            id="ft-1"
            nombre="PPS Verano: Fundación Tiempo"
            orientacion="Clínica con Adultos (Virtual)"
            direccion="Modalidad Virtual"
            descripcion="Esta práctica de verano ofrece una experiencia analítica en la clínica con adultos. Se trabajará en un taller virtual de articulación teórico-clínica, analizando entrevistas de admisión y tratamientos en curso. El objetivo es profundizar en la escucha analítica, el diagnóstico diferencial y la dirección de la cura, integrando conceptos con la experiencia clínica."
            actividades={[
              "Introducción: ¿Cómo escucha un analista? La puntuación de la demanda.",
              "Proceso de Admisión: Modos de presentación, motivo de consulta, urgencias.",
              "Dispositivo Analítico: Instalación de la transferencia y estructuras clínicas.",
              "Modalidad: Taller virtual semanal de análisis de casos clínicos.",
            ]}
            horasAcreditadas="30 horas de Clínica"
            horariosCursada="Miércoles de 12:30 a 14:00 hs"
            cupo="Sin Límite"
            requisitoObligatorio="Mantener actualizados los datos de contacto."
            timeline={{
              inscripcion: "Hoy al Miércoles",
              inicio: "4 de Febrero 2026",
              fin: "25 de Marzo 2026",
            }}
            logoUrl="https://ui-avatars.com/api/?name=FT&background=2E86C1&color=fff&size=128&rounded=false"
            status="abierta"
          />
        </div>

        {/* Case 1: Standard / Default */}
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200">
            Estado: Default (Para Inscribirse)
          </div>
          <ConvocatoriaCardPremium {...sampleData} />
        </div>

        {/* Case 2: Inscripto */}
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200">
            Estado: Inscripto
          </div>
          <ConvocatoriaCardPremium {...sampleDataClinica} estadoInscripcion="inscripto" />
        </div>

        {/* Case 3: Seleccionado */}
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200">
            Estado: Seleccionado
          </div>
          <ConvocatoriaCardPremium
            {...sampleData}
            id="3"
            nombre="Pan American Energy"
            logoUrl="https://ui-avatars.com/api/?name=PAE&background=fbbf24&color=000&size=128&rounded=false&bold=true"
            estadoInscripcion="seleccionado"
          />
        </div>

        {/* Case 4: No Seleccionado */}
        <div>
          <div className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-400 pb-2 border-b border-slate-200">
            Estado: No Seleccionado
          </div>
          <ConvocatoriaCardPremium
            {...sampleDataClinica}
            id="4"
            nombre="Clínica San Lucas"
            estadoInscripcion="no_seleccionado"
          />
        </div>
      </div>
    </div>
  );
};

export default DesignSystemView;
