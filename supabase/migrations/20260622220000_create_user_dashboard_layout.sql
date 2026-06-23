CREATE TABLE public.user_dashboard_layout (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  widget_order text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_dashboard_layout ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dashboard layout"
  ON public.user_dashboard_layout FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dashboard layout"
  ON public.user_dashboard_layout FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dashboard layout"
  ON public.user_dashboard_layout FOR UPDATE
  USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_dashboard_layout TO authenticated;
GRANT ALL ON public.user_dashboard_layout TO service_role;
