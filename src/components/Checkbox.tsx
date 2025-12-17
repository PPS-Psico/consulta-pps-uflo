
import React from 'react';

interface CheckboxProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  value?: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: boolean;
  'aria-describedby'?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, name, checked, onChange, label, value, disabled = false, onBlur, error = false, 'aria-describedby': ariaDescribedby }) => {
  return (
    <label 
        htmlFor={id} 
        className={`
            flex items-center p-3 border-2 rounded-xl cursor-pointer transition-all duration-200 
            ${checked 
                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 dark:border-blue-500 shadow-sm' 
                : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-400'
            } 
            ${disabled ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-60' : ''} 
            ${error ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-900/20' : ''}
        `}
    >
      <div className="relative flex items-center">
        <input
            type="checkbox"
            id={id}
            name={name}
            value={value}
            checked={checked}
            onChange={onChange}
            disabled={disabled}
            onBlur={onBlur}
            aria-invalid={error}
            aria-describedby={ariaDescribedby}
            className="peer h-5 w-5 appearance-none rounded border-2 border-slate-400 dark:border-slate-400 bg-white dark:bg-slate-950 checked:bg-blue-600 dark:checked:bg-blue-500 checked:border-blue-600 dark:checked:border-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 dark:focus:ring-offset-slate-900 transition-all cursor-pointer disabled:cursor-not-allowed"
        />
        <span className="material-icons pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[16px] opacity-0 peer-checked:opacity-100 transition-opacity duration-200 font-bold">
            check
        </span>
      </div>
      <span className={`ml-3 text-sm font-medium ${checked ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-200'} ${disabled ? 'text-slate-500 dark:text-slate-400' : ''}`}>
          {label}
      </span>
    </label>
  );
};

export default Checkbox;
