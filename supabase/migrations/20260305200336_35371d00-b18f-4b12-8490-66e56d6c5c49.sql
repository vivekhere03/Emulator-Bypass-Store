-- Allow authenticated users to create their own seller record (become a seller)
CREATE POLICY "Users can create own seller record"
ON public.sellers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
