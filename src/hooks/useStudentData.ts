
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStudentData } from '../services/dataService';
import { db } from '../lib/db';
import { mockDb } from '../services/mockDb';
import type { Orientacion } from '../types';
import { useModal } from '../contexts/ModalContext';
import { FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_NOTAS_INTERNAS_ESTUDIANTES } from '../constants';

export const useStudentData = (legajo: string) => {
    const queryClient = useQueryClient();
    const { showModal } = useModal();

    const { 
        data, 
        isLoading: isStudentLoading, 
        error: studentError, 
        refetch: refetchStudent 
    } = useQuery({
        queryKey: ['student', legajo],
        queryFn: async () => {
            // TESTING MODE INTERCEPTION
            if (legajo === '99999') {
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network
                const mockStudent = (await mockDb.getAll('estudiantes', { legajo: '99999' }))[0];
                if (!mockStudent) throw new Error("Mock user not found");
                return { 
                    studentDetails: mockStudent, 
                    studentAirtableId: mockStudent.id 
                };
            }
            return fetchStudentData(legajo);
        },
        staleTime: 1000 * 60 * 10, // Cache for 10 minutes
        refetchOnWindowFocus: false,
    });

    const studentDetails = data?.studentDetails ?? null;
    const studentAirtableId = data?.studentAirtableId ?? null;

    const updateOrientation = useMutation({
        mutationFn: async (orientacion: Orientacion | "") => {
            if (!studentAirtableId) throw new Error("Student ID not available.");
            
            if (legajo === '99999') {
                return mockDb.update('estudiantes', studentAirtableId, { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null });
            }

            return db.estudiantes.update(studentAirtableId, { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student', legajo] });
        },
        onError: (error) => showModal('Error', `No se pudo guardar tu orientación: ${error.message}`),
    });

    const updateInternalNotes = useMutation({
        mutationFn: async (notes: string) => {
            if (!studentAirtableId) throw new Error("Student ID not available.");
            
            if (legajo === '99999') {
                 return mockDb.update('estudiantes', studentAirtableId, { [FIELD_NOTAS_INTERNAS_ESTUDIANTES]: notes || null });
            }

            return db.estudiantes.update(studentAirtableId, { [FIELD_NOTAS_INTERNAS_ESTUDIANTES]: notes || null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student', legajo] });
            showModal('Éxito', 'Las notas internas se han guardado correctamente.');
        },
        onError: (error) => showModal('Error', `No se pudieron guardar las notas: ${error.message}`),
    });

    return {
        studentDetails,
        studentAirtableId,
        isStudentLoading,
        studentError,
        updateOrientation,
        updateInternalNotes,
        refetchStudent
    };
};
