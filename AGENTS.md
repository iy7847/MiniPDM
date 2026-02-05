# 🤖 Agent Instructions for MiniPDM

이 파일은 **MiniPDM (제조업체 관리 시스템)** 프로젝트에서 AI 에이전트의 행동을 정의하는 **절대적인 지침(Constitution)**입니다.

> [!IMPORTANT]
> 프로젝트의 맥락을 정확히 이해하기 위해 다음 파일들을 실시간으로 참조해야 합니다:
> - `Gemini.md`: 기술 스택 및 개발 가이드
> - `HANDOVER.md`: 프로젝트 현황 및 히스토리
> - `Scales.md`: 비즈니스 로직(계산식) 명세

---

## 📂 0. Context Loading (필수 참조 문서)

작업을 시작하기 전, 아래 파일들을 읽고 프로젝트 상태를 동기화하십시오.

| 파일명 | 주요 내용 |
| :--- | :--- |
| `Gemini.md` | **기술 스택**: Electron, React(Vite/Tailwind), Supabase<br>**필수 규칙**: 한국어 작성, 상세 주석 필수, 마이그레이션 기반 DB 관리 |
| `Scales.md` | **핵심 로직**: 사각(rect)/원형(round) 중량 계산 공식<br>**비용 산출**: 열처리 및 후처리 비용 (kg당 단가 * 중량) |
| `HANDOVER.md` | **히스토리**: 현재 배포 버전 `v0.2.5`<br>**개선 사항**: 컴포넌트 분리(OrderDetail.tsx 사례), 타입 안정성 강화 |

---

## 🏗️ The 3-Layer Architecture

프로젝트는 다음의 3계층 구조를 따르며, 에이전트는 수석 개발자로서 각 계층의 역할을 수행합니다.

### **Layer 1: Directive (지시 계층 - SOP)**
- `directives/` 폴더 내의 Markdown 지침을 따름.
- **반복 작업**(공정 추가, 테이블 변경, 배포 등)은 반드시 정의된 Directive에 따라 수행.

### **Layer 2: Orchestration (조정 계층 - Decision Making)**
- **사용자 요청 분석** → `Scales.md`(검증) & `Gemini.md`(아키텍처) → **계획 수립** → **실행**.
- **언어 규칙**: 모든 대화, 주석, 문서는 **한국어**로 작성.

### **Layer 3: Execution (실행 계층 - Coding)**
- **Frontend**: React Hooks(예: `useEstimateLogic.ts`)를 활용한 비즈니스 로직 분리.
- **Backend**: Supabase Client 및 SQL Migration 파일 작성.
- **Styling**: Tailwind CSS 표준 준수.

---

## ⚖️ Operating Principles (운영 원칙)

### 1. 🛡️ Logic Integrity (로직 무결성)
중량 및 비용 계산 로직 수정 시 반드시 `Scales.md`와 일치하는지 확인하십시오. 프론트엔드와 백엔드의 계산 결과는 동일해야 합니다.

### 2. 🗄️ Database Integrity (DB 무결성)
스키마 변경 시 즉시 코드를 작성하지 말고, `supabase/migrations`에 SQL 파일을 생성하는 절차를 따르십시오. (`supabase db push` 워크플로우 준수)

### 3. 🛠️ Self-anneal (자가 치유 및 업데이트)
- **Code Bloat**: 컴포넌트가 대대적으로 비대해지면 분리 및 리팩토링을 제안하십시오.
- **Logic Sync**: 새로운 계산 로직이나 기술 스택 도입 시 관련 문서(`Scales.md`, `Gemini.md`) 업데이트를 요청하십시오.

### 4. 🚀 Version Control & Deployment
- **현재 기준**: 배포된 최종 버전은 `v0.2.5`입니다.
- **불일치 확인**: **로컬 실측 코드(Actual)**와 **배포 코드(Deployed)** 간의 차이를 상시 체크하십시오.
- **미배포 명시**: 로컬에만 구현된 기능은 `HANDOVER.md`나 배포 로그에 명확히 기록하십시오.

---

## 🗺️ File Organization

| 파일/디렉토리 | 설명 |
| :--- | :--- |
| `AGENTS.md` | **행동 강령 (본 문서)** |
| `Gemini.md` | 기술 스택 및 상세 개발 워크플로우 |
| `HANDOVER.md` | 프로젝트 현황, 스키마 정보, 히스토리 |
| `Scales.md` | 중량/비용 계산 공식 및 기준 정보 |
| `directives/` | 세부 작업 지시서(SOP) 저장소 |
