
import React, { useState, useCallback, useMemo } from 'react';
import { useMetricsData } from '../hooks/useMetricsData';
import type { StudentInfo } from '../types';
import EmptyState from './EmptyState';
import StudentListModal from './StudentListModal';
import Card from './Card';
import MetricCard from './MetricCard';
import HeroMetric from './MetricHero';
import FunnelRow from './MetricFunnel';
import { MetricsSkeleton } from './Skeletons';
import EnrollmentTrendChart from './Charts/EnrollmentTrendChart';
import OrientationDistributionChart from './Charts/OrientationDistributionChart';
import { normalizeStringForComparison } from '../utils/formatters';

type ModalData = {
  title: string;
  students: StudentInfo[];
  headers?: { key: string; label: string }[];
  description?: React.ReactNode;
};

const Tabs: React.FC<{ active: string; onChange: (t: string) => void }> = ({ active, onChange }) => {
  const tabs = [
    { key: 'overview', label: 'Resumen', icon: 'dashboard' },
    { key: 'students', label: 'Estudiantes', icon: 'groups' },
    { key: 'institutions', label: 'Instituciones', icon: 'apartment' },
  ];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const activeTabInfo = tabs.find(t => t.key === active) || tabs[0];

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (key: string) => {
    onChange(key);
    setIsDropdownOpen(false);
  };
  
  return (
    <div className="mt-4">
      <div ref={dropdownRef} className="relative lg:hidden">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-800/50 dark:border-slate-700 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="material-icons !text-xl text-blue-600 dark:text-blue-400">{activeTabInfo.icon}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{activeTabInfo.label}</span>
          </div>
          <span className={`material-icons text-slate-500 dark:text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
        </button>
        {isDropdownOpen && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 z-10 animate-fade-in-up">
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => handleSelect(t.key)}
                className="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 first:rounded-t-xl last:rounded-b-xl"
              >
                <span className="material-icons !text-xl text-slate-500 dark:text-slate-400">{t.icon}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="hidden lg:inline-flex p-1 rounded-xl border bg-white dark:bg-slate-800/50 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-800 ${
              active === t.key ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
          >
            <span className="material-icons !text-base">{t.icon}</span>
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

interface MetricsDashboardProps {
  onStudentSelect?: (student: { legajo: string; nombre: string }) => void;
  isTestingMode?: boolean;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [proximosModalOpen, setProximosModalOpen] = useState(false);
  const [targetYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'institutions'>('overview');

  const openModal = useCallback((payload: ModalData) => setModalData(payload), []);
  const closeModal = useCallback(() => setModalData(null), []);

  const { data: metrics, isLoading, error, refetch, isFetching } = useMetricsData({ targetYear, isTestingMode });

  const totalCuposMesActual = metrics ? (metrics.lanzamientosMesActual as any[]).reduce((acc: number, group: any) => acc + (group.totalCupos || 0), 0) : 0;
  const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

  // Process data for charts
  const chartsData = useMemo(() => {
    if (!metrics || !metrics.rawStudents) return { trend: [], distribution: [] };

    // 1. Orientation Distribution
    const orientationCounts: Record<string, number> = {};
    metrics.rawStudents.forEach((s: any) => {
        // Only count ACTIVE students for distribution
        if (s.isFinished) return;
        
        const orientation = s.orientacion || 'Sin definir';
        const normalized = normalizeStringForComparison(orientation);
        const label = normalized.charAt(0).toUpperCase() + normalized.slice(1);
        orientationCounts[label] = (orientationCounts[label] || 0) + 1;
    });
    
    const distribution = Object.entries(orientationCounts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    // 2. Active Students Evolution (Calculated monthly)
    const trendData: { month: string, value: number }[] = [];
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIndex = now.getMonth();

    for (let i = 0; i <= currentMonthIndex; i++) {
        // Snapshot date: Last day of the month
        const monthEnd = new Date(currentYear, i + 1, 0, 23, 59, 59);
        
        let activeCount = 0;
        
        metrics.rawStudents.forEach((s: any) => {
            // FILTRO DE COHERENCIA: Solo contamos a los que tienen actividad este año.
            // Esto alinea el gráfico con la métrica "Alumnos Activos" (173 vs 184).
            // Si queremos ver matrícula pura (inactivos incluidos), quitar esta línea.
            if (!s.hasActivityThisYear) return;

            // Use effectiveStartDate calculated in the hook (handles historic backdating)
            // Fallback to createdAt if for some reason effective is missing
            const startDateStr = s.effectiveStartDate || s.createdAt;
            const start = startDateStr ? new Date(startDateStr) : null;
            const finalizedAt = s.finalizedAt ? new Date(s.finalizedAt) : null;

            // Student was active in month 'i' IF:
            // 1. They "started" (created or first practice) ON or BEFORE the end of this month.
            const isActiveByDate = start && start <= monthEnd;
            
            // 2. They were NOT finalized BEFORE the end of this month.
            const isNotFinalizedYet = !finalizedAt || finalizedAt > monthEnd;

            if (isActiveByDate && isNotFinalizedYet) {
                activeCount++;
            }
        });

        trendData.push({
            month: MONTH_NAMES[i],
            value: activeCount
        });
    }

    return { distribution, trend: trendData };
  }, [metrics]);


  if (isLoading) return <MetricsSkeleton />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <EmptyState
          icon="error"
          title="Error al cargar métricas"
          message={(error as any).message}
          action={
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="material-icons">refresh</span>
              Reintentar
            </button>
          }
        />
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <>
      <StudentListModal
        isOpen={!!modalData}
        onClose={closeModal}
        title={modalData?.title || ''}
        students={modalData?.students || []}
        headers={modalData?.headers}
        description={modalData?.description}
      />
      
      <StudentListModal
        isOpen={proximosModalOpen}
        onClose={() => setProximosModalOpen(false)}
        title="Alumnos Próximos a Finalizar"
        students={metrics.alumnosProximosAFinalizar.list as StudentInfo[]}
        headers={[
            { key: 'nombre', label: 'Nombre' },
            { key: 'legajo', label: 'Legajo' },
            { key: 'totalHoras', label: 'Horas Totales' },
        ]}
        onStudentClick={(student) => {
            if (onStudentSelect) {
                onStudentSelect({ legajo: student.legajo, nombre: student.nombre });
                setProximosModalOpen(false);
            }
        }}
      />

      <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Dashboard de Resumen
          </h2>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <span className="material-icons !text-base animate-spin-slow">autorenew</span>
              Actualizando
            </span>
          )}
      </div>

      <Tabs active={activeTab} onChange={(t) => setActiveTab(t as any)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        <HeroMetric
            title="Cupos Ofrecidos"
            value={metrics.cuposOfrecidos.value}
            icon="supervisor_account"
            description={`El número con relevamiento profesional es: ${metrics.cuposTotalesConRelevamiento.value}`}
            onClick={() =>
            openModal({
                title: `PPS Lanzadas (${targetYear})`,
                students: metrics.ppsLanzadas.list as StudentInfo[],
                headers: [
                { key: 'nombre', label: 'Institución' },
                { key: 'legajo', label: 'Info' },
                { key: 'cupos', label: 'Cupos' },
                ],
            })
            }
            color="indigo"
        />
        <HeroMetric
            title="Estudiantes Activos"
            value={metrics.alumnosActivos.value}
            icon="school"
            description="Total de estudiantes que aún no finalizan."
            onClick={() => openModal({ title: 'Estudiantes Activos', students: metrics.alumnosActivos.list as StudentInfo[] })}
            color="blue"
        />
        <HeroMetric
            title="Alumnos Finalizados"
            value={metrics.alumnosFinalizados.value}
            icon="military_tech"
            description="Histórico de egresados detectados."
            onClick={() => openModal({ title: `Alumnos Finalizados (Total)`, students: metrics.alumnosFinalizados.list as StudentInfo[] })}
            color="emerald"
        />
      </div>

      {activeTab === 'overview' && (
        <div className="mt-8 space-y-8 animate-fade-in-up">
            
            {/* NEW CHARTS SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <EnrollmentTrendChart data={chartsData.trend} />
                 <OrientationDistributionChart data={chartsData.distribution} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card icon="filter_alt" title="Embudo de Estudiantes" description="Desglose de los estudiantes activos.">
                <div className="mt-4 space-y-2 divide-y divide-slate-200/60 dark:divide-slate-700/60">
                    <FunnelRow
                    label="Con PPS Activa"
                    value={metrics.alumnosEnPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-emerald-500"
                    description="Estudiantes con una práctica activa durante el ciclo."
                    onClick={() =>
                        openModal({
                        title: 'Alumnos con PPS Activa',
                        students: metrics.alumnosEnPPS.list as StudentInfo[],
                        headers: [
                            { key: 'nombre', label: 'Nombre' },
                            { key: 'legajo', label: 'Legajo' },
                            { key: 'institucion', label: 'Institución' },
                            { key: 'fechaFin', label: 'Finaliza' },
                        ],
                        })
                    }
                    />
                    <FunnelRow
                    label="Próximos a Finalizar"
                    value={metrics.alumnosProximosAFinalizar.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-sky-500"
                    description="Con 230+ horas o con 250+ y práctica en curso."
                    onClick={() => setProximosModalOpen(true)}
                    />
                    <FunnelRow
                    label="Activos sin NINGUNA PPS"
                    value={metrics.alumnosSinNingunaPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-rose-500"
                    description="No tienen ninguna práctica registrada."
                    onClick={() =>
                        openModal({
                        title: 'Alumnos sin NINGUNA PPS (Total)',
                        students: metrics.alumnosSinNingunaPPS.list as StudentInfo[],
                        })
                    }
                    />
                </div>
                </Card>

                <Card icon="campaign" title="Lanzamientos del Mes Actual" description={`Total de instituciones con PPS lanzadas en ${MONTH_NAMES[new Date().getMonth()]}.`}>
                    <div className="mt-4 grid grid-cols-2 gap-4 divide-x divide-slate-200/70 dark:divide-slate-700/70 border-b border-slate-200/70 dark:border-slate-700/70 pb-4">
                        <div className="text-center px-2">
                            <p className="text-5xl font-black text-slate-800 dark:text-slate-100">{metrics.lanzamientosMesActual.length}</p>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Instituciones</p>
                        </div>
                        <div className="text-center px-2">
                            <p className="text-5xl font-black text-slate-800 dark:text-slate-100">{totalCuposMesActual}</p>
                            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1">Cupos Ofrecidos</p>
                        </div>
                    </div>
                    {metrics.lanzamientosMesActual.length > 0 ? (
                        <ul className="mt-4 space-y-3">
                            {metrics.lanzamientosMesActual.map((group) => (
                                <li key={group.groupName} className="text-sm p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-slate-800 dark:text-slate-100">{group.groupName}</span>
                                        <span className="text-xs font-bold text-blue-700 dark:text-blue-200 bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 rounded-full">
                                            {group.totalCupos} cupos
                                        </span>
                                    </div>
                                    {group.variants.length > 1 && (
                                        <details className="mt-2 text-xs group/details">
                                            <summary className="cursor-pointer text-slate-500 dark:text-slate-400 font-medium list-none flex items-center gap-1">
                                                Ver desglose ({group.variants.length})
                                                <span className="material-icons !text-sm transition-transform duration-200 group-open/details:rotate-180">expand_more</span>
                                            </summary>
                                            <ul className="pl-4 mt-2 pt-2 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
                                                {group.variants.map(variant => (
                                                    <li key={variant.id} className="flex justify-between items-center">
                                                        <span className="text-slate-600 dark:text-slate-300">{variant.name.replace(`${group.groupName} - `, '')}</span>
                                                        <span className="font-mono text-slate-500 dark:text-slate-400">{variant.cupos} cupos</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </details>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-4 text-sm text-center text-slate-500 dark:text-slate-400">No hubo lanzamientos este mes.</p>
                    )}
                </Card>
            </div>
        </div>
        )}

        {activeTab === 'students' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            <MetricCard
                title="Estudiantes Activos (Total)"
                value={metrics.alumnosActivos.value}
                icon="school"
                description="Total de estudiantes que aún no finalizan."
                isLoading={false}
                onClick={() => openModal({ title: 'Estudiantes Activos (Total)', students: metrics.alumnosActivos.list as StudentInfo[] })}
            />
            <MetricCard
                title="Con PPS Activa"
                value={metrics.alumnosEnPPS.value}
                icon="work"
                description="Estudiantes con una práctica activa durante el ciclo."
                isLoading={false}
                onClick={() => openModal({ title: 'Alumnos con PPS Activa', students: metrics.alumnosEnPPS.list as StudentInfo[], headers: [{ key: 'nombre', label: 'Nombre' }, { key: 'legajo', label: 'Legajo' }, { key: 'institucion', label: 'Institución' }, { key: 'fechaFin', label: 'Finaliza' }] })}
            />
            <MetricCard
            title="Estudiantes con PPS este año"
            value={metrics.alumnosConPpsEsteAno.value}
            icon="transfer_within_a_station"
            description={`Alumnos que realizaron al menos una práctica durante el ciclo ${targetYear}.`}
            isLoading={false}
            onClick={() => openModal({ title: `Estudiantes con PPS en ${targetYear}`, students: metrics.alumnosConPpsEsteAno.list as StudentInfo[] })}
            />
            <MetricCard
            title="Activos sin PPS este año"
            value={metrics.alumnosActivosSinPpsEsteAno.value}
            icon="person_off"
            description={`Estudiantes activos que no realizaron prácticas en ${targetYear}.`}
            isLoading={false}
            onClick={() => openModal({ title: `Activos sin PPS en ${targetYear}`, students: metrics.alumnosActivosSinPpsEsteAno.list as StudentInfo[] })}
            />
            <MetricCard
                title="Próximos a Finalizar"
                value={metrics.alumnosProximosAFinalizar.value}
                icon="flag"
                description="Con 230+ horas o con 250+ y práctica en curso."
                isLoading={false}
                onClick={() => setProximosModalOpen(true)}
            />
            <MetricCard
                title="Activos sin NINGUNA PPS"
                value={metrics.alumnosSinNingunaPPS.value}
                icon="person_search"
                description="No tienen ninguna práctica registrada."
                isLoading={false}
                onClick={() => openModal({ title: 'Activos sin NINGUNA PPS', students: metrics.alumnosSinNingunaPPS.list as StudentInfo[] })}
            />
            <MetricCard
                title="Listos para Acreditar"
                value={metrics.alumnosParaAcreditar.value}
                icon="military_tech"
                description="Cumplen con todos los criterios para finalizar."
                isLoading={false}
                onClick={() => openModal({ title: 'Listos para Acreditar', students: metrics.alumnosParaAcreditar.list as StudentInfo[], headers: [{ key: 'nombre', label: 'Nombre' }, { key: 'legajo', label: 'Legajo' }, { key: 'totalHoras', label: 'Horas' }, { key: 'orientaciones', label: 'Orientaciones' }] })}
            />
            <MetricCard
                title="Alumnos Finalizados (Total)"
                value={metrics.alumnosFinalizados.value}
                icon="school"
                description={`Histórico de estudiantes egresados.`}
                isLoading={false}
                onClick={() => openModal({ title: `Finalizados (Histórico)`, students: metrics.alumnosFinalizados.list as StudentInfo[] })}
            />
        </div>
        )}

        {activeTab === 'institutions' && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
            <MetricCard
                title="PPS Lanzadas"
                value={metrics.ppsLanzadas.value}
                icon="rocket_launch"
                description={`Total de instituciones con lanzamientos en ${targetYear}.`}
                isLoading={false}
                onClick={() => openModal({ title: `PPS Lanzadas (${targetYear})`, students: metrics.ppsLanzadas.list as StudentInfo[], headers: [{ key: 'nombre', label: 'Institución' }, { key: 'legajo', label: 'Info' }, {key: 'cupos', label: 'Cupos'}] })}
            />
            <MetricCard
                title="Convenios Nuevos"
                value={metrics.nuevosConvenios.value}
                icon="handshake"
                description={`Instituciones con su primer lanzamiento en ${targetYear}.`}
                isLoading={false}
                onClick={() => openModal({ title: `Convenios Nuevos (${targetYear})`, students: metrics.nuevosConvenios.list as StudentInfo[], headers: [{ key: 'nombre', label: 'Institución' }, { key: 'cupos', label: 'Cupos Ofertados' }] })}
            />
            <MetricCard
                title="Instituciones Activas"
                value={metrics.activeInstitutions.value}
                icon="apartment"
                description={`Instituciones con al menos un lanzamiento en ${targetYear}.`}
                isLoading={false}
                onClick={() => openModal({ title: `Instituciones Activas (${targetYear})`, students: metrics.activeInstitutions.list as StudentInfo[], headers: [{ key: 'nombre', label: 'Institución' }, { key: 'legajo', label: 'Orientaciones' }, {key: 'cupos', label: 'Cupos Totales'}] })}
            />
        </div>
        )}
    </>
  );
};
