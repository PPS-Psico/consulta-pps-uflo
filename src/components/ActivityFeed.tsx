
import React, { useState } from 'react';
import { useActivityFeed, ActivityItem } from '../hooks/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

const ActivityItemRow: React.FC<{ item: ActivityItem; isLast: boolean }> = ({ item, isLast }) => {
    const navigate = useNavigate();
    const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true, locale: es });
    
    // Logic specific for Requests
    const isRequest = item.type === 'request';
    const isPending = isRequest && item.rawStatus === 'Pendiente';
    
    // Icon Configuration
    const config = {
        enrollment: { icon: 'rocket_launch', bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-50 dark:ring-blue-900' },
        request: isPending 
            ? { icon: 'priority_high', bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-50 dark:ring-amber-900 animate-pulse' }
            : { icon: 'work_history', bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', ring: 'ring-indigo-50 dark:ring-indigo-900' },
        finalization: { icon: 'verified', bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-50 dark:ring-emerald-900' },
    }[item.type];

    const handleAction = () => {
        if (item.type === 'request') navigate('/admin/solicitudes?tab=ingreso');
        if (item.type === 'finalization') navigate('/admin/solicitudes?tab=egreso');
        if (item.type === 'enrollment') navigate('/admin/lanzador');
    };

    return (
        <div className="relative pl-6 pb-6 last:pb-0 group">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-700/50 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors"></div>
            )}
            
            {/* Timeline Dot/Icon */}
            <div className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 border-white dark:border-slate-900 ${config.bg} ${config.text} flex items-center justify-center z-10 shadow-sm ring-2 ${config.ring}`}>
                <span className="material-icons !text-[12px] font-bold">{config.icon}</span>
            </div>

            {/* Content Container */}
            <div className="ml-4 flex flex-col sm:flex-row sm:items-start justify-between gap-2 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-default border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${config.text}`}>
                            {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">• {timeAgo}</span>
                    </div>
                    
                    <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm truncate">
                            {item.user}
                        </span>
                        {item.institution && (
                            <div className="flex items-center gap-1 mt-0.5">
                                <span className="material-icons !text-[12px] text-slate-400">business</span>
                                <span className="text-xs text-slate-600 dark:text-slate-300 font-medium truncate max-w-[200px] sm:max-w-xs">
                                    {item.institution}
                                </span>
                            </div>
                        )}
                        {!item.institution && (
                             <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{item.description}</p>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                <div className="flex-shrink-0 self-start sm:self-center">
                    {isPending ? (
                        <button 
                            onClick={handleAction}
                            className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-full shadow-sm hover:shadow transition-all flex items-center gap-1 transform hover:-translate-y-0.5"
                        >
                            <span className="material-icons !text-[12px]">edit</span>
                            Gestionar
                        </button>
                    ) : item.type === 'request' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700">
                             <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                             En Gestión
                        </span>
                    ) : (
                         <button 
                            onClick={handleAction}
                            className="p-1.5 text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-colors"
                            title="Ver detalle"
                        >
                            <span className="material-icons !text-lg">chevron_right</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const ActivityFeed: React.FC<{ isTestingMode?: boolean }> = ({ isTestingMode }) => {
    const { data: items, isLoading } = useActivityFeed(isTestingMode);
    const [filter, setFilter] = useState<'all' | 'requests'>('all');

    const filteredItems = React.useMemo(() => {
        if (!items) return [];
        if (filter === 'requests') {
            return items.filter(i => i.type === 'request' && i.rawStatus === 'Pendiente');
        }
        return items;
    }, [items, filter]);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-6 space-y-6 min-h-[400px]">
                <div className="flex justify-between items-center mb-6">
                    <div className="h-6 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"></div>
                </div>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className="flex gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 flex-shrink-0 animate-pulse"></div>
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 animate-pulse"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 animate-pulse"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4 border border-slate-100 dark:border-slate-700">
                     <span className="material-icons text-slate-300 dark:text-slate-500 !text-3xl">history_toggle_off</span>
                </div>
                <h4 className="text-slate-800 dark:text-slate-200 font-bold text-lg">Sin actividad reciente</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 max-w-xs">No hay movimientos nuevos en las últimas horas.</p>
            </div>
        );
    }

    const pendingCount = items.filter(i => i.type === 'request' && i.rawStatus === 'Pendiente').length;

    return (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full min-h-[450px]">
            
            {/* Header Moderno */}
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-900/50">
                <div>
                    <h3 className="font-black text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-icons text-blue-500 !text-xl">history</span>
                        Actividad Reciente
                    </h3>
                </div>
                
                {/* Custom Segmented Control */}
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700/50">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Todo
                    </button>
                    <button
                        onClick={() => setFilter('requests')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${filter === 'requests' ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm ring-1 ring-black/5' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        Pendientes
                        {pendingCount > 0 && (
                            <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center leading-none">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="p-6 flex-grow bg-white dark:bg-[#0F172A]">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2 -ml-2 pl-2">
                    {filteredItems.length > 0 ? (
                        <div className="space-y-1">
                            {filteredItems.map((item, index) => (
                                <ActivityItemRow 
                                    key={item.id} 
                                    item={item} 
                                    isLast={index === filteredItems.length - 1} 
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-16 text-center opacity-60">
                            <span className="material-icons text-slate-300 dark:text-slate-600 !text-5xl mb-2">done_all</span>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">¡Estás al día!</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">No hay pendientes en esta categoría.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Footer gradient fade */}
            <div className="h-4 bg-gradient-to-t from-white dark:from-[#0F172A] to-transparent pointer-events-none -mt-4 relative z-10"></div>
        </div>
    );
};

export default ActivityFeed;
