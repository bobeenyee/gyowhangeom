## 웹 미리보기 (아이폰 Safari 공유용)

- **웹 빌드 성공:** `expo export --platform web`으로 React Native Web 정적 페이지 생성 가능
- 저장소는 `private`이므로 GitHub Pages를 활성화하지 않았으며, 공개 저장소로 바꾸지 않음
- 현재 CI `Build web preview`가 웹 배포용 정적 산출물(`gyohwanjeom-web-preview`)을 GitHub Actions 아티팩트로 보관
- 친구에게 Safari로 공유할 실제 웹 URL은 **호스팅 연결 후에만** 생성됨. 현재는 라이브 링크가 없음
- Vercel 연결을 권장: 기존 비공개 GitHub 저장소를 연결하고 `vercel.json` 설정으로 Expo Web을 빌드하여 미리보기 도메인 배포
- 웹 페이지를 발행하면 URL을 아는 사람이 사이트에 접속할 수 있으므로, 테스트용 익명 커뮤니티에 민감정보를 쓰지 말 것
- 친구는 별도 Expo Go 계정을 사용하더라도 **웹 미리보기에서는 Expo 로그인 불필요** (교환점 자체 로그인은 별도)
- iPhone Expo Go는 개발 서버를 실행한 Expo CLI와 같은 Expo 계정으로 로그인해야 하며, Expo 팀에 참여했다고 다른 계정의 LAN/터널 QR로 개발 서버를 열 수 있는 것은 아님
- Expo 프로젝트는 앱스토어에 출시하지 않아도 웹에서 별도로 테스트 가능

# 교환점 (Gyohwanjeom)

목적지/파견대학/파견학기로 교환학생을 연결하는 Expo + React Native 앱.


## 원격 공동 개발 (서로 다른 도시에서도 가능)

**[REMOTE_COLLAB.md](REMOTE_COLLAB.md)** 문서에 친구의 최초 GitHub Clone, VS Code 설치, Expo 계정/조직 초대, 아이폰 QR 실행, 코드 Pull/Push, Supabase 실시간 연동 테스트를 단계별로 정리했습니다.

- 두 사람은 같은 장소나 같은 Wi-Fi를 쓸 필요가 없습니다. **각자 PC와 각자 아이폰**만 같은 Wi-Fi면 됩니다.
- 각자 터미널에서 `npx.cmd expo start --clear --lan` 실행 후 **자기 PC의 QR**을 자기 아이폰으로 스캔하세요.
- Expo 계정은 서로의 계정을 공유하지 않고 각자 사용하세요. 앱 내부 가입 계정도 별개입니다.
- 서로 다른 네트워크에서도 두 아이폰은 공통 Supabase 서버에 연결되며, 커뮤니티 글/댓글은 Realtime 알림으로 다시 불러옵니다(연결이 끊기면 수동 새로고침 가능).
- Expo `--tunnel`은 이미 DNS `ENOTFOUND` 오류를 경험해 기본 개발 방식으로 추천하지 않습니다.
- 상대방의 LAN QR을 다른 도시에서 열 수는 없습니다. PC 없이 배포 앱을 이용하려면 별도 EAS Development Build/내부 배포가 필요합니다.

## 현재 기능

- Expo SDK 58 / React Native 0.88, iOS·Android 공통
- 한국어·영어 대학 검색: ROR 실제 대학 기록 + 한국어 별칭 + Wikidata 보조 조회, ID·국가·도시·좌표 저장, 2026~2050년 학기 휠
- 학교 / 도시 / 30km 거리 / 국가 기준 사람찾기
- 관심사 중심 공개 프로필, 한국 대학 선택 공개
- Supabase 이메일 가입·로그인, 계정별 파견 정보·프로필·체크리스트 영구 저장
- 실제 DB에 저장되는 익명 글·댓글 (작성자와 공개 프로필을 서로 다른 스키마에 분리)
- 전체 지역·같은 대학·도시·국가별 게시글 필터(파견 학기 조건 적용) 및 게시글 신고 기록
- 답변한 사람만 확인할 수 있는 체크인 집계 (실제 DB 응답)
- 친구추가·개인 메시지는 아직 서버 미연결, UI로만 준비됨. **성공했다고 표시하지 않음**

