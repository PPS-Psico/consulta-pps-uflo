
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPracticas } from '../services/dataService';
import { db } from '../lib/db';
import { useModal } from '../contexts/ModalContext';
import { FIELD_NOTA_PRACTICAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS } from '../constants';

export const useStudentPracticas = (legajo: string) => {
    const queryClient = useQueryClient();
    const { showModal } = useModal();

    const { 
        data: practicas = [], 
        isLoading: isPracticasLoading, 
        error: practicasError, 
        refetch: refetchPracticas 
    } = useQuery({
        queryKey: ['practicas', legajo],
        queryFn: () => fetchPracticas(legajo),
    });

    const updateNota = useMutation({
        mutationFn: ({ practicaId, nota, convocatoriaId }: { practicaId: string; nota: string; convocatoriaId?: string }) => {
            const valueToSend = nota === 'Sin calificar' ? null : nota;
            const promises = [db.practicas.update(practicaId, { [FIELD_NOTA_PRACTICAS]: valueToSend })];
            
            if (nota === 'No Entregado' && convocatoriaId) {
                promises.push(db.convocatorias.update(convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: false }));
            }
            return Promise.all(promises);
        },
        onSuccess: (_, variables) => {
            if (variables.nota === 'No Entregado') {
                showModal('Actualización Exitosa', 'El estado del informe se ha cambiado a "No Entregado".');
            }
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
        },
        onError: () => showModal('Error', 'No se pudo actualizar la nota.'),
    });

    return {
        practicas,
        isPracticasLoading,
        practicasError,
        updateNota,
        refetchPracticas
    };
};
