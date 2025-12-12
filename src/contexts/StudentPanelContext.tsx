

import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { useStudentData } from '../hooks/useStudentData';
import { useStudentPracticas } from '../hooks/useStudentPracticas';
import { useStudentSolicitudes } from '../hooks/useStudentSolicitudes';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { calculateCriterios, initialCriterios } from '../utils/criteriaCalculations';
import { processAndLinkStudentData } from '../utils/dataLinker';
import { FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES } from '../constants';
import { useQuery } from '@tanstack/react-query';
import { fetchFinalizacionRequest } from '../services/dataService';

import type { UseMutationResult } from '@tanstack/react-query';
import type {
    Estudiante, Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, Orientacion, InformeTask, AirtableRecord, CriteriosCalculados, FinalizacionPPS
} from '../types';

interface StudentPanelContextType {
    // Data
    studentDetails: Estudiante | null;
    studentAirtableId: string | null;
    practicas: Practica[];
    solicitudes: SolicitudPPS[];
    lanzamientos: LanzamientoPPS[];
    allLanzamientos: LanzamientoPPS[];
    enrollmentMap: Map<string, Convocatoria>;
    completedLanzamientoIds: Set<string>;
    informeTasks: InformeTask[];
    criterios: CriteriosCalculados;
    institutionAddressMap: Map<string, string>;
    finalizacionRequest: FinalizacionPPS | null;

    // Aggregated states
    isLoading: boolean;
    error: Error | null;

    // Mutations and refetch functions
    updateOrientation: UseMutationResult<any, Error, Orientacion | "", unknown>;
    updateInternalNotes: UseMutationResult<any, Error, string, unknown>;
    updateNota: UseMutationResult<(AirtableRecord<any> | null)[], Error, { practicaId: string; nota: string; convocatoriaId?: string; }, unknown>;
    enrollStudent: { mutate: (lanzamiento: LanzamientoPPS) => void; isPending: boolean; };
    confirmInforme: UseMutationResult<any, Error, InformeTask, any>;
    refetchAll: () => void;
}

const StudentPanelContext = createContext<StudentPanelContextType | undefined>(undefined);

export const StudentPanelProvider: React.FC<{ legajo: string; children: ReactNode }> = ({ legajo, children }) => {
    const { isSuperUserMode } = useAuth();

    const { studentDetails, studentAirtableId, isStudentLoading, studentError, updateOrientation, updateInternalNotes, refetchStudent } = useStudentData(legajo);
    const { practicas, isPracticasLoading, practicasError, updateNota, refetchPracticas } = useStudentPracticas(legajo);
    const { solicitudes, isSolicitudesLoading, solicitudesError, refetchSolicitudes } = useStudentSolicitudes(legajo, studentAirtableId);
    const { 
        lanzamientos, myEnrollments, allLanzamientos, isConvocatoriasLoading, convocatoriasError,
        enrollStudent, confirmInforme, refetchConvocatorias, institutionAddressMap
    } = useConvocatorias(legajo, studentAirtableId, studentDetails, isSuperUserMode);

    // Fetch finalization request separately
    const { data: finalizacionRequest = null, isLoading: isFinalizationLoading, refetch: refetchFinalizacion } = useQuery({
        queryKey: ['finalizacionRequest', legajo],
        queryFn: () => fetchFinalizacionRequest(legajo, studentAirtableId),
        enabled: !!studentAirtableId
    });

    const isLoading = isStudentLoading || isPracticasLoading || isSolicitudesLoading || isConvocatoriasLoading || isFinalizationLoading;
    const error = studentError || practicasError || solicitudesError || convocatoriasError;

    const refetchAll = useCallback(() => {
        refetchStudent();
        refetchPracticas();
        refetchSolicitudes();
        refetchConvocatorias();
        refetchFinalizacion();
    }, [refetchStudent, refetchPracticas, refetchSolicitudes, refetchConvocatorias, refetchFinalizacion]);
    
    const selectedOrientacion = (studentDetails && studentDetails[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] 
        ? studentDetails[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] 
        : "") as Orientacion | "";

    const criterios = useMemo(() => 
        (isLoading ? initialCriterios : calculateCriterios(practicas, selectedOrientacion)), 
        [practicas, selectedOrientacion, isLoading]
    );
  
    const { enrollmentMap, completedLanzamientoIds, informeTasks } = useMemo(() => {
        if (isConvocatoriasLoading || isPracticasLoading) {
            return { enrollmentMap: new Map<string, Convocatoria>(), completedLanzamientoIds: new Set<string>(), informeTasks: [] as InformeTask[] };
        }
        return processAndLinkStudentData({ myEnrollments, allLanzamientos, practicas });
    }, [myEnrollments, allLanzamientos, practicas, isConvocatoriasLoading, isPracticasLoading]);

    const value = {
        studentDetails,
        studentAirtableId,
        practicas,
        solicitudes,
        lanzamientos,
        allLanzamientos,
        institutionAddressMap,
        isLoading,
        error,
        updateOrientation,
        updateInternalNotes,
        updateNota,
        enrollStudent,
        confirmInforme,
        refetchAll,
        criterios,
        enrollmentMap,
        completedLanzamientoIds,
        informeTasks,
        finalizacionRequest
    };

    return (
        <StudentPanelContext.Provider value={value as StudentPanelContextType}>
            {children}
        </StudentPanelContext.Provider>
    );
};

export const useStudentPanel = (): StudentPanelContextType => {
    const context = useContext(StudentPanelContext);
    if (!context) {
        throw new Error('useStudentPanel must be used within a StudentPanelProvider');
    }
    return context;
};
