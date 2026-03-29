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

alter table public.users
  alter column role set default 'public_visitor';

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    (select u.role from public.users u where u.id = auth.uid()),
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.app_role,
    'public_visitor'::public.app_role
  );
$$;

create or replace function public.current_app_chapter_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    (select u.chapter_id from public.users u where u.id = auth.uid()),
    nullif(auth.jwt() -> 'app_metadata' ->> 'chapter_id', '')::uuid
  );
$$;

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, name)
  values (
    new.id,
    new.email,
    'public_visitor',
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

create or replace function public.sync_public_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, name)
  values (
    new.id,
    new.email,
    'public_visitor',
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set email = excluded.email;

  return new;
end;
$$;

create or replace function public.sync_auth_user_role(
  target_user_id uuid,
  target_role public.app_role,
  target_chapter_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data =
    (
      coalesce(raw_app_meta_data, '{}'::jsonb)
      - 'role'
      - 'chapter_id'
    ) || jsonb_strip_nulls(
      jsonb_build_object(
        'role',
        target_role::text,
        'chapter_id',
        target_chapter_id
      )
    )
  where id = target_user_id;
end;
$$;

revoke all on function public.sync_auth_user_role(uuid, public.app_role, uuid) from public;

create or replace function public.promote_self_to_coach()
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
  set role = 'coach'
  where id = auth.uid()
    and role = 'public_visitor'
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Only public visitors can register as coaches';
  end if;

  perform public.sync_auth_user_role(
    updated_profile.id,
    updated_profile.role,
    updated_profile.chapter_id
  );

  return updated_profile;
end;
$$;

create or replace function public.promote_self_to_chapter_admin()
returns public.users
language plpgsql
security definer
set search_path = public
as $$
declare
  current_profile public.users;
  updated_profile public.users;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into current_profile
  from public.users
  where id = auth.uid();

  if current_profile.id is null then
    raise exception 'Profile not found';
  end if;

  if current_profile.role <> 'coach' then
    raise exception 'Only coaches can register as chapter heads';
  end if;

  if current_profile.chapter_id is null then
    raise exception 'A chapter assignment is required before chapter-head registration';
  end if;

  update public.users
  set role = 'chapter_admin'
  where id = current_profile.id
  returning * into updated_profile;

  perform public.sync_auth_user_role(
    updated_profile.id,
    updated_profile.role,
    updated_profile.chapter_id
  );

  return updated_profile;
end;
$$;

revoke all on function public.promote_self_to_coach() from public;
grant execute on function public.promote_self_to_coach() to authenticated;

revoke all on function public.promote_self_to_chapter_admin() from public;
grant execute on function public.promote_self_to_chapter_admin() to authenticated;
