
import React, { useState } from 'react';
import { useActivityFeed, ActivityItem } from '../hooks/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const ActivityItemCard: React.FC<{ item: ActivityItem }> = ({ item }) => {
    const navigate = useNavigate();
    const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true, locale: es });
    
    const isPending = item.rawStatus === 'Pendiente';

    // Configuración Visual según tipo
    const config = item.type === 'finalization' 
        ? {
            icon: 'school',
            borderClass: 'border-l-4 border-l-emerald-500',
            bgIcon: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400',
            actionText: 'Revisar Egreso',
            path: '/admin/solicitudes?tab=egreso'
        }
        : {
            icon: 'person_add_alt',
            borderClass: 'border-l-4 border-l-blue-500',
            bgIcon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400',
            actionText: 'Gestionar Ingreso',
            path: '/admin/solicitudes?tab=ingreso'
        };

    const handleAction = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(config.path);
    };

    return (
        <div 
            onClick={handleAction}
            className={`group relative bg-white dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer ${config.borderClass} ${item.isNew ? 'bg-slate-50 dark:bg-slate-800' : ''}`}
        >
            {/* New Badge */}
            {item.isNew && isPending && (
                <div className="absolute top-3 right-3 flex items-center gap-1 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    NUEVO
                </div>
            )}

            <div className="flex items-start gap-4">
                {/* Icon Avatar */}
                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${config.bgIcon} shadow-sm`}>
                    <span className="material-icons !text-xl">{config.icon}</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex flex-col">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate pr-14">
                            {item.user}
                        </h4>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                                {item.type === 'finalization' ? 'Solicita Acreditación' : 'Solicita PPS'}
                            </span>
                            <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                                {timeAgo}
                            </span>
                        </div>

                        {item.institution && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 px-2 py-1 rounded w-fit max-w-full">
                                <span className="material-icons !text-[12px] text-slate-400">business</span>
                                <span className="truncate font-medium">{item.institution}</span>
                            </div>
                        )}
                        
                        {!item.institution && item.description && (
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic line-clamp-1">{item.description}</p>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Hover Action Indicator */}
            <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                 <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                     {config.actionText} <span className="material-icons !text-sm">arrow_forward</span>
                 </span>
            </div>
        </div>
    );
};

const ActivityFeed: React.FC<{ isTestingMode?: boolean }> = ({ isTestingMode }) => {
    const { data: items, isLoading } = useActivityFeed(isTestingMode);
    const [filter, setFilter] = useState<'all' | 'pending'>('all');

    const filteredItems = React.useMemo(() => {
        if (!items) return [];
        if (filter === 'pending') {
            return items.filter(i => i.rawStatus === 'Pendiente');
        }
        return items;
    }, [items, filter]);

    const pendingCount = items?.filter(i => i.rawStatus === 'Pendiente').length || 0;

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/60 dark:border-slate-800 p-6 space-y-4 min-h-[400px]">
                <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-6"></div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-24 bg-slate-100 dark:bg-slate-800/50 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[450px]">
            
            {/* Header Moderno y Limpio */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#0F172A]">
                <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-icons text-indigo-500 !text-xl">notifications_active</span>
                        Solicitudes Recientes
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Ingresos y Egresos pendientes</p>
                </div>
                
                {/* Custom Segmented Control */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Todas
                    </button>
                    <button
                        onClick={() => setFilter('pending')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${filter === 'pending' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Pendientes
                        {pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[16px] text-center leading-none">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* List Container */}
            <div className="p-4 flex-grow bg-slate-50/50 dark:bg-[#0B1120]">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-1">
                    {filteredItems.length > 0 ? (
                        <div className="space-y-3">
                            {filteredItems.map((item) => (
                                <ActivityItemCard key={item.id} item={item} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full mb-3">
                                 <span className="material-icons text-slate-400 dark:text-slate-500 !text-4xl">inbox</span>
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-bold">Sin solicitudes nuevas</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-[200px]">
                                No hay movimientos {filter === 'pending' ? 'pendientes' : 'recientes'} que requieran atención.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityFeed;
