
import React, { useState, useMemo } from 'react';
import SubTabs from '../../components/SubTabs';
import ConvocatoriaManager from '../../components/ConvocatoriaManager';
import CalendarPlanning from '../../components/CalendarPlanning';
import { useGestionConvocatorias } from '../../hooks/useGestionConvocatorias';
import Loader from '../../components/Loader';
import EmptyState from '../../components/EmptyState';
import { FIELD_ESTADO_GESTION_LANZAMIENTOS } from '../../constants';

interface GestionViewProps {
  isTestingMode?: boolean;
}

const GestionView: React.FC<GestionViewProps> = ({ isTestingMode = false }) => {
  const [activeGestionTabId, setActiveGestionTabId] = useState('manager');
  
  // Reutilizamos el hook aquí para pasar datos al calendario sin refetching
  const { filteredData, loadingState, error } = useGestionConvocatorias({ isTestingMode });

  const gestionSubTabs = [
    { id: 'manager', label: 'Gestión de Relanzamientos', icon: 'rocket_launch' },
    { id: 'calendar', label: 'Calendario 2026', icon: 'calendar_month' },
  ];

  // Calcular métricas rápidas para el header
  const confirmedCount = useMemo(() => {
    return [
        ...filteredData.activasYPorFinalizar, 
        ...filteredData.finalizadasParaReactivar, 
        ...filteredData.relanzamientosConfirmados
    ].filter(p => p[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'Relanzamiento Confirmado').length;
  }, [filteredData]);

  if (loadingState === 'loading' || loadingState === 'initial') return <div className="p-12 flex justify-center"><Loader /></div>;
  if (error) return <EmptyState icon="error" title="Error de carga" message={error} />;

  return (
    <div className="space-y-6">
      {/* Header Estratégico: Adaptable Light/Dark */}
      <div className="bg-white dark:bg-gradient-to-r dark:from-slate-900 dark:to-slate-800 rounded-2xl p-6 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200 dark:border-slate-700 relative overflow-hidden mb-8 transition-all duration-300">
          
          {/* Background Decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 dark:bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none transition-colors duration-300"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
              <div>
                  <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
                    Planificación 2026
                  </h1>
                  <p className="text-slate-600 dark:text-slate-400 text-sm font-medium leading-relaxed max-w-lg">
                    Gestiona el futuro de las prácticas profesionales. Define fechas y cupos para el próximo ciclo lectivo.
                  </p>
              </div>
              <div className="text-left sm:text-right bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 min-w-[140px]">
                  <span className="block text-4xl font-black text-emerald-600 dark:text-emerald-400">{confirmedCount}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">PPS Confirmadas</span>
              </div>
          </div>
      </div>

      <SubTabs tabs={gestionSubTabs} activeTabId={activeGestionTabId} onTabChange={setActiveGestionTabId} />
      
      <div className="mt-6 animate-fade-in-up">
          {activeGestionTabId === 'manager' && (
              <ConvocatoriaManager isTestingMode={isTestingMode} />
          )}
          
          {activeGestionTabId === 'calendar' && (
              <CalendarPlanning 
                  items={[
                      ...filteredData.activasYPorFinalizar, 
                      ...filteredData.finalizadasParaReactivar, 
                      ...filteredData.relanzamientosConfirmados,
                      ...filteredData.activasIndefinidas
                  ]} 
              />
          )}
      </div>
    </div>
  );
};

export default GestionView;
