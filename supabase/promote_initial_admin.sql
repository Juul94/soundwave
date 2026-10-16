-- Run ONCE in the Supabase SQL editor after creating your auth user
-- (Dashboard > Authentication > Users > Add user, "Auto Confirm User" checked).
-- Replace the email below. Contains no passwords.
update public.profiles
set role = 'admin'
where email = 'admin@example.com';

select id, email, role, is_active from public.profiles where role = 'admin';
