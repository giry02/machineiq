# MACHINE IQ 프로토타입

- 웹 실행: https://giry02.github.io/machineiq/web/
- 웹 소스: `web/`
- 최초 화면: 대시보드. 상단 권한 선택으로 내부 사용자·딜러·고객 화면을 확인합니다.
- 고객 모바일 실행: https://giry02.github.io/machineiq/mobile/login.html
- 고객 모바일 소스와 문서: `mobile/` — 2026-09-20 dashboard v5. 차트형 메인, 대표 전체/직원 배정 그룹 범위, 14px 세부 글자, 일·주·월 조회, 정수 표시, 항목별 상세 이동. 텍스트 링크는 배경 없이 글자색만 강조하며 하단 프로토타입 안내 문구 제거.
- [고객대표 메인](https://giry02.github.io/machineiq/mobile/index.html#home?role=customer_owner) · [고객직원 메인](https://giry02.github.io/machineiq/mobile/index.html#home?role=customer_staff)
- [이전 메인 보관](https://giry02.github.io/machineiq/mobile/dashboard-backup-20260919.html#home?role=customer_owner)
- 기존 고객 전달용 HTML ZIP: [2026-09-13 보관본](mobile/downloads/MACHINE_IQ_MOBILE_HTML_20260913_r46.zip). 최신 화면은 웹 링크를 사용하세요. 이번 게시에서 ZIP/APK/iOS는 재생성하지 않았습니다.

정적 HTML/CSS/JavaScript 프로토타입이며 서버 로그인·실시간 수집 대신 시연 데이터를 사용합니다. 일부 설정은 브라우저에 저장됩니다. Google 지도는 키 없는 임베드로 표시됩니다.

GitHub Pages 게시 기준: `main` 브랜치의 루트. `.nojekyll` 파일을 유지해야 `web/_shared`와 `web/_mock-data`를 읽을 수 있습니다.
