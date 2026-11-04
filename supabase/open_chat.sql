-- 교환점 오픈채팅
-- university_email.sql 다음에 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 방 목록은 로그인한 사용자 누구나 볼 수 있고, 만들기·입장·메시지 전송은 대학 인증이 필요합니다.
-- 메시지는 입장한 사람만 읽을 수 있습니다.

create table if not exists public.open_chat_rooms (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 40),
  description text not null default '' check (char_length(description) <= 200),
  country text not null default '',
  country_code text not null default '',
  city text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists open_chat_room_created_idx on public.open_chat_rooms (created_at desc);
create index if not exists open_chat_room_creator_idx on public.open_chat_rooms (created_by, created_at desc);

create table if not exists public.open_chat_members (
  room_id uuid not null references public.open_chat_rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (room_id, user_id)
);
create index if not exists open_chat_member_user_idx on public.open_chat_members (user_id);

create table if not exists public.open_chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.open_chat_rooms(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  sender_nickname text not null default '교환학생',
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists open_chat_message_room_idx on public.open_chat_messages (room_id, created_at);
create index if not exists open_chat_message_sender_idx on public.open_chat_messages (sender_id, created_at desc);

alter table public.open_chat_rooms enable row level security;
alter table public.open_chat_members enable row level security;
alter table public.open_chat_messages enable row level security;
revoke all on public.open_chat_rooms, public.open_chat_members, public.open_chat_messages from anon, authenticated;

-- 목록은 list_open_chat_rooms 함수로만 읽고, 내 입장 기록과 입장한 방의 메시지만 직접 읽습니다.
grant select on public.open_chat_members, public.open_chat_messages to authenticated;
drop policy if exists open_chat_own_membership on public.open_chat_members;
create policy open_chat_own_membership on public.open_chat_members for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists open_chat_member_read on public.open_chat_messages;
create policy open_chat_member_read on public.open_chat_messages for select to authenticated
  using (exists (
    select 1 from public.open_chat_members m
    where m.room_id = open_chat_messages.room_id and m.user_id = (select auth.uid())
  ));

create or replace function public.list_open_chat_rooms()
returns table (
  id uuid, title text, description text, country text, country_code text, city text,
  member_count bigint, is_member boolean, created_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다'; end if;
  return query
    select r.id, r.title, r.description, r.country, r.country_code, r.city,
      (select count(*) from public.open_chat_members m where m.room_id = r.id),
      exists (select 1 from public.open_chat_members m where m.room_id = r.id and m.user_id = (select auth.uid())),
      r.created_at
    from public.open_chat_rooms r
    order by r.created_at desc limit 100;
end $$;

create or replace function public.create_open_chat_room(p_title text, p_description text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare new_id uuid;
declare place_country text := '';
declare place_code text := '';
declare place_city text := '';
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from public.university_verifications where user_id = uid and status = 'verified')
  then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if (select count(*) from public.open_chat_rooms
      where created_by = uid and created_at > now() - interval '1 day') >= 5
  then raise exception '오픈채팅방은 하루에 5개까지 만들 수 있어요'; end if;
  -- Location always comes from the creator's own record, never from the caller.
  select country, country_code, city into place_country, place_code, place_city
    from public.exchange_assignments where user_id = uid;
  if not found then
    select country, country_code, city into place_country, place_code, place_city
      from public.exchange_interests where user_id = uid;
  end if;
  insert into public.open_chat_rooms(created_by, title, description, country, country_code, city)
  values (uid, trim(p_title), trim(coalesce(p_description, '')), coalesce(place_country, ''), coalesce(place_code, ''), coalesce(place_city, ''))
  returning id into new_id;
  insert into public.open_chat_members(room_id, user_id) values (new_id, uid);
  return new_id;
end $$;

create or replace function public.join_open_chat_room(p_room_id uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from public.university_verifications where user_id = uid and status = 'verified')
  then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.open_chat_rooms where id = p_room_id) then raise exception '방을 찾을 수 없어요'; end if;
  insert into public.open_chat_members(room_id, user_id) values (p_room_id, uid) on conflict do nothing;
end $$;

create or replace function public.leave_open_chat_room(p_room_id uuid)
returns void language sql security definer set search_path = ''
as $$
  delete from public.open_chat_members where room_id = p_room_id and user_id = (select auth.uid());
$$;

create or replace function public.send_open_chat_message(p_room_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare nick text;
declare new_id uuid;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from public.university_verifications where user_id = uid and status = 'verified')
  then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if not exists (select 1 from public.open_chat_members where room_id = p_room_id and user_id = uid)
  then raise exception '먼저 방에 입장해 주세요'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception '메시지 내용을 확인해 주세요'; end if;
  if (select count(*) from public.open_chat_messages
      where sender_id = uid and created_at > now() - interval '1 hour') >= 300
  then raise exception '한 시간 메시지 전송 제한에 도달했습니다'; end if;
  select nickname into nick from public.people_profiles where user_id = uid;
  insert into public.open_chat_messages(room_id, sender_id, sender_nickname, body)
  values (p_room_id, uid, coalesce(nick, '교환학생'), trim(p_body)) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.list_open_chat_rooms() from public, anon;
revoke all on function public.create_open_chat_room(text, text) from public, anon;
revoke all on function public.join_open_chat_room(uuid) from public, anon;
revoke all on function public.leave_open_chat_room(uuid) from public, anon;
revoke all on function public.send_open_chat_message(uuid, text) from public, anon;
grant execute on function public.list_open_chat_rooms() to authenticated;
grant execute on function public.create_open_chat_room(text, text) to authenticated;
grant execute on function public.join_open_chat_room(uuid) to authenticated;
grant execute on function public.leave_open_chat_room(uuid) to authenticated;
grant execute on function public.send_open_chat_message(uuid, text) to authenticated;