**중요:** 이제 서울 Supabase 프로젝트의 공개용 키가 기본 설정으로 연결되어 있으며, 환경변수가 없더라도 실제 회원가입 화면을 열 수 있습니다.
미리보기의 사용자·게시글·체크인 통계는 가상의 샘플이며 앱을 재시작하면 상태가 사라질 수 있습니다.

## 가입 단계 · 대학 인증 · 중고거래 DB 적용

[supabase/onboarding_market.sql](supabase/onboarding_market.sql)을 Supabase SQL Editor에서 실행해야 실제 서버에서 동작합니다. **이 코드를 배포하기 전에 먼저 실행하세요.** 적용 전에는 파견 정보 저장과 중고거래가 오류 안내를 표시합니다.

- 이미 가입한 사용자는 가입 단계를 건너뛰고, 새 사용자만 3단계를 거칩니다.
- 대학 인증은 학교 메일 코드 방식입니다. 아래 **이메일 인증 설정**까지 끝내야 동작합니다.
- 인증 상태는 사용자가 직접 바꿀 수 없습니다. 도메인 규칙에 맞지 않는 학교는 Table Editor에서 `status`를 `verified`로 바꿔 수동 승인할 수 있습니다.

### 이메일 인증 설정

순서를 지켜 주세요. 5번을 먼저 하면 아무도 인증할 수 없어 글쓰기와 체크인을 쓸 수 없습니다.

