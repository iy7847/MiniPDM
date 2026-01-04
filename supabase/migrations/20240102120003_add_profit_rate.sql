-- Add profit_rate column to estimate_items table
ALTER TABLE public.estimate_items 
ADD COLUMN IF NOT EXISTS profit_rate numeric DEFAULT 0;

COMMENT ON COLUMN public.estimate_items.profit_rate IS 'Corporate profit rate in percentage';
