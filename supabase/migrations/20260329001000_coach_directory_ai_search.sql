create extension if not exists vector;

alter table public.coaches
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists cert_level public.certification_level,
  add column if not exists location_city text,
  add column if not exists location_country text,
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision,
  add column if not exists languages text[] not null default '{}'::text[],
  add column if not exists website text,
  add column if not exists linkedin text,
  add column if not exists credly_badge_url text,
  add column if not exists last_approved_at timestamptz,
  add column if not exists rejection_reason text,
  add column if not exists rejected_at timestamptz;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'coaches'
      and column_name = 'embedding'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'coaches'
      and column_name = 'legacy_embedding_1536'
  ) then
    alter table public.coaches rename column embedding to legacy_embedding_1536;
  end if;
end
$$;

alter table public.coaches
  add column if not exists embedding vector(1024);

update public.coaches
set
  email = coalesce(email, contact_email),
  cert_level = coalesce(cert_level, certification_level),
  location_country = coalesce(location_country, nullif(location, '')),
  last_approved_at = coalesce(last_approved_at, case when approved then updated_at end),
  languages = coalesce(languages, '{}'::text[]),
  specializations = coalesce(specializations, '{}'::text[]);

alter table public.coaches
  alter column chapter_id drop not null;

alter table public.coaches
  drop constraint if exists coaches_chapter_id_fkey;

alter table public.coaches
  add constraint coaches_chapter_id_fkey
  foreign key (chapter_id) references public.chapters (id) on delete set null;

create index if not exists coaches_embedding_ivfflat_idx
  on public.coaches
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 20);

create index if not exists coaches_chapter_idx on public.coaches (chapter_id);
create index if not exists coaches_cert_level_idx on public.coaches (cert_level);
create index if not exists coaches_approved_idx on public.coaches (approved);
create index if not exists coaches_location_country_idx on public.coaches (location_country);

create or replace function public.current_app_email()
returns text
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

create or replace function public.set_coach_embedding(
  target_coach_id uuid,
  embedding_literal text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.coaches
  set embedding = embedding_literal::vector(1024)
  where id = target_coach_id;
end;
$$;

revoke all on function public.set_coach_embedding(uuid, text) from public;

create or replace function public.search_coaches(
  query_embedding vector(1024),
  filter_cert_level text default null,
  filter_country text default null,
  filter_city text default null,
  filter_language text default null,
  filter_specializations text[] default null,
  match_count int default 20,
  match_offset int default 0
)
returns table (
  id uuid,
  user_id uuid,
  chapter_id uuid,
  name text,
  email text,
  phone text,
  photo_url text,
  cert_level public.certification_level,
  location_city text,
  location_country text,
  location_lat double precision,
  location_lng double precision,
  bio text,
  specializations text[],
  languages text[],
  website text,
  linkedin text,
  credly_badge_url text,
  created_at timestamptz,
  updated_at timestamptz,
  last_approved_at timestamptz,
  similarity double precision
)
language sql
stable
as $$
  select
    c.id,
    c.user_id,
    c.chapter_id,
    c.name,
    c.email,
    c.phone,
    c.photo_url,
    c.cert_level,
    c.location_city,
    c.location_country,
    c.location_lat,
    c.location_lng,
    c.bio,
    c.specializations,
    c.languages,
    c.website,
    c.linkedin,
    c.credly_badge_url,
    c.created_at,
    c.updated_at,
    c.last_approved_at,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.coaches c
  where c.approved = true
    and c.embedding is not null
    and (filter_cert_level is null or c.cert_level::text = filter_cert_level)
    and (filter_country is null or c.location_country ilike '%' || filter_country || '%')
    and (filter_city is null or c.location_city ilike '%' || filter_city || '%')
    and (filter_language is null or filter_language = any(c.languages))
    and (
      filter_specializations is null
      or cardinality(filter_specializations) = 0
      or c.specializations && filter_specializations
    )
  order by c.embedding <=> query_embedding
  limit match_count
  offset match_offset;
$$;

grant execute on function public.search_coaches(
  vector(1024),
  text,
  text,
  text,
  text,
  text[],
  int,
  int
) to anon, authenticated;

drop policy if exists "public can read approved coaches" on public.coaches;
drop policy if exists "coaches and admins manage coach rows" on public.coaches;
drop policy if exists "public can view approved coaches" on public.coaches;
drop policy if exists "coaches can insert own coach rows" on public.coaches;
drop policy if exists "coaches and admins update coach rows" on public.coaches;
drop policy if exists "admins delete coach rows" on public.coaches;

create policy "public can view approved coaches"
on public.coaches
for select
to anon, authenticated
using (
  approved = true
  or user_id = auth.uid()
  or public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

create policy "coaches can insert own coach rows"
on public.coaches
for insert
to authenticated
with check (
  (
    public.current_app_role() = 'coach'
    and auth.uid() = user_id
    and (chapter_id is null or chapter_id = public.current_app_chapter_id())
  )
  or public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

create policy "coaches and admins update coach rows"
on public.coaches
for update
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
  or (
    public.current_app_role() = 'coach'
    and (
      auth.uid() = user_id
      or (
        user_id is null
        and lower(coalesce(email, '')) = public.current_app_email()
      )
    )
  )
)
with check (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
  or (
    public.current_app_role() = 'coach'
    and auth.uid() = user_id
    and (chapter_id is null or chapter_id = public.current_app_chapter_id())
  )
);

create policy "admins delete coach rows"
on public.coaches
for delete
to authenticated
using (
  public.current_app_role() = 'platform_admin'
  or (
    public.current_app_role() = 'chapter_admin'
    and chapter_id = public.current_app_chapter_id()
  )
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'coach-photos',
  'coach-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read coach photos" on storage.objects;
drop policy if exists "Authenticated users can upload own coach photos" on storage.objects;
drop policy if exists "Authenticated users can update own coach photos" on storage.objects;
drop policy if exists "Authenticated users can delete own coach photos" on storage.objects;

create policy "Public can read coach photos"
on storage.objects
for select
to public
using (bucket_id = 'coach-photos');

create policy "Authenticated users can upload own coach photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can update own coach photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Authenticated users can delete own coach photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'coach-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
