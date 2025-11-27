import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  isComplete: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, max, label, unit = '', isComplete }) => {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const roundedValue = Math.round(value);
  
  // Dynamic colors based on completion
  const colorClass = isComplete 
    ? 'bg-gradient-to-r from-emerald-400 to-teal-500' 
    : 'bg-gradient-to-r from-blue-500 to-indigo-600';
    
  const textClass = isComplete 
    ? 'text-emerald-600 dark:text-emerald-400' 
    : 'text-blue-600 dark:text-blue-400';

  return (
    <div className="w-full p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm">
      <div className="flex justify-between items-end mb-3">
        <div>
            <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Progreso Actual</span>
            <span className="text-base font-bold text-slate-800 dark:text-slate-100">{label}</span>
        </div>
        <div className="text-right">
          <span className={`text-2xl font-black ${textClass} tracking-tight`}>{roundedValue}</span>
          <span className="text-xs text-slate-400 font-medium ml-1">/ {max}{unit}</span>
        </div>
      </div>
      
      <div className="w-full bg-slate-100 dark:bg-slate-700/50 rounded-full h-3 overflow-hidden">
        <div
          className={`${colorClass} h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(59,130,246,0.3)]`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={max}
        />
      </div>
      
       {isComplete && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 py-1.5 px-3 rounded-lg w-fit animate-fade-in">
          <span className="material-icons !text-sm">verified</span>
          <span>¡Objetivo de horas cumplido!</span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;