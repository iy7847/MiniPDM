-- 회사별 봉재(Round Bar) 기본 자재 여유 치수 설정 추가
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_margin_round_w NUMERIC DEFAULT 5, -- 봉재 지름/가로 여유 (mm)
ADD COLUMN IF NOT EXISTS default_margin_round_d NUMERIC DEFAULT 5; -- 봉재 길이/세로 여유 (mm)
