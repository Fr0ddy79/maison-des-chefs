-- Chef Applications Table
-- For chefs to apply to join the platform

CREATE TABLE public.chef_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT NOT NULL,
  cuisine_types TEXT[] NOT NULL DEFAULT '{}',
  years_experience INT NOT NULL,
  price_range TEXT,
  bio TEXT,
  preferred_contact TEXT CHECK (preferred_contact IN ('email', 'phone', 'either')) DEFAULT 'email',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for chef_applications
ALTER TABLE public.chef_applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (no auth required)
CREATE POLICY "Anyone can submit a chef application"
  ON public.chef_applications FOR INSERT
  WITH CHECK (true);

-- Chef applications are viewable by everyone
CREATE POLICY "Chef applications are viewable by everyone"
  ON public.chef_applications FOR SELECT
  USING (true);

-- Index for duplicate email checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_chef_applications_email 
  ON public.chef_applications (email);
