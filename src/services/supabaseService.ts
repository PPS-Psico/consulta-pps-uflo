
import { supabase } from '../lib/supabaseClient';
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
        const PAGE_SIZE = 200; 
        let hasMore = true;

        // --- SMART FILTERING OPTIMIZATION ---
        // Traducimos fórmulas de Airtable a filtros nativos de Supabase para usar índices.
        let dbFilter: { column: string, value: any, operator: 'eq' } | { type: 'or', filters: string } | null = null;

        if (filterByFormula) {
            // Patrón 1: Igualdad simple -> {Campo} = 'Valor'
            const equalityMatch = filterByFormula.match(/^\{\s*(.+?)\s*\}\s*=\s*['"](.+?)['"]$/);
            
            // Patrón 2: Búsqueda por ID nativo -> RECORD_ID() = '...'
            const idMatch = filterByFormula.match(/^RECORD_ID\(\)\s*=\s*['"]([^'"]+)['"]$/i);

            // Patrón 3: Búsqueda de Estudiantes (Generado por AdminSearch.tsx)
            // Formula: OR(SEARCH("term", LOWER({Nombre})), SEARCH("term", {Legajo} & ''))
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
                const term = studentSearchMatch[1]; // El término de búsqueda
                const nameField = studentSearchMatch[2];
                const legajoField = studentSearchMatch[4];
                
                if (nameField === FIELD_NOMBRE_ESTUDIANTES && legajoField === FIELD_LEGAJO_ESTUDIANTES) {
                    const nameCol = mapFieldToDb(tableName, nameField);
                    const legajoCol = mapFieldToDb(tableName, legajoField);
                    
                    // Usamos ILIKE para búsqueda insensible a mayúsculas y parcial.
                    dbFilter = {
                        type: 'or',
                        filters: `${nameCol}.ilike.%${term}%,${legajoCol}.ilike.%${term}%`
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
                    if (sort && sort.length > 0) {
                        sort.forEach(s => {
                            const dbField = mapFieldToDb(tableName, s.field);
                            query = query.order(dbField, { ascending: s.direction === 'asc' });
                        });
                    } else {
                        query = query.order('id', { ascending: true });
                    }

                    // Si es búsqueda por ID, optimizamos para traer uno solo
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
                    console.warn(`Attempt ${attempt} failed for ${tableName}: ${err.message}`);
                    if (attempt < MAX_RETRIES) {
                        await sleep(RETRY_DELAY_MS * attempt);
                    }
                }
            }

            if (!success) {
                console.error(`Supabase Error fetching ${tableName}:`, lastError);
                return { records: [], error: { error: { type: 'SUPABASE_ERROR', message: lastError?.message || 'Network error' } } };
            }
        }

        let transformedRecords: AirtableRecord<TFields>[] = transformToAirtableFormat<TFields>(tableName, allRows);

        // Filtrado CLIENT-SIDE (Fallback para lógicas complejas no cubiertas por DB filter)
        if (filterByFormula && !dbFilter) {
            const lowerFormula = filterByFormula.toLowerCase();
            
            const searchMatch = filterByFormula.match(/SEARCH\(\s*['"](.+?)['"]/i);
            const searchTerm = searchMatch ? searchMatch[1].toLowerCase() : null;
            
            const idMatch = filterByFormula.match(/RECORD_ID\(\)\s*=\s*['"]([^'"]+)['"]/i);
            const targetId = idMatch ? idMatch[1] : null;

            transformedRecords = transformedRecords.filter(record => {
                const flatFields = record.fields as Record<string, any>;
                
                if (targetId) {
                    if (record.id === targetId) return true;
                    if (!lowerFormula.includes('or(')) return false; 
                }

                if (searchTerm) {
                    if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                        const studentName = String(flatFields[FIELD_NOMBRE_ESTUDIANTES] || '').toLowerCase();
                        const studentLegajo = String(flatFields[FIELD_LEGAJO_ESTUDIANTES] || '').toLowerCase();
                        if (studentName.includes(searchTerm) || studentLegajo.includes(searchTerm)) {
                            return true;
                        }
                    } else {
                        const values = Object.values(flatFields).join(' ').toLowerCase();
                        if (values.includes(searchTerm)) return true;
                    }

                    if (!lowerFormula.includes('or(')) return false;
                }
                
                if (lowerFormula.includes('oculto') && lowerFormula.includes('!=')) {
                     const estado = String(flatFields['Estado de Convocatoria'] || '').toLowerCase();
                     if (estado === 'oculto') return false;
                }
                
                const simpleEqMatch = filterByFormula.match(/^\{\s*(.+?)\s*\}\s*=\s*['"](.+?)['"]$/);
                if (simpleEqMatch) {
                    const key = simpleEqMatch[1].trim();
                    const val = simpleEqMatch[2];
                    if (String(flatFields[key]) !== val) return false;
                }
                
                return true;
            });
        }

        // Validación Zod
        const validationResult = zodSchema.safeParse(transformedRecords);
        if (!validationResult.success) {
            console.warn(`Schema validation warning for ${tableName}:`, validationResult.error.issues);
            // Devolvemos los datos aunque falle la validación estricta para no romper la UI por datos legacy
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
