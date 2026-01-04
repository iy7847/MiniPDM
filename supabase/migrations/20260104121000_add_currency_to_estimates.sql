-- Add currency and exchange_rate to estimates table if missing
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KRW';
ALTER TABLE public.estimates ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.0;

COMMENT ON COLUMN public.estimates.currency IS '견적 통화';
COMMENT ON COLUMN public.estimates.exchange_rate IS '견적 환율';
