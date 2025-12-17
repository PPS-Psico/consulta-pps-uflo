
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { 
    TABLE_NAME_ESTUDIANTES, 
    TABLE_NAME_PRACTICAS, 
    TABLE_NAME_CONVOCATORIAS, 
    TABLE_NAME_LANZAMIENTOS_PPS,
    TABLE_NAME_FINALIZACION, 
    TABLE_NAME_PPS, // Solicitudes
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_FINALIZARON_ESTUDIANTES, 
    FIELD_FECHA_INICIO_PRACTICAS, 
    FIELD_ESTUDIANTE_LINK_PRACTICAS, 
    FIELD_FECHA_FINALIZACION_ESTUDIANTES,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_DNI_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_HORAS_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_ESTUDIANTE_FINALIZACION, 
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    // Fields for requests
    FIELD_SOLICITUD_NOMBRE_ALUMNO,
    FIELD_SOLICITUD_LEGAJO_ALUMNO,
    FIELD_EMPRESA_PPS_SOLICITUD,
    FIELD_ESTADO_PPS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_CONVENIO_NUEVO_INSTITUCIONES,
    // Missing imports added
    FIELD_USER_ID_ESTUDIANTES,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    TABLE_NAME_INSTITUCIONES,
    FIELD_LEGAJO_PPS
} from '../constants';
import { fetchAllData } from '../services/supabaseService';
import { parseToUTCDate, formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { 
    EstudianteFields, PracticaFields, LanzamientoPPSFields, InstitucionFields, SolicitudPPSFields,
    AirtableRecord, StudentInfo, TimelineMonthData, AnyReportData, ExecutiveReportData, 
    ComparativeExecutiveReportData, ReportType, PPSRequestSummary 
} from '../types';
import { estudianteArraySchema, institucionArraySchema, lanzamientoPPSArraySchema, practicaArraySchema, solicitudPPSArraySchema } from '../schemas';

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    // Split by common separators to get the base name
    return name.split(/ [-–] /)[0].trim();
};

