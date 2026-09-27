CREATE TYPE public.app_role AS ENUM ('coordinator');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Existing accounts are the current care coordinators.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'coordinator' FROM auth.users ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "auth users manage patients" ON public.patients;
CREATE POLICY "coordinators manage patients" ON public.patients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator')) WITH CHECK (public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "auth users manage tasks" ON public.discharge_tasks;
CREATE POLICY "coordinators manage tasks" ON public.discharge_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator')) WITH CHECK (public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "auth users manage checkins" ON public.checkins;
CREATE POLICY "coordinators manage checkins" ON public.checkins FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator')) WITH CHECK (public.has_role(auth.uid(), 'coordinator'));

DROP POLICY IF EXISTS "auth users manage caregivers" ON public.caregivers;
CREATE POLICY "coordinators manage caregivers" ON public.caregivers FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator')) WITH CHECK (public.has_role(auth.uid(), 'coordinator'));