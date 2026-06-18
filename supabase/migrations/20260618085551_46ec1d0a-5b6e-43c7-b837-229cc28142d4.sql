DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users update own audio"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-audio' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'user-audio' AND (auth.uid())::text = (storage.foldername(name))[1]);

CREATE POLICY "Users update own tabs"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'tabs' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'tabs' AND (auth.uid())::text = (storage.foldername(name))[1]);