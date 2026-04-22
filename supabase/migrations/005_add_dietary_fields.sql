-- MAI-425: Add dietary fields to bookings table
-- Migration for dietary restrictions feature

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT DEFAULT '[]'::text,
ADD COLUMN IF NOT EXISTS allergies TEXT DEFAULT '[]'::text,
ADD COLUMN IF NOT EXISTS allergy_severity TEXT DEFAULT '{}'::text,
ADD COLUMN IF NOT EXISTS food_preferences TEXT,
ADD COLUMN IF NOT EXISTS special_occasion TEXT;

-- Comments for documentation
COMMENT ON COLUMN public.bookings.dietary_restrictions IS 'JSON array of dietary restrictions (e.g., vegetarian, vegan, gluten-free)';
COMMENT ON COLUMN public.bookings.allergies IS 'JSON array of allergies (e.g., peanuts, shellfish, dairy)';
COMMENT ON COLUMN public.bookings.allergy_severity IS 'JSON object mapping allergy to severity level (e.g., {"peanuts": "severe", "dairy": "mild"})';
COMMENT ON COLUMN public.bookings.food_preferences IS 'General food preferences and likes';
COMMENT ON COLUMN public.bookings.special_occasion IS 'Special occasion for the booking (e.g., birthday, anniversary, honeymoon)';