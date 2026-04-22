-- Reset migration - drops all tables for clean slate
-- This allows fresh migration deployment

DO $$
BEGIN
  -- Drop triggers first (they depend on tables)
  DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.update_chef_rating() CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.bookings CASCADE;
DROP TABLE IF EXISTS public.availability CASCADE;
DROP TABLE IF EXISTS public.services CASCADE;
DROP TABLE IF EXISTS public.chef_profiles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;