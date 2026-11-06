-- 교환점 가입 단계 · 대학 인증 · 중고거래
-- schema.sql을 적용한 프로젝트의 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 인증 승인은 Table Editor에서 university_verifications.status를 verified로 바꾸는 방식이며,
-- 사용자는 자신의 인증 상태를 직접 바꿀 수 없습니다.

-- 가입 단계 완료 여부. 이미 가입한 사용자는 단계를 다시 거치지 않습니다.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'people_profiles' and column_name = 'onboarding_done'
  ) then
    alter table public.people_profiles add column onboarding_done boolean not null default false;
    update public.people_profiles set onboarding_done = true;
  end if;
end $$;

-- 파견 기간과 수강 과목
alter table public.exchange_assignments
  add column if not exists start_date date,
  add column if not exists end_date date,
  add column if not exists courses text[] not null default '{}',
  add column if not exists course_status text not null default 'planned';

alter table public.exchange_assignments drop constraint if exists valid_course_status;
alter table public.exchange_assignments add constraint valid_course_status
  check (course_status in ('planned','ongoing','done'));
alter table public.exchange_assignments drop constraint if exists valid_exchange_period;
alter table public.exchange_assignments add constraint valid_exchange_period
  check (start_date is null or end_date is null or end_date >= start_date);

grant delete on public.exchange_assignments to authenticated;
drop policy if exists own_exchange_delete on public.exchange_assignments;
create policy own_exchange_delete on public.exchange_assignments for delete to authenticated
  using (user_id = (select auth.uid()));

-- 아직 파견이 정해지지 않은 사용자의 관심 지역·대학. 사람찾기 대상에는 포함되지 않습니다.
create table if not exists public.exchange_interests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  region text not null default '' check (char_length(region) <= 120),
  university_id text not null default '',
  university_name text not null default '',
  country text not null default '',
  country_code text not null default '',
  city text not null default '',
  updated_at timestamptz not null default now(),
  constraint interest_has_target check (char_length(trim(region)) > 0 or char_length(university_id) > 0)
);
alter table public.exchange_interests enable row level security;
revoke all on public.exchange_interests from anon, authenticated;
grant select, insert, update, delete on public.exchange_interests to authenticated;
drop policy if exists own_interest_all on public.exchange_interests;
create policy own_interest_all on public.exchange_interests for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 대학 인증. 쓰기는 제출 함수로만 가능하고 승인은 운영자만 할 수 있습니다.
create table if not exists public.university_verifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  file_path text not null,
  file_name text not null default '',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.university_verifications enable row level security;
revoke all on public.university_verifications from anon, authenticated;
grant select on public.university_verifications to authenticated;
drop policy if exists own_verification_select on public.university_verifications;
create policy own_verification_select on public.university_verifications for select to authenticated
  using (user_id = (select auth.uid()));

-- 재학증명서·학생증 비공개 보관함. 본인 폴더에 올리기만 가능하고 다시 읽을 수 없습니다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verification-documents', 'verification-documents', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists verification_upload_own on storage.objects;
create policy verification_upload_own on storage.objects for insert to authenticated
  with check (bucket_id = 'verification-documents'
    and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.submit_university_verification(p_file_path text, p_file_name text)
returns text language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare current_status text;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if split_part(p_file_path, '/', 1) <> uid::text then raise exception '파일 경로를 확인해 주세요'; end if;
  select status into current_status from public.university_verifications where user_id = uid;
  if current_status = 'verified' then return 'verified'; end if;
  insert into public.university_verifications(user_id, status, file_path, file_name, submitted_at, reviewed_at)
  values (uid, 'pending', p_file_path, left(coalesce(p_file_name, ''), 120), now(), null)
  on conflict (user_id) do update set status = 'pending', file_path = excluded.file_path,
    file_name = excluded.file_name, submitted_at = now(), reviewed_at = null;
  return 'pending';
end $$;

-- 중고거래 게시글은 로그인한 사용자 누구나 볼 수 있고, 올리기는 인증이 승인된 사용자만 가능합니다.
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  seller_nickname text not null default '교환학생',
  title text not null check (char_length(trim(title)) between 1 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  price_text text not null check (char_length(trim(price_text)) between 1 and 30),
  category text not null check (category in ('전자기기','생활용품','가구','교재','의류','이동수단','기타')),
  country text not null default '',
  country_code text not null default '',
  city text not null default '',
  status text not null default 'selling' check (status in ('selling','reserved','sold')),
  created_at timestamptz not null default now()
);
create index if not exists market_listing_created_idx on public.market_listings (created_at desc);
create index if not exists market_listing_seller_idx on public.market_listings (seller_id, created_at desc);
alter table public.market_listings enable row level security;
revoke all on public.market_listings from anon, authenticated;
grant select on public.market_listings to authenticated;
grant update (status) on public.market_listings to authenticated;
drop policy if exists listing_read on public.market_listings;
create policy listing_read on public.market_listings for select to authenticated using (true);
drop policy if exists listing_status_own on public.market_listings;
create policy listing_status_own on public.market_listings for update to authenticated
  using (seller_id = (select auth.uid())) with check (seller_id = (select auth.uid()));

-- 대화는 참여자만 볼 수 있고, 시작과 전송은 아래 함수로만 가능합니다.
create table if not exists public.market_conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.market_listings(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  buyer_nickname text not null default '교환학생',
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id)
);
create index if not exists market_conversation_buyer_idx on public.market_conversations (buyer_id, created_at desc);
create index if not exists market_conversation_seller_idx on public.market_conversations (seller_id, created_at desc);

