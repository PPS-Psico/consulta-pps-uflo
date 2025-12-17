
import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  className?: string;
  action?: React.ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, className = '', action }) => {
  return (
    <div className={`text-center py-12 px-6 bg-white dark:bg-slate-900 rounded-2xl mt-2 border border-gray-200/60 dark:border-gray-800 shadow-sm ${className}`}>
      <div className="mx-auto bg-primary-100 dark:bg-primary-900/30 text-primary-500 dark:text-primary-400 rounded-full h-16 w-16 flex items-center justify-center animate-[subtle-bob_3s_ease-in-out_infinite]">
        <span className="material-icons !text-4xl">{icon}</span>
      </div>
      <h3 className="mt-6 font-extrabold text-gray-800 dark:text-gray-100 text-xl tracking-tight">{title}</h3>
      <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mt-2 max-w-md mx-auto leading-relaxed">
        {message}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default EmptyState;
