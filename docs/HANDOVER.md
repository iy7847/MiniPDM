# 프로젝트 인계 문서 (Project Handover Document)

**프로젝트**: MiniPDM (제조업체를 위한 개인 데이터 관리 시스템)
**최종 업데이트**: 2026-02-24
**현재 버전**: v0.3.0

---

## 🚀 현황 요약 및 핵심 분석 (v0.3.0)

### 1. 주요 기능 및 최근 변경 사항
*   **견적 관리**: 견적 상세 모달 내 소재 (비용) 분류 필터 (카테고리 콤보박스) 도입 및 수량 필드 동적 수정(단가 실시간 재계산) 기능 추가.
*   **환경 설정 (재무)**: 이윤(%) 증감 단위(Step) 설정 추가 및 관련 입력 UI들의 가시성/일관성 대폭 개선.
*   **생산 및 출하**: 생산 목록에서 '소재 발주서 엑셀 내보내기' 추가, 생산 완료 비고란 출하 리스트 연동, 사이드바 디자인/시인성 최신화.

### 2. 핵심 비즈니스 로직 (중량 및 비용 계산)
*   **사각(Rect)**: `(Width * Depth * Height * Density) / 1,000,000`
*   **원형(Round)**: `(PI * (Width/2)^2 * Depth * Density) / 1,000,000`
*   **비용 산출**: `중량 * kg당 단가` (열처리, 후처리 공통)

### 3. 향후 개선 과제
*   **코드 품질 개선 (3단계 계획 중)**: 대형 파일 분리 리팩토링 (`useEstimateLogic.ts`, `ShipmentList.tsx`, `Settings.tsx`), 문서 정합성 수정, `src/assetsassets` 오타 수정 (task.md 참조).
*   **패턴 확산**: `OrderDetail.tsx`의 Hook/Modal 분리 패턴을 타 페이지에도 적용.
*   **재고 관리**: 출하 내역과 연동된 실제 재고 관리 기능 구현 (기획 중).
*   **보안 배포 체계**: B2B 판매를 위한 비공개 배포 시스템 구축 (아래 전략 참조).

> **2026-02-24 완료**: 견적서, 수주/생산/출하의 상태 탭 기본값 및 순서 정렬 최적화, 재질/분류명 코드 표기 통일. 사이드바 및 환경설정 다크테마 시인성/디자인 버그 수정 후 v0.3.0 정식 릴리즈.

---

## 🔐 B2B 보안 배포 전략 (향후 과제)

현재의 공개 배포 방식을 보완하고 기업 판매 신뢰도를 높이기 위한 로드맵입니다.

### 1단계: 소스 코드 및 배포 비공개화 (즉시 가능)
*   **방법**: GitHub 리포지토리 상태를 `Public` → `Private`으로 전환.
*   **효과**: 외부인의 소스 코드 접근 및 Releases 파일 다운로드를 원천 차단.
*   **운영**: 초기 고객사 대응 시 GitHub Collaborator로 초대하여 수동 배포 지원.

### 2단계: 전문 보안 배포 인프라 구축 (추천)
*   **방안 A: Supabase Pro 요금제 활용 (가장 간단)**
    *   Supabase Storage(Private Bucket)에 빌드된 `.exe` 파일을 업로드.
    *   앱 내 '로그인한 사용자'만 다운로드 가능한 보안 링크(RLS) 제공.
    *   **장점**: 통합 관리 및 높은 B2B 신뢰도.
*   **방안 B: Cloudflare R2 연동 (비용 효율적)**
    *   10GB 무료 용량 및 전송료 무료 혜택 활용.
    *   1회용 보안 링크(Presigned URL)를 통한 비공개 배포 자동화.

---

## 1. 프로젝트 개요
MiniPDM은 소규모 제조/가공 업체를 위해 설계된 데스크톱 기반 애플리케이션(Electron + React)입니다. 견적(Estimate) -> 수주(Order) -> 생산(Production) -> 출하(Shipment) -> 지출/원가 분석(Expense Analysis)에 이르는 전체 업무 주기를 관리합니다.
로컬 우선(Local-first) 접근 방식을 취하며, 데이터 동기화 및 저장을 위해 Supabase를 백엔드로 사용합니다.

### 기술 스택 (Tech Stack)
-   **Frontend**: React, TypeScript, Tailwind CSS, Vite
-   **Desktop Wrapper**: Electron
-   **Backend / Database**: Supabase (PostgreSQL)
-   **Charting**: Chart.js, react-chartjs-2
-   **PDF/Excel**: 생성 및 관리를 위한 범용 라이브러리 사용

