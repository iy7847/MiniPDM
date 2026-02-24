import { useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData
} from 'chart.js';
import { Line } from 'react-chartjs-2';
// @ts-ignore
import * as pluginDragData from 'chartjs-plugin-dragdata';
// @ts-ignore
import zoomPlugin from 'chartjs-plugin-zoom';

import { DiscountPolicy } from '../../types/estimate';
import { DEFAULT_QUANTITIES } from '../../utils/estimateUtils';

// Chart.js 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  pluginDragData,
  zoomPlugin
);

const DIFFICULTIES = ['A', 'B', 'C', 'D', 'E', 'F'];

// 색상 정의
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#64748b'];

export const DEFAULT_POLICY: Record<string, number[]> = {
  'A': [100, 90, 80, 70, 60, 50],
  'B': [100, 92, 84, 76, 68, 60],
  'C': [100, 94, 88, 82, 76, 70],
  'D': [100, 96, 92, 88, 84, 80],
  'E': [100, 98, 96, 94, 92, 90],
  'F': [100, 99, 98, 97, 96, 95],
};

interface DiscountPolicyChartProps {
  policyData: DiscountPolicy;
  onChange: (newPolicy: DiscountPolicy) => void;
}

export function DiscountPolicyChart({ policyData, onChange }: DiscountPolicyChartProps) {
  const chartRef = useRef<any>(null);

  // 동적/레거시 데이터 파싱 로직
  const isDynamic = policyData && 'quantities' in policyData;
  const dynPolicy = policyData as any;
  const quantities: number[] = isDynamic ? (dynPolicy.quantities || DEFAULT_QUANTITIES) : DEFAULT_QUANTITIES;
  const ratesObj: Record<string, number[]> = isDynamic ? dynPolicy.rates : (policyData as any);

  // 필터 상태 관리
  const [visibleDatasets, setVisibleDatasets] = useState<Record<string, boolean>>({
    'A': true, 'B': true, 'C': true, 'D': true, 'E': true, 'F': true
  });

  const toggleVisibility = (grade: string) => {
    setVisibleDatasets(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const currentMaxX = quantities.length > 0 ? quantities[quantities.length - 1] * 1.05 : 1000;

  const data: ChartData<'line'> = {
    labels: quantities,
    datasets: DIFFICULTIES.map((grade, index) => {
      const arr = ratesObj[grade] || DEFAULT_POLICY[grade];
      return {
        label: `난이도 ${grade}`,
        data: arr.map((y, i) => ({
          x: quantities[i],
          y: y
        })),
        borderColor: COLORS[index],
        backgroundColor: 'white',
        pointRadius: 6,
        pointHoverRadius: 8,
        tension: 0.4,
        cubicInterpolationMode: 'monotone',
        fill: false,
        hidden: !visibleDatasets[grade],
      }
    }),
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        onClick: (_e: any, legendItem: any) => {
          const grade = DIFFICULTIES[legendItem.datasetIndex];
          toggleVisibility(grade);
        }
      },
      title: {
        display: true,
        text: '수량별 단가 적용률 정책 (부드러운 곡선)',
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x',
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true
          },
          mode: 'x',
        }
      },
      dragData: {
        round: 1,
        showTooltip: true,
        dragX: false,
        dragY: true,
        onDrag: (_e: any) => {
          if (_e.target) {
            _e.target.style.cursor = 'grabbing';
          }
        },
        onDragEnd: (e: any, datasetIndex: number, index: number, value: any) => {
          e.target.style.cursor = 'default';

          const grade = DIFFICULTIES[datasetIndex];
          const currentArr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];

          let yValue = (typeof value === 'object' && value !== null) ? value.y : value;
          yValue = Number(yValue) || 0;

          // 값 제한 로직
          const prevVal = index > 0 ? currentArr[index - 1] : 100;
          const nextVal = index < currentArr.length - 1 ? currentArr[index + 1] : 0;

          const adjustedValue = Math.round(Math.max(nextVal, Math.min(prevVal, yValue)) * 10) / 10;

          currentArr[index] = adjustedValue;

          const newRatesObj = { ...ratesObj };
          newRatesObj[grade] = currentArr;
          onChange({
            quantities: quantities,
            rates: newRatesObj
          });
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        title: { display: true, text: '단가 적용률 (%)' },
      },
      x: {
        type: 'linear',
        title: { display: true, text: '주문 수량 (EA)' },
        min: 0,
        max: currentMaxX,
      }
    },
  };

  const handleTableInputChange = (grade: string, index: number, val: string) => {
    const numericValue = parseFloat(val);
    if (isNaN(numericValue)) return;

    const currentArr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];

    // Limits
    const prevVal = index > 0 ? currentArr[index - 1] : 100;
    const nextVal = index < currentArr.length - 1 ? currentArr[index + 1] : 0;

    const safeValue = Math.max(nextVal, Math.min(prevVal, numericValue));
    currentArr[index] = safeValue;

    const newRatesObj = { ...ratesObj };
    newRatesObj[grade] = currentArr;

    onChange({ quantities, rates: newRatesObj });
  };

  const handleQuantityChange = (index: number, val: string) => {
    const numericValue = parseInt(val, 10);
    if (isNaN(numericValue) || numericValue < 1) return;

    const newQuantities = [...quantities];

    const prevVal = index > 0 ? newQuantities[index - 1] : 0;
    const nextVal = index < newQuantities.length - 1 ? newQuantities[index + 1] : Number.MAX_SAFE_INTEGER;

    const safeValue = Math.max(prevVal + 1, Math.min(nextVal - 1, numericValue));
    newQuantities[index] = safeValue;

    onChange({ quantities: newQuantities, rates: ratesObj });
  };

  const handleAddQuantity = () => {
    const newQuantities = [...quantities];
    const lastQty = quantities.length > 0 ? quantities[quantities.length - 1] : 0;

    let nextQty = lastQty;
    if (lastQty >= 1000) nextQty += 1000;
    else if (lastQty >= 100) nextQty += 100;
    else if (lastQty >= 10) nextQty += 10;
    else nextQty += 1;

    newQuantities.push(nextQty);

    const newRatesObj = { ...ratesObj };
    DIFFICULTIES.forEach(grade => {
      const arr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];
      const lastRate = arr.length > 0 ? arr[arr.length - 1] : 100;
      arr.push(lastRate);
      newRatesObj[grade] = arr;
    });

    onChange({ quantities: newQuantities, rates: newRatesObj });
  };

  const handleRemoveQuantity = (index: number) => {
    if (quantities.length <= 2) {
      alert('최소 2개의 수량 기준이 필요합니다.');
      return;
    }

    const newQuantities = [...quantities];
    newQuantities.splice(index, 1);

    const newRatesObj = { ...ratesObj };
    DIFFICULTIES.forEach(grade => {
      const arr = [...(ratesObj[grade] || DEFAULT_POLICY[grade])];
      arr.splice(index, 1);
      newRatesObj[grade] = arr;
    });

    onChange({ quantities: newQuantities, rates: newRatesObj });
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* 1. 컨트롤 패널 */}
      <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded border border-slate-200">
        <span className="text-xs font-bold text-slate-500 flex items-center mr-2">난이도 필터:</span>
        {DIFFICULTIES.map((grade, idx) => (
          <button
            key={grade}
            onClick={() => toggleVisibility(grade)}
            className={`
              px-3 py-1 text-xs font-bold rounded border transition-all
              ${visibleDatasets[grade]
                ? 'bg-white text-slate-700 border-slate-300 shadow-sm'
                : 'bg-slate-100 text-slate-300 border-slate-100'
              }
            `}
            style={{
              borderColor: visibleDatasets[grade] ? COLORS[idx] : undefined,
              color: visibleDatasets[grade] ? COLORS[idx] : undefined
            }}
          >
            {visibleDatasets[grade] ? `✔ ${grade}` : grade}
          </button>
        ))}
        <button
          onClick={() => setVisibleDatasets({ 'A': true, 'B': true, 'C': true, 'D': true, 'E': true, 'F': true })}
          className="ml-auto text-xs text-brand-600 hover:text-brand-700 font-bold hover:underline"
        >
          모두 보기
        </button>
      </div>

      <div className="flex flex-col gap-6">
        {/* 2. 그래프 영역 */}
        <div className="w-full h-[450px] bg-white p-4 rounded-3xl border border-slate-200 relative shadow-inner">
          <Line ref={chartRef} data={data} options={options} />
          <p className="text-[11px] text-slate-400 text-center mt-3 font-medium">
            * 마우스 휠: <strong>확대/축소</strong> | 드래그: <strong>점 이동으로 값 조정</strong> (좌측값 ≤ 현재값 ≤ 우측값 제한)
          </p>
        </div>

        {/* 3. 데이터 동기화 테이블 영역 */}
        <div className="w-full bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 p-3 text-center text-xs font-black text-slate-600 uppercase tracking-widest">
            수량 및 단가 적용률 상세 (직접 입력)
          </div>
          <div className="flex-1 overflow-x-auto p-4">
            <table className="w-full text-xs text-left border-collapse min-w-[300px]">
              <thead>
                <tr>
                  <th className="font-black text-slate-500 pb-3 border-b-2 border-slate-100 whitespace-nowrap text-center">난이도&nbsp; \ &nbsp;수량</th>
                  {quantities.map((qty, i) => (
                    <th key={i} className="pb-3 border-b-2 border-slate-100 text-center relative px-1 group">
                      <div className="flex items-center justify-center">
                        <input
                          type="number"
                          className="w-14 text-center font-black text-brand-700 bg-brand-50 border border-brand-200 rounded px-1 py-1 text-xs focus:ring-1 focus:ring-brand-500 outline-none"
                          value={qty}
                          onChange={(e) => handleQuantityChange(i, e.target.value)}
                        />
                        <span className="text-[9px] text-slate-400 ml-1">ea</span>
                      </div>
                      <button
                        onClick={() => handleRemoveQuantity(i)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-100 text-red-500 rounded-full flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                        title="이 수량 기준 삭제"
                      >
                        ×
                      </button>
                    </th>
                  ))}
                  <th className="pb-3 border-b-2 border-slate-100 text-center align-bottom px-2">
                    <button
                      onClick={handleAddQuantity}
                      className="w-7 h-7 bg-slate-100 hover:bg-brand-50 text-slate-400 hover:text-brand-600 rounded-full flex items-center justify-center font-bold text-lg transition-colors border border-dashed border-slate-300 hover:border-brand-300"
                      title="수량 기준 추가"
                    >
                      +
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {DIFFICULTIES.map((grade, rIdx) => {
                  const isVisible = visibleDatasets[grade];
                  const arr = ratesObj[grade] || DEFAULT_POLICY[grade];
                  return (
                    <tr key={grade} className={`transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-30'}`}>
                      <td className="py-2 border-b border-slate-50 text-center">
                        <span
                          className="inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-white"
                          style={{ backgroundColor: COLORS[rIdx] }}
                        >
                          {grade}
                        </span>
                      </td>
                      {arr.map((val, cIdx) => (
                        <td key={cIdx} className="py-2 border-b border-slate-50 text-center px-1">
                          <div className="flex items-center justify-center">
                            <input
                              type="number"
                              step="0.1"
                              className="w-14 text-center font-bold text-slate-700 bg-white border border-slate-200 rounded px-1 py-1 text-xs focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none transition-all hover:bg-slate-50"
                              value={val}
                              onChange={(e) => handleTableInputChange(grade, cIdx, e.target.value)}
                              disabled={!isVisible}
                            />
                            <span className="text-[9px] text-slate-400 ml-1">%</span>
                          </div>
                        </td>
                      ))}
                      <td className="border-b border-slate-50"></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}