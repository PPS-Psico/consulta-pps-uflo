
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { SmartInsight, PriorityLevel } from '../hooks/useSmartAnalysis';

interface SmartBriefingProps {
    status: PriorityLevel;
    summary: string;
    insights: SmartInsight[];
    score: number;
    userName: string;
}

const SmartBriefing: React.FC<SmartBriefingProps> = ({ status, summary, insights, score, userName }) => {
    const [greeting, setGreeting] = useState('');

    useEffect(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting('Buenos días');
        else if (hour < 20) setGreeting('Buenas tardes');
        else setGreeting('Buenas noches');
    }, []);

    // Configuración de Tema según Estado
    const getThemeColors = (s: PriorityLevel) => {
        switch (s) {
            case 'critical': 
                return { 
                    text: 'text-rose-600 dark:text-rose-400', 
                    ringColor: 'text-rose-500',
                    gradientFrom: '#f43f5e', // rose-500
                    gradientTo: '#fb923c',   // orange-400
                    bgGlow: 'from-rose-500/10 dark:from-rose-500/20',
                    cardAction: 'bg-rose-50 border-rose-100 dark:bg-rose-950/40 dark:border-rose-900/60'
                };
            case 'warning': 
                return { 
                    text: 'text-amber-600 dark:text-amber-400', 
                    ringColor: 'text-amber-500',
                    gradientFrom: '#f59e0b', // amber-500
                    gradientTo: '#facc15',   // yellow-400
                    bgGlow: 'from-amber-500/10 dark:from-amber-500/20',
                    cardAction: 'bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                };
            default: // stable/optimal
                return { 
                    text: 'text-emerald-600 dark:text-emerald-400', 
                    ringColor: 'text-emerald-500',
                    gradientFrom: '#10b981', // emerald-500
                    gradientTo: '#3b82f6',   // blue-500
                    bgGlow: 'from-blue-500/10 dark:from-blue-500/20',
                    cardAction: 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
                };
        }
    };

    const theme = getThemeColors(status);

    // Cálculos para el Anillo SVG
    const radius = 38;
    const stroke = 6;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
        <div className="relative w-full overflow-hidden rounded-[2rem] bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none animate-fade-in-up transition-colors duration-300">
            
            {/* Ambient Background Glow */}
            <div className={`absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br ${theme.bgGlow} via-transparent to-transparent rounded-full blur-3xl opacity-60 dark:opacity-40 pointer-events-none`}></div>

            <div className="relative z-10 p-6 sm:p-10 flex flex-col lg:flex-row gap-8 items-center lg:items-stretch">
                
                {/* LEFT: Text Content */}
                <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm text-blue-600 dark:text-blue-400">
                            <span className="material-icons !text-base">smart_toy</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                            {greeting}, {userName.split(' ')[0]}.
                        </h2>
                    </div>
                    
                    <p className="text-lg text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-2xl">
                        {summary}
                    </p>

                    <div className="mt-5 flex items-center justify-center lg:justify-start gap-2.5">
                         <span className={`flex h-2.5 w-2.5 relative`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                         </span>
                         <span className={`text-xs font-bold uppercase tracking-wider ${status === 'critical' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                             Sistema {status === 'critical' ? 'Requiere Atención' : 'Operativo'}
                         </span>
                    </div>
                </div>

                {/* RIGHT: Operational Health Widget (Removed Box Container) */}
                <div className="flex-none flex flex-col sm:flex-row items-center gap-8 pl-0 lg:pl-8">
                    
                    {/* Health Ring */}
                    <div className="relative flex items-center justify-center">
                        <svg
                            height={radius * 2}
                            width={radius * 2}
                            className="transform -rotate-90"
                        >
                            <defs>
                                <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor={theme.gradientFrom} />
                                    <stop offset="100%" stopColor={theme.gradientTo} />
                                </linearGradient>
                            </defs>
                            {/* Track - Light gray in light mode, Dark gray in dark mode */}
                            <circle
                                className="stroke-slate-100 dark:stroke-slate-800"
                                strokeWidth={stroke}
                                fill="transparent"
                                r={normalizedRadius}
                                cx={radius}
                                cy={radius}
                            />
                            {/* Progress */}
                            <circle
                                stroke="url(#healthGradient)"
                                strokeWidth={stroke}
                                strokeDasharray={circumference + ' ' + circumference}
                                style={{ strokeDashoffset, transition: 'stroke-dashoffset 1s ease-in-out' }}
                                strokeLinecap="round"
                                fill="transparent"
                                r={normalizedRadius}
                                cx={radius}
                                cy={radius}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{score}%</span>
                        </div>
                        
                        <div className="absolute -bottom-6 w-full text-center">
                            <span className="text-[9px] font-bold uppercase text-slate-400 dark:text-slate-500 tracking-wider">Salud</span>
                        </div>
                    </div>

                    {/* Separator (Desktop) */}
                    <div className="hidden sm:block w-px h-20 bg-slate-200 dark:bg-slate-700/50"></div>

                    {/* Action Area */}
                    <div className="flex flex-col justify-center min-w-[220px]">
                        {insights.length > 0 ? (
                            <>
                                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 uppercase tracking-wide">Acción Prioritaria</p>
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors shadow-sm ${theme.cardAction}`}>
                                    <span className={`material-icons !text-lg ${insights[0].type === 'critical' ? 'text-rose-500' : 'text-blue-500 dark:text-blue-400'}`}>
                                        {insights[0].icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium line-clamp-2 leading-tight mb-1.5">
                                            {insights[0].message}
                                        </p>
                                        {insights[0].actionLink && (
                                            <Link 
                                                to={insights[0].actionLink}
                                                className={`text-[10px] font-bold uppercase tracking-wide hover:underline ${theme.text}`}
                                            >
                                                {insights[0].actionLabel || 'REVISAR'} &rarr;
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                             <div className="text-center sm:text-left py-2">
                                <p className="text-sm text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 justify-center sm:justify-start">
                                    <span className="material-icons !text-lg">check_circle</span>
                                    Todo en orden
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-0.5">No hay alertas críticas pendientes.</p>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Bottom Color Line */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${status === 'critical' ? 'rose' : 'emerald'}-400 to-transparent opacity-60`}></div>
        </div>
    );
};

export default SmartBriefing;
