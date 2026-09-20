# MACHINE IQ 프로토타입

- 웹 실행: https://giry02.github.io/machineiq/web/
- 웹 소스: `web/`
- 최초 화면: 대시보드. 상단 권한 선택으로 내부 사용자·딜러·고객 화면을 확인합니다.
- 고객 모바일 실행: https://giry02.github.io/machineiq/mobile/login.html
- 고객 모바일 소스와 문서: `mobile/` — 2026-09-20 r87. 차트형 메인, 대표 전체/직원 배정 그룹 범위, 14px 세부 글자, 일·주·월 조회, 정수 표시, 항목별 상세 이동. 효율 행 이름 굵기·수리이력 고객용 상세·미수신/빈 데이터 처리 반영. 기존 짧은 수리 목록 유지.
- [고객대표 메인](https://giry02.github.io/machineiq/mobile/index.html#home?role=customer_owner) · [고객직원 메인](https://giry02.github.io/machineiq/mobile/index.html#home?role=customer_staff)
- [이전 메인 보관](https://giry02.github.io/machineiq/mobile/dashboard-backup-20260919.html#home?role=customer_owner)
- [Android 테스트 APK v0.1.3](mobile/downloads/Machine-IQ-Customer-Location-Notifications-QR-v0.1.3-20260920-r87-debug.apk): 기존 앱 이름·딜러 아이콘·위치 동의·로컬 알림 유지. 설정 → QR 검색으로 원문 확인·복사·다시 스캔만 지원. 자동 입력·등록·실제 PUSH 서버·iOS는 미구현. 실제 카메라 검증은 설치 기기에서 필요합니다.
- QR 기능은 APK 전용입니다. 사용자 요청에 따라 현재 및 향후 HTML/ZIP에는 QR 메뉴·카메라 기능을 넣지 않습니다. 차량 시리얼번호·터미널 ID 입력 연결은 추후 별도 요청 대상입니다.
- 기존 고객 전달용 HTML ZIP: [2026-09-13 보관본](mobile/downloads/MACHINE_IQ_MOBILE_HTML_20260913_r46.zip). 최신 화면은 웹 링크를 사용하세요. 이번 게시에서 ZIP/iOS는 재생성하지 않았습니다.

정적 HTML/CSS/JavaScript 프로토타입이며 서버 로그인·실시간 수집 대신 시연 데이터를 사용합니다. 일부 설정은 브라우저에 저장됩니다. Google 지도는 키 없는 임베드로 표시됩니다.

GitHub Pages 게시 기준: `main` 브랜치의 루트. `.nojekyll` 파일을 유지해야 `web/_shared`와 `web/_mock-data`를 읽을 수 있습니다.
