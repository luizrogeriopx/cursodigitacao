CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _user_id
    AND EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _user_id
        AND role = _role
    )
$$;

GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;

DROP POLICY IF EXISTS "admins view all progress" ON public.lesson_progress;
CREATE POLICY "admins view all progress"
ON public.lesson_progress
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins manage lessons" ON public.lessons;
CREATE POLICY "admins manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins manage payments" ON public.payments;
CREATE POLICY "admins manage payments"
ON public.payments
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins view all payments" ON public.payments;
CREATE POLICY "admins view all payments"
ON public.payments
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins delete profiles" ON public.profiles;
CREATE POLICY "admins delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins insert profiles" ON public.profiles;
CREATE POLICY "admins insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role) OR auth.uid() = id);

DROP POLICY IF EXISTS "admins update profiles" ON public.profiles;
CREATE POLICY "admins update profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins view all profiles" ON public.profiles;
CREATE POLICY "admins view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins manage roles" ON public.user_roles;
CREATE POLICY "admins manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "admins view all roles" ON public.user_roles;
CREATE POLICY "admins view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (private.has_role(auth.uid(), 'admin'::public.app_role));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;