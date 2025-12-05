
import { supabase } from '../lib/supabaseClient';
import type { AppRecord, AppErrorResponse } from '../types';
import { z } from 'zod';
import { 
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, 
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS 
} from '../constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para construir filtros de búsqueda global (OR)
const buildSearchFilter = (tableName: string, searchTerm: string, searchFields: string[]) => {
    if (!searchTerm || searchFields.length === 0) return null;
    
    const term = searchTerm.replace(/[^\w\s]/gi, ''); // Sanitize simple
    if (!term) return null;

    // Construye una query tipo "campo1.ilike.%term%,campo2.ilike.%term%"
    return searchFields.map(field => `${field}.ilike.%${term}%`).join(',');
};

// Helper centralizado para aplicar filtros nativos (AND)
const applyFilters = (query: any, filters?: Record<string, any>) => {
    if (!filters) return query;

    Object.entries(filters).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;

        // 1. Filtros Especiales
        if (key === 'startDate') {
            query = query.gte('fecha_inicio', value);
        } else if (key === 'endDate') {
            query = query.lte('fecha_inicio', value);
        } else if (key === 'institucion') {
            query = query.ilike('nombre_institucion', `%${value}%`);
        } else if (key === FIELD_LANZAMIENTO_VINCULADO_PRACTICAS && typeof value === 'string' && value.includes('|')) {
            // Lógica híbrida para Prácticas: ID exacto O coincidencia por nombre/fecha (Legacy link)
            const [launchId, instName, startDate] = value.split('|');
            if (launchId && instName && startDate) {
                const legacyCondition = `and(nombre_institucion.ilike."${instName}%",fecha_inicio.eq.${startDate})`;
                const linkedCondition = `${key}.eq.${launchId}`;
                query = query.or(`${linkedCondition},${legacyCondition}`);
            } else {
                query = query.eq(key, launchId || value);
            }
        } else if (key === FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS) {
            // Búsqueda parcial para nombres de instituciones
            query = query.ilike(key, `%${value}%`);
        } 
        // 2. Filtros Estándar
        else {
            if (Array.isArray(value)) {
                // Si es array y tiene elementos, usamos IN
                if (value.length > 0) query = query.in(key, value);
            } else if (typeof value === 'string' && value.includes('%')) {
                // Si el valor tiene %, usamos ILIKE explícito
                query = query.ilike(key, value);
            } else {
                // Igualdad exacta por defecto
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
        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';

        let query = supabase
            .from(tableName)
            .select(selectQuery, { count: 'exact' });

        // Aplicar filtros nativos
        query = applyFilters(query, filters);

        // Aplicar búsqueda global (OR)
        if (searchTerm && searchFields && searchFields.length > 0) {
             const orQuery = buildSearchFilter(tableName, searchTerm, searchFields);
             if (orQuery) {
                 query = query.or(orQuery);
             }
        }

        // Ordenamiento
        if (sort) {
            query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error, count } = await query.range(from, to);

        if (error) {
             console.error(`Supabase Error fetching page for ${tableName}:`, error);
             return { records: [], total: 0, error: { error: { type: 'SUPABASE_ERROR', message: error.message } } };
        }

        const records = (data || []).map(row => ({
            ...row,
            createdTime: row.created_at // Alias compatibility
        }));

        const validationResult = zodSchema.safeParse(records);
        if (!validationResult.success) {
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
            return { records: records as AppRecord<TFields>[], total: count || 0, error: null };
        }

        return { 
            records: validationResult.data as AppRecord<TFields>[], 
            total: count || 0, 
            error: null 
        };

    } catch (e: any) {
        console.error("Unexpected error in fetchPaginatedData:", e);
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
        const PAGE_SIZE = 1000; // Aumentado para reducir round-trips
        let hasMore = true;

        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';

        while (hasMore) {
            let attempt = 0;
            let success = false;
            let lastError: any = null;

            while (attempt < MAX_RETRIES && !success) {
                try {
                    let query = supabase.from(tableName).select(selectQuery);

                    query = applyFilters(query, filters);

                    if (sort && sort.length > 0) {
                        sort.forEach(s => {
                            query = query.order(s.field, { ascending: s.direction === 'asc' });
                        });
                    } else {
                        query = query.order('id', { ascending: true });
                    }

                    const { data, error } = await query.range(from, from + PAGE_SIZE - 1);

                    if (error) throw error;

                    if (data) {
                        allRows = [...allRows, ...data];
                        if (data.length < PAGE_SIZE) {
                            hasMore = false;
                        } else {
                            from += PAGE_SIZE;
                        }
                    } else {
                        hasMore = false;
                    }
                    success = true;

                } catch (err: any) {
                    lastError = err;
                    attempt++;
                    console.warn(`Attempt ${attempt} failed for ${tableName}: ${err.message}`);
                    if (attempt < MAX_RETRIES) await sleep(RETRY_DELAY_MS * attempt);
                }
            }

            if (!success) {
                console.error(`Supabase Error fetching ${tableName}:`, lastError);
                return { records: [], error: { error: { type: 'SUPABASE_ERROR', message: lastError?.message || 'Network error' } } };
            }
        }

        const records = allRows.map(row => ({
            ...row,
            createdTime: row.created_at
        }));

        const validationResult = zodSchema.safeParse(records);
        if (!validationResult.success) {
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
             return { records: records as AppRecord<TFields>[], error: null };
        }

        return { records: validationResult.data as AppRecord<TFields>[], error: null };

    } catch (e: any) {
        console.error("Unexpected error in fetchAllData:", e);
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
            const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';
            let query = supabase.from(tableName).select(selectQuery).limit(maxRecords);
            
            query = applyFilters(query, filters);
            
            if (sort && sort.length > 0) {
                sort.forEach(s => {
                    query = query.order(s.field, { ascending: s.direction === 'asc' });
                });
            }

            const { data, error } = await query;
            
            if (error) throw error;

            const records = (data || []).map(row => ({ ...row, createdTime: row.created_at }));
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
        const { data, error } = await supabase
            .from(tableName)
            .insert(fields as any)
            .select()
            .single();

        if (error) {
            console.error(`Supabase Create Error ${tableName}:`, error);
            return { record: null, error: { error: { type: 'CREATE_ERROR', message: error.message } } };
        }

        const record = { ...data, createdTime: data.created_at };
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
        const { data, error } = await supabase
            .from(tableName)
            .update(fields as any)
            .eq('id', recordId)
            .select()
            .single();

        if (error) {
            console.error(`Supabase Update Error ${tableName}:`, error);
            return { record: null, error: { error: { type: 'UPDATE_ERROR', message: error.message } } };
        }

        const record = { ...data, createdTime: data.created_at };
        return { record, error: null };
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
        if (failures.length > 0) {
            return { records: null, error: { error: { type: 'BULK_UPDATE_PARTIAL_ERROR', message: 'Algunos registros no se actualizaron.' } } };
        }

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
        const { error } = await supabase.from(tableName).delete().eq('id', recordId);
        if (error) {
            return { success: false, error: { error: { type: 'DELETE_ERROR', message: error.message } } };
        }
        return { success: true, error: null };
    } catch (e: any) {
        return { success: false, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};
