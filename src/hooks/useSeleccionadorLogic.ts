
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { toggleStudentSelection } from '../services/dataService';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_PENALIZACION_ESTUDIANTE_LINK,
    FIELD_PENALIZACION_PUNTAJE,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
} from '../constants';
import { normalizeStringForComparison } from '../utils/formatters';
import type { LanzamientoPPS, ConvocatoriaFields, AirtableRecord, EnrichedStudent } from '../types';
import { sendSmartEmail } from '../utils/emailService';

const SCORE_WEIGHTS = {
    TERMINO_CURSAR: 100,
    CURSANDO_ELECTIVAS: 50,
    BASE_FINALES: 30,
    PER_HOUR: 0.5,
};

const calculateScore = (
    enrollment: AirtableRecord<ConvocatoriaFields>,
    hours: number,
    penalties: number
): number => {
    let academicScore = 0;
    const termino = enrollment[FIELD_TERMINO_CURSAR_CONVOCATORIAS] === 'Sí';
    const electivas = enrollment[FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS] === 'Sí';
    
    if (termino) {
        academicScore = SCORE_WEIGHTS.TERMINO_CURSAR;
    } else if (electivas) {
        academicScore = SCORE_WEIGHTS.CURSANDO_ELECTIVAS;
    } else {
        academicScore = SCORE_WEIGHTS.BASE_FINALES;
    }

    const hoursScore = hours * SCORE_WEIGHTS.PER_HOUR;
    const penaltyScore = penalties; 

    return Math.round(academicScore + hoursScore - penaltyScore);
};

