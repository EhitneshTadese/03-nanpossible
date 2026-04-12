-- Add 'public_visitor' to app_role enum.
-- Must be in a separate transaction before it can be used in defaults/casts.
do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.app_role'::regtype
      and enumlabel = 'public_visitor'
  ) then
    alter type public.app_role add value 'public_visitor';
  end if;
end
$$;
