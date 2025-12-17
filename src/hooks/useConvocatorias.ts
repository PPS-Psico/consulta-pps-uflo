
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { db } from '../lib/db';
import { mockDb } from '../services/mockDb';
import type { LanzamientoPPS, InformeTask, Convocatoria, AirtableRecord, ConvocatoriaFields, Estudiante } from '../types';
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
    FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_TRABAJA_ESTUDIANTES,
    FIELD_CERTIFICADO_TRABAJO_ESTUDIANTES,
    FIELD_TRABAJA_CONVOCATORIAS,
    FIELD_CERTIFICADO_TRABAJO_CONVOCATORIAS,
    FIELD_CV_CONVOCATORIAS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS
} from '../constants';
import { normalizeStringForComparison } from '../utils/formatters';

export const useConvocatorias = (legajo: string, studentAirtableId: string | null, studentDetails: Estudiante | null, isSuperUserMode: boolean) => {
    const queryClient = useQueryClient();
    const { 
        showModal, 
        openEnrollmentForm,
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
        queryFn: async () => {
            // TEST MODE LOGIC: Simulate the Join performed by fetchConvocatoriasData
            if (legajo === '99999') {
                const [myConvs, allLanz] = await Promise.all([
                    mockDb.getAll('convocatorias', { [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: studentAirtableId || 'st_999' }),
                    mockDb.getAll('lanzamientos_pps')
                ]);

                const launchesMap = new Map(allLanz.map((l: any) => [l.id, l]));
                
                // Hydrate enrollments like Supabase View
                const hydratedEnrollments = myConvs.map((row: any) => {
                    const launchId = row[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS];
                    const launch: any = launchesMap.get(launchId);
                    
                    return {
                        ...row,
                        [FIELD_NOMBRE_PPS_CONVOCATORIAS]: launch?.[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                        [FIELD_FECHA_INICIO_CONVOCATORIAS]: launch?.[FIELD_FECHA_INICIO_LANZAMIENTOS],
                        [FIELD_FECHA_FIN_CONVOCATORIAS]: launch?.[FIELD_FECHA_FIN_LANZAMIENTOS],
                        [FIELD_DIRECCION_CONVOCATORIAS]: launch?.[FIELD_DIRECCION_LANZAMIENTOS],
                        [FIELD_ORIENTACION_CONVOCATORIAS]: launch?.[FIELD_ORIENTACION_LANZAMIENTOS],
                        [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: launch?.[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]
                    };
                });

                // Filter available launches similar to production logic
                const availableLaunches = allLanz.filter((l: any) => {
                    const estadoConv = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
                    const estadoGestion = l[FIELD_ESTADO_GESTION_LANZAMIENTOS];
                    return estadoConv !== 'oculto' && estadoGestion !== 'Archivado' && estadoGestion !== 'No se Relanza';
                });

                const institutionAddressMap = new Map<string, string>();
                allLanz.forEach((l: any) => {
                    const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                    const addr = l[FIELD_DIRECCION_LANZAMIENTOS];
                    if (name && addr) institutionAddressMap.set(normalizeStringForComparison(name), addr);
                });

                return {
                    lanzamientos: availableLaunches,
                    myEnrollments: hydratedEnrollments,
                    allLanzamientos: allLanz,
                    institutionAddressMap
                };
            }

            return fetchConvocatoriasData(legajo, studentAirtableId, isSuperUserMode);
        },
        enabled: !!studentAirtableId || isSuperUserMode || legajo === '99999',
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
        refetchOnWindowFocus: true, // IMPORTANT: Enable this for the simulation to react
    });
    
    const { lanzamientos = [], myEnrollments = [], allLanzamientos = [], institutionAddressMap = new Map() } = convocatoriasData || {};

    const enrollmentMutation = useMutation<AirtableRecord<ConvocatoriaFields> | null, Error, { formData: any, selectedLanzamiento: LanzamientoPPS }, { previousData: unknown }>({
        mutationFn: async ({ formData, selectedLanzamiento }) => {
            if (legajo === '99999') {
                await new Promise(resolve => setTimeout(resolve, 800));
                
                const newRecord = {
                    [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: selectedLanzamiento.id,
                    [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: 'st_999', // Hardcoded for test user
                    [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
                    [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                    [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                    [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: formData.horarios.join('; '),
                    // Add other fields as needed for the mock to feel real
                };
                
                await mockDb.create('convocatorias', newRecord);
                return newRecord as any;
            }

            if (!studentAirtableId) throw new Error("No se pudo identificar al estudiante.");
            
            // 1. Update Student Profile if Work Status Changed or New Certificate Uploaded
            const studentUpdates: any = {};
            let shouldUpdateStudent = false;

            if (formData.trabaja !== undefined) {
                studentUpdates[FIELD_TRABAJA_ESTUDIANTES] = formData.trabaja;
                shouldUpdateStudent = true;
            }
            if (formData.certificadoTrabajoUrl) {
                studentUpdates[FIELD_CERTIFICADO_TRABAJO_ESTUDIANTES] = formData.certificadoTrabajoUrl;
                shouldUpdateStudent = true;
            }

            if (shouldUpdateStudent) {
                await db.estudiantes.update(studentAirtableId, studentUpdates);
            }

            // 2. Create Convocatoria Record
            const newRecordFields: any = {
                [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: selectedLanzamiento.id,
                [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: studentAirtableId,
                [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: "Inscripto",
                [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? "Sí" : "No",
                [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
                [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || null,
                [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas ? "Sí" : "No",
                [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: formData.horarios.join('; '),
                
                // Snapshots for this specific application (Work info specific to this enrollment)
                [FIELD_TRABAJA_CONVOCATORIAS]: formData.trabaja,
                [FIELD_CERTIFICADO_TRABAJO_CONVOCATORIAS]: formData.certificadoTrabajoUrl || studentDetails?.[FIELD_CERTIFICADO_TRABAJO_ESTUDIANTES] || null,
                [FIELD_CV_CONVOCATORIAS]: formData.cvUrl || null,

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
                // Also invalidate student profile to reflect work status changes
                queryClient.invalidateQueries({ queryKey: ['student', legajo] });
                closeEnrollmentForm();
            }
        },
        onSettled: () => {
            setIsSubmittingEnrollment(false);
        }
    });

    const confirmInformeMutation = useMutation({
        mutationFn: async (task: InformeTask) => {
            if (legajo === '99999') {
                if (task.practicaId) {
                    await mockDb.update('practicas', task.practicaId, { [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)' });
                } else if (task.convocatoriaId) {
                    await mockDb.update('convocatorias', task.convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true });
                }
                return;
            }
            
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
            try {
                if (!openEnrollmentForm) {
                    throw new Error("La función para abrir el formulario no está disponible. Intenta recargar la página.");
                }
                const handleSubmit = async (formData: any) => {
                    await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento: lanzamiento });
                };
                
                // Pass studentDetails to form so it can check work status
                openEnrollmentForm(lanzamiento, studentDetails, handleSubmit);
            } catch (e: any) {
                console.error("Error al intentar inscribir:", e);
                showModal("Error de Sistema", `No se pudo iniciar el proceso de inscripción: ${e.message}`);
            }
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
