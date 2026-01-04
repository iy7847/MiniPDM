-- Add permissions column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.profiles.permissions IS 'User permissions: {can_delete_estimate, can_view_margins, etc}';

-- Update RLS policies (Example - refine as needed)
-- Ensure users can read their own permissions
CREATE POLICY "Users can view own profile permissions" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);
