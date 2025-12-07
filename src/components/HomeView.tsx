
import React, { useMemo } from 'react';
import type { Convocatoria, LanzamientoPPS, EstudianteFields, CalendarEvent, InformeTask, TabId, CriteriosCalculados } from '../types';
import {
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_FECHA_INICIO_CONVOCATORIAS,
} from '../constants';
import { parseToUTCDate, getEspecialidadClasses, normalizeStringForComparison, formatDate, isValidLocation } from '../utils/formatters';
import Card from './Card';
import ConvocatoriaCard from './ConvocatoriaCard';
import EmptyState from './EmptyState';
import { useModal } from '../contexts/ModalContext';
import { fetchSeleccionados } from '../services/dataService';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';

interface HomeViewProps {
  myEnrollments: Convocatoria[];
  allLanzamientos: LanzamientoPPS[];
  lanzamientos: LanzamientoPPS[]; // Open convocatorias
  student: EstudianteFields | null;
  onInscribir: (lanzamiento: LanzamientoPPS) => void;
  institutionAddressMap: Map<string, string>;
  enrollmentMap: Map<string, Convocatoria>;
  completedLanzamientoIds: Set<string>;
  informeTasks: InformeTask[];
  onNavigate: (tabId: TabId) => void;
  criterios: CriteriosCalculados;
  onOpenFinalization: () => void;
}

const NextPracticeCard: React.FC<{ event: CalendarEvent; date: Date; isToday: boolean }> = ({ event, date, isToday }) => {
    return (
        <div 
            className="group relative p-5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-800 border-l-4 border-l-blue-600 dark:border-l-blue-500 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
        >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-start gap-4 flex-grow">
                    <div className="flex-shrink-0 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl h-12 w-12 flex items-center justify-center border border-blue-100 dark:border-blue-800">
                        <span className="material-icons !text-2xl">{isToday ? "today" : "event"}</span>
                    </div>
                    <div className="flex-grow">
                        <p className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wider uppercase mb-1">{isToday ? "HOY" : "MAÑANA"} &bull; {new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)}</p>
                        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">{event.name}</h2>
                        <div className="mt-3 space-y-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                            <p className="flex items-center gap-2">
                                <span className="material-icons !text-lg text-slate-400">schedule</span>
                                <span>{event.schedule}</span>
                            </p>
                             <p className="flex items-center gap-2">
                                <span className="material-icons !text-lg text-slate-400">location_on</span>
                                <span>{event.location}</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex-shrink-0 self-start sm:self-center ml-auto sm:ml-0">
                     {isValidLocation(event.location) && (
                         <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.location)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs py-2.5 px-4 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                        >
                            <span className="material-icons !text-sm">map</span>
                            Ver Mapa
                        </a>
                     )}
                </div>
            </div>
        </div>
    );
};

const UpcomingPracticeItem: React.FC<{ event: CalendarEvent; date: Date }> = ({ event, date }) => {
    return (
        <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700">
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">
                        {new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(date)}
                    </p>
                    <h4 className="font-bold text-slate-800 dark:text-slate-100 text-base">{event.name}</h4>
                </div>
                <span className={`${event.colorClasses.tag} mt-1`}>{event.orientation}</span>
            </div>
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-2 rounded-lg">
                    <span className="material-icons !text-base text-slate-400">schedule</span>
                    <span className="font-medium">{event.schedule}</span>
                </div>
                 <div className="flex items-start gap-2 px-1">
                    <span className="material-icons !text-base mt-0.5 text-slate-400">location_on</span>
                    <span>{event.location}</span>
                </div>
            </div>
        </div>
    );
};

const FinalizationReadyCard: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-6 shadow-xl shadow-emerald-900/20 text-white animate-fade-in-up cursor-default mb-8">
        <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl"></div>
        <div className="absolute bottom-0 left-0 -mb-4 -ml-4 h-24 w-24 rounded-full bg-white/10 blur-xl"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm text-white shadow-sm">
                    <span className="material-icons !text-3xl">military_tech</span>
                </div>
                <div>
                    <h2 className="text-2xl font-black tracking-tight">¡Objetivo Cumplido!</h2>
                    <p className="text-emerald-50 font-medium text-sm mt-1 max-w-md leading-relaxed opacity-90">
                        Has completado todos los requisitos. Ya estás listo para solicitar tu acreditación final.
                    </p>
                </div>
            </div>
            <button
                onClick={onClick}
                className="group flex-shrink-0 flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 font-bold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
            >
                <span>Iniciar Trámite</span>
                <span className="material-icons !text-xl transition-transform group-hover:translate-x-1">arrow_forward</span>
            </button>
        </div>
    </div>
);

