import React from 'react';
import { ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';

interface RotationTrackerProps {
  count: number;
  orientacionesUnicas: string[];
}

const RotationTracker: React.FC<RotationTrackerProps> = ({ count, orientacionesUnicas }) => {
  const total = ROTACION_OBJETIVO_ORIENTACIONES;
  const isComplete = count >= total;
  const activeColor = isComplete ? 'bg-emerald-500' : 'bg-blue-600';
  const activeTextColor = isComplete ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400';

  return (
    <div className="w-full p-5 bg-slate-50/50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/60 dark:border-slate-700/60">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isComplete ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
                <span className={`material-icons !text-lg ${activeTextColor}`}>autorenew</span>
            </div>
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Rotación
            </h4>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold">
          <span className={`text-xl ${activeTextColor}`}>{count}</span>
          <span className="text-slate-400 dark:text-slate-500">/ {total}</span>
        </div>
      </div>
      
      {/* Progress Bars Segmented */}
      <div className="flex gap-2 h-2.5">
        {[...Array(total)].map((_, i) => (
          <div key={i} className="flex-1 bg-white dark:bg-slate-700 rounded-full overflow-hidden border border-slate-200 dark:border-slate-600">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${i < count ? activeColor : 'opacity-0'}`}
              style={{ width: '100%' }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Áreas Cursadas</p>
          {orientacionesUnicas.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                  {orientacionesUnicas.map(o => (
                      <span key={o} className="text-xs font-medium px-2.5 py-1 rounded-md bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 shadow-sm">
                          {o}
                      </span>
                  ))}
              </div>
          ) : (
              <p className="text-xs text-slate-400 italic">Aún no has rotado por ninguna área.</p>
          )}
      </div>
    </div>
  );
};

export default RotationTracker;