-- Analytics Events Table
-- Stores all analytics events for funnel tracking and business metrics
-- Issue: MAI-2745

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_data JSONB DEFAULT '{}',
  session_id TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON public.analytics_events(created_at);

-- Index for time-series analytics queries
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created ON public.analytics_events(event_name, created_at DESC);

-- RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert events (from client tracking)
CREATE POLICY "Anyone can create analytics events"
  ON public.analytics_events FOR INSERT
  WITH CHECK (true);

-- Only authenticated admins can read events (for dashboard)
CREATE POLICY "Admins can read analytics events"
  ON public.analytics_events FOR SELECT
  USING (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  ));

-- Service role can also read for cron jobs / background processing
CREATE POLICY "Service role can manage analytics events"
  ON public.analytics_events FOR ALL
  USING (auth.role() = 'service_role');
