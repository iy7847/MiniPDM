-- Add label printer settings to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS label_printer_width integer DEFAULT 55,
ADD COLUMN IF NOT EXISTS label_printer_height integer DEFAULT 35;

COMMENT ON COLUMN companies.label_printer_width IS 'Default label printer width in mm';
COMMENT ON COLUMN companies.label_printer_height IS 'Default label printer height in mm';
