-- Add default quotation terms to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_payment_terms TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_incoterms TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_delivery_period TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_destination TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS default_note TEXT;

-- Comment for documentation
COMMENT ON COLUMN companies.default_payment_terms IS 'Default Payment Terms for new estimates (e.g. 50% deposit)';
COMMENT ON COLUMN companies.default_incoterms IS 'Default Incoterms (e.g. EXW, FOB)';
COMMENT ON COLUMN companies.default_delivery_period IS 'Default Delivery Period (e.g. 2-3 weeks)';
COMMENT ON COLUMN companies.default_destination IS 'Default Destination';
COMMENT ON COLUMN companies.default_note IS 'Default Note/Remarks for quotation';
