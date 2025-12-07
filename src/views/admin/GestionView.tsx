
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
      {/* Header Estratégico */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden mb-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="relative z-10 flex justify-between items-end">
              <div>
                  <h1 className="text-2xl font-black tracking-tight text-white mb-1">Planificación 2026</h1>
                  <p className="text-slate-400 text-sm">Gestiona el futuro de las prácticas profesionales.</p>
              </div>
              <div className="text-right">
                  <span className="block text-4xl font-black text-emerald-400">{confirmedCount}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-500/80">PPS Confirmadas</span>
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
