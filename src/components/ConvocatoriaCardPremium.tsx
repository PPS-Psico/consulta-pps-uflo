import React, { useState } from "react";
import { getEspecialidadClasses } from "../utils/formatters";

export interface ConvocatoriaDetailProps {
  id: string;
  nombre: string;
  orientacion: string;
  direccion: string;
  descripcion: string;
  actividades: string[];
  actividadesLabel?: string; // New prop
  horasAcreditadas: string;
  horariosCursada: string;
  cupo: string;
  requisitoObligatorio: string;
  reqCv?: boolean; // New prop
  timeline: {
    inscripcion: string;
    inicio: string;
    fin: string;
  };
  logoUrl?: string; // Optional company logo
  status?: string; // 'abierta', 'cerrada', etc.
  estadoInscripcion?: "inscripto" | "seleccionado" | "no_seleccionado" | null;
  onInscribirse?: () => void;
  onVerConvocados?: () => void;
  invertLogo?: boolean;
  horariosFijos?: boolean;
  isCompleted?: boolean; // Prevents enrollment if student already completed this PPS
}

const ConvocatoriaCardPremium: React.FC<ConvocatoriaDetailProps> = ({
  nombre,
  orientacion,
  direccion,
  descripcion,
  actividades,
  actividadesLabel = "Actividades",
  horasAcreditadas,
  horariosCursada,
  cupo,
  requisitoObligatorio,
  reqCv = false,
  timeline,
  status = "abierta",
  estadoInscripcion = null,
  onInscribirse,
  onVerConvocados,
  horariosFijos = false,
  isCompleted = false,
}) => {
  // Theme based on orientation - used for tags and accents, but timeline has its own evolution
  const theme = getEspecialidadClasses(orientacion);
  const [isHovered, setIsHovered] = useState(false);

  const [isExpanded, setIsExpanded] = useState(false);

  // --- Dynamic Button Logic ---
  const getButtonConfig = () => {
    // Shared base classes for all states to maintain sizing
    const baseClasses =
      "px-6 py-2.5 rounded-[14px] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all duration-300 min-w-[140px] md:min-w-[160px] relative overflow-hidden h-10 md:h-11 border shadow-sm";

    // PRIORITY 1: If already completed, block enrollment entirely
    if (isCompleted) {
      return {
        text: "YA REALIZADA",
        icon: "check_circle",
        classes: `${baseClasses} bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed opacity-70`,
        disabled: true,
      };
    }

    const estadoLower = estadoInscripcion?.toLowerCase();

    if (estadoLower === "seleccionado") {
      return {
        text: "SELECCIONADO",
        icon: "stars",
        classes: `${baseClasses} bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-600 dark:to-teal-700 text-white border-transparent shadow-emerald-500/20 active:scale-95`,
        disabled: false, // Clickable to see convocados or detail
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onVerConvocados?.();
        },
      };
    }

    if (estadoLower === "inscripto") {
      return {
        text: "INSCRIPTO",
        icon: "how_to_reg",
        // Professional teal/slate feel for "pending/sent"
        classes: `${baseClasses} bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 border-indigo-200/50 dark:border-indigo-800/50 cursor-default opacity-90 shadow-none`,
        disabled: true,
      };
    }

    if (
      estadoLower === "no_seleccionado" ||
      status?.toLowerCase() === "cerrada" ||
      status?.toLowerCase() === "cerrado"
    ) {
      const isNoSeleccionado = estadoLower === "no_seleccionado";
      return {
        text: isNoSeleccionado ? "CERRADA" : "VER RESULTADOS",
        icon: "groups",
        // Replaced slate grey with a premium Indigo/Violet theme
        classes: `${baseClasses} bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-700 active:scale-95`,
        disabled: false,
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation();
          onVerConvocados?.();
        },
      };
    }

    // Default: Abierta y no inscripto - Premium Gradient Button
    return {
      text: "INSCRIBIRSE",
      icon: "arrow_forward",
      classes: `${baseClasses} bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-indigo-600 dark:to-blue-600 text-white border-transparent shadow-blue-500/20 dark:shadow-indigo-900/40 active:scale-95 group/btn`,
      content: (
        <>
          <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover/btn:animate-[shimmer-slide_1.5s_infinite] pointer-events-none" />
          <span className="relative z-10">INSCRIBIRSE</span>
        </>
      ),
      disabled: false,
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        onInscribirse?.();
      },
    };
  };

  const btnConfig = getButtonConfig();

  // Logic for hiding requirements when CV is not requested
  const showRequisitoMetric = reqCv && requisitoObligatorio;
  const showCvMetric = reqCv;

  return (
    <article
      className={`
        w-full relative overflow-hidden flex flex-col
        rounded-[24px] 
        bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950
        border border-slate-200/60 dark:border-slate-800/60
        transition-all duration-500 ease-out
        group cursor-pointer
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => setIsExpanded(!isExpanded)}
      style={{
        transform: isHovered && !isExpanded ? "translateY(-4px)" : "translateY(0)",
        boxShadow: isHovered
          ? "0 20px 40px -5px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,0,0,0.02)"
          : "0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)",
      }}
    >
      {/* Top Accent Line - Theme based */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.gradient}`} />

      {/* ─── 1. HEADER SECTION (Always Visible) ─── */}
      <div className="p-6 md:p-8 flex flex-col md:flex-row md:items-start justify-between gap-6 relative z-10">
        {/* Brand & Title */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          <div>
            <div className="flex items-start justify-between gap-4">
              <h2 className="text-lg md:text-2xl font-black text-slate-800 dark:text-white leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2">
                {nombre}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span
                className={`px-2.5 py-0.5 rounded-lg text-[10px] uppercase font-black tracking-wider border ${theme.tag}`}
              >
                {orientacion}
              </span>

              {/* Logic: Hours only visible when collapsed. Address always visible but position shifts naturally. */}
              {!isExpanded && (
                <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  <span className="material-icons !text-sm">schedule</span>
                  {horasAcreditadas}hs
                </span>
              )}

              {/* Location Tag - Moved to Header */}
              {(() => {
                const isVirtual = direccion.toLowerCase().includes("virtual");
                const TagComponent = isVirtual ? "span" : "a";
                const linkProps = isVirtual
                  ? {}
                  : {
                      href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}`,
                      target: "_blank",
                      rel: "noopener noreferrer",
                    };

                return (
                  <TagComponent
                    {...linkProps}
                    onClick={(e: React.MouseEvent) => !isVirtual && e.stopPropagation()}
                    className={`
                                            inline-flex items-center gap-1 text-[10px] uppercase font-black px-2.5 py-1 rounded-lg transition-colors group/addr border
                                            ${
                                              isVirtual
                                                ? "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800"
                                                : "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
                                            }
                                        `}
                    title={isVirtual ? "Modalidad Virtual" : "Ver Ubicación en Mapa"}
                  >
                    <span
                      className={`material-icons !text-sm ${isVirtual ? "" : "text-indigo-500 group-hover/addr:text-indigo-700"} transition-colors`}
                    >
                      {isVirtual ? "wifi" : "location_on"}
                    </span>
                    <span
                      className={`whitespace-normal leading-tight ${!isVirtual && "group-hover/addr:underline decoration-indigo-500/30 underline-offset-2"} transition-all`}
                    >
                      {direccion}
                    </span>
                  </TagComponent>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Right Side: Button & Chevron */}
        <div className="flex items-center gap-3 self-start">
          {/* Action Button - Always visible here */}
          <button
            disabled={btnConfig.disabled}
            onClick={btnConfig.onClick}
            className={btnConfig.classes}
          >
            {btnConfig.content || <span>{btnConfig.text}</span>}
            {btnConfig.icon && (
              <span className="material-icons !text-lg relative z-10">{btnConfig.icon}</span>
            )}
          </button>

          {/* Chevron Toggle */}
          <div
            className={`
                        hidden md:flex w-10 h-10 rounded-full items-center justify-center
                        bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500
                        transition-all duration-300 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700
                        ${isExpanded ? "rotate-180 bg-blue-50 text-blue-500" : ""}
                    `}
          >
            <span className="material-icons">expand_more</span>
          </div>
        </div>
      </div>

      {/* ─── EXPANDABLE CONTENT ─── */}
      <div
        className={`grid transition-all duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          {/* ─── 2. METRICS ROW ─── */}
          <div className="px-6 md:px-8 pb-6">
            <div
              className={`grid grid-cols-2 md:grid-cols-3 ${reqCv ? "lg:grid-cols-5" : "lg:grid-cols-4"} gap-3`}
            >
              {/* Updated Hours Metric Format */}
              <MetricItem
                icon="schedule"
                label="ACREDITA"
                value={`${horasAcreditadas} horas de ${orientacion}`}
                theme="indigo"
              />

              <MetricItem
                icon="event_available"
                label={horariosFijos ? "HORARIOS FIJOS" : "HORARIOS"}
                value={horariosCursada}
                theme={horariosFijos ? "teal" : "blue"}
                className={!reqCv ? "lg:col-span-2" : ""}
              />

              <MetricItem icon="group" label="Cupos" value={cupo} theme="teal" />

              {showRequisitoMetric && (
                <MetricItem
                  icon="verified_user"
                  label="Requisito"
                  value={requisitoObligatorio}
                  theme="amber"
                />
              )}

              {showCvMetric && (
                <MetricItem
                  icon="description"
                  label="Documentación"
                  value="Obligatorio Adjuntar CV"
                  theme="amber"
                />
              )}
            </div>
          </div>

          {/* Separator with Gradient Fade */}
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent dark:via-slate-800" />

          {/* ─── 3. CONTENT BODY ─── */}
          <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-10">
            {/* Description */}
            <div className="flex-1">
              <SectionHeader icon="info_outline" title="Descripción" color="text-indigo-400" />
              <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed text-justify font-medium">
                {descripcion}
              </p>
            </div>

            {/* Activities List (Stacked full width) */}
            <div className="lg:w-[45%] flex flex-col gap-8">
              {/* Schedule Section (If complex) */}
              {(() => {
                const isComplex =
                  horariosCursada.includes(";") ||
                  horariosCursada.includes("\n") ||
                  horariosCursada.length > 40;
                if (!isComplex) return null;

                const scheduleItems = horariosCursada
                  .split(";")
                  .map((s) => s.trim())
                  .filter(Boolean);

                return (
                  <div className="flex flex-col">
                    <SectionHeader
                      icon="calendar_month"
                      title="Días y Horarios"
                      color="text-blue-400"
                    />
                    <div className="flex flex-col gap-2 w-full">
                      {scheduleItems.map((item, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30"
                        >
                          <span className="material-icons !text-sm text-blue-500 mt-0.5">
                            check_circle
                          </span>
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {item}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-col">
                <SectionHeader icon="task_alt" title={actividadesLabel} color="text-teal-400" />
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3 w-full">
                  {actividades.map((act, i) => (
                    <div
                      key={i}
                      className={`
                                            w-full flex items-center px-4 py-3 rounded-xl
                                            bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/60
                                            hover:border-blue-200 dark:hover:border-blue-500/50 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300
                                        `}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-3 flex-shrink-0 bg-gradient-to-br ${theme.gradient || "from-blue-400 to-indigo-400"}`}
                      />
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                        {act}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── 4. TIMELINE FOOTER ─── */}
          <div className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800 p-6 md:px-8 mt-auto backdrop-blur-sm">
            <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8 flex items-center gap-2">
              <span className="material-icons !text-base">timeline</span>
              Cronograma Evolutivo
            </h3>

            <div className="relative isolate mb-8">
              {/* Connector Line (Multi-Color Gradient) */}
              <div className="absolute top-[18px] left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-400 via-blue-400 to-emerald-400 opacity-30 hidden md:block rounded-full transform -translate-y-1/2" />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-0">
                {/* Point 1: Inscripción (Indigo/Violet) */}
                <TimelinePoint
                  title="Inscripción"
                  date={timeline.inscripcion}
                  icon="edit_calendar"
                  colorClass="text-indigo-600"
                  bgClass="bg-indigo-100"
                  borderClass="border-indigo-500"
                  ringClass="ring-indigo-100"
                />

                {/* Point 2: Inicio (Blue) */}
                <TimelinePoint
                  title="Inicio"
                  date={timeline.inicio}
                  icon="play_arrow"
                  isCenter
                  colorClass="text-blue-600"
                  bgClass="bg-blue-100"
                  borderClass="border-blue-500"
                  ringClass="ring-blue-100"
                />

                {/* Point 3: Finalización (Emerald/Green) */}
                <TimelinePoint
                  title="Finalización"
                  date={timeline.fin}
                  icon="flag"
                  isLast
                  colorClass="text-emerald-600"
                  bgClass="bg-emerald-100"
                  borderClass="border-emerald-500"
                  ringClass="ring-emerald-100"
                />
              </div>
            </div>

            {/* CTA Button AREA in Expanded View */}
            {/* Button moved to header */}
          </div>
        </div>
      </div>
    </article>
  );
};

// ─── SUB COMPONENTS ───

const SectionHeader: React.FC<{ icon: string; title: string; color?: string }> = ({
  icon,
  title,
  color = "text-slate-300",
}) => (
  <h3 className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
    <span className={`material-icons !text-lg ${color}`}>{icon}</span>
    {title}
  </h3>
);

// Updated MetricItem with colored themes
const MetricItem: React.FC<{
  icon: string;
  label: string;
  value: string;
  theme?: "slate" | "indigo" | "blue" | "teal" | "amber";
  className?: string;
}> = ({ icon, label, value, theme = "slate", className = "" }) => {
  const themeStyles = {
    slate:
      "bg-slate-50/50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 text-slate-400",
    indigo:
      "bg-indigo-50/60 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30 text-indigo-500",
    blue: "bg-blue-50/60 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800/30 text-blue-500",
    teal: "bg-teal-50/60 dark:bg-teal-900/10 border-teal-100 dark:border-teal-800/30 text-teal-500",
    amber:
      "bg-amber-50/80 dark:bg-amber-900/10 border-amber-100 dark:border-amber-800/30 ring-4 ring-amber-50/50 dark:ring-transparent text-amber-500",
  };

  const activeStyle = themeStyles[theme];

  return (
    <div
      className={`
      p-3 md:p-4 rounded-2xl flex flex-col justify-center gap-1.5 border
      ${activeStyle}
      transition-all hover:scale-[1.02] duration-300 text-center
      ${className}
    `}
      title={value}
    >
      <div className="flex items-center justify-center gap-1.5 mb-1">
        <span className="material-icons !text-lg">{icon}</span>
      </div>
      <div className="text-[10px] uppercase font-black opacity-70 tracking-wider leading-none">
        {label}
      </div>
      <div className="text-sm font-bold text-slate-800 dark:text-slate-100 line-clamp-2 leading-tight">
        {value}
      </div>
    </div>
  );
};

interface TimelinePointProps {
  title: string;
  date: string;
  icon: string;
  isCenter?: boolean;
  isLast?: boolean;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  ringClass: string;
}

const TimelinePoint: React.FC<TimelinePointProps> = ({
  title,
  date,
  icon,
  isCenter,
  isLast,
  colorClass,
  bgClass,
  borderClass,
  ringClass,
}) => {
  return (
    <div
      className={`relative flex md:flex-col items-center md:items-start gap-4 md:gap-3 group/point ${isCenter ? "md:items-center" : ""} ${isLast ? "md:items-end" : ""}`}
    >
      {/* Marker - Desktop (Premium Colored) */}
      <div
        className={`
        hidden md:flex relative z-10 w-10 h-10 rounded-full items-center justify-center border-[3px]
        bg-white dark:bg-slate-800 shadow-md ${borderClass} group-hover/point:scale-110 transition-transform duration-300
      `}
      >
        <span className={`material-icons !text-sm ${colorClass}`}>{icon}</span>
        {/* Subtle colored ring */}
        <div className={`absolute inset-0 rounded-full ring-4 ${ringClass} opacity-40`} />
      </div>

      {/* Marker - Mobile (Simple Colored) */}
      <div
        className={`
        md:hidden w-8 h-8 rounded-full flex items-center justify-center ${bgClass} ${colorClass}
      `}
      >
        <span className="material-icons !text-sm">{icon}</span>
      </div>

      <div
        className={`flex flex-col ${isCenter ? "md:items-center" : ""} ${isLast ? "md:items-end" : ""}`}
      >
        <span className={`text-[10px] font-black uppercase tracking-widest mb-1 ${colorClass}`}>
          {title}
        </span>
        <span className={`text-sm font-bold text-slate-800 dark:text-white`}>{date}</span>
      </div>
    </div>
  );
};

export default ConvocatoriaCardPremium;
