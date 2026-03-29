alter table public.content_pages
  add column if not exists audio_url text,
  add column if not exists audio_duration_seconds int,
  add column if not exists audio_generated_at timestamptz;

alter table public.coaches
  add column if not exists audio_intro_url text,
  add column if not exists audio_intro_source text;

alter table public.coaches
  drop constraint if exists coaches_audio_intro_source_check;

alter table public.coaches
  add constraint coaches_audio_intro_source_check
  check (
    audio_intro_source in ('ai', 'uploaded')
    or audio_intro_source is null
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'audio',
  'audio',
  true,
  10485760,
  array['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read WIAL audio" on storage.objects;

create policy "Public can read WIAL audio"
on storage.objects
for select
to public
using (bucket_id = 'audio');