---

## 2. 주요 기능 현황

### ✅ 완료됨 (Completed)
1.  **견적 관리 (Estimate Management)**:
    -   견적서 작성/수정 및 버전 관리.
    -   파일 첨부 (드래그 앤 드롭) 및 이미지 OCR/도면 분석.
    -   PDF/Excel 내보내기.
2.  **수주 관리 (Order Management)**:
    -   견적을 수주로 변환 (상태 워크플로우 연동).
    -   생산 라벨 출력 (QR/바코드).
    -   도면 마킹(가림 처리) 및 PDF 분할 도구.
3.  **출하 관리 (Shipment Management) - 업데이트됨**:
    -   품목 단위 출하 추적 (부분 출하 지원).
    -   출하 그룹 생성 및 관리.
    -   **출하 라벨 출력**: 수량 분할 출력(1/N), 라벨 크기(중형/소형) 사용자화.
4.  **지출/원가 분석 (Expense Analysis) - 신규**:
    -   출하 내역을 기반으로 예상 원가(소재비 + 후처리비) 분석.
    -   기간별, 거래처별 필터링.
    -   주간/월간/연간 추이 차트 시각화.
5.  **가이드 및 도움말 (Guides & Help) - 업데이트됨**:
    -   DB 기반의 동적 가이드 시스템 구축.
    -   각 페이지별 상황에 맞는 도움말(Drawer) 제공.
6.  **환경 설정 (Settings) - 서비스 리뉴얼 [신규]**:
    -   프리미엄 카드 레이아웃 적용 및 UI 전면 개편 (2026-01-24).
    -   회사 정보, 재무 기준, 계산 설정, 자재 마진 등 논리적 그룹화.
    -   견적서 템플릿 시각화 및 엑셀 프리셋 UI 개선.

### 🚧 진행 중 / 계획됨 (In Progress / Planned)
-   **모바일 반응형**: 모바일에서의 주문 상세 페이지 사용성 지속 개선 필요.
-   **성능 최적화**: 데이터 증가에 따른 대시보드 집계 성능 모니터링.
-   **재고 관리**: 실제 재고와 출하 내역 연동 (현재 기획 단계).

---

## 3. 데이터베이스 스키마
Supabase에서 관리되는 총 14개의 테이블로 구성되어 있습니다.

### 🏢 기준 정보 테이블 (Base Tables)

#### **1. companies** (회사/테넌트)
-   `id` (UUID, PK): 회사 고유 ID.
-   `name` (TEXT): 회사명.
-   `biz_num` (TEXT): 사업자 등록번호.
-   `label_printer_width` (INT): 기본 라벨 프린터 너비 (mm). [신규]
-   `label_printer_height` (INT): 기본 라벨 프린터 높이 (mm). [신규]
-   `root_path` (TEXT): 파일 저장을 위한 NAS/서버 공용 경로.
-   `default_payment_terms` (TEXT): 기본 지불 조건. [신규]
-   `default_incoterms` (TEXT): 기본 인도 조건. [신규]
-   `default_delivery_period` (TEXT): 기본 납기 기간. [신규]
-   `default_destination` (TEXT): 기본 도착지. [신규]
-   `default_note` (TEXT): 기본 비고. [신규]

#### **2. profiles** (사용자)
-   `id` (UUID, PK): `auth.users(id)`와 연결.
-   `company_id` (UUID): 소속 회사 ID (`companies` 참조).
-   `email` (TEXT): 사용자 이메일.
-   `name` (TEXT): 사용자 이름.
-   `role` (TEXT): 권한 ('admin', 'member', 'viewer').

#### **3. clients** (거래처)
-   `id` (UUID, PK): 거래처 고유 ID.
-   `company_id` (UUID): 소속 회사 ID.
-   `name` (TEXT): 거래처명.
-   `manager_name` (TEXT): 담당자명.
-   `manager_email` (TEXT): 담당자 이메일.

#### **4. materials** (원자재 라이브러리)
-   `id` (UUID, PK): 자재 고유 ID.
-   `name` (TEXT): 자재명 (예: SUS304).
-   `code` (TEXT): 자재 코드.
-   `unit_price` (NUMERIC): Kg당 단가/단위 가격.
-   `density` (NUMERIC): 비중 (중량 계산용).

