-- Add currency and exchange_rate to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KRW';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.0;

-- Ensure estimate_id column exists
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS estimate_id UUID;

-- Explicitly add Foreign Key Constraint if it doesn't exist
-- This fixes the issue where the column existed but the relationship (FK) was missing, causing PGRST200 errors.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'orders_estimate_id_fkey') THEN
        ALTER TABLE public.orders ADD CONSTRAINT orders_estimate_id_fkey FOREIGN KEY (estimate_id) REFERENCES public.estimates(id);
    END IF;
END $$;

-- Comment on columns
COMMENT ON COLUMN public.orders.currency IS '수주 통화 (KRW, USD, etc.)';
COMMENT ON COLUMN public.orders.exchange_rate IS '수주 환율';
COMMENT ON COLUMN public.orders.estimate_id IS '연결된 견적 ID';
