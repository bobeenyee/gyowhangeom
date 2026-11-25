-- 교환점 준비 체크 편집 (내 항목 추가, 기본 항목 숨기기)
-- onboarding_market.sql 다음에 Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- 새 테이블만 추가하고 기존 데이터는 바꾸지 않습니다. 대학 인증을 마친 본인만 자기 목록을 바꿀 수 있습니다.

create table if not exists public.checklist_edits (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_key text not null check (char_length(item_key) between 1 and 60),
  hidden boolean not null default false,
  title text check (char_length(trim(title)) between 1 and 60),
  group_name text check (char_length(trim(group_name)) between 1 and 20),
  created_at timestamptz not null default now(),
  primary key (user_id, item_key),
  -- 숨긴 기본 항목이거나, 제목과 구분이 있는 내 항목이어야 합니다.
  constraint checklist_edit_kind check (hidden or (title is not null and group_name is not null))
);
alter table public.checklist_edits enable row level security;
revoke all on public.checklist_edits from anon, authenticated;
grant select, insert, update, delete on public.checklist_edits to authenticated;

drop policy if exists own_checklist_edits_select on public.checklist_edits;
create policy own_checklist_edits_select on public.checklist_edits for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists own_checklist_edits_insert on public.checklist_edits;
create policy own_checklist_edits_insert on public.checklist_edits for insert to authenticated
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.university_verifications v where v.user_id = (select auth.uid()) and v.status = 'verified'));
drop policy if exists own_checklist_edits_update on public.checklist_edits;
create policy own_checklist_edits_update on public.checklist_edits for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and exists (
    select 1 from public.university_verifications v where v.user_id = (select auth.uid()) and v.status = 'verified'));
drop policy if exists own_checklist_edits_delete on public.checklist_edits;
create policy own_checklist_edits_delete on public.checklist_edits for delete to authenticated
  using (user_id = (select auth.uid()));