#### **5. heat_treatments** (열처리 라이브러리) [신규]
-   `id` (UUID, PK): 열처리 고유 ID.
-   `company_id` (UUID): 소속 회사 ID.
-   `name` (TEXT): 열처리 방식 명.
-   `price_per_kg` (NUMERIC): Kg당 단가.

---

### 📄 견적 및 수주 테이블 (Estimate & Order Tables)

#### **6. estimates** (견적 헤더)
-   `id` (UUID, PK): 견적 고유 ID.
-   `project_name` (TEXT): 프로젝트명.
-   `client_id` (UUID): 거래처 ID (`clients` 참조).
-   `status` (TEXT): 상태 ('DRAFT', 'SENT', 'CONFIRMED', 'REJECTED').
-   `currency` (TEXT): 통화 코드 (KRW, USD 등). [신규]
-   `exchange_rate` (NUMERIC): 적용 환율. [신규]

#### **6. estimate_items** (견적 상세 품목)
-   `id` (UUID, PK): 품목 고유 ID.
-   `estimate_id` (UUID): 견적 ID 참조.
-   `part_no` (TEXT): 품번.
-   `part_name` (TEXT): 품명.
-   `qty` (INT): 수량.
-   `material_cost` (NUMERIC): 단위 소재비 (예상).
-   `post_process_cost` (NUMERIC): 단위 후처리비 (예상).
-   `unit_price` (NUMERIC): 최종 공급 단가.
-   `profit_rate` (NUMERIC): 기업 이윤율 (%). [신규]

#### **7. orders** (수주 헤더)
-   `id` (UUID, PK): 수주 고유 ID.
-   `po_no` (TEXT): 발주 주문 번호 (PO No).
-   `order_date` (DATE): 수주 일자.
-   `delivery_date` (DATE): 납기 일자.
-   `shipping_status` (TEXT): 출하 상태 ('unshipped', 'partial', 'shipped'). [신규]

#### **8. order_items** (수주 상세 품목)
-   `id` (UUID, PK): 수주 품목 고유 ID.
-   `order_id` (UUID): 수주 ID 참조.
-   `estimate_item_id` (UUID): 원본 견적 품목 연결.
-   `post_processing_name` (TEXT): 후처리 공정명. [신규]
-   `currency` (TEXT): 품목별 통화. [신규]
-   `exchange_rate` (NUMERIC): 품목별 적용 환율. [신규]
-   `order_item_no` (TEXT): 수주 품목 번호. [신규]

-   `files` (첨부 파일)
-   `id` (UUID, PK): 파일 고유 ID.
-   `estimate_item_id` (UUID): 견적 품목 연결 (Nullable).
-   `order_item_id` (UUID): 수주 품목 연결. [신규]
-   `file_path` (TEXT): 저장소/NAS 경로.
-   `file_name` (TEXT): 파일명.
-   `original_name` (TEXT): 원본 파일명. [신규]
-   `file_size` (BIGINT): 파일 크기. [신규]
-   `is_current` (BOOL): 최신 버전 여부.

---

### 🚚 출하 및 물류 (Shipment & Logistics - 신규)

#### **10. shipments** (출하 헤더)
-   `id` (UUID, PK): 출하 고유 ID.
-   `company_id` (UUID): 소속 회사 ID.
-   `order_id` (UUID): 수주 ID 참조.
-   `shipment_no` (TEXT): 출하 번호.
-   `status` (TEXT): 상태 ('pending', 'shipped', 'delivered', 'canceled').
-   `courier` (TEXT): 택배사/운송사.
-   `tracking_no` (TEXT): 운송장 번호.
-   `recipient_name` (TEXT): 수령인 이름.
-   `recipient_contact` (TEXT): 수령인 연락처.
-   `recipient_address` (TEXT): 배송지 주소.
-   `memo` (TEXT): 배송 메모.
-   `shipped_at` (TIMESTAMPTZ): 출하 일시.

#### **11. shipment_items** (출하 상세)
-   `id` (UUID, PK): 출하 품목 고유 ID.
-   `shipment_id` (UUID): 출하 ID 참조.
-   `order_item_id` (UUID): 수주 품목 연결.
-   `quantity` (NUMERIC): 출하 수량.
-   `box_no` (INT): 박스 번호.
-   `note` (TEXT): 비고.

---

### ℹ️ 시스템 테이블 (System Tables)

#### **12. page_guides** (도움말 콘텐츠)
-   `id` (UUID, PK): 가이드 고유 ID.
-   `page_key` (TEXT): 페이지 키 ('orders', 'expense-analysis' 등).
-   `content` (TEXT): 가이드 Drawer에 표시될 Markdown 콘텐츠.

