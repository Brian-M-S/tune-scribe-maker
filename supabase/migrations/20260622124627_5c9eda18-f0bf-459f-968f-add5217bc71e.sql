
-- 1) Move pg_net out of the public schema (extension doesn't support SET SCHEMA)
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO postgres, anon, authenticated, service_role;

DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

-- 2) Shared-secret table for internal cron -> edge function calls.
CREATE TABLE IF NOT EXISTS public.app_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.app_secrets FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.app_secrets TO service_role;
ALTER TABLE public.app_secrets ENABLE ROW LEVEL SECURITY;

INSERT INTO public.app_secrets (name, value)
VALUES ('cron_secret', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;

-- 3) Re-schedule the health probe so it sends the shared secret as a header.
SELECT cron.unschedule('songsterr-health-6h');

SELECT cron.schedule(
  'songsterr-health-6h',
  '0 */6 * * *',
  $cron$
  SELECT extensions.http_post(
    url := 'https://project--9ee53ca5-23a4-4a1f-b002-1ccfe7080157.lovable.app/api/public/hooks/songsterr-health',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT value FROM public.app_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $cron$
);
