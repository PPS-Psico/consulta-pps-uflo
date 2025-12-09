
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: string;
  wrapperClassName?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, type, value, onChange, placeholder, icon, disabled = false, className = '', wrapperClassName = '', ...props }, ref) => (
    <div className={`relative group ${wrapperClassName}`}>
      {icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 text-slate-400 group-focus-within:text-slate-800 dark:group-focus-within:text-white">
          <span className="material-icons !text-lg">{icon}</span>
        </div>
      )}
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        ref={ref}
        className={`
            w-full rounded-xl border-2 border-slate-200 dark:border-slate-700 
            py-3.5 pr-4 text-sm font-medium text-slate-900 dark:text-white 
            bg-white dark:bg-slate-900/50 
            shadow-sm transition-all duration-200 ease-out
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            focus:border-slate-800 dark:focus:border-white 
            focus:ring-4 focus:ring-slate-200 dark:focus:ring-slate-700/50 
            focus:outline-none 
            disabled:bg-slate-50 dark:disabled:bg-slate-800/50 disabled:opacity-70
            ${icon ? 'pl-11' : 'pl-4'} 
            ${className}
        `}
        placeholder={placeholder}
        {...props}
      />
    </div>
  )
);

Input.displayName = 'Input';
export default Input;
