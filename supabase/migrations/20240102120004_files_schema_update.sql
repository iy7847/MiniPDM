-- 1. Make estimate_item_id nullable (since we now have order_item_id)
ALTER TABLE public.files ALTER COLUMN estimate_item_id DROP NOT NULL;

-- 2. Add original_name column if it doesn't exist
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS original_name TEXT;

-- 3. Add file_size column if it doesn't exist (it should, but just in case)
ALTER TABLE public.files ADD COLUMN IF NOT EXISTS file_size BIGINT;
