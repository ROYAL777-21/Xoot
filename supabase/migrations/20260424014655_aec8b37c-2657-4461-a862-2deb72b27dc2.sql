-- 1. Subscription cancellation friction (email-confirmed)
CREATE TABLE IF NOT EXISTS public.subscription_cancellation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subscription_id UUID NOT NULL,
  reason TEXT,
  token TEXT NOT NULL UNIQUE,
  confirmed BOOLEAN NOT NULL DEFAULT false,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
ALTER TABLE public.subscription_cancellation_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user manages own cancel requests"
  ON public.subscription_cancellation_requests FOR ALL TO public
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Discount column for subscription_plans
ALTER TABLE public.subscription_plans
  ADD COLUMN IF NOT EXISTS discount_pct NUMERIC NOT NULL DEFAULT 0;

-- 3. Gamification progress table (Care+ free booking unlocks)
CREATE TABLE IF NOT EXISTS public.gamification_progress (
  user_id UUID PRIMARY KEY,
  positive_reviews_count INTEGER NOT NULL DEFAULT 0,
  successful_referrals_count INTEGER NOT NULL DEFAULT 0,
  free_bookings_earned INTEGER NOT NULL DEFAULT 0,
  free_bookings_redeemed INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.gamification_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own gamification" ON public.gamification_progress
  FOR SELECT TO public USING (auth.uid() = user_id);
CREATE POLICY "user upserts own gamification" ON public.gamification_progress
  FOR INSERT TO public WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user updates own gamification" ON public.gamification_progress
  FOR UPDATE TO public USING (auth.uid() = user_id);

-- 4. Replace existing Care+ plans with a single premium subscription
DELETE FROM public.user_subscriptions;
DELETE FROM public.subscription_plans;
INSERT INTO public.subscription_plans (name, cadence, hours_per_visit, monthly_price, savings_pct, discount_pct, perks, popular)
VALUES (
  'Care+',
  'monthly',
  4,
  99,
  15,
  15,
  ARRAY[
    'Same trusted Zooter every visit',
    '15% off every on-demand booking',
    'Priority booking & schedule lock',
    'Free replacement Zooter — on us',
    'Earn free cleans through reviews & referrals',
    'Premium support, 24/7'
  ],
  true
);

-- 5. Trim catalogue to cleaning only
UPDATE public.zooters SET active = false WHERE role <> 'cleaning';

-- 6. Seed extra cleaning training modules (only if not already present)
INSERT INTO public.training_modules (title, description, duration_min, category, required, pass_score, badge_color, quiz_questions)
SELECT * FROM (VALUES
  ('Zoot Cleaning Standards 101', 'Foundational cleaning protocols every Zooter must follow on every visit.', 25, 'cleaning', true, 80, 'sage',
    '[
      {"q":"What do you do BEFORE starting a clean?","a":["Walk-through with the client","Open every cupboard","Move heavy furniture alone"],"correct":0},
      {"q":"Which surface needs a non-abrasive cloth?","a":["Granite countertops","Stainless steel","Both"],"correct":2},
      {"q":"If you accidentally break an item, what do you do?","a":["Hide it","Photograph it and notify Zoot Support immediately","Replace it secretly"],"correct":1}
    ]'::jsonb),
  ('Eco-friendly products & dilutions', 'Use the right product for the right surface — without harming people, pets or finishes.', 20, 'cleaning', true, 80, 'sage',
    '[
      {"q":"Bleach should NEVER be mixed with…","a":["Water","Ammonia or vinegar","Soap"],"correct":1},
      {"q":"For pet-safe cleaning, choose…","a":["Phenol-based","Plant-based enzymatic cleaners","Strong solvents"],"correct":1}
    ]'::jsonb),
  ('Airbnb turnover (180-min rapid clean)', 'Step-by-step turnover process for short-term rentals: linen, restock, photo proof.', 35, 'cleaning', true, 85, 'primary',
    '[
      {"q":"What proof must you upload after every Airbnb turnover?","a":["A selfie","Photos of every made-up room","Nothing"],"correct":1},
      {"q":"Linen change protocol?","a":["Reuse if it looks clean","Always change between guests","Only change pillowcases"],"correct":1},
      {"q":"Missing toiletries — what next?","a":["Skip and message host","Restock from supplies cupboard","Buy from your own pocket"],"correct":1}
    ]'::jsonb),
  ('Office & commercial cleaning', 'Procedures for after-hours office cleans: keys, alarms, restrooms, kitchens.', 25, 'cleaning', false, 80, 'sage',
    '[
      {"q":"Sensitive document on a desk — what do you do?","a":["Read it","Leave it untouched, dust around it","Take a photo"],"correct":1},
      {"q":"After arming the alarm, you must…","a":["Wait outside for it to set","Lock up and report exit time in the Zooter App","Leave the lights on"],"correct":1}
    ]'::jsonb),
  ('Deep clean (move-in / move-out)', 'Inside-of-oven, behind appliances, baseboards, cabinet interiors — the works.', 40, 'cleaning', false, 80, 'primary',
    '[
      {"q":"Best tool for grout?","a":["Stiff brush + baking soda paste","Razor blade","Pressure hose"],"correct":0},
      {"q":"Inside the fridge — start where?","a":["Bottom","Top, working down","Middle"],"correct":1}
    ]'::jsonb),
  ('Customer experience & communication', 'Tone, punctuality, boundaries — the soft skills that earn 5-star reviews.', 15, 'soft-skills', true, 80, 'sage',
    '[
      {"q":"You will arrive 10 min late. What do you do?","a":["Drive faster","Send a quick in-app message","Skip the visit"],"correct":1},
      {"q":"Client offers you food — best response?","a":["Politely decline unless explicitly invited","Help yourself","Ask for more"],"correct":0}
    ]'::jsonb),
  ('Health, safety & PPE', 'Safe lifting, glove protocols, what to do if you slip or get hurt during a job.', 20, 'safety', true, 80, 'sage',
    '[
      {"q":"Heavy box on the floor — lift with…","a":["Your back","Your knees, back straight","One arm"],"correct":1},
      {"q":"Cut yourself on glass — first action?","a":["Continue cleaning","Stop, clean wound, report incident in app","Wrap and finish"],"correct":1}
    ]'::jsonb),
  ('Trust & client property', 'Respect, privacy, and what to never touch in a client''s home.', 15, 'trust', true, 90, 'primary',
    '[
      {"q":"You find cash on the counter — what do you do?","a":["Pocket it","Photograph it, leave it, mention to client via app","Throw it away"],"correct":1},
      {"q":"Open client mail to dust?","a":["Yes","Never","Only bills"],"correct":1}
    ]'::jsonb)
) AS new_modules(title, description, duration_min, category, required, pass_score, badge_color, quiz_questions)
WHERE NOT EXISTS (
  SELECT 1 FROM public.training_modules tm WHERE tm.title = new_modules.title
);