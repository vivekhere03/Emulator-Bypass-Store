ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text UNIQUE;

CREATE OR REPLACE FUNCTION public.get_email_by_username(_username text)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT email FROM public.profiles WHERE lower(username) = lower(_username) LIMIT 1;
$$;