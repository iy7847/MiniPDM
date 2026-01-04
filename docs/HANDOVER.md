# 프로젝트 인계 문서 (Project Handover Document)

**프로젝트**: MiniPDM (제조업체를 위한 개인 데이터 관리 시스템)
**날짜**: 2026-01-04
**버전**: 0.2.0

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

---

### 📄 견적 및 수주 테이블 (Estimate & Order Tables)

#### **5. estimates** (견적 헤더)
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

#### **9. files** (첨부 파일)
-   `id` (UUID, PK): 파일 고유 ID.
-   `estimate_item_id` (UUID): 견적 품목 연결.
-   `file_path` (TEXT): 저장소/NAS 경로.
-   `is_current` (BOOL): 최신 버전 여부.

---

### 🚚 출하 및 물류 (Shipment & Logistics - 신규)

#### **10. shipments** (출하 헤더)
-   `id` (UUID, PK): 출하 고유 ID.
-   `company_id` (UUID): 소속 회사 ID.
-   `order_id` (UUID): 수주 ID 참조.
-   `shipment_no` (TEXT): 출하 번호 (자동 생성, 예: SH-20260101-01).
-   `shipped_at` (TIMESTAMPTZ): 출하 일시.
-   `status` (TEXT): 상태 ('pending', 'shipped', 'canceled').

#### **11. shipment_items** (출하 상세)
-   `id` (UUID, PK): 출하 품목 고유 ID.
-   `shipment_id` (UUID): 출하 ID 참조.
-   `order_item_id` (UUID): 수주 품목 연결.
-   `quantity` (NUMERIC): 출하 수량.

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

## 4. 최근 변경 로그 (v0.2.0)
-   **2026-01-04**:
    -   **지출/원가 분석 (Expense Analysis)**: 예상 원가 기반 분석 페이지 구현.
    -   **가이드 시스템 DB화**: 출하 및 수주 관리 가이드 내용을 DB 마이그레이션을 통해 업데이트.
    -   **출하 목록 개선**: 품목 단위 선택 및 라벨 출력(분할/크기 조절) 기능 추가.
    -   **설정 기능 추가**: 회사 설정에 기본 라벨 프린터 규격(너비/높이) 저장 기능 추가.
    -   **UI 개선**: 필터 디자인을 CSS Grid로 변경하여 레이아웃 개선.

---

## 5. 배포 및 실행 (Deployment & Run)
-   **개발 모드 (Dev)**: `npm run electron:dev`
-   **빌드 (Build)**: `npm run build`
-   **배포 (Release)**: `npm run release`
