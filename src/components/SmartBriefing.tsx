
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
                    text: 'text-rose-400', 
                    ringColor: 'text-rose-500',
                    gradientFrom: '#f43f5e', // rose-500
                    gradientTo: '#fb923c',   // orange-400
                    bgGlow: 'from-rose-500/20'
                };
            case 'warning': 
                return { 
                    text: 'text-amber-400', 
                    ringColor: 'text-amber-500',
                    gradientFrom: '#f59e0b', // amber-500
                    gradientTo: '#facc15',   // yellow-400
                    bgGlow: 'from-amber-500/20'
                };
            default: // stable/optimal
                return { 
                    text: 'text-emerald-400', 
                    ringColor: 'text-emerald-500',
                    gradientFrom: '#10b981', // emerald-500
                    gradientTo: '#3b82f6',   // blue-500
                    bgGlow: 'from-blue-500/20'
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
        <div className="relative w-full overflow-hidden rounded-3xl bg-[#0F172A] border border-slate-800 shadow-2xl animate-fade-in-up">
            
            {/* Ambient Background Glow */}
            <div className={`absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br ${theme.bgGlow} via-transparent to-transparent rounded-full blur-3xl opacity-40 pointer-events-none`}></div>

            <div className="relative z-10 p-6 sm:p-8 flex flex-col lg:flex-row gap-8 items-center lg:items-stretch">
                
                {/* LEFT: Text Content */}
                <div className="flex-1 flex flex-col justify-center text-center lg:text-left">
                    <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center shadow-inner">
                            <span className="material-icons text-slate-300 !text-base">smart_toy</span>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">
                            {greeting}, {userName.split(' ')[0]}.
                        </h2>
                    </div>
                    
                    <p className="text-lg text-slate-300 font-medium leading-relaxed max-w-2xl">
                        {summary}
                    </p>

                    <div className="mt-4 flex items-center justify-center lg:justify-start gap-2">
                         <span className={`flex h-2.5 w-2.5 relative`}>
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${status === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${status === 'critical' ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                         </span>
                         <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                             Sistema {status === 'critical' ? 'Requiere Atención' : 'Operativo'}
                         </span>
                    </div>
                </div>

                {/* RIGHT: Operational Health Widget */}
                <div className="flex-none flex flex-col sm:flex-row items-center gap-6 bg-slate-900/50 rounded-2xl p-4 border border-slate-800/60 backdrop-blur-sm">
                    
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
                            {/* Track */}
                            <circle
                                stroke="#1e293b"
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
                            <span className="text-2xl font-black text-white leading-none">{score}%</span>
                        </div>
                        
                        <div className="absolute -bottom-6 w-full text-center">
                            <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Salud</span>
                        </div>
                    </div>

                    {/* Separator (Desktop) */}
                    <div className="hidden sm:block w-px h-16 bg-slate-800"></div>

                    {/* Action Area */}
                    <div className="flex flex-col justify-center min-w-[200px]">
                        {insights.length > 0 ? (
                            <>
                                <p className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">Acción Prioritaria</p>
                                <div className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${insights[0].type === 'critical' ? 'bg-rose-950/40 border-rose-900/60' : 'bg-slate-800 border-slate-700'}`}>
                                    <span className={`material-icons !text-lg ${insights[0].type === 'critical' ? 'text-rose-400' : 'text-blue-400'}`}>
                                        {insights[0].icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[11px] text-slate-300 line-clamp-2 leading-tight mb-1.5">
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
                             <div className="text-center sm:text-left">
                                <p className="text-sm text-emerald-400 font-medium flex items-center gap-1">
                                    <span className="material-icons !text-base">check_circle</span>
                                    Todo en orden
                                </p>
                                <p className="text-xs text-slate-500 mt-1">No hay alertas críticas.</p>
                             </div>
                        )}
                    </div>
                </div>
            </div>
            
            {/* Bottom Color Line */}
            <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${status === 'critical' ? 'rose' : 'emerald'}-500 to-transparent opacity-50`}></div>
        </div>
    );
};

export default SmartBriefing;
