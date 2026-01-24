import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    className?: string;
    title?: string;
    actions?: React.ReactNode;
    noPadding?: boolean;
}

export function Card({ children, className = '', title, actions, noPadding = false, glass = false, ...props }: CardProps & { glass?: boolean }) {
    const baseClass = glass
        ? 'glass rounded-2xl border-white/40'
        : 'bg-white rounded-2xl shadow-soft border border-slate-100';

    return (
        <div className={`${baseClass} overflow-hidden transition-all duration-300 ${className}`} {...props}>
            {(title || actions) && (
                <div className={`px-6 py-5 flex justify-between items-center ${glass ? 'border-b border-white/20' : 'border-b border-slate-50 bg-slate-50/30'}`}>
                    {title && <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>}
                    {actions && <div className="flex gap-2">{actions}</div>}
                </div>
            )}
            <div className={noPadding ? '' : 'p-6'}>
                {children}
            </div>
        </div>
    );
}
