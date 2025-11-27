
import * as supabaseService from './supabaseService';

/**
 * ADAPTER LAYER: AIRTABLE TO SUPABASE
 * 
 * Este archivo actúa como un puente. Redirige todas las llamadas que los componentes
 * hacen a la antigua API de Airtable hacia el nuevo servicio de Supabase.
 * Esto permite que la aplicación funcione con la nueva base de datos sin necesidad
 * de refactorizar cada componente individualmente.
 */

export const fetchAirtableData = supabaseService.fetchData;
export const fetchAllAirtableData = supabaseService.fetchAllData;
export const createAirtableRecord = supabaseService.createRecord;
export const updateAirtableRecord = supabaseService.updateRecord;
export const updateAirtableRecords = supabaseService.updateRecords;
export const deleteAirtableRecord = supabaseService.deleteRecord;
