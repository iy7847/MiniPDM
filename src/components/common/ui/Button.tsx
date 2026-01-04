import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning';
    size?: 'sm' | 'md' | 'lg';
    isLoading?: boolean;
    icon?: React.ReactNode;
}

export function Button({
    variant = 'primary',
    size = 'md',
    isLoading,
    icon,
    children,
    className = '',
    disabled,
    ...props
}: ButtonProps) {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed selection:bg-transparent';

    const variants = {
        primary: 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95 shadow-sm focus:ring-blue-500',
        secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 border border-slate-200 focus:ring-slate-400',
        danger: 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 active:scale-95 focus:ring-red-400',
        ghost: 'bg-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:ring-slate-300',
        outline: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 active:scale-95 focus:ring-slate-400',
        success: 'bg-green-600 text-white hover:bg-green-700 active:scale-95 shadow-sm focus:ring-green-500',
        warning: 'bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-100 active:scale-95 focus:ring-orange-400',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-3 text-base',
    };

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
            disabled={isLoading || disabled}
            {...props}
        >
            {isLoading ? (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            ) : icon ? (
                <span className="mr-2 flex items-center">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