const HomeView: React.FC<HomeViewProps> = ({ 
    myEnrollments, 
    allLanzamientos, 
    lanzamientos, 
    student, 
    onInscribir, 
    institutionAddressMap, 
    enrollmentMap, 
    completedLanzamientoIds, 
    criterios,
    onOpenFinalization
}) => {
    const { openSeleccionadosModal, showModal } = useModal();
    const { authenticatedUser } = useAuth();
    const isTesting = authenticatedUser?.legajo === '99999';

    const seleccionadosMutation = useMutation({
        mutationFn: (lanzamiento: LanzamientoPPS) => {
            if (isTesting && lanzamiento.id === 'lanz_mock_2') {
                 return Promise.resolve({
                    'Turno Mañana': [
                        { nombre: 'Ana Rodriguez (Ejemplo)', legajo: '99901' },
                        { nombre: 'Carlos Gomez (Ejemplo)', legajo: '99902' },
                    ],
                    'Turno Tarde': [
                        { nombre: 'Lucia Fernandez (Ejemplo)', legajo: '99903' },
                    ],
                });
            }
            return fetchSeleccionados(lanzamiento);
        },
        onSuccess: (data, lanzamiento) => {
            const title = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Convocatoria';
            openSeleccionadosModal(data, title);
        },
        onError: (error) => {
            showModal('Error', error.message);
        },
    });

    const allPracticeEvents = useMemo(() => {
        const events: { date: Date, event: CalendarEvent }[] = [];
        const dayMap: { [key: string]: number } = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 0 };
        
        const enrolledPractices = myEnrollments
            .filter(e => normalizeStringForComparison(e[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado')
            .map(enrollment => {
                let pps: LanzamientoPPS | undefined;
                const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
                if (lanzamientoId) pps = allLanzamientos.find(l => l.id === lanzamientoId);
                return pps ? { pps, enrollment } : null;
            })
            .filter((item): item is { pps: LanzamientoPPS, enrollment: Convocatoria } => item !== null);

        enrolledPractices.forEach(({ pps, enrollment }) => {
            const ppsStartDate = parseToUTCDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            const ppsEndDate = parseToUTCDate(pps[FIELD_FECHA_FIN_LANZAMIENTOS]);
            const schedule = (enrollment[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || '').trim();
            if (!schedule || !ppsStartDate || !ppsEndDate) return;
            
            const normalizedSchedule = normalizeStringForComparison(schedule);
            const scheduleDays = Object.keys(dayMap).filter(d => normalizedSchedule.includes(d) && !normalizedSchedule.includes(`no ${d}`));
            const scheduleDayNumbers = scheduleDays.map(d => dayMap[d]);

            for (let d = new Date(ppsStartDate); d <= ppsEndDate; d.setUTCDate(d.getUTCDate() + 1)) {
                if (scheduleDayNumbers.includes(d.getUTCDay())) {
                    const orientation = pps[FIELD_ORIENTACION_LANZAMIENTOS] || 'General';
                    events.push({
                        date: new Date(d),
                        event: {
                            id: pps.id,
                            name: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica',
                            schedule: schedule,
                            orientation: orientation,
                            location: pps[FIELD_DIRECCION_LANZAMIENTOS] || 'No especificada',
                            colorClasses: getEspecialidadClasses(orientation),
                            startDate: pps[FIELD_FECHA_INICIO_LANZAMIENTOS],
                            endDate: pps[FIELD_FECHA_FIN_LANZAMIENTOS],
                        }
                    });
                }
            }
        });
        return events.sort((a,b) => a.date.getTime() - b.date.getTime());
    }, [myEnrollments, allLanzamientos]);
    
    const nextPracticeForTodayOrTomorrow = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setUTCDate(today.getUTCDate() + 1);
        
        return allPracticeEvents.find(e => {
            const eventDate = new Date(e.date);
            eventDate.setUTCHours(0, 0, 0, 0);
            return eventDate.getTime() >= today.getTime() && (eventDate.getTime() === today.getTime() || eventDate.getTime() === tomorrow.getTime());
        });
    }, [allPracticeEvents]);
    
    const isToday = nextPracticeForTodayOrTomorrow ? new Date(nextPracticeForTodayOrTomorrow.date).setUTCHours(0,0,0,0) === new Date().setUTCHours(0,0,0,0) : false;

    const upcomingEvents = useMemo(() => {
        const today = new Date();
        today.setUTCHours(0,0,0,0);
        const startFilterDate = new Date(today);
        if (nextPracticeForTodayOrTomorrow) {
             const nextPracticeDate = new Date(nextPracticeForTodayOrTomorrow.date);
             nextPracticeDate.setUTCHours(0,0,0,0);
             startFilterDate.setTime(nextPracticeDate.getTime() + 24*60*60*1000); 
        } else {
            startFilterDate.setDate(today.getDate() + 1);
        }

        return allPracticeEvents.filter(e => e.date >= startFilterDate).slice(0, 4); 
    }, [allPracticeEvents, nextPracticeForTodayOrTomorrow]);

    // Validar que NO haya prácticas en curso antes de mostrar el cartel
    const canFinalize = criterios.cumpleHorasTotales && 
                        criterios.cumpleRotacion && 
                        criterios.cumpleHorasOrientacion && 
                        !criterios.tienePracticasPendientes;

    if (lanzamientos.length === 0 && allPracticeEvents.length === 0 && !canFinalize) {
        return <EmptyState icon="home" title="Todo Tranquilo" message="No tienes actividades pendientes ni hay convocatorias abiertas en este momento."/>;
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            
            {canFinalize && (
                <div className="hidden md:block">
                    <FinalizationReadyCard onClick={onOpenFinalization} />
                </div>
            )}

            <div className="space-y-6">
                {/* Próxima Práctica (Hero) */}
                <div>
                    {nextPracticeForTodayOrTomorrow ? (
                        <NextPracticeCard 
                            event={nextPracticeForTodayOrTomorrow.event} 
                            date={nextPracticeForTodayOrTomorrow.date} 
                            isToday={isToday} 
                        />
                    ) : (
                        <div className="p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700/60 flex items-center gap-5 bg-transparent">
                            <div className="flex-shrink-0 p-3 bg-slate-100 dark:bg-slate-800 rounded-full shadow-sm text-slate-400 dark:text-slate-500">
                                <span className="material-icons !text-3xl">event_available</span>
                            </div>
                            <div>
                                <h3 className="font-bold text-lg text-slate-700 dark:text-slate-200">Sin prácticas próximas</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400">No tienes actividades agendadas para los próximos días.</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Upcoming Practices List */}
                {upcomingEvents.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-extrabold text-slate-800 dark:text-slate-200 ml-1 flex items-center gap-2">
                            <span className="material-icons text-slate-400 !text-xl">calendar_today</span>
                            Próximas Fechas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {upcomingEvents.map(({date, event}) => (
                                <UpcomingPracticeItem key={`${event.id}-${date.toISOString()}`} event={event} date={date} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* SECTION: Open Convocatorias */}
            {lanzamientos.length > 0 && (
                <div className="mt-10 pt-8 border-t border-slate-200/80 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shadow-sm">
                            <span className="material-icons !text-2xl">campaign</span>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Convocatorias Abiertas</h2>
                            <p className="text-slate-600 dark:text-slate-400 text-sm font-medium">Nuevas oportunidades disponibles para postularte.</p>
                        </div>
                    </div>
                    <div className="space-y-5">
                    {lanzamientos.map((lanzamiento) => {
                        const enrollment = enrollmentMap.get(lanzamiento.id);
                        const enrollmentStatus = enrollment ? enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] : null;

                        const ppsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                        const groupName = ppsName.split(' - ')[0].trim();
                        const isCompleted = completedLanzamientoIds.has(lanzamiento.id) || completedLanzamientoIds.has(normalizeStringForComparison(groupName));
                        
                        const lanzamientoDireccion = lanzamiento[FIELD_DIRECCION_LANZAMIENTOS];
                        const institutionName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                        const fallbackDireccion = institutionName ? institutionAddressMap.get(normalizeStringForComparison(institutionName)) : undefined;
                        const finalDireccion = lanzamientoDireccion || fallbackDireccion;
                        
                        return (
                        <ConvocatoriaCard 
                            key={lanzamiento.id} 
                            lanzamiento={lanzamiento}
                            enrollmentStatus={enrollmentStatus}
                            onInscribir={onInscribir}
                            onVerSeleccionados={(l) => seleccionadosMutation.mutate(l)}
                            isVerSeleccionadosLoading={seleccionadosMutation.isPending && seleccionadosMutation.variables?.id === lanzamiento.id}
                            isCompleted={isCompleted}
                            userGender={student?.genero as "Varon" | "Mujer" | "Otro" | undefined} // Cast here
                            direccion={finalDireccion}
                        />
                        );
                    })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomeView;
