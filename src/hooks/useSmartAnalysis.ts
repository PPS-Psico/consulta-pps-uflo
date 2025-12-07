
import { useMemo, useState, useEffect, useCallback } from 'react';
import { differenceInDays } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '../constants/configConstants';

interface DashboardData {
    endingLaunches: any[];
    pendingFinalizations: any[];
    pendingRequests: any[];
}

export type PriorityLevel = 'critical' | 'warning' | 'stable' | 'optimal';

export interface SmartInsight {
    type: PriorityLevel;
    message: string;
    actionLabel?: string;
    actionLink?: string;
    icon: string;
}

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

        // --- REGLA 1: Análisis de Solicitudes (Distinción Interna vs Externa) ---
        const terminalStates = ['finalizada', 'cancelada', 'rechazada', 'archivado', 'pps realizada', 'no se pudo concretar'];
        
        // Estados donde la responsabilidad es 100% nuestra
        const internalActionStates = ['pendiente', 'realizando convenio']; 
        
        let internalStagnantCount = 0;
        let externalStagnantCount = 0;

        data.pendingRequests.forEach((r: any) => {
            const status = String(r.estado_seguimiento || '').toLowerCase();
            if (terminalStates.includes(status)) return;
            
            if (!r.updated) return;
            const lastUpdate = new Date(r.updated);
            const daysDiff = differenceInDays(new Date(), lastUpdate);

            // Umbral: 5 días sin tocar una solicitud nueva es crítico. 7 días esperando respuesta es advertencia.
            if (internalActionStates.includes(status)) {
                if (daysDiff > 5) internalStagnantCount++;
            } else {
                if (daysDiff > 7) externalStagnantCount++;
            }
        });

        // --- REGLA 2: Vencimientos de PPS ---
        const unmanagedClosures = data.endingLaunches.filter((l: any) => {
            const isEndingSoon = l.daysLeft <= 7; 
            const managementStatus = String(l.estado_gestion || 'Pendiente de Gestión');
            // Si vence pronto y no está confirmado ni cancelado
            return isEndingSoon && (managementStatus === 'Pendiente de Gestión' || managementStatus === 'Esperando Respuesta');
        });

        // Vencidas y sin cerrar (Grave)
        const overdueClosures = data.endingLaunches.filter((l: any) => l.daysLeft < 0 && String(l.estado_gestion) === 'Pendiente de Gestión');

        // --- REGLA 3: Integridad de Datos ---
        const unexplainedCancellations = data.endingLaunches.filter((l: any) => {
            return String(l.estado_gestion) === 'No se Relanza' && (!l.notas_gestion || l.notas_gestion.trim().length < 5);
        });
        
        // --- REGLA 4: Carga de Acreditaciones (NUEVO) ---
        const pendingAccreditationsCount = data.pendingFinalizations ? data.pendingFinalizations.length : 0;


        // --- CÁLCULO DE PUNTAJE (Weighted Score) ---
        // Empezamos en 100 y restamos según gravedad.
        
        if (overdueClosures.length > 0) systemScore -= 30; // Muy grave (Rojo)
        if (internalStagnantCount > 0) systemScore -= (internalStagnantCount * 5); // Grave (Rojo/Amarillo)
        
        // Acreditaciones: Si hay pendientes, baja salud porque es trabajo acumulado
        if (pendingAccreditationsCount > 0) systemScore -= (pendingAccreditationsCount * 3); // 7 pendientes = -21 pts -> 79% (Amarillo)
        
        if (unmanagedClosures.length > 0) systemScore -= 10; // Urgente
        if (externalStagnantCount > 0) systemScore -= (externalStagnantCount * 1); // Leve
        if (unexplainedCancellations.length > 0) systemScore -= 5;

        systemScore = Math.max(0, Math.min(100, systemScore));

        // --- GENERACIÓN DE INSIGHTS PRIORIZADOS ---

        // 0. ACREDITACIONES (Si hay muchas, suben a prioridad)
        if (pendingAccreditationsCount > 0) {
             insights.push({
                type: pendingAccreditationsCount > 5 ? 'warning' : 'optimal',
                message: `${pendingAccreditationsCount} trámites de acreditación esperan tu revisión y cierre.`,
                actionLabel: 'Procesar',
                actionLink: '/admin/solicitudes?tab=egreso',
                icon: 'verified'
            });
        }

        // 1. CRÍTICO: PPS Vencidas o por Vencer sin gestión
        if (unmanagedClosures.length > 0 || overdueClosures.length > 0) {
            const total = unmanagedClosures.length + overdueClosures.length;
            insights.unshift({ // Push to top
                type: 'critical',
                message: `${total} Convenios vencen esta semana sin gestión definida. Riesgo de pérdida de vacantes.`,
                actionLabel: 'Resolver Ahora',
                actionLink: '/admin/gestion?filter=proximas',
                icon: 'event_busy'
            });
        }

        // 2. CRÍTICO: Alumnos esperando acción NUESTRA
        if (internalStagnantCount > 0) {
            insights.push({
                type: 'warning',
                message: `${internalStagnantCount} solicitudes nuevas llevan +5 días sin respuesta inicial.`,
                actionLabel: 'Atender',
                actionLink: '/admin/solicitudes?tab=ingreso',
                icon: 'person_alert'
            });
        }

        // 3. ADVERTENCIA: Seguimiento a terceros (Follow up)
        if (externalStagnantCount > 0 && insights.length < 3) {
            insights.push({
                type: 'stable',
                message: `${externalStagnantCount} gestiones esperando respuesta externa hace +1 semana.`,
                actionLabel: 'Ver Lista',
                actionLink: '/admin/solicitudes?tab=ingreso',
                icon: 'forward_to_inbox'
            });
        }
        
        let status: PriorityLevel = 'optimal';
        if (systemScore < 60) status = 'critical';
        else if (systemScore < 85) status = 'warning'; // 79% caerá aquí
        else if (systemScore < 98) status = 'stable';  // Pequeños pendientes

        const rawData = {
            metricas: {
                acreditaciones_pendientes: pendingAccreditationsCount,
                pendientes_accion_interna: internalStagnantCount,
                pps_vencimiento_inminente: unmanagedClosures.length,
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
            const CACHE_KEY = 'smart_analysis_cache_v5'; // Version bumped
            
            if (refreshTrigger === 0) {
                const cachedData = sessionStorage.getItem(CACHE_KEY);
                if (cachedData) {
                    const { signature, summary } = JSON.parse(cachedData);
                    if (signature === dataSignature) {
                        setAiSummary(summary);
                        return;
                    }
                }
            } else {
                sessionStorage.removeItem(CACHE_KEY);
            }

            if (!GEMINI_API_KEY || GEMINI_API_KEY.includes('PEGAR_AQUI')) return;

            setIsAiLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                
                const prompt = `
                    Actúa como un Jefe de Operaciones Académicas. Analiza estos datos en tiempo real:
                    ${JSON.stringify(algorithmicAnalysis.rawData)}
                    
                    Instrucciones Estrictas:
                    1. Si 'acreditaciones_pendientes' > 4, tu ÚNICO foco es: "Prioriza procesar las acreditaciones acumuladas para cerrar ciclos".
                    2. Si 'pendientes_accion_interna' > 2, tu foco es: "Desbloquea las solicitudes de alumnos estancadas".
                    3. Si 'pps_vencimiento_inminente' > 0, tu foco es: "Gestiona los convenios próximos a vencer".
                    4. Solo si todo es 0, felicita por el orden.
                    5. RESPUESTA: Máximo 15 palabras. Texto plano (sin markdown). Tono ejecutivo y directo.
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
                // Fallback inteligente local
                if (algorithmicAnalysis.rawData.metricas.acreditaciones_pendientes > 0) {
                    setAiSummary("Hay acreditaciones pendientes. Prioriza su cierre para mantener el flujo.");
                } else {
                    setAiSummary("Sistema operativo. Revisa las alertas puntuales.");
                }
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
        summary: aiSummary || (isAiLoading ? "Analizando flujo de trabajo..." : "Sistema sincronizado."),
        isAiLoading,
        refreshAnalysis
    };
};
