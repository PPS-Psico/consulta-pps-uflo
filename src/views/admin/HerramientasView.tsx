
import React, { useState, useMemo, lazy, Suspense } from 'react';
import SubTabs from '../../components/SubTabs';
import AdminSearch from '../../components/AdminSearch';
import PenalizationManager from '../../components/PenalizationManager';
import { useModal } from '../../contexts/ModalContext';
import type { AirtableRecord, EstudianteFields } from '../../types';
import AirtableEditor from '../../components/AirtableEditor';
import Loader from '../../components/Loader';
import EmailAutomationManager from '../../components/EmailAutomationManager';
import NuevosConvenios from '../../components/NuevosConvenios'; // Imported

const ExecutiveReportGenerator = lazy(() => import('../../components/ExecutiveReportGenerator'));
const ActiveInstitutionsReport = lazy(() => import('../../components/ActiveInstitutionsReport'));

interface HerramientasViewProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  isTestingMode?: boolean;
}

const HerramientasView: React.FC<HerramientasViewProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [activeTabId, setActiveTabId] = useState('editor-db');
  const [activeReportType, setActiveReportType] = useState<'instituciones' | 'ejecutivo'>('instituciones');

  const tabs = [
    { id: 'editor-db', label: 'Editor DB', icon: 'storage' },
    { id: 'convenios', label: 'Convenios Nuevos', icon: 'handshake' },
    { id: 'penalizaciones', label: 'Penalizaciones', icon: 'gavel' },
    { id: 'automation', label: 'Automatizaciones', icon: 'auto_fix_high' },
    { id: 'search', label: 'Buscar Alumno', icon: 'person_search' },
    { id: 'reportes', label: 'Reportes', icon: 'summarize' },
  ];

  return (
    <div className="space-y-8">
      <SubTabs tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId} />
      <div className="mt-6">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
          
          {activeTabId === 'editor-db' && <AirtableEditor isTestingMode={isTestingMode} />}
          
          {activeTabId === 'convenios' && <NuevosConvenios isTestingMode={isTestingMode} />}

          {activeTabId === 'penalizaciones' && <PenalizationManager isTestingMode={isTestingMode} />}

          {activeTabId === 'automation' && <EmailAutomationManager />}
          
          {activeTabId === 'search' && (
            <div className="p-4">
              <AdminSearch onStudentSelect={onStudentSelect} isTestingMode={isTestingMode} />
            </div>
          )}

          {activeTabId === 'reportes' && (
             <div className="space-y-6">
                {/* Internal Tab Switcher for Reports */}
                <div className="flex justify-center">
                    <div className="inline-flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setActiveReportType('instituciones')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReportType === 'instituciones' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Instituciones
                        </button>
                        <button 
                            onClick={() => setActiveReportType('ejecutivo')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeReportType === 'ejecutivo' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                        >
                            Ejecutivo
                        </button>
                    </div>
                </div>

                {activeReportType === 'instituciones' && <ActiveInstitutionsReport isTestingMode={isTestingMode} />}
                {activeReportType === 'ejecutivo' && <ExecutiveReportGenerator isTestingMode={isTestingMode} />}
             </div>
          )}

        </Suspense>
      </div>
    </div>
  );
};

export default HerramientasView;
