
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SmartInsight, PriorityLevel } from '../hooks/useSmartAnalysis';

interface SmartBriefingProps {
    status: PriorityLevel;
    summary: string;
    insights: SmartInsight[];
    score: number;
    userName: string;
    onRefresh?: () => void;
    isLoading?: boolean;
}

const TypewriterText: React.FC<{ text: string }> = ({ text }) => {
    const [displayedText, setDisplayedText] = useState('');
    const indexRef = useRef(0);
    
    useEffect(() => {
        setDisplayedText('');
        indexRef.current = 0;
        
        if (!text) return;

        const speed = 20; 
        
        const intervalId = setInterval(() => {
            if (indexRef.current < text.length) {
                const char = text.charAt(indexRef.current);
                setDisplayedText((prev) => prev + char);
                indexRef.current++;
            } else {
                clearInterval(intervalId);
            }
        }, speed);

        return () => clearInterval(intervalId);
    }, [text]);

    return <span>{displayedText}</span>;
};

const SmartBriefing: React.FC<SmartBriefingProps> = ({ status, summary, insights, score, userName, onRefresh, isLoading }) => {
    const [greeting, setGreeting] = useState('');
    const isAiAnalyzing = summary === "Analizando prioridades..." || isLoading;

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 20) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, []);

    // Definición de temas Adaptativos (Light/Dark)
    const themes = {
        critical: {
            container: 'bg-rose-50 border-rose-200 dark:bg-gradient-to-br dark:from-rose-900 dark:via-slate-900 dark:to-black dark:border-rose-500/50',
            glow: 'shadow-sm dark:shadow-[0_0_30px_-5px_rgba(225,29,72,0.3)]',
            iconColor: 'text-rose-600 dark:text-rose-400',
            textColor: 'text-rose-900 dark:text-rose-100',
            subText: 'text-rose-700 dark:text-rose-200/80',
            barBg: 'bg-rose-200 dark:bg-rose-900/30',
            barFill: 'bg-rose-600 dark:bg-rose-500',
            itemBg: 'bg-white dark:bg-white/5 border-rose-100 dark:border-white/5 hover:bg-rose-100 dark:hover:bg-white/10'
        },
        warning: {
            container: 'bg-amber-50 border-amber-200 dark:bg-gradient-to-br dark:from-amber-900 dark:via-slate-900 dark:to-black dark:border-amber-500/50',
            glow: 'shadow-sm dark:shadow-[0_0_30px_-5px_rgba(245,158,11,0.3)]',
            iconColor: 'text-amber-600 dark:text-amber-400',
            textColor: 'text-amber-900 dark:text-amber-100',
            subText: 'text-amber-700 dark:text-amber-200/80',
            barBg: 'bg-amber-200 dark:bg-amber-900/30',
            barFill: 'bg-amber-500',
            itemBg: 'bg-white dark:bg-white/5 border-amber-100 dark:border-white/5 hover:bg-amber-100 dark:hover:bg-white/10'
        },
        stable: {
            // Light: Blanco limpio con acentos dorados/negros | Dark: Negro Premium con acentos dorados
            container: 'bg-white border-slate-200 dark:bg-gradient-to-br dark:from-gray-900 dark:via-[#0F172A] dark:to-black dark:border-yellow-500/30',
            glow: 'shadow-md dark:shadow-[0_0_40px_-10px_rgba(234,179,8,0.15)]',
            iconColor: 'text-yellow-600 dark:text-yellow-400', // Dorado en ambos
            textColor: 'text-slate-800 dark:text-gray-100', // Negro en light, Blanco en dark
            subText: 'text-slate-500 dark:text-gray-400', 
            barBg: 'bg-slate-100 dark:bg-gray-800', 
            barFill: 'bg-yellow-500', // Barra dorada siempre
            itemBg: 'bg-slate-50 border-slate-200 hover:bg-slate-100 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10'
        },
        optimal: {
            container: 'bg-emerald-50 border-emerald-200 dark:bg-gradient-to-br dark:from-emerald-900 dark:via-slate-900 dark:to-black dark:border-emerald-500/50',
            glow: 'shadow-sm dark:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]',
            iconColor: 'text-emerald-600 dark:text-emerald-400',
            textColor: 'text-emerald-900 dark:text-emerald-100',
            subText: 'text-emerald-700 dark:text-emerald-200/80',
            barBg: 'bg-emerald-200 dark:bg-emerald-900/30',
            barFill: 'bg-emerald-600 dark:bg-emerald-500',
            itemBg: 'bg-white dark:bg-white/5 border-emerald-100 dark:border-white/5 hover:bg-emerald-100 dark:hover:bg-white/10'
        }
    };

    const theme = themes[status];

    return (
        <div className={`relative overflow-hidden rounded-2xl border ${theme.container} p-6 sm:p-8 ${theme.glow} transition-all duration-500`}>
            {/* Background Texture */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            
            {/* Abstract Light Leaks (Only Dark Mode usually visible, subtle in light) */}
            <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-current opacity-[0.03] dark:bg-white/5 dark:opacity-100 rounded-full blur-[100px] pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
                
                {/* Left: Summary & Score */}
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2.5 rounded-xl border backdrop-blur-md bg-white/50 border-black/5 dark:bg-white/5 dark:border-white/10">
                            <span className={`material-icons !text-2xl ${theme.iconColor}`}>
                                {status === 'optimal' ? 'auto_awesome' : status === 'critical' ? 'gpp_maybe' : 'smart_toy'}
                            </span>
                        </div>
                        <h2 className={`text-2xl font-bold tracking-tight ${theme.textColor}`}>
                            {greeting}, {userName.split(' ')[0]}.
                        </h2>
                    </div>
                    
                    <div className={`text-base font-normal leading-relaxed max-w-2xl min-h-[3.5rem] flex items-center ${theme.textColor} opacity-90`}>
                        {isAiAnalyzing ? (
                            <span className="flex items-center gap-2 animate-pulse text-sm uppercase tracking-wide font-medium opacity-70">
                                <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
                                Generando análisis...
                            </span>
                        ) : (
                            <TypewriterText text={summary} />
                        )}
                    </div>
                    
                    {/* System Health Bar & Actions */}
                    <div className="mt-8 flex items-center gap-5">
                        <div className="flex-grow max-w-xs">
                            <div className={`flex justify-between text-[10px] font-bold uppercase tracking-widest ${theme.subText} mb-2`}>
                                <span>Salud Operativa</span>
                                <span>{score}%</span>
                            </div>
                            <div className={`w-full h-1.5 ${theme.barBg} rounded-full overflow-hidden`}>
                                <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${theme.barFill} shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_10px_rgba(255,255,255,0.3)]`} 
                                    style={{ width: `${score}%` }}
                                ></div>
                            </div>
                        </div>
                        {onRefresh && (
                            <button 
                                onClick={onRefresh}
                                disabled={isAiAnalyzing}
                                className={`p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:text-white/50 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 transition-colors border border-transparent dark:border-white/5 ${isAiAnalyzing ? 'animate-spin' : ''}`}
                                title="Actualizar análisis"
                            >
                                <span className="material-icons !text-lg">refresh</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Right: Actionable Insights */}
                <div className="w-full lg:w-auto lg:min-w-[400px] space-y-3">
                    {insights.length > 0 ? (
                         insights.map((insight, idx) => (
                            <div 
                                key={idx} 
                                className={`flex items-center gap-4 rounded-xl p-3.5 transition-all duration-200 group border ${theme.itemBg}`}
                            >
                                <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center border bg-white dark:bg-black/40 border-slate-100 dark:border-white/5`}>
                                    <span className={`material-icons !text-xl ${theme.iconColor}`}>{insight.icon}</span>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className={`text-sm font-medium leading-snug ${theme.textColor} opacity-90 group-hover:opacity-100`}>
                                        {insight.message}
                                    </p>
                                </div>
                                {insight.actionLink && (
                                    <Link 
                                        to={insight.actionLink}
                                        className={`flex-shrink-0 text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-md transition-colors border ${theme.subText} hover:bg-black/5 dark:hover:bg-white/10 border-black/5 dark:border-white/10`}
                                    >
                                        {insight.actionLabel || 'Ver'}
                                    </Link>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center text-center p-6 rounded-xl border dashed border-dashed border-slate-300 dark:border-white/10 text-slate-400 dark:text-white/20">
                            <span className="material-icons !text-4xl mb-2">check_circle_outline</span>
                            <p className="text-sm font-medium">Todo en orden por ahora.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default SmartBriefing;
