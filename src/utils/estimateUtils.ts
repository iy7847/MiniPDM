
import { DiscountPolicy } from '../types/estimate';

export const DEFAULT_QUANTITIES = [1, 10, 50, 100, 500, 1000];

// 수량과 난이도에 따른 할인율 계산 (선형 보간)
export const calculateDiscountRate = (policy: DiscountPolicy, difficulty: string, qty: number) => {
    if (!policy) return 100;

    let quantities = DEFAULT_QUANTITIES;
    let rates: number[] | undefined;

    // 동적 구조 분기
    if ('quantities' in policy && 'rates' in policy) {
        const dynPolicy = policy as any;
        quantities = dynPolicy.quantitiesArray ? dynPolicy.quantitiesArray : dynPolicy.quantities;
        rates = dynPolicy.rates[difficulty];
    } else {
        // 기존 레거시 구조 복구
        rates = (policy as any)[difficulty];
    }

    if (!rates || rates.length === 0) return 100;

    if (qty <= quantities[0]) return rates[0];
    if (qty >= quantities[quantities.length - 1]) return rates[rates.length - 1];

    let i = 0;
    while (i < quantities.length - 1 && quantities[i + 1] < qty) {
        i++;
    }

    const x1 = quantities[i];
    const x2 = quantities[i + 1];
    const y1 = rates[i];
    const y2 = rates[i + 1];

    const rate = y1 + (qty - x1) * (y2 - y1) / (x2 - x1);
    return Math.round(rate * 10) / 10;
};
