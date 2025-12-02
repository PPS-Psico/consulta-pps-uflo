
import React from 'react';

interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = React.memo(({ 
  value, 
  max, 
  size = 180, 
  strokeWidth = 16,
}) => {
  const percentage = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  const isComplete = percentage >= 100;

  // Increased padding to prevent glow clipping
  const padding = 60; 
  const svgSize = size + padding;
  const center = svgSize / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const progressGradientId = 'gradient-progress';
  const completeGradientId = 'gradient-complete';

  return (
    <div 
      className="relative flex flex-col items-center justify-center flex-shrink-0 group select-none mx-auto sm:mx-0" 
      style={{ width: svgSize, height: svgSize }} 
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Progreso total: ${Math.round(percentage)}% completado`}
    >
      {/* Glow effect container - positioned absolutely within padding area */}
      <div 
        className={`absolute inset-0 rounded-full transition-all duration-700 ${isComplete ? 'animate-pulse-glow-success' : ''}`} 
        style={{ margin: padding / 2, borderRadius: '50%' }}
      />
      
      <svg 
        className="w-full h-full transform -rotate-90 relative z-10 transition-transform duration-300 group-hover:scale-[1.02]"
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={progressGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-progress-from)" />
            <stop offset="100%" stopColor="var(--gradient-progress-to)" />
          </linearGradient>
          <linearGradient id={completeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-complete-from)" />
            <stop offset="100%" stopColor="var(--gradient-complete-to)" />
          </linearGradient>
          
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
             <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
             <feOffset dx="0" dy="3" result="offsetblur"/>
             <feFlood floodColor={isComplete ? "rgba(20, 184, 166, 0.3)" : "rgba(59, 130, 246, 0.3)"}/>
             <feComposite in2="offsetblur" operator="in"/>
             <feMerge>
                <feMergeNode/>
                <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>

        {/* Background Track */}
        <circle
          className="text-slate-200 dark:text-slate-700/50"
          stroke="currentColor"
          strokeWidth={strokeWidth - 4}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
        />

        {/* Value Circle */}
        <circle
          className="transition-all duration-1000 ease-out"
          stroke={`url(#${isComplete ? completeGradientId : progressGradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          r={radius}
          cx={center}
          cy={center}
          style={{ filter: 'url(#shadow)' }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20 pointer-events-none">
        <span className={`text-6xl font-black tracking-tighter drop-shadow-sm transition-colors duration-500 ${isComplete ? 'text-teal-600 dark:text-teal-400' : 'text-blue-600 dark:text-blue-400'}`}>
          {Math.round(percentage)}<span className="text-4xl opacity-60 relative -top-4">%</span>
        </span>
        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 tracking-wide">
          {Math.round(value)} / {max} hs
        </span>
      </div>
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';

export default ProgressCircle;
