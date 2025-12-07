
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import {
    TABLE_NAME_PPS,
    FIELD_ESTADO_PPS,
    TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_ESTADO_GESTION_LANZAMIENTOS,
    FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS,
    FIELD_NOTAS_GESTION_LANZAMIENTOS
} from '../constants';
import Card from './Card';
import Button from './Button';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';

const YearEndResetTool: React.FC = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleReset = async () => {
        setIsLoading(true);
        try {
            // 1. Archivar Solicitudes de PPS (Autogestión)
            // Archivamos todo lo que NO esté ya archivado.
            const { error: requestsError, count: requestsCount } = await supabase
                .from(TABLE_NAME_PPS)
                .update({ [FIELD_ESTADO_PPS]: 'Archivado' })
                .neq(FIELD_ESTADO_PPS, 'Archivado')
                .select('id', { count: 'exact' });

            if (requestsError) throw new Error(`Error archivando solicitudes: ${requestsError.message}`);

            // 2. Resetear Gestión de Lanzamientos
            // Volvemos todo a "Pendiente" y limpiamos fechas/notas para el nuevo ciclo.
            const { error: launchesError, count: launchesCount } = await supabase
                .from(TABLE_NAME_LANZAMIENTOS_PPS)
                .update({
                    [FIELD_ESTADO_GESTION_LANZAMIENTOS]: 'Pendiente de Gestión',
                    [FIELD_FECHA_RELANZAMIENTO_LANZAMIENTOS]: null,
                    [FIELD_NOTAS_GESTION_LANZAMIENTOS]: null
                })
                .neq(FIELD_ESTADO_GESTION_LANZAMIENTOS, 'Pendiente de Gestión') // Solo actualizamos lo que se tocó
                .select('id', { count: 'exact' });

            if (launchesError) throw new Error(`Error reseteando lanzamientos: ${launchesError.message}`);

            setToastInfo({
                message: `Ciclo reiniciado con éxito. ${requestsCount || 0} solicitudes archivadas y ${launchesCount || 0} gestiones reseteadas.`,
                type: 'success'
            });

        } catch (e: any) {
            console.error(e);
            setToastInfo({ message: e.message || 'Error desconocido al resetear.', type: 'error' });
        } finally {
            setIsLoading(false);
            setShowConfirm(false);
        }
    };

    return (
        <Card 
            title="Cierre de Ciclo Lectivo" 
            icon="update" 
            className="border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-900/10"
        >
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <ConfirmModal
                isOpen={showConfirm}
                title="⚠️ ¿Confirmar Reinicio Total?"
                message={`Estás a punto de preparar la base de datos para el 2026.\n\n1. Todas las Solicitudes de PPS activas se moverán a "Archivado".\n2. Toda la gestión de relanzamientos (confirmados, en charla, etc.) se borrará y volverá a "Pendiente".\n\nLas acreditaciones finalizadas NO se tocarán.\n\nEsta acción es irreversible.`}
                onConfirm={handleReset}
                onClose={() => setShowConfirm(false)}
                confirmText="Sí, Reiniciar Todo"
                type="danger"
            />

            <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4">
                <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
                    <p>
                        Utiliza esta herramienta al finalizar el año académico para limpiar el tablero de trabajo.
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Solicitudes:</strong> Se archivan masivamente (no se borran, solo se ocultan).</li>
                        <li><strong>Gestión 2026:</strong> Se limpian los estados de "Confirmado" y las fechas para empezar de cero.</li>
                    </ul>
                </div>
                
                <div className="flex-shrink-0">
                    <Button 
                        variant="danger" 
                        icon="restart_alt" 
                        onClick={() => setShowConfirm(true)}
                        isLoading={isLoading}
                    >
                        Ejecutar Cierre 2025
                    </Button>
                </div>
            </div>
        </Card>
    );
};

export default YearEndResetTool;
