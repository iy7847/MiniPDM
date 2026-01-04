-- Create post_processings table
CREATE TABLE IF NOT EXISTS public.post_processings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
    name text NOT NULL,
    price_per_kg numeric DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Add simple RLS policy
ALTER TABLE public.post_processings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read/write for authenticated users based on company_id" ON public.post_processings;

CREATE POLICY "Enable read/write for authenticated users based on company_id" ON public.post_processings
    FOR ALL
    USING (auth.uid() IN (SELECT id FROM profiles WHERE company_id = post_processings.company_id))
    WITH CHECK (auth.uid() IN (SELECT id FROM profiles WHERE company_id = post_processings.company_id));

-- Add column to estimate_items
ALTER TABLE public.estimate_items ADD COLUMN IF NOT EXISTS post_processing_id uuid REFERENCES public.post_processings(id);
