import { useState, useEffect } from 'react';

/**
 * 컴포넌트 마운트/언마운트 시 상태를 안전하게 sessionStorage에 보존하고 불러오는 훅입니다.
 * T 제네릭 타입으로 상태의 형태를 지정하며, 동일한 key 값을 가진 페이지끼리는 상태를 공유/보존합니다.
 * @param key sessionStorage에 저장될 고유 식별자 (예: 'estimates_filters')
 * @param initialState sessionStorage에 데이터가 없을 때 사용할 기본값
 */
export function usePreservedState<T>(key: string, initialState: T): [T, (state: T | ((prevState: T) => T)) => void, () => void] {
    // 초기화 함수: sessionStorage에 데이터가 있으면 파싱해서 가져오고, 없으면 initialState 사용
    const getInitialState = (): T => {
        try {
            const item = sessionStorage.getItem(key);
            if (item) {
                // 날짜 객체 등 JSON 직렬화에서 손실될 수 있는 복잡한 타입은 호출부에서 적절히 파싱을 고려해야 함
                return JSON.parse(item) as T;
            }
        } catch (e) {
            console.warn(`[usePreservedState] Failed to parse stored state for key "${key}":`, e);
        }
        return initialState;
    };

    const [state, setState] = useState<T>(getInitialState);

    // state가 변경될 때마다 sessionStorage에 저장 (Debounce 없이 즉시 저장)
    useEffect(() => {
        try {
            sessionStorage.setItem(key, JSON.stringify(state));
        } catch (e) {
            console.warn(`[usePreservedState] Failed to save state to sessionStorage for key "${key}":`, e);
        }
    }, [key, state]);

    // 명시적 초기화를 위한 리셋 함수
    const resetState = () => {
        try {
            sessionStorage.removeItem(key);
        } catch (e) {
            console.warn(`[usePreservedState] Failed to remove state from sessionStorage for key "${key}":`, e);
        }
        setState(initialState);
    };

    return [state, setState, resetState];
}
