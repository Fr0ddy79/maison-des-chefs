-- Maison des Chefs - Initial Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles (extends auth.users) - modified to not require auth.users for demo
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('diner', 'chef')) DEFAULT 'diner',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chef-specific profiles
CREATE TABLE public.chef_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT,
  bio TEXT,
  location TEXT,
  cuisines TEXT[] DEFAULT '{}',
  years_experience INT,
  is_verified BOOLEAN DEFAULT FALSE,
  avg_rating DECIMAL(2,1) DEFAULT 0,
  review_count INT DEFAULT 0,
  price_per_hour DECIMAL(10,2),
  price_per_event DECIMAL(10,2),
  max_guests INT DEFAULT 8,
  hero_image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Services/experiences offered by chefs
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  cuisine_type TEXT,
  duration_hours DECIMAL(4,1),
  price_per_person DECIMAL(10,2),
  max_guests INT DEFAULT 8,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chef availability slots
CREATE TABLE public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_booked BOOLEAN DEFAULT FALSE,
  UNIQUE(chef_id, date, start_time)
);

-- Bookings
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  diner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME,
  guest_count INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  diner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS) Policies

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Chef profiles policies
CREATE POLICY "Chef profiles are viewable by everyone"
  ON public.chef_profiles FOR SELECT
  USING (true);

CREATE POLICY "Chefs can insert their own profile"
  ON public.chef_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Chefs can update their own profile"
  ON public.chef_profiles FOR UPDATE
  USING (auth.uid() = id);

-- Services policies
CREATE POLICY "Services are viewable by everyone"
  ON public.services FOR SELECT
  USING (true);

CREATE POLICY "Chefs can insert services for themselves"
  ON public.services FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chef_profiles
      WHERE id = chef_id AND id = auth.uid()
    )
  );

CREATE POLICY "Chefs can update their own services"
  ON public.services FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.chef_profiles
      WHERE id = chef_id AND id = auth.uid()
    )
  );

-- Availability policies
CREATE POLICY "Availability is viewable by everyone"
  ON public.availability FOR SELECT
  USING (true);

CREATE POLICY "Chefs can manage their own availability"
  ON public.availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chef_profiles
      WHERE id = chef_id AND id = auth.uid()
    )
  );

-- Bookings policies
CREATE POLICY "Chefs can view bookings for their services"
  ON public.bookings FOR SELECT
  USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE id = auth.uid()
    )
    OR diner_id = auth.uid()
  );

CREATE POLICY "Authenticated users can create bookings"
  ON public.bookings FOR INSERT
  WITH CHECK (auth.uid() = diner_id);

CREATE POLICY "Chefs and diners can update bookings"
  ON public.bookings FOR UPDATE
  USING (
    chef_id IN (
      SELECT id FROM public.chef_profiles WHERE id = auth.uid()
    )
    OR diner_id = auth.uid()
  );

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "Diners can create reviews for completed bookings"
  ON public.reviews FOR INSERT
  WITH CHECK (
    auth.uid() = diner_id AND
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND diner_id = auth.uid() AND status = 'completed'
    )
  );

-- Functions

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'diner')
  );
  
  -- If user signed up as chef, create chef_profile too
  IF NEW.raw_user_meta_data->>'role' = 'chef' THEN
    INSERT INTO public.chef_profiles (id, display_name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for auto-creating profiles
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update chef rating when a new review is inserted
CREATE OR REPLACE FUNCTION public.update_chef_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.chef_profiles
  SET
    avg_rating = (
      SELECT ROUND(AVG(rating)::numeric, 1)
      FROM public.reviews
      WHERE chef_id = NEW.chef_id
    ),
    review_count = (
      SELECT COUNT(*)
      FROM public.reviews
      WHERE chef_id = NEW.chef_id
    )
  WHERE id = NEW.chef_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_chef_rating();
