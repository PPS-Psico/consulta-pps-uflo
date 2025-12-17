
import { supabase } from '../lib/supabaseClient';
import type { AppRecord, AppErrorResponse } from '../types';
import type { Database } from '../types/supabase';
import { z } from 'zod';
import { 
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, 
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS 
} from '../constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper type for Table Names
type TableName = keyof Database['public']['Tables'];

const buildSearchFilter = (searchTerm: string, searchFields: string[]) => {
    if (!searchTerm || searchFields.length === 0) return null;
    const term = searchTerm.replace(/[^\w\s]/gi, '');
    if (!term) return null;
    return searchFields.map(field => `${field}.ilike.%${term}%`).join(',');
};

const applyFilters = (query: any, filters?: Record<string, any>) => {
    if (!filters) return query;
    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (key === 'startDate') query = query.gte('fecha_inicio', value);
        else if (key === 'endDate') query = query.lte('fecha_inicio', value);
        else if (key === 'institucion') query = query.ilike('nombre_institucion', `%${value}%`);
        else if (key === FIELD_LANZAMIENTO_VINCULADO_PRACTICAS && typeof value === 'string' && value.includes('|')) {
            const parts = value.split('|');
            const launchId = parts[0];
            const startDate = parts[parts.length - 1]; 
            const instName = parts.slice(1, parts.length - 1).join('|');

            if (launchId && instName && startDate) {
                const safeInstName = instName.replace(/"/g, ''); 
                const legacyCondition = `and(nombre_institucion.ilike."${safeInstName}%",fecha_inicio.eq.${startDate})`;
                const linkedCondition = `${key}.eq.${launchId}`;
                query = query.or(`${linkedCondition},${legacyCondition}`);
            } else {
                query = query.eq(key, launchId || value);
            }
        } else if (key === FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS) {
            query = query.ilike(key, `%${value}%`);
        } else {
            if (Array.isArray(value)) {
                if (value.length > 0) query = query.in(key, value);
            } else if (typeof value === 'string' && value.includes('%')) {
                query = query.ilike(key, value);
            } else {
                query = query.eq(key, value);
            }
        }
    });
    return query;
};

