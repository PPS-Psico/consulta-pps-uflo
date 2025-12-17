
import React from 'react';

interface MobileSectionHeaderProps {
  title: React.ReactNode;
  description?: string;
}

const MobileSectionHeader: React.FC<MobileSectionHeaderProps> = ({ title, description }) => (
    <div className="relative p-6 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden bg-gradient-to-br from-blue-50/80 via-white/70 to-slate-50/80 dark:from-blue-900/30 dark:via-slate-900/20 dark:to-black/30 backdrop-blur-lg animate-fade-in-up group mb-6">
      {/* Decoraciones de fondo idénticas al Banner de Bienvenida */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-20 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>

      <div className="relative z-10 flex flex-col gap-3">
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">
            {title}
        </h2>
        {description && (
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
            {description}
            </p>
        )}
      </div>
    </div>
);

export default MobileSectionHeader;
