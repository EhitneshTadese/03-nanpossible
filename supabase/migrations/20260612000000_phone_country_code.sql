-- Add phone_country_code to coaches table
alter table public.coaches
  add column if not exists phone_country_code text;

-- Add phone_country_code to users (profiles) table
alter table public.users
  add column if not exists phone_country_code text;

-- Update update_my_profile RPC to accept and persist phone_country_code
create or replace function public.update_my_profile(
  profile_name text,
  profile_phone text default null,
  profile_phone_country_code text default null,
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
    phone_country_code = nullif(trim(profile_phone_country_code), ''),
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

-- Revoke old signature, grant new one
revoke all on function public.update_my_profile(text, text, text, text, text) from public;
grant execute on function public.update_my_profile(text, text, text, text, text, text) to authenticated;

-- Update search_coaches RPC to return phone_country_code
drop function if exists public.search_coaches(vector(1024), text, text, text, text, text[], int, int);

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
  phone_country_code text,
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
  credly_badge_image_url text,
  credly_badge_title text,
  credly_badge_synced_at timestamptz,
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
    c.phone_country_code,
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
    c.credly_badge_image_url,
    c.credly_badge_title,
    c.credly_badge_synced_at,
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
    and (filter_specializations is null or c.specializations && filter_specializations)
  order by c.embedding <=> query_embedding
  limit match_count
  offset match_offset
$$;