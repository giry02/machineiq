# MACHINE IQ 프로토타입

- 웹 실행: https://giry02.github.io/machineiq/web/
- 웹 소스: `web/`
- 최초 화면: 대시보드. 상단 권한 선택으로 내부 사용자·딜러·고객 화면을 확인합니다.
- 고객 모바일 실행: https://giry02.github.io/machineiq/mobile/login.html
- 고객 모바일 소스와 문서: `mobile/` — 2026-09-23 r96. 운영효율·차량별효율을 이름/날짜 위, 긴 그래프 아래의 동일한 2줄 배치로 정리했습니다. 기존 행 간격과 굵기·14px 세부 글자·일주월 조회·대표/직원 권한 범위는 유지합니다. 오류 색상은 #992100, 브랜드 색상은 #FF3600입니다. 구 실행 파일과 비교 화면은 기본 배포에서 제외하며 아이콘·폰트 라이선스를 `mobile/licenses/`에 포함합니다. 기존 내장형 APK/ZIP은 이번 변경을 포함하지 않으며, GitHub 연결형 APK는 최신 화면 새로고침 후 게시된 화면을 표시합니다.
- [고객대표 메인](https://giry02.github.io/machineiq/mobile/index.html#home?role=customer_owner) · [고객직원 메인](https://giry02.github.io/machineiq/mobile/index.html#home?role=customer_staff)
- [운영효율](https://giry02.github.io/machineiq/mobile/index.html?v=20260923-r96#efficiency?efficiencyMode=daily&role=customer_owner&period=m) · [차량별효율](https://giry02.github.io/machineiq/mobile/index.html?v=20260923-r96#efficiency?efficiencyMode=vehicle&role=customer_owner&period=m)
- 이전 화면은 Git 이력에서 확인할 수 있습니다. 사용자 요청 백업은 로컬의 별도 보관 경로에 유지하며 현재 배포에는 포함하지 않습니다.
- [GitHub 연결형 APK v0.2.0 다운로드](mobile/downloads/Machine-IQ-Customer-GitHub-v0.2.0-20260921-debug.apk): GitHub Pages 최신 화면을 앱에서 바로 봅니다. 기존 위치·알림·QR 앱에 업데이트 설치할 수 있으며 이름/아이콘은 그대로입니다. 설정 → 최신 화면 새로고침. 인터넷 필요, QR·위치 동의·로컬 알림 테스트 유지. [설치·검증 안내](mobile/docs/android-github.md).
- [Android 테스트 APK v0.1.3](mobile/downloads/Machine-IQ-Customer-Location-Notifications-QR-v0.1.3-20260920-r87-debug.apk): 기존 앱 이름·딜러 아이콘·위치 동의·로컬 알림 유지. 설정 → QR 검색으로 원문 확인·복사·다시 스캔만 지원. 자동 입력·등록·실제 PUSH 서버·iOS는 미구현. 실제 카메라 검증은 설치 기기에서 필요합니다.
- QR 기능은 APK 전용입니다. 사용자 요청에 따라 현재 및 향후 HTML/ZIP에는 QR 메뉴·카메라 기능을 넣지 않습니다. 차량 시리얼번호·터미널 ID 입력 연결은 추후 별도 요청 대상입니다.
- 기존 고객 전달용 HTML ZIP: [2026-09-13 보관본](mobile/downloads/MACHINE_IQ_MOBILE_HTML_20260913_r46.zip). 최신 화면은 웹 링크를 사용하세요. 이번 게시에서 ZIP/iOS는 재생성하지 않았습니다.

정적 HTML/CSS/JavaScript 프로토타입이며 서버 로그인·실시간 수집 대신 시연 데이터를 사용합니다. 일부 설정은 브라우저에 저장됩니다. 고객 모바일의 공개 지도는 API 키 없이 외부 지도 링크로 연결합니다.

GitHub Pages 게시 기준: `main` 브랜치의 루트. `.nojekyll` 파일을 유지해야 `web/_shared`와 `web/_mock-data`를 읽을 수 있습니다.
