import { useState, useRef, useEffect } from 'react';
import { MobileModal } from './MobileModal';
import { useProfile } from '../../hooks/useProfile';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
}

interface MaskingModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileUrl: string;
    fileName: string;
    onSave: (maskedBlob: Blob) => Promise<void>;
}

export function MaskingModal({ isOpen, onClose, fileUrl, fileName, onSave }: MaskingModalProps) {
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });
    const [masks, setMasks] = useState<{ x: number, y: number, w: number, h: number }[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const renderPdfToCanvas = async (url: string, canvas: HTMLCanvasElement) => {
        try {
            setIsLoading(true);
            const loadingTask = pdfjsLib.getDocument(url);
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);

            const viewport = page.getViewport({ scale: 2.0 }); // Increased scale for better quality
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };
            await page.render(renderContext).promise;

            const dataUrl = canvas.toDataURL('image/png');
            setImageSrc(dataUrl);
            setIsLoading(false);
        } catch (error) {
            console.error('PDF Render Error:', error);
            alert('PDF 로딩 실패: ' + (error instanceof Error ? error.message : String(error)));
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isOpen || !fileUrl) return;

        setMasks([]);
        setImageSrc(null);
        setIsLoading(true);

        const timer = setTimeout(() => {
            // Check if PDF
            if (fileUrl.toLowerCase().endsWith('.pdf') || fileName.toLowerCase().endsWith('.pdf')) {
                if (canvasRef.current) {
                    renderPdfToCanvas(fileUrl, canvasRef.current);
                }
            } else {
                setImageSrc(fileUrl);
                setIsLoading(false);
            }
        }, 300); // Slight delay for modal interaction
        return () => clearTimeout(timer);
    }, [isOpen, fileUrl]);

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        setStartPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        setIsDrawing(true);
    };

    const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isDrawing) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const newMask = {
            x: Math.min(startPos.x, endX),
            y: Math.min(startPos.y, endY),
            w: Math.abs(endX - startPos.x),
            h: Math.abs(endY - startPos.y)
        };

        if (newMask.w > 0 && newMask.h > 0) {
            setMasks([...masks, newMask]);
        }
        setIsDrawing(false);
    };

    const draw = () => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx || !imageSrc) return;

        const img = new Image();
        img.src = imageSrc;
        img.onload = () => {
            if (canvas.width !== img.width || canvas.height !== img.height) {
                canvas.width = img.width;
                canvas.height = img.height;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            ctx.fillStyle = 'black';
            masks.forEach(m => {
                ctx.fillRect(m.x, m.y, m.w, m.h);
            });
        };
    };

    useEffect(() => {
        if (imageSrc) draw();
    }, [imageSrc, masks]);

    const handleSave = async () => {
        if (!canvasRef.current) return;

        canvasRef.current.toBlob(async (blob) => {
            if (blob) {
                await onSave(blob);
                onClose();
            }
        }, 'image/png');
    };

    return (
        <MobileModal isOpen={isOpen} onClose={onClose} title={`마스킹 편집: ${fileName}`} maxWidth="max-w-[95vw]">
            <div className="flex flex-col gap-4 h-[85vh]">
                <div className="flex-1 overflow-auto border bg-slate-100 flex justify-center items-center p-4 relative">
                    {isLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-20">
                            <div className="text-lg font-bold text-slate-600">Loading Preview...</div>
                        </div>
                    )}
                    <canvas
                        ref={canvasRef}
                        onMouseDown={handleMouseDown}
                        onMouseUp={handleMouseUp}
                        className="cursor-crosshair shadow-lg bg-white"
                        style={{ maxWidth: '100%' }}
                    />
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500">마우스로 드래그하여 가릴 영역을 선택하세요. (PDF도 이미지로 변환되어 저장됩니다)</span>
                    <div className="flex gap-2">
                        <button onClick={() => setMasks([])} className="px-4 py-2 bg-slate-200 rounded text-slate-700 font-bold hover:bg-slate-300">
                            모두 지우기
                        </button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 rounded text-white font-bold hover:bg-blue-700">
                            저장 (덮어쓰기)
                        </button>
                    </div>
                </div>
            </div>
        </MobileModal>
    );
}
