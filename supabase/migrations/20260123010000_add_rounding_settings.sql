-- 회사별 반올림 및 시간 설정 추가
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_rounding_unit INTEGER DEFAULT 1000, -- 단가 절사 단위 (예: 1000원 단위 올림)
ADD COLUMN IF NOT EXISTS default_time_step NUMERIC DEFAULT 0.1;   -- 가공 시간 입력 단위 (예: 0.1시간)
