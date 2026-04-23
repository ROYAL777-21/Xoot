
-- Fix search_path on gen_referral_code
CREATE OR REPLACE FUNCTION public.gen_referral_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

-- Tighten notifications INSERT policy: only allow users to create notifications for themselves
DROP POLICY IF EXISTS "system inserts notifications" ON public.notifications;
CREATE POLICY "user creates own notifications" ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);
-- (Server-side notifications go through service role and bypass RLS.)
