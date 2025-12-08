
import { useMemo, useState, useEffect, useCallback } from 'react';
import { differenceInDays } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '../constants/configConstants';
import { 
    FIELD_NOMBRE_PPS_LANZAMIENTOS, 
    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS
} from '../constants';

interface DashboardData {
    endingLaunches: any[];
    pendingFinalizations: any[];
    pendingRequests: any[];
    confirmedRelaunches: any[];
}

export type PriorityLevel = 'critical' | 'warning' | 'stable' | 'optimal';

export interface SmartInsight {
    type: PriorityLevel;
    message: string;
    actionLabel?: string;
    actionLink?: string;
    icon: string;
}

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

export const useSmartAnalysis = (data: DashboardData | undefined, isLoading: boolean) => {
    const [aiSummary, setAiSummary] = useState<string | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // 1. Algorithmic Analysis (Instant & Deterministic)
    const algorithmicAnalysis = useMemo(() => {
        if (isLoading || !data || !data.endingLaunches || !data.pendingRequests) {
            return {
                status: 'loading' as const,
                insights: [],
                systemScore: 0,
                rawData: null
            };
        }

        const insights: SmartInsight[] = [];
        let systemScore = 100;
        const now = new Date();
        const currentMonthName = MONTH_NAMES[now.getMonth()];
        const currentYear = now.getFullYear();

        // --- REGLA 1: Relanzamientos Pendientes (NUEVO) ---
        // Detecta si estamos en la fecha (mes) de relanzamiento y aún no se abrió
        const overdueRelaunches = data.confirmedRelaunches.filter((r: any) => {
            const dateStr = String(r[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS] || '').toLowerCase();
            const notes = String(r[FIELD_NOTAS_GESTION_LANZAMIENTOS] || '').toLowerCase();
            
            // Check exact match with current month name in date field or notes
            const isMonthMatch = dateStr.includes(currentMonthName.toLowerCase()) || notes.includes(currentMonthName.toLowerCase());
            
            // Check date object if it's a valid date string
            let isDateMatch = false;
            const parsedDate = new Date(dateStr);
            if (!isNaN(parsedDate.getTime())) {
                // If it's a date in the past or today
                if (parsedDate <= now) isDateMatch = true;
            }

            return isMonthMatch || isDateMatch;
        });

        // --- REGLA 2: Análisis de Solicitudes (Distinción Interna vs Externa) ---
        const terminalStates = ['finalizada', 'cancelada', 'rechazada', 'archivado', 'pps realizada', 'no se pudo concretar'];
        const internalActionStates = ['pendiente', 'realizando convenio']; 
        
        let internalStagnantCount = 0;
        let externalStagnantCount = 0;

        data.pendingRequests.forEach((r: any) => {
            const status = String(r.estado_seguimiento || '').toLowerCase();
            if (terminalStates.includes(status)) return;
            
            if (!r.updated) return;
            const lastUpdate = new Date(r.updated);
            const daysDiff = differenceInDays(now, lastUpdate);

            if (internalActionStates.includes(status)) {
                if (daysDiff > 5) internalStagnantCount++;
            } else {
                if (daysDiff > 7) externalStagnantCount++;
            }
        });

        // --- REGLA 3: Vencimientos de PPS ---
        const unmanagedClosures = data.endingLaunches.filter((l: any) => {
            const isEndingSoon = l.daysLeft <= 7; 
            const managementStatus = String(l.estado_gestion || 'Pendiente de Gestión');
            return isEndingSoon && (managementStatus === 'Pendiente de Gestión' || managementStatus === 'Esperando Respuesta');
        });

        const overdueClosures = data.endingLaunches.filter((l: any) => l.daysLeft < 0 && String(l.estado_gestion) === 'Pendiente de Gestión');

        // --- REGLA 4: Carga de Acreditaciones ---
        const pendingAccreditationsCount = data.pendingFinalizations ? data.pendingFinalizations.length : 0;


        // --- CÁLCULO DE PUNTAJE ---
        if (overdueRelaunches.length > 0) systemScore -= 20; // Penalización por no lanzar a tiempo
        if (overdueClosures.length > 0) systemScore -= 30;
        if (internalStagnantCount > 0) systemScore -= (internalStagnantCount * 5);
        if (pendingAccreditationsCount > 0) systemScore -= (pendingAccreditationsCount * 3);
        if (unmanagedClosures.length > 0) systemScore -= 10;
        
        systemScore = Math.max(0, Math.min(100, systemScore));

        // --- GENERACIÓN DE INSIGHTS PRIORIZADOS ---

        // 1. RELANZAMIENTOS (Top Priority if due)
        if (overdueRelaunches.length > 0) {
            const names = overdueRelaunches.slice(0, 2).map((r: any) => r[FIELD_NOMBRE_PPS_LANZAMIENTOS]).join(', ');
            const suffix = overdueRelaunches.length > 2 ? ` y ${overdueRelaunches.length - 2} más` : '';
            insights.push({
                type: 'critical',
                message: `Es ${currentMonthName} y debes relanzar: ${names}${suffix}. Revisa tus notas.`,
                actionLabel: 'Gestionar',
                actionLink: '/admin/gestion?filter=all', // Go to manager to launch
                icon: 'rocket_launch'
            });
        }

        if (pendingAccreditationsCount > 0) {
             insights.push({
                type: pendingAccreditationsCount > 5 ? 'warning' : 'optimal',
                message: `${pendingAccreditationsCount} trámites de acreditación esperan tu revisión.`,
                actionLabel: 'Procesar',
                actionLink: '/admin/solicitudes?tab=egreso',
                icon: 'verified'
            });
        }

        if (unmanagedClosures.length > 0 || overdueClosures.length > 0) {
            const total = unmanagedClosures.length + overdueClosures.length;
            insights.push({
                type: 'critical',
                message: `${total} Convenios vencen esta semana sin gestión definida.`,
                actionLabel: 'Resolver',
                actionLink: '/admin/gestion?filter=proximas',
                icon: 'event_busy'
            });
        }

        if (internalStagnantCount > 0) {
            insights.push({
                type: 'warning',
                message: `${internalStagnantCount} solicitudes nuevas llevan +5 días sin respuesta.`,
                actionLabel: 'Atender',
                actionLink: '/admin/solicitudes?tab=ingreso',
                icon: 'person_alert'
            });
        }
        
        let status: PriorityLevel = 'optimal';
        if (systemScore < 60) status = 'critical';
        else if (systemScore < 85) status = 'warning';
        else if (systemScore < 98) status = 'stable';

        const rawData = {
            fecha_actual: now.toLocaleDateString(),
            mes_actual: currentMonthName,
            relanzamientos_confirmados: data.confirmedRelaunches.map((r: any) => ({
                institucion: r[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                fecha_pautada: r[FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS],
                notas: r[FIELD_NOTAS_GESTION_LANZAMIENTOS]
            })),
            metricas: {
                acreditaciones_pendientes: pendingAccreditationsCount,
                solicitudes_estancadas: internalStagnantCount,
                puntaje_salud: systemScore
            }
        };

        return { status, insights: insights.slice(0, 3), systemScore, rawData };
    }, [data, isLoading]);

    const refreshAnalysis = useCallback(() => {
        setAiSummary(null);
        setRefreshTrigger(prev => prev + 1);
    }, []);

    // 2. AI Analysis (Gemini)
    useEffect(() => {
        const fetchAiInsight = async () => {
            if (!algorithmicAnalysis.rawData) return;

            const dataSignature = JSON.stringify(algorithmicAnalysis.rawData);
            const CACHE_KEY = 'smart_analysis_cache_v6'; 
            
            if (refreshTrigger === 0) {
                const cachedData = sessionStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const { signature, summary } = JSON.parse(cachedData);
                    if (signature === dataSignature) {
                        setAiSummary(summary);
                        return;
                    }
                }
            }

            if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('PEGAR_AQUI')) return;

            setIsAiLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                
                const prompt = `
                    Actúa como un Jefe de Operaciones Académicas (PPS). 
                    Hoy es: ${algorithmicAnalysis.rawData.fecha_actual} (${algorithmicAnalysis.rawData.mes_actual}).
                    
                    Analiza estos datos:
                    ${JSON.stringify(algorithmicAnalysis.rawData)}
                    
                    TUS OBJETIVOS PRIORITARIOS (En orden):
                    1. Lee las 'notas' y 'fecha_pautada' de 'relanzamientos_confirmados'. Si la fecha coincide con el mes actual (o ya pasó) o las notas dicen "Llamar en [Mes Actual]", tu ALERTA PRINCIPAL debe ser: "Es momento de lanzar [Nombre Institución] según lo pautado".
                    2. Si no hay relanzamientos urgentes, mira 'acreditaciones_pendientes'.
                    3. Si todo está calmo, da un mensaje motivador breve.

                    RESPUESTA: Máximo 20 palabras. Texto plano. Imperativo. Sé inteligente leyendo las notas.
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                
                if (response.text) {
                    const cleanText = response.text.replace(/[\*#_`]/g, '').trim();
                    setAiSummary(cleanText);
                    sessionStorage.setItem(CACHE_KEY, JSON.stringify({
                        signature: dataSignature,
                        summary: cleanText,
                        timestamp: Date.now()
                    }));
                } 

            } catch (error: any) {
                console.error("AI Generation Error:", error);
                setAiSummary("Modo offline: Revisa el calendario de relanzamientos.");
            } finally {
                setIsAiLoading(false);
            }
        };

        const timer = setTimeout(fetchAiInsight, 500);
        return () => clearTimeout(timer);

    }, [algorithmicAnalysis.rawData, refreshTrigger]);

    return {
        status: algorithmicAnalysis.status,
        insights: algorithmicAnalysis.insights,
        systemScore: algorithmicAnalysis.systemScore,
        summary: aiSummary || (isAiLoading ? "Analizando notas y fechas..." : "Sistema sincronizado."),
        isAiLoading,
        refreshAnalysis
    };
};
