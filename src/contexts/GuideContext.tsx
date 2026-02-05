import React, { createContext, useContext, useState } from 'react';

interface GuideContextType {
    isOpen: boolean;
    openGuide: () => void;
    closeGuide: () => void;
    toggleGuide: () => void;
}

const GuideContext = createContext<GuideContextType | undefined>(undefined);

export function GuideProvider({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);

    const openGuide = () => setIsOpen(true);
    const closeGuide = () => setIsOpen(false);
    const toggleGuide = () => setIsOpen((prev) => !prev);

    return (
        <GuideContext.Provider value={{ isOpen, openGuide, closeGuide, toggleGuide }}>
            {children}
        </GuideContext.Provider>
    );
}

export function useGuide() {
    const context = useContext(GuideContext);
    if (context === undefined) {
        throw new Error('useGuide must be used within a GuideProvider');
    }
    return context;
}
