-- 교환점 대학 이메일 인증
-- onboarding_market.sql 다음에 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 코드를 메일로 보내는 일은 Edge Function send-university-code가 맡고, 코드는 해시로만 저장합니다.

alter table public.university_verifications alter column file_path drop not null;
alter table public.university_verifications add column if not exists email text;

-- 학교 메일 하나로는 계정 하나만 인증할 수 있습니다.
create unique index if not exists university_verified_email_idx
  on public.university_verifications (lower(email))
  where status = 'verified' and email is not null;

create table if not exists private.university_email_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0
);
create table if not exists private.university_email_sends (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);
create index if not exists university_email_sends_user_idx on private.university_email_sends (user_id, created_at desc);
create index if not exists university_email_sends_email_idx on private.university_email_sends (email, created_at desc);
alter table private.university_email_codes enable row level security;
alter table private.university_email_sends enable row level security;

create or replace function private.is_university_email(p_email text)
returns boolean language sql immutable set search_path = ''
as $$
  select p_email ~ '^[a-z0-9._%+-]+@([a-z0-9-]+\.)+(ac\.[a-z]{2}|edu|edu\.[a-z]{2})$'
    -- 학교 메일이지만 도메인 규칙에 맞지 않는 대학은 여기에 추가합니다.
    or split_part(p_email, '@', 2) = any (array['ewhain.net']);
$$;

-- Edge Function만 호출합니다. 평문 코드는 메일로 보낼 수 있도록 이때 한 번만 반환합니다.
create or replace function public.issue_university_email_code(p_user_id uuid, p_email text)
returns text language plpgsql security definer set search_path = ''
as $$
declare clean_email text := lower(trim(coalesce(p_email, '')));
declare code text;
begin
  if not private.is_university_email(clean_email) then
    raise exception '재학 중인 대학의 학교 메일을 입력해 주세요. (예: name@kookmin.ac.kr)';
  end if;
  if exists (select 1 from public.university_verifications where user_id = p_user_id and status = 'verified') then
    raise exception '이미 대학 인증을 완료했어요.';
  end if;
  if exists (select 1 from public.university_verifications
             where lower(email) = clean_email and status = 'verified' and user_id <> p_user_id) then
    raise exception '이미 다른 계정에서 인증한 메일이에요.';
  end if;
  if exists (select 1 from private.university_email_sends
             where user_id = p_user_id and created_at > now() - interval '60 seconds') then
    raise exception '인증 메일은 1분에 한 번만 보낼 수 있어요.';
  end if;
  if (select count(*) from private.university_email_sends
      where user_id = p_user_id and created_at > now() - interval '1 hour') >= 5
    or (select count(*) from private.university_email_sends
        where email = clean_email and created_at > now() - interval '1 hour') >= 5
  then raise exception '인증 메일을 너무 많이 요청했어요. 1시간 뒤에 다시 시도해 주세요.'; end if;

  code := lpad((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint % 1000000)::text, 6, '0');
  insert into private.university_email_codes(user_id, email, code_hash, expires_at, attempts)
  values (p_user_id, clean_email, encode(sha256(convert_to(p_user_id::text || ':' || code, 'UTF8')), 'hex'), now() + interval '10 minutes', 0)
  on conflict (user_id) do update set email = excluded.email, code_hash = excluded.code_hash,
    expires_at = excluded.expires_at, attempts = 0;
  insert into private.university_email_sends(user_id, email) values (p_user_id, clean_email);
  return code;
end $$;

-- 틀린 코드의 시도 횟수가 저장되도록 예외 대신 결과값을 반환합니다.
create or replace function public.confirm_university_email_code(p_code text)
returns text language plpgsql security definer set search_path = ''
as $$
declare uid uuid := (select auth.uid());
declare pending private.university_email_codes%rowtype;
begin
  if uid is null then raise exception '로그인이 필요합니다'; end if;
  select * into pending from private.university_email_codes where user_id = uid for update;
  if not found then return 'no_code'; end if;
  if pending.expires_at < now() then return 'expired'; end if;
  if pending.attempts >= 5 then return 'too_many'; end if;
  if pending.code_hash <> encode(sha256(convert_to(uid::text || ':' || trim(coalesce(p_code, '')), 'UTF8')), 'hex') then
    update private.university_email_codes set attempts = attempts + 1 where user_id = uid;
    return 'invalid';
  end if;
  if exists (select 1 from public.university_verifications
             where lower(email) = pending.email and status = 'verified' and user_id <> uid) then
    return 'taken';
  end if;
  insert into public.university_verifications(user_id, status, email, reviewed_at)
  values (uid, 'verified', pending.email, now())
  on conflict (user_id) do update set status = 'verified', email = excluded.email, reviewed_at = now();
  delete from private.university_email_codes where user_id = uid;
  return 'verified';
end $$;

revoke all on function private.is_university_email(text) from public, anon, authenticated;
revoke all on function public.issue_university_email_code(uuid, text) from public, anon, authenticated;
grant execute on function public.issue_university_email_code(uuid, text) to service_role;
revoke all on function public.confirm_university_email_code(text) from public, anon;
grant execute on function public.confirm_university_email_code(text) to authenticated;

-- 서류 업로드 방식은 더 이상 쓰지 않습니다. 이미 올라온 파일은 Storage에 그대로 남습니다.
drop function if exists public.submit_university_verification(text, text);
drop policy if exists verification_upload_own on storage.objects;
