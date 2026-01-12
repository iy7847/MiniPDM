-- 4.1 Database Schema (supabase/schema.sql)
-- 이 코드를 Supabase 대시보드 -> SQL Editor에 붙여넣고 'Run'을 누르세요.

-- [1] 초기화 (기존 테이블 삭제 - 개발 단계이므로 과감하게 리셋)
DROP TABLE IF EXISTS public.order_items;
DROP TABLE IF EXISTS public.orders;
DROP TABLE IF EXISTS public.files;
DROP TABLE IF EXISTS public.estimate_items;
DROP TABLE IF EXISTS public.estimates;
DROP TABLE IF EXISTS public.materials;
DROP TABLE IF EXISTS public.clients;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.companies;

-- [2] 회사(Tenant) 테이블
-- 모든 데이터의 기준이 되는 회사 정보입니다.
CREATE TABLE public.companies (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    biz_num TEXT, -- 사업자번호
    root_path TEXT, -- NAS 공용 경로 (예: \\NAS\Work\)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- [요청사항] 관리 및 확장 필드
    updated_by UUID, -- 최종 수정자 ID
    update_memo TEXT, -- 수정 사유/메모
    reserved_1 TEXT, -- 여유 필드 1
    reserved_2 TEXT, -- 여유 필드 2
    reserved_3 TEXT, -- 여유 필드 3
    reserved_4 TEXT, -- 여유 필드 4
    reserved_5 TEXT  -- 여유 필드 5
);

-- [3] 사용자 프로필 (Supabase Auth와 연결)
-- auth.users 테이블은 Supabase 내부 관리용이므로, 추가 정보를 담을 public.profiles를 만듭니다.
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'member', -- 'admin', 'member', 'viewer'
    company_id UUID REFERENCES public.companies(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [4] 거래처(Clients) 테이블
CREATE TABLE public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) NOT NULL, -- 소속 회사 (RLS 기준)
    name TEXT NOT NULL,
    biz_num TEXT,
    manager_name TEXT,
    manager_phone TEXT,
    manager_email TEXT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [5] 자재(Materials) 라이브러리
CREATE TABLE public.materials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    code TEXT, -- 자재 코드 (예: SUS304)
    name TEXT NOT NULL, -- 자재명
    category TEXT, -- 분류 (스틸, 알루미늄 등)
    density NUMERIC DEFAULT 7.85, -- 비중
    unit_price NUMERIC DEFAULT 0, -- Kg당 단가

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [6] 견적(Estimates) 헤더
CREATE TABLE public.estimates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    project_name TEXT NOT NULL,
    status TEXT DEFAULT 'DRAFT', -- DRAFT, SENT, CONFIRMED, REJECTED
    currency TEXT DEFAULT 'KRW', -- 통화
    exchange_rate NUMERIC DEFAULT 1.0, -- 환율

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [7] 견적 상세 품목(Estimate Items)
CREATE TABLE public.estimate_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estimate_id UUID REFERENCES public.estimates(id) ON DELETE CASCADE NOT NULL,
    part_no TEXT, -- 품번
    part_name TEXT, -- 품명
    
    -- 규격 정보
    spec_w NUMERIC DEFAULT 0, -- 가로
    spec_d NUMERIC DEFAULT 0, -- 세로
    spec_h NUMERIC DEFAULT 0, -- 높이/두께
    
    material_id UUID REFERENCES public.materials(id), -- 자재 링크
    
    process_time NUMERIC DEFAULT 0, -- 가공시간
    difficulty TEXT DEFAULT 'B', -- 난이도 (A, B, C, D)
    
    qty INTEGER DEFAULT 1, -- 수량
    unit_price NUMERIC DEFAULT 0, -- 단가
    supply_price NUMERIC DEFAULT 0, -- 공급가 (단가 * 수량)
    note TEXT, -- [New] 비고

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [8] 파일(Files) 관리 (하이브리드 시스템의 핵심)
CREATE TABLE public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    estimate_item_id UUID REFERENCES public.estimate_items(id) ON DELETE CASCADE,
    
    file_path TEXT NOT NULL, -- NAS 상대 경로 (예: 2024/Samsung/Bracket.pdf)
    file_name TEXT NOT NULL, -- 원본 파일명
    file_type TEXT, -- PDF, DWG, STEP 등
    version INTEGER DEFAULT 1, -- 버전 관리
    is_current BOOLEAN DEFAULT true, -- 최신 버전 여부

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [9] 수주(Orders) 헤더
CREATE TABLE public.orders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    client_id UUID REFERENCES public.clients(id),
    
    po_no TEXT, -- 발주 번호
    order_date DATE DEFAULT CURRENT_DATE, -- 수주 일자
    delivery_date DATE, -- 납기 일자
    total_amount NUMERIC DEFAULT 0,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [10] 수주 상세(Order Items)
CREATE TABLE public.order_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    estimate_item_id UUID REFERENCES public.estimate_items(id), -- 견적 연동
    
    process_type TEXT DEFAULT 'INTERNAL', -- INTERNAL(사내), OUTSOURCE(외주)
    outsource_company TEXT, -- 외주처 명

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- [요청사항] 관리 및 확장 필드
    updated_by UUID,
    update_memo TEXT,
    reserved_1 TEXT,
    reserved_2 TEXT,
    reserved_3 TEXT,
    reserved_4 TEXT,
    reserved_5 TEXT
);

-- [11] RLS (Row Level Security) 활성화
-- 이 부분이 있어야 A회사 데이터가 B회사에게 보이지 않습니다.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- [12] RLS 정책 예시 (개발용: 로그인만 하면 모두 허용)
-- 실제 배포 시에는 'users.company_id'와 비교하는 엄격한 정책으로 바꿔야 합니다.
CREATE POLICY "Enable all for authenticated users" ON public.companies FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.profiles FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.clients FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.materials FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.estimates FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.estimate_items FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.files FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.orders FOR ALL TO authenticated USING (true);
CREATE POLICY "Enable all for authenticated users" ON public.order_items FOR ALL TO authenticated USING (true);

-- [13] 회원가입 시 자동으로 Profiles 테이블에 데이터 생성하는 트리거
-- 이 함수가 있어야 회원가입 직후 에러가 나지 않습니다.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'admin');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- [14] 열처리(Heat Treatments) 테이블
CREATE TABLE IF NOT EXISTS public.heat_treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    price_per_kg NUMERIC DEFAULT 0, -- Kg당 단가
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.heat_treatments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all for authenticated users" ON public.heat_treatments FOR ALL TO authenticated USING (true);
