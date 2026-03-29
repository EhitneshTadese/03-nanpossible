create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if to_regclass('public.legacy_profiles') is null
    and to_regclass('public.profiles') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'profiles'
        and column_name = 'stripe_secret_id'
    ) then
    alter table public.profiles rename to legacy_profiles;
  end if;

  if to_regclass('public.legacy_coaches') is null
    and to_regclass('public.coaches') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'coaches'
        and column_name = 'cert_level'
    ) then
    alter table public.coaches rename to legacy_coaches;
  end if;

  if to_regclass('public.legacy_chapters') is null
    and to_regclass('public.chapters') is not null
    and exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'chapters'
        and column_name = 'chapter_id'
    ) then
    alter table public.chapters rename to legacy_chapters;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.legacy_profiles') is not null then
    execute 'alter table public.legacy_profiles disable row level security';
  end if;

  if to_regclass('public.legacy_coaches') is not null then
    execute 'alter table public.legacy_coaches disable row level security';
  end if;

  if to_regclass('public.legacy_chapters') is not null then
    execute 'alter table public.legacy_chapters disable row level security';
  end if;
end
$$;

do $$
begin
  if to_regtype('public.app_role') is null then
    create type public.app_role as enum (
      'platform_admin',
      'chapter_admin',
      'coach',
      'public_visitor'
    );
  end if;

  if to_regtype('public.chapter_status') is null then
    create type public.chapter_status as enum ('active', 'draft', 'inactive');
  end if;

  if to_regtype('public.certification_level') is null then
    create type public.certification_level as enum ('CALC', 'PALC', 'SALC', 'MALC');
  end if;

  if to_regtype('public.certification_status') is null then
    create type public.certification_status as enum ('pending', 'active', 'expired', 'revoked');
  end if;

  if to_regtype('public.payment_status') is null then
    create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
  end if;

  if to_regtype('public.payment_type') is null then
    create type public.payment_type as enum ('enrollment_dues', 'certification_dues', 'other');
  end if;
end
$$;

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null,
  locale text not null default 'en',
  status public.chapter_status not null default 'draft',
  contact_email text not null,
  theme_json jsonb not null default '{}'::jsonb,
  tagline text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.chapters
  add column if not exists name text,
  add column if not exists subdomain text,
  add column if not exists locale text,
  add column if not exists status public.chapter_status,
  add column if not exists contact_email text,
  add column if not exists theme_json jsonb,
  add column if not exists tagline text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.chapters
  alter column locale set default 'en',
  alter column status set default 'draft',
  alter column theme_json set default '{}'::jsonb,
  alter column tagline set default '',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

update public.chapters
set
  locale = coalesce(locale, 'en'),
  status = coalesce(status, 'draft'::public.chapter_status),
  contact_email = coalesce(nullif(contact_email, ''), 'info@wial.org'),
  theme_json = coalesce(theme_json, '{}'::jsonb),
  tagline = coalesce(tagline, ''),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()))
where
  locale is null
  or status is null
  or contact_email is null
  or theme_json is null
  or tagline is null
  or created_at is null
  or updated_at is null;

alter table public.chapters
  alter column name set not null,
  alter column subdomain set not null,
  alter column locale set not null,
  alter column status set not null,
  alter column contact_email set not null,
  alter column theme_json set not null,
  alter column tagline set not null,
  alter column created_at set not null,
  alter column updated_at set not null;

create unique index if not exists chapters_subdomain_unique_idx
  on public.chapters (subdomain);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  role public.app_role not null default 'public_visitor',
  chapter_id uuid references public.chapters (id) on delete set null,
  name text,
  phone text,
  location text,
  bio text,
  photo_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.users
  add column if not exists email text,
  add column if not exists role public.app_role,
  add column if not exists chapter_id uuid references public.chapters (id) on delete set null,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists location text,
  add column if not exists bio text,
  add column if not exists photo_url text,
  add column if not exists created_at timestamptz,
  add column if not exists updated_at timestamptz;

alter table public.users
  alter column role set default 'public_visitor',
  alter column created_at set default timezone('utc', now()),
  alter column updated_at set default timezone('utc', now());

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_email_key'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_email_key unique (email);
  end if;
end
$$;

