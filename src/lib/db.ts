
import { z } from 'zod';
import * as supabaseService from '../services/supabaseService';
import { schema } from './dbSchema';
import { 
    estudianteArraySchema, practicaArraySchema, authUserArraySchema, convocatoriaArraySchema, 
    lanzamientoPPSArraySchema, institucionArraySchema, penalizacionArraySchema, solicitudPPSArraySchema, 
    finalizacionPPSArraySchema 
} from '../schemas';
import type { 
    EstudianteFields, PracticaFields, AuthUserFields, ConvocatoriaFields, 
    LanzamientoPPSFields, InstitucionFields, PenalizacionFields, SolicitudPPSFields, FinalizacionPPSFields,
    AppRecord
} from '../types';
import { supabase } from './supabaseClient';

// Helper to access the table name from the schema object
function createTableInterface<TSchema extends { _tableName: string }, TRecordFields extends object>(
    tableSchema: TSchema,
    zodArraySchema: z.ZodSchema<AppRecord<TRecordFields>[]>
) {
    const { _tableName } = tableSchema;

    return {
        getAll: async (options?: { filterByFormula?: string; sort?: any[]; fields?: string[] }) => {
            const { records, error } = await supabaseService.fetchAllData<TRecordFields>(
                _tableName, 
                zodArraySchema, 
                options?.fields || [], 
                options?.filterByFormula, 
                options?.sort
            );
            if (error) {
                console.error(`Error fetching from ${_tableName}:`, error);
                return []; 
            }
            return records;
        },
        
        get: async (options?: { filterByFormula?: string; maxRecords?: number; sort?: any[] }) => {
             const { records, error } = await supabaseService.fetchData<TRecordFields>(
                 _tableName, 
                 zodArraySchema, 
                 [], 
                 options?.filterByFormula, 
                 options?.maxRecords, 
                 options?.sort
            );
            if (error) {
                 console.error(`Error fetching single/limited from ${_tableName}:`, error);
                 return [];
            }
            return records;
        },

        // New method for Server-Side Pagination with Filters
        getPage: async (
            page: number, 
            pageSize: number, 
            options?: { searchTerm?: string, searchFields?: string[], sort?: { field: string; direction: 'asc' | 'desc' }, filters?: Record<string, any> }
        ) => {
            return supabaseService.fetchPaginatedData<TRecordFields>(
                _tableName,
                zodArraySchema,
                page,
                pageSize,
                [], // Fetch all fields for editor
                options?.searchTerm,
                options?.searchFields,
                options?.sort,
                options?.filters
            );
        },

        create: async (fields: TRecordFields) => {
            const { record, error } = await supabaseService.createRecord<TRecordFields>(_tableName, fields);
            if (error) throw error;
            return record;
        },

        update: async (recordId: string, fields: Partial<TRecordFields>) => {
            const { record, error } = await supabaseService.updateRecord<TRecordFields>(_tableName, recordId, fields);
            if (error) throw error;
            return record;
        },

        updateMany: async (records: { id: string; fields: Partial<TRecordFields> }[]) => {
            const { records: updatedRecords, error } = await supabaseService.updateRecords<TRecordFields>(
                _tableName,
                records
            );
            if (error) throw error;
            return updatedRecords;
        },
        
        delete: async (recordId: string) => {
            const { success, error } = await supabaseService.deleteRecord(_tableName, recordId);
             if (error) throw error;
            return success;
        },
    };
}

export const getStudentLoginInfo = async (legajo: string): Promise<{ email: string } | null> => {
    try {
        // SECURITY CRITICAL: Use RPC to bypass RLS securely for this specific lookup.
        // data is the JSON object returned by postgres function: { "email": "user@example.com" }
        const { data, error } = await supabase.rpc('get_student_email_by_legajo', { 
            legajo_input: legajo 
        });
            
        if (error) {
            console.error("Error RPC get_student_email:", error);
            return null;
        }
        
        // Validate data structure
        if (!data || typeof data !== 'object' || !('email' in data)) {
             return null;
        }
        
        // Return exactly { email: "string" }
        return { email: String(data.email) };
    } catch (error) {
        console.error("Error fetching student login info:", error);
        return null;
    }
};

export const db = {
    estudiantes: createTableInterface<typeof schema.estudiantes, EstudianteFields>(schema.estudiantes, estudianteArraySchema),
    practicas: createTableInterface<typeof schema.practicas, PracticaFields>(schema.practicas, practicaArraySchema),
    authUsers: createTableInterface<typeof schema.authUsers, AuthUserFields>(schema.authUsers, authUserArraySchema),
    convocatorias: createTableInterface<typeof schema.convocatorias, ConvocatoriaFields>(schema.convocatorias, convocatoriaArraySchema),
    lanzamientos: createTableInterface<typeof schema.lanzamientos, LanzamientoPPSFields>(schema.lanzamientos, lanzamientoPPSArraySchema),
    instituciones: createTableInterface<typeof schema.instituciones, InstitucionFields>(schema.instituciones, institucionArraySchema),
    penalizaciones: createTableInterface<typeof schema.penalizaciones, PenalizacionFields>(schema.penalizaciones, penalizacionArraySchema),
    solicitudes: createTableInterface<typeof schema.solicitudes, SolicitudPPSFields>(schema.solicitudes, solicitudPPSArraySchema),
    finalizacion: createTableInterface<typeof schema.finalizacion, FinalizacionPPSFields>(schema.finalizacion, finalizacionPPSArraySchema),
};
