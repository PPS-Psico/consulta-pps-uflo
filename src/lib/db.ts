
import { z } from 'zod';
// import * as airtable from '../services/airtableService'; // Deprecated
import * as supabaseService from '../services/supabaseService';
import { schema } from './airtableSchema';
import { 
    estudianteArraySchema, practicaArraySchema, authUserArraySchema, convocatoriaArraySchema, 
    lanzamientoPPSArraySchema, institucionArraySchema, penalizacionArraySchema, solicitudPPSArraySchema, 
    finalizacionPPSArraySchema 
} from '../schemas';
import type { 
    EstudianteFields, PracticaFields, AuthUserFields, ConvocatoriaFields, 
    LanzamientoPPSFields, InstitucionFields, PenalizacionFields, SolicitudPPSFields, FinalizacionPPSFields,
    AirtableRecord
} from '../types';
import { supabase } from './supabaseClient';

// A generic mapped type to extract developer-friendly field keys from a schema object
type DevFields<S> = {
  [K in keyof S as K extends '_tableName' ? never : K]?: any;
};

// Generic function to translate developer-friendly keys to App/Airtable field names
// Note: The supabaseService will then assume these keys match the DB columns OR use schemaMapping.ts to translate them further.
function translateFieldsToApp<TSchema extends object>(fields: Partial<DevFields<TSchema>>, tableSchema: TSchema): { [key: string]: any } {
    const appFields: { [key: string]: any } = {};
    const { _tableName, ...fieldMap } = tableSchema as any;

    for (const key in fields) {
        if (Object.prototype.hasOwnProperty.call(fields, key)) {
            const appKey = fieldMap[key];
            if (appKey) {
                appFields[appKey] = (fields as any)[key];
            } else {
                // console.warn(`[DB] Key "${key}" not found in schema for table "${_tableName}". Passing it through directly.`);
                appFields[key] = (fields as any)[key];
            }
        }
    }
    return appFields;
}


// A factory function to create a typed interface for a Table (now connected to Supabase)
function createTableInterface<TSchema extends { _tableName: string }, TRecordFields extends object>(
    tableSchema: TSchema,
    zodArraySchema: z.ZodSchema<AirtableRecord<TRecordFields>[]>
) {
    const { _tableName } = tableSchema;

    const service = {
        // READ operations
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
                // Return empty array to avoid crashing UI during migration/empty state
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

        // WRITE operations
        create: async (fields: DevFields<TSchema>) => {
            // Translate dev keys (e.g. 'nombre') to App keys (e.g. 'Nombre')
            const appFields = translateFieldsToApp(fields, tableSchema);
            const { record: createdRecord, error } = await supabaseService.createRecord<TRecordFields>(_tableName, appFields as TRecordFields);
            if (error) throw error;
            return createdRecord;
        },

        update: async (recordId: string, fields: Partial<DevFields<TSchema>>) => {
            const appFields = translateFieldsToApp(fields, tableSchema);
            const { record: updatedRecord, error } = await supabaseService.updateRecord<TRecordFields>(_tableName, recordId, appFields as Partial<TRecordFields>);
            if (error) throw error;
            return updatedRecord;
        },

        updateMany: async (records: { id: string; fields: Partial<DevFields<TSchema>> }[]) => {
            const { records: updatedRecords, error } = await supabaseService.updateRecords<TRecordFields>(
                _tableName,
                records.map(r => ({ id: r.id, fields: translateFieldsToApp(r.fields, tableSchema) as Partial<TRecordFields> }))
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
    return service;
}

// --- NUEVA FUNCIÓN PARA LOGIN ---
// Busca el email de un estudiante usando su legajo.
// Esto permite que el usuario ingrese "Legajo" en el login, pero Supabase autentique por "Email".
export const getStudentLoginInfo = async (legajo: string): Promise<{ email: string } | null> => {
    try {
        // Busca en la tabla pública de estudiantes
        const { data, error } = await supabase
            .from('estudiantes')
            .select('correo')
            .eq('legajo', legajo)
            .maybeSingle(); // Use maybeSingle to avoid error on 0 rows
            
        if (error || !data) return null;
        return { email: data.correo };
    } catch (error) {
        console.error("Error fetching student login info:", error);
        return null;
    }
};


// Export the db object with fully typed table interfaces
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
