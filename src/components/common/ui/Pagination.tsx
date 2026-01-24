import React from 'react';
import { Button } from './Button';

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalCount?: number;
}

export function Pagination({ currentPage, totalPages, onPageChange, totalCount }: PaginationProps) {
    if (totalPages <= 1) return null;

    // Generate page numbers to display
    const getPageNumbers = () => {
        const delta = 2; // Number of pages to show on each side of current page
        const range = [];
        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) {
            range.unshift('...');
        }
        if (currentPage + delta < totalPages - 1) {
            range.push('...');
        }

        range.unshift(1);
        if (totalPages !== 1) {
            range.push(totalPages);
        }

        return range;
    };

    const pages = getPageNumbers();

    return (
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4 border-t border-slate-100 mt-4">
            <div className="text-sm text-slate-500">
                {totalCount ? (
                    <>Total <span className="font-bold text-slate-700">{totalCount}</span> items</>
                ) : (
                    <>Page <span className="font-bold text-slate-700">{currentPage}</span> of <span className="font-bold text-slate-700">{totalPages}</span></>
                )}
            </div>

            <div className="flex items-center gap-1">
                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-2"
                >
                    Previous
                </Button>

                <div className="flex items-center gap-1 mx-2">
                    {pages.map((page, index) => (
                        <React.Fragment key={index}>
                            {page === '...' ? (
                                <span className="text-slate-400 px-1">...</span>
                            ) : (
                                <button
                                    onClick={() => onPageChange(page as number)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold transition-all ${currentPage === page
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'text-slate-600 hover:bg-slate-100'
                                        }`}
                                >
                                    {page}
                                </button>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2"
                >
                    Next
                </Button>
            </div>
        </div>
    );
}
