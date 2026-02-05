import React, { useState } from 'react';
import { Sidebar } from '../components/layout/Sidebar';
import { GuideDrawer } from '../components/common/Guide/GuideDrawer';
import { GuideProvider, useGuide } from '../contexts/GuideContext';

interface MainLayoutProps {
    children: React.ReactNode;
    currentPage: string;
    onNavigate: (page: string) => void;
    onLogout: () => void;
    title?: string; // Optional override for header title
}

export function MainLayout(props: MainLayoutProps) {
    return (
        <GuideProvider>
            <MainLayoutContent {...props} />
        </GuideProvider>
    );
}

function MainLayoutContent({ children, currentPage, onNavigate, onLogout, title }: MainLayoutProps) {
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { isOpen, closeGuide } = useGuide();

    React.useEffect(() => {
        if (title) {
            document.title = `${title} - MiniPDM`;
        }
    }, [title]);

    return (
        <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
            {/* Sidebar */}
            <Sidebar
                currentPage={currentPage}
                onNavigate={(page) => {
                    onNavigate(page);
                    // On mobile, auto-close sidebar
                    if (window.innerWidth < 768) {
                        setIsSidebarCollapsed(true);
                    }
                }}
                onLogout={onLogout}
                isCollapsed={isSidebarCollapsed}
                onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-gradient-to-br from-brand-50/50 to-slate-100/50">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between px-4 h-16 bg-white/80 backdrop-blur-md border-b border-white/20 shrink-0 z-20 shadow-sm">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsSidebarCollapsed(false)}
                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <span className="font-black text-slate-800 text-lg tracking-tight">MiniPDM</span>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>

                {/* Guide Drawer */}
                <GuideDrawer
                    isOpen={isOpen}
                    onClose={closeGuide}
                    pageKey={currentPage}
                />
            </div>
        </div>
    );
}
