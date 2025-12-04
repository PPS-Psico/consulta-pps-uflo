
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { db } from '../lib/db';
import type { LanzamientoPPS, InformeTask, Convocatoria, AirtableRecord, ConvocatoriaFields, EstudianteFields } from '../types';
import { schema } from '../lib/airtableSchema';
import { 
    FIELD_NOMBRE_PPS_LANZAMIENTOS, 
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, 
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, 
    FIELD_NOMBRE_PPS_CONVOCATORIAS, 
    FIELD_FECHA_INICIO_CONVOCATORIAS, 
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_LEGAJO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
    FIELD_FECHA_FIN_CONVOCATORIAS,
    FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_ORIENTACION_CONVOCATORIAS,
    FIELD_HORAS_ACREDITADAS_CONVOCATORIAS,
    FIELD_CERTIFICADO_CONVOCATORIAS,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_CORREO_CONVOCATORIAS,
    FIELD_TELEFONO_CONVOCATORIAS,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES,
    FIELD_DNI_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_CONVOCATORIAS,
    FIELD_DNI_CONVOCATORIAS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
} from '../constants';

export const useConvocatorias = (legajo: string, studentAirtableId: string | null, studentDetails: EstudianteFields | null, isSuperUserMode: boolean) => {
    const queryClient = useQueryClient();
    const { 
        showModal, 
        openEnrollmentForm, closeEnrollmentForm, setIsSubmittingEnrollment,
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
                    fields: {
                        [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: selectedLanzamiento.id,
                        [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
                        [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                        [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                        [FIELD_LEGAJO_CONVOCATORIAS]: isNaN(legajoAsNumber) ? undefined : legajoAsNumber,
                    }
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
                [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS], // Snapshot for history
                [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS], // Snapshot
                [FIELD_FECHA_FIN_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS], // Snapshot
                [FIELD_ORIENTACION_CONVOCATORIAS]: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS], // Snapshot
                [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS], // Snapshot
                [FIELD_DIRECCION_CONVOCATORIAS]: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS], // Snapshot
            };
            
            const legajoAsNumber = parseInt(legajo, 10);
            if (!isNaN(legajoAsNumber)) {
                newRecordFields[FIELD_LEGAJO_CONVOCATORIAS] = legajoAsNumber;
            }
            
            if (studentDetails) {
                newRecordFields[FIELD_CORREO_CONVOCATORIAS] = studentDetails[FIELD_CORREO_ESTUDIANTES];
                newRecordFields[FIELD_TELEFONO_CONVOCATORIAS] = studentDetails[FIELD_TELEFONO_ESTUDIANTES];
                newRecordFields[FIELD_FECHA_NACIMIENTO_CONVOCATORIAS] = studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES];
                newRecordFields[FIELD_DNI_CONVOCATORIAS] = studentDetails[FIELD_DNI_ESTUDIANTES];
            }

            if (formData.horarios && formData.horarios.length > 0) {
                newRecordFields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] = formData.horarios.join('; ');
            }

            if (formData.terminoDeCursar === false && formData.cursandoElectivas !== null) {
                newRecordFields[FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS] = formData.cursandoElectivas ? "Sí" : "No";
            }
            
            if (formData.certificadoLink) {
                newRecordFields[FIELD_CERTIFICADO_CONVOCATORIAS] = [{ url: formData.certificadoLink }];
            }

            return db.convocatorias.create(newRecordFields);
        },
        onMutate: async ({ formData, selectedLanzamiento }) => {
            setIsSubmittingEnrollment(true);
            
            // Close modal immediately for instant feedback
            closeEnrollmentForm();
            
            // Show success message immediately
            const message = 'Tu postulación ha sido registrada. Te notificaremos cuando haya novedades.';
            showModal('¡Inscripción Exitosa!', message);

            // Optimistic update of the UI
            await queryClient.cancelQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            const previousData = queryClient.getQueryData(['convocatorias', legajo, studentAirtableId]);

            queryClient.setQueryData(
                ['convocatorias', legajo, studentAirtableId],
                (oldData: any) => {
                    if (!oldData) return oldData;
                    
                    const legajoAsNumber = studentDetails?.[FIELD_LEGAJO_ESTUDIANTES] ? parseInt(String(studentDetails[FIELD_LEGAJO_ESTUDIANTES]), 10) : undefined;
                    
                    // Create a temporary optimistic record
                    const newEnrollment: Convocatoria = {
                        id: `temp-id-${Date.now()}`,
                        
                        [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [selectedLanzamiento.id],
                        [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                        [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                        [FIELD_FECHA_FIN_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
                        [FIELD_DIRECCION_CONVOCATORIAS]: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS],
                        [FIELD_ORIENTACION_CONVOCATORIAS]: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
                        [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
                        
                        [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentAirtableId!],
                        [FIELD_LEGAJO_CONVOCATORIAS]: !isNaN(legajoAsNumber!) ? legajoAsNumber : undefined,
                        
                        [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
                        [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: formData.horarios.join('; '),
                        [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? "Sí" : "No",
                        [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas !== null ? (formData.cursandoElectivas ? "Sí" : "No") : null,
                        [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || null,
                        [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
                    };
                    
                    if (studentDetails) {
                        (newEnrollment as any)[FIELD_CORREO_CONVOCATORIAS] = studentDetails[FIELD_CORREO_ESTUDIANTES];
                        (newEnrollment as any)[FIELD_TELEFONO_CONVOCATORIAS] = studentDetails[FIELD_TELEFONO_ESTUDIANTES];
                    }

                    if (formData.certificadoLink) {
                        (newEnrollment as any)[FIELD_CERTIFICADO_CONVOCATORIAS] = [{ url: formData.certificadoLink }];
                    }

                    return {
                        ...oldData,
                        myEnrollments: [...oldData.myEnrollments, newEnrollment],
                    };
                }
            );

            return { previousData };
        },
        onSuccess: () => {
            // Invalidate to get the real ID from the server eventually, but no rush
             queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo, studentAirtableId], exact: true });
        },
        onError: (error: any, _newTodo, context) => {
            // Rollback on error
            if (context?.previousData) {
                queryClient.setQueryData(['convocatorias', legajo, studentAirtableId], context.previousData);
            }
            
            console.error('Error detallado:', error);
            const detailedMessage = error?.error?.message || (typeof error?.error === 'string' ? error.error : error.message) || 'Un error desconocido ocurrió.';
            showModal('Error al Inscribir', `No se pudo registrar tu postulación. Por favor intenta nuevamente:\n\n${detailedMessage}`);
        },
        onSettled: () => setIsSubmittingEnrollment(false),
    });

    const enrollStudent = {
        mutate: (selectedLanzamiento: LanzamientoPPS) => {
            openEnrollmentForm(selectedLanzamiento, async (formData) => {
                await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento });
            });
        },
        isPending: enrollmentMutation.isPending,
    };

    const confirmInforme = useMutation({
        mutationFn: async (task: InformeTask) => {
            if (!task.convocatoriaId) throw new Error("ID de convocatoria no encontrado.");
            const today = new Date().toISOString().split('T')[0];
            
            // If it's a "practice-based" task (finalized without enrollment record), update practice note
            if (task.convocatoriaId.startsWith('practica-')) {
                 if (!task.practicaId) throw new Error("ID de práctica no encontrado.");
                 return db.practicas.update(task.practicaId, { nota: 'Entregado (sin corregir)' });
            }
            
            // Standard flow: update enrollment
            return db.convocatorias.update(task.convocatoriaId, { 
                [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true,
                [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: today 
            });
        },
        onMutate: async (task: InformeTask) => {
            await queryClient.cancelQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            await queryClient.cancelQueries({ queryKey: ['practicas', legajo] });
            
            const previousConvocatoriasData = queryClient.getQueryData(['convocatorias', legajo, studentAirtableId]);
            const previousPracticasData = queryClient.getQueryData(['practicas', legajo]);

            queryClient.setQueryData(['convocatorias', legajo, studentAirtableId], (old: any) => {
                if (!old) return old;
                const newMyEnrollments = old.myEnrollments.map((e: Convocatoria) => 
                    e.id === task.convocatoriaId ? { ...e, [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true } : e
                );
                return { ...old, myEnrollments: newMyEnrollments };
            });

            if (task.practicaId) {
                queryClient.setQueryData(['practicas', legajo], (old: any) => {
                    if (!old) return old;
                    return old.map((p: any) => p.id === task.practicaId ? { ...p, nota: 'Entregado (sin corregir)' } : p);
                });
            }
            
            // Instant feedback
            showModal('Confirmación Exitosa', 'Hemos recibido la confirmación de tu entrega. ¡Gracias!');
            
            return { previousConvocatoriasData, previousPracticasData };
        },
        onError: (err, task, context) => {
            showModal('Error', `No se pudo confirmar la entrega: ${err.message}`);
            if (context?.previousConvocatoriasData) {
                queryClient.setQueryData(['convocatorias', legajo, studentAirtableId], context.previousConvocatoriasData);
            }
             if (context?.previousPracticasData) {
                queryClient.setQueryData(['practicas', legajo], context.previousPracticasData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
        }
    });

    return {
        lanzamientos,
        myEnrollments,
        allLanzamientos,
        institutionAddressMap,
        isConvocatoriasLoading,
        convocatoriasError,
        refetchConvocatorias,
        enrollStudent,
        confirmInforme,
    };
};
