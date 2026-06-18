
ALTER TYPE public.tab_source ADD VALUE IF NOT EXISTS 'upload';

CREATE TABLE IF NOT EXISTS public.service_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service text NOT NULL,
  endpoint text NOT NULL,
  ok boolean NOT NULL,
  status_code int,
  schema_ok boolean NOT NULL DEFAULT false,
  sample text,
  checked_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.service_health TO authenticated;
GRANT ALL ON public.service_health TO service_role;

ALTER TABLE public.service_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read service_health"
ON public.service_health FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS service_health_service_checked_at_idx
ON public.service_health (service, checked_at DESC);
