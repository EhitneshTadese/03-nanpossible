begin;

create or replace function public.assert_true(condition boolean, message text)
returns void
language plpgsql
as $$
begin
  if not condition then
    raise exception '%', message;
  end if;
end;
$$;

set local role anon;
select set_config('request.headers', '{"x-wial-tenant":"usa"}', true);

select public.assert_true(
  exists(
    select 1
    from public.content_pages
    where chapter_id is null
      and slug = 'about'
      and published = true
  ),
  'anon should be able to read global published content'
);

select public.assert_true(
  exists(
    select 1
    from public.content_pages
    where slug = 'home'
      and chapter_id = '22222222-2222-4222-8222-222222222222'
  ),
  'anon should be able to read published content for the active tenant'
);

select set_config('request.headers', '{"x-wial-tenant":"unknown"}', true);

select public.assert_true(
  not exists(
    select 1
    from public.content_pages
    where slug = 'home'
      and chapter_id = '22222222-2222-4222-8222-222222222222'
  ),
  'anon should not read tenant content for an unknown tenant header'
);

reset role;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated","app_metadata":{"role":"chapter_admin","chapter_id":"22222222-2222-4222-8222-222222222222"}}',
  true
);
select set_config('request.headers', '{"x-wial-tenant":"usa"}', true);

with attempted as (
  update public.content_pages
  set title = title
  where chapter_id = '22222222-2222-4222-8222-222222222222'
    and slug = 'home'
  returning id
)
select public.assert_true(
  exists(select 1 from attempted),
  'chapter admin should be able to touch rows inside their own chapter'
);

reset role;
set local session_replication_role = replica;

insert into public.users (
  id,
  email,
  role,
  chapter_id,
  name,
  phone,
  location,
  bio,
  photo_url
)
values (
  '55555555-5555-4555-8555-555555555555',
  'visitor@wial.org',
  'public_visitor',
  null,
  'Visitor Profile',
  null,
  null,
  null,
  null
);

insert into public.users (
  id,
  email,
  role,
  chapter_id,
  name,
  phone,
  location,
  bio,
  photo_url
)
values (
  '66666666-6666-4666-8666-666666666666',
  'coach@wial.org',
  'coach',
  '22222222-2222-4222-8222-222222222222',
  'Coach Profile',
  null,
  null,
  null,
  null
);

set local session_replication_role = origin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"55555555-5555-4555-8555-555555555555","role":"authenticated","app_metadata":{"role":"public_visitor"}}',
  true
);

select public.promote_self_to_coach();

select public.assert_true(
  exists(
    select 1
    from public.users
    where id = '55555555-5555-4555-8555-555555555555'
      and role = 'coach'
      and chapter_id is null
  ),
  'public visitor should be able to promote themselves to coach'
);

do $$
begin
  perform public.promote_self_to_chapter_admin();
  raise exception 'expected chapter assignment check to fail';
exception
  when others then
    if position('chapter assignment' in lower(sqlerrm)) = 0 then
      raise;
    end if;
end;
$$;

select set_config(
  'request.jwt.claims',
  '{"sub":"66666666-6666-4666-8666-666666666666","role":"authenticated","app_metadata":{"role":"coach","chapter_id":"22222222-2222-4222-8222-222222222222"}}',
  true
);

with attempted_role_change as (
  update public.users
  set role = 'platform_admin'
  where id = '66666666-6666-4666-8666-666666666666'
  returning id
)
select public.assert_true(
  not exists(select 1 from attempted_role_change),
  'coach should not directly update privileged user fields'
);

select public.update_my_profile(
  'Updated Coach',
  '555-0100',
  'Phoenix, AZ',
  'Profile updated through the safe RPC',
  'https://example.com/profile.png'
);

select public.assert_true(
  exists(
    select 1
    from public.users
    where id = '66666666-6666-4666-8666-666666666666'
      and role = 'coach'
      and phone = '555-0100'
      and location = 'Phoenix, AZ'
      and bio = 'Profile updated through the safe RPC'
      and photo_url = 'https://example.com/profile.png'
  ),
  'update_my_profile should update safe profile fields without changing role'
);

select public.promote_self_to_chapter_admin();

select public.assert_true(
  exists(
    select 1
    from public.users
    where id = '66666666-6666-4666-8666-666666666666'
      and role = 'chapter_admin'
      and chapter_id = '22222222-2222-4222-8222-222222222222'
  ),
  'coach should be able to promote themselves to chapter admin for their assigned chapter'
);

rollback;