// Helper to clean array strings like '["rec..."]'
const cleanRawValue = (val: any): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    return str.replace(/[\[\]"]/g, '').trim();
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const processLaunchesForYear = (
    year: number,
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[]
): { totalCuposForYear: number; totalLaunchesForYear: number; launchesByMonth: TimelineMonthData[] } => {
    const launchesForYear = allLanzamientos.filter(launch => {
        const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return date && date.getUTCFullYear() === year;
    });

    const totalCuposForYear = launchesForYear.reduce((sum, launch) => sum + (launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);

    const totalLaunchesForYearSet = new Set<string>();
    launchesForYear.forEach(launch => {
        const ppsName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        if (ppsName) {
            const groupName = getGroupName(ppsName);
            const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            if (date) {
                const monthIndex = date.getUTCMonth();
                totalLaunchesForYearSet.add(`${groupName}::${monthIndex}`);
            }
        }
    });
    const totalLaunchesForYear = totalLaunchesForYearSet.size;

    const monthlyData: { [key: number]: {
        cuposTotal: number;
        institutions: Map<string, { cupos: number; variants: string[] }>;
    } } = {};

    launchesForYear.forEach(launch => {
        const date = parseToUTCDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS])!;
        const monthIndex = date.getUTCMonth();
        
        if (!monthlyData[monthIndex]) {
            monthlyData[monthIndex] = { cuposTotal: 0, institutions: new Map() };
        }
        
        const cupos = launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
        monthlyData[monthIndex].cuposTotal += cupos;
        
        const ppsName = launch[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        if (ppsName) {
            const groupName = getGroupName(ppsName);
            const institutionData = monthlyData[monthIndex].institutions.get(groupName) || { cupos: 0, variants: [] };
            institutionData.cupos += cupos;
            institutionData.variants.push(ppsName);
            monthlyData[monthIndex].institutions.set(groupName, institutionData);
        }
    });

    const launchesByMonth = MONTH_NAMES.map((monthName, index) => {
        const data = monthlyData[index];
        if (!data) return null;
        return {
            monthName,
            ppsCount: data.institutions.size,
            cuposTotal: data.cuposTotal,
            institutions: Array.from(data.institutions.entries()).map(([name, details]) => ({
                name,
                cupos: details.cupos,
                variants: details.variants.sort(),
            })).sort((a, b) => a.name.localeCompare(b.name)),
        };
    }).filter((item): item is TimelineMonthData => item !== null);

    return { totalCuposForYear, totalLaunchesForYear, launchesByMonth };
};


const fetchAllDataForReport = async () => {
    const [estudiantesRes, practicasRes, lanzamientosRes, institucionesRes, solicitudesRes] = await Promise.all([
        fetchAllData<EstudianteFields>(TABLE_NAME_ESTUDIANTES, estudianteArraySchema, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_FINALIZARON_ESTUDIANTES, FIELD_FECHA_FINALIZACION_ESTUDIANTES, FIELD_USER_ID_ESTUDIANTES]),
        fetchAllData<PracticaFields>(TABLE_NAME_PRACTICAS, practicaArraySchema, [FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS]),
        fetchAllData<LanzamientoPPSFields>(TABLE_NAME_LANZAMIENTOS_PPS, lanzamientoPPSArraySchema, [FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS]),
        fetchAllData<InstitucionFields>(TABLE_NAME_INSTITUCIONES, institucionArraySchema, [FIELD_CONVENIO_NUEVO_INSTITUCIONES, FIELD_NOMBRE_INSTITUCIONES]),
        fetchAllData<SolicitudPPSFields>(TABLE_NAME_PPS, solicitudPPSArraySchema, [FIELD_SOLICITUD_NOMBRE_ALUMNO, FIELD_SOLICITUD_LEGAJO_ALUMNO, FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_LEGAJO_PPS])
    ]);

    const error = estudiantesRes.error || practicasRes.error || lanzamientosRes.error || institucionesRes.error || solicitudesRes.error;
    if (error) {
        throw new Error('Error fetching data: ' + (typeof error.error === 'string' ? error.error : error.error.message));
    }

    return {
        estudiantes: estudiantesRes.records,
        practicas: practicasRes.records,
        lanzamientos: lanzamientosRes.records,
        instituciones: institucionesRes.records,
        solicitudes: solicitudesRes.records,
    };
};

const getMetricsSnapshot = (
    snapshotDate: Date,
    allEstudiantes: AirtableRecord<EstudianteFields>[],
    allPracticas: AirtableRecord<PracticaFields>[],
    studentEntryMap: Map<string, Date>
) => {
    const snapshotDay = new Date(snapshotDate);
    snapshotDay.setUTCHours(23, 59, 59, 999);

    const activeStudentRecords = allEstudiantes.filter(student => {
        // FILTER: Future students (no account, no history) should not be counted
        const hasUserAccount = !!student[FIELD_USER_ID_ESTUDIANTES];
        
        // Use effective entry date (from practice history if earlier than created_at)
        const entryDate = studentEntryMap.get(student.id);
        
        // If they entered AFTER the snapshot date, they weren't active then
        if (!entryDate || entryDate > snapshotDay) {
            return false;
        }
        
        // If they have no account AND no practices within the period, they are ghosts/future imports
        // We only check this for the *current* snapshot to filter out future-year students
        const snapshotYear = snapshotDay.getFullYear();
        if (!hasUserAccount) {
            // Check if they have ANY activity in this year to justify inclusion
             const hasActivity = allPracticas.some(p => {
                 const pDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
                 const links = p[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                 const isLinked = Array.isArray(links) ? links.includes(student.id) : links === student.id;
                 return isLinked && pDate && pDate.getFullYear() <= snapshotYear;
             });
             
             if (!hasActivity) return false;
        }

        const finalizationDate = parseToUTCDate(student[FIELD_FECHA_FINALIZACION_ESTUDIANTES]);
        if (finalizationDate && student[FIELD_FINALIZARON_ESTUDIANTES]) {
             if (finalizationDate < snapshotDay) {
                return false;
            }
        }
        return true;
    });

    const activeStudentIds = new Set(activeStudentRecords.map(s => s.id));

    const studentPracticeTypes = new Map<string, { hasRelevamiento: boolean; hasOther: boolean }>();
    allPracticas.forEach(p => {
        const studentIds = (p[FIELD_ESTUDIANTE_LINK_PRACTICAS] as any) || [];
        const institucionRaw = (p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] as any);
        const institucion = String((Array.isArray(institucionRaw) ? institucionRaw[0] : institucionRaw) || '');
        const isRelevamiento = normalizeStringForComparison(institucion).includes('relevamiento');

        const ids = Array.isArray(studentIds) ? studentIds : [studentIds];

        ids.forEach((id: string) => {
            if (!activeStudentIds.has(id)) return;
            if (!studentPracticeTypes.has(id)) {
                studentPracticeTypes.set(id, { hasRelevamiento: false, hasOther: false });
            }
            const types = studentPracticeTypes.get(id)!;
            if (isRelevamiento) types.hasRelevamiento = true;
            else types.hasOther = true;
        });
    });

    const studentIdsWithAnyPractice = new Set(studentPracticeTypes.keys());
    const studentsWithoutAnyPps = activeStudentRecords.filter(student => !studentIdsWithAnyPractice.has(student.id)).length;

    return {
        activeStudents: activeStudentRecords.length,
        studentsWithoutAnyPps,
    };
};

const calculateFlowMetrics = (
    snapshotEndDate: Date,
    yearStartDate: Date,
    allEstudiantes: AirtableRecord<EstudianteFields>[],
    allInstituciones: AirtableRecord<InstitucionFields>[],
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[],
    studentEntryMap: Map<string, Date>
) => {
    const newStudents = allEstudiantes.filter(s => {
        // Only count new students if they have an account or activity
        const hasUserAccount = !!s[FIELD_USER_ID_ESTUDIANTES];
        if (!hasUserAccount) return false;

        const entryDate = studentEntryMap.get(s.id);
        return entryDate && entryDate >= yearStartDate && entryDate <= snapshotEndDate;
    }).length;

    const finishedStudents = allEstudiantes.filter(s => {
        const finalizationDate = parseToUTCDate(s[FIELD_FECHA_FINALIZACION_ESTUDIANTES]);
        return s[FIELD_FINALIZARON_ESTUDIANTES] &&
               finalizationDate &&
               finalizationDate >= yearStartDate &&
               finalizationDate <= snapshotEndDate;
    }).length;
    
    const newAgreements = allInstituciones.filter(i => {
        const isMarkedAsNew = i[FIELD_CONVENIO_NUEVO_INSTITUCIONES];
        if (!isMarkedAsNew) return false;
        
        const firstLaunchDate = allLanzamientos
            .filter(l => {
                const launchDate = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                return launchDate && launchDate.getUTCFullYear() === yearStartDate.getUTCFullYear() && normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').startsWith(normalizeStringForComparison(i[FIELD_NOMBRE_INSTITUCIONES]));
            })
            .map(l => parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]))
            .filter((d): d is Date => d !== null)
            .sort((a, b) => a.getTime() - b.getTime())[0];
            
        return firstLaunchDate && firstLaunchDate >= yearStartDate && firstLaunchDate <= snapshotEndDate;
    });
    
    return {
        newStudents,
        finishedStudents,
        newAgreements: newAgreements.length,
    };
};

