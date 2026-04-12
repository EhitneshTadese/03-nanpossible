create extension if not exists pgcrypto;
create extension if not exists vector;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('platform_admin', 'chapter_admin', 'coach');
  end if;

  if not exists (select 1 from pg_type where typname = 'chapter_status') then
    create type public.chapter_status as enum ('active', 'draft', 'inactive');
  end if;

  if not exists (select 1 from pg_type where typname = 'certification_level') then
    create type public.certification_level as enum ('CALC', 'PALC', 'SALC', 'MALC');
  end if;

  if not exists (select 1 from pg_type where typname = 'certification_status') then
    create type public.certification_status as enum ('pending', 'active', 'expired', 'revoked');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum ('pending', 'paid', 'failed', 'refunded');
  end if;

  if not exists (select 1 from pg_type where typname = 'payment_type') then
    create type public.payment_type as enum ('enrollment_dues', 'certification_dues', 'other');
  end if;
end
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
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

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subdomain text not null unique,
  locale text not null default 'en',
  status public.chapter_status not null default 'draft',
  contact_email text not null,
  theme_json jsonb not null default '{}'::jsonb,
  tagline text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  role public.app_role not null default 'coach',
  chapter_id uuid references public.chapters (id) on delete set null,
  name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.current_app_role()
returns public.app_role
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'role', '')::public.app_role,
    (select u.role from public.users u where u.id = auth.uid()),
    'coach'::public.app_role
  );
$$;

create or replace function public.current_app_chapter_id()
returns uuid
language sql
stable
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'chapter_id', '')::uuid,
    (select u.chapter_id from public.users u where u.id = auth.uid())
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

create or replace function public.handle_auth_user_created()
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

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

drop policy if exists "users can update themselves" on public.users;
create policy "users can update themselves"
on public.users
for update
to authenticated
using (
  id = auth.uid()
  or public.current_app_role() = 'platform_admin'
)
with check (
  id = auth.uid()
  or public.current_app_role() = 'platform_admin'
);

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
  or public.current_app_role() = 'chapter_admin'
     and chapter_id = public.current_app_chapter_id()
)
with check (
  public.current_app_role() = 'platform_admin'
  or public.current_app_role() = 'chapter_admin'
     and chapter_id = public.current_app_chapter_id()
);

drop policy if exists "payments visible to chapter admins" on public.payments;
create policy "payments visible to chapter admins"
on public.payments
for select
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or public.current_app_role() = 'chapter_admin'
     and chapter_id = public.current_app_chapter_id()
);

drop policy if exists "payments managed by chapter admins" on public.payments;
create policy "payments managed by chapter admins"
on public.payments
for all
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or public.current_app_role() = 'chapter_admin'
     and chapter_id = public.current_app_chapter_id()
)
with check (
  public.current_app_role() = 'platform_admin'
  or public.current_app_role() = 'chapter_admin'
     and chapter_id = public.current_app_chapter_id()
);
