CREATE POLICY "Users can insert own seller role"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id 
  AND role = 'seller'
  AND EXISTS (SELECT 1 FROM public.sellers WHERE sellers.user_id = auth.uid())
);