#### **13. app_versions** (업데이트 관리 - 선택사항)
*(자동 업데이트 확인용 - 예약됨)*

#### **14. schema_migrations** (Supabase 관리)
*(Supabase 내부 관리용)*

---

## 4. 최근 변경 로그 (v0.2.9)
-   **2026-02-20 [코드 품질 개선 1단계 완료]**:
    -   **`confirm()` → `ConfirmModal` 교체 (Electron 호환성)**:
        -   `EstimateDetail.tsx`: 견적서 삭제, 수주 등록 후 이동 확인 → `openConfirm()` 헬퍼 패턴 도입.
        -   `OrderDetail.tsx`: 통화 변경 확인 → `pendingCurrency` state + `ConfirmModal` 패턴.
        -   `OrderInfoCard.tsx`: `confirm()` 제거 (실행은 상위 `OrderDetail`에서 담당).
        -   **⚠️ 주의**: `OrderInfoCard`의 `confirm()` 제거 후 즉시 실행으로 변경했다가 텍스트 박스 포커스 소실 버그 재발생 → `pendingCurrency` 패턴으로 해결 (이 패턴은 반드시 유지할 것).
    -   **핵심 `any` 타입 제거 (tsc 오류 0개 유지)**:
        -   `QuotationTemplate.tsx`: `companyInfo/clientInfo/estimateInfo: any` → 로컬 인터페이스 정의.
        -   `OrderInfoCard.tsx`: `linkedEstimate: any` → `Estimate | null`, `onUpdateField: (any,any)` → 구체 타입.
        -   `estimateUtils.ts`: `calculateDiscountRate(policy: any)` → `DiscountPolicy`.
        -   `useOrderLogic.ts`: `linkedEstimate: any` → `Pick<Estimate, ...> | null`.
    -   **`@ts-ignore` 3개 제거**: `EstimateDetail.tsx`의 `templateType` 관련 → `as 'A' | 'B' | 'C'` 캐스팅으로 해결.
-   **2026-02-11**:
    -   **보안 및 데이터 격리 강화**:
        -   `EstimateItemModal.tsx`의 유사 견적 추천 쿼리에 `company_id` 필터를 추가하여 타사 데이터 노출 원천 차단.
    -   **출하 관리 필터 수정**:
        -   `ShipmentList.tsx`에서 납기일이 오늘 이후인 품목이 '출하 완료' 탭에서 사라지던 로직 수정 (조기 출하 대응).
