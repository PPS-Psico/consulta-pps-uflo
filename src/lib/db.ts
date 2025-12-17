


import { z } from 'zod';
import * as supabaseService from '../services/supabaseService';
import { schema } from './dbSchema';
import { 
    estudianteArraySchema, practicaArraySchema, authUserArraySchema, convocatoriaArraySchema, 
    lanzamientoPPSArraySchema, institucionArraySchema, penalizacionArraySchema, solicitudPPSArraySchema, 
    finalizacionPPSArraySchema 
} from '../schemas';
import type { 
    AppRecord, Database
} from '../types';
import { supabase } from './supabaseClient';

type Tables = Database['public']['Tables'];

// Helper to access the table name from the schema object
function createTableInterface<TName extends keyof Tables, TRow extends Tables[TName]['Row']>(
    tableName: TName,
    zodArraySchema: z.ZodSchema<AppRecord<TRow>[]>
) {
    const _tableName = tableName as string;
    
    // Type casting to bypass strict Zod vs Supabase type checks
    const safeSchema = zodArraySchema as any;

    return {
        getAll: async (options?: { filters?: Record<string, any>; sort?: any[]; fields?: string[] }) => {
            const { records, error } = await supabaseService.fetchAllData<TRow>(
                _tableName, 
                safeSchema, 
                options?.fields || [], 
                options?.filters,
                options?.sort
            );
            if (error) {
                // Log warning instead of error for cleaner console on non-critical failures
                console.warn(`Fetch warning in ${_tableName}:`, error);
                return []; 
            }
            return records;
        },
        
        get: async (options?: { filters?: Record<string, any>; maxRecords?: number; sort?: any[] }) => {
             const { records, error } = await supabaseService.fetchData<TRow>(
                 _tableName, 
                 safeSchema, 
                 [], 
                 options?.filters,
                 options?.maxRecords, 
                 options?.sort
            );
            if (error) {
                 // Suppress loud errors for single fetch attempts (common for checking existence)
                 // console.debug(`Single fetch miss in ${_tableName}`, error);
                 return [];
            }
            return records;
        },

        // Server-Side Pagination with Filters
        getPage: async (
            page: number, 
            pageSize: number, 
            options?: { searchTerm?: string, searchFields?: string[], sort?: { field: string; direction: 'asc' | 'desc' }, filters?: Record<string, any> }
        ) => {
            return supabaseService.fetchPaginatedData<TRow>(
                _tableName,
                safeSchema,
                page,
                pageSize,
                [], 
                options?.searchTerm,
                options?.searchFields,
                options?.sort,
                options?.filters
            );
        },

        create: async (fields: Tables[TName]['Insert']) => {
            // @ts-ignore: Supabase types might be slightly stricter than loose Insert types, but runtime is safe
            const { record, error } = await supabaseService.createRecord<TRow>(_tableName, fields);
            if (error) throw error;
            return record;
        },

        update: async (recordId: string, fields: Tables[TName]['Update']) => {
             // @ts-ignore: Update types match
            const { record, error } = await supabaseService.updateRecord<TRow>(_tableName, recordId, fields);
            if (error) throw error;
            return record;
        },

        updateMany: async (records: { id: string; fields: Tables[TName]['Update'] }[]) => {
            // @ts-ignore
            const { records: updatedRecords, error } = await supabaseService.updateRecords<TRow>(
                _tableName,
                records as any
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
        // Use casting to bypass strict type checking on RPC calls if types are out of sync
        const { data, error } = await (supabase.rpc as any)('get_student_email_by_legajo', { 
            legajo_input: legajo 
        });
            
        if (error) {
            console.error("Error RPC get_student_email:", error);
            return null;
        }
        
        if (!data || typeof data !== 'object' || !('email' in data)) {
             return null;
        }
        
        return { email: String((data as any).email) };
    } catch (error) {
        console.error("Error fetching student login info:", error);
        return null;
    }
};

export const db = {
    estudiantes: createTableInterface('estudiantes', estudianteArraySchema as any),
    practicas: createTableInterface('practicas', practicaArraySchema as any),
    // Auth users is a special case depending on your DB setup, assumed to be 'auth_users' view/table
    authUsers: createTableInterface('auth_users' as any, authUserArraySchema as any), 
    convocatorias: createTableInterface('convocatorias', convocatoriaArraySchema as any),
    lanzamientos: createTableInterface('lanzamientos_pps', lanzamientoPPSArraySchema as any),
    instituciones: createTableInterface('instituciones', institucionArraySchema as any),
    penalizaciones: createTableInterface('penalizaciones', penalizacionArraySchema as any),
    solicitudes: createTableInterface('solicitudes_pps', solicitudPPSArraySchema as any),
    finalizacion: createTableInterface('finalizacion_pps', finalizacionPPSArraySchema as any),
};
