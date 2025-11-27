
import React, { useState, useMemo, lazy, Suspense } from 'react';
import SubTabs from '../../components/SubTabs';
import AdminSearch from '../../components/AdminSearch';
import SeguroGenerator from '../../components/SeguroGenerator';
import NuevosConvenios from '../../components/NuevosConvenios';
import ExecutiveReportGenerator from '../../components/ExecutiveReportGenerator';
import PenalizationManager from '../../components/PenalizationManager';
import { useModal } from '../../contexts/ModalContext';
import type { AirtableRecord, EstudianteFields } from '../../types';
import LanzadorConvocatorias from '../../components/LanzadorConvocatorias';
import AirtableEditor from '../../components/AirtableEditor';
import SeleccionadorConvocatorias from '../../components/SeleccionadorConvocatorias';
import FinalizacionReview from '../../components/FinalizacionReview';
import Loader from '../../components/Loader';
import ConvocatoriaManager from '../../components/ConvocatoriaManager';

const ActiveInstitutionsReport = lazy(() => import('../../components/ActiveInstitutionsReport'));

interface HerramientasViewProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  isTestingMode?: boolean;
}

const HerramientasView: React.FC<HerramientasViewProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [activeHerramientasTabId, setActiveHerramientasTabId] = useState('lanzador');
  const { showModal } = useModal();

  const herramientasSubTabs = useMemo(() => {
      let allTabs = [
        { id: 'lanzador', label: 'Lanzador', icon: 'rocket_launch' },
        { id: 'manager', label: 'Gestor de Prácticas', icon: 'dynamic_feed' },
        { id: 'seleccionador', label: 'Seleccionador', icon: 'how_to_reg' },
        { id: 'finalizacion-review', label: 'Finalizaciones', icon: 'verified' },
        { id: 'editor-db', label: 'Editor DB', icon: 'storage' },
        { id: 'penalizaciones', label: 'Penalizaciones', icon: 'gavel' },
        { id: 'search', label: 'Buscar Alumno', icon: 'person_search' },
        { id: 'insurance', label: 'Seguros', icon: 'shield' },
        { id: 'convenios', label: 'Convenios Nuevos', icon: 'handshake' },
        { id: 'active-institutions-report', label: 'Reporte Instituciones', icon: 'assessment' },
        { id: 'executive-report', label: 'Reporte Ejecutivo', icon: 'summarize' },
    ];

    if (isTestingMode) {
         // Filter out tabs not meant for testing
        allTabs = allTabs.filter(tab => tab.id !== 'convenios');
        if (activeHerramientasTabId === 'convenios') {
            setActiveHerramientasTabId('lanzador');
        }
    }
    
    return allTabs;
  }, [isTestingMode, activeHerramientasTabId]);


  return (
    <div className="space-y-8">
      <SubTabs tabs={herramientasSubTabs} activeTabId={activeHerramientasTabId} onTabChange={setActiveHerramientasTabId} />
      <div className="mt-6">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
          {activeHerramientasTabId === 'lanzador' && <LanzadorConvocatorias isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'manager' && <ConvocatoriaManager isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'editor-db' && <AirtableEditor isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'seleccionador' && <SeleccionadorConvocatorias isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'finalizacion-review' && <FinalizacionReview />}
          {activeHerramientasTabId === 'penalizaciones' && <PenalizationManager isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'search' && <div className="p-4"><AdminSearch onStudentSelect={onStudentSelect} isTestingMode={isTestingMode} /></div>}
          {activeHerramientasTabId === 'insurance' && <SeguroGenerator showModal={showModal} isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'convenios' && !isTestingMode && <NuevosConvenios isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'active-institutions-report' && <ActiveInstitutionsReport isTestingMode={isTestingMode} />}
          {activeHerramientasTabId === 'executive-report' && <ExecutiveReportGenerator isTestingMode={isTestingMode} />}
        </Suspense>
      </div>
    </div>
  );
};

export default HerramientasView;
