-- 1. 열처리(Heat Treatments) 테이블 생성
CREATE TABLE IF NOT EXISTS public.heat_treatments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id UUID REFERENCES public.companies(id) NOT NULL,
    name TEXT NOT NULL,
    price_per_kg NUMERIC DEFAULT 0, -- Kg당 단가
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. 견적 상세(Estimate Items) 테이블에 열처리 관련 컬럼 추가
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'heat_treatment_id') THEN
        ALTER TABLE public.estimate_items ADD COLUMN heat_treatment_id UUID REFERENCES public.heat_treatments(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_items' AND column_name = 'heat_treatment_cost') THEN
        ALTER TABLE public.estimate_items ADD COLUMN heat_treatment_cost NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 3. RLS (보안 정책) 설정 - 로그인한 사용자 접근 허용
ALTER TABLE public.heat_treatments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE tablename = 'heat_treatments'
        AND policyname = 'Enable all for authenticated users'
    ) THEN
        CREATE POLICY "Enable all for authenticated users" ON public.heat_treatments 
        FOR ALL TO authenticated USING (true);
    END IF;
END $$;
