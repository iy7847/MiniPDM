import React, { useState, useEffect } from 'react';

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (value: number) => void;
  label?: string;
}

export function NumberInput({ value, onChange, label, className = '', ...props }: NumberInputProps) {
  // [헬퍼] 숫자 문자열에 콤마 찍기 (소수점 유지)
  const formatString = (str: string) => {
    if (!str) return '';
    const parts = str.split('.');
    // 정수부에만 콤마 적용
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  // [헬퍼] 콤마 제거
  const parseString = (str: string) => str.replace(/,/g, '');

  const [displayValue, setDisplayValue] = useState('');

  // 1. 외부 value가 변경되면 화면 값 동기화
  useEffect(() => {
    // 현재 화면에 표시된 값의 숫자적 의미와 부모가 준 값이 다를 때만 업데이트
    // (예: 부모가 1000을 줬는데 화면에 이미 "1,000." 이라고 점을 찍고 있다면 건드리지 않음)
    const currentNum = parseFloat(parseString(displayValue));
    const newNum = Number(value);

    if (currentNum !== newNum) {
      if (value === 0 || value === '0') {
        // 0일 때 빈칸으로 할지 '0'으로 할지 결정 (여기선 '0')
        setDisplayValue('0');
      } else if (!value) {
        setDisplayValue('');
      } else {
        setDisplayValue(Number(value).toLocaleString(undefined, { maximumFractionDigits: 10 }));
      }
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    
    // 유효성 검사
    if (!/^[0-9.,-]*$/.test(raw)) return;

    // 콤마 제거한 순수 숫자 문자열
    const clean = parseString(raw);

    // 2. 화면에는 즉시 포맷팅해서 보여줌 (입력 반응성)
    const formatted = formatString(clean);
    setDisplayValue(formatted);

    // 3. 부모에게는 숫자로 변환해서 전달
    if (clean === '' || clean === '.' || clean === '-') {
      onChange(0);
    } else {
      const num = parseFloat(clean);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>}
      <input
        type="text"
        value={displayValue}
        onChange={handleChange}
        className={`border p-2 rounded text-sm w-full text-right font-mono outline-none transition-all focus:ring-2 focus:ring-blue-500 ${className}`}
        autoComplete="off"
        {...props}
      />
    </div>
  );
}