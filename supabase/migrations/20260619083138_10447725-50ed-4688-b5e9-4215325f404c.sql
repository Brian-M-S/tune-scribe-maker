CREATE TABLE public.search_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  query text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX search_history_user_created_idx ON public.search_history (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.search_history TO authenticated;
GRANT ALL ON public.search_history TO service_role;

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own search history" ON public.search_history
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own search history" ON public.search_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own search history" ON public.search_history
  FOR DELETE USING (auth.uid() = user_id);