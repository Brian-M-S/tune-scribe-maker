
-- =========================
-- Enums
-- =========================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.track_status AS ENUM ('pending', 'processing', 'complete', 'error');
CREATE TYPE public.tab_source AS ENUM ('songsterr', 'ai_local', 'manual');

-- =========================
-- profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- =========================
-- user_roles
-- =========================
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- =========================
-- tracks (Suno generations)
-- =========================
CREATE TABLE public.tracks (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  prompt TEXT,
  style TEXT,
  model TEXT,
  instrumental BOOLEAN NOT NULL DEFAULT false,
  lyrics TEXT,
  suno_task_id TEXT,
  suno_audio_id TEXT,
  audio_url TEXT,
  stream_audio_url TEXT,
  image_url TEXT,
  video_url TEXT,
  vocal_url TEXT,
  instrumental_url TEXT,
  status public.track_status NOT NULL DEFAULT 'pending',
  duration_seconds NUMERIC,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tracks TO authenticated;
GRANT ALL ON public.tracks TO service_role;
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own tracks" ON public.tracks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own tracks" ON public.tracks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own tracks" ON public.tracks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own tracks" ON public.tracks
  FOR DELETE USING (auth.uid() = user_id);

-- =========================
-- practice_sessions
-- =========================
CREATE TABLE public.practice_sessions (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  artist TEXT,
  youtube_video_id TEXT,
  youtube_title TEXT,
  audio_url TEXT,
  tempo NUMERIC NOT NULL DEFAULT 1.0,
  pitch_semitones INT NOT NULL DEFAULT 0,
  loop_start NUMERIC,
  loop_end NUMERIC,
  offset_ms INT NOT NULL DEFAULT 0,
  bpm NUMERIC,
  notes TEXT,
  saved_tab_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.practice_sessions TO authenticated;
GRANT ALL ON public.practice_sessions TO service_role;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sessions" ON public.practice_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own sessions" ON public.practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own sessions" ON public.practice_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.practice_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- =========================
-- saved_tabs
-- =========================
CREATE TABLE public.saved_tabs (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  artist TEXT,
  source public.tab_source NOT NULL,
  songsterr_id TEXT,
  tab_url TEXT,
  format TEXT,
  storage_path TEXT,
  midi_storage_path TEXT,
  raw_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_tabs TO authenticated;
GRANT ALL ON public.saved_tabs TO service_role;
ALTER TABLE public.saved_tabs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own tabs" ON public.saved_tabs
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own tabs" ON public.saved_tabs
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own tabs" ON public.saved_tabs
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own tabs" ON public.saved_tabs
  FOR DELETE USING (auth.uid() = user_id);

-- =========================
-- updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_touch BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_tracks_touch BEFORE UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_sessions_touch BEFORE UPDATE ON public.practice_sessions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- =========================
-- handle_new_user trigger
-- =========================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================
-- Storage buckets for user audio
-- =========================
INSERT INTO storage.buckets (id, name, public) VALUES ('user-audio', 'user-audio', false)
  ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('tabs', 'tabs', false)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users read own audio" ON storage.objects
  FOR SELECT USING (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own audio" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own audio" ON storage.objects
  FOR DELETE USING (bucket_id = 'user-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users read own tabs" ON storage.objects
  FOR SELECT USING (bucket_id = 'tabs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users upload own tabs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tabs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users delete own tabs" ON storage.objects
  FOR DELETE USING (bucket_id = 'tabs' AND auth.uid()::text = (storage.foldername(name))[1]);