export const fetchPaginatedData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AppRecord<TFields>[]>,
    page: number,
    pageSize: number,
    fields?: string[],
    searchTerm?: string,
    searchFields?: string[],
    sort?: { field: string; direction: 'asc' | 'desc' },
    filters?: Record<string, any>
): Promise<{ records: AppRecord<TFields>[], total: number, error: AppErrorResponse | null }> => {
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        
        // Ensure we cast tableName to a valid Supabase table key
        const table = tableName as TableName;
        
        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';
        let query = supabase.from(table).select(selectQuery, { count: 'exact' });
        
        query = applyFilters(query, filters);
        
        if (searchTerm && searchFields && searchFields.length > 0) {
             const orQuery = buildSearchFilter(searchTerm, searchFields);
             if (orQuery) query = query.or(orQuery);
        }
        
        if (sort) query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        else query = query.order('created_at', { ascending: false });

        const { data, error, count } = await query.range(from, to);
        
        if (error) return { records: [], total: 0, error: { error: { type: 'SUPABASE_ERROR', message: error.message } } };

        const records = (data || []).map((row: any) => ({ ...row, createdTime: row.created_at }));
        return { records: records as AppRecord<TFields>[], total: count || 0, error: null };
    } catch (e: any) {
        return { records: [], total: 0, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const fetchAllData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AppRecord<TFields>[]>,
    fields?: string[],
    filters?: Record<string, any>,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AppRecord<TFields>[], error: AppErrorResponse | null }> => {
    try {
        let allRows: any[] = [];
        let from = 0;
        const PAGE_SIZE = 1000;
        let hasMore = true;
        const table = tableName as TableName;
        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';

        while (hasMore) {
            let attempt = 0;
            let success = false;
            let lastError: any = null;
            while (attempt < MAX_RETRIES && !success) {
                try {
                    let query = supabase.from(table).select(selectQuery);
                    query = applyFilters(query, filters);
                    if (sort && sort.length > 0) {
                        sort.forEach(s => query = query.order(s.field, { ascending: s.direction === 'asc' }));
                    } else {
                        query = query.order('id', { ascending: true });
                    }
                    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);
                    if (error) throw error;
                    if (data) {
                        allRows = [...allRows, ...data];
                        if (data.length < PAGE_SIZE) hasMore = false;
                        else from += PAGE_SIZE;
                    } else {
                        hasMore = false;
                    }
                    success = true;
                } catch (err: any) {
                    lastError = err;
                    attempt++;
                    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
                }
            }
            if (!success) return { records: [], error: { error: { type: 'SUPABASE_ERROR', message: lastError?.message || 'Network error' } } };
        }
        const records = allRows.map((row: any) => ({ ...row, createdTime: row.created_at }));
        return { records: records as AppRecord<TFields>[], error: null };
    } catch (e: any) {
        return { records: [], error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const fetchData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AppRecord<TFields>[]>,
    fields?: string[],
    filters?: Record<string, any>,
    maxRecords?: number,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AppRecord<TFields>[], error: AppErrorResponse | null }> => {
    if (maxRecords && maxRecords > 0) {
        try {
            const table = tableName as TableName;
            const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';
            let query = supabase.from(table).select(selectQuery).limit(maxRecords);
            query = applyFilters(query, filters);
            if (sort && sort.length > 0) sort.forEach(s => query = query.order(s.field, { ascending: s.direction === 'asc' }));
            const { data, error } = await query;
            if (error) throw error;
            const records = (data || []).map((row: any) => ({ ...row, createdTime: row.created_at }));
            return { records: records as AppRecord<TFields>[], error: null };
        } catch (e: any) {
            return { records: [], error: { error: { type: 'SUPABASE_ERROR', message: e.message } } };
        }
    }
    return await fetchAllData<TFields>(tableName, zodSchema, fields, filters, sort);
};

export const createRecord = async <TFields>(
    tableName: string,
    fields: TFields
): Promise<{ record: AppRecord<TFields> | null, error: AppErrorResponse | null }> => {
    try {
        const table = tableName as TableName;
        // @ts-ignore: Dynamic insert is tricky to type perfectly with generic TFields, but secure at runtime
        const { data, error } = await supabase.from(table).insert(fields as any).select().single();
        if (error) return { record: null, error: { error: { type: 'CREATE_ERROR', message: error.message } } };
        if (!data) return { record: null, error: { error: { type: 'CREATE_ERROR', message: 'No data returned from insert' } } };
        
        const record = { ...(data as any), createdTime: (data as any).created_at };
        return { record, error: null };
    } catch (e: any) {
        return { record: null, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const updateRecord = async <TFields>(
    tableName: string,
    recordId: string,
    fields: Partial<TFields>
): Promise<{ record: AppRecord<TFields> | null, error: AppErrorResponse | null }> => {
    try {
        const table = tableName as TableName;
        // @ts-ignore
        const { data, error } = await supabase
            .from(table)
            .update(fields as any)
            .eq('id', recordId)
            .select()
            .maybeSingle(); 

        if (error) {
            console.error(`Supabase Update Error ${tableName}:`, error);
            return { record: null, error: { error: { type: 'UPDATE_ERROR', message: error.message } } };
        }
        
        const record = data ? { ...(data as any), createdTime: (data as any).created_at } : { id: recordId, ...fields };
        return { record: record as AppRecord<TFields>, error: null };
    } catch (e: any) {
        return { record: null, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const updateRecords = async <TFields>(
    tableName: string,
    records: { id: string; fields: Partial<TFields> }[]
): Promise<{ records: AppRecord<TFields>[] | null, error: AppErrorResponse | null }> => {
    try {
        const promises = records.map(rec => updateRecord<TFields>(tableName, rec.id, rec.fields));
        const results = await Promise.all(promises);
        const failures = results.filter(r => r.error);
        if (failures.length > 0) return { records: null, error: { error: { type: 'BULK_UPDATE_PARTIAL_ERROR', message: 'Algunos registros no se actualizaron.' } } };
        const successes = results.map(r => r.record!).filter(Boolean);
        return { records: successes, error: null };
    } catch (e: any) {
        return { records: null, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const deleteRecord = async (
    tableName: string,
    recordId: string
): Promise<{ success: boolean, error: AppErrorResponse | null }> => {
    try {
        const table = tableName as TableName;
        // IMPORTANT: We use { count: 'exact' } to know if something was actually deleted.
        // If RLS prevents deletion, error might be null but count will be 0.
        const { error, count } = await supabase.from(table).delete({ count: 'exact' }).eq('id', recordId);
        
        if (error) return { success: false, error: { error: { type: 'DELETE_ERROR', message: error.message } } };
        
        // Critical Fix: Check if a row was actually deleted.
        if (count === 0) {
            return { 
                success: false, 
                error: { 
                    error: { 
                        type: 'DELETE_ERROR', 
                        message: 'No se pudo eliminar el registro. Puede que no tengas permisos (RLS) o que el registro ya no exista.' 
                    } 
                } 
            };
        }

        return { success: true, error: null };
    } catch (e: any) {
        return { success: false, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};
