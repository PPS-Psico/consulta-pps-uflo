
import { supabase } from '../lib/supabaseClient';
import type { AppRecord, AppErrorResponse } from '../types';
import { z } from 'zod';
import { FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, TABLE_NAME_ESTUDIANTES, FIELD_LANZAMIENTO_VINCULADO_PRACTICAS, FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS } from '../constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper para construir filtros de búsqueda dinámicos
const buildSearchFilter = (tableName: string, searchTerm: string, searchFields: string[]) => {
    if (!searchTerm || searchFields.length === 0) return null;
    
    const term = searchTerm.replace(/[^\w\s]/gi, ''); // Sanitize simple
    if (!term) return null;

    // Construye una query tipo "campo1.ilike.%term%,campo2.ilike.%term%"
    // Supabase usa sintaxis PostgREST
    return searchFields.map(field => `${field}.ilike.%${term}%`).join(',');
};

export const fetchPaginatedData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AppRecord<TFields>[]>,
    page: number,
    pageSize: number,
    fields?: string[],
    searchTerm?: string,
    searchFields?: string[], // Campos donde buscar el searchTerm
    sort?: { field: string; direction: 'asc' | 'desc' },
    filters?: Record<string, any> // Nuevos filtros específicos (AND)
): Promise<{ records: AppRecord<TFields>[], total: number, error: AppErrorResponse | null }> => {
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';

        let query = supabase
            .from(tableName)
            .select(selectQuery, { count: 'exact' });

        // --- SPECIFIC FILTERS (AND logic) ---
        if (filters) {
             Object.entries(filters).forEach(([key, value]) => {
                 if (value !== undefined && value !== null && value !== '') {
                     if (key === 'startDate') {
                         query = query.gte('fecha_inicio', value);
                     } else if (key === 'endDate') {
                         query = query.lte('fecha_inicio', value);
                     } else if (key === 'institucion') {
                         query = query.ilike('nombre_institucion', `%${value}%`);
                     } else if (key === FIELD_LANZAMIENTO_VINCULADO_PRACTICAS) {
                         // HYBRID LAUNCH FILTER LOGIC
                         // Check if value is in "ID|Name|Date" format
                         if (typeof value === 'string' && value.includes('|')) {
                             const [launchId, instName, startDate] = value.split('|');
                             // Construct OR query: (lanzamiento_id = ID) OR (nombre_institucion ILIKE Name% AND fecha_inicio = Date)
                             // Note: Using ILIKE and wildcard for name to be safe with variations
                             if (launchId && instName && startDate) {
                                 const legacyCondition = `and(nombre_institucion.ilike."${instName}%",fecha_inicio.eq.${startDate})`;
                                 const linkedCondition = `${key}.eq.${launchId}`;
                                 query = query.or(`${linkedCondition},${legacyCondition}`);
                             } else {
                                 // Fallback to ID if parse fails
                                 query = query.eq(key, launchId || value);
                             }
                         } else {
                             // Standard Strict ID Filter
                             query = query.eq(key, value);
                         }
                     } else if (key === FIELD_ESTUDIANTE_LINK_PRACTICAS) {
                         query = query.eq(key, value);
                     } else if (key === FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS) {
                         // Special case for institution name filter to allow partial/case-insensitive matching
                         query = query.ilike(key, `%${value}%`);
                     } else {
                         // Generic equality for other fields if needed
                         query = query.eq(key, value);
                     }
                 }
             });
        }

        // --- SERVER SIDE FILTERING (OR logic for search) ---
        if (searchTerm && searchFields && searchFields.length > 0) {
             const orQuery = buildSearchFilter(tableName, searchTerm, searchFields);
             if (orQuery) {
                 query = query.or(orQuery);
             }
        }

        // --- SORTING ---
        if (sort) {
            query = query.order(sort.field, { ascending: sort.direction === 'asc' });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        // --- PAGINATION ---
        const { data, error, count } = await query.range(from, to);

        if (error) {
             console.error(`Supabase Error fetching page for ${tableName}:`, error);
             return { records: [], total: 0, error: { error: { type: 'SUPABASE_ERROR', message: error.message } } };
        }

        const records = (data || []).map(row => ({
            ...row,
            createdTime: row.created_at // Alias compatibility
        }));

        // Validación "laxa" para no romper la UI si el esquema ha cambiado ligeramente,
        // pero mantenemos el tipado fuerte.
        const validationResult = zodSchema.safeParse(records);
        if (!validationResult.success) {
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
            // Return raw records cast to expected type to prevent UI crash
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
    filterByFormula?: string, 
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AppRecord<TFields>[], error: AppErrorResponse | null }> => {
    try {
        let allRows: any[] = [];
        let from = 0;
        const PAGE_SIZE = 200; 
        let hasMore = true;

        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';

        while (hasMore) {
            let attempt = 0;
            let success = false;
            let lastError: any = null;

            while (attempt < MAX_RETRIES && !success) {
                try {
                    let query = supabase.from(tableName).select(selectQuery);

                    // --- FILTERING LOGIC (Legacy/Compatibility for complex queries) ---
                    if (filterByFormula) {
                        const equalityMatch = filterByFormula.match(/^\{\s*(.+?)\s*\}\s*=\s*['"](.+?)['"]$/);
                        const idMatch = filterByFormula.match(/^RECORD_ID\(\)\s*=\s*['"]([^'"]+)['"]$/i);
                        
                        const studentSearchMatch = (tableName === TABLE_NAME_ESTUDIANTES) 
                            ? filterByFormula.match(/OR\(\s*SEARCH\("([^"]+)",\s*LOWER\(\{(.+?)\}\)\),\s*SEARCH\("([^"]+)",\s*\{(.+?)\}\s*&\s*''\)\s*\)/i)
                            : null;

                        if (equalityMatch) {
                            query = query.eq(equalityMatch[1], equalityMatch[2]);
                        } else if (idMatch) {
                            query = query.eq('id', idMatch[1]);
                        } else if (studentSearchMatch) {
                             const term = studentSearchMatch[1];
                             query = query.or(`${FIELD_NOMBRE_ESTUDIANTES}.ilike.%${term}%,${FIELD_LEGAJO_ESTUDIANTES}.ilike.%${term}%`);
                        }
                    }

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
            createdTime: row.created_at // Alias compatibility
        }));

        const validationResult = zodSchema.safeParse(records);
        if (!validationResult.success) {
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
             // Return raw records cast to expected type to prevent UI crash
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
    filterByFormula?: string,
    maxRecords?: number,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AppRecord<TFields>[], error: AppErrorResponse | null }> => {
    const result = await fetchAllData<TFields>(tableName, zodSchema, fields, filterByFormula, sort);
    if (maxRecords && result.records) {
        result.records = result.records.slice(0, maxRecords);
    }
    return result;
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

        // Fix: Use data.created_at since we just selected the inserted row
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

        // Fix: Use data.created_at
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
