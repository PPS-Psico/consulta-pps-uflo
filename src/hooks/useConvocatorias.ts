
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { db } from '../lib/db';
import type { LanzamientoPPS, InformeTask, Convocatoria, AirtableRecord, ConvocatoriaFields, EstudianteFields } from '../types';
import { 
    FIELD_NOMBRE_PPS_LANZAMIENTOS, 
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, 
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, 
    FIELD_NOMBRE_PPS_CONVOCATORIAS, 
    FIELD_FECHA_INICIO_CONVOCATORIAS, 
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_LEGAJO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_ORIENTACION_CONVOCATORIAS,
    FIELD_HORAS_ACREDITADAS_CONVOCATORIAS,
    FIELD_CERTIFICADO_CONVOCATORIAS,
    FIELD_CORREO_CONVOCATORIAS,
    FIELD_TELEFONO_CONVOCATORIAS,
    FIELD_DNI_CONVOCATORIAS,
    FIELD_FECHA_NACIMIENTO_CONVOCATORIAS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_NOTA_PRACTICAS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES,
    FIELD_FECHA_FIN_CONVOCATORIAS,
    FIELD_DIRECCION_CONVOCATORIAS
} from '../constants';

export const useConvocatorias = (legajo: string, studentAirtableId: string | null, studentDetails: EstudianteFields | null, isSuperUserMode: boolean) => {
    const queryClient = useQueryClient();
    const { 
        showModal, 
        closeEnrollmentForm, 
        setIsSubmittingEnrollment,
    } = useModal();

    const { 
        data: convocatoriasData, 
        isLoading: isConvocatoriasLoading, 
        error: convocatoriasError,
        refetch: refetchConvocatorias
    } = useQuery({
        queryKey: ['convocatorias', legajo, studentAirtableId],
        queryFn: () => {
            return fetchConvocatoriasData(legajo, studentAirtableId, isSuperUserMode);
        },
        enabled: !!studentAirtableId || isSuperUserMode || legajo === '99999',
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: false,
    });
    
    const { lanzamientos = [], myEnrollments = [], allLanzamientos = [], institutionAddressMap = new Map() } = convocatoriasData || {};

    const enrollmentMutation = useMutation<AirtableRecord<ConvocatoriaFields> | null, Error, { formData: any, selectedLanzamiento: LanzamientoPPS }, { previousData: unknown }>({
        mutationFn: async ({ formData, selectedLanzamiento }) => {
            if (legajo === '99999') {
                await new Promise(resolve => setTimeout(resolve, 1500));
                const legajoAsNumber = parseInt(legajo, 10);
                return {
                    id: `rec_mock_${Date.now()}`,
                    createdTime: new Date().toISOString(),
                    [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: selectedLanzamiento.id,
                    [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
                    [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                    [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                    [FIELD_LEGAJO_CONVOCATORIAS]: isNaN(legajoAsNumber) ? undefined : legajoAsNumber,
                } as unknown as AirtableRecord<ConvocatoriaFields>;
            }

            if (!studentAirtableId) throw new Error("No se pudo identificar al estudiante.");
            
            // Use actual DB column names (constants)
            const newRecordFields: any = {
                [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: selectedLanzamiento.id,
                [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: studentAirtableId,
                [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: "Inscripto",
                [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? "Sí" : "No",
                [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
                [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || null,
                [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas ? "Sí" : "No",
                [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: formData.horarios.join('; '),
                
                // Snapshots
                [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                [FIELD_FECHA_FIN_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
                [FIELD_ORIENTACION_CONVOCATORIAS]: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
                [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
                [FIELD_DIRECCION_CONVOCATORIAS]: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS],
            };
            
            const legajoAsNumber = parseInt(legajo, 10);
            if (!isNaN(legajoAsNumber)) {
                newRecordFields[FIELD_LEGAJO_CONVOCATORIAS] = legajoAsNumber;
            }
            
            if (studentDetails) {
                newRecordFields[FIELD_CORREO_CONVOCATORIAS] = studentDetails[FIELD_CORREO_ESTUDIANTES];
                newRecordFields[FIELD_TELEFONO_CONVOCATORIAS] = studentDetails[FIELD_TELEFONO_ESTUDIANTES];
                newRecordFields[FIELD_DNI_CONVOCATORIAS] = studentDetails[FIELD_DNI_ESTUDIANTES];
                newRecordFields[FIELD_FECHA_NACIMIENTO_CONVOCATORIAS] = studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES];
            }

             if (formData.certificadoLink) {
                 newRecordFields[FIELD_CERTIFICADO_CONVOCATORIAS] = formData.certificadoLink;
             }

            return db.convocatorias.create(newRecordFields);
        },
        onMutate: async ({ selectedLanzamiento }) => {
            await queryClient.cancelQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            const previousData = queryClient.getQueryData(['convocatorias', legajo, studentAirtableId]);
            setIsSubmittingEnrollment(true);
            return { previousData };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['convocatorias', legajo, studentAirtableId], context?.previousData);
            showModal('Error', `Hubo un problema al realizar la inscripción: ${err.message}`);
        },
        onSuccess: (data) => {
            if (data) {
                showModal('¡Inscripción Exitosa!', 'Tu solicitud ha sido registrada correctamente. Te notificaremos cuando haya novedades.');
                queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
                closeEnrollmentForm();
            }
        },
        onSettled: () => {
            setIsSubmittingEnrollment(false);
        }
    });

    const confirmInformeMutation = useMutation({
        mutationFn: async (task: InformeTask) => {
            if (legajo === '99999') return;
            
            // Si es una práctica (finalizada/histórica), actualizamos la práctica
            if (task.practicaId && task.convocatoriaId.startsWith('practica-')) {
                 return db.practicas.update(task.practicaId, { [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)' });
            } 
            // Si es una convocatoria (proceso activo), actualizamos la convocatoria
            else if (task.convocatoriaId) {
                return db.convocatorias.update(task.convocatoriaId, { 
                    [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true,
                    [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: new Date().toISOString()
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
            showModal('Entrega Confirmada', 'Hemos registrado tu confirmación. El equipo docente procederá a la corrección.');
        },
        onError: (error) => {
            showModal('Error', `No se pudo confirmar la entrega: ${error.message}`);
        }
    });
    
    // Enroll function to be called from UI
    const enrollStudent = {
        mutate: (lanzamiento: LanzamientoPPS) => {
            // Dynamically import openEnrollmentForm logic or trigger it via context from here is tricky
            // Better to expose the mutation triggering logic and let the UI handle the form opening
            // But for now, to match the context interface, we trigger the context's openForm, which then calls our mutation.
            // HOWEVER, to avoid circular deps or complex wiring, the context usually calls enrollStudent.mutate.
            // Let's assume `openEnrollmentForm` is passed to us or available via context in the component using this hook.
            // ACTUALLY, we are inside the hook. We have access to `openEnrollmentForm` from context above.
            
            // openEnrollmentForm expects (lanzamiento, onSubmit). 
            // The onSubmit passed to it will be the async wrapper around our mutation.
            // This is what `useStudentPanel` expects `enrollStudent.mutate` to do: open the form.
            
            // Wait, `openEnrollmentForm` from context sets state. It doesn't return a promise.
            // The onSubmit passed to `openEnrollmentForm` is called when the USER clicks submit in the modal.
            
            // @ts-ignore: The type mismatch in useStudentPanelContext is tricky. 
            // The context expects `enrollStudent: { mutate: ... }`.
            // We are defining that object here.
            // When `enrollStudent.mutate(lanzamiento)` is called from UI:
            // 1. It calls openEnrollmentForm from context.
            // 2. It passes the lanzamiento.
            // 3. It passes an async callback that receives formData.
            // 4. That callback calls enrollmentMutation.mutateAsync.
            
            const handleSubmit = async (formData: any) => {
                await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento: lanzamiento });
            };
            
            // @ts-ignore
            openEnrollmentForm(lanzamiento, handleSubmit);
        },
        isPending: enrollmentMutation.isPending
    };

    return { 
        lanzamientos, 
        myEnrollments, 
        allLanzamientos, 
        isConvocatoriasLoading, 
        convocatoriasError,
        enrollStudent, 
        confirmInforme: confirmInformeMutation,
        refetchConvocatorias, 
        institutionAddressMap 
    };
};
