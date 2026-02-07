# 🤖 Project Constitution: MiniPDM

이 파일은 **MiniPDM (제조업체 관리 시스템)** 프로젝트에서 AI 에이전트의 행동과 핵심 기술 체계를 정의하는 **절대적인 지침(Constitution)**입니다.

> [!IMPORTANT]
> 프로젝트의 맥락을 정확히 이해하기 위해 다음 파일들을 실시간으로 참조해야 합니다:
> - `HANDOVER.md`: 프로젝트 현황, 스키마 및 히스토리
> - `Scales.md`: 비즈니스 로직(계산식) 명세
> - `directives/`: 세부 작업 지시서(SOP)

---

## 📂 0. Core Rules (필수 규칙)

1.  **한국어 작성**: 모든 문서, 대화, 주석은 반드시 **한국어**로 작성합니다.
2.  **상세 주석**: 모든 함수, 변수, 클래스에는 한국어 주석을 작성하며, 복잡한 로직은 상세히 설명합니다.
3.  **승인 후 실행**: 새로운 아이디어나 구조적 변경이 필요한 경우, 제안 후 사용자의 승인을 받습니다.
4.  **DB 무결성**: 스키마 변경 시 반드시 `supabase/migrations`에 SQL 파일을 생성합니다. (`supabase db push` 준수)
5.  **작업 종료**: 세션 종료 시 "작업 종료" 명령을 통해 내용을 정리합니다.

---

## 🏗️ 1. Technical Stack & Architecture

MiniPDM은 소규모 제조업체를 위한 **Local-first** 데스크톱 애플리케이션입니다.

*   **플랫폼**: Windows (Electron Wrapper)
*   **프론트엔드**: React, TypeScript, Tailwind CSS, Vite
*   **백엔드/DB**: Supabase (PostgreSQL) - 클라우드 동기화 지원
*   **상태 관리**: React Hooks (복잡 로직은 `useEstimateLogic.ts` 등 전용 훅으로 분리)
*   **디레토리 구조**:
    *   `src/`: 프론트엔드 (components, hooks, pages, types, lib)
    *   `electron/`: 메인 프로세스
    *   `supabase/migrations/`: DB 스키마 버전 관리

---

## ⚖️ 2. Operating Principles (운영 원칙)

### 🛡️ Logic Integrity (로직 무결성)
중량 및 비용 계산 로직 수정 시 반드시 `Scales.md`와 일치하는지 확인하십시오. 프론트엔드와 백엔드의 계산 결과는 동일해야 합니다.

### 🛠️ Self-anneal (자가 치유 및 업데이트)
- **Code Bloat**: 컴포넌트가 비대해지면 분리 및 리팩토링을 제안하십시오. (예: `OrderDetail.tsx` 리팩토링 사례 준수)
- **Logic Sync**: 새로운 계산 로직 도입 시 `Scales.md` 업데이트를 병행하십시오.

### 🚀 Version Control & Deployment
- **현재 기준**: 배포 버전 `v0.2.7`
- **로컬 vs 배포**: 실측 코드와 배포 코드 간의 차이를 상시 체크하고, 미배포 기능은 `HANDOVER.md`에 명기하십시오.

---

## 🗺️ File Organization

| 파일/디렉토리 | 설명 |
| :--- | :--- |
| `AGENTS.md` | **행동 강령 및 기술 명세 (본 문서)** |
| `HANDOVER.md` | 프로젝트 현황, 스키마 정보, 히스토리 |
| `Scales.md` | 중량/비용 계산 공식 및 기준 정보 |
| `directives/` | 세부 작업 지시서(SOP) 저장소 |
| `supabase/` | DB 마이그레이션 및 정책 |
