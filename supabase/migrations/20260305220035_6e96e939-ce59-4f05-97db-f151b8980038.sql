INSERT INTO public.user_roles (user_id, role)
VALUES ('0e253cbe-6448-44e3-82eb-4195cbafb5d6', 'seller')
ON CONFLICT (user_id, role) DO NOTHING;