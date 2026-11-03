-- 교환점 MVP / Supabase SQL Editor에서 실행
-- 익명 게시글 작성자 연결은 private 스키마에만 존재하며 공개 API로 조회할 수 없습니다.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.people_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null default '교환학생' check (char_length(nickname) between 1 and 32),
  home_university text not null default '' check (char_length(home_university) <= 120),
  show_home_university boolean not null default false,
  discoverable boolean not null default true,
  intro text not null default '' check (char_length(intro) <= 300),
  interests text[] not null default '{}',
  travel_style text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table if not exists public.exchange_assignments (
  user_id uuid primary key references auth.users(id) on delete cascade,
  university_id text not null,
  university_name text not null,
  country text not null,
  country_code text not null check (char_length(country_code) = 2),
  city text not null,
  latitude double precision,
  longitude double precision,
  year integer not null check (year between 2026 and 2050),
  term text not null check (term in ('1학기','2학기','여름계절학기','겨울계절학기')),
  updated_at timestamptz not null default now(),
  constraint valid_lat check (latitude is null or latitude between -90 and 90),
  constraint valid_lng check (longitude is null or longitude between -180 and 180)
);

create index if not exists exchange_search_idx
  on public.exchange_assignments (country_code,year,term);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('질문','생활','수업','여행메이트')),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 4000),
  country_code text not null default '',
  city text not null default '',
  year integer,
  term text not null default '',
  university_id text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists post_created_idx on public.posts (created_at desc);

create table if not exists private.post_authors (
  post_id uuid primary key references public.posts(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade
);
create index if not exists post_authors_user_idx on private.post_authors (author_id);

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists comments_post_idx on public.comments (post_id,created_at);

create table if not exists private.comment_authors (
  comment_id uuid primary key references public.comments(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade
);
create index if not exists comment_authors_user_idx on private.comment_authors (author_id);

create table if not exists public.checklist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 60),
  done boolean not null default false,
  primary key (user_id,item_key)
);

create table if not exists public.checkin_answers (
  user_id uuid not null references auth.users(id) on delete cascade,
  room_key text not null check (char_length(room_key) between 3 and 200),
  question_key text not null check (char_length(question_key) between 3 and 100),
  answer text not null check (char_length(trim(answer)) between 1 and 40),
  created_at timestamptz not null default now(),
  primary key (user_id,room_key,question_key)
);
create index if not exists checkin_room_idx on public.checkin_answers(room_key,question_key);

-- Public schema에서는 꼭 필요한 권한만 부여합니다.
alter table public.people_profiles enable row level security;
alter table public.exchange_assignments enable row level security;
alter table public.posts enable row level security;
alter table public.comments enable row level security;
alter table public.checklist_items enable row level security;
alter table public.checkin_answers enable row level security;

revoke all on public.people_profiles,public.exchange_assignments,public.posts,
  public.comments,public.checklist_items,public.checkin_answers from anon,authenticated;

grant select,insert,update on public.people_profiles,public.exchange_assignments,
  public.checklist_items,public.checkin_answers to authenticated;
grant select on public.posts,public.comments to authenticated;

drop policy if exists own_profile_select on public.people_profiles;
create policy own_profile_select on public.people_profiles for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists own_profile_insert on public.people_profiles;
create policy own_profile_insert on public.people_profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists own_profile_update on public.people_profiles;
create policy own_profile_update on public.people_profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists own_exchange_select on public.exchange_assignments;
create policy own_exchange_select on public.exchange_assignments for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists own_exchange_insert on public.exchange_assignments;
create policy own_exchange_insert on public.exchange_assignments for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists own_exchange_update on public.exchange_assignments;
create policy own_exchange_update on public.exchange_assignments for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists post_read_authenticated on public.posts;
create policy post_read_authenticated on public.posts for select to authenticated using (true);
drop policy if exists comments_read_authenticated on public.comments;
create policy comments_read_authenticated on public.comments for select to authenticated using (true);

