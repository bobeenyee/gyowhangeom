-- 교환점 Supabase 자동 일시정지 방지
-- Supabase SQL Editor에서 실행합니다. 여러 번 실행해도 안전합니다.
-- GitHub Actions가 이틀마다 부르는 함수입니다. 데이터를 읽거나 쓰지 않고 'ok'만 돌려줍니다.

create or replace function public.keepalive()
returns text language sql stable set search_path = ''
as $$ select 'ok'::text $$;
revoke all on function public.keepalive() from public;
grant execute on function public.keepalive() to anon, authenticated;
