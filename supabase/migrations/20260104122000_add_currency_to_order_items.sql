-- Add currency and exchange_rate to order_items table
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KRW';
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.0;

-- Comment on columns
COMMENT ON COLUMN public.order_items.currency IS '품목별 통화 (KRW, USD, etc.)';
COMMENT ON COLUMN public.order_items.exchange_rate IS '품목별 적용 환율';
