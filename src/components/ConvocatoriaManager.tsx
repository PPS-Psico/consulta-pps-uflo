
import React, { useState, useMemo } from 'react';
import { useGestionConvocatorias } from '../hooks/useGestionConvocatorias';
import {
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  TABLE_NAME_LANZAMIENTOS_PPS
} from '../constants';
import { normalizeStringForComparison } from '../utils/formatters';
import Loader from './Loader';
import Toast from './Toast';
import EmptyState from './EmptyState';
import GestionCard from './GestionCard';
import CollapsibleSection from './CollapsibleSection';

const ITEMS_PER_PAGE = 9;

const Pagination: React.FC<{ currentPage: number; totalPages: number; onPageChange: (page: number) => void }> = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    return (
        <div className="flex justify-center items-center gap-4 mt-4">
            <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                <span className="material-icons !text-lg">chevron_left</span>
            </button>
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Página {currentPage} de {totalPages}
            </span>
            <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50">
                <span className="material-icons !text-lg">chevron_right</span>
            </button>
        </div>
    );
};

const PaginatedGrid: React.FC<{ items: any[]; renderItem: (item: any) => React.ReactNode }> = ({ items, renderItem }) => {
    const [currentPage, setCurrentPage] = useState(1);
    
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return items.slice(start, start + ITEMS_PER_PAGE);
    }, [items, currentPage]);
    
    // Reset page when items change drastically
    useMemo(() => {
         if (currentPage > totalPages && totalPages > 0) setCurrentPage(1);
    }, [totalPages, currentPage]);

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
                {paginatedItems.map(renderItem)}
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </>
    );
};

interface ConvocatoriaManagerProps {
  forcedOrientations?: string[];
  isTestingMode?: boolean;
}

