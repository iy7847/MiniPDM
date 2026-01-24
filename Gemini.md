# Gemini 컨텍스트 파일

이 파일은 **MiniPDM** 프로젝트 작업을 수행하는 AI 에이전트(Gemini)를 위한 상위 레벨 컨텍스트와 규칙을 제공합니다.

## ※ 필수 규칙 (Essential Rules)
1.  **한국어 작성**: 모든 문서(코드 제외)는 반드시 **한국어**로 작성합니다.
2.  **주석 작성**: 모든 함수, 변수, 클래스명에는 **한국어**로 주석을 작성합니다.
3.  **로직 설명**: 복잡한 비즈니스 로직은 상세하게 **한국어**로 주석을 작성하여 설명합니다.
4.  **아이디어 제안**: 아이디어가 필요한 경우, 먼저 제안만 하고 사용자의 승인을 받은 후 작업을 진행합니다.
5.  **채팅 명령**:
    *   "답변": 아무 행동도 하지 않고 질문에 대한 답변만 합니다.
    *   "작업 종료": 다음 세션에서 작업을 원활히 이어서 할 수 있도록 모든 내용을 정리합니다.

## 1. 프로젝트 개요
**MiniPDM**은 소규모 제조 및 가공 업체를 위해 설계된 데스크톱 애플리케이션입니다. 견적(Estimate)부터 수주(Order), 생산, 출하(Shipment), 그리고 비용 분석(Expense Analysis)까지의 전체 업무 흐름을 관리합니다.

### 아키텍처
*   **플랫폼**: 데스크톱 애플리케이션 (Windows)
*   **래퍼(Wrapper)**: Electron
*   **프론트엔드**: React, TypeScript, Tailwind CSS, Vite
*   **백엔드/데이터베이스**: Supabase (PostgreSQL) - 로컬 우선(Local-first) 방식, 클라우드 동기화.
*   **인증**: Supabase Authentication

## 2. 디렉토리 구조
*   `src/`: React 프론트엔드 소스 코드.
    *   `components/`: 재사용 가능한 UI 컴포넌트.
    *   `hooks/`: 커스텀 React 훅 (비즈니스 로직 분리).
    *   `pages/`: 주요 애플리케이션 페이지 (견적, 수주 등).
    *   `types/`: TypeScript 타입 정의.
    *   `lib/`: 유틸리티 라이브러리 (Supabase 클라이언트 등).
*   `electron/`: Electron 메인 프로세스 코드.
*   `supabase/`: 데이터베이스 마이그레이션 및 설정.
    *   `migrations/`: SQL 마이그레이션 파일 (`YYYYMMDDHHMMSS_name.sql`).

## 3. 데이터베이스 스키마 (요약)
약 14개의 테이블로 구성되어 있습니다. 주요 테이블은 다음과 같습니다:
*   **핵심 정보**: `companies`(회사), `profiles`(사용자), `clients`(거래처).
*   **라이브러리**: `materials`(자재), `post_processings`(후처리), `heat_treatments`(열처리).
*   **견적(Estimate)**: `estimates`(헤더), `estimate_items`(상세).
*   **수주(Order)**: `orders`(헤더), `order_items`(상세).
*   **출하(Shipment)**: `shipments`, `shipment_items`.
*   **파일**: `files` (품목에 연결된 첨부 파일 관리).

## 4. 개발 워크플로우
1.  **데이터베이스 변경**:
    *   `supabase/migrations` 경로에 새 마이그레이션 파일 생성.
    *   `supabase db push` 명령어로 적용.
2.  **상태 관리**:
    *   React의 `useState`와 `useEffect`를 주로 사용.
    *   복잡한 로직은 커스텀 훅(예: `useEstimateLogic.ts`)으로 분리.
3.  **UI/UX**:
    *   Tailwind CSS를 사용하여 스타일링.
    *   `index.css`와 `tailwind.config.js`에 정의된 일관된 디자인 시스템 사용.

## 5. 주요 기능
*   **견적**: 자재 비중, 후처리, 난이도 등을 기반으로 단가 계산.
*   **수주**: 견적을 기반으로 생성되며, 생산 상태를 추적.
*   **출하**: 배송 및 라벨 출력 관리 (분할 출하 지원).
*   **파일 관리**: NAS/서버의 로컬 파일을 DB 레코드와 연결 (2D/3D 파일 타입 자동 감지).
