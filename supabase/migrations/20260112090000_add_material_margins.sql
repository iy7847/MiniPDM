-- 회사별 기본 자재 여유 치수 설정 추가
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS default_margin_w NUMERIC DEFAULT 5, -- 가로 여유 (mm)
ADD COLUMN IF NOT EXISTS default_margin_d NUMERIC DEFAULT 5, -- 세로 여유 (mm)
ADD COLUMN IF NOT EXISTS default_margin_h NUMERIC DEFAULT 0; -- 두께 여유 (mm)
