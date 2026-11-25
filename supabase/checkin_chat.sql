-- 교환점 체크인 방 익명 대화
-- friends_messages.sql 다음에 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 그 방의 체크인에 답한 사람만 읽고 쓸 수 있습니다. 작성자는 private 스키마에만 저장하고 방마다 '익명 번호'만 보여 줍니다.

create table if not exists public.checkin_messages (
  id uuid primary key default gen_random_uuid(),
  room_key text not null check (char_length(room_key) between 3 and 200),
  alias integer not null,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists checkin_message_room_idx on public.checkin_messages (room_key, created_at desc);
alter table public.checkin_messages enable row level security;
revoke all on public.checkin_messages from public, anon, authenticated;

create table if not exists private.checkin_aliases (
  room_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  alias integer not null,
  primary key (room_key, user_id),
  unique (room_key, alias)
);
create table if not exists private.checkin_message_authors (
  message_id uuid primary key references public.checkin_messages(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade
);
create index if not exists checkin_message_author_idx on private.checkin_message_authors (author_id);
create table if not exists private.checkin_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  room_key text not null,
  alias integer not null,
  primary key (blocker_id, room_key, alias)
);
create table if not exists private.checkin_message_reports (
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.checkin_messages(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','privacy','other')),
  created_at timestamptz not null default now(),
  primary key (reporter_id, message_id)
);
alter table private.checkin_aliases enable row level security;
alter table private.checkin_message_authors enable row level security;
alter table private.checkin_blocks enable row level security;
alter table private.checkin_message_reports enable row level security;

create or replace function private.require_checkin_answer(p_room_key text)
returns uuid language plpgsql stable security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from public.checkin_answers where user_id = uid and room_key = p_room_key)
  then raise exception '먼저 체크인에 답변해야 합니다'; end if;
  return uid;
end $$;
revoke all on function private.require_checkin_answer(text) from public, anon, authenticated;

create or replace function public.list_checkin_messages(p_room_key text)
returns table (id uuid, alias integer, is_mine boolean, body text, created_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := private.require_checkin_answer(p_room_key);
begin
  return query
    select latest.id, latest.alias, latest.author_id = uid, latest.body, latest.created_at from (
      select m.id, m.alias, a.author_id, m.body, m.created_at
      from public.checkin_messages m
      join private.checkin_message_authors a on a.message_id = m.id
      where m.room_key = p_room_key
        and not exists (select 1 from private.checkin_blocks b
          where b.blocker_id = uid and b.room_key = m.room_key and b.alias = m.alias)
      order by m.created_at desc limit 500
    ) latest order by latest.created_at;
end $$;

create or replace function public.send_checkin_message(p_room_key text, p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := private.require_checkin_answer(p_room_key);
declare my_alias integer;
declare new_id uuid;
begin
  if not private.is_verified_student(uid) then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception '메시지 내용을 확인해 주세요'; end if;
  if (select count(*) from private.checkin_message_authors a join public.checkin_messages m on m.id = a.message_id
      where a.author_id = uid and m.created_at > now() - interval '1 hour') >= 300
  then raise exception '한 시간 메시지 전송 제한에 도달했습니다'; end if;
  select al.alias into my_alias from private.checkin_aliases al where al.room_key = p_room_key and al.user_id = uid;
  if my_alias is null then
    -- 두 사람이 동시에 첫 메시지를 보내도 같은 번호를 받지 않게 방 단위로 잠급니다.
    perform pg_advisory_xact_lock(hashtext('checkin:' || p_room_key));
    insert into private.checkin_aliases(room_key, user_id, alias)
    select p_room_key, uid, coalesce(max(al.alias), 0) + 1 from private.checkin_aliases al where al.room_key = p_room_key
    on conflict (room_key, user_id) do nothing;
    select al.alias into my_alias from private.checkin_aliases al where al.room_key = p_room_key and al.user_id = uid;
  end if;
  insert into public.checkin_messages(room_key, alias, body) values (p_room_key, my_alias, trim(p_body)) returning id into new_id;
  insert into private.checkin_message_authors(message_id, author_id) values (new_id, uid);
  return new_id;
end $$;

create or replace function public.report_checkin_message(p_message_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare message_room text;
begin
  select m.room_key into message_room from public.checkin_messages m
    join private.checkin_message_authors a on a.message_id = m.id
    where m.id = p_message_id and a.author_id <> uid;
  if message_room is null then raise exception '메시지를 찾을 수 없어요'; end if;
  perform private.require_checkin_answer(message_room);
  if p_reason is null or p_reason not in ('spam','harassment','privacy','other') then raise exception '신고 사유를 선택해 주세요'; end if;
  insert into private.checkin_message_reports(reporter_id, message_id, reason) values (uid, p_message_id, p_reason)
  on conflict (reporter_id, message_id) do nothing;
end $$;

-- 차단도 익명 번호로 합니다. 누구인지는 차단한 사람에게도 알려 주지 않습니다.
create or replace function public.set_checkin_block(p_room_key text, p_alias integer, p_blocked boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := private.require_checkin_answer(p_room_key);
begin
  if not p_blocked then
    delete from private.checkin_blocks where blocker_id = uid and room_key = p_room_key and alias = p_alias;
    return;
  end if;
  if not exists (select 1 from private.checkin_aliases al where al.room_key = p_room_key and al.alias = p_alias and al.user_id <> uid)
  then raise exception '차단할 사용자를 찾을 수 없어요'; end if;
  insert into private.checkin_blocks(blocker_id, room_key, alias) values (uid, p_room_key, p_alias) on conflict do nothing;
end $$;

create or replace function public.list_checkin_blocks(p_room_key text)
returns table (alias integer) language plpgsql security definer set search_path = ''
as $$
declare uid uuid := private.require_checkin_answer(p_room_key);
begin
  return query select b.alias from private.checkin_blocks b where b.blocker_id = uid and b.room_key = p_room_key order by b.alias;
end $$;

revoke all on function public.list_checkin_messages(text) from public, anon;
revoke all on function public.send_checkin_message(text, text) from public, anon;
revoke all on function public.report_checkin_message(uuid, text) from public, anon;
revoke all on function public.set_checkin_block(text, integer, boolean) from public, anon;
revoke all on function public.list_checkin_blocks(text) from public, anon;
grant execute on function public.list_checkin_messages(text) to authenticated;
grant execute on function public.send_checkin_message(text, text) to authenticated;
grant execute on function public.report_checkin_message(uuid, text) to authenticated;
grant execute on function public.set_checkin_block(text, integer, boolean) to authenticated;
grant execute on function public.list_checkin_blocks(text) to authenticated;
