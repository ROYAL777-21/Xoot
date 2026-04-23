
-- 1. Saved addresses
CREATE TABLE IF NOT EXISTS public.saved_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT,
  postal_code TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.saved_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own addresses" ON public.saved_addresses FOR ALL
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, created_at DESC);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "system inserts notifications" ON public.notifications FOR INSERT WITH CHECK (true);

-- 3. zootCred wallet (one row per user)
CREATE TABLE IF NOT EXISTS public.zootcred_wallets (
  user_id UUID PRIMARY KEY,
  balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.zootcred_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own wallet" ON public.zootcred_wallets FOR SELECT USING (auth.uid() = user_id);

-- zootCred ledger (history)
CREATE TABLE IF NOT EXISTS public.zootcred_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  reason TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_zootcred_ledger_user ON public.zootcred_ledger(user_id, created_at DESC);
ALTER TABLE public.zootcred_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own ledger" ON public.zootcred_ledger FOR SELECT USING (auth.uid() = user_id);

-- 4. Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  user_id UUID PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  total_invited INTEGER NOT NULL DEFAULT 0,
  total_rewarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own referral" ON public.referrals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "view by code" ON public.referrals FOR SELECT USING (true);
DROP POLICY IF EXISTS "view own referral" ON public.referrals;

CREATE TABLE IF NOT EXISTS public.referral_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID NOT NULL,
  referred_user_id UUID NOT NULL UNIQUE,
  rewarded BOOLEAN NOT NULL DEFAULT false,
  rewarded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.referral_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own redemptions" ON public.referral_redemptions FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

-- 5. Care+ applications (permanent placements)
CREATE TABLE IF NOT EXISTS public.care_plus_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted',
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  preferred_start_date DATE,
  daily_start_time TIME,
  daily_end_time TIME,
  days_of_week TEXT[] DEFAULT '{}'::text[],
  daily_pay_rate NUMERIC(10,2),
  overtime TEXT,
  job_description TEXT,
  preferred_language TEXT,
  ideal_personality TEXT,
  required_skills TEXT[] DEFAULT '{}'::text[],
  pets TEXT[] DEFAULT '{}'::text[],
  other_qualities TEXT,
  admin_fee_paid BOOLEAN NOT NULL DEFAULT false,
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.care_plus_applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "manage own care+ application" ON public.care_plus_applications FOR ALL
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_care_plus_apps_updated BEFORE UPDATE ON public.care_plus_applications
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 6. Add booking fields for frequency, planned hours, cancellation fees
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS frequency TEXT NOT NULL DEFAULT 'one_time';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(10,2) NOT NULL DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS replacement_offered BOOLEAN NOT NULL DEFAULT false;

-- 7. Helper: generate unique referral code
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
  exists_count INT;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..6 LOOP
      result := result || substr(chars, floor(random()*length(chars))::int + 1, 1);
    END LOOP;
    SELECT count(*) INTO exists_count FROM public.referrals WHERE code = result;
    EXIT WHEN exists_count = 0;
  END LOOP;
  RETURN result;
END;
$$;

-- 8. Update handle_new_user to also seed referral code, wallet, and welcome notification
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.loyalty_points (user_id) VALUES (NEW.id);
  INSERT INTO public.user_reassignment_state (user_id) VALUES (NEW.id);
  INSERT INTO public.referrals (user_id, code) VALUES (NEW.id, public.gen_referral_code());
  INSERT INTO public.zootcred_wallets (user_id, balance) VALUES (NEW.id, 0);
  INSERT INTO public.notifications (user_id, kind, title, body, link)
    VALUES (NEW.id, 'welcome', 'Welcome to Zoot!', 'Your home, sparkling clean. Book your first visit and earn 100 zootCred.', '/app');
  RETURN NEW;
END;
$$;

-- 9. Convert existing zooter hourly rates from USD-style numbers to ZAR realistic
-- (cleaning typical R80–R150/hr). We multiply $/hr by ~5.5 then round.
UPDATE public.zooters SET hourly_rate = ROUND(hourly_rate * 5.5);
UPDATE public.bookings SET price = ROUND(price * 5.5);
UPDATE public.subscription_plans SET monthly_price = ROUND(monthly_price * 5.5);

-- Drop non-cleaning zooters (we're cleaning-only now)
DELETE FROM public.zooters WHERE role <> 'cleaning';