const processRequestsForYear = (
    year: number,
    allSolicitudes: AirtableRecord<SolicitudPPSFields>[],
    allEstudiantes: AirtableRecord<EstudianteFields>[]
): PPSRequestSummary[] => {
    const studentMap = new Map(allEstudiantes.map(s => [s.id, s]));

    return allSolicitudes.filter(s => {
        const date = new Date(s.createdTime || s.created_at || '');
        const status = String(s[FIELD_ESTADO_PPS] || '');
        // Filter by year AND exclude 'Archivado'
        return !isNaN(date.getTime()) && 
               date.getFullYear() === year && 
               status !== 'Archivado';
    }).map(s => {
        // Resolve student name using ID if possible
        const studentIdRaw = s[FIELD_LEGAJO_PPS]; // This is estudiante_id
        const studentId = cleanRawValue(studentIdRaw);
        
        const student = studentMap.get(studentId);
        
        let name = 'Desconocido';
        let legajo = 'N/A';
        
        if (student) {
            name = String(student[FIELD_NOMBRE_ESTUDIANTES]);
            legajo = String(student[FIELD_LEGAJO_ESTUDIANTES]);
        } else {
             // Fallback to snapshot
             name = cleanRawValue(s[FIELD_SOLICITUD_NOMBRE_ALUMNO] || 'Desconocido');
             legajo = cleanRawValue(s[FIELD_SOLICITUD_LEGAJO_ALUMNO] || 'N/A');
        }

        return {
            id: s.id,
            studentName: name,
            studentLegajo: legajo,
            institutionName: cleanRawValue(s[FIELD_EMPRESA_PPS_SOLICITUD] || 'Institución'),
            requestDate: formatDate(s.createdTime || s.created_at || ''),
            status: String(s[FIELD_ESTADO_PPS] || 'Pendiente')
        };
    });
};

