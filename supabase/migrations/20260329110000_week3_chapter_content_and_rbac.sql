create extension if not exists pgcrypto;

-- content_creator enum value added in 20260329100000_add_content_creator_enum.sql

alter table public.chapters
  add column if not exists region text,
  add column if not exists language text not null default 'en',
  add column if not exists country text,
  add column if not exists lead_user_id uuid references auth.users (id) on delete set null,
  add column if not exists contact_phone text,
  add column if not exists description text,
  add column if not exists logo_url text,
  add column if not exists stripe_account_id text,
  add column if not exists config jsonb not null default '{}'::jsonb;

update public.chapters
set
  language = coalesce(nullif(language, ''), nullif(locale, ''), 'en'),
  description = coalesce(description, nullif(tagline, '')),
  config = coalesce(config, theme_json, '{}'::jsonb);

alter table public.users
  add column if not exists assigned_chapters uuid[] not null default '{}'::uuid[];

alter table public.content_pages
  add column if not exists body_json jsonb,
  add column if not exists is_global boolean not null default false,
  add column if not exists language text not null default 'en',
  add column if not exists sort_order int not null default 0,
  add column if not exists ai_generated boolean not null default false;

update public.content_pages
set
  body_json = coalesce(body_json, body_richtext),
  is_global = coalesce(is_global, chapter_id is null),
  language = coalesce(nullif(language, ''), 'en');

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  title text not null,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  description text,
  published boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.ai_generation_logs (
  id uuid primary key default gen_random_uuid(),
  chapter_id uuid not null references public.chapters (id) on delete cascade,
  page_slug text not null,
  model text not null,
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  total_tokens int not null default 0,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chapters_subdomain_idx on public.chapters (subdomain);
create index if not exists chapters_lead_user_id_idx on public.chapters (lead_user_id);
create index if not exists content_pages_sort_idx on public.content_pages (chapter_id, sort_order, slug);
create index if not exists events_chapter_idx on public.events (chapter_id, start_at);
create index if not exists events_published_idx on public.events (published, start_at);
create index if not exists ai_generation_logs_chapter_idx on public.ai_generation_logs (chapter_id, created_at desc);

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

create or replace function public.current_app_assigned_chapters()
returns uuid[]
language sql
stable
as $$
  select coalesce(
    (select u.assigned_chapters from public.users u where u.id = auth.uid()),
    case
      when jsonb_typeof(auth.jwt() -> 'app_metadata' -> 'assigned_chapters') = 'array'
        then array(
          select jsonb_array_elements_text(auth.jwt() -> 'app_metadata' -> 'assigned_chapters')::uuid
        )
      else '{}'::uuid[]
    end
  );
$$;

create or replace function public.current_request_tenant()
returns text
language sql
stable
as $$
  select nullif(
    lower(
      coalesce(
        current_setting('request.headers', true)::json ->> 'x-chapter-subdomain',
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
      public.current_app_role() in ('chapter_admin', 'coach')
      and public.current_app_chapter_id() = target_chapter_id
    )
    or (
      public.current_app_role() = 'content_creator'
      and target_chapter_id = any(public.current_app_assigned_chapters())
    );
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

drop trigger if exists events_set_updated_at on public.events;
create trigger events_set_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();

alter table public.events enable row level security;
alter table public.ai_generation_logs enable row level security;

drop policy if exists "chapters are public to read" on public.chapters;
drop policy if exists "platform admins manage chapters" on public.chapters;
drop policy if exists "chapter admins update own chapters" on public.chapters;

create policy "chapters are public to read"
on public.chapters
for select
to anon, authenticated
using (status = 'active');

create policy "platform admins manage chapters"
on public.chapters
for all
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

create policy "chapter admins update own chapters"
on public.chapters
for update
to authenticated
using (
  public.current_app_role() = 'chapter_admin'
  and id = public.current_app_chapter_id()
)
with check (
  public.current_app_role() = 'chapter_admin'
  and id = public.current_app_chapter_id()
);

drop policy if exists "users can read themselves" on public.users;
drop policy if exists "platform admins update users" on public.users;
drop policy if exists "platform admins insert users" on public.users;

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

create policy "platform admins update users"
on public.users
for update
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

create policy "platform admins insert users"
on public.users
for insert
to authenticated
with check (public.current_app_role() = 'platform_admin');

drop policy if exists "public can read published content" on public.content_pages;
drop policy if exists "chapter admins manage local content" on public.content_pages;
drop policy if exists "platform admins manage content" on public.content_pages;

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
    or public.can_access_chapter(chapter_id)
  )
);

create policy "platform admins manage content"
on public.content_pages
for all
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

create policy "chapter admins manage own content"
on public.content_pages
for all
to authenticated
using (
  public.current_app_role() = 'chapter_admin'
  and chapter_id = public.current_app_chapter_id()
)
with check (
  public.current_app_role() = 'chapter_admin'
  and chapter_id = public.current_app_chapter_id()
);

create policy "content creators manage assigned content"
on public.content_pages
for all
to authenticated
using (
  public.current_app_role() = 'content_creator'
  and chapter_id = any(public.current_app_assigned_chapters())
)
with check (
  public.current_app_role() = 'content_creator'
  and chapter_id = any(public.current_app_assigned_chapters())
);

drop policy if exists "public can read events" on public.events;
drop policy if exists "platform admins manage events" on public.events;
drop policy if exists "chapter admins manage own events" on public.events;
drop policy if exists "content creators manage assigned events" on public.events;

create policy "public can read events"
on public.events
for select
to anon, authenticated
using (
  published = true
  and exists (
    select 1
    from public.chapters c
    where c.id = events.chapter_id
      and c.status = 'active'
      and c.subdomain = public.current_request_tenant()
  )
);

create policy "platform admins manage events"
on public.events
for all
to authenticated
using (public.current_app_role() = 'platform_admin')
with check (public.current_app_role() = 'platform_admin');

create policy "chapter admins manage own events"
on public.events
for all
to authenticated
using (
  public.current_app_role() = 'chapter_admin'
  and chapter_id = public.current_app_chapter_id()
)
with check (
  public.current_app_role() = 'chapter_admin'
  and chapter_id = public.current_app_chapter_id()
);

create policy "content creators manage assigned events"
on public.events
for all
to authenticated
using (
  public.current_app_role() = 'content_creator'
  and chapter_id = any(public.current_app_assigned_chapters())
)
with check (
  public.current_app_role() = 'content_creator'
  and chapter_id = any(public.current_app_assigned_chapters())
);

create policy "admins manage ai generation logs"
on public.ai_generation_logs
for all
to authenticated
using (public.current_app_role() in ('platform_admin', 'chapter_admin'))
with check (public.current_app_role() in ('platform_admin', 'chapter_admin'));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'chapter-content',
  'chapter-content',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read chapter content assets" on storage.objects;
drop policy if exists "Authenticated users can upload chapter content assets" on storage.objects;
drop policy if exists "Authenticated users can update chapter content assets" on storage.objects;
drop policy if exists "Authenticated users can delete chapter content assets" on storage.objects;

create policy "Public can read chapter content assets"
on storage.objects
for select
to public
using (bucket_id = 'chapter-content');

create policy "Authenticated users can upload chapter content assets"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'chapter-content');

create policy "Authenticated users can update chapter content assets"
on storage.objects
for update
to authenticated
using (bucket_id = 'chapter-content')
with check (bucket_id = 'chapter-content');

create policy "Authenticated users can delete chapter content assets"
on storage.objects
for delete
to authenticated
using (bucket_id = 'chapter-content');
