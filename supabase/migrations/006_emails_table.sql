-- Email Waitlist Table
-- For capturing emails from interested diners before platform launch

CREATE TABLE public.emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for emails table
ALTER TABLE public.emails ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an email (no auth required for waitlist)
CREATE POLICY "Anyone can submit to the email waitlist"
  ON public.emails FOR INSERT
  WITH CHECK (true);

-- Emails are viewable by everyone (for admin purposes)
CREATE POLICY "Emails are viewable by everyone"
  ON public.emails FOR SELECT
  USING (true);

-- Index for duplicate email checking
CREATE UNIQUE INDEX IF NOT EXISTS idx_emails_email 
  ON public.emails (email);
