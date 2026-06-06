-- MAI-2637: Add dietary preference capture to inquiries
-- Add dietary_preferences (JSONB array) + nut_allergy (boolean) to inquiries table

ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS dietary_preferences JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS nut_allergy BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.inquiries.dietary_preferences IS 'JSON array of dietary preferences: vegetarian, vegan, gluten-free, dairy-free, nut-free, halal-kosher';
COMMENT ON COLUMN public.inquiries.nut_allergy IS 'True if diner has a severe nut allergy requiring chef confirmation';