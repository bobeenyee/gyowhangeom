-- 교환점 오픈채팅 신고 및 차단 (기존 open_chat.sql 이후 적용)
-- 아직 검증 중인 기능이므로 운영 DB에 자동 적용하지 않습니다.
-- 기존 방/메시지/회원 데이터를 변경하거나 삭제하지 않습니다.

-- 차단 정보는 차단한 본인만 보고 수정할 수 있습니다.
create table if not exists public.open_chat_user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  blocked_nickname text not null default '' check (char_length(blocked_nickname) <= 64),
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  constraint open_chat_blocks_not_self check (blocker_id <> blocked_id)
);
alter table public.open_chat_user_blocks enable row level security;
revoke all on public.open_chat_user_blocks from public, anon, authenticated;
grant select, insert, delete on public.open_chat_user_blocks to authenticated;

drop policy if exists open_chat_blocks_select_own on public.open_chat_user_blocks;
create policy open_chat_blocks_select_own on public.open_chat_user_blocks
  for select to authenticated using (blocker_id = (select auth.uid()));

drop policy if exists open_chat_blocks_insert_own on public.open_chat_user_blocks;
create policy open_chat_blocks_insert_own on public.open_chat_user_blocks
  for insert to authenticated
  with check (blocker_id = (select auth.uid()) and blocked_id <> blocker_id);

drop policy if exists open_chat_blocks_delete_own on public.open_chat_user_blocks;
create policy open_chat_blocks_delete_own on public.open_chat_user_blocks
  for delete to authenticated using (blocker_id = (select auth.uid()));

-- 기존 멤버십 읽기 정책을 유지하면서 차단한 발신자의 메시지만 제외합니다.
-- Restrictive 정책이므로 다른 SELECT 허용 정책을 통해 우회할 수 없습니다.
drop policy if exists open_chat_hide_blocked_sender on public.open_chat_messages;
create policy open_chat_hide_blocked_sender on public.open_chat_messages
  as restrictive for select to authenticated
  using (not exists (
    select 1 from public.open_chat_user_blocks b
    where b.blocker_id = (select auth.uid())
      and b.blocked_id = open_chat_messages.sender_id
  ));

-- 신고는 일반 사용자가 직접 조회할 수 없고 운영자만 별도 관리합니다.
create table if not exists public.open_chat_message_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  message_id uuid not null references public.open_chat_messages(id) on delete cascade,
  reason text not null check (reason in ('spam', 'harassment', 'privacy', 'other')),
  created_at timestamptz not null default now(),
  unique (reporter_id, message_id)
);
create index if not exists open_chat_reports_time_idx
  on public.open_chat_message_reports (created_at desc);
alter table public.open_chat_message_reports enable row level security;
revoke all on public.open_chat_message_reports from public, anon, authenticated;

-- 신고 권한은 로그인·방 멤버십·본인 메시지 여부를 서버에서 검증합니다.
create or replace function public.report_open_chat_message(
  p_message_id uuid, p_reason text
)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  message_room uuid;
  message_sender uuid;
begin
  if uid is null then raise exception '로그인이 필요해요'; end if;
  if p_reason not in ('spam', 'harassment', 'privacy', 'other') or p_reason is null then
    raise exception '신고 사유를 선택해 주세요';
  end if;
  select m.room_id, m.sender_id into message_room, message_sender
  from public.open_chat_messages m where m.id = p_message_id;
  if not found then raise exception '메시지를 찾을 수 없어요'; end if;
  if message_sender = uid then raise exception '본인 메시지는 신고할 수 없어요'; end if;
  if not exists (
    select 1 from public.open_chat_members member
    where member.room_id = message_room and member.user_id = uid
  ) then raise exception '참여 중인 채팅방에서만 신고할 수 있어요'; end if;
  insert into public.open_chat_message_reports (reporter_id, message_id, reason)
  values (uid, p_message_id, p_reason)
  on conflict (reporter_id, message_id) do nothing;
end;
$$;

revoke all on function public.report_open_chat_message(uuid, text) from public, anon, authenticated;
grant execute on function public.report_open_chat_message(uuid, text) to authenticated;
