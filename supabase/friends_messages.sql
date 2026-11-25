-- 교환점 친구추가 · 1:1 메시지
-- chat_moderation.sql 다음에 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 친구 요청과 대화는 대학 인증을 마친 사용자만 시작할 수 있고, 메시지는 대화 참여자만 읽습니다.
-- 차단은 오픈채팅과 같은 목록(open_chat_user_blocks)을 씁니다. 어느 쪽이든 차단하면 새로 보낼 수 없습니다.

create or replace function private.is_verified_student(p_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.university_verifications where user_id = p_user_id and status = 'verified');
$$;

create or replace function private.is_blocked_pair(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.open_chat_user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$;
revoke all on function private.is_verified_student(uuid) from public, anon, authenticated;
revoke all on function private.is_blocked_pair(uuid, uuid) from public, anon, authenticated;

-- 친구 관계: 두 사람 사이에 한 줄만 존재합니다. 직접 접근 권한 없이 아래 함수로만 다룹니다.
create table if not exists public.friendships (
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id),
  constraint friendship_not_self check (requester_id <> addressee_id)
);
create unique index if not exists friendship_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendship_addressee_idx on public.friendships (addressee_id);
alter table public.friendships enable row level security;
revoke all on public.friendships from public, anon, authenticated;

create or replace function public.request_friend(p_user_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare existing public.friendships%rowtype;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not private.is_verified_student(uid) then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if p_user_id is null or p_user_id = uid then raise exception '나에게는 친구 요청을 보낼 수 없어요'; end if;
  if private.is_blocked_pair(uid, p_user_id) then raise exception '이 사용자에게는 보낼 수 없어요'; end if;

  select * into existing from public.friendships
    where (requester_id = uid and addressee_id = p_user_id) or (requester_id = p_user_id and addressee_id = uid)
    for update;
  if found then
    -- 상대가 먼저 보낸 요청이 있으면 바로 친구가 됩니다.
    if existing.status = 'pending' and existing.addressee_id = uid then
      update public.friendships set status = 'accepted'
        where requester_id = existing.requester_id and addressee_id = uid;
      return 'accepted';
    end if;
    return existing.status;
  end if;

  if not exists (select 1 from public.people_profiles where user_id = p_user_id and discoverable)
  then raise exception '프로필을 공개한 사용자에게만 보낼 수 있어요'; end if;
  if (select count(*) from public.friendships
      where requester_id = uid and created_at > now() - interval '1 day') >= 30
  then raise exception '친구 요청은 하루에 30번까지 보낼 수 있어요'; end if;
  insert into public.friendships(requester_id, addressee_id) values (uid, p_user_id)
  on conflict do nothing;
  return 'pending';
end $$;

-- 받은 요청만 수락하거나 거절할 수 있습니다.
create or replace function public.respond_friend(p_user_id uuid, p_accept boolean)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if p_accept then
    if not private.is_verified_student(uid) then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
    if private.is_blocked_pair(uid, p_user_id) then raise exception '이 사용자의 요청은 수락할 수 없어요'; end if;
    update public.friendships set status = 'accepted'
      where requester_id = p_user_id and addressee_id = uid and status = 'pending';
  else
    delete from public.friendships
      where requester_id = p_user_id and addressee_id = uid and status = 'pending';
  end if;
  if not found then raise exception '친구 요청을 찾을 수 없어요'; end if;
end $$;

-- 보낸 요청 취소와 친구 끊기
create or replace function public.remove_friend(p_user_id uuid)
returns void language sql security definer set search_path = ''
as $$
  delete from public.friendships
  where (requester_id = (select auth.uid()) and addressee_id = p_user_id)
     or (requester_id = p_user_id and addressee_id = (select auth.uid()) and status = 'accepted');
$$;

create or replace function public.list_friends()
returns table (user_id uuid, nickname text, university_name text, city text, status text, incoming boolean)
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  return query
    select other.id, coalesce(p.nickname, '교환학생'), coalesce(e.university_name, ''), coalesce(e.city, ''),
      f.status, f.addressee_id = uid
    from public.friendships f
    cross join lateral (select case when f.requester_id = uid then f.addressee_id else f.requester_id end as id) other
    left join public.people_profiles p on p.user_id = other.id
    left join public.exchange_assignments e on e.user_id = other.id
    where uid in (f.requester_id, f.addressee_id) and not private.is_blocked_pair(uid, other.id)
    order by f.created_at desc limit 500;
end $$;

-- 1:1 대화: user_a < user_b 로 저장해 두 사람 사이에 하나만 만들어집니다.
create table if not exists public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  started_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  constraint direct_pair_order check (user_a < user_b)
);
create index if not exists direct_conversation_b_idx on public.direct_conversations (user_b);
create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.direct_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists direct_message_conversation_idx on public.direct_messages (conversation_id, created_at);
create index if not exists direct_message_sender_idx on public.direct_messages (sender_id, created_at desc);
alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
revoke all on public.direct_conversations, public.direct_messages from public, anon, authenticated;
grant select on public.direct_conversations, public.direct_messages to authenticated;
drop policy if exists direct_conversation_read on public.direct_conversations;
create policy direct_conversation_read on public.direct_conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
drop policy if exists direct_message_read on public.direct_messages;
create policy direct_message_read on public.direct_messages for select to authenticated
  using (
    exists (select 1 from public.direct_conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b))
    and not exists (select 1 from public.open_chat_user_blocks b
      where b.blocker_id = (select auth.uid()) and b.blocked_id = direct_messages.sender_id)
  );