create table if not exists public.content_pages (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid references public.chapters (id) on delete cascade,
  slug text not null,
  title text not null,
  body_html text not null default '',
  body_richtext jsonb not null default '{}'::jsonb,
  seo jsonb not null default '{}'::jsonb,
  source_url text,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists content_pages_global_slug_key
  on public.content_pages (slug)
  where chapter_id is null;

create unique index if not exists content_pages_chapter_slug_key
  on public.content_pages (chapter_id, slug)
  where chapter_id is not null;

create table if not exists public.coaches (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  user_id uuid references public.users (id) on delete set null,
  name text not null,
  certification_level public.certification_level,
  location text,
  contact_email text,
  bio text,
  specializations text[] not null default '{}'::text[],
  photo_url text,
  approved boolean not null default false,
  embedding vector(1536),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.certifications (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  coach_id uuid not null references public.coaches (id) on delete cascade,
  level public.certification_level not null,
  status public.certification_status not null default 'pending',
  issued_at date,
  expires_at date,
  credly_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  coach_id uuid references public.coaches (id) on delete set null,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  provider text,
  provider_payment_id text,
  status public.payment_status not null default 'pending',
  type public.payment_type not null default 'other',
  metadata jsonb not null default '{}'::jsonb,
  paid_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.parse_uuid(candidate text)
returns uuid
language plpgsql
immutable
as $$
begin
  if candidate is null or btrim(candidate) = '' then
    return null;
  end if;

  return candidate::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.coerce_app_role(candidate text)
returns public.app_role
language sql
immutable
as $$
  select case candidate
    when 'platform_admin' then 'platform_admin'::public.app_role
    when 'chapter_admin' then 'chapter_admin'::public.app_role
    when 'coach' then 'coach'::public.app_role
    when 'public_visitor' then 'public_visitor'::public.app_role
    when 'admin' then 'platform_admin'::public.app_role
    when 'moderator' then 'chapter_admin'::public.app_role
    else 'public_visitor'::public.app_role
  end;
$$;

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select public.coerce_app_role(auth.jwt() -> 'app_metadata' ->> 'role');
$$;

create or replace function public.current_app_chapter_id()
returns uuid
language sql
stable
as $$
  select public.parse_uuid(auth.jwt() -> 'app_metadata' ->> 'chapter_id');
$$;

create or replace function public.current_request_tenant()
returns text
language sql
stable
as $$
  select nullif(
    lower(
      coalesce(
        current_setting('request.headers', true)::json ->> 'x-wial-tenant',
        ''
      )
    ),
    ''
  );
$$;

create or replace function public.can_access_chapter(target_chapter_id uuid)
returns boolean
language sql
stable
as $$
  select
    public.current_app_role() = 'platform_admin'
    or (
      target_chapter_id is not null
      and public.current_app_chapter_id() = target_chapter_id
      and public.current_app_role() in ('chapter_admin', 'coach')
    );
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

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_email text;
  resolved_name text;
  resolved_role public.app_role;
  resolved_chapter_id uuid;
begin
  resolved_email := coalesce(new.email, concat(new.id::text, '@no-email.local'));
  resolved_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(resolved_email, '@', 1)
  );
  resolved_role := public.coerce_app_role(new.raw_app_meta_data ->> 'role');
  resolved_chapter_id := public.parse_uuid(new.raw_app_meta_data ->> 'chapter_id');

  insert into public.users (id, email, role, chapter_id, name)
  values (new.id, resolved_email, resolved_role, resolved_chapter_id, resolved_name)
  on conflict (id) do update
  set
    email = excluded.email,
    role = public.users.role,
    chapter_id = coalesce(public.users.chapter_id, excluded.chapter_id),
    name = coalesce(public.users.name, excluded.name);

  perform public.sync_auth_user_role(new.id, resolved_role, resolved_chapter_id);

  return new;
end;
$$;

create or replace function public.sync_public_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_email text;
  resolved_name text;
begin
  resolved_email := coalesce(new.email, concat(new.id::text, '@no-email.local'));
  resolved_name := coalesce(
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(resolved_email, '@', 1)
  );

  insert into public.users (id, email, role, chapter_id, name)
  values (
    new.id,
    resolved_email,
    public.coerce_app_role(new.raw_app_meta_data ->> 'role'),
    public.parse_uuid(new.raw_app_meta_data ->> 'chapter_id'),
    resolved_name
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = coalesce(public.users.name, excluded.name);

  return new;
end;
$$;

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

revoke all on function public.promote_self_to_coach() from public;
grant execute on function public.promote_self_to_coach() to authenticated;

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

revoke all on function public.promote_self_to_chapter_admin() from public;
grant execute on function public.promote_self_to_chapter_admin() to authenticated;

insert into public.users (id, email, role, name)
select
  au.id,
  coalesce(au.email, concat(au.id::text, '@no-email.local')),
  public.coerce_app_role(au.raw_app_meta_data ->> 'role'),
  coalesce(
    nullif(au.raw_user_meta_data ->> 'name', ''),
    split_part(coalesce(au.email, concat(au.id::text, '@no-email.local')), '@', 1)
  )
from auth.users au
on conflict (id) do update
set
  email = excluded.email,
  name = coalesce(public.users.name, excluded.name);

do $$
begin
  if to_regclass('public.legacy_profiles') is not null then
    update public.users u
    set
      name = coalesce(lp.name, u.name),
      role = case lp.role::text
        when 'admin' then 'platform_admin'::public.app_role
        when 'moderator' then 'chapter_admin'::public.app_role
        else u.role
      end
    from public.legacy_profiles lp
    where lp.id = u.id;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.legacy_chapters') is not null then
    insert into public.chapters (
      id,
      name,
      subdomain,
      locale,
      status,
      contact_email,
      theme_json,
      tagline,
      created_at,
      updated_at
    )
    select
      lc.chapter_id,
      coalesce(nullif(lc.location, ''), 'Legacy chapter'),
      lc.subdomain,
      coalesce(nullif(lc.language, ''), 'en'),
      'draft'::public.chapter_status,
      'info@wial.org',
      '{}'::jsonb,
      '',
      lc.created_at,
      lc.updated_at
    from public.legacy_chapters lc
    on conflict (id) do nothing;

    update public.users u
    set
      role = case
        when u.role = 'platform_admin' then u.role
        else 'chapter_admin'::public.app_role
      end,
      chapter_id = lc.chapter_id
    from public.legacy_chapters lc
    where lc.chapter_head_id = u.id;
  end if;
end
$$;

do $$
begin
  if to_regclass('public.legacy_coaches') is not null then
    update public.users u
    set
      role = case
        when u.role in ('platform_admin', 'chapter_admin') then u.role
        else 'coach'::public.app_role
      end,
      chapter_id = coalesce(u.chapter_id, lc.chapter_id)
    from public.legacy_coaches lc
    where lc.user_id = u.id;

    insert into public.coaches (
      chapter_id,
      user_id,
      name,
      certification_level,
      location,
      contact_email,
      bio,
      specializations,
      photo_url,
      approved,
      created_at,
      updated_at
    )
    select
      lc.chapter_id,
      lc.user_id,
      coalesce(u.name, split_part(u.email, '@', 1)),
      case lc.cert_level::text
        when 'CALC' then 'CALC'::public.certification_level
        when 'PALC' then 'PALC'::public.certification_level
        when 'SALC' then 'SALC'::public.certification_level
        when 'MALC' then 'MALC'::public.certification_level
        else null
      end,
      null,
      u.email,
      null,
      '{}'::text[],
      u.photo_url,
      true,
      lc.created_at,
      lc.updated_at
    from public.legacy_coaches lc
    join public.users u on u.id = lc.user_id
    where not exists (
      select 1
      from public.coaches c
      where c.user_id = lc.user_id
        and c.chapter_id = lc.chapter_id
    );
  end if;
end
$$;

do $$
declare
  snapshot record;
begin
  for snapshot in
    select id, role, chapter_id
    from public.users
  loop
    perform public.sync_auth_user_role(snapshot.id, snapshot.role, snapshot.chapter_id);
  end loop;
end
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
after update of email on auth.users
for each row execute procedure public.sync_public_user_email();

drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at
before update on public.chapters
for each row execute procedure public.set_updated_at();

drop trigger if exists users_set_updated_at on public.users;
create trigger users_set_updated_at
before update on public.users
for each row execute procedure public.set_updated_at();

drop trigger if exists content_pages_set_updated_at on public.content_pages;
create trigger content_pages_set_updated_at
before update on public.content_pages
for each row execute procedure public.set_updated_at();

drop trigger if exists coaches_set_updated_at on public.coaches;
create trigger coaches_set_updated_at
before update on public.coaches
for each row execute procedure public.set_updated_at();

drop trigger if exists certifications_set_updated_at on public.certifications;
create trigger certifications_set_updated_at
before update on public.certifications
for each row execute procedure public.set_updated_at();

drop trigger if exists payments_set_updated_at on public.payments;
create trigger payments_set_updated_at
before update on public.payments
for each row execute procedure public.set_updated_at();

alter table public.chapters enable row level security;
alter table public.users enable row level security;
alter table public.content_pages enable row level security;
alter table public.coaches enable row level security;
alter table public.certifications enable row level security;
alter table public.payments enable row level security;

drop policy if exists "chapters are public to read" on public.chapters;
create policy "chapters are public to read"
on public.chapters
for select
to anon, authenticated
using (status = 'active');

drop policy if exists "platform admins manage chapters" on public.chapters;
create policy "platform admins manage chapters"
on public.chapters
for all
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

drop policy if exists "users can read themselves" on public.users;
create policy "users can read themselves"
on public.users
for select
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

drop policy if exists "platform admins update users" on public.users;
create policy "platform admins update users"
on public.users
for update
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

drop policy if exists "platform admins insert users" on public.users;
create policy "platform admins insert users"
on public.users
for insert
to authenticated
with check (public.current_app_role() = 'platform_admin');

drop policy if exists "public can read published content" on public.content_pages;
create policy "public can read published content"
on public.content_pages
for select
to anon, authenticated
using (
  published = true
  and (
    chapter_id is null
    or exists (
      select 1
      from public.chapters c
      where c.id = content_pages.chapter_id
        and c.status = 'active'
        and c.subdomain = public.current_request_tenant()
    )
  )
);

drop policy if exists "chapter admins manage local content" on public.content_pages;
create policy "chapter admins manage local content"
on public.content_pages
for all
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or public.can_access_chapter(chapter_id)
)
with check (
  public.current_app_role() = 'platform_admin'
  or public.can_access_chapter(chapter_id)
);

drop policy if exists "public can read approved coaches" on public.coaches;
create policy "public can read approved coaches"
on public.coaches
for select
to anon, authenticated
using (
  approved = true
  and exists (
    select 1
    from public.chapters c
    where c.id = coaches.chapter_id
      and c.status = 'active'
      and c.subdomain = public.current_request_tenant()
  )
);

drop policy if exists "coaches and admins manage coach rows" on public.coaches;
create policy "coaches and admins manage coach rows"
on public.coaches
for all
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or public.can_access_chapter(chapter_id)
  or user_id = auth.uid()
)
with check (
  public.current_app_role() = 'platform_admin'
  or public.can_access_chapter(chapter_id)
  or user_id = auth.uid()
);

drop policy if exists "certifications visible to chapter" on public.certifications;
create policy "certifications visible to chapter"
on public.certifications
for select
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or public.can_access_chapter(chapter_id)
);

drop policy if exists "certifications managed by admins" on public.certifications;
create policy "certifications managed by admins"
on public.certifications
for all
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
)
with check (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

drop policy if exists "payments visible to chapter admins" on public.payments;
create policy "payments visible to chapter admins"
on public.payments
for select
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

drop policy if exists "payments managed by chapter admins" on public.payments;
create policy "payments managed by chapter admins"
on public.payments
for all
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
)
with check (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

insert into public.chapters (
  name,
  subdomain,
  locale,
  status,
  contact_email,
  theme_json,
  tagline
)
values
  (
    'Global WIAL',
    'global',
    'en',
    'active',
    'info@wial.org',
    '{}'::jsonb,
    'The worldwide action learning network'
  ),
  (
    'WIAL USA',
    'usa',
    'en-US',
    'active',
    'info@wial.org',
    '{}'::jsonb,
    'United States chapter'
  )
on conflict (subdomain) do nothing;
