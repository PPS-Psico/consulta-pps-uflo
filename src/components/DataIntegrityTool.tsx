
import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabaseClient';
import { db } from '../lib/db';
import { 
    TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_CORREO_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    TABLE_NAME_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    TABLE_NAME_PRACTICAS,
    FIELD_NOTA_PRACTICAS,
    FIELD_ESTADO_PRACTICA,
    FIELD_HORAS_PRACTICAS,
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_LANZAMIENTO_VINCULADO_PRACTICAS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
    TABLE_NAME_INSTITUCIONES,
    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_DIRECCION_INSTITUCIONES,
    FIELD_TELEFONO_INSTITUCIONES,
    FIELD_CONVENIO_NUEVO_INSTITUCIONES,
    FIELD_TUTOR_INSTITUCIONES,
    FIELD_USER_ID_ESTUDIANTES,
    TABLE_NAME_PPS,
    FIELD_LEGAJO_PPS,
    TABLE_NAME_FINALIZACION,
    FIELD_ESTUDIANTE_FINALIZACION
} from '../constants';
import Card from './Card';
import Button from './Button';
import Toast from './Toast';
import EmptyState from './EmptyState';
import RecordEditModal from './RecordEditModal';
import { normalizeStringForComparison, parseToUTCDate, formatDate } from '../utils/formatters';
import { schema } from '../lib/dbSchema';

// Configuración ligera para el Modal de Edición (Reutilizando schemas existentes)
const MODAL_CONFIGS: Record<string, any> = {
    [TABLE_NAME_ESTUDIANTES]: {
        label: 'Estudiante',
        schema: schema.estudiantes,
        fieldConfig: [
            { key: FIELD_NOMBRE_ESTUDIANTES, label: 'Nombre', type: 'text' },
            { key: FIELD_LEGAJO_ESTUDIANTES, label: 'Legajo', type: 'text' },
            { key: FIELD_CORREO_ESTUDIANTES, label: 'Correo', type: 'email' },
            { key: FIELD_TELEFONO_ESTUDIANTES, label: 'Teléfono', type: 'tel' },
        ]
    },
    [TABLE_NAME_LANZAMIENTOS_PPS]: {
        label: 'Lanzamiento PPS',
        schema: schema.lanzamientos,
        fieldConfig: [
            { key: FIELD_NOMBRE_PPS_LANZAMIENTOS, label: 'Nombre', type: 'text' },
            { key: FIELD_FECHA_INICIO_LANZAMIENTOS, label: 'Inicio', type: 'date' },
            { key: FIELD_FECHA_FIN_LANZAMIENTOS, label: 'Fin', type: 'date' },
            { key: FIELD_ESTADO_GESTION_LANZAMIENTOS, label: 'Estado Gestión', type: 'select', options: ['Pendiente de Gestión', 'Relanzamiento Confirmado', 'Archivado'] },
        ]
    },
    [TABLE_NAME_PRACTICAS]: {
        label: 'Práctica',
        schema: schema.practicas,
        fieldConfig: [
            { key: FIELD_ESTUDIANTE_LINK_PRACTICAS, label: 'ID Estudiante (Vincular)', type: 'text' },
            { key: FIELD_ESTADO_PRACTICA, label: 'Estado', type: 'select', options: ['En curso', 'Finalizada', 'Convenio Realizado'] },
            { key: FIELD_NOTA_PRACTICAS, label: 'Nota', type: 'text' },
            { key: FIELD_HORAS_PRACTICAS, label: 'Horas', type: 'number' },
        ]
    }
};

interface Issue {
    id: string;
    table: string;
    recordId: string;
    type: 'critical' | 'warning' | 'suggestion';
    title: string;
    description: string;
    action: 'delete' | 'manual' | 'auto-fix';
    autoFixAction?: () => Promise<void>;
    recordData?: any; // Para pasar al modal
}

