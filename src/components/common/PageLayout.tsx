import React from 'react';

interface PageLayoutProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

// [수정] 'export default function' -> 'export function'
export function PageLayout({ title, actions, children }: PageLayoutProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      <div className="p-4 md:p-8 flex flex-col gap-4 mb-2 shrink-0 border-b bg-white/50 backdrop-blur-sm shadow-sm md:shadow-none md:border-none md:bg-transparent">
        <div className="flex justify-between items-center w-full">
          <h1 className="text-xl md:text-2xl font-bold text-slate-800">{title}</h1>
        </div>

        {actions && (
          <div className="flex flex-col sm:flex-row gap-2 w-full">
            {actions}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex flex-col min-h-0 px-4 pb-4 md:px-8 md:pb-8">
        {children}
      </div>
    </div>
  );
}