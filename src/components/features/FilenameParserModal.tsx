import { useState, useEffect } from 'react';
import { MobileModal } from '../common/MobileModal';

interface FilenameParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: File[];
  onConfirm: (parsedItems: any[]) => void;
}

export function FilenameParserModal({ isOpen, onClose, files, onConfirm }: FilenameParserModalProps) {
  // 구분자 모드: 'smart', 'space', 'dash', 'underbar', 'custom'
  const [separatorMode, setSeparatorMode] = useState('smart'); 
  const [customSeparator, setCustomSeparator] = useState(''); 
  
  const [tokens, setTokens] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<number, string>>({});
  
  // 병합 선택용 상태 (인덱스 배열)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  // 파일명 파싱 함수
  const parseFilename = (filename: string) => {
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
    
    if (separatorMode === 'smart') {
      return nameWithoutExt.split(/[_\-\s]+/).filter(t => t.trim() !== '');
    } else if (separatorMode === 'custom') {
      if (!customSeparator) return [nameWithoutExt]; // 구분자 없으면 통째로
      // 사용자 지정 문자로 분리
      return nameWithoutExt.split(customSeparator).filter(t => t.trim() !== '');
    } else {
      const sep = separatorMode === 'space' ? ' ' : separatorMode === 'underbar' ? '_' : '-';
      return nameWithoutExt.split(sep).filter(t => t.trim() !== '');
    }
  };

  // 설정 변경 시 첫 번째 파일 다시 파싱
  useEffect(() => {
    if (files.length > 0) {
      const result = parseFilename(files[0].name);
      setTokens(result);
      setMapping({});
      setSelectedIndices([]);
    }
  }, [files, separatorMode, customSeparator]);

  const handleMappingChange = (index: number, field: string) => {
    setMapping(prev => ({ ...prev, [index]: field }));
  };

  // 토큰 선택 토글 (다중 선택)
  const toggleSelection = (index: number) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) return prev.filter(i => i !== index);
      return [...prev, index].sort((a, b) => a - b);
    });
  };

  // 선택된 토큰 병합
  const handleMerge = () => {
    if (selectedIndices.length < 2) return;
    
    // 선택된 토큰들을 공백으로 연결
    const mergedText = selectedIndices.map(idx => tokens[idx]).join(' '); 
    
    const newTokens: string[] = [];
    const firstIdx = selectedIndices[0];
    
    // 기존 토큰을 순회하며 병합된 위치에 새 텍스트 넣고 나머지는 스킵
    tokens.forEach((t, i) => {
      if (selectedIndices.includes(i)) {
        if (i === firstIdx) newTokens.push(mergedText);
      } else {
        newTokens.push(t);
      }
    });

    setTokens(newTokens);
    setMapping({});
    setSelectedIndices([]); // 선택 초기화
  };

  const handleApply = () => {
    const parsedItems = files.map((file, idx) => {
      // 0번 파일은 화면에서 편집한 tokens(병합 반영됨) 사용
      // 나머지 파일은 동일한 로직으로 파싱 (주의: 수동 병합은 0번에만 적용됨)
      let fileTokens: string[];
      
      if (idx === 0) {
        fileTokens = tokens;
      } else {
        fileTokens = parseFilename(file.name);
      }
      
      const item: any = {
        files: [file],
        part_name: '',
        part_no: '',
        spec_w: 0, spec_d: 0, spec_h: 0,
        qty: 1
      };

      Object.entries(mapping).forEach(([tokenIdx, field]) => {
        if (field !== 'ignore' && fileTokens[Number(tokenIdx)]) {
          item[field] = fileTokens[Number(tokenIdx)].trim();
        }
      });

      if (!item.part_name) {
        item.part_name = file.name.substring(0, file.name.lastIndexOf('.'));
      }

      return item;
    });

    onConfirm(parsedItems);
  };

  return (
    <MobileModal
      isOpen={isOpen}
      onClose={onClose}
      title="파일명 스마트 파싱 (Smart Parser)"
      footer={
        <>
          <button onClick={onClose} className="flex-1 py-3 text-slate-600 border rounded">취소</button>
          <button onClick={handleApply} className="flex-1 py-3 text-white bg-blue-600 rounded font-bold hover:bg-blue-700">
            {files.length}개 파일 등록
          </button>
        </>
      }
    >
      <div className="space-y-4">
        {/* 설정 영역 */}
        <div className="bg-slate-50 p-3 rounded border border-slate-200">
          <label className="block text-xs font-bold text-slate-500 mb-2">분리 기준 설정</label>
          
          <div className="flex gap-2 mb-2">
            <button onClick={() => setSeparatorMode('smart')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${separatorMode === 'smart' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600'}`}>자동(Smart)</button>
            <button onClick={() => setSeparatorMode('custom')} className={`flex-1 py-1.5 text-xs font-bold rounded border ${separatorMode === 'custom' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600'}`}>직접 입력</button>
          </div>

          {separatorMode === 'custom' ? (
            <div>
              <input 
                value={customSeparator}
                onChange={(e) => setCustomSeparator(e.target.value)}
                placeholder="구분자 입력 (예: ' (' 또는 - )"
                className="w-full border p-2 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                * 팁: "품명 (규격)" 형태라면 " (" (공백+괄호)를 입력해보세요.
              </p>
            </div>
          ) : (
            <div className="flex gap-1">
              {['space', 'dash', 'underbar'].map(m => (
                <button
                  key={m}
                  onClick={() => setSeparatorMode(m)}
                  className={`flex-1 py-1 text-xs border rounded ${separatorMode === m ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-white text-slate-500'}`}
                >
                  {m === 'space' ? '공백' : m === 'dash' ? '-' : '_'}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 토큰 리스트 및 병합 툴 */}
        {files.length > 0 && (
          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-xs text-slate-500">
                파일: <span className="font-bold text-slate-800">{files[0].name}</span>
              </p>
              {selectedIndices.length > 1 && (
                <button 
                  onClick={handleMerge}
                  className="text-xs bg-indigo-600 text-white px-2 py-1 rounded font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  선택 합치기 ({selectedIndices.length})
                </button>
              )}
            </div>

            <div className="space-y-2 bg-white border border-slate-100 p-2 rounded max-h-[300px] overflow-y-auto">
              {tokens.map((token, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {/* 토큰 박스 (클릭 가능) */}
                  <div 
                    onClick={() => toggleSelection(idx)}
                    className={`
                      px-3 py-2 rounded text-sm font-mono font-bold w-1/2 truncate border cursor-pointer select-none transition-all
                      ${selectedIndices.includes(idx) 
                        ? 'bg-indigo-100 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500' 
                        : 'bg-slate-100 border-slate-200 text-slate-700 hover:border-indigo-300'}
                    `}
                  >
                    {token}
                  </div>
                  <span className="text-slate-300">➜</span>
                  <select
                    className="flex-1 border p-2 rounded text-sm outline-none focus:border-blue-500"
                    value={mapping[idx] || 'ignore'}
                    onChange={(e) => handleMappingChange(idx, e.target.value)}
                  >
                    <option value="ignore">무시 (Skip)</option>
                    <option value="part_name">품명 (Name)</option>
                    <option value="part_no">도번/품번 (No)</option>
                    <option value="qty">수량 (Qty)</option>
                    <option value="material">재질 (Material)</option>
                  </select>
                </div>
              ))}
              {tokens.length === 0 && <div className="text-center text-xs text-slate-400 py-4">분리된 항목이 없습니다.</div>}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              * 항목을 클릭하여 여러 개 선택 후 [합치기]를 할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </MobileModal>
  );
}