import React from 'react';

interface SectionProps {
    title?: React.ReactNode;
    description?: string;
    children: React.ReactNode;
    className?: string;
    rightElement?: React.ReactNode;
}

export function Section({ title, description, children, className = '', rightElement }: SectionProps) {
    return (
        <section className={`mb-8 ${className}`}>
            {(title || rightElement) && (
                <div className="flex justify-between items-end mb-3">
                    <div>
                        {title && (typeof title === 'string' ? <h2 className="text-lg font-bold text-slate-700">{title}</h2> : title)}
                        {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
                    </div>
                    {rightElement && <div>{rightElement}</div>}
                </div>
            )}
            {children}
        </section>
    );
}
