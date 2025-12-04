
import React from 'react';
import { useModal } from '../contexts/ModalContext';
import Modal from './Modal';
import { EnrollmentForm } from './EnrollmentForm';
import SeleccionadosModal from './SeleccionadosModal';
import SolicitudPPSForm from './SolicitudPPSForm'; // Import the new form
import { FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS } from '../constants';

const AppModals: React.FC = () => {
    const { 
        modalInfo,
        closeModal,
        isEnrollmentFormOpen,
        closeEnrollmentForm,
        selectedLanzamientoForEnrollment,
        isSeleccionadosModalOpen,
        closeSeleccionadosModal,
        seleccionadosData,
        convocatoriaForModal,
        isSubmittingEnrollment,
        onSubmitEnrollment,
        
        // New Solicitud Props
        isSolicitudPPSModalOpen,
        closeSolicitudPPSModal,
        onSubmitSolicitudPPS
    } = useModal();

    const horariosStr = selectedLanzamientoForEnrollment?.[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || '';
    const horariosArray = horariosStr ? horariosStr.split(';').map(h => h.trim()).filter(Boolean) : [];
    const permiteCertificado = !!selectedLanzamientoForEnrollment?.[FIELD_PERMITE_CERTIFICADO_LANZAMIENTOS];

    return (
        <>
            <Modal
                isOpen={!!modalInfo}
                title={modalInfo?.title || ''}
                message={modalInfo?.message || ''}
                onClose={closeModal}
            />
            
            <EnrollmentForm
              isOpen={isEnrollmentFormOpen}
              onClose={closeEnrollmentForm}
              onSubmit={onSubmitEnrollment || (() => Promise.resolve())} // Proporciona una función vacía como fallback
              convocatoriaName={selectedLanzamientoForEnrollment?.['Nombre PPS'] || ''}
              horariosDisponibles={horariosArray}
              isSubmitting={isSubmittingEnrollment}
              permiteCertificado={permiteCertificado}
            />

            <SeleccionadosModal
                isOpen={isSeleccionadosModalOpen}
                onClose={closeSeleccionadosModal}
                seleccionados={seleccionadosData}
                convocatoriaName={convocatoriaForModal}
            />

            <SolicitudPPSForm
                isOpen={isSolicitudPPSModalOpen}
                onClose={closeSolicitudPPSModal}
                onSubmit={onSubmitSolicitudPPS || (() => Promise.resolve())}
            />
        </>
    );
};

export default AppModals;