-   **2026-01-24 (v0.2.8)**:
    -   **환경 설정(Settings) 페이지 전면 리뉴얼**:
        -   Vibrant icons, `rounded-2xl`, `shadow-soft` 스타일의 프리미엄 디자인 적용.
        -   회사 정보, 환율/임율, 파일 저장소, 자재 마진 등 논리적 카드 그룹화.
        -   견적서 템플릿(Modern/Classic/Detail) 시각적 선택 UI 도입.
        -   엑셀 내보내기 프리셋 UI 개선 (가용 항목 vs 선택 항목 분리 및 드래그 정렬 최적화).
        -   `Settings.tsx` 전체 코드 재작성(Full Rewrite)으로 구문 안정성 및 품질 확보.
    -   **생산 관리(Production Management) 고도화**:
        -   **'전체(All)' 상태 탭 추가**: 모든 생산 품목(대기/진행/완료)을 한눈에 조회 가능.
        -   **스마트 날짜 필터링**: 종료일이 '오늘'일 경우 미래 납기 건이 자동 포함되도록 필터 로직 개선.
        -   **상태 버튼 동적화**: '전체' 보기 상태에서도 품목별 상태(WAITING/PROCESSING/DONE)에 맞는 액션 버튼 노출.
    -   **수주 상세(Order Detail) 개선**:
        -   **상태 표시 현지화**: 'Waiting', 'Processing', 'Done', 'Confirmed' 등 영문 상태값을 한국어(**대기, 진행, 완료, 확정됨**)로 변경.
        -   **구문 오류 수정**: `OrderItemTable.tsx`에서 발생하던 JSX 닫는 태그 누락 및 문법 오류 해결.
    -   **애플리케이션 안정성 확보**:
        -   `OrderItemTable.tsx`, `ProductionManagement.tsx`, `Settings.tsx` 등 주요 컴포넌트의 TypeScript 타입 이슈 및 린트 오류 수정.
    -   **열처리(Heat Treatment) 기능 추가**:
        -   자재/후처리와 동일하게 열처리 공정 및 단가 관리 기능 구현.
        -   견적 작성 시 열처리 비용 자동 산출 (중량 * 단가).
        -   **DB 테이블 `heat_treatments` 추가 및 `estimate_items` 연동**.
    -   **견적 상세 모달 개선**:
        -   **입력 필드 순서 변경**: 사각 소재 입력 시 (두께 -> 가로 -> 세로) 순으로 변경하여 현장 용어와 일치.
        -   **자재 여유 치수 설정**: 환경 설정(Settings)에서 사각 소재 자동 계산 시 추가될 여유 치수(가로/세로/두께)를 사용자 지정 가능하도록 개선.
    -   **코드 리팩토링**: `OrderDetail.tsx` (주문 상세) 페이지의 대규모 리팩토링 완료.
        -   **Hook 분리**: `useOrderLogic`, `useFileHandler` 도입으로 비즈니스 로직과 파일 시스템 로직 분리.
        -   **UI 컴포넌트화**: `OrderHeader`, `OrderInfoCard`, `OrderItemTable` 등으로 UI 분할.
        -   **성능/유지보수성 향상**: 코드 라인 수 약 1,800줄 -> 200줄로 감소 (컨테이너 기준).
    -   **견적 품목 검색(Estimate Search) 신규 개발**:
        -   과거 견적 품목을 품번/품명/크기 등 다양한 조건으로 검색하여 재활용성 증대.
        -   **기능**: 키워드 검색, 크기(±오차) 검색, 상태 필터, 파일 바로 열기, 상세 단가 조회.
    -   **수주 관리(Orders) 개선**:
        -   **검색 문법 수정**: PostgREST 제약 사항 해결을 통해 PO번호와 거래처명 동시 검색 오류 수정.
    -   **지출 분석(Expense Analysis) 고도화**:
        -   **다중 필터 적용**: 소재, 후처리, 열처리 등 각 항목별 Multi-Select 필터링 기능 추가.
        -   **데이터 시각화**: 상세 사양 컬럼 추가 및 열처리 비용 분리 표시.
    -   **문서화**: `docs/ARCHITECTURE_REVIEW.md` 생성 및 아키텍처 리뷰 반영. 가이드 콘텐츠 DB 최신화.
-   **2026-01-04**:
    -   **지출/원가 분석 (Expense Analysis)**: 예상 원가 기반 분석 페이지 구현.
    -   **가이드 시스템 DB화**: 출하 및 수주 관리 가이드 내용을 DB 마이그레이션을 통해 업데이트.
    -   **출하 목록 개선**: 품목 단위 선택 및 라벨 출력(분할/크기 조절) 기능 추가.
    -   **설정 기능 추가**: 회사 설정에 기본 라벨 프린터 규격(너비/높이) 저장 기능 추가.
    -   **UI 개선**: 필터 디자인을 CSS Grid로 변경하여 레이아웃 개선.

---

## 5. 배포 및 보안 (Deployment & Security)
-   **보안 조치**:
    -   Supabase RLS(Row Level Security)를 통해 회사 간 데이터 격리.
    -   `company_id` 기반의 접근 제어 정책 적용.
    -   Supabase Authentication을 통한 사용자 인증.
    -   `.env` 파일 및 민감한 정보는 `.gitignore`로 제외됨 (GitHub 업로드 방지).
    -   `docs/HANDOVER.md`는 보안을 위해 로컬에만 유지하고 GitHub 저장소에서는 제거함.
    -   코드 내 하드코딩된 API 키 없음 확인 완료.
-   **배포**:
    -   Electron Builder를 사용하여 Windows 설치 파일(.exe) 생성.
    -   GitHub Actions를 통한 자동 빌드 및 릴리즈 (구축 예정).
-   **자동 업데이트**:
    -   `v*` 태그(예: `v0.2.0`)가 푸시되면 GitHub Actions를 통해 자동으로 빌드 및 배포됨.
    -   최신 태그 `v0.2.0`이 정상적으로 푸시되어 릴리즈 프로세스가 진행 중임.

---

## 6. 개발 및 데이터베이스 관리 (Development & Database Management)

### 데이터베이스 관리 워크플로우 (DB Management Workflow)
프로젝트는 **Supabase CLI**를 사용하여 데이터베이스 스키마를 관리합니다.

