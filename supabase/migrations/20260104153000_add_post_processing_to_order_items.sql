-- Add post_processing_name column to order_items table
ALTER TABLE order_items 
ADD COLUMN IF NOT EXISTS post_processing_name text;

COMMENT ON COLUMN order_items.post_processing_name IS 'Name of the post-processing treatment (e.g. Anodizing, Heat Treatment)';