drop policy if exists own_checklist_select on public.checklist_items;
create policy own_checklist_select on public.checklist_items for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists own_checklist_insert on public.checklist_items;
create policy own_checklist_insert on public.checklist_items for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists own_checklist_update on public.checklist_items;
create policy own_checklist_update on public.checklist_items for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists own_checkin_select on public.checkin_answers;
create policy own_checkin_select on public.checkin_answers for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists own_checkin_insert on public.checkin_answers;
create policy own_checkin_insert on public.checkin_answers for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists own_checkin_update on public.checkin_answers;
create policy own_checkin_update on public.checkin_answers for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 사람찾기는 선택한 공개 프로필만 반환. 비공개 한국대학은 SQL 단계에서 NULL.
-- 본 함수가 반환하는 user_id는 사람찾기용이며 익명 글에는 절대 저장되지 않음.
create or replace function public.get_discoverable_people(
  p_country_code text, p_year integer, p_term text
)
returns table (
  user_id uuid, nickname text, home_university text, intro text,
  interests text[], travel_style text[], university_id text,
  university_name text, city text, country text, country_code text,
  year integer, term text, latitude double precision, longitude double precision
)
language sql security definer set search_path = ''
as $$
  select p.user_id,p.nickname,
    case when p.show_home_university then p.home_university else null end,
    p.intro,p.interests,p.travel_style,
    e.university_id,e.university_name,e.city,e.country,e.country_code,e.year,e.term,e.latitude,e.longitude
  from public.people_profiles p
  join public.exchange_assignments e on e.user_id = p.user_id
  where (select auth.uid()) is not null
    and p.discoverable is true
    and p.user_id <> (select auth.uid())
    and e.country_code = upper(p_country_code) and e.year = p_year and e.term = p_term
  order by p.updated_at desc limit 500;
$$;

-- 클라이언트는 게시글 작성자 ID를 절대 INSERT/SELECT할 수 없음.
create or replace function public.create_anonymous_post(
  p_category text,p_title text,p_body text,p_country_code text default '',
  p_city text default '',p_year integer default null,p_term text default '',
  p_university_id text default ''
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다'; end if;
  if p_category not in ('질문','생활','수업','여행메이트')
    or char_length(trim(p_title)) not between 1 and 120
    or char_length(trim(p_body)) not between 1 and 4000
  then raise exception '입력값을 확인해 주세요'; end if;
  if (select count(*) from private.post_authors a
      join public.posts p on p.id = a.post_id
      where a.author_id = (select auth.uid()) and p.created_at > now()-interval '1 hour') >= 10
  then raise exception '한 시간 게시글 작성 제한에 도달했습니다'; end if;
  insert into public.posts(category,title,body,country_code,city,year,term,university_id)
  values (p_category,trim(p_title),trim(p_body),left(upper(p_country_code),2),
          left(p_city,120),p_year,left(p_term,30),left(p_university_id,150))
  returning id into new_id;
  insert into private.post_authors(post_id,author_id) values(new_id,(select auth.uid()));
  return new_id;
end $$;

create or replace function public.create_anonymous_comment(
  p_post_id uuid,p_body text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare new_id uuid;
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다'; end if;
  if char_length(trim(p_body)) not between 1 and 1000
    or not exists(select 1 from public.posts where id = p_post_id)
  then raise exception '댓글 내용을 확인해 주세요'; end if;
  if (select count(*) from private.comment_authors a
      join public.comments c on c.id = a.comment_id
      where a.author_id = (select auth.uid()) and c.created_at > now()-interval '1 hour') >= 40
  then raise exception '한 시간 댓글 작성 제한에 도달했습니다'; end if;
  insert into public.comments(post_id,body) values (p_post_id,trim(p_body)) returning id into new_id;
  insert into private.comment_authors(comment_id,author_id) values(new_id,(select auth.uid()));
  return new_id;
end $$;

create or replace function public.get_checkin_summary(
  p_room_key text,p_question_key text
)
returns table (answer text,count bigint)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.checkin_answers c where c.user_id = (select auth.uid())
     and c.room_key = p_room_key and c.question_key = p_question_key
  ) then raise exception '먼저 체크인에 답변해야 합니다'; end if;
  return query select c.answer,count(*)::bigint
    from public.checkin_answers c
    where c.room_key = p_room_key and c.question_key = p_question_key
    group by c.answer order by count(*) desc, c.answer limit 100;
end $$;

-- 기본 EXECUTE PUBLIC 권한을 제거하고 로그인 사용자만 RPC 사용 허용.
revoke all on function public.get_discoverable_people(text,integer,text) from public,anon;
revoke all on function public.create_anonymous_post(text,text,text,text,text,integer,text,text) from public,anon;
revoke all on function public.create_anonymous_comment(uuid,text) from public,anon;
revoke all on function public.get_checkin_summary(text,text) from public,anon;
grant execute on function public.get_discoverable_people(text,integer,text) to authenticated;
grant execute on function public.create_anonymous_post(text,text,text,text,text,integer,text,text) to authenticated;
grant execute on function public.create_anonymous_comment(uuid,text) to authenticated;
grant execute on function public.get_checkin_summary(text,text) to authenticated;
