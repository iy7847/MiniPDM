import { useState, useEffect, useRef } from 'react';

type Option = {
    label: string;
    value: string;
};

interface MultiSelectProps {
    label: string;
    options: Option[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({
    label,
    options,
    selectedValues,
    onChange,
    placeholder = '선택해주세요'
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (value: string) => {
        const newSelected = selectedValues.includes(value)
            ? selectedValues.filter(v => v !== value)
            : [...selectedValues, value];
        onChange(newSelected);
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            onChange(options.map(o => o.value));
        } else {
            onChange([]);
        }
    };

    const displayText = selectedValues.length === 0
        ? placeholder
        : selectedValues.length === options.length
            ? '전체 선택됨'
            : `${selectedValues.length}개 선택됨`;

    return (
        <div className="relative space-y-2" ref={containerRef}>
            <label className="block text-sm font-bold text-slate-700">{label}</label>
            <div
                className="w-full border border-slate-200 rounded-lg bg-slate-50 p-2.5 text-sm font-medium cursor-pointer flex justify-between items-center hover:border-blue-400 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selectedValues.length === 0 ? 'text-slate-400' : 'text-slate-700'}>
                    {displayText}
                </span>
                <span className="text-xs text-slate-400">▼</span>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto p-2 space-y-1">
                    {/* Select All */}
                    <div
                        className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded cursor-pointer border-b border-slate-100 mb-1"
                        onClick={() => handleSelectAll(selectedValues.length !== options.length)}
                    >
                        <input
                            type="checkbox"
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            checked={selectedValues.length === options.length && options.length > 0}
                            readOnly
                        />
                        <span className="text-sm font-bold text-slate-700">전체 선택</span>
                    </div>

                    {options.length === 0 ? (
                        <div className="p-2 text-center text-xs text-slate-400">옵션이 없습니다.</div>
                    ) : (
                        options.map(option => (
                            <div
                                key={option.value}
                                className="flex items-center gap-2 p-2 hover:bg-blue-50 rounded cursor-pointer transition-colors"
                                onClick={() => toggleOption(option.value)}
                            >
                                <input
                                    type="checkbox"
                                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 pointer-events-none" // pointer-events-none to let div handle click
                                    checked={selectedValues.includes(option.value)}
                                    readOnly
                                />
                                <span className="text-sm text-slate-600">{option.label}</span>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
