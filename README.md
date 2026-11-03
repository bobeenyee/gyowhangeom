# 교환점 (Gyohwanjeom)

목적지/파견대학/파견학기로 교환학생을 연결하는 Expo + React Native 앱.

## 현재 기능

- Expo SDK 58 / React Native 0.88, iOS·Android 공통
- ROR API 대학 검색, ID·국가·도시·대학 좌표 저장, 2026~2050년 학기 휠
- 학교 / 도시 / 30km 거리 / 국가 기준 사람찾기
- 관심사 중심 공개 프로필, 한국 대학 선택 공개
- Supabase 이메일 가입·로그인, 계정별 파견 정보·프로필·체크리스트 영구 저장
- 실제 DB에 저장되는 익명 글·댓글 (작성자와 공개 프로필을 서로 다른 스키마에 분리)
- 답변한 사람만 확인할 수 있는 체크인 집계 (실제 DB 응답)
- 친구추가·개인 메시지는 아직 서버 미연결, UI로만 준비됨. **성공했다고 표시하지 않음**

**중요:** 이제 서울 Supabase 프로젝트의 공개용 키가 기본 설정으로 연결되어 있으며, 환경변수가 없더라도 실제 회원가입 화면을 열 수 있습니다.
미리보기의 사용자·게시글·체크인 통계는 가상의 샘플이며 앱을 재시작하면 상태가 사라질 수 있습니다.

## 실제 회원/DB 기능 연결 절차

1. **완료:** Supabase 서울 프로젝트 `교환점` 생성 (Project Ref: `dtrkktdxalajyncanzlc`)
2. **완료:** [supabase/schema.sql](supabase/schema.sql)을 프로젝트 DB에 적용
3. **완료:** 앱에 Project URL 및 publishable client key 연결 (관리자 비밀키 아님)
4. **선택:** 환경을 바꾸고 싶을 때만 프로젝트 루트 `.env`로 URL과 키를 덮어쓰기

   EXPO_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XXXXXXXX

5. GitHub Desktop에서 Pull 한 후 프로젝트 루트 터미널 실행:

   npm.cmd install
   npx.cmd expo start --clear --tunnel

6. 아이폰 Expo Go에서 새로운 QR 스캔 → **교환점 자체 이메일 회원가입** (Expo 계정과 별개)
7. 이메일 확인을 요구하는 Supabase 프로젝트라면 가입 확인 메일을 승인하고 로그인

**테스트 회원가입 이메일 주의 (2026년 11월 기준)**:
Supabase 기본 SMTP는 Supabase **조직의 팀원 이메일**에만 인증 메일을 보내며 매우 낮은 발송 제한이 있습니다.
Expo 팀이나 GitHub 저장소에 초대된 것만으로 Supabase 이메일 허용 목록에 추가되지는 않습니다.
친구와 2계정 테스트를 할 때는 친구를 **Supabase 조직 팀원**으로 초대하거나, 인증 메일 발송용 **커스텀 SMTP**를 연결하세요.
실제 사용자 공개 전에는 확인 메일, 비밀번호 복구, 발송 설정과 보안 점검이 필요합니다.
공식: https://supabase.com/docs/guides/auth/auth-smtp


.env는 .gitignore로 제외되어 GitHub에 올라가지 않습니다.
**service_role 키, DB 비밀번호, 비밀키는 절대 앱 .env에 넣거나 공개하지 마세요.**
EXPO_PUBLIC_ 변수는 앱 내부에 포함되므로 비밀로 취급할 수 없고, DB RLS 정책이 중요합니다.

## 첫 실사용 테스트: 서로 다른 기기 2대

- 각자 **다른 이메일/비밀번호**로 교환점 가입 및 로그인
- 각자 다른 파견 정보를 등록해서 본인 프로필만 수정되는지 확인
- 같은 파견 대학·학기를 등록한 뒤 사람찾기에 서로가 나타나는지 확인
- 사용자 A가 익명 글 작성, 사용자 B가 조회 및 익명 댓글 작성
- A가 앱을 완전히 종료한 뒤 다시 실행했을 때 글·댓글·프로필·체크가 유지되는지 확인
- Supabase SQL Editor에서 post_authors / comment_authors가 private에 있는지 확인
- B 계정으로 공개 REST API에서 다른 사람의 people_profiles 직접 읽기가 거부되는지 확인
- 체크인 답변하기 전에는 get_checkin_summary 호출이 거부되는지 확인