const MOCK_REPORT_DATA: ExecutiveReportData = {
    reportType: 'singleYear',
    year: new Date().getFullYear(),
    period: {
        current: { start: '01/01/2024', end: '31/12/2024' },
        previous: { start: '', end: '31/12/2023' },
    },
    summary: '<p>This is a mock summary for the test environment.</p>',
    kpis: {
        activeStudents: { current: 150, previous: 140 },
        studentsWithoutAnyPps: { current: 10, previous: 15 },
        newStudents: { current: 30, previous: 0 },
        finishedStudents: { current: 25, previous: 0 },
        newPpsLaunches: { current: 40, previous: 0 },
        totalOfferedSpots: { current: 120, previous: 0 },
        newAgreements: { current: 5, previous: 0 },
    },
    launchesByMonth: [],
    newAgreementsList: ['Mock Institution A', 'Mock Institution B'],
    ppsRequests: [
        { id: '1', studentName: 'Test Student', studentLegajo: '12345', institutionName: 'Hospital Mock', requestDate: '20/03/2024', status: 'En curso' },
        { id: '2', studentName: 'Test Student 2', studentLegajo: '54321', institutionName: 'Escuela Mock', requestDate: '25/03/2024', status: 'Pendiente' }
    ],
};

const MOCK_COMPARATIVE_REPORT_DATA: ComparativeExecutiveReportData = {
    reportType: 'comparative',
    summary: '<p>This is a mock comparative summary for the test environment.</p>',
    kpis: {
        activeStudents: { year2024: 140, year2025: 150 },
        studentsWithoutAnyPps: { year2024: 15, year2025: 10 },
        finishedStudents: { year2024: 20, year2025: 25 },
        newStudents: { year2024: 28, year2025: 30 },
        newPpsLaunches: { year2024: 35, year2025: 40 },
        totalOfferedSpots: { year2024: 110, year2025: 120 },
        newAgreements: { year2024: 4, year2025: 5 },
    },
    launchesByMonth: {
        year2024: [],
        year2025: [],
    },
    newAgreements: {
        year2024: ['Mock Old Agreement'],
        year2025: ['Mock New Agreement'],
    },
    ppsRequests: {
        year2024: [{ id: '1', studentName: 'Old Student', studentLegajo: '111', institutionName: 'Old Inst', requestDate: '10/05/2024', status: 'Finalizada' }],
        // Fix: Use ISO dates to ensure they are picked up by the year filter logic
        year2025: [{ id: '2', studentName: 'New Student', studentLegajo: '222', institutionName: 'New Inst', requestDate: '2025-05-10', status: 'Pendiente' }, { id: '3', studentName: 'New Student 2', studentLegajo: '333', institutionName: 'New Inst 2', requestDate: '2025-06-15', status: 'En Gestión' }]
    }
};

