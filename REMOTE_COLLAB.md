# 교환점 — 서로 다른 장소에서 함께 개발하고 테스트하기

두 개발자가 멀리 떨어져 있어도 같은 코드와 같은 회원 데이터를 사용하도록 구성함.

## 구성

```
개발자 A 컴퓨터 ─┐
                ├─ GitHub: bobeenyee/- (코드 변경)
개발자 B 컴퓨터 ─┘

개발자 A 아이폰 ─┐
                ├─ Supabase: dtrkktdxalajyncanzlc (공통 회원·게시글·댓글)
개발자 B 아이폰 ─┘

각 컴퓨터에서 npx.cmd expo start --lan 실행
각 아이폰은 자기 옆 컴퓨터와 같은 Wi-Fi 사용
```

**친구와 같은 Wi-Fi가 필요하다는 뜻이 아님.**
각자의 컴퓨터↔각자의 아이폰끼리만 같은 Wi-Fi면 된다.
따라서 두 사람은 다른 도시에서 사용해도 됨.

### 먼저 계정 권한 확인

- GitHub: 초대받은 개발자가 GitHub 저장소 `bobeenyee/-` 접근 권한을 수락해야 코드 Pull/Push 가능.
- Expo: 팀 `bobeenyees-team` 초대 이메일을 수락하고 Developer 멤버인지 확인.
- 각 사람의 Expo CLI 로그인과 **자기 아이폰 Expo Go 로그인은 동일한 Expo 계정**으로 유지.
- 교환점 앱 내 이메일 회원가입은 Expo나 GitHub 계정과 **별개**이며, 테스트용으로 서로 다른 교환점 회원 계정 사용.
- Supabase DB는 프로젝트에 포함된 **공개용 publishable key**로 양쪽 앱이 자동 접속. 친구에게 관리자 키·비밀번호를 전달하면 안 됨.

### 친구 컴퓨터 최초 설치

1. GitHub Desktop에서 `File → Clone Repository` 선택.
2. `URL`에 **https://github.com/bobeenyee/-** 입력해서 원하는 폴더에 Clone.
3. GitHub Desktop에서 `Repository → Open in Visual Studio Code` 선택.
4. VS Code `Terminal → New Terminal` 에서 `npm.cmd install` 실행.
5. 자신의 Expo 계정으로 `npx.cmd expo login` 실행 (친구는 `chaeyuni`).
6. `npx.cmd expo start --clear --lan` 실행.
7. **친구 자기 아이폰**을 친구 **자기 컴퓨터와 같은 Wi-Fi**에 연결해 QR코드 스캔 → Expo Go로 열기.

개발자 A도 자신의 컴퓨터에서 동일하게 `npx.cmd expo start --clear --lan`으로 실행하면 됨.
로컬 LAN 주소는 다른 장소에서 열 수 없는 것이 정상이므로 **상대방에게 LAN QR코드를 보내지 않기**.

### 둘이서 코드 수정할 때

- 작업 시작 전 GitHub Desktop `Fetch origin → Pull origin`.
- 두 사람이 **같은 파일의 같은 위치를 동시에 수정하면 충돌 가능**. 가능하면 담당 기능별로 나누거나 각자 브랜치에서 작업한 후 Pull Request 병합.
- 변경한 개발자: GitHub Desktop에서 `Commit → Push origin`.
- 상대방: `Fetch origin → Pull origin`; Expo 실행 중이면 자동 갱신되거나 터미널에서 `r` 누르기.
- **코드는 GitHub 동기화가 필요**하지만, 이미 서버에 올라간 **게시글/댓글은 GitHub 푸시 없이도** 두 아이폰에 공유됨.

### 같은 DB가 실시간으로 연결되는지 확인

1. 서로 다른 교환점 회원 계정으로 앱에서 로그인.
2. A가 커뮤니티 글 작성 → B의 커뮤니티에 자동 표시되는지 확인. (다른 장소/네트워크여도 무관)
3. B가 글에 댓글 작성 → A의 글 상세 내용에 댓글이 반영되는지 확인.
4. 갱신 지연 시 '↻ 새 게시글 불러오기' 버튼으로 수동 새로고침.
5. 사람찾기는 두 사람의 파견 대학·학기가 일치해야 하고, 마이에서 **프로필 공개**를 직접 켜야 상대 검색 결과에 나타남.

Supabase Realtime의 `public.posts`/`public.comments` INSERT 이벤트를 활성화함.
익명 작성자 매핑 `private.post_authors`/`private.comment_authors`는 Realtime으로 공개하지 않음.

### 원격으로 '상대방 컴퓨터의 Expo 서버'를 바로 열고 싶은 경우

- 다른 장소의 컴퓨터에서 실행한 **LAN 주소는 접속 불가**. LAN 모드는 원래 로컬 테스트 용도.
- `npx.cmd expo start --tunnel`은 임시 대안이지만, Ngrok/터널 DNS 문제로 실패할 수 있음. 실제로 이 프로젝트에서도 `ENOTFOUND`가 발생함.
- 동일 Expo 개발 서버를 어디서나 안정적으로 열어야 한다면 향후 **EAS Development Build + EAS Update 또는 내부 배포**로 전환. 이 설정은 별도 개발 작업이며 Expo Go QR과 동일하지 않음.
- iPhone 개발 빌드를 직접 설치하려면 Apple 서명/테스트 기기 등록 등이 필요할 수 있음.

### 해결해야 할 운영 과제

- Supabase 이메일 인증: 기본 SMTP 제한으로 친구 회원가입 시 인증 메일이 제한될 수 있음. 이때 Supabase 프로젝트 인증 메일 설정 또는 SMTP 구성 필요.
- 운영 공개 전 개인정보 정책, 계정 삭제, 신고 처리, 관리자 통제, 교환학생 인증, 보안 테스트 필요.
- Supabase Realtime 이벤트가 닿지 않는 경우에도 데이터베이스 자체는 동일하게 유지되며 앱 수동 새로고침으로 최신 데이터 확인 가능.