## 현재 미완성 / 주의

- 실제 친구 요청·1:1 채팅·실시간 익명 대화, 신고·차단, 관리 화면, 계정 탈퇴 자동화 미완성
- 지역별 커뮤니티 검색·노출 범위, 스팸 차단, 교환학생 검증, 서비스 정책/법률 고지 미완성
- 실제 이용 환경에서 두 계정에 대한 권한·성능·QA 검증은 **아직 완료되지 않음**
- 첫 테스트에서는 개인을 특정할 수 있는 정보, 연락처 등 민감한 데이터 게시 금지
- 주변 30km는 GPS가 아닌 **선택한 대학의 좌표**를 이용하며 좌표 없는 대학은 거리가 계산되지 않음
- Supabase API에는 함수로 공개한 사람찾기 정보만 제공되고 글/댓글 작성자 ID는 반환되지 않음.
  다만 운영자는 남용 방지 목적으로 비공개 테이블에서 작성자 확인이 가능하며
  글 내용/소규모 집단 맥락으로 신원이 유추될 가능성까지 제거하지는 못함.

## 기술 구조

- App.js — Expo 앱 UI/화면 이동 (리팩터링 예정)
- src/lib/cloud.js — 인증 세션, DB 읽기/쓰기, 거리 계산
- src/components/AuthScreen.js — 이메일 가입·로그인, 명시적 미리보기
- supabase/schema.sql — 테이블, RPC, Row Level Security
- .env.example — 사용자 로컬 설정 예시

## 개발 실행

    npm.cmd install
    npx.cmd expo start

Expo Go QR 접속에 서로 다른 와이파이를 쓰면 --tunnel 사용.

## 개발자가 다음으로 할 일

1. Supabase 프로젝트 생성 / SQL 적용 / 실제 회원 2명으로 권한 테스트
2. 계정 복구, 신고·차단·삭제·탈퇴, 스팸 방지
3. 상대 사용자 인증 기반의 친구 요청/채팅
4. 서버측 위치 검색 확장과 게시판 지역별 분리
5. 앱·보안 자동 테스트 및 배포 설정

## 최초 연결 검증 메모 (2026-11-04)

- Supabase 프로젝트: 서울 `ap-northeast-2`, 정상 운영 상태
- 최초 DB 마이그레이션 적용 성공
- 공용 테이블 6개에 RLS 활성화·RLS 정책 14개
- private 작성자 테이블 2개는 일반 로그인 사용자/비로그인 사용자에게 SCHEMA USAGE 및 SELECT 권한이 없는 것을 쿼리로 확인함
- **해결 완료:** private 작성자 테이블 2개에 RLS 적용. 일반 사용자에게 스키마 접근/조회/삽입 권한 없음. 작성자 연결은 서버 소유 보안 함수에서만 처리
- 실제 두 계정 회원가입/교차 테스트는 아직 미완료

## 비공개 작성자 테이블 RLS 보완 (2026-11-04)

- `private.post_authors`, `private.comment_authors` RLS 켜짐 (DB 실제 적용 및 재조회 완료)
- `anon`, `authenticated` 역할의 private schema USAGE와 테이블 SELECT/INSERT 권한 없음 확인
- 두 테이블에는 일반 사용자를 위한 정책을 추가하지 않음. 서버 소유의 `SECURITY DEFINER` 함수가 작성자 기록을 수행
- DB advisor에는 `RLS enabled no policy` **INFO**와 의도적으로 호출 가능한 보안 RPC 함수 **WARN**이 남아 있음. 내부 관리자 함수의 접근 범위/오남용 방지 등을 공개 전 별도 검토해야 함
- 실제 두 계정으로 로그인해 글쓰기·댓글쓰기 테스트는 아직 진행되지 않음