1. [supabase/university_email.sql](supabase/university_email.sql)과 [supabase/open_chat.sql](supabase/open_chat.sql)을 SQL Editor에서 실행합니다.
2. 메일을 보낼 Google 계정에서 2단계 인증을 켜고 [앱 비밀번호](https://myaccount.google.com/apppasswords)를 만듭니다. 전용 계정을 권장합니다.
3. Supabase **Edge Functions**에서 `send-university-code` 함수를 만들어 [index.js](supabase/functions/send-university-code/index.js) 내용을 붙여넣고, **Verify JWT를 끄고** 배포합니다.
4. Edge Functions **Secrets**에 `GMAIL_USER`(Gmail 주소)와 `GMAIL_APP_PASSWORD`(앱 비밀번호)를 추가하고, 실제로 코드 메일이 오는지 확인합니다.
5. [supabase/verified_only.sql](supabase/verified_only.sql)을 실행합니다. 이후 인증하지 않은 사용자는 글·댓글·신고·체크인·체크리스트를 저장할 수 없고 사람찾기 목록에도 나타나지 않습니다.
6. 코드를 배포합니다.

Gmail은 하루 발송량 제한이 있고 메일이 스팸함으로 갈 수 있어 테스트 단계에 맞는 방식입니다.

허용 도메인은 `*.ac.kr` 같은 `ac.국가코드`, `.edu`, `.edu.국가코드`, `ewhain.net`입니다. 다른 학교는 SQL의 `is_university_email`과 앱의 `isUniversityEmail`에 추가합니다.
- 중고거래 게시글은 로그인한 사용자 누구나 볼 수 있고, 물건 올리기·대화 시작·메시지 전송은 DB 함수가 `verified` 여부를 확인합니다.

## 실제 회원/DB 기능 연결 절차

1. **완료:** Supabase 서울 프로젝트 `교환점` 생성 (Project Ref: `dtrkktdxalajyncanzlc`)
2. **완료:** [supabase/schema.sql](supabase/schema.sql)을 프로젝트 DB에 적용
3. **완료:** 앱에 Project URL 및 publishable client key 연결 (관리자 비밀키 아님)
4. **선택:** 환경을 바꾸고 싶을 때만 프로젝트 루트 `.env`로 URL과 키를 덮어쓰기

   EXPO_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_XXXXXXXX

5. GitHub Desktop에서 Pull 한 후 프로젝트 루트 터미널 실행:

   npm.cmd install
   npx.cmd expo start --clear --lan

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

- 실제 친구 요청·1:1 채팅·실시간 익명 대화, 차단·신고 처리 대시보드, 관리 화면, 계정 탈퇴 자동화 미완성
- 자유 검색·알림·스팸 차단, 파견 자격 검증, 서비스 정책/법률 고지 미완성. 지역별 필터는 구현됐지만 모든 글의 범위별 RLS 차단은 아직 미설정(필터 표시 기능).
- 실제 이용 환경에서 두 계정에 대한 권한·성능·QA 검증은 **아직 완료되지 않음**
- 첫 테스트에서는 개인을 특정할 수 있는 정보, 연락처 등 민감한 데이터 게시 금지
- 주변 30km는 GPS가 아닌 **선택한 대학의 좌표**를 이용하며 좌표 없는 대학은 거리가 계산되지 않음
- Supabase API에는 함수로 공개한 사람찾기 정보만 제공되고 글/댓글 작성자 ID는 반환되지 않음.
  다만 운영자는 남용 방지 목적으로 비공개 테이블에서 작성자 확인이 가능하며
  글 내용/소규모 집단 맥락으로 신원이 유추될 가능성까지 제거하지는 못함.

## 기술 구조

- App.js — Expo 앱 UI/화면 이동 (리팩터링 예정)
- src/lib/cloud.js — 인증 세션, 지역별 DB 읽기/쓰기, 신고, 거리 계산
- src/lib/universitySearch.js — 한국어 별칭과 Wikidata↔ROR 연동
- src/components/AuthScreen.js — 이메일 가입·로그인, 명시적 미리보기
- supabase/schema.sql — 테이블, RPC, Row Level Security
- .env.example — 사용자 로컬 설정 예시

## 개발 실행

    npm.cmd install
    npx.cmd expo start

Expo Go QR은 해당 컴퓨터와 같은 로컬 Wi-Fi의 아이폰에서 열기. 다른 장소에 있는 친구는 자기 컴퓨터에서 별도 LAN 서버를 시작할 것.

## 개발자가 다음으로 할 일

1. 실제 회원 2명으로 게시글/댓글/개인정보 비노출/권한 교차 테스트
2. 계정 복구, 신고 처리·차단·삭제·탈퇴, 스팸 방지
3. 상대 사용자 인증 기반의 친구 요청/채팅
4. 게시판 지역별 읽기 권한 강화, 서버측 위치 검색 및 알림 확장
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

## 한국어 대학 검색 + 지역별 커뮤니티 (2026-11-04)

- ROR 검색 결과의 실제 기관 ID만 등록. `코펜하겐대학교` → `University of Copenhagen` 등 한국어 별칭 지원.
- 다른 한글 대학명은 ROR 다국어 기록에서 먼저 조회하고 Wikidata 한국어 이름→영어 이름/ROR(P6782)로 보조 검색.
- 직접 조회한 실제 검색 성공 여부는 기기별로 검증 필요. 외부 API 연결 실패 시 영문 검색으로 재시도할 수 있음.
- 커뮤니티에 같은 대학·도시·국가 범위와 같은 파견 학기 필터 추가. Supabase 검색 쿼리 단계에서 제한.
- 작성 시 지역·대학·학기는 클라이언트가 전달한 값이 아니라 서버에 저장된 로그인 사용자의 파견 정보로 기록.
- 신고 테이블 `content_reports`: RLS 적용, 이용자 본인의 신고만 직접 조회 가능. 운영자 신고 검토·차단은 미구현.
- 임시 트랜잭션 `ROLLBACK` 테스트에서 익명 게시글 RPC의 위조 지역 무시 및 신고 기록 삽입 확인.
- 공개 전 보안 권고: 4개의 `SECURITY DEFINER` RPC 점검 및 Auth leaked password protection 활성화. 현시점 보안 감사를 완료한 것은 아님.
- 로그인 인증 메일의 기존 기본 리다이렉트(`localhost:3000`)는 앱 딥링크로 아직 정비하지 않았으므로, 메일 확인 후 교환점 앱에 돌아와 로그인할 것.

## 공동 작업 실시간 연결 상태 (2026-11-04)

- Expo 조직 owner 설정: `bobeenyees-team` (app.json)
- Supabase `supabase_realtime` publication에 `public.posts`, `public.comments` 등록 확인
- 로그인 중인 앱에서 게시글/댓글 INSERT 이벤트 감지 시 현재 커뮤니티 범위 재조회
- 두 장소·두 기기 실제 작동 검증은 아직 필요하며, GitHub Actions에서 iOS JS 번들 빌드 검증은 성공
