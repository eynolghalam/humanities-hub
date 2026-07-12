
-- Owner can view and update all user_stats
CREATE POLICY "owners view all stats" ON public.user_stats
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "owners update all stats" ON public.user_stats
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

-- Owner can manage user_roles like admins
CREATE POLICY "Owners manage user_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'owner'::public.app_role));

CREATE POLICY "Owners view all user_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'::public.app_role));

-- Assign owner role to Mostafa Eyni Farimani
INSERT INTO public.user_roles (user_id, role)
VALUES ('5a8f1916-004c-4acb-9ff7-004761f78096', 'owner'::public.app_role)
ON CONFLICT (user_id, role) DO NOTHING;
