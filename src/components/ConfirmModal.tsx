import React from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'warning' | 'info' | 'danger';
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({ 
    isOpen, 
    title, 
    message, 
    onConfirm, 
    onClose, 
    confirmText = "Continuar", 
    cancelText = "Cancelar",
    type = 'warning'
}) => {
  if (!isOpen) return null;

  const colorClasses = {
      warning: { icon: 'text-amber-500', bgIcon: 'bg-amber-100 dark:bg-amber-900/30', button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500' },
      info: { icon: 'text-blue-500', bgIcon: 'bg-blue-100 dark:bg-blue-900/30', button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' },
      danger: { icon: 'text-red-500', bgIcon: 'bg-red-100 dark:bg-red-900/30', button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500' },
  };

  const styles = colorClasses[type];

  return (
    <div 
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-700 transform transition-all scale-100"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${styles.bgIcon}`}>
                <span className={`material-icons !text-2xl ${styles.icon}`}>{type === 'danger' ? 'error' : 'warning'}</span>
            </div>
            <div className="flex-grow">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{title}</h3>
                <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                    {message}
                </div>
            </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
            <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                {cancelText}
            </button>
            <button
                onClick={() => { onConfirm(); onClose(); }}
                className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800`}
            >
                {confirmText}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;