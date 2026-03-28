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

rollback;
