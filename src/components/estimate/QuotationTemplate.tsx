import React, { useEffect, useState } from 'react';
import { EstimateItem, CURRENCY_SYMBOL } from '../../types/estimate';

interface QuotationTemplateProps {
  ref: React.Ref<HTMLDivElement>;
  companyInfo: any;
  clientInfo: any;
  estimateInfo: any;
  items: EstimateItem[];
  templateType?: 'A' | 'B' | 'C';
}

// [추가] 전화번호 포맷팅 함수 (화면 표시용)
const formatPhoneNumber = (value: string) => {
  if (!value) return '';
  const num = value.replace(/[^0-9]/g, '');

  if (num.startsWith('02')) { 
    // 서울 (02)
    if (num.length <= 2) return num;
    if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
    if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`; // 02-123-4567
    return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6)}`; // 02-1234-5678
  } else {
    // 그 외 (010, 031 등)
    if (num.length <= 3) return num;
    if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`;
    // [핵심] 10자리일 때 3-3-4 포맷 강제 적용 (예: 031-353-4521)
    if (num.length === 10) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
    // 11자리 이상일 때
    return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7)}`;
  }
};

export const QuotationTemplate = React.forwardRef<HTMLDivElement, QuotationTemplateProps>((props, ref) => {
  const { companyInfo, clientInfo, estimateInfo, items, templateType = 'A' } = props;
  
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [sealSrc, setSealSrc] = useState<string | null>(null);

  useEffect(() => {
    const loadImages = async () => {
      if (companyInfo?.logo_path && window.fileSystem) {
        const src = await (window as any).fileSystem.readImage(companyInfo.logo_path);
        setLogoSrc(src);
      }
      if (companyInfo?.seal_path && window.fileSystem) {
        const src = await (window as any).fileSystem.readImage(companyInfo.seal_path);
        setSealSrc(src);
      }
    };
    loadImages();
  }, [companyInfo]);

  const currency = estimateInfo.currency || 'KRW';
  const symbol = CURRENCY_SYMBOL[currency] || currency;
  const totalAmount = items.reduce((sum, item) => sum + (item.supply_price || 0), 0);
  const today = new Date().toISOString().split('T')[0];

  const containerStyle = { 
    width: '210mm', 
    minHeight: '297mm', 
    padding: '15mm', 
    backgroundColor: 'white', 
    color: 'black', 
    fontFamily: '"Malgun Gothic", "Dotum", Arial, sans-serif' 
  };
  
  const borderClass = templateType === 'A' ? 'border-gray-300' : 'border-black';
  const headerBgClass = templateType === 'A' ? 'bg-gray-100' : 'bg-gray-200';

  return (
    <div ref={ref} style={containerStyle} className="mx-auto relative text-sm leading-snug">
      
      {/* [Type B] 결재란 */}
      {templateType === 'B' && (
        <div className="absolute top-10 right-10 flex border border-black text-xs text-center bg-white">
          <div className="w-16">
            <div className="border-b border-black bg-gray-100 py-1">담 당</div>
            <div className="h-16 border-r border-black"></div>
          </div>
          <div className="w-16">
            <div className="border-b border-black bg-gray-100 py-1">검 토</div>
            <div className="h-16 border-r border-black"></div>
          </div>
          <div className="w-16">
            <div className="border-b border-black bg-gray-100 py-1">승 인</div>
            <div className="h-16"></div>
          </div>
        </div>
      )}

      {/* 1. 헤더 */}
      <div className={`flex justify-between items-end mb-8 ${templateType === 'B' ? 'pt-8' : ''}`}>
        <div className="w-6/12">
          {logoSrc && <img src={logoSrc} alt="Logo" className="h-10 mb-2 object-contain" />}
          <h1 className={`font-bold ${templateType === 'C' ? 'text-3xl' : 'text-4xl text-blue-900'} mb-4 tracking-widest`}>
            견 적 서
          </h1>
          <div className="text-sm space-y-1">
            <div className="flex border-b pb-1 mb-1 border-gray-400 w-fit">
              <span className="w-16 font-bold">수 신 :</span>
              <span className="text-lg font-bold">{clientInfo?.name || '귀하'}</span>
            </div>
            <div className="flex">
              <span className="w-16 font-bold text-gray-600">참 조 :</span>
              <span>구매 담당자 귀하</span>
            </div>
            <div className="flex">
              <span className="w-16 font-bold text-gray-600">날 짜 :</span>
              <span>{today}</span>
            </div>
            <div className="flex">
              <span className="w-16 font-bold text-gray-600">견적번호 :</span>
              <span>{estimateInfo.quotation_no || `QT-${today.replace(/-/g, '')}-001`}</span>
            </div>
          </div>
        </div>
        
        <div className={`w-5/12 border ${borderClass} p-4 relative ${templateType === 'A' ? 'rounded-lg bg-gray-50 border-gray-200' : ''}`}>
           <h3 className="text-xs font-bold text-gray-500 mb-2 border-b border-gray-300 pb-1 block">공급자 (Seller)</h3>
           <div className="space-y-1 text-xs">
             <div className="flex">
               <span className="w-12 font-bold">상 호 :</span>
               <span className="font-bold text-base">{companyInfo?.name}</span>
             </div>
             <div className="flex">
               <span className="w-12 font-bold">대 표 :</span>
               <span>{companyInfo?.ceo_name || '홍 길 동'}</span>
             </div>
             <div className="flex">
               <span className="w-12 font-bold">주 소 :</span>
               <span className="flex-1 whitespace-pre-wrap">{companyInfo?.address}</span>
             </div>
             <div className="flex">
               <span className="w-12 font-bold">전 화 :</span>
               {/* [수정] 포맷팅 함수 적용 */}
               <span>{formatPhoneNumber(companyInfo?.phone)}</span>
             </div>
             <div className="flex">
               <span className="w-12 font-bold">팩 스 :</span>
               {/* [수정] 포맷팅 함수 적용 */}
               <span>{formatPhoneNumber(companyInfo?.fax)}</span>
             </div>
             <div className="flex">
               <span className="w-12 font-bold">이메일 :</span>
               <span>{companyInfo?.email}</span>
             </div>
           </div>
           
           {sealSrc && (
             <img 
               src={sealSrc} 
               alt="Seal" 
               className="absolute top-8 right-4 w-16 h-16 object-contain opacity-80 mix-blend-multiply" 
             />
           )}
        </div>
      </div>

      {/* 2. 인사말 및 합계 */}
      <div className="mb-4">
        <p className="mb-2 text-sm">귀사의 무궁한 발전을 기원하며, 아래와 같이 견적을 제출합니다.</p>
        <div className={`flex justify-between items-center border-t-2 border-b-2 ${templateType === 'A' ? 'border-blue-900 bg-blue-50' : 'border-black bg-gray-100'} p-3`}>
          <span className="font-bold text-lg">합 계 금 액 (Total Amount)</span>
          <span className="font-bold text-xl">
             {symbol} {totalAmount.toLocaleString()} 
             <span className="text-xs font-normal ml-1">({currency === 'KRW' ? 'VAT 별도' : 'VAT Excluded'})</span>
          </span>
        </div>
      </div>

      {/* 3. 품목 리스트 */}
      <div className="mb-6">
        <table className={`w-full border-collapse border ${borderClass} text-xs`}>
          <thead>
            <tr className={`${headerBgClass} text-center h-8`}>
              <th className={`border ${borderClass} w-10`}>No</th>
              <th className={`border ${borderClass}`}>품명 / 규격 (Description)</th>
              <th className={`border ${borderClass} w-20`}>재질</th>
              <th className={`border ${borderClass} w-12`}>수량</th>
              <th className={`border ${borderClass} w-24`}>단가 ({symbol})</th>
              <th className={`border ${borderClass} w-28`}>금액 ({symbol})</th>
              {templateType === 'C' && <th className={`border ${borderClass} w-20`}>비고</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx} className={`h-8 ${templateType === 'C' ? 'text-[10px]' : ''}`}>
                <td className={`border ${borderClass} text-center`}>{idx + 1}</td>
                <td className={`border ${borderClass} px-2 py-1`}>
                  <div className="font-bold text-sm">{item.part_no}</div>
                  <div className="text-gray-600">{item.part_name}</div>
                  <div className="text-gray-500 text-[9px] mt-0.5">
                    {item.shape === 'round' ? `⌀${item.spec_w} x ${item.spec_d}L` : `${item.spec_w} x ${item.spec_d} x ${item.spec_h}t`}
                  </div>
                </td>
                <td className={`border ${borderClass} text-center px-1`}>{item.original_material_name || '-'}</td>
                <td className={`border ${borderClass} text-center`}>{item.qty}</td>
                <td className={`border ${borderClass} text-right px-2`}>{item.unit_price.toLocaleString()}</td>
                <td className={`border ${borderClass} text-right px-2 font-bold`}>{(item.supply_price || 0).toLocaleString()}</td>
                {templateType === 'C' && <td className={`border ${borderClass} text-center`}></td>}
              </tr>
            ))}
            
            {/* 빈 칸 채우기 (Type B) */}
            {templateType === 'B' && items.length < 10 && Array.from({ length: 10 - items.length }).map((_, i) => (
              <tr key={`empty-${i}`} className="h-8">
                <td className={`border ${borderClass}`}></td>
                <td className={`border ${borderClass}`}></td>
                <td className={`border ${borderClass}`}></td>
                <td className={`border ${borderClass}`}></td>
                <td className={`border ${borderClass}`}></td>
                <td className={`border ${borderClass}`}></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 4. 조건 및 계좌 정보 */}
      <div className="flex gap-6 mb-8 text-xs">
        <div className={`flex-1 border ${borderClass} p-3`}>
          <h3 className="font-bold mb-2 border-b border-gray-300 pb-1 text-blue-800">📌 특이사항 및 거래조건 (Remarks)</h3>
          <table className="w-full border-collapse">
            <tbody>
              <tr><td className="font-bold w-20 py-1">결제조건 :</td><td>{estimateInfo.payment_terms}</td></tr>
              <tr><td className="font-bold py-1">인도조건 :</td><td>{estimateInfo.incoterms}</td></tr>
              <tr><td className="font-bold py-1">납기일 :</td><td>{estimateInfo.delivery_period}</td></tr>
              <tr><td className="font-bold py-1">유효기간 :</td><td>{estimateInfo.validity}</td></tr>
              <tr><td className="font-bold py-1 align-top">비 고 :</td><td className="whitespace-pre-wrap">{estimateInfo.note}</td></tr>
            </tbody>
          </table>
        </div>
        <div className={`flex-1 border ${borderClass} p-3`}>
          <h3 className="font-bold mb-2 border-b border-gray-300 pb-1 text-blue-800">🏦 입금 계좌 정보 (Bank Info)</h3>
          <div className="space-y-1.5 mt-2">
             <p><span className="inline-block w-16 font-bold text-gray-600">은행명 :</span> IBK 기업은행</p>
             <p><span className="inline-block w-16 font-bold text-gray-600">예금주 :</span> {companyInfo?.name}</p>
             <p><span className="inline-block w-16 font-bold text-gray-600">계좌번호 :</span> <span className="font-bold text-base">123-456-7890</span></p>
             {currency !== 'KRW' && (
               <>
                 <div className="h-px bg-gray-200 my-2"></div>
                 <p><span className="inline-block w-16 font-bold text-gray-600">Swift :</span> IBKOKRSE</p>
               </>
             )}
          </div>
        </div>
      </div>

      {/* 5. 서명란 */}
      <div className="flex justify-between mt-10 pt-4">
        <div className="text-center w-1/3">
          <p className="mb-12">Accepted by Buyer</p>
          <div className="border-t border-black pt-1">Authorized Signature</div>
        </div>
        
        <div className="text-center w-1/3 relative">
          <p className="mb-12">Sincerely yours,</p>
          
          {/* 직인 이미지 */}
          {sealSrc && (
            <img 
              src={sealSrc} 
              alt="Seal" 
              className="absolute top-4 left-1/2 transform -translate-x-1/2 w-20 h-20 object-contain opacity-80 mix-blend-multiply" 
            />
          )}

          <div className="font-bold mb-1">{companyInfo?.name}</div>
          <div className="border-t border-black pt-1">Authorized Signature</div>
        </div>
      </div>

      {estimateInfo.note && (
        <div className="mt-8 text-[10px] text-gray-500">
          * Note: {estimateInfo.note}
        </div>
      )}
    </div>
  );
});

QuotationTemplate.displayName = 'QuotationTemplate';