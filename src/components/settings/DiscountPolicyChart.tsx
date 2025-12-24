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
const QUANTITIES = [1, 10, 50, 100, 500, 1000]; 

// 색상 정의
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#64748b'];

export const DEFAULT_POLICY = {
  'A': [100, 90, 80, 70, 60, 50],
  'B': [100, 92, 84, 76, 68, 60],
  'C': [100, 94, 88, 82, 76, 70],
  'D': [100, 96, 92, 88, 84, 80],
  'E': [100, 98, 96, 94, 92, 90],
  'F': [100, 99, 98, 97, 96, 95],
};

interface DiscountPolicyChartProps {
  policyData: Record<string, number[]>;
  onChange: (newPolicy: Record<string, number[]>) => void;
}

export function DiscountPolicyChart({ policyData, onChange }: DiscountPolicyChartProps) {
  const chartRef = useRef<any>(null);
  
  // 필터 상태 관리
  const [visibleDatasets, setVisibleDatasets] = useState<Record<string, boolean>>({
    'A': true, 'B': true, 'C': true, 'D': true, 'E': true, 'F': true
  });

  const toggleVisibility = (grade: string) => {
    setVisibleDatasets(prev => ({ ...prev, [grade]: !prev[grade] }));
  };

  const data: ChartData<'line'> = {
    labels: QUANTITIES,
    datasets: DIFFICULTIES.map((grade, index) => ({
      label: `난이도 ${grade}`,
      data: (policyData[grade] || DEFAULT_POLICY[grade as keyof typeof DEFAULT_POLICY]).map((y, i) => ({
        x: QUANTITIES[i],
        y: y
      })),
      borderColor: COLORS[index],
      backgroundColor: 'white',
      pointRadius: 6,
      pointHoverRadius: 8,
      // [수정] 부드러운 곡선 적용 (오버슈트 방지)
      tension: 0.4, 
      cubicInterpolationMode: 'monotone', 
      fill: false,
      hidden: !visibleDatasets[grade], 
    })),
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
          const currentArr = [...(policyData[grade] || DEFAULT_POLICY[grade as keyof typeof DEFAULT_POLICY])];
          
          let yValue = (typeof value === 'object' && value !== null) ? value.y : value;
          yValue = Number(yValue) || 0;

          // 값 제한 로직
          const prevVal = index > 0 ? currentArr[index - 1] : 100;
          const nextVal = index < currentArr.length - 1 ? currentArr[index + 1] : 0;

          const adjustedValue = Math.max(nextVal, Math.min(prevVal, yValue));
          
          currentArr[index] = adjustedValue;
          
          const newPolicy = { ...policyData };
          newPolicy[grade] = currentArr;
          onChange(newPolicy);
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
        max: 1000, 
      }
    },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-4 p-2 bg-slate-50 rounded border border-slate-200">
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
          className="ml-auto text-xs text-blue-500 hover:underline"
        >
          모두 보기
        </button>
      </div>

      <div className="w-full h-[400px] bg-white p-4 rounded border border-slate-200 relative">
        <Line ref={chartRef} data={data} options={options} />
        <p className="text-xs text-slate-400 text-center mt-2">
          * 마우스 휠: <strong>확대/축소</strong> | 드래그: <strong>값 조정</strong> (좌측값 ≤ 현재값 ≤ 우측값 제한)
        </p>
      </div>
    </div>
  );
}