create or replace function public.start_direct_chat(p_user_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare chat_id uuid;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not private.is_verified_student(uid) then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if p_user_id is null or p_user_id = uid then raise exception '나와는 대화할 수 없어요'; end if;
  if private.is_blocked_pair(uid, p_user_id) then raise exception '이 사용자에게는 보낼 수 없어요'; end if;
  select id into chat_id from public.direct_conversations
    where user_a = least(uid, p_user_id) and user_b = greatest(uid, p_user_id);
  if chat_id is not null then return chat_id; end if;
  if not exists (select 1 from public.people_profiles where user_id = p_user_id and discoverable)
    and not exists (select 1 from public.friendships f where f.status = 'accepted'
      and ((f.requester_id = uid and f.addressee_id = p_user_id) or (f.requester_id = p_user_id and f.addressee_id = uid)))
  then raise exception '프로필을 공개한 사용자나 친구에게만 보낼 수 있어요'; end if;
  if (select count(*) from public.direct_conversations
      where started_by = uid and created_at > now() - interval '1 day') >= 20
  then raise exception '새 대화는 하루에 20개까지 시작할 수 있어요'; end if;
  insert into public.direct_conversations(user_a, user_b, started_by)
  values (least(uid, p_user_id), greatest(uid, p_user_id), uid)
  on conflict (user_a, user_b) do update set user_a = excluded.user_a
  returning id into chat_id;
  return chat_id;
end $$;

create or replace function public.send_direct_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare chat public.direct_conversations%rowtype;
declare new_id uuid;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  select * into chat from public.direct_conversations where id = p_conversation_id;
  if not found or uid not in (chat.user_a, chat.user_b) then raise exception '대화를 찾을 수 없어요'; end if;
  if not private.is_verified_student(uid) then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if private.is_blocked_pair(chat.user_a, chat.user_b) then raise exception '이 사용자에게는 보낼 수 없어요'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception '메시지 내용을 확인해 주세요'; end if;
  if (select count(*) from public.direct_messages
      where sender_id = uid and created_at > now() - interval '1 hour') >= 300
  then raise exception '한 시간 메시지 전송 제한에 도달했습니다'; end if;
  insert into public.direct_messages(conversation_id, sender_id, body)
  values (p_conversation_id, uid, trim(p_body)) returning id into new_id;
  return new_id;
end $$;

-- 아직 메시지가 없는 대화는 시작한 사람에게만 보입니다.
create or replace function public.list_direct_chats()
returns table (id uuid, other_id uuid, other_nickname text, last_body text, last_at timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  return query
    select c.id, other.id, coalesce(p.nickname, '교환학생'), m.body, coalesce(m.created_at, c.created_at)
    from public.direct_conversations c
    cross join lateral (select case when c.user_a = uid then c.user_b else c.user_a end as id) other
    left join public.people_profiles p on p.user_id = other.id
    left join lateral (
      select dm.body, dm.created_at from public.direct_messages dm
      where dm.conversation_id = c.id order by dm.created_at desc limit 1
    ) m on true
    where uid in (c.user_a, c.user_b)
      and (m.body is not null or c.started_by = uid)
      and not exists (select 1 from public.open_chat_user_blocks b where b.blocker_id = uid and b.blocked_id = other.id)
    order by 5 desc limit 200;
end $$;

-- 신고는 운영자만 확인합니다.
create table if not exists public.direct_message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.direct_messages(id) on delete cascade,
  reason text not null check (reason in ('spam','harassment','privacy','other')),
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);
alter table public.direct_message_reports enable row level security;
revoke all on public.direct_message_reports from public, anon, authenticated;

create or replace function public.report_direct_message(p_message_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if p_reason is null or p_reason not in ('spam','harassment','privacy','other') then raise exception '신고 사유를 선택해 주세요'; end if;
  if not exists (
    select 1 from public.direct_messages m join public.direct_conversations c on c.id = m.conversation_id
    where m.id = p_message_id and m.sender_id <> uid and uid in (c.user_a, c.user_b)
  ) then raise exception '메시지를 찾을 수 없어요'; end if;
  insert into public.direct_message_reports(reporter_id, message_id, reason) values (uid, p_message_id, p_reason)
  on conflict (reporter_id, message_id) do nothing;
end $$;

revoke all on function public.request_friend(uuid) from public, anon;
revoke all on function public.respond_friend(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.list_friends() from public, anon;
revoke all on function public.start_direct_chat(uuid) from public, anon;
revoke all on function public.send_direct_message(uuid, text) from public, anon;
revoke all on function public.list_direct_chats() from public, anon;
revoke all on function public.report_direct_message(uuid, text) from public, anon;
grant execute on function public.request_friend(uuid) to authenticated;
grant execute on function public.respond_friend(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.start_direct_chat(uuid) to authenticated;
grant execute on function public.send_direct_message(uuid, text) to authenticated;
grant execute on function public.list_direct_chats() to authenticated;
grant execute on function public.report_direct_message(uuid, text) to authenticated;