create table if not exists public.market_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.market_conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists market_message_conversation_idx on public.market_messages (conversation_id, created_at);
create index if not exists market_message_sender_idx on public.market_messages (sender_id, created_at desc);

alter table public.market_conversations enable row level security;
alter table public.market_messages enable row level security;
revoke all on public.market_conversations, public.market_messages from anon, authenticated;
grant select on public.market_conversations, public.market_messages to authenticated;
drop policy if exists conversation_participant_read on public.market_conversations;
create policy conversation_participant_read on public.market_conversations for select to authenticated
  using ((select auth.uid()) in (buyer_id, seller_id));
drop policy if exists message_participant_read on public.market_messages;
create policy message_participant_read on public.market_messages for select to authenticated
  using (exists (
    select 1 from public.market_conversations c
    where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)
  ));

create or replace function public.create_market_listing(
  p_title text, p_description text, p_price_text text, p_category text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare new_id uuid;
declare nick text;
declare place_country text := '';
declare place_code text := '';
declare place_city text := '';
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from public.university_verifications where user_id = uid and status = 'verified')
  then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if (select count(*) from public.market_listings
      where seller_id = uid and created_at > now() - interval '1 hour') >= 20
  then raise exception '한 시간 게시글 작성 제한에 도달했습니다'; end if;
  select nickname into nick from public.people_profiles where user_id = uid;
  -- Location always comes from the seller's own record, never from the caller.
  select country, country_code, city into place_country, place_code, place_city
    from public.exchange_assignments where user_id = uid;
  if not found then
    select country, country_code, city into place_country, place_code, place_city
      from public.exchange_interests where user_id = uid;
  end if;
  insert into public.market_listings(seller_id, seller_nickname, title, description, price_text, category, country, country_code, city)
  values (uid, coalesce(nick, '교환학생'), trim(p_title), trim(coalesce(p_description, '')), trim(p_price_text), p_category,
          coalesce(place_country, ''), coalesce(place_code, ''), coalesce(place_city, ''))
  returning id into new_id;
  return new_id;
end $$;

-- 대화 시작과 메시지 전송도 인증이 승인된 사용자만 가능합니다.
create or replace function public.start_market_chat(p_listing_id uuid)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare listing public.market_listings%rowtype;
declare chat_id uuid;
declare nick text;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  if not exists (select 1 from public.university_verifications where user_id = uid and status = 'verified')
  then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  select * into listing from public.market_listings where id = p_listing_id;
  if not found then raise exception '게시글을 찾을 수 없어요'; end if;
  if listing.seller_id = uid then raise exception '내 게시글에는 대화를 시작할 수 없어요'; end if;
  select id into chat_id from public.market_conversations where listing_id = p_listing_id and buyer_id = uid;
  if chat_id is not null then return chat_id; end if;
  if listing.status = 'sold' then raise exception '이미 판매 완료된 물건이에요'; end if;
  select nickname into nick from public.people_profiles where user_id = uid;
  insert into public.market_conversations(listing_id, buyer_id, seller_id, buyer_nickname)
  values (p_listing_id, uid, listing.seller_id, coalesce(nick, '교환학생'))
  returning id into chat_id;
  return chat_id;
end $$;

create or replace function public.send_market_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare chat public.market_conversations%rowtype;
declare new_id uuid;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  select * into chat from public.market_conversations where id = p_conversation_id;
  if not found or uid not in (chat.buyer_id, chat.seller_id) then raise exception '대화를 찾을 수 없어요'; end if;
  if not exists (select 1 from public.university_verifications where user_id = uid and status = 'verified')
  then raise exception 'UNIVERSITY_NOT_VERIFIED'; end if;
  if char_length(trim(coalesce(p_body, ''))) not between 1 and 1000 then raise exception '메시지 내용을 확인해 주세요'; end if;
  if (select count(*) from public.market_messages
      where sender_id = uid and created_at > now() - interval '1 hour') >= 300
  then raise exception '한 시간 메시지 전송 제한에 도달했습니다'; end if;
  insert into public.market_messages(conversation_id, sender_id, body)
  values (p_conversation_id, uid, trim(p_body)) returning id into new_id;
  return new_id;
end $$;

revoke all on function public.submit_university_verification(text, text) from public, anon;
revoke all on function public.create_market_listing(text, text, text, text) from public, anon;
revoke all on function public.start_market_chat(uuid) from public, anon;
revoke all on function public.send_market_message(uuid, text) from public, anon;
grant execute on function public.submit_university_verification(text, text) to authenticated;
grant execute on function public.create_market_listing(text, text, text, text) to authenticated;
grant execute on function public.start_market_chat(uuid) to authenticated;
grant execute on function public.send_market_message(uuid, text) to authenticated;
