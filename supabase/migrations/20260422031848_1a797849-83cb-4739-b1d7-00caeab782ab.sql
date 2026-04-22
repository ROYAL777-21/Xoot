
-- Extend zooters with tier + commission
ALTER TABLE public.zooters
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'new',
  ADD COLUMN IF NOT EXISTS commission_rate numeric NOT NULL DEFAULT 0.35,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS zooters_user_id_unique ON public.zooters(user_id) WHERE user_id IS NOT NULL;

-- Application table
CREATE TABLE IF NOT EXISTS public.zooter_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_name text NOT NULL,
  phone text,
  email text,
  date_of_birth date,
  id_number text,
  address text,
  city text,
  postal_code text,
  service_category public.service_category,
  bio text,
  bank_name text,
  bank_account_number text,
  bank_branch_code text,
  background_check_status text NOT NULL DEFAULT 'pending', -- pending|in_review|cleared|failed
  background_check_consent boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft', -- draft|submitted|approved|rejected
  reviewer_notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zooter_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "applicants insert own application"
  ON public.zooter_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "applicants view own application"
  ON public.zooter_applications FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "applicants update own draft"
  ON public.zooter_applications FOR UPDATE
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER touch_zooter_applications
  BEFORE UPDATE ON public.zooter_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Documents
CREATE TABLE IF NOT EXISTS public.zooter_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  application_id uuid REFERENCES public.zooter_applications(id) ON DELETE CASCADE,
  doc_type text NOT NULL, -- id, passport, proof_of_residence, bank_statement, selfie
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  rejected_reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zooter_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner manages own docs"
  ON public.zooter_documents FOR ALL
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Zooter jobs (offers)
CREATE TABLE IF NOT EXISTS public.zooter_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  zooter_id uuid NOT NULL,
  state text NOT NULL DEFAULT 'offered', -- offered|accepted|declined|expired|completed
  offered_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  decline_reason text
);

ALTER TABLE public.zooter_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zooter views own offers"
  ON public.zooter_jobs FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.zooters z WHERE z.id = zooter_jobs.zooter_id AND z.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.bookings b WHERE b.id = zooter_jobs.booking_id AND b.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "zooter updates own offers"
  ON public.zooter_jobs FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.zooters z WHERE z.id = zooter_jobs.zooter_id AND z.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "admins insert offers"
  ON public.zooter_jobs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR auth.uid() IS NOT NULL);

-- Earnings
CREATE TABLE IF NOT EXISTS public.zooter_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zooter_id uuid NOT NULL,
  booking_id uuid NOT NULL,
  gross_amount numeric NOT NULL,
  commission_rate numeric NOT NULL,
  net_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending|paid
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.zooter_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "zooter views own earnings"
  ON public.zooter_earnings FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.zooters z WHERE z.id = zooter_earnings.zooter_id AND z.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- Training completions
CREATE TABLE IF NOT EXISTS public.zooter_training_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

ALTER TABLE public.zooter_training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user views own completions"
  ON public.zooter_training_completions FOR SELECT
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "user records own completions"
  ON public.zooter_training_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add quiz fields to training_modules
ALTER TABLE public.training_modules
  ADD COLUMN IF NOT EXISTS quiz_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pass_score integer NOT NULL DEFAULT 80;

-- Storage bucket for KYC (private)
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-docs', 'kyc-docs', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "users upload own kyc"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users view own kyc"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'kyc-docs'
    AND (auth.uid()::text = (storage.foldername(name))[1] OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "users delete own kyc"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'kyc-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Public bucket for zooter avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('zooter-avatars', 'zooter-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anyone views avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'zooter-avatars');

CREATE POLICY "users upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'zooter-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
