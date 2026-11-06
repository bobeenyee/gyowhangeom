-- 교환점 대학 인증 사용자만 참여
-- university_email.sql 다음에 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 이메일 인증 설정이 끝난 뒤 실행하세요. 실행하면 인증하지 않은 기존 사용자도 글·댓글·체크인을 쓸 수 없습니다.
-- 읽기는 그대로 두고, 쓰기만 막습니다. 운영자가 대시보드에서 넣는 데이터는 막지 않습니다.

create or replace function private.require_verified_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not exists (
    select 1 from public.university_verifications
    where user_id = (select auth.uid()) and status = 'verified'
  ) then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  return new;
end $$;
revoke all on function private.require_verified_user() from public, anon, authenticated;

drop trigger if exists require_verified_user on public.posts;
create trigger require_verified_user before insert on public.posts
  for each row execute function private.require_verified_user();
drop trigger if exists require_verified_user on public.comments;
create trigger require_verified_user before insert on public.comments
  for each row execute function private.require_verified_user();
drop trigger if exists require_verified_user on public.content_reports;
create trigger require_verified_user before insert on public.content_reports
  for each row execute function private.require_verified_user();
drop trigger if exists require_verified_user on public.checkin_answers;
create trigger require_verified_user before insert or update on public.checkin_answers
  for each row execute function private.require_verified_user();
drop trigger if exists require_verified_user on public.checklist_items;
create trigger require_verified_user before insert or update on public.checklist_items
  for each row execute function private.require_verified_user();

-- 사람찾기 목록은 누구나 볼 수 있지만, 목록에 나타나는 사람은 인증한 학생뿐입니다.
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
  join public.university_verifications v on v.user_id = p.user_id and v.status = 'verified'
  where (select auth.uid()) is not null
    and p.discoverable is true
    and p.user_id <> (select auth.uid())
    and e.country_code = upper(p_country_code) and e.year = p_year and e.term = p_term
  order by p.updated_at desc limit 500;
$$;
