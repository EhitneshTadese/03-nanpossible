alter table public.users
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists bio text,
  add column if not exists photo_url text;

create or replace function public.sync_public_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute procedure public.sync_public_user_email();

create or replace function public.update_my_profile(
  profile_name text,
  profile_phone text default null,
  profile_location text default null,
  profile_bio text default null,
  profile_photo_url text default null
)
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.users;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.users
  set
    name = trim(profile_name),
    phone = nullif(trim(profile_phone), ''),
    location = nullif(trim(profile_location), ''),
    bio = nullif(trim(profile_bio), ''),
    photo_url = nullif(trim(profile_photo_url), '')
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_my_profile(text, text, text, text, text) from public;
grant execute on function public.update_my_profile(text, text, text, text, text) to authenticated;

drop policy if exists "users can update themselves" on public.users;
drop policy if exists "platform admins update users" on public.users;

create policy "platform admins update users"
on public.users
for update
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');
