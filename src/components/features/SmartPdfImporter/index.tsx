import React, { useState, useRef, useEffect } from 'react';
import { pdfjs, Document, Page } from 'react-pdf';
import Tesseract from 'tesseract.js';
import { PDFDocument, rgb } from 'pdf-lib';
import { MobileModal } from '../../common/MobileModal';

// Vite 방식 Worker 로드
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

interface SmartPdfImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (results: any[]) => void;
}

type OcrResult = {
  page: number;
  thumbnail: string;
  text: string;
  status: 'pending' | 'success' | 'fail';
  skip: boolean;
};

// [추가] 파일 경로에서 디렉토리 추출 헬퍼 함수
const getDirectoryPath = (filePath: string) => {
  const lastSlashIndex = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return lastSlashIndex !== -1 ? filePath.substring(0, lastSlashIndex) : '';
};

// [수정] 미사용 함수 dataURLtoFile 제거

export function SmartPdfImporter({ isOpen, onClose, onConfirm }: SmartPdfImporterProps) {
  const [file, setFile] = useState<File | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);

  // [수정] 해상도 개선을 위한 상수 정의
  const RENDER_WIDTH = 2400; // 고해상도 렌더링 (Good for zooming)
  const INITIAL_SCALE = 0.25; // 초기 화면에서는 축소해서 보여줌 (2400 * 0.25 = 600px)

  const [scale, setScale] = useState(INITIAL_SCALE);

  const [selection, setSelection] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [isSelecting, setIsSelecting] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  const [ocrResults, setOcrResults] = useState<OcrResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  // [추가] 드래그 오버 상태
  const [isDragOver, setIsDragOver] = useState(false);

  // [Phase 4.1] 마스킹 기능 상태
  const [isMaskMode, setIsMaskMode] = useState(false);
  const [masks, setMasks] = useState<{ page: number, x: number, y: number, w: number, h: number }[]>([]);

  const pdfWrapperRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;

      if (e.key === 'ArrowLeft') {
        changePage(-1);
      } else if (e.key === 'ArrowRight') {
        changePage(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pageNumber, numPages]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY * -0.001;
        // 스케일 제한 조정 (0.1 ~ 2.0) -> RENDER_WIDTH가 크므로 2.0이면 4800px
        const newScale = Math.min(Math.max(scale + delta, 0.1), 2.0);
        setScale(newScale);
      }
    };

    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', onWheel);
    };
  }, [scale, file]);

  // 공통 파일 로드 처리
  const processFile = (inputFile: File) => {
    if (inputFile.type !== 'application/pdf') {
      alert('PDF 파일만 지원합니다.');
      return;
    }
    setFile(inputFile);
    setOcrResults([]);
    setSelection({ x: 0, y: 0, w: 0, h: 0 });
    setPageNumber(1);
    setNumPages(0);
    setScale(INITIAL_SCALE);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // [추가] 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);

    const initialResults = Array.from({ length: numPages }, (_, i) => ({
      page: i + 1,
      thumbnail: '',
      text: '',
      status: 'pending',
      skip: false
    })) as OcrResult[];
    setOcrResults(initialResults);
  };

  const changePage = (offset: number) => {
    setPageNumber(prevPage => Math.min(Math.max(prevPage + offset, 1), numPages));
    setSelection({ x: 0, y: 0, w: 0, h: 0 });
  };

  const jumpToPage = (page: number) => {
    setPageNumber(page);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1) {
      e.preventDefault();
      setIsPanning(true);
      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (e.button === 0) {
      if (!pdfWrapperRef.current) return;
      const rect = pdfWrapperRef.current.getBoundingClientRect();

      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      setStartPos({ x, y });
      setIsSelecting(true);
      setSelection({ x, y, w: 0, h: 0 });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning && scrollContainerRef.current) {
      e.preventDefault();
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      scrollContainerRef.current.scrollLeft -= dx;
      scrollContainerRef.current.scrollTop -= dy;

      panStartRef.current = { x: e.clientX, y: e.clientY };
      return;
    }

    if (isSelecting && pdfWrapperRef.current) {
      const rect = pdfWrapperRef.current.getBoundingClientRect();

      const currentX = (e.clientX - rect.left) / scale;
      const currentY = (e.clientY - rect.top) / scale;

      setSelection({
        x: Math.min(startPos.x, currentX),
        y: Math.min(startPos.y, currentY),
        w: Math.abs(currentX - startPos.x),
        h: Math.abs(currentY - startPos.y),
      });
    }
  };

  const handleMouseUp = async () => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isSelecting) {
      setIsSelecting(false);
      if (selection.w > 10 && selection.h > 10) {
        if (isMaskMode) {
          // [Phase 4.1] 마스크 추가
          setMasks(prev => [...prev, { page: pageNumber, ...selection }]);
          setSelection({ x: 0, y: 0, w: 0, h: 0 });
        } else {
          await runOCR(selection);
        }
      }
    }
  };

  const handleDeleteMask = (index: number) => {
    // 현재 페이지의 마스크 중 index에 해당하는 것을 삭제해야 하므로, 필터링 로직 주의
    // 여기선 단순화를 위해 전체 배열에서 page가 일치하는 것들을 찾아 index로 매칭하거나, ID를 부여하는 게 좋음.
    // 간단히 구현:
    const pageMasks = masks.filter(m => m.page === pageNumber);
    const targetMask = pageMasks[index];
    if (targetMask) {
      setMasks(prev => prev.filter(m => m !== targetMask));
    }
  };

  const runOCR = async (rectSelection: { x: number, y: number, w: number, h: number }) => {
    if (!file) return;

    setIsProcessing(true);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument(arrayBuffer).promise;
      const page = await pdf.getPage(pageNumber);

      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (!context) return;

      await page.render({ canvasContext: context, viewport } as any).promise;

      const viewerWidth = RENDER_WIDTH;
      const scaleFactor = viewport.width / viewerWidth;

      const cropX = rectSelection.x * scaleFactor;
      const cropY = rectSelection.y * scaleFactor;
      const cropW = rectSelection.w * scaleFactor;
      const cropH = rectSelection.h * scaleFactor;

      const croppedCanvas = document.createElement('canvas');
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const croppedCtx = croppedCanvas.getContext('2d');

      if (croppedCtx) {
        croppedCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
        const dataUrl = croppedCanvas.toDataURL('image/png');

        const { data: { text } } = await Tesseract.recognize(dataUrl, 'eng');
        const cleanText = text.replace(/\n/g, ' ').trim();

        setOcrResults(prev => {
          const newResults = [...prev];
          newResults[pageNumber - 1] = {
            page: pageNumber,
            thumbnail: dataUrl,
            text: cleanText,
            status: cleanText ? 'success' : 'fail',
            skip: false
          };
          return newResults;
        });
      }
    } catch (e) {
      console.error(e);
      alert('OCR 처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSkip = (index: number) => {
    const newResults = [...ocrResults];
    newResults[index].skip = !newResults[index].skip;
    setOcrResults(newResults);
  };

  const handleApply = async () => {
    console.log('[SmartPdfImporter] handleApply started');
    if (!file) return;

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const newItems = [];

      const validResults = ocrResults.filter(res => !res.skip && res.text);

      for (const res of validResults) {
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(srcDoc, [res.page - 1]);
        const embeddedPage = subDoc.addPage(copiedPage);

        // [Phase 4.1] 마스킹 적용
        const pageMasks = masks.filter(m => m.page === res.page);
        if (pageMasks.length > 0) {
          const { width, height } = embeddedPage.getSize();
          // 렌더링 좌표계와 PDF 좌표계 변환 필요
          // 렌더링: RENDER_WIDTH 기준, (0,0)은 좌상단
          // PDF-Lib: (0,0)은 좌하단
          const scaleFactor = width / RENDER_WIDTH;

          pageMasks.forEach(mask => {
            const pdfX = mask.x * scaleFactor;
            const pdfW = mask.w * scaleFactor;
            const pdfH = mask.h * scaleFactor;
            // PDF 좌표계: y축 뒤집기
            const pdfY = height - (mask.y * scaleFactor) - pdfH;

            embeddedPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(1, 1, 1), // White
              borderColor: undefined,
              borderWidth: 0,
            });
          });
        }

        const pdfBytes = await subDoc.save();
        const safeName = res.text.replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim() || `Page${res.page}`;
        const pdfFileName = `${safeName}.pdf`;

        // BlobPart 타입 에러 방지를 위해 any 캐스팅 사용
        const pdfFile = new File([pdfBytes as any], pdfFileName, { type: 'application/pdf' });
        console.log(`[SmartPdfImporter] Created PDF file: ${pdfFileName}, size: ${pdfFile.size}`);

        // [수정] 이미지 파일 저장 로직 제거 (경고 해결)
        const filesToAdd = [pdfFile];

        newItems.push({
          part_no: res.text,
          part_name: '',
          qty: 1,
          files: filesToAdd // PDF 파일만 전달
        });
      }

      console.log('[SmartPdfImporter] calling onConfirm with items:', newItems);
      onConfirm(newItems);
      onClose();
    } catch (e: any) {
      console.error('[SmartPdfImporter] Error in handleApply:', e);
      alert('PDF 분할 저장 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportSplitFiles = async () => {
    if (!file) return;

    const sourcePath = (file as any).path;
    if (!sourcePath || !(window as any).fileSystem) {
      return alert('이 기능은 Electron 데스크탑 앱에서만 지원됩니다.\n(웹 브라우저에서는 원본 경로 접근 불가)');
    }

    const targetDir = getDirectoryPath(sourcePath);
    if (!targetDir) return alert('저장 경로를 찾을 수 없습니다.');

    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);

      const validResults = ocrResults.filter(res => !res.skip && res.text);
      let savedCount = 0;

      for (const res of validResults) {
        const subDoc = await PDFDocument.create();
        const [copiedPage] = await subDoc.copyPages(srcDoc, [res.page - 1]);
        const embeddedPage = subDoc.addPage(copiedPage);

        // [Phase 4.1] 마스킹 적용
        const pageMasks = masks.filter(m => m.page === res.page);
        if (pageMasks.length > 0) {
          const { width, height } = embeddedPage.getSize();
          const scaleFactor = width / RENDER_WIDTH;

          pageMasks.forEach(mask => {
            const pdfX = mask.x * scaleFactor;
            const pdfW = mask.w * scaleFactor;
            const pdfH = mask.h * scaleFactor;
            // PDF 좌표계: y축 뒤집기
            const pdfY = height - (mask.y * scaleFactor) - pdfH;

            embeddedPage.drawRectangle({
              x: pdfX,
              y: pdfY,
              width: pdfW,
              height: pdfH,
              color: rgb(1, 1, 1), // White
              borderColor: undefined,
              borderWidth: 0,
            });
          });
        }

        const pdfBytes = await subDoc.save();
        const safeName = res.text.replace(/[^a-zA-Z0-9가-힣\s-_]/g, '').trim() || `Page${res.page}`;
        const pdfFileName = `${safeName}.pdf`;

        const result = await (window as any).fileSystem.writeFile(
          pdfBytes,
          pdfFileName,
          targetDir,
          ''
        );

        if (!result.success) {
          console.error(`Failed to save ${pdfFileName}:`, result.error);
        } else {
          savedCount++;
        }
      }

      alert(`${savedCount}개 파일이 원본 폴더에 분할 저장되었습니다.\n경로: ${targetDir}`);
    } catch (e: any) {
      console.error(e);
      alert('파일 분할 저장 중 오류가 발생했습니다: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = ocrResults.filter(r => !r.skip && r.text).length;

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="도면 일괄 분석 (Smart OCR)"
      maxWidth="max-w-7xl"
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 border rounded">취소</button>

          <button
            onClick={handleExportSplitFiles}
            disabled={isProcessing || validCount === 0}
            className="flex-1 py-3 text-white bg-green-600 rounded font-bold hover:bg-green-700 disabled:bg-slate-300"
          >
            📂 분할 파일만 저장
          </button>

          <button
            onClick={handleApply}
            disabled={isProcessing || validCount === 0}
            className="flex-1 py-3 text-white bg-blue-600 rounded font-bold hover:bg-blue-700 disabled:bg-slate-300"
          >
            {isProcessing ? '처리 중...' : `견적 품목으로 적용 (${validCount})`}
          </button>
        </>
      }
    >
      <div
        className={`flex flex-col lg:flex-row gap-4 h-[75vh] ${isDragOver ? 'opacity-50 bg-blue-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex-1 bg-slate-100 rounded border p-4 overflow-hidden flex flex-col items-center relative">
          {isDragOver && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500 bg-opacity-20 backdrop-blur-sm rounded pointer-events-none">
              <p className="text-2xl font-bold text-blue-800 bg-white px-8 py-4 rounded shadow-xl">
                📂 파일을 여기에 놓으세요
              </p>
            </div>
          )}

          {!file ? (
            <div className="m-auto text-center">
              <input type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" id="pdf-upload" />
              <label htmlFor="pdf-upload" className="bg-blue-600 text-white px-6 py-3 rounded cursor-pointer font-bold shadow hover:bg-blue-700">
                📄 다중 PDF 파일 업로드
              </label>
              <p className="text-slate-500 mt-2 text-sm">또는 파일을 여기로 드래그하세요.</p>
            </div>
          ) : (
            <>
              <div className="bg-white p-2 border-b flex justify-between items-center z-10 shadow-sm w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    Page {pageNumber} / {numPages}
                  </span>
                  <div className="flex gap-1">
                    <button onClick={() => changePage(-1)} disabled={pageNumber <= 1} className="w-6 h-6 border rounded hover:bg-slate-50 flex items-center justify-center">◀</button>
                    <button onClick={() => changePage(1)} disabled={pageNumber >= numPages} className="w-6 h-6 border rounded hover:bg-slate-50 flex items-center justify-center">▶</button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-600">
                    {isProcessing ? '🔄 분석 중...' : isMaskMode ? '🛡️ 마스킹 모드 (드래그하여 가림)' : isPanning ? '✋ 이동 모드' : '🖱️ 도번 영역 드래그'}
                  </span>
                  <button
                    onClick={() => setIsMaskMode(!isMaskMode)}
                    className={`px-2 py-1 text-xs font-bold rounded border ${isMaskMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                  >
                    {isMaskMode ? '마스킹 종료' : '🛡️ 마스킹 모드'}
                  </button>
                  <div className="h-4 w-[1px] bg-slate-300 mx-1"></div>
                  <button onClick={() => setScale(s => Math.max(0.1, s - 0.05))} className="px-2 py-0.5 text-xs border rounded hover:bg-slate-50">－</button>
                  <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100 * (1 / 0.25))}%</span>
                  <button onClick={() => setScale(s => Math.min(2.0, s + 0.05))} className="px-2 py-0.5 text-xs border rounded hover:bg-slate-50">＋</button>
                </div>
              </div>

              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-auto bg-gray-500 flex justify-center items-start p-8 w-full"
              >
                <div
                  ref={pdfWrapperRef}
                  className={`relative shadow-2xl transition-transform duration-100 ease-out origin-top-center select-none bg-white ${isPanning ? 'cursor-grabbing' : 'cursor-crosshair'
                    }`}
                  style={{ transform: `scale(${scale})` }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  <Document
                    file={file}
                    onLoadSuccess={onDocumentLoadSuccess}
                    loading={<div className="p-10 text-white">로딩 중...</div>}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={RENDER_WIDTH}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />
                  </Document>

                  {/* [Phase 4.1] 마스크 렌더링 */}
                  {masks.filter(m => m.page === pageNumber).map((mask, idx) => (
                    <div
                      key={idx}
                      style={{
                        position: 'absolute',
                        left: mask.x,
                        top: mask.y,
                        width: mask.w,
                        height: mask.h,
                        border: '2px solid red',
                        backgroundColor: 'white',
                        opacity: 0.8,
                      }}
                      className="group"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteMask(idx); }}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        ×
                      </button>
                    </div>
                  ))}

                  {selection.w > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        left: selection.x,
                        top: selection.y,
                        width: selection.w,
                        height: selection.h,
                        border: '2px solid red',
                        backgroundColor: isMaskMode ? 'white' : 'rgba(255, 0, 0, 0.2)',
                        boxShadow: isMaskMode ? 'none' : '0 0 0 9999px rgba(0, 0, 0, 0.5)',
                        pointerEvents: 'none',
                        opacity: isMaskMode ? 0.8 : 1
                      }}
                    >
                      <div className={`absolute -top-6 left-0 text-white text-[10px] px-1 py-0.5 font-bold whitespace-nowrap ${isMaskMode ? 'bg-red-600' : 'bg-red-600'}`}>
                        {isMaskMode ? '마스킹 영역' : '인식 중...'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="w-full lg:w-80 bg-white rounded border flex flex-col shrink-0">
          <div className="p-3 border-b bg-slate-50 font-bold text-slate-700 flex justify-between items-center shrink-0">
            <span>분석 결과 ({ocrResults.filter(r => r.text).length})</span>
            <span className="text-xs font-normal text-slate-400">체크박스로 제외</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {ocrResults.map((res, idx) => (
              <div
                key={idx}
                onClick={() => jumpToPage(res.page)}
                className={`flex flex-col gap-2 p-2 border rounded cursor-pointer transition-all ${pageNumber === res.page ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' : 'bg-white hover:bg-slate-50 border-slate-200'
                  } ${res.skip ? 'opacity-50' : ''}`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 rounded">Page {res.page}</span>
                  <input
                    type="checkbox"
                    checked={!res.skip}
                    onChange={(e) => { e.stopPropagation(); toggleSkip(idx); }}
                    className="w-4 h-4 cursor-pointer"
                    title="포함/제외"
                  />
                </div>

                <div className="flex gap-2">
                  {res.thumbnail ? (
                    <img src={res.thumbnail} alt="thumb" className="w-16 h-12 object-contain border bg-white" />
                  ) : (
                    <div className="w-16 h-12 bg-slate-100 border flex items-center justify-center text-[10px] text-slate-400">
                      미인식
                    </div>
                  )}
                  <textarea
                    value={res.text}
                    onChange={(e) => {
                      const newResults = [...ocrResults];
                      newResults[idx].text = e.target.value;
                      setOcrResults(newResults);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    disabled={res.skip}
                    className="flex-1 border p-1.5 rounded text-xs font-bold text-slate-800 resize-none h-12 focus:ring-1 focus:ring-blue-500"
                    placeholder="드래그하여 인식..."
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileModal>
  );
}