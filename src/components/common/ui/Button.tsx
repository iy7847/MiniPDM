import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'success' | 'warning' | 'glass' | 'gradient';
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
    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed selection:bg-transparent shadow-sm hover:-translate-y-0.5 active:translate-y-0';

    const variants = {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-glow focus:ring-brand-500 border border-transparent',
        secondary: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 hover:border-slate-300 focus:ring-slate-400',
        danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50 hover:border-red-300 focus:ring-red-400',
        ghost: 'bg-transparent text-slate-600 hover:text-brand-700 hover:bg-brand-50 focus:ring-brand-300 shadow-none hover:shadow-none hover:translate-y-0',
        outline: 'bg-transparent text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-slate-400',
        success: 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-lg focus:ring-emerald-500 border border-transparent',
        warning: 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg focus:ring-amber-400 border border-transparent',
        // New Premium Variants
        glass: 'glass text-brand-900 hover:bg-white/80 border-white/40',
        gradient: 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white hover:from-brand-500 hover:to-indigo-500 hover:shadow-glow border-none',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-xs',
        md: 'px-5 py-2.5 text-sm',
        lg: 'px-6 py-3.5 text-base',
    };

    // Safe variant fallback
    const variantStyle = variants[variant as keyof typeof variants] || variants.primary;

    return (
        <button
            className={`${baseStyles} ${variantStyle} ${sizes[size]} ${className}`}
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
