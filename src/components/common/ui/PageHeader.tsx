import React from 'react';

interface PageHeaderProps {
    title: React.ReactNode;
    description?: string;
    actions?: React.ReactNode;
    onBack?: () => void;
    breadcrumbs?: { label: string; onClick?: () => void }[];
}

export function PageHeader({ title, description, actions, onBack, breadcrumbs }: PageHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
            <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="p-1 -ml-1 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
                            title="Go Back"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    )}
                    {breadcrumbs && (
                        <div className="flex items-center text-xs font-bold text-slate-400">
                            {breadcrumbs.map((crumb, i) => (
                                <React.Fragment key={i}>
                                    {i > 0 && <span className="mx-2">/</span>}
                                    <button
                                        onClick={crumb.onClick}
                                        disabled={!crumb.onClick}
                                        className={crumb.onClick ? 'hover:text-blue-600 hover:underline' : 'cursor-default'}
                                    >
                                        {crumb.label}
                                    </button>
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>
                <div className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    {title}
                </div>
                {description && <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>}
            </div>

            {actions && (
                <div className="flex items-center gap-2 flex-wrap">
                    {actions}
                </div>
            )}
        </div>
    );
}
