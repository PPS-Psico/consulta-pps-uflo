
import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { fetchAllData } from '../services/supabaseService';
import { sendSmartEmail } from '../utils/emailService';
import { deleteFinalizationRequest } from '../services/dataService';
import {
    TABLE_NAME_FINALIZACION,
    FIELD_FECHA_SOLICITUD_FINALIZACION,
    FIELD_ESTADO_FINALIZACION,
    FIELD_ESTUDIANTE_FINALIZACION,
    FIELD_INFORME_FINAL_FINALIZACION,
    FIELD_PLANILLA_HORAS_FINALIZACION,
    FIELD_PLANILLA_ASISTENCIA_FINALIZACION,
    FIELD_SUGERENCIAS_MEJORAS_FINALIZACION,
    TABLE_NAME_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_FINALIZARON_ESTUDIANTES,
    FIELD_FECHA_FINALIZACION_ESTUDIANTES
} from '../constants';
import { finalizacionPPSArraySchema, estudianteArraySchema } from '../schemas';
import type { EstudianteFields } from '../types';
import { normalizeStringForComparison } from '../utils/formatters';

export const useFinalizacionLogic = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const queryClient = useQueryClient();

    const { data: requests = [], isLoading, error } = useQuery({
        queryKey: ['finalizacionRequests'],
        queryFn: async () => {
            const { records: finalizations, error: finError } = await fetchAllData(
                TABLE_NAME_FINALIZACION, 
                finalizacionPPSArraySchema,
                [FIELD_FECHA_SOLICITUD_FINALIZACION, FIELD_ESTADO_FINALIZACION, FIELD_ESTUDIANTE_FINALIZACION, FIELD_INFORME_FINAL_FINALIZACION, FIELD_PLANILLA_HORAS_FINALIZACION, FIELD_PLANILLA_ASISTENCIA_FINALIZACION, FIELD_SUGERENCIAS_MEJORAS_FINALIZACION]
            );

            if (finError) throw new Error(typeof finError.error === 'string' ? finError.error : finError.error.message);
            
            const studentIds = [...new Set(finalizations.map((r: any) => {
                const raw = r[FIELD_ESTUDIANTE_FINALIZACION];
                return Array.isArray(raw) ? raw[0] : raw;
            }).filter(Boolean))];

            const { records: students } = await fetchAllData<EstudianteFields>(
                TABLE_NAME_ESTUDIANTES,
                estudianteArraySchema,
                [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES],
                { id: studentIds }
            );
            
            const studentMap = new Map(students.map((s: any) => [s.id, s]));
            
            const enriched = finalizations.map((req: any) => {
                const sIdRaw = req[FIELD_ESTUDIANTE_FINALIZACION];
                const sId = Array.isArray(sIdRaw) ? sIdRaw[0] : sIdRaw;
                const student = studentMap.get(sId);
                return {
                    ...req,
                    studentName: student?.[FIELD_NOMBRE_ESTUDIANTES] || 'Desconocido',
                    studentLegajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || '---',
                    studentEmail: student?.[FIELD_CORREO_ESTUDIANTES] || '',
                };
            });
            
            return enriched.sort((a: any, b: any) => new Date(b.createdTime).getTime() - new Date(a.createdTime).getTime());
        }
    });

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
             const request = requests.find(r => r.id === id);
             if (!request) return;
             
             // 1. Update status
             await db.finalizacion.update(id, { [FIELD_ESTADO_FINALIZACION]: status });
             
             // 2. Process "Cargado" logic (Email & Student Record)
             if (status === 'Cargado') {
                 const sIdRaw = request[FIELD_ESTUDIANTE_FINALIZACION];
                 const sId = Array.isArray(sIdRaw) ? sIdRaw[0] : sIdRaw;
                 if (sId) {
                     await db.estudiantes.update(sId, { 
                         [FIELD_FINALIZARON_ESTUDIANTES]: true,
                         [FIELD_FECHA_FINALIZACION_ESTUDIANTES]: new Date().toISOString() 
                     });
                 }
                 
                 // TRIGGER SAC EMAIL AUTOMATION
                 const emailRes = await sendSmartEmail('sac', {
                     studentName: String(request.studentName),
                     studentEmail: String(request.studentEmail),
                     ppsName: 'Práctica Profesional Supervisada'
                 });
                 
                 if (!emailRes.success && emailRes.message !== 'Automación desactivada') {
                     // Log but don't fail the whole operation if email fails
                     console.warn('SAC Email failed:', emailRes.message);
                 }
             }
        },
        onSuccess: (_, variables) => {
             queryClient.invalidateQueries({ queryKey: ['finalizacionRequests'] });
             if (variables.status === 'Cargado') {
                 setToastInfo({ message: 'Acreditación confirmada y email enviado (si activo).', type: 'success' });
             } else {
                 setToastInfo({ message: 'Estado actualizado.', type: 'success' });
             }
        },
        onError: (e: any) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' })
    });

    const deleteMutation = useMutation({
        mutationFn: async (record: any) => {
             const { error } = await deleteFinalizationRequest(record.id, record);
             if (error) throw new Error(error.message);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Solicitud eliminada y archivos borrados.', type: 'success' });
            queryClient.invalidateQueries({ queryKey: ['finalizacionRequests'] });
        },
        onError: (e: any) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' }),
        onSettled: () => setDeletingId(null)
    });

    const handleDelete = (record: any) => {
        if (window.confirm('¿Estás seguro de eliminar esta solicitud? Esta acción no se puede deshacer.')) {
            setDeletingId(record.id);
            deleteMutation.mutate(record);
        }
    };

    const { activeList, historyList } = useMemo(() => {
        const active: any[] = [];
        const history: any[] = [];
        const searchLower = searchTerm.toLowerCase();
        
        requests.forEach(req => {
             if (searchTerm && !req.studentName.toLowerCase().includes(searchLower) && !String(req.studentLegajo).includes(searchLower)) {
                 return;
             }
             
             const rawState = req[FIELD_ESTADO_FINALIZACION];
             const status = normalizeStringForComparison(Array.isArray(rawState) ? rawState[0] : rawState);

             if (status === 'cargado') {
                 history.push(req);
             } else {
                 active.push(req);
             }
        });
        return { activeList: active, historyList: history };
    }, [requests, searchTerm]);

    return {
        requests,
        isLoading,
        error,
        searchTerm, setSearchTerm,
        toastInfo, setToastInfo,
        deletingId,
        updateStatusMutation,
        handleDelete,
        activeList,
        historyList
    };
};
