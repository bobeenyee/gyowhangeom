# 교환점 Expo Go 팀 미리보기 — EAS Update

## 왜 필요한가?

서로 다른 iPhone의 Expo Go 계정은 **개발 서버**(LAN/ngrok/tunnel)에서 계정 일치 제한이 있습니다.
반면, **Expo에 게시된 업데이트**는 이 개발 서버의 계정 일치 제한 대상이 아닙니다.
단, Expo Go에 호환되는 SDK/네이티브 모듈의 업데이트만 Expo Go에서 열 수 있습니다.
문서: https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/
문서: https://docs.expo.dev/versions/latest/sdk/updates/

## 교환점에 반영한 준비

- Expo 조직 소유자: `bobeenyees-team` (`app.json`)
- 프로젝트 이름/slug: `gyohwanjeom`
- `expo-updates`: SDK 58 호환 버전 (`package.json`)
- EAS 프리뷰 채널: `preview` (`eas.json`)
- 데이터베이스: 기존 Supabase 서울 프로젝트 (앱 실행 시 동일한 사용자 DB)

## 실제 Expo 게시 연결 (처음 한 번만)

1. GitHub Desktop에서 Pull origin.
2. VS Code 터미널에서 `npm.cmd install`.
3. VS Code 터미널에서 `npx.cmd eas-cli@latest whoami` 실행. `bobeenyee`가 보여야 함. 미로그인 시 `npx.cmd eas-cli@latest login`.
4. `npx.cmd eas-cli@latest update:configure` 실행.
   - 실제 `bobeenyees-team` 조직의 `gyohwanjeom` 프로젝트를 연결하거나 새로 생성.
   - 성공하면 `app.json`에 `extra.eas.projectId`, `updates.url`, `runtimeVersion` 항목이 기록됨.
   - Expo CLI가 변경한 파일은 GitHub Desktop에서 Commit → Push origin 하여 팀에 공유.
   - 프로젝트 비밀키/Apple Developer 계정은 불필요.
5. `npx.cmd eas-cli@latest update --branch preview --message "교환점 첫 공동 미리보기" --environment preview` 실행.
   - 성공하면 Expo 대시보드 업데이트 상세 링크가 표시됨.
   - 대시보드 **Update groups**에서 Preview 버튼을 누르고 QR이나 링크를 확인.
6. 친구는 Expo 팀의 초대를 수락한 `chaeyuni`로 Expo Go 로그인 후 **게시된 업데이트의 미리보기 링크**를 열어 테스트.
   - 개발 서버 QR을 대신 보내면 여전히 Expo 계정 일치 오류가 날 수 있음.
   - Expo Go는 SDK와 네이티브 런타임이 맞는 경우에만 게시 업데이트를 열 수 있으므로, 실제 아이폰 확인이 필수.
   - Expo Go에서 호환성 오류가 나면 그 업데이트는 Expo Go로는 확인할 수 없으며 **웹 미리보기 또는 iOS 개발 빌드**로 전환.

## 자주 하는 업데이트

앱 JavaScript나 UI를 수정한 다음 GitHub에서 최신 코드로 Pull 한 후:

```powershell
npx.cmd eas-cli@latest update --branch preview --message "교환점 기능 수정" --environment preview
```

게시되면 친구는 새 업데이트를 열어 볼 수 있음. **게시하지 않은 코드 변경은 Expo Update에 자동으로 반영되지 않음.**

### 참고

- 정식 앱스토어 출시, Apple Developer 유료 멤버십은 **EAS Update 게시 설정 자체에는 필요하지 않음**.
- iOS 실기기용 **별도 개발 빌드/배포**에는 Apple 개발자 프로그램 인증이 필요할 수 있음.
- EAS Update는 Expo CLI 프로젝트 연결, 업로드, 실제 아이폰 호환성 확인 이후에야 동작 여부가 확정됨.
- 네트워크·권한·현재 Expo Go 버전에 따라 미리보기가 작동하지 않을 수 있으니 이를 성공이라고 단정하지 않음.

공식 안내:
- https://docs.expo.dev/eas-update/getting-started/
- https://docs.expo.dev/eas-update/preview/
- https://docs.expo.dev/eas-update/expo-dev-client/
