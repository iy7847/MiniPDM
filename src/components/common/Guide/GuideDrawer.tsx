import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useGuide } from './useGuide';
import { defaultGuides } from './defaultGuides';
import { useProfile } from '../../../hooks/useProfile';

interface GuideDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    pageKey: string;
}

export function GuideDrawer({ isOpen, onClose, pageKey }: GuideDrawerProps) {
    const { guide, loading, updateGuide } = useGuide(pageKey);
    const { profile } = useProfile();
    const isAdmin = profile?.role === 'super_admin';

    const [displayContent, setDisplayContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState('');

    useEffect(() => {
        let contentToUse = '';
        if (guide) {
            contentToUse = guide.content;
        } else {
            contentToUse = defaultGuides[pageKey] || '# 가이드 준비 중\n\n이 페이지에 대한 가이드가 아직 작성되지 않았습니다.';
        }
        // Fix double escaped newlines
        const cleanContent = contentToUse.replace(/\\n/g, '\n');
        setDisplayContent(cleanContent);
        setEditContent(cleanContent);
    }, [guide, pageKey]);

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    const handleSave = async () => {
        const success = await updateGuide(editContent);
        if (success) {
            setIsEditing(false);
            setDisplayContent(editContent);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className="relative w-full max-w-md bg-white shadow-2xl h-full flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-5 border-b flex justify-between items-center bg-gradient-to-r from-slate-800 to-indigo-900 text-white shrink-0">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <span className="text-2xl">📚</span> 사용 가이드
                    </h2>
                    <div className="flex items-center gap-3">
                        {isAdmin && !isEditing && (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="px-3 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-full font-bold transition-colors"
                            >
                                ✏️ 편집
                            </button>
                        )}
                        {isEditing && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSave}
                                    className="px-3 py-1 text-xs bg-green-500 hover:bg-green-600 shadow rounded-full font-bold transition-colors"
                                >
                                    저장
                                </button>
                                <button
                                    onClick={() => { setIsEditing(false); setEditContent(displayContent); }}
                                    className="px-3 py-1 text-xs bg-gray-500 hover:bg-gray-600 shadow rounded-full font-bold transition-colors"
                                >
                                    취소
                                </button>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors text-white/80 hover:text-white"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 bg-slate-50">
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : (
                        isEditing ? (
                            <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full h-full min-h-[500px] p-4 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm leading-relaxed outline-none resize-none"
                                placeholder="# 여기에 마크다운 내용을 입력하세요..."
                            />
                        ) : (
                            <div className="w-full break-words" style={{ overflowWrap: 'anywhere' }}>
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-2xl font-black text-slate-800 mb-6 pb-3 border-b border-slate-100 mt-0" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-lg font-bold text-indigo-900 mt-8 mb-3 flex items-center gap-2" {...props} />,
                                        h3: ({ node, ...props }) => <h3 className="text-base font-bold text-slate-700 mt-6 mb-2" {...props} />,
                                        p: ({ node, ...props }) => <p className="mb-4 text-slate-600 leading-relaxed text-sm block" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc pl-5 mb-4 space-y-2 text-slate-600 text-sm" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal pl-5 mb-4 space-y-2 text-slate-600 text-sm" {...props} />,
                                        li: ({ node, ...props }) => <li className="pl-1 marker:text-indigo-300" {...props} />,
                                        strong: ({ node, ...props }) => <strong className="font-bold text-indigo-700 bg-indigo-50 px-1 rounded" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-blue-600 hover:text-blue-800 underline decoration-blue-200 hover:decoration-blue-500 underline-offset-2 transition-all break-all" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-300 pl-4 py-2 my-4 bg-indigo-50/50 rounded-r text-slate-600 italic text-sm" {...props} />,
                                        hr: ({ node, ...props }) => <hr className="my-6 border-slate-100" {...props} />,
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-slate-200"><table className="min-w-full divide-y divide-slate-200 text-sm" {...props} /></div>,
                                        thead: ({ node, ...props }) => <thead className="bg-slate-50 text-slate-700 font-bold" {...props} />,
                                        tbody: ({ node, ...props }) => <tbody className="divide-y divide-slate-100 bg-white" {...props} />,
                                        tr: ({ node, ...props }) => <tr className="hover:bg-slate-50 transition-colors" {...props} />,
                                        th: ({ node, ...props }) => <th className="px-4 py-3 text-left whitespace-nowrap" {...props} />,
                                        td: ({ node, ...props }) => <td className="px-4 py-3 text-slate-600" {...props} />,
                                        pre: ({ node, ...props }) => <pre className="bg-slate-100 p-3 rounded-lg overflow-x-auto my-4 text-xs font-mono text-slate-600" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }} {...props} />,
                                        code: ({ node, ...props }) => <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono text-indigo-600" style={{ wordBreak: 'break-all' }} {...props} />,
                                    }}
                                >
                                    {displayContent}
                                </ReactMarkdown>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