const useExecutiveReportData = ({ reportType, enabled = false, isTestingMode = false }: { reportType: ReportType | null; enabled?: boolean; isTestingMode?: boolean; }) => {
    return useQuery<AnyReportData, Error>({
        queryKey: ['executiveReportData', reportType, isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                if (reportType === 'comparative') {
                    return MOCK_COMPARATIVE_REPORT_DATA;
                }
                return MOCK_REPORT_DATA;
            }
            if (!reportType) throw new Error("A report type must be selected.");

            const allData = await fetchAllDataForReport();

            // Pre-calculate Effective Entry Dates
            const studentEntryMap = new Map<string, Date>();
            
            // 1. Check Practices
            allData.practicas.forEach(p => {
                const startDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
                if (!startDate) return;
                
                const rawLink = p[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                const ids = Array.isArray(rawLink) ? rawLink : [rawLink];
                
                ids.filter(Boolean).forEach((id: string) => {
                     const current = studentEntryMap.get(id);
                     if (!current || startDate < current) {
                         studentEntryMap.set(id, startDate);
                     }
                });
            });

            // 2. Fallback to Created At & Populate Map
            allData.estudiantes.forEach(s => {
                let date = parseToUTCDate(s.createdTime);
                const activityDate = studentEntryMap.get(s.id);
                
                if (activityDate && (!date || activityDate < date)) {
                    date = activityDate;
                }
                
                if (date) studentEntryMap.set(s.id, date);
            });


            const generateSingleYearReport = (year: number): ExecutiveReportData => {
                const yearStartDate = new Date(Date.UTC(year, 0, 1));
                const yearEndDate = new Date(Date.UTC(year + 1, 0, 1));
                yearEndDate.setUTCDate(yearEndDate.getUTCDate() - 1);
                
                const previousYearEndDate = new Date(Date.UTC(year, 0, 1));
                previousYearEndDate.setUTCDate(previousYearEndDate.getUTCDate() - 1);

                const currentSnapshot = getMetricsSnapshot(yearEndDate, allData.estudiantes, allData.practicas, studentEntryMap);
                const previousSnapshot = getMetricsSnapshot(previousYearEndDate, allData.estudiantes, allData.practicas, studentEntryMap);
                
                const flowMetrics = calculateFlowMetrics(yearEndDate, yearStartDate, allData.estudiantes, allData.instituciones, allData.lanzamientos, studentEntryMap);
                
                const launchesData = processLaunchesForYear(year, allData.lanzamientos);

                const newAgreementsList = allData.instituciones
                    .filter(i => {
                        if (!i[FIELD_CONVENIO_NUEVO_INSTITUCIONES]) return false;
                        const institutionName = i[FIELD_NOMBRE_INSTITUCIONES];
                        if (!institutionName) return false;
                        const normalizedInstName = normalizeStringForComparison(institutionName);
                        return allData.lanzamientos.some(l => {
                            const launchDate = parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                            return launchDate && launchDate.getUTCFullYear() === year && 
                                   normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').startsWith(normalizedInstName);
                        });
                    })
                    .map(i => getGroupName(i[FIELD_NOMBRE_INSTITUCIONES])); // Clean name
                
                const ppsRequests = processRequestsForYear(year, allData.solicitudes, allData.estudiantes);

                return {
                    reportType: 'singleYear',
                    year: year,
                    period: {
                        current: { start: formatDate(yearStartDate.toISOString())!, end: formatDate(yearEndDate.toISOString())! },
                        previous: { start: '', end: formatDate(previousYearEndDate.toISOString())! },
                    },
                    summary: `Este es un resumen autogenerado para el ciclo ${year}.`,
                    kpis: {
                        activeStudents: { current: currentSnapshot.activeStudents, previous: previousSnapshot.activeStudents },
                        studentsWithoutAnyPps: { current: currentSnapshot.studentsWithoutAnyPps, previous: previousSnapshot.studentsWithoutAnyPps },
                        newStudents: { current: flowMetrics.newStudents, previous: 0 },
                        finishedStudents: { current: flowMetrics.finishedStudents, previous: 0 },
                        newPpsLaunches: { current: launchesData.totalLaunchesForYear, previous: 0 },
                        totalOfferedSpots: { current: launchesData.totalCuposForYear, previous: 0 },
                        newAgreements: { current: flowMetrics.newAgreements, previous: 0 },
                    },
                    launchesByMonth: launchesData.launchesByMonth,
                    newAgreementsList: newAgreementsList,
                    ppsRequests: ppsRequests,
                };
            };

            if (reportType === '2024' || reportType === '2025') {
                return generateSingleYearReport(parseInt(reportType, 10));
            }

            if (reportType === 'comparative') {
                const data2024 = generateSingleYearReport(2024);
                const data2025 = generateSingleYearReport(2025);
                return {
                    reportType: 'comparative',
                    summary: `Comparación de métricas clave entre los ciclos 2024 y 2025.`,
                    kpis: {
                         activeStudents: { year2024: data2024.kpis.activeStudents.current, year2025: data2025.kpis.activeStudents.current },
                         studentsWithoutAnyPps: { year2024: data2024.kpis.studentsWithoutAnyPps.current, year2025: data2025.kpis.studentsWithoutAnyPps.current },
                         finishedStudents: { year2024: data2024.kpis.finishedStudents.current, year2025: data2025.kpis.finishedStudents.current },
                         newStudents: { year2024: data2024.kpis.newStudents.current, year2025: data2025.kpis.newStudents.current },
                         newPpsLaunches: { year2024: data2024.kpis.newPpsLaunches.current, year2025: data2025.kpis.newPpsLaunches.current },
                         totalOfferedSpots: { year2024: data2024.kpis.totalOfferedSpots.current, year2025: data2025.kpis.totalOfferedSpots.current },
                         newAgreements: { year2024: data2024.kpis.newAgreements.current, year2025: data2025.kpis.newAgreements.current },
                    },
                    launchesByMonth: {
                        year2024: data2024.launchesByMonth,
                        year2025: data2025.launchesByMonth,
                    },
                    newAgreements: {
                        year2024: data2024.newAgreementsList,
                        year2025: data2025.newAgreementsList,
                    },
                    ppsRequests: {
                        year2024: data2024.ppsRequests,
                        year2025: data2025.ppsRequests
                    }
                };
            }
            throw new Error(`Invalid report type: ${reportType}`);
        },
        enabled: enabled,
    });
};

export default useExecutiveReportData;
