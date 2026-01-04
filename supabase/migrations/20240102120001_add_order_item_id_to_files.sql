-- Add order_item_id to files table
ALTER TABLE public.files
ADD COLUMN IF NOT EXISTS order_item_id UUID REFERENCES public.order_items(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_files_order_item_id ON public.files(order_item_id);

-- Comment
COMMENT ON COLUMN public.files.order_item_id IS 'Link to order_items for production files';