export const useSeleccionadorLogic = (isTestingMode = false, onNavigateToInsurance?: (id: string) => void) => {
    const [selectedLanzamiento, setSelectedLanzamiento] = useState<LanzamientoPPS | null>(null);
    const [viewMode, setViewMode] = useState<'selection' | 'review'>('selection');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [isClosingTable, setIsClosingTable] = useState(false);
    
    const queryClient = useQueryClient();

    // 1. Fetch Open Launches
    const { data: openLaunches = [], isLoading: isLoadingLaunches } = useQuery({
        queryKey: ['openLaunchesForSelector', isTestingMode],
        queryFn: async () => {
            if (isTestingMode) return [];
            
            // Client-side filtering for better reliability with Supabase filters
            const records = await db.lanzamientos.getAll();
            
            return records
                .map(r => r as LanzamientoPPS) // Ensure flat object usage
                .filter(l => {
                    const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
                    return status === 'abierta' || status === 'abierto';
                });
        }
    });

    const candidatesQueryKey = ['candidatesForLaunch', selectedLanzamiento?.id];

    // 2. Fetch Candidates
    const { data: candidates = [], isLoading: isLoadingCandidates, refetch: refetchCandidates } = useQuery({
        queryKey: candidatesQueryKey,
        queryFn: async () => {
            if (!selectedLanzamiento) return [];
            
            const launchId = selectedLanzamiento.id;
            
            // Use simple filter then refine or fetch all convocatorias and filter in JS
            // Given structure, fetching all convocatorias might be heavy. 
            // Let's use filterByFormula which supports SEARCH/EQ in supabaseService for simple cases
            // or fetching all if the formula is too complex.
            // NOTE: `SEARCH` is not standard Supabase. `supabaseService` implements custom logic for it? 
            // Actually `supabaseService` implements regex for `SEARCH`.
            // Let's try fetching all convocatorias for safety or stick to a simpler filter.
            // Since `supabaseService` implementation of `filterByFormula` is limited, let's fetch all convocatorias
            // and filter in JS. It's safer.
            
            const allEnrollments = await db.convocatorias.getAll();
            const enrollments = allEnrollments.filter(c => {
                 const linked = c[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS];
                 if (Array.isArray(linked)) return linked.includes(launchId);
                 return linked === launchId;
            });
            
            if (enrollments.length === 0) return [];

            const studentIds = enrollments.map(e => {
                const raw = e[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
                return Array.isArray(raw) ? raw[0] : raw;
            }).filter(Boolean) as string[];
            
            // Fetch ALL related data to join in memory (safest with flat Supabase structure)
            const [studentsRes, practicasRes, penaltiesRes] = await Promise.all([
                db.estudiantes.getAll(),
                db.practicas.getAll(),
                db.penalizaciones.getAll()
            ]);

            const studentMap = new Map(studentsRes.map(s => [s.id, s]));
            
            const enrichedList: EnrichedStudent[] = enrollments.map(enrollment => {
                const sIdRaw = enrollment[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
                const sId = Array.isArray(sIdRaw) ? sIdRaw[0] : sIdRaw;

                const studentDetails = sId ? studentMap.get(String(sId)) : null;
                if (!studentDetails) return null;

                const studentPractices = practicasRes.filter(p => {
                     const links = p[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                     return Array.isArray(links) ? links.includes(String(sId)) : links === String(sId);
                });
                const totalHoras = studentPractices.reduce((sum, p) => sum + (p[FIELD_HORAS_PRACTICAS] || 0), 0);

                const studentPenalties = penaltiesRes.filter(p => {
                    const links = p[FIELD_PENALIZACION_ESTUDIANTE_LINK];
                    return Array.isArray(links) ? links.includes(String(sId)) : links === String(sId);
                });
                const penalizacionAcumulada = studentPenalties.reduce((sum, p) => sum + (p[FIELD_PENALIZACION_PUNTAJE] || 0), 0);

                const puntajeTotal = calculateScore(enrollment, totalHoras, penalizacionAcumulada);

                return {
                    enrollmentId: enrollment.id,
                    studentId: String(sId),
                    nombre: studentDetails[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido',
                    legajo: studentDetails[FIELD_LEGAJO_ESTUDIANTES] || '',
                    correo: studentDetails[FIELD_CORREO_ESTUDIANTES] || '',
                    status: enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS] || 'Inscripto',
                    terminoCursar: enrollment[FIELD_TERMINO_CURSAR_CONVOCATORIAS] === 'Sí',
                    cursandoElectivas: enrollment[FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS] === 'Sí',
                    finalesAdeuda: enrollment[FIELD_FINALES_ADEUDA_CONVOCATORIAS] || '',
                    notasEstudiante: enrollment[FIELD_OTRA_SITUACION_CONVOCATORIAS] || '',
                    horarioSeleccionado: enrollment[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || '',
                    totalHoras,
                    penalizacionAcumulada,
                    puntajeTotal
                };
            }).filter((item): item is EnrichedStudent => item !== null);

            return enrichedList.sort((a, b) => b.puntajeTotal - a.puntajeTotal);
        },
        enabled: !!selectedLanzamiento
    });

    const selectedCandidates = useMemo(() => 
        candidates.filter(c => normalizeStringForComparison(c.status) === 'seleccionado'),
    [candidates]);

    const toggleMutation = useMutation({
        mutationFn: async (student: EnrichedStudent) => {
            if (!selectedLanzamiento) return;
            const isCurrentlySelected = normalizeStringForComparison(student.status) === 'seleccionado';
            const result = await toggleStudentSelection(
                student.enrollmentId, 
                !isCurrentlySelected, 
                student.studentId, 
                selectedLanzamiento
            );
            return { ...result, student };
        },
        onSuccess: (data) => {
             if (!data?.success) {
                 setToastInfo({ message: `Error: ${data?.error}`, type: 'error' });
                 refetchCandidates(); 
             }
        },
        onError: (err) => setToastInfo({ message: `Error: ${err.message}`, type: 'error' }),
        onSettled: () => setUpdatingId(null)
    });

    const scheduleMutation = useMutation({
        mutationFn: async ({ id, schedule }: { id: string, schedule: string }) => {
            return db.convocatorias.update(id, { [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: schedule });
        },
        onSuccess: () => {
             setToastInfo({ message: 'Horario actualizado.', type: 'success' });
             refetchCandidates();
        }
    });

    // Mutation to Close Call
    const closeLaunchMutation = useMutation({
        mutationFn: async () => {
            if (!selectedLanzamiento) return;
            return db.lanzamientos.update(selectedLanzamiento.id, {
                [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado'
            });
        },
        onSuccess: () => {
            setToastInfo({ message: 'Convocatoria cerrada exitosamente.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['openLaunchesForSelector'] });
            queryClient.invalidateQueries({ queryKey: ['launchHistory'] }); // Update History Tab
            setSelectedLanzamiento(null); 
        },
        onError: (err: Error) => {
            setToastInfo({ message: `Error al cerrar: ${err.message}`, type: 'error' });
        }
    });

    const handleToggle = (student: EnrichedStudent) => {
        setUpdatingId(student.enrollmentId);
        toggleMutation.mutate(student);
    };

    const handleUpdateSchedule = (id: string, newSchedule: string) => {
        scheduleMutation.mutate({ id, schedule: newSchedule });
    };

    const handleCloseLaunch = () => {
        if (window.confirm('¿Estás seguro de cerrar esta convocatoria? Esto hará visibles los resultados a los alumnos.')) {
            closeLaunchMutation.mutate();
        }
    };

    const handleConfirmAndCloseTable = async () => {
        if (!selectedLanzamiento) return;
        if (!window.confirm(`¿Cerrar mesa? Se enviarán correos a ${selectedCandidates.length} alumnos.`)) return;

        setIsClosingTable(true);
        try {
            let emailSuccessCount = 0;
            const emailPromises = selectedCandidates.map(async (student) => {
                 const res = await sendSmartEmail('seleccion', {
                     studentName: student.nombre,
                     studentEmail: student.correo,
                     ppsName: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                     schedule: student.horarioSeleccionado || 'A confirmar'
                 });
                 if (res.success) emailSuccessCount++;
                 return res;
            });
            await Promise.all(emailPromises);
            
            await db.lanzamientos.update(selectedLanzamiento.id, { [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Cerrado' });
            
            setToastInfo({ message: `Mesa cerrada. ${emailSuccessCount} correos enviados.`, type: 'success' });
            
            if (onNavigateToInsurance) {
                setTimeout(() => onNavigateToInsurance(selectedLanzamiento.id), 1500);
            } else {
                queryClient.invalidateQueries({ queryKey: ['openLaunchesForSelector'] });
                queryClient.invalidateQueries({ queryKey: ['launchHistory'] }); // Update History Tab
                setSelectedLanzamiento(null);
            }
        } catch (e: any) {
            setToastInfo({ message: `Error: ${e.message}`, type: 'error' });
        } finally {
            setIsClosingTable(false);
        }
    };

    return {
        selectedLanzamiento, setSelectedLanzamiento,
        viewMode, setViewMode,
        toastInfo, setToastInfo,
        updatingId,
        isClosingTable,
        openLaunches, isLoadingLaunches,
        candidates, isLoadingCandidates,
        selectedCandidates,
        handleToggle,
        handleUpdateSchedule,
        handleConfirmAndCloseTable,
        closeLaunchMutation
    };
};
