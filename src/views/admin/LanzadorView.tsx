
import React, { useState } from 'react';
import SubTabs from '../../components/SubTabs';
import LanzadorConvocatorias from '../../components/LanzadorConvocatorias';
import SeleccionadorConvocatorias from '../../components/SeleccionadorConvocatorias';
import SeguroGenerator from '../../components/SeguroGenerator';
import { useModal } from '../../contexts/ModalContext';

interface LanzadorViewProps {
  isTestingMode?: boolean;
}

const LanzadorView: React.FC<LanzadorViewProps> = ({ isTestingMode = false }) => {
  const [activeTabId, setActiveTabId] = useState('nuevo');
  const { showModal } = useModal();

  const tabs = [
    { id: 'nuevo', label: 'Nuevo Lanzamiento', icon: 'add_circle' },
    { id: 'seleccionador', label: 'Seleccionador', icon: 'how_to_reg' },
    { id: 'seguro', label: 'Seguro', icon: 'shield' },
    { id: 'historial', label: 'Historial', icon: 'history' },
  ];

  return (
    <>
      <SubTabs tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId} />
      <div className="mt-6">
          {activeTabId === 'nuevo' && <LanzadorConvocatorias forcedTab="new" isTestingMode={isTestingMode} />}
          {activeTabId === 'seleccionador' && <SeleccionadorConvocatorias isTestingMode={isTestingMode} />}
          {activeTabId === 'seguro' && <SeguroGenerator showModal={showModal} isTestingMode={isTestingMode} />}
          {activeTabId === 'historial' && <LanzadorConvocatorias forcedTab="history" isTestingMode={isTestingMode} />}
      </div>
    </>
  );
};

export default LanzadorView;
