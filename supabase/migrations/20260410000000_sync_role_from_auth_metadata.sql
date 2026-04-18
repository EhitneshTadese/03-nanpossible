-- Fix coerce_app_role: add missing content_creator case
create or replace function public.coerce_app_role(candidate text)
returns public.app_role
language sql
immutable
as $$
  select case candidate
    when 'platform_admin' then 'platform_admin'::public.app_role
    when 'chapter_admin' then 'chapter_admin'::public.app_role
    when 'content_creator' then 'content_creator'::public.app_role
    when 'coach' then 'coach'::public.app_role
    when 'public_visitor' then 'public_visitor'::public.app_role
    when 'admin' then 'platform_admin'::public.app_role
    when 'moderator' then 'chapter_admin'::public.app_role
    else 'public_visitor'::public.app_role
  end;
$$;

-- Trigger: sync app_metadata role changes back to public.users
-- (reverse direction of existing sync_auth_user_role)
create or replace function public.sync_role_from_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_role text;
  new_role text;
  resolved_role public.app_role;
  new_chapter_id uuid;
begin
  old_role := coalesce(old.raw_app_meta_data ->> 'role', '');
  new_role := coalesce(new.raw_app_meta_data ->> 'role', '');

  if old_role = new_role then
    return new;
  end if;

  resolved_role := public.coerce_app_role(new_role);
  new_chapter_id := public.parse_uuid(new.raw_app_meta_data ->> 'chapter_id');

  update public.users
  set
    role = resolved_role,
    chapter_id = coalesce(new_chapter_id, public.users.chapter_id)
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_role_synced on auth.users;
create trigger on_auth_user_role_synced
after update of raw_app_meta_data on auth.users
for each row execute procedure public.sync_role_from_auth_metadata();

-- Reverse trigger: sync public.users.role changes back to auth.users.app_metadata
-- (covers edits made via Table Editor or direct SQL on public.users)
create or replace function public.sync_role_to_auth_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role = new.role then
    return new;
  end if;

  perform public.sync_auth_user_role(new.id, new.role, new.chapter_id);
  return new;
end;
$$;

drop trigger if exists on_public_user_role_synced on public.users;
create trigger on_public_user_role_synced
after update of role on public.users
for each row execute procedure public.sync_role_to_auth_metadata();

-- One-time data repair: sync public.users.role from auth.users.app_metadata
-- for any rows where app_metadata has an explicit non-default role that differs
update public.users u
set role = public.coerce_app_role(au.raw_app_meta_data ->> 'role')
from auth.users au
where au.id = u.id
  and au.raw_app_meta_data ->> 'role' is not null
  and au.raw_app_meta_data ->> 'role' <> ''
  and u.role::text <> au.raw_app_meta_data ->> 'role';
