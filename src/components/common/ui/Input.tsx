import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, helperText, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-xs font-bold text-slate-500 mb-1.5 ml-0.5">
                        {label}
                    </label>
                )}
                <input
                    ref={ref}
                    className={`
            w-full px-3 py-2 bg-white border rounded-lg text-sm font-medium
            placeholder:text-slate-400
            focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500
            disabled:bg-slate-50 disabled:text-slate-500
            transition-colors
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-200' : 'border-slate-300 hover:border-slate-400'}
            ${className}
          `}
                    {...props}
                />
                {error && <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>}
                {helperText && !error && <p className="mt-1 text-xs text-slate-400">{helperText}</p>}
            </div>
        );
    }
);
