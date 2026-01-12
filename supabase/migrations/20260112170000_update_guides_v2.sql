-- Update Page Guides for New Features

-- 1. Materials (Update for Heat Treatments)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'materials',
    '# 자재 관리 (Materials)

제품 생산에 필요한 원자재 및 후처리/열처리 정보를 관리합니다.

### 1. 자재 라이브러리 (Materials)
- 자주 사용하는 원자재의 **Default 단가**와 **비중(Density)**을 등록해 두면 견적 작성 시 자동으로 계산됩니다.
- **비중(Density)**: 중량 계산의 핵심 요소입니다. (예: SUS304 = 7.93, AL6061 = 2.7)

### 2. 후처리 (Post-Processing)
- 아노다이징, 도금 등 후처리 공정의 Kg당 단가를 관리합니다.
- 견적 시 **[중량 × Kg당 단가]** 방식으로 비용이 산출됩니다.

### 3. 열처리 (Heat Treatment) [신규]
- 열처리 공정(예: T6, 침탄 등)과 Kg당 단가를 관리합니다.
- 견적 품목에 열처리를 적용하면 **[중량 × Kg당 열처리 단가]**가 자동 계산되어 원가에 반영됩니다.
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();

-- 2. Estimates (Update for Note field)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'estimates',
    '# 견적 관리 (Estimates)

고객사 프로젝트에 대한 견적서를 작성하고 관리합니다.

### 1. 견적 작성
- **품목 추가**: 도면 파일을 드래그하거나 직접 입력하여 품목을 추가합니다.
- **자동 계산**: 자재/후처리/열처리 정보를 선택하면 소재비와 공정비가 자동 계산됩니다.
- **비고(Note)**: 품목별 특이사항을 기록할 수 있습니다. [신규]

### 2. 문서화 및 공유
- **PDF/Excel 변환**: 작성된 견적서를 고객 제출용 파일로 생성합니다.
- **버전 관리**: 견적 내용이 변경되면 새로운 버전으로 저장하여 이력을 추적할 수 있습니다.
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();

-- 3. Estimate Search (New Guide)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'estimate-search',
    '# 견적 품목 검색 (Estimate Search)

과거에 작성했던 모든 견적 품목을 조건별로 검색하고 재활용할 수 있는 페이지입니다.

### 1. 강력한 검색 기능
- **통합 검색**: 품번, 품명, 비고(Note) 내용을 키워드로 검색합니다.
- **크기 검색**: 제품 크기(가로/세로/두께)와 **오차 범위(±)**를 지정하여 유사한 크기의 제품을 찾을 수 있습니다.

### 2. 상세 정보 및 파일
- **상세 보기**: 목록을 클릭하면 견적 당시의 단가 산출 내역(소재비, 공정비 등)을 즉시 확인할 수 있습니다.
- **도면 파일**: 해당 품목에 첨부됐던 도면 파일을 바로 열어볼 수 있습니다.
- **상태 필터**: 견적 상태(작성중, 발송됨 등)에 따라 필터링하여 유효한 데이터만 조회할 수 있습니다.
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();

-- 4. Orders (Update for Search)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'orders',
    '# 수주 관리 (Orders)

확정된 주문을 등록하고 납기 및 출하를 관리합니다.

### 1. 검색 및 조회
- **기간 조회**: 주문 일자를 기준으로 내역을 조회합니다.
- **키워드 검색**: **PO 번호** 또는 **거래처명**으로 빠르게 주문을 찾을 수 있습니다.

### 2. 주문 진행
- **견적 연동**: "견적 불러오기"를 통해 기존 견적 내용을 그대로 수주로 변환합니다.
- **상태 변경**: 작업 대기 ➡️ 진행 중 ➡️ 완료 순으로 생산 흐름을 관리합니다.
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();

-- 5. Expense Analysis (Update for Filters)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'expense-analysis',
    '# 지출/원가 분석 (Expense Analysis)

출하된 품목의 예상 원가를 분석하여 지출 흐름을 파악합니다.

### 1. 상세 필터링 [업데이트]
- **기간 및 거래처**: 기본 조회 조건입니다.
- **다중 선택 필터**: 
    - **소재(Material)**: 특정 재질(예: AL6061, SUS304)만 선택하여 비교합니다.
    - **후처리/열처리**: 특정 공정이 포함된 품목의 비용만 따로 추출할 수 있습니다.
    - 여러 항목을 동시에 선택(Multi-Select)하여 복합적인 분석이 가능합니다.

### 2. 비용 구성
- **소재비**: 예상 소재 원가.
- **후처리비**: 아노다이징 등 표면처리 예상 비용.
- **열처리비**: 열처리 예상 비용 (별도 집계).

### 3. 시각화
- 주간/월간 차트를 통해 비용 지출 추이를 한눈에 파악할 수 있습니다.
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();
