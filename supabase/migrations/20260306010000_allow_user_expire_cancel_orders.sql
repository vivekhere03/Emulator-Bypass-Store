-- Allow users to update their own pending orders to expired or cancelled
CREATE POLICY "Users can expire or cancel own pending orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND status = 'pending'
)
WITH CHECK (
  auth.uid() = user_id
  AND status IN ('expired', 'cancelled')
);
