
import React, { useState, useEffect } from 'react';
import SubTabs from '../../components/SubTabs';
import ConvocatoriaManager from '../../components/ConvocatoriaManager';
import ConvocatoriaStatusManager from '../../components/ConvocatoriaStatusManager';
import { autoCloseExpiredPractices } from '../../services/dataService';

interface GestionViewProps {
  isTestingMode?: boolean;
}

const GestionView: React.FC<GestionViewProps> = ({ isTestingMode = false }) => {
  const [activeGestionTabId, setActiveGestionTabId] = useState('manager');
  
  const gestionSubTabs = [
    { id: 'manager', label: 'Gestionar Prácticas', icon: 'dynamic_feed' },
    { id: 'status-manager', label: 'Control de Estados', icon: 'toggle_on' },
  ];

  // Trigger auto-closing of expired practices when the admin enters the management view.
  useEffect(() => {
      if (!isTestingMode) {
          autoCloseExpiredPractices().then(count => {
              if (count > 0) {
                  console.log(`Mantenimiento: Se finalizaron ${count} prácticas vencidas automáticamente.`);
              }
          });
      }
  }, [isTestingMode]);

  return (
    <>
      <SubTabs tabs={gestionSubTabs} activeTabId={activeGestionTabId} onTabChange={setActiveGestionTabId} />
      <div className="mt-6">
          {activeGestionTabId === 'manager' && <ConvocatoriaManager isTestingMode={isTestingMode} />}
          {activeGestionTabId === 'status-manager' && <ConvocatoriaStatusManager isTestingMode={isTestingMode} />}
      </div>
    </>
  );
};

export default GestionView;
