ALTER TABLE public.notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_digest boolean NOT NULL DEFAULT true,
  watchlist_target boolean NOT NULL DEFAULT true,
  portfolio_move boolean NOT NULL DEFAULT true,
  profit_target boolean NOT NULL DEFAULT true,
  portfolio_move_pct integer NOT NULL DEFAULT 5 CHECK (portfolio_move_pct BETWEEN 1 AND 50),
  profit_target_pct integer NOT NULL DEFAULT 20 CHECK (profit_target_pct BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT push_tokens_user_token_unique UNIQUE (user_id, expo_push_token)
);

CREATE INDEX push_tokens_user_idx ON public.push_tokens (user_id);

CREATE TABLE public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  dedupe_key text NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX notification_log_user_sent_idx ON public.notification_log (user_id, sent_at DESC);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own push tokens"
  ON public.push_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push tokens"
  ON public.push_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push tokens"
  ON public.push_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push tokens"
  ON public.push_tokens FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own notification log"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.notification_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT ON public.notification_log TO authenticated;
GRANT ALL ON public.notification_preferences TO service_role;
GRANT ALL ON public.push_tokens TO service_role;
GRANT ALL ON public.notification_log TO service_role;
