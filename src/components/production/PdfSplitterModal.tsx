import { useState, useRef, useEffect, useMemo } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { PDFDocument, rgb } from 'pdf-lib';
import Tesseract from 'tesseract.js';
import { MobileModal } from '../common/MobileModal';
import { OrderItem } from '../../types/order';
import { FileDropZone } from '../common/FileDropZone';

// Configure PDF.js worker (Vite compatible)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Helper: Extract directory from path
const getDirectoryPath = (filePath: string) => {
    const lastSlash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
    return lastSlash !== -1 ? filePath.substring(0, lastSlash) : '';
};

interface PdfSplitterModalProps {
    isOpen: boolean;
    onClose: () => void;
    items: OrderItem[];
    onAssign: (files: { blob: Blob; fileName: string; itemId: string }[]) => Promise<void>;
    initialFileUrl?: string | null;
    editingFile?: { id: string; path: string; name: string } | null;
}

export function PdfSplitterModal({ isOpen, onClose, items, onAssign, initialFileUrl, editingFile }: PdfSplitterModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState<number>(1);

    // UI State
    const [scale, setScale] = useState(1.0);
    const [isMaskMode, setIsMaskMode] = useState(true); // Default to true
    const [isProcessing, setIsProcessing] = useState(false);

    // Data State
    const [pageAssignments, setPageAssignments] = useState<{ [pageIndex: number]: string }>({}); // 1-based index -> Item ID
    const [masks, setMasks] = useState<{ page: number, x: number, y: number, w: number, h: number }[]>([]);

    // [Added] Auto Match State
    const [autoMatchEnabled, setAutoMatchEnabled] = useState(true);
    const [hasAutoMatched, setHasAutoMatched] = useState(false);

    // Canvas Interactions
    const [selection, setSelection] = useState({ x: 0, y: 0, w: 0, h: 0 });
    const [isSelecting, setIsSelecting] = useState(false);
    const [startPos, setStartPos] = useState({ x: 0, y: 0 });

    // Pan State
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, y: 0 });

    const pdfWrapperRef = useRef<HTMLDivElement>(null);

    // Load initial file
    useMemo(() => {
        if (isOpen && initialFileUrl) {
            setFile(null); // Will be handled by Document loading logic via URL
            setNumPages(0);
            setPageAssignments({});
            setMasks([]);
            setPageNumber(1);
        }
    }, [isOpen, initialFileUrl]);

    const handleReset = () => {
        if (confirm('모든 작업을 초기화하고 처음으로 돌아가시겠습니까?')) {
            setFile(null);
            setMasks([]);
            setPageAssignments({});
            setPageNumber(1);
            setNumPages(0);
            setScale(1.0);
            setHasAutoMatched(false);
        }
    };

    const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setPageNumber(1);
        setHasAutoMatched(false);
    };

    // Auto Run Matcher Logic
    useEffect(() => {
        if (!editingFile && autoMatchEnabled && numPages > 0 && !hasAutoMatched && (file || initialFileUrl)) {
            // We need to wait for file content to be ready for OCR? 
            // Actually currently file state is set. runAutoMatch depends on 'file'.
            // If initialFileUrl is used, 'file' might be null until some loading? 
            // Document.file prop handles URL. runAutoMatch needs 'file' object (Blob).
            // If URL is used, we might need to fetch it to blob for Tesseract?
            // runAutoMatch checks 'file'. If file is null (URL case), it might fail.
            // But existing runAutoMatch logic starts with "if (!file...)".
            // We should ensure we have a file object if we want OCR.
            // However, for now, let's trigger it. If it fails due to no file obj, that's a separate issue.
            // The DropZone sets 'file'.
            runAutoMatch(true);
        }
    }, [numPages, autoMatchEnabled, hasAutoMatched, file]);

    const changePage = (offset: number) => {
        setPageNumber(prev => Math.min(Math.max(prev + offset, 1), numPages));
        setSelection({ x: 0, y: 0, w: 0, h: 0 });
    };

    // [Added] Keyboard Navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '')) return;

            if (e.key === 'ArrowLeft') {
                changePage(-1);
            } else if (e.key === 'ArrowRight') {
                changePage(1);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [numPages]); // separate useEffect for keydown

    // [Added] Wheel Zoom
    const pdfContainerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const container = pdfContainerRef.current;
        if (!container) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const delta = e.deltaY * -0.001; // Sensitivity
            setScale(prev => Math.min(Math.max(prev + delta, 0.2), 5.0));
        };

        container.addEventListener('wheel', onWheel, { passive: false });
        // console.log('Zoom listener attached to', container);

        return () => container.removeEventListener('wheel', onWheel);
    }, [file, initialFileUrl]); // [Fix] Re-attach when viewer renders

    // --- Mouse Event Handlers (Masking & Panning) ---
    const handleMouseDown = (e: React.MouseEvent) => {
        // Pan: Middle button OR (Left button AND !isMaskMode)
        if (e.button === 1 || (e.button === 0 && !isMaskMode)) {
            e.preventDefault();
            setIsPanning(true);
            panStartRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (!isMaskMode || !pdfWrapperRef.current) return;

        const rect = pdfWrapperRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / scale;
        const y = (e.clientY - rect.top) / scale;

        setStartPos({ x, y });
        setIsSelecting(true);
        setSelection({ x, y, w: 0, h: 0 });
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isPanning && pdfContainerRef.current) {
            e.preventDefault();
            const dx = e.clientX - panStartRef.current.x;
            const dy = e.clientY - panStartRef.current.y;

            pdfContainerRef.current.scrollLeft -= dx;
            pdfContainerRef.current.scrollTop -= dy;

            panStartRef.current = { x: e.clientX, y: e.clientY };
            return;
        }

        if (!isSelecting || !pdfWrapperRef.current) return;

        const rect = pdfWrapperRef.current.getBoundingClientRect();
        const currentX = (e.clientX - rect.left) / scale;
        const currentY = (e.clientY - rect.top) / scale;

        setSelection({
            x: Math.min(startPos.x, currentX),
            y: Math.min(startPos.y, currentY),
            w: Math.abs(currentX - startPos.x),
            h: Math.abs(currentY - startPos.y)
        });
    };

    const handleMouseUp = () => {
        if (isPanning) {
            setIsPanning(false);
            return;
        }

        if (isSelecting) {
            setIsSelecting(false);
            if (selection.w > 5 && selection.h > 5) {
                setMasks(prev => [...prev, { page: pageNumber, ...selection }]);
            }
            setSelection({ x: 0, y: 0, w: 0, h: 0 });
        }
    };

    const handleDeleteMask = (index: number) => {
        // Find the actual mask in the global array
        const pageMasks = masks.filter(m => m.page === pageNumber);
        const targetMask = pageMasks[index];
        if (targetMask) {
            setMasks(prev => prev.filter(m => m !== targetMask));
        }
    };

    // --- Auto Match (OCR) ---
    // --- Auto Match (OCR) ---
    const runAutoMatch = async (isAutoRun = false) => {
        if (!file && !initialFileUrl) return;
        if (isProcessing) return; // Prevent double trigger
        setIsProcessing(true);

        try {
            let arrayBuffer;
            if (file) {
                arrayBuffer = await file.arrayBuffer();
            } else if (initialFileUrl) {
                const res = await fetch(initialFileUrl);
                arrayBuffer = await res.arrayBuffer();
            }

            if (!arrayBuffer) return;

            const pdf = await pdfjs.getDocument(arrayBuffer).promise;
            const totalPages = pdf.numPages;
            const newAssignments: { [pageIndex: number]: string } = {};
            let matchCount = 0;

            // Iterate all pages
            for (let i = 1; i <= totalPages; i++) {
                try {
                    const page = await pdf.getPage(i);
                    const viewport = page.getViewport({ scale: 2.0 }); // High res for OCR

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    if (!context) continue;

                    canvas.width = viewport.width;
                    canvas.height = viewport.height;

                    await page.render({ canvasContext: context, viewport } as any).promise;
                    const dataUrl = canvas.toDataURL('image/png');

                    const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng+kor');
                    const cleanText = text.replace(/\s+/g, '').toLowerCase();

                    // Find matching item
                    const matchedItem = items.find(item => {
                        const partNo = item.part_no?.replace(/\s+/g, '').toLowerCase();
                        const partName = item.part_name?.replace(/\s+/g, '').toLowerCase();
                        // Priority search
                        if (partNo && cleanText.includes(partNo)) return true;
                        if (partName && cleanText.includes(partName)) return true;
                        return false;
                    });

                    if (matchedItem) {
                        newAssignments[i] = matchedItem.id;
                        matchCount++;
                    }
                } catch (pageErr) {
                    console.error(`Page ${i} OCR Error:`, pageErr);
                }
            }

            if (matchCount > 0) {
                setPageAssignments(prev => ({ ...prev, ...newAssignments }));
                if (!isAutoRun) alert(`${matchCount}개 페이지가 성공적으로 매칭되었습니다.`);
            } else {
                if (!isAutoRun) alert('매칭된 품목이 없습니다.');
            }

            setHasAutoMatched(true);

        } catch (e: any) {
            console.error(e);
            if (!isAutoRun) alert('매칭 중 오류 발생: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Overwrite Save (Edit Mode) ---
    const handleOverwriteSave = async () => {
        if (!editingFile || (!file && !initialFileUrl)) return;
        setIsProcessing(true);

        try {
            let srcDoc;
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                srcDoc = await PDFDocument.load(arrayBuffer);
            } else if (initialFileUrl) {
                const res = await fetch(initialFileUrl);
                const arrayBuffer = await res.arrayBuffer();
                srcDoc = await PDFDocument.load(arrayBuffer);
            }

            if (!srcDoc) throw new Error('문서를 로드할 수 없습니다.');

            // Apply masks to all pages
            const pages = srcDoc.getPages();
            const { height } = pages[0].getSize(); // Assume uniform size for simplicity or get per page

            // We need to embed page indices if we support moving? No, overwrite keeps order ideally.
            // But we must apply masks.
            for (let i = 0; i < pages.length; i++) {
                const pageIndex = i + 1; // 1-based logic in masks
                const pageMasks = masks.filter(m => m.page === pageIndex);
                if (pageMasks.length > 0) {
                    const pdfPage = pages[i];
                    const { height: pdfHeight } = pdfPage.getSize();

                    pageMasks.forEach(mask => {
                        // Coordinates conversion (Canvas to PDF)
                        // Assuming 72 DPI vs viewport logic? 
                        // Actually logic in handleSave was:
                        // const pdfPage = newPdf.addPage([embeddedPage.width, embeddedPage.height]); (Dimensions are same)
                        // In handleSave, we used embeddedPage. 
                        // Here we are modifying srcDoc directly.

                        // Mask logic needs to match handleSave's logic
                        // In handleSave:
                        // const scaleX = pdfPage.getWidth() / viewport.width; (We don't have viewport here easily)
                        // But masks are recorded in "Scale=1 / Native" space?
                        // Let's check mask recording:
                        // setMasks => keys are selection (x,y,w,h). 
                        // Selection comes from Mouse Events on Scaled Div.
                        // selection = { x: ... / scale, y: ... / scale } (Wait, let's verify selection logic)

                        // Checking selection logic (lines 160+):
                        // const rect = pdfWrapperRef.current.getBoundingClientRect();
                        // const x = (e.clientX - rect.left) / scale; 
                        // So masks are in Unscaled PDF-Point coordinates (approx if PDFJS uses 72dpi by default?)
                        // PDF-Lib uses 72dpi points.
                        // So `mask.x` should maps directly if PDFJS loaded at scale 1.0 matches PDFLib.
                        // Usually PDFJs `page.getViewport({ scale: 1.0 })` matches PDFLib size.

                        // HOWEVER, PDF coordinate system (Y starts bottom) vs Canvas (Y starts top).
                        // We need to flip Y.

                        // pageMasks context:
                        // x, y from top-left.
                        const x = mask.x;
                        const y = pdfHeight - mask.y - mask.h; // Flip Y

                        pdfPage.drawRectangle({
                            x,
                            y,
                            width: mask.w,
                            height: mask.h,
                            color: rgb(1, 1, 1), // White
                            opacity: 1, // Fully opaque
                            borderColor: undefined,
                        });
                    });
                }
            }

            const pdfBytes = await srcDoc.save();

            // Overwrite File
            // We need directory and filename
            // editingFile.path is full path

            // Extract dir and name
            // Basic logic, assumes Windows separators mostly but handles / too
            const fullPath = editingFile.path;
            const fileName = fullPath.split(/[/\\]/).pop() || editingFile.name;
            let dirPath = fullPath.substring(0, fullPath.lastIndexOf(fileName));
            if (dirPath.endsWith('\\') || dirPath.endsWith('/')) dirPath = dirPath.slice(0, -1);

            // If dirPath is "D:", ensure we handle correctly or just pass as root.
            // window.fileSystem.writeFile(bytes, name, root, relative)
            // if we pass root='', relative=dir

            if (window.fileSystem) {
                const result = await window.fileSystem.writeFile(pdfBytes, fileName, '', dirPath);
                if (result.success) {
                    alert('파일이 저장(덮어쓰기)되었습니다.');
                    onClose();
                } else {
                    alert('파일 저장 실패: ' + (result.error || '알 수 없는 오류'));
                }
            } else {
                alert('파일 시스템 권한이 없습니다.');
            }

        } catch (e: any) {
            console.error(e);
            alert('저장 실패: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Save & Split ---
    const handleSave = async () => {
        if ((!file && !initialFileUrl) || Object.keys(pageAssignments).length === 0) {
            alert('할당된 품목이 없습니다.');
            return;
        }
        setIsProcessing(true);

        try {
            let srcDoc;
            if (file) {
                const arrayBuffer = await file.arrayBuffer();
                srcDoc = await PDFDocument.load(arrayBuffer);
            } else if (initialFileUrl) {
                const res = await fetch(initialFileUrl);
                const arrayBuffer = await res.arrayBuffer();
                srcDoc = await PDFDocument.load(arrayBuffer);
            }

            if (!srcDoc) throw new Error('문서를 로드할 수 없습니다.');

            // Group pages by Item ID
            const assignmentsByItem: { [itemId: string]: number[] } = {};
            Object.entries(pageAssignments).forEach(([pageIdx, itemId]) => {
                const pIdx = parseInt(pageIdx); // 1-based string key
                if (itemId) {
                    if (!assignmentsByItem[itemId]) assignmentsByItem[itemId] = [];
                    assignmentsByItem[itemId].push(pIdx);
                }
            });

            const results: { blob: Blob; fileName: string; itemId: string }[] = [];

            for (const [itemId, pageNumbers] of Object.entries(assignmentsByItem)) {
                // Create new PDF
                const newDoc = await PDFDocument.create();

                // Copy pages (convert 1-based pageNumber to 0-based index)
                const pageIndices = pageNumbers.map(p => p - 1);
                const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);

                // Add pages and apply masks
                for (let i = 0; i < copiedPages.length; i++) {
                    const originalPageNum = pageNumbers[i];
                    const embeddedPage = newDoc.addPage(copiedPages[i]);

                    // Apply masks for this specific original page
                    const pageMasks = masks.filter(m => m.page === originalPageNum);
                    if (pageMasks.length > 0) {
                        const { height } = embeddedPage.getSize();
                        // Assuming render scale was 1.0 (PDF point = pixel roughly at 72dpi, but render-scale variable)
                        // Wait, we used `scale` state for rendering on screen.
                        // We need to map screen coordinates (at `scale`) to PDF coordinates.
                        // PDF default user unit is 1/72 inch.
                        // react-pdf usually renders at 1px = 1pt if scale=1? 
                        // Actually react-pdf `width` prop overrides.
                        // Let's use standard width logic from SmartPdfImporter if possible.
                        // SmartPdfImporter used a fixed RENDER_WIDTH. Here we rely on natural size * scale?

                        // Let's get the VIEWPORT size from pdfjs to normalize.
                        // Since we don't have the viewport object simply available here in the loop,
                        // we can approximate if we know the rendered width.
                        // BUT, `react-pdf` renders Page based on `scale`.
                        // PDF point size is internal.
                        // To be precise, we need to know the ratio.

                        // Correct approach: Store the PDF Point Dimensions for each page when loaded/rendered.
                        // Or simpler: Just accept that masks might be slightly offset if we don't normalize?
                        // No, must be accurate.

                        // Let's rely on `page.getViewport({ scale: scale })` logic.
                        // ScreenX / scale = Unscaled Point X ?
                        // Yes, if react-pdf renders at 1.0 scale == PDF points.
                        // Usually PDF is 72DPI.

                        // In handleMouseDown, we divide by `scale`. `x` is in "Unscaled Pixels".
                        // If "Unscaled Pixels" == "PDF Points", then we are good.
                        // `react-pdf` default scale 1.0 renders 1 PDF point as 1 CSS pixel.
                        // So `x`, `y`, `w`, `h` are in PDF Points.

                        pageMasks.forEach(mask => {
                            const pdfY = height - mask.y - mask.h; // Flip Y axis
                            embeddedPage.drawRectangle({
                                x: mask.x,
                                y: pdfY,
                                width: mask.w,
                                height: mask.h,
                                color: rgb(1, 1, 1),
                                opacity: 1,
                            });
                        });
                    }
                }

                const pdfBytes = await newDoc.save();
                const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });

                const item = items.find(i => i.id === itemId);
                // [Modified] Use Part No as filename, sanitize invalid characters
                const identifier = item ? (item.part_no || item.part_name || 'part') : 'part';
                const safeName = identifier.replace(/[\\/:*?"<>|]/g, '_');
                const fileName = `${safeName}.pdf`;

                results.push({ blob, fileName, itemId });
            }

            await onAssign(results);
            onClose();
        } catch (error: any) {
            console.error('PDF Split/Mask Error:', error);
            alert('처리 중 오류가 발생했습니다: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // --- Export Only (Same Folder) ---
    const handleExportToOriginal = async () => {
        if (!file || !(file as any).path || Object.keys(pageAssignments).length === 0) {
            alert('원본 파일이 없거나 할당된 품목이 없습니다.');
            return;
        }

        const originalPath = (file as any).path;
        const targetDir = getDirectoryPath(originalPath);

        if (!targetDir || !(window as any).fileSystem) {
            alert('이 기능은 Electron 데스크탑 앱에서만 지원됩니다.');
            return;
        }

        setIsProcessing(true);
        try {
            const arrayBuffer = await file.arrayBuffer();
            const srcDoc = await PDFDocument.load(arrayBuffer);

            // Group pages by Item ID
            const assignmentsByItem: { [itemId: string]: number[] } = {};
            Object.entries(pageAssignments).forEach(([pageIdx, itemId]) => {
                const pIdx = parseInt(pageIdx);
                if (itemId) {
                    if (!assignmentsByItem[itemId]) assignmentsByItem[itemId] = [];
                    assignmentsByItem[itemId].push(pIdx);
                }
            });

            let successCount = 0;

            for (const [itemId, pageNumbers] of Object.entries(assignmentsByItem)) {
                // Create PDF
                const newDoc = await PDFDocument.create();
                const pageIndices = pageNumbers.map(p => p - 1);
                const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);

                for (let i = 0; i < copiedPages.length; i++) {
                    const originalPageNum = pageNumbers[i];
                    const embeddedPage = newDoc.addPage(copiedPages[i]);

                    const pageMasks = masks.filter(m => m.page === originalPageNum);
                    if (pageMasks.length > 0) {
                        const { height } = embeddedPage.getSize();
                        pageMasks.forEach(mask => {
                            const pdfY = height - mask.y - mask.h;
                            embeddedPage.drawRectangle({
                                x: mask.x,
                                y: pdfY,
                                width: mask.w,
                                height: mask.h,
                                color: rgb(1, 1, 1),
                                opacity: 1,
                            });
                        });
                    }
                }

                const pdfBytes = await newDoc.save();

                const item = items.find(i => i.id === itemId);
                // [Modified] Use Part No as filename
                const identifier = item ? (item.part_no || item.part_name || 'part') : 'part';
                const safeName = identifier.replace(/[\\/:*?"<>|]/g, '_');
                const fileName = `${safeName}.pdf`;

                const result = await (window as any).fileSystem.writeFile(
                    pdfBytes,
                    fileName,
                    targetDir,
                    '' // Save directly to targetDir
                );

                if (result.success) successCount++;
            }

            alert(`${successCount}개 파일이 원본 폴더에 생성되었습니다.\n경로: ${targetDir}`);
            // Do NOT close modal, maybe user wants to attach too? 
            // Usually "Save" implies done? User said "Two features".

        } catch (e: any) {
            console.error(e);
            alert('저장 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileDrop = (files: File[]) => {
        if (files.length > 0 && files[0].type === 'application/pdf') {
            setFile(files[0]);
        } else {
            alert('PDF 파일만 지원합니다.');
        }
    };

    const assignedItem = pageAssignments[pageNumber]
        ? items.find(i => i.id === pageAssignments[pageNumber])
        : null;

    return (
        <MobileModal isOpen={isOpen} onClose={onClose} title="PDF 분할 및 마스킹" maxWidth="max-w-7xl" noScroll={true}>
            <div className={`flex flex-col lg:flex-row h-[80vh] gap-4 ${isProcessing ? 'opacity-50 pointer-events-none' : ''} overflow-hidden`}>

                {/* Left: PDF Viewer */}
                <div className="flex-1 bg-slate-100 rounded border flex flex-col relative overflow-hidden h-full">
                    {(!file && !initialFileUrl) ? (
                        <div className="w-full h-full flex flex-col items-center justify-center p-10">
                            <FileDropZone
                                onFilesDropped={handleFileDrop}
                                className="w-full h-full flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-300 rounded-lg"
                            >
                                <div className="text-4xl mb-4">📄</div>
                                <p className="font-bold text-lg text-slate-700">PDF 파일을 이곳에 드래그하세요</p>
                                <p className="text-slate-500 mt-2">또는 클릭하여 파일을 선택하세요</p>
                            </FileDropZone>
                        </div>
                    ) : (
                        <>
                            {/* Toolbar */}
                            <div className="sticky top-0 bg-white p-2 border-b flex justify-between items-center z-10 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="w-8 h-8 rounded hover:bg-slate-100 border">◀</button>
                                    <span className="font-bold text-sm">Page {pageNumber} / {numPages}</span>
                                    <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="w-8 h-8 rounded hover:bg-slate-100 border">▶</button>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={handleReset} className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-50 text-xs font-bold text-slate-700">
                                        🔄 초기화
                                    </button>
                                    <div className="h-4 w-[1px] bg-slate-200"></div>
                                    <button onClick={() => setScale(s => Math.max(0.5, s - 0.1))} className="w-6 h-6 border rounded">-</button>
                                    <span className="text-xs w-10 text-center">{Math.round(scale * 100)}%</span>
                                    <button onClick={() => setScale(s => Math.min(3.0, s + 0.1))} className="w-6 h-6 border rounded">+</button>
                                </div>
                            </div>

                            {/* Viewer */}
                            <div
                                ref={pdfContainerRef}
                                className="flex-1 overflow-auto flex p-4 bg-slate-500 relative"
                            >
                                <div
                                    ref={pdfWrapperRef}
                                    className={`relative bg-white shadow-lg m-auto ${isMaskMode ? 'cursor-crosshair' : (isPanning ? 'cursor-grabbing' : 'cursor-grab')}`}
                                    onMouseDown={handleMouseDown}
                                    onMouseMove={handleMouseMove}
                                    onMouseUp={handleMouseUp}
                                    onMouseLeave={handleMouseUp}
                                >
                                    <Document
                                        file={file || initialFileUrl}
                                        onLoadSuccess={onDocumentLoadSuccess}
                                        loading={<div className="p-10 text-white">Loading PDF...</div>}
                                    >
                                        <Page
                                            pageNumber={pageNumber}
                                            scale={scale}
                                            renderTextLayer={false}
                                            renderAnnotationLayer={false}
                                        />
                                    </Document>

                                    {/* Render Masks */}
                                    {masks.filter(m => m.page === pageNumber).map((mask, idx) => (
                                        <div
                                            key={idx}
                                            style={{
                                                position: 'absolute',
                                                left: mask.x * scale,
                                                top: mask.y * scale,
                                                width: mask.w * scale,
                                                height: mask.h * scale,
                                                backgroundColor: 'rgba(0,0,0,0.5)',
                                                border: '1px solid red'
                                            }}
                                        >
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDeleteMask(idx); }}
                                                className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] hover:bg-red-700"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}

                                    {/* Selection Rect */}
                                    {isSelecting && (
                                        <div
                                            style={{
                                                position: 'absolute',
                                                left: selection.x * scale,
                                                top: selection.y * scale,
                                                width: selection.w * scale,
                                                height: selection.h * scale,
                                                border: '1px dashed red',
                                                backgroundColor: 'rgba(255, 0, 0, 0.1)',
                                                pointerEvents: 'none'
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Right: Controls */}
                <div className="w-full lg:w-80 flex flex-col gap-4 shrink-0">
                    <div className="bg-white p-4 rounded border shadow-sm">

                        {editingFile ? (
                            // --- Edit Mode UI ---
                            <>
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                                    <span className="text-purple-600">✎</span> 파일 편집 모드
                                </h3>

                                <div className="p-3 bg-purple-50 rounded border border-purple-100 text-sm text-purple-800 mb-4">
                                    <p className="font-bold mb-1">파일: {editingFile.name}</p>
                                    <p className="text-xs opacity-75">원본 경로 파일을 직접 수정합니다.</p>
                                </div>

                                <div className="flex justify-between p-2 bg-slate-50 rounded mb-4">
                                    <span className="text-sm">적용된 마스크:</span>
                                    <span className="font-bold text-sm">{masks.length}개</span>
                                </div>

                                <button
                                    onClick={handleOverwriteSave}
                                    disabled={isProcessing}
                                    className="w-full py-3 bg-purple-600 text-white font-bold rounded hover:bg-purple-700 shadow-md disabled:bg-slate-300"
                                >
                                    {isProcessing ? '저장 중...' : '💾 저장 (덮어쓰기)'}
                                </button>
                            </>
                        ) : (
                            // --- Default Split Mode UI ---
                            <>
                                <h3 className="font-bold text-slate-700 mb-2">현재 페이지 할당</h3>

                                <div className="flex flex-col gap-2 mb-4">
                                    <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={autoMatchEnabled}
                                            onChange={e => setAutoMatchEnabled(e.target.checked)}
                                        />
                                        파일 로드 시 자동 매칭 실행
                                    </label>
                                    <button
                                        onClick={() => runAutoMatch(false)}
                                        disabled={isProcessing}
                                        className="flex-1 py-2 bg-indigo-50 text-indigo-600 text-xs font-bold rounded border border-indigo-100 hover:bg-indigo-100"
                                    >
                                        ⚡ 수동 매칭 실행 (OCR)
                                    </button>
                                </div>

                                <div className="space-y-2">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500">할당할 품목 선택</label>
                                        <select
                                            className="w-full border rounded p-2 text-sm"
                                            value={pageAssignments[pageNumber] || ''}
                                            onChange={(e) => setPageAssignments(prev => ({ ...prev, [pageNumber]: e.target.value }))}
                                        >
                                            <option value="">(선택 안함)</option>
                                            {items.map(item => (
                                                <option key={item.id} value={item.id}>
                                                    {item.order_item_no ? `[${item.order_item_no}] ` : ''}{item.part_name} ({item.part_no})
                                                </option>
                                            ))}
                                        </select>
                                        {assignedItem && (
                                            <div className="p-3 bg-green-50 rounded border border-green-100 text-xs">
                                                <p className="font-bold text-green-700">✓ 할당됨</p>
                                                <p className="text-green-600 mt-1">{assignedItem.part_name}</p>
                                                <p className="text-green-600">{assignedItem.part_no}</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded border shadow-sm flex-1 flex flex-col mt-4">
                                    <h3 className="font-bold text-slate-700 mb-2">작업 요약</h3>
                                    <div className="flex-1 overflow-auto text-sm space-y-2">
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>할당된 페이지:</span>
                                            <span className="font-bold">{Object.keys(pageAssignments).length} / {numPages}</span>
                                        </div>
                                        <div className="flex justify-between p-2 bg-slate-50 rounded">
                                            <span>적용된 마스크:</span>
                                            <span className="font-bold">{masks.length}개</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={isProcessing}
                                        className="w-full py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow-md disabled:bg-slate-300 mt-4"
                                    >
                                        {isProcessing ? '처리 중...' : '분할 저장 및 적용 (DB)'}
                                    </button>

                                    <button
                                        onClick={handleExportToOriginal}
                                        disabled={isProcessing || !file || !(file as any).path}
                                        className="w-full py-3 bg-green-600 text-white font-bold rounded hover:bg-green-700 shadow-md disabled:bg-slate-300 mt-2"
                                    >
                                        📂 원본 폴더에만 저장
                                    </button>
                                </div>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </MobileModal>
    );
}
