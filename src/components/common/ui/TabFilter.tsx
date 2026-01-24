// No React import needed for modern JSX transform

interface TabFilterProps {
    options: { label: string; value: string }[];
    value: string;
    onChange: (value: string) => void;
    className?: string; // Optional className for additional styling
}

/**
 * TabFilter Component (탭 필터 컴포넌트)
 * 
 * Provides a tab-style selection UI.
 * Used for filtering lists by status or category.
 */
export function TabFilter({ options, value, onChange, className = '' }: TabFilterProps) {
    return (
        <div className={`flex bg-slate-100 p-1 rounded-lg ${className} overflow-x-auto`}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={`
              flex-1 px-4 py-2 text-sm font-bold rounded-md transition-all whitespace-nowrap
              ${isActive
                                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }
            `}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
