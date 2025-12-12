
import { useMemo, useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { GEMINI_API_KEY } from '../constants/configConstants';
import { FIELD_NOMBRE_PPS_LANZAMIENTOS } from '../constants';

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

        // --- REGLA 1: Gestión de Cierre (Prioridad Crítica) ---
        // Buscamos lanzamientos vencidos (daysLeft < 0) que sigan "Pendiente de Gestión"
        // NOTA: 'daysLeft' viene calculado desde useOperationalData
        const overdueClosures = data.endingLaunches.filter((l: any) => {
            const isPendingManagement = String(l.estado_gestion) === 'Pendiente de Gestión' || !l.estado_gestion;
            const isExpired = l.daysLeft < 0;
            return isExpired && isPendingManagement;
        });

        // Buscamos lanzamientos por vencerse en breve (7 días) sin gestión
        const upcomingClosures = data.endingLaunches.filter((l: any) => {
            const isPendingManagement = String(l.estado_gestion) === 'Pendiente de Gestión' || !l.estado_gestion;
            const isEndingSoon = l.daysLeft >= 0 && l.daysLeft <= 14; // Aumentado a 14 días para mayor previsión
            return isEndingSoon && isPendingManagement;
        });

        // --- REGLA 2: Solicitudes Estancadas ---
        let stagnantCount = 0;
        data.pendingRequests.forEach((r: any) => {
            if (!r.updated) return;
            const lastUpdate = new Date(r.updated);
            if (differenceInDays(now, lastUpdate) > 5) { 
                stagnantCount++;
            }
        });

        // --- REGLA 3: Acreditaciones ---
        const pendingAccreditations = data.pendingFinalizations.length;

        // --- CÁLCULO DE PUNTAJE ---
        // Un cierre vencido sin gestionar es muy grave para la operativa
        if (overdueClosures.length > 0) systemScore -= (overdueClosures.length * 15); 
        if (upcomingClosures.length > 0) systemScore -= 5;
        if (stagnantCount > 0) systemScore -= (stagnantCount * 3);
        if (pendingAccreditations > 0) systemScore -= (pendingAccreditations * 2);
        
        systemScore = Math.max(0, Math.min(100, systemScore));

        // --- GENERACIÓN DE INSIGHTS (Ordenados por importancia) ---
        
        // 1. Vencidas (Top Priority)
        if (overdueClosures.length > 0) {
            const firstName = overdueClosures[0][FIELD_NOMBRE_PPS_LANZAMIENTOS];
            const msg = overdueClosures.length === 1 
                ? `"${firstName}" finalizó y sigue como 'Pendiente'. Debe archivarse o relanzarse.`
                : `${overdueClosures.length} convocatorias finalizaron sin gestión de cierre.`;

            insights.push({
                type: 'critical',
                message: msg,
                actionLabel: 'Gestionar',
                actionLink: '/admin/gestion?filter=vencidas',
                icon: 'event_busy'
            });
        }

        // 2. Acreditaciones (High Priority - Student Blocking)
        if (pendingAccreditations > 0) {
             insights.push({
                type: 'warning',
                message: `${pendingAccreditations} alumnos enviaron documentación final y esperan acreditación.`,
                actionLabel: 'Acreditar',
                actionLink: '/admin/solicitudes?tab=egreso',
                icon: 'verified'
            });
        }

        // 3. Próximos Vencimientos
        if (upcomingClosures.length > 0) {
            insights.push({
                type: 'stable',
                message: `${upcomingClosures.length} PPS finalizan en las próximas 2 semanas. Define su continuidad.`,
                actionLabel: 'Ver Próximas',
                actionLink: '/admin/gestion?filter=proximas',
                icon: 'timer'
            });
        }

        // 4. Solicitudes Estancadas
        if (stagnantCount > 0) {
            insights.push({
                type: 'stable',
                message: `${stagnantCount} solicitudes de ingreso no tienen movimiento hace +5 días.`,
                actionLabel: 'Revisar',
                actionLink: '/admin/solicitudes?tab=ingreso',
                icon: 'hourglass_empty'
            });
        }

        let status: PriorityLevel = 'optimal';
        if (systemScore < 70) status = 'critical';
        else if (systemScore < 90) status = 'warning';
        else if (systemScore < 98) status = 'stable';

        // Prepare data for AI summary
        const rawData = {
            prioridad_critica_vencidas: overdueClosures.map((l: any) => l[FIELD_NOMBRE_PPS_LANZAMIENTOS]),
            acreditaciones_pendientes: pendingAccreditations,
            proximos_cierres: upcomingClosures.length,
            puntaje_salud: systemScore
        };

        return { status, insights, systemScore, rawData };
    }, [data, isLoading]);

    // 2. AI Analysis (Gemini)
    useEffect(() => {
        const fetchAiInsight = async () => {
            if (!algorithmicAnalysis.rawData || !GEMINI_API_KEY || GEMINI_API_KEY.includes('PEGAR_AQUI')) return;
            
            setIsAiLoading(true);
            try {
                const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
                
                const prompt = `
                    Eres un Asistente Ejecutivo de Operaciones Académicas.
                    Datos del sistema: ${JSON.stringify(algorithmicAnalysis.rawData)}

                    Genera UNA frase breve (máx 20 palabras) para el encabezado del Dashboard.
                    Reglas:
                    1. Si hay 'prioridad_critica_vencidas', DEBES mencionar que hay cierres pendientes de gestión. Usa tono de urgencia profesional.
                    2. Si hay 'acreditaciones_pendientes', menciónalo como tarea prioritaria.
                    3. Si el puntaje es alto (>90) y no hay alertas, da un mensaje positivo sobre la eficiencia operativa.
                    
                    Formato: Texto plano, directo, sin saludos.
                    Ejemplos:
                    - "Atención: 3 convocatorias vencidas requieren decisión inmediata de relanzamiento o archivo."
                    - "Enfoque principal: Gestionar 7 acreditaciones pendientes para optimizar la salud operativa."
                    - "Operaciones estables. Todo el ciclo de prácticas está al día."
                `;

                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt,
                });
                
                setAiSummary(response.text.trim());
            } catch (error) {
                console.error("AI Generation Error", error);
            } finally {
                setIsAiLoading(false);
            }
        };

        const timer = setTimeout(fetchAiInsight, 1000);
        return () => clearTimeout(timer);

    }, [algorithmicAnalysis.rawData]);

    return {
        status: algorithmicAnalysis.status,
        insights: algorithmicAnalysis.insights,
        systemScore: algorithmicAnalysis.systemScore,
        summary: aiSummary || (
            algorithmicAnalysis.status === 'critical' ? "Se detectaron ciclos vencidos sin cerrar. Requiere atención." :
            algorithmicAnalysis.status === 'warning' ? "Hay tareas pendientes acumuladas." : 
            "El sistema opera con normalidad."
        ),
        isAiLoading
    };
};
