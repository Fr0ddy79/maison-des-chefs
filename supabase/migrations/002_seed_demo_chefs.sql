-- Maison des Chefs - Seed Demo Chef Profiles
-- Run this in your Supabase SQL Editor after the initial schema
-- This populates the database with demo chefs matching the landing page mock data

-- ============================================================
-- SEED CHEF PROFILES
-- ============================================================

-- Chef Laurent Mercier - French, Contemporary - Montreal - $350/event - 4.9 rating (47 reviews)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'laurent.mercier@example.com',
  'Laurent Mercier',
  'chef'
);

INSERT INTO public.chef_profiles (
  id,
  display_name,
  bio,
  location,
  cuisines,
  years_experience,
  is_verified,
  avg_rating,
  review_count,
  price_per_event,
  max_guests,
  hero_image_url
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Chef Laurent Mercier',
  'Trained at Le Cordon Bleu Paris, Laurent brings 15 years of experience from Michelin-starred kitchens to your dining table.',
  'Montreal',
  ARRAY['French', 'Contemporary'],
  15,
  true,
  4.9,
  47,
  350.00,
  12,
  'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=600&fit=crop'
);

-- Chef Sophie Tremblay - French, Seafood - Westmount - $400/event - 4.8 rating (32 reviews)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'sophie.tremblay@example.com',
  'Sophie Tremblay',
  'chef'
);

INSERT INTO public.chef_profiles (
  id,
  display_name,
  bio,
  location,
  cuisines,
  years_experience,
  is_verified,
  avg_rating,
  review_count,
  price_per_event,
  max_guests,
  hero_image_url
) VALUES (
  'a0000000-0000-0000-0000-000000000002',
  'Chef Sophie Tremblay',
  'Specializing in sustainable seafood and seasonal Quebec ingredients, Sophie creates memorable coastal-inspired experiences.',
  'Westmount',
  ARRAY['French', 'Seafood'],
  12,
  true,
  4.8,
  32,
  400.00,
  10,
  'https://images.unsplash.com/photo-1583394293214-28ez-0a6cfb?w=600&h=600&fit=crop'
);

-- Chef Marco Pelletier - Italian, Mediterranean - Old Montreal - $300/event - 4.7 rating (28 reviews)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'marco.pelletier@example.com',
  'Marco Pelletier',
  'chef'
);

INSERT INTO public.chef_profiles (
  id,
  display_name,
  bio,
  location,
  cuisines,
  years_experience,
  is_verified,
  avg_rating,
  review_count,
  price_per_event,
  max_guests,
  hero_image_url
) VALUES (
  'a0000000-0000-0000-0000-000000000003',
  'Chef Marco Pelletier',
  'Born in Italy, raised in Montreal. Marco crafts authentic Mediterranean feasts with homemade pasta and wood-fired techniques.',
  'Old Montreal',
  ARRAY['Italian', 'Mediterranean'],
  10,
  true,
  4.7,
  28,
  300.00,
  16,
  'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=600&fit=crop'
);

-- Chef Ami Tanaka - Japanese, French, Fusion - Plateau - $450/event - 4.9 rating (19 reviews)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'ami.tanaka@example.com',
  'Ami Tanaka',
  'chef'
);

INSERT INTO public.chef_profiles (
  id,
  display_name,
  bio,
  location,
  cuisines,
  years_experience,
  is_verified,
  avg_rating,
  review_count,
  price_per_event,
  max_guests,
  hero_image_url
) VALUES (
  'a0000000-0000-0000-0000-000000000004',
  'Chef Ami Tanaka',
  'Japanese-French fusion master. Ami''s omakase-style experiences blend precision techniques with bold flavors.',
  'Plateau',
  ARRAY['Japanese', 'French', 'Fusion'],
  8,
  true,
  4.9,
  19,
  450.00,
  8,
  'https://images.unsplash.com/photo-1583394293214-28ez-0a6cfb?w=600&h=600&fit=crop'
);

-- Chef Marie-Claire Dubois - French, Vegetarian, Farm-to-Table - NDG - $320/event - 4.8 rating (41 reviews)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'marie-claire.dubois@example.com',
  'Marie-Claire Dubois',
  'chef'
);

INSERT INTO public.chef_profiles (
  id,
  display_name,
  bio,
  location,
  cuisines,
  years_experience,
  is_verified,
  avg_rating,
  review_count,
  price_per_event,
  max_guests,
  hero_image_url
) VALUES (
  'a0000000-0000-0000-0000-000000000005',
  'Chef Marie-Claire Dubois',
  'Champion of local, organic ingredients. Marie-Claire transforms Quebec farms'' bounty into elegant vegetarian feasts.',
  'NDG',
  ARRAY['French', 'Vegetarian', 'Farm-to-Table'],
  14,
  true,
  4.8,
  41,
  320.00,
  10,
  'https://images.unsplash.com/photo-1583394293214-28ez-0a6cfb?w=600&h=600&fit=crop'
);

-- Chef David Chen - French, Asian Fusion, Fine Dining - Downtown - $380/event - 4.6 rating (24 reviews)
INSERT INTO public.profiles (id, email, full_name, role)
VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'david.chen@example.com',
  'David Chen',
  'chef'
);

INSERT INTO public.chef_profiles (
  id,
  display_name,
  bio,
  location,
  cuisines,
  years_experience,
  is_verified,
  avg_rating,
  review_count,
  price_per_event,
  max_guests,
  hero_image_url
) VALUES (
  'a0000000-0000-0000-0000-000000000006',
  'Chef David Chen',
  'Award-winning chef combining classical French training with Asian influences. Perfect for adventurous palates.',
  'Downtown',
  ARRAY['French', 'Asian Fusion', 'Fine Dining'],
  11,
  true,
  4.6,
  24,
  380.00,
  14,
  'https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=600&fit=crop'
);

-- ============================================================
-- VERIFICATION QUERY (run to confirm seed)
-- ============================================================
-- SELECT 
--   cp.display_name,
--   cp.location,
--   cp.cuisines,
--   cp.avg_rating,
--   cp.review_count,
--   cp.price_per_event,
--   cp.is_verified
-- FROM public.chef_profiles cp
-- ORDER BY cp.avg_rating DESC;
