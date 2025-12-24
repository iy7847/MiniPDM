import React from 'react';

interface PageLayoutProps {
  title: string;
  actions?: React.ReactNode; 
  children: React.ReactNode; 
}

// [수정] 'export default function' -> 'export function'
export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <div className="p-4 md:p-8 h-full flex flex-col bg-slate-50 overflow-hidden">
      <div className="flex flex-col gap-4 mb-6 shrink-0">
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        
        {actions && (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {actions}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0">
        {children}
      </div>
    </div>
  );
}