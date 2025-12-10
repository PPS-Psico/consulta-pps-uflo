
import React from 'react';
import { useActivityFeed, ActivityItem } from '../hooks/useActivityFeed';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

const ActivityItemRow: React.FC<{ item: ActivityItem; isLast: boolean }> = ({ item, isLast }) => {
    const timeAgo = formatDistanceToNow(item.timestamp, { addSuffix: true, locale: es });
    
    const icons = {
        enrollment: 'how_to_reg',
        request: 'assignment_add',
        finalization: 'verified'
    };

    const styles = {
        blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
        purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
        emerald: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800' },
        amber: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800' },
    };

    const currentStyle = styles[item.statusColor];

    return (
        <div className="relative pl-8 sm:pl-10 py-2 group">
            {/* Timeline Line */}
            {!isLast && (
                <div className="absolute left-[19px] sm:left-[23px] top-10 bottom-0 w-px bg-slate-200 dark:bg-slate-700 group-hover:bg-slate-300 dark:group-hover:bg-slate-600 transition-colors"></div>
            )}
            
            {/* Timeline Dot/Icon */}
            <div className={`absolute left-0 top-3 w-10 h-10 sm:w-12 sm:h-12 rounded-full border-4 border-white dark:border-slate-900 ${currentStyle.bg} flex items-center justify-center z-10 shadow-sm`}>
                <span className={`material-icons !text-lg sm:!text-xl ${currentStyle.text}`}>{icons[item.type]}</span>
            </div>

            {/* Content Card */}
            <div className="bg-white dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-600 transition-all duration-200 ml-3 sm:ml-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 mb-1">
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${currentStyle.bg} ${currentStyle.text}`}>
                            {item.title}
                        </span>
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">• {timeAgo}</span>
                    </div>
                </div>
                
                <div className="mt-1.5">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {item.user}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-0.5">
                        {item.description}
                    </p>
                </div>
            </div>
        </div>
    );
};

const ActivityFeed: React.FC<{ isTestingMode?: boolean }> = ({ isTestingMode }) => {
    const { data: items, isLoading } = useActivityFeed(isTestingMode);

    if (isLoading) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 space-y-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="flex gap-4 animate-pulse">
                        <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full flex-shrink-0"></div>
                        <div className="flex-1 space-y-2 py-1">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (!items || items.length === 0) {
        return (
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                     <span className="material-icons text-slate-300 dark:text-slate-500 !text-3xl">history_toggle_off</span>
                </div>
                <h4 className="text-slate-900 dark:text-white font-bold text-lg">Sin actividad reciente</h4>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Los movimientos de los estudiantes aparecerán aquí.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="p-6 pb-2 border-b border-slate-100 dark:border-slate-800/60 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900/50">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                    <span className="material-icons text-blue-500">history</span>
                    Actividad Reciente en el Sistema
                </h3>
            </div>
            <div className="p-6">
                <div className="max-h-[600px] overflow-y-auto custom-scrollbar pr-2 -ml-2 pl-2">
                    {items.map((item, index) => (
                        <ActivityItemRow 
                            key={item.id} 
                            item={item} 
                            isLast={index === items.length - 1} 
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ActivityFeed;
