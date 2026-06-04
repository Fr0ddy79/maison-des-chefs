-- Add status tracking to chef_applications
-- Enables admin review workflow for chef applications

ALTER TABLE public.chef_applications
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id);

-- RLS: Only allow UPDATE by admins (status transitions handled via API)
CREATE POLICY "Admins can update chef applications"
  ON public.chef_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add index for filtering by status
CREATE INDEX IF NOT EXISTS idx_chef_applications_status
  ON public.chef_applications (status);

-- Add index for pending applications (most common query)
CREATE INDEX IF NOT EXISTS idx_chef_applications_pending
  ON public.chef_applications (status)
  WHERE status = 'pending';