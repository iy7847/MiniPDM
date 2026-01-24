-- 생산 관리(외주/사내) 및 완료 노트 추가
ALTER TABLE public.order_items 
ADD COLUMN IF NOT EXISTS production_type VARCHAR DEFAULT 'INHOUSE', -- 'INHOUSE' | 'OUTSOURCE'
ADD COLUMN IF NOT EXISTS production_note TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 코멘트 추가
COMMENT ON COLUMN public.order_items.production_type IS '생산 방식 (INHOUSE: 사내, OUTSOURCE: 외주)';
COMMENT ON COLUMN public.order_items.production_note IS '생산 완료 시 비고';
COMMENT ON COLUMN public.order_items.completed_at IS '생산 완료 일시';
