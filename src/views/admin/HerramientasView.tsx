
import React, { useState, useMemo, lazy, Suspense } from 'react';
import SubTabs from '../../components/SubTabs';
import AdminSearch from '../../components/AdminSearch';
import PenalizationManager from '../../components/PenalizationManager';
import { useModal } from '../../contexts/ModalContext';
import type { AirtableRecord, EstudianteFields } from '../../types';
import DatabaseEditor from '../../components/DatabaseEditor';
import Loader from '../../components/Loader';
import EmailAutomationManager from '../../components/EmailAutomationManager';
import NuevosConvenios from '../../components/NuevosConvenios';
import StudentDiagnostics from '../../components/StudentDiagnostics';
import ErrorBoundary from '../../components/ErrorBoundary';
import DataIntegrityTool from '../../components/DataIntegrityTool';
import Toast from '../../components/Toast';
import RecordEditModal from '../../components/RecordEditModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../../lib/db';
import { schema } from '../../lib/dbSchema';
import { 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOTAS_INTERNAS_ESTUDIANTES
} from '../../constants';

const ExecutiveReportGenerator = lazy(() => import('../../components/ExecutiveReportGenerator'));
const ActiveInstitutionsReport = lazy(() => import('../../components/ActiveInstitutionsReport'));
const YearEndResetTool = lazy(() => import('../../components/YearEndResetTool'));

// Configuración simplificada para alta rápida: Solo Nombre y Legajo
const QUICK_STUDENT_CONFIG = {
    label: 'Estudiante',
    schema: schema.estudiantes,
    fieldConfig: [
        { key: FIELD_NOMBRE_ESTUDIANTES, label: 'Nombre Completo', type: 'text' as const },
        { key: FIELD_LEGAJO_ESTUDIANTES, label: 'Legajo', type: 'text' as const },
        { key: FIELD_NOTAS_INTERNAS_ESTUDIANTES, label: 'Notas (Opcional)', type: 'textarea' as const },
    ]
};

interface HerramientasViewProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  isTestingMode?: boolean;
}

const HerramientasView: React.FC<HerramientasViewProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [activeTabId, setActiveTabId] = useState('editor-db');
  const [activeReportType, setActiveReportType] = useState<'instituciones' | 'ejecutivo'>('instituciones');
  const { showModal } = useModal();
  
  // Estado para alta rápida
  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const queryClient = useQueryClient();

  // Lazy load SeguroGenerator inside component to avoid circular dependency issues if any,
  // and because it is heavy.
  const SeguroGenerator = lazy(() => import('../../components/SeguroGenerator'));

  const createStudentMutation = useMutation({
      mutationFn: (fields: any) => {
          if (isTestingMode) return new Promise(resolve => setTimeout(() => resolve(null), 500));
          return db.estudiantes.create(fields);
      },
      onSuccess: () => {
           setToastInfo({ message: 'Estudiante registrado correctamente.', type: 'success' });
           setIsCreatingStudent(false);
           // Invalidar queries relevantes
           queryClient.invalidateQueries({ queryKey: ['databaseEditor', 'estudiantes'] }); 
      },
      onError: (e: any) => setToastInfo({ message: `Error al crear: ${e.message}`, type: 'error' }),
  });

  const tabs = [
    { id: 'editor-db', label: 'Editor DB', icon: 'storage' },
    { id: 'search', label: 'Buscar Alumno', icon: 'person_search' }, // Moved up for visibility
    { id: 'convenios', label: 'Convenios Nuevos', icon: 'handshake' },
    { id: 'penalizaciones', label: 'Penalizaciones', icon: 'gavel' },
    { id: 'automation', label: 'Automatizaciones', icon: 'auto_fix_high' },
    { id: 'integrity', label: 'Integridad', icon: 'health_and_safety' },
    { id: 'diagnostico', label: 'Diagnóstico', icon: 'troubleshoot' },
    { id: 'insurance', label: 'Seguros', icon: 'shield' },
    { id: 'reportes', label: 'Reportes', icon: 'summarize' },
    { id: 'mantenimiento', label: 'Mantenimiento', icon: 'build' },
  ];

  return (
    <div className="space-y-8">
      {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
      
      <SubTabs tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId} />
      <div className="mt-6">
        <Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
          
          {activeTabId === 'editor-db' && (
            <ErrorBoundary>
              <DatabaseEditor isTestingMode={isTestingMode} />
            </ErrorBoundary>
          )}
          
          {activeTabId === 'convenios' && (
            <ErrorBoundary>
              <NuevosConvenios isTestingMode={isTestingMode} />
            </ErrorBoundary>
          )}

          {activeTabId === 'penalizaciones' && (
            <ErrorBoundary>
              <PenalizationManager isTestingMode={isTestingMode} />
            </ErrorBoundary>
          )}

          {activeTabId === 'automation' && (
            <ErrorBoundary>
              <EmailAutomationManager />
            </ErrorBoundary>
          )}

          {activeTabId === 'integrity' && (
            <ErrorBoundary>
              <DataIntegrityTool />
            </ErrorBoundary>
          )}
          
          {activeTabId === 'search' && (
            <ErrorBoundary>
              <div className="p-4 max-w-2xl mx-auto">
                <AdminSearch onStudentSelect={onStudentSelect} isTestingMode={isTestingMode} />
                
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                        ¿No encuentras al estudiante? Agrégalo manualmente solo con nombre y legajo.
                    </p>
                    <button 
                        onClick={() => setIsCreatingStudent(true)}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                    >
                        <span className="material-icons !text-lg">person_add</span>
                        Alta Rápida de Estudiante
                    </button>
                </div>

                {isCreatingStudent && (
                    <RecordEditModal 
                        isOpen={isCreatingStudent} 
                        onClose={() => setIsCreatingStudent(false)} 
                        record={null} 
                        tableConfig={QUICK_STUDENT_CONFIG} 
                        onSave={(_, fields) => createStudentMutation.mutate(fields)} 
                        isSaving={createStudentMutation.isPending} 
                    />
                )}
              </div>
            </ErrorBoundary>
          )}

          {activeTabId === 'diagnostico' && (
            <ErrorBoundary>
               <StudentDiagnostics />
            </ErrorBoundary>
          )}
          
          {activeTabId === 'insurance' && (
              <ErrorBoundary>
                  <SeguroGenerator showModal={showModal} isTestingMode={isTestingMode} />
              </ErrorBoundary>
          )}

          {activeTabId === 'reportes' && (
             <div className="space-y-6">
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

                {activeReportType === 'instituciones' && (
                    <ErrorBoundary>
                        <ActiveInstitutionsReport isTestingMode={isTestingMode} />
                    </ErrorBoundary>
                )}
                {activeReportType === 'ejecutivo' && (
                    <ErrorBoundary>
                        <ExecutiveReportGenerator isTestingMode={isTestingMode} />
                    </ErrorBoundary>
                )}
             </div>
          )}

          {activeTabId === 'mantenimiento' && (
              <ErrorBoundary>
                  <YearEndResetTool />
              </ErrorBoundary>
          )}

        </Suspense>
      </div>
    </div>
  );
};

export default HerramientasView;