const cleanValue = (val: any) => {
    if (!val) return '';
    const str = String(val);
    return str.replace(/[\[\]"]/g, '');
}

const DataIntegrityTool: React.FC = () => {
    const [isScanning, setIsScanning] = useState(false);
    const [isFixingAll, setIsFixingAll] = useState(false);
    const [issues, setIssues] = useState<Issue[]>([]);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [fixedCount, setFixedCount] = useState(0);
    const [filterType, setFilterType] = useState<'all' | 'critical' | 'warning' | 'suggestion'>('all');
    
    // Edit Modal State
    const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
    
    const queryClient = useQueryClient();

    const updateMutation = useMutation<any, Error, { table: string, id: string, fields: any }>({
        mutationFn: ({ table, id, fields }) => {
             // @ts-ignore
             return db[getTableKey(table)].update(id, fields);
        },
        onSuccess: (_, variables) => {
            setToastInfo({ message: 'Registro corregido.', type: 'success' });
            setIssues(prev => prev.filter(i => i.recordId !== variables.id));
            setFixedCount(prev => prev + 1);
            setEditingIssue(null);
        },
        onError: (e: any) => setToastInfo({ message: `Error al guardar: ${e.message}`, type: 'error' })
    });

    // Helper to map DB table name to our db object keys
    const getTableKey = (tableName: string) => {
        if (tableName === TABLE_NAME_ESTUDIANTES) return 'estudiantes';
        if (tableName === TABLE_NAME_PRACTICAS) return 'practicas';
        if (tableName === TABLE_NAME_LANZAMIENTOS_PPS) return 'lanzamientos';
        return 'estudiantes'; // Fallback
    };

    const runScan = async () => {
        setIsScanning(true);
        setIssues([]);
        setFixedCount(0);
        const newIssues: Issue[] = [];

        try {
            // --- 1. SCAN LANZAMIENTOS ---
            const { data: lanzamientos } = await supabase.from(TABLE_NAME_LANZAMIENTOS_PPS as any).select('*');
            const now = new Date();

            if (lanzamientos) {
                lanzamientos.forEach((l: any) => {
                    const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                    const start = l[FIELD_FECHA_INICIO_LANZAMIENTOS];
                    const end = l[FIELD_FECHA_FIN_LANZAMIENTOS];
                    
                    // CRITICAL: Empty essential fields
                    if (!name.trim() || !start) {
                        newIssues.push({
                            id: `lanz-empty-${l.id}`,
                            table: TABLE_NAME_LANZAMIENTOS_PPS,
                            recordId: l.id,
                            type: 'critical',
                            title: 'Datos Esenciales Faltantes',
                            description: `El lanzamiento ID: ${l.id} no tiene nombre o fecha de inicio. Esto rompe los reportes.`,
                            action: 'delete'
                        });
                    } 
                    // SUGGESTION: Whitespace in name
                    else if (name !== name.trim()) {
                        newIssues.push({
                            id: `lanz-trim-${l.id}`,
                            table: TABLE_NAME_LANZAMIENTOS_PPS,
                            recordId: l.id,
                            type: 'suggestion',
                            title: 'Espacios en blanco innecesarios',
                            description: `El nombre "${name}" tiene espacios al inicio o final.`,
                            action: 'auto-fix',
                            autoFixAction: async () => {
                                await db.lanzamientos.update(l.id, { [FIELD_NOMBRE_PPS_LANZAMIENTOS]: name.trim() });
                            }
                        });
                    }

                    // WARNING: Inconsistent Dates
                    if (start && end) {
                        if (new Date(end) < new Date(start)) {
                            newIssues.push({
                                id: `lanz-date-${l.id}`,
                                table: TABLE_NAME_LANZAMIENTOS_PPS,
                                recordId: l.id,
                                type: 'warning',
                                title: 'Fechas Incoherentes',
                                description: `La fecha de fin es anterior al inicio en "${name}".`,
                                action: 'manual',
                                recordData: l
                            });
                        }
                    }

                    // SUGGESTION: Old Pending Management
                    if (end && new Date(end) < now && l[FIELD_ESTADO_GESTION_LANZAMIENTOS] === 'Pendiente de Gestión') {
                         newIssues.push({
                            id: `lanz-old-${l.id}`,
                            table: TABLE_NAME_LANZAMIENTOS_PPS,
                            recordId: l.id,
                            type: 'suggestion',
                            title: 'Lanzamiento Vencido sin Gestionar',
                            description: `"${name}" finalizó en el pasado pero sigue como 'Pendiente'. Debería archivarse o gestionarse.`,
                            action: 'manual',
                            recordData: l
                        });
                    }
                });
            }

            // --- 2. SCAN ESTUDIANTES ---
            const { data: students } = await supabase.from(TABLE_NAME_ESTUDIANTES as any).select('*');

            if (students) {
                const legajoMap = new Map<string, any[]>();
                
                students.forEach((s: any) => {
                    const legajo = String(s[FIELD_LEGAJO_ESTUDIANTES] || '').trim();
                    const nombre = s[FIELD_NOMBRE_ESTUDIANTES] || 'Sin Nombre';
                    const correo = s[FIELD_CORREO_ESTUDIANTES] || 'Sin Email';
                    
                    // CRITICAL: Ghost Student (Sin Legajo)
                    if (!legajo) {
                         newIssues.push({
                            id: `st-nolegajo-${s.id}`,
                            table: TABLE_NAME_ESTUDIANTES,
                            recordId: s.id,
                            type: 'critical',
                            title: `Estudiante sin Legajo: ${nombre}`,
                            description: `Email: ${correo}. ID Interno: ${s.id}. Requiere asignación manual de legajo.`,
                            action: 'manual', // Changed to manual to fix instead of delete
                            recordData: s
                        });
                    } else {
                        if (!legajoMap.has(legajo)) legajoMap.set(legajo, []);
                        legajoMap.get(legajo)!.push(s);
                    }

                    // WARNING: Missing Contact Info
                    if (legajo && (!correo || correo.trim() === '' || correo === 'Sin Email')) {
                        newIssues.push({
                            id: `st-nomail-${s.id}`,
                            table: TABLE_NAME_ESTUDIANTES,
                            recordId: s.id,
                            type: 'warning',
                            title: 'Falta Correo Electrónico',
                            description: `El estudiante ${nombre} (${legajo}) no tiene email registrado. No podrá recuperar contraseña.`,
                            action: 'manual',
                            recordData: s
                        });
                    }
                });

                // CRITICAL: Duplicates
                legajoMap.forEach((duplicates, legajo) => {
                    if (duplicates.length > 1) {
                        // Logic to determine winner and losers
                        const withUser = duplicates.filter(d => d[FIELD_USER_ID_ESTUDIANTES]);
                        const winner = withUser.length > 0 ? withUser[0] : duplicates[0]; // Prefer active user, else first one
                        const losers = duplicates.filter(d => d.id !== winner.id);
                        
                        newIssues.push({
                            id: `st-dupe-${legajo}`,
                            table: TABLE_NAME_ESTUDIANTES,
                            recordId: winner.id, 
                            type: 'critical',
                            title: `Legajo Duplicado: ${legajo}`,
                            description: `Se encontraron ${duplicates.length} registros. Se conservará el ID ${winner.id} (${winner[FIELD_NOMBRE_ESTUDIANTES]}) y se fusionarán los datos.`,
                            action: 'auto-fix',
                            autoFixAction: async () => {
                                // 1. Re-link foreign keys to winner
                                const loserIds = losers.map(l => l.id);
                                
                                // Update Convocatorias (Inscripciones)
                                await (supabase as any)
                                    .from(TABLE_NAME_CONVOCATORIAS)
                                    .update({ [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: winner.id })
                                    .in(FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, loserIds);

                                // Update Solicitudes PPS
                                await (supabase as any)
                                    .from(TABLE_NAME_PPS)
                                    .update({ [FIELD_LEGAJO_PPS]: winner.id })
                                    .in(FIELD_LEGAJO_PPS, loserIds);
                                    
                                // Update Finalizaciones
                                await (supabase as any)
                                    .from(TABLE_NAME_FINALIZACION)
                                    .update({ [FIELD_ESTUDIANTE_FINALIZACION]: winner.id })
                                    .in(FIELD_ESTUDIANTE_FINALIZACION, loserIds);

                                // Update Practicas
                                await (supabase as any)
                                    .from(TABLE_NAME_PRACTICAS)
                                    .update({ [FIELD_ESTUDIANTE_LINK_PRACTICAS]: winner.id })
                                    .in(FIELD_ESTUDIANTE_LINK_PRACTICAS, loserIds);

                                // 2. Delete losers
                                const { error } = await supabase
                                    .from(TABLE_NAME_ESTUDIANTES as any)
                                    .delete()
                                    .in('id', loserIds);
                                
                                if (error) throw new Error(`Error al eliminar duplicados: ${error.message}`);
                            }
                        });
                    }
                });
            }

            // --- 3. SCAN PRÁCTICAS ---
            const { data: practicas } = await supabase.from(TABLE_NAME_PRACTICAS as any).select('*');
            if (practicas) {
                practicas.forEach((p: any) => {
                     // CRITICAL: Orphaned Link
                     const studentLink = p[FIELD_ESTUDIANTE_LINK_PRACTICAS];
                     if (!studentLink && !p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]) {
                          const instName = cleanValue(p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'Institución Desconocida';
                          const date = formatDate(p[FIELD_FECHA_INICIO_PRACTICAS]) || 'Sin fecha';
                          
                          newIssues.push({
                            id: `prac-orphan-${p.id}`,
                            table: TABLE_NAME_PRACTICAS,
                            recordId: p.id,
                            type: 'critical',
                            title: 'Práctica Huérfana',
                            description: `Institución: ${instName}. Fecha: ${date}. No está vinculada a ningún estudiante.`,
                            action: 'manual', // Changed to manual to link instead of delete
                            recordData: p
                        });
                     }
                });
            }

            setIssues(newIssues);

        } catch (error: any) {
            console.error(error);
            setToastInfo({ message: 'Error al escanear la base de datos.', type: 'error' });
        } finally {
            setIsScanning(false);
        }
    };

    const handleAction = async (issue: Issue) => {
        if (issue.action === 'manual') {
            setEditingIssue(issue);
            return;
        }

        if (issue.action === 'auto-fix' && issue.autoFixAction) {
            try {
                await issue.autoFixAction();
                setIssues(prev => prev.filter(i => i.id !== issue.id));
                setFixedCount(prev => prev + 1);
                setToastInfo({ message: 'Corregido automáticamente.', type: 'success' });
            } catch (e: any) {
                setToastInfo({ message: `Error al corregir: ${e.message}`, type: 'error' });
            }
            return;
        }

        if (issue.action === 'delete') {
            const confirm = window.confirm('¿Estás seguro de eliminar este registro corrupto? Esta acción es irreversible.');
            if (!confirm) return;

            try {
                const { error } = await supabase
                    .from(issue.table as any)
                    .delete()
                    .eq('id', issue.recordId);

                if (error) throw error;

                setIssues(prev => prev.filter(i => i.id !== issue.id));
                setFixedCount(prev => prev + 1);
                setToastInfo({ message: 'Registro eliminado correctamente.', type: 'success' });
            } catch (err: any) {
                setToastInfo({ message: `Error al eliminar: ${err.message}`, type: 'error' });
            }
        }
    };

    const handleFixAll = async () => {
        const fixableIssues = issues.filter(i => i.action === 'auto-fix');
        if (fixableIssues.length === 0) {
            setToastInfo({ message: 'No hay problemas corregibles automáticamente.', type: 'error' });
            return;
        }
        
        if (!window.confirm(`Se van a corregir ${fixableIssues.length} problemas automáticamente. ¿Continuar?`)) {
            return;
        }

        setIsFixingAll(true);
        let successCount = 0;

        for (const issue of fixableIssues) {
            if (issue.autoFixAction) {
                try {
                    await issue.autoFixAction();
                    successCount++;
                    // Remove from list immediately to show progress
                    setIssues(prev => prev.filter(i => i.id !== issue.id));
                } catch (e) {
                    console.error(`Error fixing ${issue.id}:`, e);
                }
            }
        }

        setFixedCount(prev => prev + successCount);
        setToastInfo({ message: `${successCount} problemas corregidos exitosamente.`, type: 'success' });
        setIsFixingAll(false);
    };

    const filteredIssues = filterType === 'all' ? issues : issues.filter(i => i.type === filterType);
    const autoFixCount = issues.filter(i => i.action === 'auto-fix').length;

    const getSeverityStyles = (type: string) => {
        switch (type) {
            case 'critical': return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', text: 'text-red-700 dark:text-red-300', icon: 'report' };
            case 'warning': return { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', icon: 'warning' };
            case 'suggestion': return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: 'lightbulb' };
            default: return { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', icon: 'info' };
        }
    };

    return (
        <Card title="Inspector de Calidad de Datos" icon="health_and_safety" className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/30 dark:bg-indigo-900/10">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            {editingIssue && (
                <RecordEditModal 
                    isOpen={!!editingIssue}
                    onClose={() => setEditingIssue(null)}
                    record={{ ...editingIssue.recordData, id: editingIssue.recordId }} // Construct minimal record
                    tableConfig={MODAL_CONFIGS[editingIssue.table]}
                    onSave={(id, fields) => updateMutation.mutate({ table: editingIssue.table, id: id!, fields })}
                    isSaving={updateMutation.isPending}
                />
            )}

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4">
                <div className="text-sm text-slate-600 dark:text-slate-300 flex-grow">
                    <p className="mb-2">Escaneo profundo de integridad de base de datos:</p>
                    <div className="flex gap-2 text-xs">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Críticos (Duplicados)</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Advertencias</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500"></span> Sugerencias</span>
                    </div>
                </div>
                
                <div className="flex-shrink-0 flex gap-3">
                    {autoFixCount > 0 && (
                        <Button 
                            variant="secondary" 
                            icon="auto_fix_high"
                            onClick={handleFixAll}
                            isLoading={isFixingAll}
                            disabled={isScanning || isFixingAll}
                            className="bg-emerald-600 text-white hover:bg-emerald-700 border-transparent shadow-md"
                        >
                            {isFixingAll ? 'Corrigiendo...' : `Corregir Todo (${autoFixCount})`}
                        </Button>
                    )}
                    <Button 
                        variant="primary" 
                        icon="radar" 
                        onClick={runScan}
                        isLoading={isScanning}
                        disabled={isFixingAll}
                    >
                        {isScanning ? 'Analizando...' : 'Iniciar Escaneo Inteligente'}
                    </Button>
                </div>
            </div>

            {!isScanning && issues.length > 0 && (
                <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            {issues.length} Hallazgos
                        </h3>
                        <div className="flex gap-2">
                            {(['all', 'critical', 'warning', 'suggestion'] as const).map(ft => (
                                <button
                                    key={ft}
                                    onClick={() => setFilterType(ft)}
                                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${filterType === ft ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200'}`}
                                >
                                    {ft === 'all' ? 'Todos' : ft.charAt(0).toUpperCase() + ft.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                        {filteredIssues.map(issue => {
                            const styles = getSeverityStyles(issue.type);
                            const isFixable = issue.action === 'auto-fix';
                            return (
                                <div key={issue.id} className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:shadow-md ${styles.bg} ${styles.border}`}>
                                    <div className="flex-grow">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`material-icons !text-lg ${styles.text}`}>
                                                {styles.icon}
                                            </span>
                                            <span className={`text-sm font-bold ${styles.text}`}>
                                                {issue.title}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-300 dark:border-slate-600 px-1.5 rounded bg-white/50 dark:bg-black/20">
                                                {issue.table.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 ml-7">
                                            {issue.description}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => handleAction(issue)}
                                        disabled={isFixingAll}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-2 whitespace-nowrap disabled:opacity-50 ${
                                            issue.action === 'delete' 
                                                ? 'bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 dark:bg-slate-800 dark:border-rose-900 dark:text-rose-400' 
                                                : isFixable
                                                ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-md'
                                                : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200'
                                        }`}
                                    >
                                        <span className="material-icons !text-sm">
                                            {issue.action === 'delete' ? 'delete' : isFixable ? 'auto_fix_high' : 'edit'}
                                        </span>
                                        {issue.action === 'manual' ? 'Editar / Corregir' : isFixable ? 'Corregir Auto' : 'Eliminar'}
                                    </button>
                                </div>
                            );
                        })}
                        {filteredIssues.length === 0 && (
                            <p className="text-center text-slate-500 text-sm py-4 italic">No hay hallazgos en esta categoría.</p>
                        )}
                    </div>
                </div>
            )}

            {!isScanning && issues.length === 0 && fixedCount === 0 && (
                 <div className="mt-6 border-t border-slate-200 dark:border-slate-700 pt-6">
                     <EmptyState icon="check_circle" title="Base de Datos Saludable" message="No se encontraron irregularidades en el escaneo." />
                 </div>
            )}
        </Card>
    );
};

export default DataIntegrityTool;
