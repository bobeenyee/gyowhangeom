-- 교환점 중고거래 사진 및 인계 정보 확장 (기존 onboarding_market.sql 적용 후)
-- 검토 중: 운영 데이터베이스에는 이 파일을 자동 적용하지 않습니다.
-- 기존 판매글과 저장된 물건의 상태를 유지합니다.

alter table public.market_listings
  add column if not exists photo_path text,
  add column if not exists handoff_date date,
  add column if not exists handoff_note text not null default '',
  add column if not exists can_hold boolean not null default false;

alter table public.market_listings drop constraint if exists market_handoff_note_length;
alter table public.market_listings add constraint market_handoff_note_length
  check (char_length(handoff_note) <= 250);

alter table public.market_listings drop constraint if exists market_photo_owner_path;
alter table public.market_listings add constraint market_photo_owner_path
  check (
    photo_path is null
    or (
      char_length(photo_path) <= 250
      and left(photo_path, char_length(seller_id::text || '/' || id::text || '/'))
          = seller_id::text || '/' || id::text || '/'
      and photo_path like '%.jpg'
    )
  );

-- Seller can only update extra fields of their own listing.
-- Existing listing_status_own policy remains in force for both metadata and status.
grant update (photo_path, handoff_date, handoff_note, can_hold)
  on public.market_listings to authenticated;

-- Photos of items for sale are public by design; never upload IDs/documents here.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('market-photos', 'market-photos', true, 5242880, array['image/jpeg'])
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Upload must be inside the authenticated seller's OWN EXISTING listing directory.
-- Client uploads with upsert:false; no overwrite permissions are granted.
drop policy if exists market_photo_insert_own_listing on storage.objects;
create policy market_photo_insert_own_listing
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'market-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and exists (
      select 1 from public.market_listings ml
      where ml.id::text = (storage.foldername(name))[2]
        and ml.seller_id = (select auth.uid())
    )
  );

-- Delete is only for cleaning up an image owned by the caller.
drop policy if exists market_photo_delete_own_listing on storage.objects;
create policy market_photo_delete_own_listing
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'market-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
