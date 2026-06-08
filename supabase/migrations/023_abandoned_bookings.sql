-- Abandoned Bookings Table
-- Stores booking form starts where user provided email but didn't complete booking
CREATE TABLE public.abandoned_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  chef_id UUID REFERENCES public.chef_profiles(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
  service_type TEXT,
  guest_count INT DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  contacted_at TIMESTAMPTZ
);

-- Index for efficient queries on the cron job
CREATE INDEX idx_abandoned_bookings_created_at ON public.abandoned_bookings(created_at);
CREATE INDEX idx_abandoned_bookings_email_chef ON public.abandoned_bookings(email, chef_id);
CREATE INDEX idx_abandoned_bookings_contacted ON public.abandoned_bookings(contacted_at) WHERE contacted_at IS NULL;

-- RLS
ALTER TABLE public.abandoned_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: anyone can insert abandoned bookings (from analytics)
CREATE POLICY "Anyone can insert abandoned bookings"
  ON public.abandoned_bookings FOR INSERT
  WITH CHECK (true);

-- Policy: only service role can view/update (for cron job and admin)
CREATE POLICY "Service role can manage abandoned bookings"
  ON public.abandoned_bookings FOR ALL
  USING (true);