1.  **마이그레이션 생성**:
    -   `supabase/migrations` 폴더에 `YYYYMMDDHHMMSS_description.sql` 형식으로 SQL 파일을 생성합니다.
    -   `CREATE TABLE`, `ALTER TABLE` 등의 DDL 문을 작성합니다.
    -   반드시 `IF NOT EXISTS` 처리를 하여 중복 실행 시 에러를 방지합니다.

2.  **데이터베이스 반영**:
    -   터미널에서 다음 명령어를 실행하여 변경사항을 원격 DB에 반영합니다.
    -   `supabase db push`

3.  **문서화**:
    -   `supabase/schema.sql` 파일은 전체 스키마의 스냅샷 역할을 합니다. 마이그레이션 적용 후 이 파일도 최신 상태로 업데이트하여 한눈에 구조를 파악할 수 있도록 합니다.

### 주요 명령어
-   **`supabase db push`**: 로컬 마이그레이션 파일을 원격 DB에 적용.
-   **`npm run dev`**: 개발 모드 실행 (Vite).
-   **`npm run build`**: 프로덕션 빌드.

---

## 7. 실행 (Run)
-   **개발 모드 (Dev)**: `npm run electron:dev`
-   **빌드 (Build)**: `npm run build`
-   **배포 (Release)**: `npm run release`

---

## 8. 코드 및 아키텍처 리뷰 (Code & Architecture Review)

### 코드 품질 개선 로드맵

| 단계 | 상태 | 주요 작업 |
|------|------|-------|
| **1단계** | ✅ **완료** (2026-02-20) | `confirm()` → ConfirmModal, 핵심 `any` 10개+ 제거, `@ts-ignore` 3개 제거 |
| **2단계** | ✅ **완료** (2026-02-20) | `console.log` 제거, `alert()` → Toast(55개), `any` 타입 정리 (`OcrOutputItem` export 타입 추가 등) |
| **3단계** | 🟡 계획 | 대형 파일 분리 리팩토링, 문서 정합성 수정 |

> 상세 체크리스트: `task.md` 참조 (brain 디렉토리)

### 주요 개선 권장 사항 (Recommendations)

1.  **컴포넌트 분리 (Component Splitting) - [완료]**:
    -   `OrderDetail.tsx`의 리팩토링이 완료되었습니다 (`2026-01-12`).
    -   **분리된 구조**:
        -   Hooks: `src/hooks/useOrderLogic.ts`, `src/hooks/useFileHandler.ts`
        -   Components: `src/components/orders/detail/*`
    -   유지보수성이 크게 향상되었습니다. 향후 `EstimateDetail.tsx`에도 유사한 패턴 적용을 권장합니다.

2.  **타입 안정성 강화 (Type Safety) — [1단계 일부 완료]**:
    -   `QuotationTemplate`, `OrderInfoCard`, `estimateUtils`, `useOrderLogic`의 `any` 타입 제거 완료.
    -   **다음 목표**: `ShipmentLabelModal`, `SmartPdfImporter`, `FilenameParserModal`, `EstimateItemModal` 등 나머지 `any` 제거 (2단계).

3.  **알림 시스템 통일 — [✅ 2단계-3 완료]**:
    -   `ToastNotification.tsx`, `useToast.ts`, `ToastContext.tsx` 신규 생성.
    -   `App.tsx`에 `ToastProvider` 최상위 래핑 완료.
    -   `ShipmentList`(13개), `Orders`(2개), `Estimates`(4개), `Materials`(8개), `ProductionManagement`(6개), `EstimateDetail`(9개), `Settings`(2개), `OrderDetail`(1개), `EstimateSearch`(3개), `Clients`(7개) 등 총 **55개** `alert()` → `toast.success/error/warning/info()` 교체 완료.
    -   `Login.tsx` 4개는 `ToastProvider` 외부에서 렌더되므로 의도적으로 유지.

4.  **상태 관리 (State Management) — [미개선]**:
    -   `useState`가 컴포넌트 상단에 다수 선언되어 있습니다. 복잡한 폼 상태는 `useReducer`나 `React Hook Form` 도입을 고려해볼 만합니다.

5.  **주요 주의 사항 (포커스 버그 재발 방지)**:
    -   **`OrderInfoCard`의 `onCurrencyChange`**: 이 함수를 컴포넌트 내부에서 즉시 호출하면 `handleBulkCurrencyChange()`가 발동하여 다중 state 업데이트로 텍스트 박스 포커스가 소실됨. **반드시 상위 컴포넌트에서 `pendingCurrency` + `ConfirmModal` 패턴으로 처리해야 함**.
