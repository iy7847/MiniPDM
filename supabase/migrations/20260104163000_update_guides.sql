-- Update Page Guides for Order Detail and Expense Analysis

-- 1. Order Detail (Update existing)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'order-detail',
    '# 수주 상세 (Order Detail)

접수된 주문건의 진행 상황을 관리하고 생산에 필요한 도구를 제공합니다.

### 1. 기본 정보 및 파일
- **PO No / 납기일**: 고객사 주문 번호와 최종 납기일을 관리합니다.
- **발주서(PO) 파일**: 고객이 보낸 발주서 PDF를 드래그하여 업로드하고 조회할 수 있습니다.

### 2. 품목 및 생산 관리 도구
- **생산 라벨 (Label)**: 
    - 각 품목의 QR/바코드 라벨을 인쇄합니다. 
    - **수량 분할**: 수량이 여러 개인 경우 "1/3, 2/3..." 형식으로 나누어 출력할 수 있습니다.
- **PDF 분할/마킹**: 
    - 도면 파일을 미리보면서 업체명 등을 가리는 **마킹(Masking)** 기능을 사용할 수 있습니다.
    - 여러 장의 도면이 묶인 PDF를 페이지별로 나누어 저장하는 **PDF 분할** 기능을 지원합니다.
- **엑셀 붙여넣기**: 엑셀에서 복사한 데이터를 붙여넣어 수량, 단가 등을 일괄 수정할 수 있습니다.

### 3. 일괄 작업
- **일괄 납기 적용**: 여러 품목을 선택하여 납기일을 한 번에 변경합니다.
- **번호 생성**: 품목별 관리 번호(Order Item No)를 규칙에 따라 자동 부여합니다.

### 4. 진행 상태 (Workflow)
- **대기** ➡️ **진행 중** ➡️ **완료** ➡️ **출고**
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();

-- 2. Expense Analysis (New)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'expense-analysis',
    '# 지출/원가 예상 (Expense Analysis)

출하된 품목의 **견적 원가(Estimated Cost)**를 기반으로 예상 지출을 산출하고 분석하는 페이지입니다.

### 1. 개요 및 데이터 기준
- **데이터 소스**: 수주(Order) 단계에서 연결된 **견적서(Estimate)의 단가 정보**를 사용합니다.
- **주의사항**: 실제 매입 단가가 아닌, 견적 작성 시점의 예상 원가(Estimated Cost)를 기준으로 계산됩니다. 따라서 실제 지출과는 차이가 있을 수 있습니다.

### 2. 주요 기능
- **기간 설정 (Period)**: 출하일(Shipment Date)을 기준으로 데이터를 필터링합니다. 기본적으로 ''이번 달'' 데이터가 표시됩니다.
- **거래처 필터 (Client)**: 특정 거래처의 지출 내역만 모아서 볼 수 있습니다.
- **보기 방식 (Group By)**: 
    - **목록(List)**: 개별 출하 건별로 상세 내역을 봅니다.
    - **주간/월간/연간**: 기간별로 합계 금액을 그룹화하여 차트와 함께 지출 추이를 확인합니다.

### 3. 상세 내역 및 합계
- **선택 합계**: 목록에서 품목을 체크하면 우측 상단 카드의 **[선택 합계]** 금액이 실시간으로 업데이트됩니다. 특정 건들의 합계를 빠르게 계산할 때 유용합니다.
- **원가 구성**:
    - **소재비(Material)**: 견적서의 예상 소재 단가 × 수량
    - **후처리비(Processing)**: 견적서의 예상 후처리 단가 × 수량
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();

-- 3. Shipments (New)
INSERT INTO public.page_guides (page_key, content)
VALUES (
    'shipments',
    '# 출하 관리 (Shipments)

등록된 출하 내역을 품목 단위로 조회하고 라벨을 출력하는 페이지입니다.

### 1. 조회 및 필터
- **기간/거래처**: 원하는 기간과 거래처를 선택하여 출하 내역을 필터링합니다.
- **상태 필터**: 정상 출하된 건과 취소된 건을 구분하여 볼 수 있습니다.

### 2. 라벨 출력 (Label Printing)
- 목록에서 원하는 품목들을 **체크박스**로 선택합니다.
- 상단의 **라벨 인쇄** 버튼을 클릭합니다.
- **옵션**:
    - **라벨 크기**: 중형 (기본) 또는 소형을 선택할 수 있습니다.
    - **수량 분할**: "1/N" 형식으로 수량을 나누어 여러 장 출력할 수 있습니다. (예: 수량 100개를 1/2, 2/2로 50개씩 출력)

### 3. 출하 정보 수정
- **날짜 변경**: 출하일을 잘못 입력한 경우 수정할 수 있습니다.
- **출하 취소**: 출하 등록을 취소하여 다시 "완료" 상태로 되돌립니다. (재고 복구)
'
)
ON CONFLICT (page_key) 
DO UPDATE SET 
    content = EXCLUDED.content,
    updated_at = now();
