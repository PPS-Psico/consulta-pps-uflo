


import { supabase } from '../lib/supabaseClient';
// FIX: Import 'mapFieldToDb' to resolve 'Cannot find name' errors.
import { mapFieldToDb, mapFieldsToDb, mapDbRowToFields } from '../lib/schemaMapping';
import type { AirtableRecord, AirtableErrorResponse } from '../types';
import { z } from 'zod';
import { FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, AIRTABLE_TABLE_NAME_ESTUDIANTES } from '../constants';

// Helper para convertir respuesta de Supabase al formato que espera la UI (tipo Airtable)
const transformToAirtableFormat = <T>(tableName: string, data: any[]): AirtableRecord<T>[] => {
    return data.map(row => ({
        id: row.id,
        createdTime: row.created_at || new Date().toISOString(),
        fields: mapDbRowToFields(tableName, row) as T
    }));
};

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const fetchAllData = async <TFields extends Record<string, any>>(
    tableName: string,
    zodSchema: z.ZodSchema<AirtableRecord<TFields>[]>,
    fields?: string[], // Ignorado en Supabase (select *), se filtra en mapping
    filterByFormula?: string, // Airtable formula string emulation
    sort?: { field: string; direction: 'asc' | 'desc' }[]
): Promise<{ records: AirtableRecord<TFields>[], error: AirtableErrorResponse | null }> => {
    try {
        let allRows: any[] = [];
        let from = 0;
        const PAGE_SIZE = 200; // Reduced from 1000 to prevent timeouts
        let hasMore = true;

        // --- SMART FILTERING OPTIMIZATION ---
        // Intentamos traducir fórmulas de Airtable a filtros nativos de Supabase para evitar descargar toda la tabla.
        let dbFilter: { column: string, value: any, operator: 'eq' } | { type: 'or', filters: string } | null = null;

        if (filterByFormula) {
            // Patrón 1: Igualdad simple -> {Campo} = 'Valor'
            const equalityMatch = filterByFormula.match(/^\{\s*(.+?)\s*\}\s*=\s*['"](.+?)['"]$/);
            
            // Patrón 2: Búsqueda por ID nativo -> RECORD_ID() = '...'
            const idMatch = filterByFormula.match(/^RECORD_ID\(\)\s*=\s*['"]([^'"]+)['"]$/i);

            // NEW PATTERN for Student Search (Matches what AdminSearch.tsx produces)
            const studentSearchMatch = (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) 
                ? filterByFormula.match(/OR\(\s*SEARCH\("([^"]+)",\s*LOWER\(\{(.+?)\}\)\),\s*SEARCH\("([^"]+)",\s*\{(.+?)\}\s*&\s*''\)\s*\)/i)
                : null;
            
            if (equalityMatch) {
                const appFieldName = equalityMatch[1].trim();
                const value = equalityMatch[2];
                const dbColumn = mapFieldToDb(tableName, appFieldName);
                
                if (dbColumn) {
                    dbFilter = { column: dbColumn, value: value, operator: 'eq' };
                }
            } else if (idMatch) {
                dbFilter = { column: 'id', value: idMatch[1], operator: 'eq' };
            } else if (studentSearchMatch) {
                const searchTerm1 = studentSearchMatch[1];
                const nameField = studentSearchMatch[2];
                // searchTerm2 might be same as 1
                const legajoField = studentSearchMatch[4];
                
                if (nameField === FIELD_NOMBRE_ESTUDIANTES && legajoField === FIELD_LEGAJO_ESTUDIANTES) {
                    const nameCol = mapFieldToDb(tableName, nameField);
                    const legajoCol = mapFieldToDb(tableName, legajoField);
                    
                    // For exact Legajo match or partial name match. 
                    // Using .ilike.%term% for both is safer for user input.
                    // Casting legajo to text is essential because it might be numeric in DB.
                    dbFilter = {
                        type: 'or',
                        filters: `${nameCol}.ilike.%${searchTerm1}%,${legajoCol}::text.ilike.%${searchTerm1}%`
                    };
                }
            }
        }
        // -------------------------------------

        while (hasMore) {
            let attempt = 0;
            let success = false;
            let lastError: any = null;

            while (attempt < MAX_RETRIES && !success) {
                try {
                    let query = supabase.from(tableName).select('*');

                    // Aplicar filtro nativo si se detectó
                    if (dbFilter) {
                        if ('operator' in dbFilter && dbFilter.operator === 'eq') {
                            query = query.eq(dbFilter.column, dbFilter.value);
                        } else if ('type' in dbFilter && dbFilter.type === 'or') {
                            query = query.or(dbFilter.filters);
                        }
                    }

                    // Manejo básico de ordenamiento
                    // Es CRÍTICO tener un orden consistente para que la paginación funcione correctamente.
                    if (sort && sort.length > 0) {
                        sort.forEach(s => {
                            const dbField = mapFieldToDb(tableName, s.field);
                            query = query.order(dbField, { ascending: s.direction === 'asc' });
                        });
                    } else {
                        // Ordenamiento por defecto estable si no se provee uno
                        query = query.order('id', { ascending: true });
                    }

                    // Si estamos filtrando por ID exacto, no necesitamos rangos ni paginación masiva
                    if (dbFilter && 'column' in dbFilter && dbFilter.column === 'id') {
                         const { data, error } = await query.maybeSingle();
                         if (error) throw error;
                         if (data) allRows = [data];
                         hasMore = false;
                         success = true;
                         break;
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
                    console.warn(`Attempt ${attempt} failed for ${tableName} (range ${from}): ${err.message}`);
                    if (attempt < MAX_RETRIES) {
                        await sleep(RETRY_DELAY_MS * attempt); // Exponential backoff
                    }
                }
            }

            if (!success) {
                console.error(`Supabase Error fetching ${tableName} after ${MAX_RETRIES} attempts:`, JSON.stringify(lastError));
                return { records: [], error: { error: { type: 'SUPABASE_ERROR', message: lastError?.message || 'Network error' } } };
            }
        }

        let transformedRecords: AirtableRecord<TFields>[] = transformToAirtableFormat<TFields>(tableName, allRows);

        // Filtrado CLIENT-SIDE (Fallback y lógica compleja)
        if (filterByFormula && !dbFilter) {
            const lowerFormula = filterByFormula.toLowerCase();
            
            // Intento de extraer términos de búsqueda de fórmulas tipo SEARCH("termino", ...)
            const searchMatch = filterByFormula.match(/SEARCH\(\s*['"](.+?)['"]/i);
            const searchTerm = searchMatch ? searchMatch[1].toLowerCase() : null;
            
            // Intento de extraer ID para RECORD_ID() = '...' (Caso complejo dentro de un OR)
            const idMatch = filterByFormula.match(/RECORD_ID\(\)\s*=\s*['"]([^'"]+)['"]/i);
            const targetId = idMatch ? idMatch[1] : null;

            transformedRecords = transformedRecords.filter(record => {
                const flatFields = record.fields as Record<string, any>;
                
                // 1. Filtro por ID exacto
                if (targetId) {
                    if (record.id === targetId) return true;
                    // Si es una búsqueda SOLO por ID y no coincide, excluir.
                    if (!lowerFormula.includes('or(')) return false; 
                }

                // 2. Filtro de Búsqueda General (SEARCH)
                if (searchTerm) {
                    // IMPROVED FALLBACK FOR STUDENT SEARCH
                    if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                        const studentName = String(flatFields[FIELD_NOMBRE_ESTUDIANTES] || '').toLowerCase();
                        const studentLegajo = String(flatFields[FIELD_LEGAJO_ESTUDIANTES] || '').toLowerCase();
                        if (studentName.includes(searchTerm) || studentLegajo.includes(searchTerm)) {
                            return true;
                        }
                    } else {
                        // Original generic logic for other tables
                        const values = Object.values(flatFields).join(' ').toLowerCase();
                        if (values.includes(searchTerm)) return true;
                    }

                    if (!lowerFormula.includes('or(')) return false;
                }
                
                // 3. Filtro específico para estado 'oculto' (común en lanzamientos)
                if (lowerFormula.includes('oculto') && lowerFormula.includes('!=')) {
                     const estado = String(flatFields['Estado de Convocatoria'] || '').toLowerCase();
                     if (estado === 'oculto') return false;
                }
                
                // 4. Fallback for strict equality {Field} = 'Value' in client if DB filter missed it
                // This handles cases where maybe regex was slightly off or field name mismatch in first pass
                const simpleEqMatch = filterByFormula.match(/^\{\s*(.+?)\s*\}\s*=\s*['"](.+?)['"]$/);
                if (simpleEqMatch) {
                    const key = simpleEqMatch[1].trim();
                    const val = simpleEqMatch[2];
                    // Note: this comparison is string-based and simplistic
                    if (String(flatFields[key]) !== val) return false;
                }
                
                return true;
            });
        }

        // Validación Zod
        const validationResult = zodSchema.safeParse(transformedRecords);
        if (!validationResult.success) {
            // Logueamos warning pero devolvemos los datos transformados para que la UI no rompa totalmente.
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
            return { records: transformedRecords as any, error: null };
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
        const dbFields = mapFieldsToDb(tableName, fields as Record<string, any>);
        
        // Convertir arrays a valores simples para FKs
        for (const key in dbFields) {
             if (Array.isArray(dbFields[key]) && dbFields[key].length > 0 && (key.endsWith('_id') || key === 'convocatoria_afectada')) {
                 dbFields[key] = dbFields[key][0];
             }
        }

        const { data, error } = await supabase
            .from(tableName)
            .insert(dbFields)
            .select()
            .single();

        if (error) {
            console.error(`Supabase Create Error ${tableName}:`, error);
            return { record: null, error: { error: { type: 'CREATE_ERROR', message: error.message } } };
        }

        const transformed = transformToAirtableFormat<TFields>(tableName, [data]);
        return { record: transformed[0], error: null };

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
        const dbFields = mapFieldsToDb(tableName, fields as Record<string, any>);
        
        for (const key in dbFields) {
             if (Array.isArray(dbFields[key]) && dbFields[key].length > 0 && (key.endsWith('_id') || key === 'convocatoria_afectada')) {
                 dbFields[key] = dbFields[key][0];
             }
        }

        const { data, error } = await supabase
            .from(tableName)
            .update(dbFields)
            .eq('id', recordId)
            .select()
            .single();

        if (error) {
            console.error(`Supabase Update Error ${tableName}:`, error);
            return { record: null, error: { error: { type: 'UPDATE_ERROR', message: error.message } } };
        }

        const transformed = transformToAirtableFormat<TFields>(tableName, [data]);
        return { record: transformed[0], error: null };
    } catch (e: any) {
        return { record: null, error: { error: { type: 'UNKNOWN_ERROR', message: e.message } } };
    }
};

export const updateRecords = async <TFields>(
    tableName: string,
    records: { id: string; fields: Partial<TFields> }[]
): Promise<{ records: AirtableRecord<TFields>[] | null, error: AirtableErrorResponse | null }> => {
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
