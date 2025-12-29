import React, { useEffect, useRef } from 'react';

type InputType = 'text' | 'biz_num' | 'phone' | 'email';

interface FormattedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  type?: InputType;
  value: string;
  onChange: (value: string) => void;
}

// 숫자만 추출
const onlyNumbers = (str: string) => str ? str.replace(/[^0-9]/g, '') : '';

// 포맷팅 함수
const formatValue = (val: string, type: InputType): string => {
  if (!val) return '';
  
  if (type === 'biz_num') {
    const num = onlyNumbers(val);
    if (num.length <= 3) return num;
    if (num.length <= 5) return `${num.slice(0, 3)}-${num.slice(3)}`;
    return `${num.slice(0, 3)}-${num.slice(3, 5)}-${num.slice(5, 10)}`;
  } 
  
  if (type === 'phone') {
    const num = onlyNumbers(val);
    if (num.startsWith('02')) { 
      // 서울 (02)
      if (num.length <= 2) return num;
      if (num.length <= 5) return `${num.slice(0, 2)}-${num.slice(2)}`;
      if (num.length <= 9) return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
      return `${num.slice(0, 2)}-${num.slice(2, 6)}-${num.slice(6, 10)}`;
    } else {
      // 그 외 (010, 031, 032 등)
      if (num.length <= 3) return num;
      if (num.length <= 6) return `${num.slice(0, 3)}-${num.slice(3)}`;
      
      // [수정] 10자리일 때는 3-3-4 포맷 적용 (예: 031-353-4521)
      if (num.length === 10) return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
      
      // 11자리 이상일 때는 3-4-4 포맷 적용 (예: 010-1234-5678)
      return `${num.slice(0, 3)}-${num.slice(3, 7)}-${num.slice(7, 11)}`;
    }
  }

  return val; 
};

export function FormattedInput({ label, type = 'text', value, onChange, className = '', ...props }: FormattedInputProps) {
  // React State 대신 DOM 요소에 직접 접근하기 위한 Ref
  const inputRef = useRef<HTMLInputElement>(null);
  // 내부 포커스 상태 추적 (React 렌더링과 무관하게 동작)
  const isFocusedRef = useRef(false);

  // [핵심] 부모의 value가 바뀌면, '입력 중이 아닐 때만' DOM 값을 직접 수정
  useEffect(() => {
    // 1. 현재 이 input이 진짜로 포커스를 갖고 있는지 브라우저에게 직접 확인
    const isActuallyFocused = document.activeElement === inputRef.current;
    
    // 2. 실제 상태와 Ref 동기화
    isFocusedRef.current = isActuallyFocused;

    // 3. 포커스가 없을 때만 값 강제 동기화
    if (inputRef.current && !isActuallyFocused) {
      const nextValue = formatValue(value || '', type);
      // 값이 다를 때만 업데이트 (커서 튐 방지)
      if (inputRef.current.value !== nextValue) {
        inputRef.current.value = nextValue;
      }
    }
  }, [value, type]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    // 부모에게 값 전달 (State 업데이트 요청)
    if (type === 'text' || type === 'email') {
        onChange(rawVal);
    } else {
        // 포맷팅 적용 값을 부모에게 전달
        // 입력 중에는 포맷팅을 강제하지 않아도, onChange를 통해 부모에게는 올바른 포맷으로 전달됨
        const formatted = formatValue(rawVal, type);
        onChange(formatted);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = true;
    
    // 포커스 시 포맷 제거 (숫자만 표시하여 수정 용이하게)
    if (inputRef.current && (type === 'biz_num' || type === 'phone')) {
        inputRef.current.value = onlyNumbers(value);
    }
    
    if (props.onFocus) props.onFocus(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    isFocusedRef.current = false;
    
    // 포커스 해제 시 다시 예쁘게 포맷팅
    if (inputRef.current) {
        const currentVal = inputRef.current.value;
        const formatted = formatValue(currentVal, type);
        inputRef.current.value = formatted;
        
        // 최종 값 동기화
        if (formatted !== value) {
            onChange(formatted);
        }
    }
    
    if (props.onBlur) props.onBlur(e);
  };

  return (
    <div className="w-full">
      {label && <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>}
      <input
        ref={inputRef} 
        type={type === 'email' ? 'email' : 'text'}
        defaultValue={formatValue(value, type)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={`border p-2 rounded text-sm w-full outline-none transition-all focus:ring-2 focus:ring-blue-500 ${className}`}
        autoComplete="off"
        {...props}
      />
    </div>
  );
}