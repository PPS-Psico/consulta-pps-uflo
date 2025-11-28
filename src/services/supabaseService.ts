
import { supabase } from '../lib/supabaseClient';
import type { AirtableRecord, AirtableErrorResponse } from '../types';
import { z } from 'zod';
import { FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, AIRTABLE_TABLE_NAME_ESTUDIANTES } from '../constants';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAllData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AirtableRecord<TFields>[]>,
    fields?: string[], // Now used for selecting specific columns in SQL
    filterByFormula?: string, // Adjusted for SQL-like filtering or custom logic
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    try {
        let allRows: any[] = [];
        let from = 0;
        const PAGE_SIZE = 200; 
        let hasMore = true;

        // --- QUERY BUILDER ---
        const selectQuery = fields && fields.length > 0 ? `id, created_at, ${fields.join(', ')}` : '*';

        while (hasMore) {
            let attempt = 0;
            let success = false;
            let lastError: any = null;

            while (attempt < MAX_RETRIES && !success) {
                try {
                    let query = supabase.from(tableName).select(selectQuery);

                    // --- FILTERING LOGIC ---
                    // We still support some basic "formula" emulation for compatibility
                    if (filterByFormula) {
                         // 1. Simple Equality: {Field} = 'Value'
                        const equalityMatch = filterByFormula.match(/^\{\s*(.+?)\s*\}\s*=\s*['"](.+?)['"]$/);
                        // 2. ID Search: RECORD_ID() = '...'
                        const idMatch = filterByFormula.match(/^RECORD_ID\(\)\s*=\s*['"]([^'"]+)['"]$/i);
                        
                        // 3. Student Search (AdminSearch.tsx)
                        const studentSearchMatch = (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) 
                            ? filterByFormula.match(/OR\(\s*SEARCH\("([^"]+)",\s*LOWER\(\{(.+?)\}\)\),\s*SEARCH\("([^"]+)",\s*\{(.+?)\}\s*&\s*''\)\s*\)/i)
                            : null;

                        if (equalityMatch) {
                            query = query.eq(equalityMatch[1], equalityMatch[2]);
                        } else if (idMatch) {
                            query = query.eq('id', idMatch[1]);
                        } else if (studentSearchMatch) {
                             const term = studentSearchMatch[1];
                             // Assuming FIELDS are already mapped to constants in AdminSearch
                             // We rely on the constants.ts file having the correct DB column names
                             query = query.or(`${FIELD_NOMBRE_ESTUDIANTES}.ilike.%${term}%,${FIELD_LEGAJO_ESTUDIANTES}.ilike.%${term}%`);
                        }
                    }

                    // --- SORTING ---
                    if (sort && sort.length > 0) {
                        sort.forEach(s => {
                            query = query.order(s.field, { ascending: s.direction === 'asc' });
                        });
                    } else {
                        query = query.order('id', { ascending: true });
                    }

                    // Pagination
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

        // --- MAPPING ---
        // No transformation needed! The data is already flat.
        // We add 'createdTime' alias for compatibility with existing code that might use it.
        const records = allRows.map(row => ({
            ...row,
            createdTime: row.created_at // Alias
        }));

        // --- VALIDATION (Optional but good) ---
        const validationResult = zodSchema.safeParse(records);
        if (!validationResult.success) {
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
            // Return unvalidated to avoid breaking UI on minor mismatches during refactor
             return { records: records as AirtableRecord<TFields>[], error: null };
        }

        return { records: validationResult.data as AirtableRecord<TFields>[], error: null };

    } catch (e: any) {
        console.error("Unexpected error in fetchAllData:", e);
        return { records: [], error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const fetchData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AirtableRecord<TFields>[]>,
    fields?: string[],
    filterByFormula?: string,
    maxRecords?: number,
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    // Reusing fetchAllData but we could optimize for limit if needed
    const result = await fetchAllData<TFields>(tableName, zodSchema, fields, filterByFormula, sort);
    if (maxRecords && result.records) {
        result.records = result.records.slice(0, maxRecords);
    }
    return result;
};

export const createRecord = async <TFields>(
    tableName: string,
    fields: TFields
): Promise<{ record: AirtableRecord<TFields> | null, error: AirtableErrorResponse | null }> => {
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
): Promise<{ record: AirtableRecord<TFields> | null, error: AirtableErrorResponse | null }> => {
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
): Promise<{ records: AirtableRecord<TFields>[] | null, error: AirtableErrorResponse | null }> => {
    try {
        // Supabase doesn't have a bulk update for different values per row easily accessible via JS client
        // We iterate. Optimization: could use an RPC function if performance becomes an issue.
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
): Promise<{ success: boolean, error: AirtableErrorResponse | null }> => {
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
