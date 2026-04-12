-- Add 'content_creator' to app_role enum.
-- Must be in a separate transaction before it can be used in defaults/casts.
do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'content_creator'
  ) then
    alter type public.app_role add value 'content_creator';
  end if;
end
$$;