const ConvocatoriaManager: React.FC<ConvocatoriaManagerProps> = ({ forcedOrientations, isTestingMode = false }) => {
    const {
        institutionsMap,
        loadingState,
        error,
        toastInfo,
        setToastInfo,
        updatingIds,
        searchTerm,
        setSearchTerm,
        isSyncing,
        isLinking,
        handleSave,
        handleUpdateInstitutionPhone,
        handleSync,
        handleLinkOrphans,
        filteredData,
    } = useGestionConvocatorias({ forcedOrientations, isTestingMode });

    if (loadingState === 'loading' || loadingState === 'initial') return <div className="flex justify-center p-10"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message={error} />;

    return (
        <div className="animate-fade-in-up space-y-8">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
             <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm sticky top-20 z-30 backdrop-blur-md bg-white/90 dark:bg-slate-800/90">
                 <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                     <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <span className="material-icons text-blue-600 dark:text-blue-400">tune</span>
                        Panel de Gestión
                     </h2>
                     <div className="relative w-full sm:w-80 group">
                        <input 
                            id="pps-filter" 
                            type="text" 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)} 
                            placeholder="Filtrar por nombre de PPS..." 
                            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-slate-50 dark:bg-slate-900 focus:border-blue-500 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm" 
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 group-focus-within:text-blue-500 transition-colors">search</span>
                     </div>
                 </div>
            </div>

             {filteredData.activasYPorFinalizar.length > 0 && (
                <PaginatedGrid 
                    items={filteredData.activasYPorFinalizar}
                    renderItem={(pps) => (
                        <GestionCard 
                            key={pps.id} 
                            pps={pps} 
                            onSave={handleSave} 
                            isUpdating={updatingIds.has(pps.id)} 
                            cardType="activasYPorFinalizar" 
                            institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                            onSavePhone={handleUpdateInstitutionPhone} 
                        />
                    )}
                />
            )}

            {filteredData.activasIndefinidas.length > 0 && (
                <CollapsibleSection 
                    title="Activas sin Fecha de Fin" 
                    count={filteredData.activasIndefinidas.length}
                    icon="hourglass_empty"
                    iconBgColor="bg-slate-200 dark:bg-slate-700"
                    iconColor="text-slate-600 dark:text-slate-300"
                    borderColor="border-slate-300 dark:border-slate-600"
                >
                     <PaginatedGrid 
                        items={filteredData.activasIndefinidas}
                        renderItem={(pps) => (
                            <GestionCard 
                                key={pps.id} 
                                pps={pps} 
                                onSave={handleSave} 
                                isUpdating={updatingIds.has(pps.id)} 
                                cardType="activasIndefinidas" 
                                institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                                onSavePhone={handleUpdateInstitutionPhone} 
                            />
                        )}
                    />
                </CollapsibleSection>
            )}

             {filteredData.relanzamientosConfirmados.length > 0 && (
                <CollapsibleSection 
                    title="Relanzamientos Confirmados" 
                    count={filteredData.relanzamientosConfirmados.length}
                    icon="flight_takeoff"
                    iconBgColor="bg-indigo-100 dark:bg-indigo-900/50"
                    iconColor="text-indigo-600 dark:text-indigo-300"
                    borderColor="border-indigo-300 dark:border-indigo-600"
                >
                    <PaginatedGrid 
                        items={filteredData.relanzamientosConfirmados}
                        renderItem={(pps) => (
                            <GestionCard 
                                key={pps.id} 
                                pps={pps} 
                                onSave={handleSave} 
                                isUpdating={updatingIds.has(pps.id)} 
                                cardType="relanzamientosConfirmados" 
                                institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                                onSavePhone={handleUpdateInstitutionPhone} 
                            />
                        )}
                    />
                </CollapsibleSection>
            )}

            {filteredData.finalizadasParaReactivar.length > 0 && (
                <CollapsibleSection 
                    title="Finalizadas (Para Reactivar)" 
                    count={filteredData.finalizadasParaReactivar.length}
                    icon="history"
                    iconBgColor="bg-slate-100 dark:bg-slate-800"
                    iconColor="text-slate-500 dark:text-slate-400"
                    borderColor="border-slate-300 dark:border-slate-700"
                    defaultOpen={false}
                >
                    <PaginatedGrid 
                        items={filteredData.finalizadasParaReactivar}
                        renderItem={(pps) => (
                            <GestionCard 
                                key={pps.id} 
                                pps={pps} 
                                onSave={handleSave} 
                                isUpdating={updatingIds.has(pps.id)} 
                                cardType="finalizadasParaReactivar" 
                                institution={institutionsMap.get(normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''))} 
                                onSavePhone={handleUpdateInstitutionPhone} 
                            />
                        )}
                    />
                </CollapsibleSection>
            )}

             <CollapsibleSection 
                title="Acciones Avanzadas" 
                count={2}
                icon="build_circle"
                iconBgColor="bg-rose-100 dark:bg-rose-900/50"
                iconColor="text-rose-600 dark:text-rose-300"
                borderColor="border-rose-300 dark:border-rose-600"
                defaultOpen={true}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                    {/* Sync Tool */}
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-icons text-rose-500">history</span>
                                Sincronizar Prácticas Antiguas
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                Crea registros de "Lanzamiento" para prácticas de los últimos 2 años que no lo tengan, basándose en el nombre de la institución.
                            </p>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || isTestingMode}
                            className="mt-auto w-full bg-rose-50 text-rose-700 font-bold py-2.5 px-4 rounded-lg text-sm border border-rose-200 hover:bg-rose-100 hover:border-rose-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-icons !text-lg">{isSyncing ? 'sync' : 'play_arrow'}</span>
                            <span>{isSyncing ? 'Sincronizando...' : 'Ejecutar Sincronización'}</span>
                        </button>
                    </div>

                    {/* Link Tool */}
                    <div className="p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col gap-4">
                        <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                <span className="material-icons text-blue-500">link</span>
                                Vincular Prácticas Huérfanas
                            </h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                Busca prácticas sin ID de lanzamiento y las conecta automáticamente si el Nombre y la Fecha coinciden con un lanzamiento existente.
                            </p>
                        </div>
                        <button
                            onClick={handleLinkOrphans}
                            disabled={isLinking || isTestingMode}
                            className="mt-auto w-full bg-blue-50 text-blue-700 font-bold py-2.5 px-4 rounded-lg text-sm border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <span className="material-icons !text-lg">{isLinking ? 'autorenew' : 'play_arrow'}</span>
                            <span>{isLinking ? 'Vinculando...' : 'Ejecutar Vinculación'}</span>
                        </button>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
};

export default ConvocatoriaManager;
