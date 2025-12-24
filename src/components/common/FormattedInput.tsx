import React, { useState, useEffect } from 'react';

type InputType = 'text' | 'biz_num' | 'phone' | 'email';

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  type?: InputType;
  value: string;
  onChange: (value: string) => void;
}

// 숫자만 추출
const onlyNumbers = (str: string) => str ? str.replace(/[^0-9]/g, '') : '';

// 포맷팅 로직
const formatValue = (val: string, type: InputType): string => {
  if (!val) return '';
  
  // 입력된 값에서 숫자만 추출하여 다시 포맷팅 (입력 편의성)
  if (type === 'biz_num') {
    const num = onlyNumbers(val);
    if (num.length <= 3) return num;
    if (num.length <= 5) return `${num.slice(0, 3)}-${num.slice(3)}`;
    return `${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5, 10)}`;
  } 
  
  if (type === 'phone') {
    const num = onlyNumbers(val);
    if (num.startsWith('02')) { 
      if (num.length <= 2) return num;
      if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
      if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
      return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
    } else {
      if (num.length <= 3) return num;
      if (num.length <= 7) return `${num.slice(0, 3)}-${num.slice(3)}`;
      if (num.length <= 11) return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7)}`;
      return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
    }
  }

  return val; 
};

export function FormattedInput({ label, type = 'text', value, onChange, className = '', ...props }: FormattedInputProps) {
  const [displayValue, setDisplayValue] = useState('');

  // 1. 외부 value 변경 시 동기화
  useEffect(() => {
    // 부모 값이 변경되면 화면도 갱신 (단, 타입에 따라 포맷팅 적용)
    if (type === 'text' || type === 'email') {
      setDisplayValue(value || '');
    } else {
      setDisplayValue(formatValue(value || '', type));
    }
  }, [value, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    if (type === 'text' || type === 'email') {
        // 일반 텍스트는 그대로 반영
        setDisplayValue(rawVal);
        onChange(rawVal);
    } else {
        // 포맷팅이 필요한 경우:
        // 1. 입력값에서 숫자만 추출해서 다시 포맷팅 (실시간 적용)
        const clean = onlyNumbers(rawVal);
        const formatted = formatValue(clean, type);
        
        // 2. 화면과 부모 데이터 모두 업데이트
        setDisplayValue(formatted);
        onChange(formatted);
    }
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>}
      <input
        type={type === 'email' ? 'email' : 'text'}
        value={displayValue}
        onChange={handleChange}
        className={`border p-2 rounded text-sm w-full outline-none transition-all focus:ring-2 focus:ring-blue-500 ${className}`}
        autoComplete="off"
        {...props}
      />
    </div>
  );
}