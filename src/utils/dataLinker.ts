
import type { Convocatoria, LanzamientoPPS, Practica, InformeTask } from '../types';
import { normalizeStringForComparison, parseToUTCDate, safeGetId } from './formatters';
import {
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_INFORME_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_ESTADO_PRACTICA,
    FIELD_NOTA_PRACTICAS,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS
} from '../constants';

interface LinkDataParams {
    myEnrollments: Convocatoria[];
    allLanzamientos: LanzamientoPPS[];
    practicas: Practica[];
}

/**
 * Processes student data.
 * Since Supabase now returns joined data for 'myEnrollments', 
 * this function primarily focuses on grouping logic and status determination.
 */
export function processAndLinkStudentData({ myEnrollments, allLanzamientos, practicas }: LinkDataParams) {
    const lanzamientosMap = new Map(allLanzamientos.map(l => [l.id, l]));
    
    // Step 1: Prioritize Enrollments
    // Supabase ensures 'lanzamiento_id' is present, so grouping is robust.
    const enrollmentsByPpsId = new Map<string, Convocatoria[]>();
    
    myEnrollments.forEach(enrollment => {
        // SAFE ID ACCESS: Handles both Array (legacy) and String (SQL)
        const linkedId = safeGetId(enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]);
        
        if (linkedId) {
            if (!enrollmentsByPpsId.has(linkedId)) {
                enrollmentsByPpsId.set(linkedId, []);
            }
            enrollmentsByPpsId.get(linkedId)!.push(enrollment);
        }
    });

    // Step 2: For each group, find the one with the highest priority status.
    const enrollmentMap = new Map<string, Convocatoria>();
    const statusPriority: { [key: string]: number } = {
        'seleccionado': 3,
        'inscripto': 2,
        'no seleccionado': 1,
    };

    enrollmentsByPpsId.forEach((enrollmentGroup, ppsId) => {
        const bestEnrollment = enrollmentGroup.reduce((best, current) => {
            const bestStatus = normalizeStringForComparison(best[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]);
            const currentStatus = normalizeStringForComparison(current[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]);
            const bestPriority = statusPriority[bestStatus] || 0;
            const currentPriority = statusPriority[currentStatus] || 0;
            return currentPriority > bestPriority ? current : best;
        });
        enrollmentMap.set(ppsId, bestEnrollment);
    });

    // Step 3: Identify completed practices (Optimized)
    // Rely on the Practice record itself, which contains the institution name snapshot.
    // This removes the dependency on fetching the entire database of old launches.
    const completedLanzamientoIds = new Set<string>();
    const finalizadaStatuses = ['finalizada', 'pps realizada', 'convenio realizado', 'aprobada'];
    
    practicas.forEach(practica => {
        const estadoPractica = normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]);
        if (finalizadaStatuses.includes(estadoPractica)) {
            // Track via Link ID if available (Current active links)
            const linkedId = safeGetId(practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]);
            if (linkedId) {
                completedLanzamientoIds.add(linkedId);
            }
            
            // Track via Institution Name (Historical/Legacy links)
            // This allows us to say "You already went to Hospital Central" even if the Launch ID is old/archived.
            const pNameRaw = practica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
            const pName = Array.isArray(pNameRaw) ? pNameRaw[0] : pNameRaw;
            if (typeof pName === 'string' && pName.trim()) {
                const groupName = pName.split(' - ')[0].trim();
                completedLanzamientoIds.add(normalizeStringForComparison(groupName));
            }
        }
    });

    // Step 4: Generate informe tasks
    const informeTasks: InformeTask[] = [];
    const processedForInforme = new Set<string>();

    // 4a. From Enrollments (Selections)
    for (const [ppsId, enrollment] of enrollmentMap.entries()) {
        if (normalizeStringForComparison(enrollment[FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]) === 'seleccionado') {
            const pps = lanzamientosMap.get(ppsId);
            // Only if report link exists
            if (pps && pps[FIELD_INFORME_LANZAMIENTOS]) {
                // Try to find matching practice for Grade
                const practica = practicas.find(p => safeGetId(p[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]) === pps.id);
                
                informeTasks.push({
                    convocatoriaId: enrollment.id,
                    practicaId: practica?.id,
                    ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica',
                    informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
                    fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || new Date().toISOString(),
                    informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
                    nota: practica?.[FIELD_NOTA_PRACTICAS],
                    fechaEntregaInforme: enrollment[FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS],
                });
                processedForInforme.add(ppsId);
            }
        }
    }

    // 4b. From Finished Practices (orphan, no active enrollment found or manual entry)
    // This requires the PPS data to be present in 'allLanzamientos'. 
    // Since we reduced 'allLanzamientos' to mostly active ones + enrolled ones in dataService, 
    // some very old tasks might not appear here if they are not in 'myEnrollments', but that's expected behavior (archived).
    for (const practica of practicas) {
        const linkedId = safeGetId(practica[FIELD_LANZAMIENTO_VINCULADO_PRACTICAS]);
        
        if (linkedId && !processedForInforme.has(linkedId)) {
             const pps = lanzamientosMap.get(linkedId);
             const estado = normalizeStringForComparison(practica[FIELD_ESTADO_PRACTICA]);
             
             if (pps && pps[FIELD_INFORME_LANZAMIENTOS] && finalizadaStatuses.includes(estado)) {
                 informeTasks.push({
                    convocatoriaId: `practica-${practica.id}`, // Virtual ID
                    practicaId: practica.id,
                    ppsName: pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica',
                    informeLink: pps[FIELD_INFORME_LANZAMIENTOS],
                    fechaFinalizacion: pps[FIELD_FECHA_FIN_LANZAMIENTOS] || practica[FIELD_FECHA_FIN_PRACTICAS] || new Date().toISOString(),
                    informeSubido: !!practica[FIELD_NOTA_PRACTICAS], // Assume uploaded if graded
                    nota: practica[FIELD_NOTA_PRACTICAS],
                });
                processedForInforme.add(linkedId);
             }
        }
    }
    
    // Sort: Pending first
    informeTasks.sort((a, b) => {
        const aIsPending = !a.informeSubido;
        const bIsPending = !b.informeSubido;
        if (aIsPending && !bIsPending) return -1;
        if (!aIsPending && bIsPending) return 1;
        
        const dateA = parseToUTCDate(a.fechaFinalizacion)?.getTime() || 0;
        const dateB = parseToUTCDate(b.fechaFinalizacion)?.getTime() || 0;
        return dateA - dateB;
    });

    return { enrollmentMap, completedLanzamientoIds, informeTasks };
}
