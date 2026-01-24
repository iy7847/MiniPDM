# 중량(Weight) 및 스케일링 로직

이 문서는 MiniPDM에서 사용되는 중량(질량) 계산 공식과 관련 비용 산출 로직을 설명합니다.

## 개요
중량은 다음 비용을 계산하는 데 있어 핵심적인 요소입니다:
1.  **소재비 (Material Cost)**: 주로 kg당 또는 단위당 단가.
2.  **열처리비 (Heat Treatment Cost)**.
3.  **후처리비 (Post Processing Cost)**: 아노다이징, 도금 등.

## 중량 계산 공식

중량은 품목의 **형상(Shape)**, **치수(Dimensions)**, **소재 비중(Density)**을 기반으로 계산됩니다.
참고: 치수(`raw_w`, `raw_d`, `raw_h`)는 일반적으로 밀리미터(mm) 단위입니다.

### 1. 사각 (Rectangular)
`shape === 'rect'`일 때 사용됩니다.

```typescript
중량 (kg) = (가로 * 세로 * 두께 * 비중) / 1,000,000
// Weight (kg) = (Width * Depth * Height * Density) / 1,000,000
```
*   `가로(Width)` (`raw_w`): mm 단위.
*   `세로(Depth)` (`raw_d`): 길이/깊이, mm 단위.
*   `두께(Height)` (`raw_h`): 높이/두께, mm 단위.
*   `비중(Density)`: 소재의 비중 (예: SUS304의 경우 7.93).

### 2. 원형 (Round)
`shape === 'round'`일 때 사용됩니다.

```typescript
반지름 (Radius) = 지름 (Width) / 2
중량 (kg) = (π * 반지름^2 * 길이 * 비중) / 1,000,000
// Weight (kg) = (Math.PI * (Width/2)^2 * Depth * Density) / 1,000,000
```
*   `지름(Width)` (`raw_w`): 직경(Ø), mm 단위.
*   `길이(Depth)` (`raw_d`): mm 단위.

## 비용 계산

### 열처리비 (Heat Treatment Cost)
중량을 기준으로 계산됩니다.
```typescript
금액 = 열처리_kg당_단가 * 중량
// Cost = HeatTreatment_UnitPrice_Per_Kg * Weight
```

### 후처리비 (Post Processing Cost)
중량을 기준으로 계산됩니다.
```typescript
금액 = 후처리_kg당_단가 * 중량
// Cost = PostProcessing_UnitPrice_Per_Kg * Weight
```

## 구현 상세
*   **프론트엔드**: `useEstimateLogic.ts`(저장/업데이트 시) 및 `EstimateTable.tsx`(화면 표시 시)에서 실시간으로 계산됩니다.
*   **데이터베이스**:
    *   `materials` 테이블: `density` (비중) 저장.
    *   `heat_treatments`, `post_processings` 테이블: `price_per_kg` (kg당 단가) 저장.
    *   `estimate_items` 테이블: 치수(`spec_w`, `spec_d`, `spec_h`) 및 계산된 비용 저장.
