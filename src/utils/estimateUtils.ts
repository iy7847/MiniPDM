
export const QUANTITIES = [1, 10, 50, 100, 500, 1000];

export const calculateDiscountRate = (policy: any, difficulty: string, qty: number) => {
    if (!policy || !policy[difficulty]) return 100;
    const rates = policy[difficulty];
    if (!rates || rates.length === 0) return 100;

    if (qty <= QUANTITIES[0]) return rates[0];
    if (qty >= QUANTITIES[QUANTITIES.length - 1]) return rates[rates.length - 1];

    let i = 0;
    while (i < QUANTITIES.length - 1 && QUANTITIES[i + 1] < qty) {
        i++;
    }

    const x1 = QUANTITIES[i];
    const x2 = QUANTITIES[i + 1];
    const y1 = rates[i];
    const y2 = rates[i + 1];

    const rate = y1 + (qty - x1) * (y2 - y1) / (x2 - x1);
    return Math.round(rate * 10) / 10;
};
