ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free'
  CHECK (plan IN ('free', 'pro'));

CREATE TABLE public.valuation_refresh_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('portfolio', 'card')),
  refreshed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX valuation_refresh_log_user_time_idx
  ON public.valuation_refresh_log (user_id, refreshed_at DESC);

ALTER TABLE public.valuation_refresh_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own refresh log"
  ON public.valuation_refresh_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own refresh log"
  ON public.valuation_refresh_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.valuation_refresh_log TO authenticated;
GRANT ALL ON public.valuation_refresh_log TO service_role;
