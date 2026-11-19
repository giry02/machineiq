# WEB 공통 푸터 저작권 연도 2027

2026-11-19 사용자 요청을 개발 진행에서 전달받아 공통 푸터 MHMIQ-COM-008의 연도 숫자만 고정값2027로 변경했다. 올해를 자동 계산하는 방식이 아니다.

- 변경 전: ©2024 Bobcat Company. ALL RIGHTS RESERVED.
- 변경 후: ©2027 Bobcat Company. ALL RIGHTS RESERVED.
- 로고·색상·폰트·간격·레이아웃·약관 원문/팝업·최종접속 시각은 그대로 유지했다. 기존 화면ID를 유지하고 신규 화면/동작을 추가하지 않았다.

## 변경 위치 및 생성 경로

- 현행 원본 `html/final-implementation/fleet-customer-requested-260813/_shared/nav.js`의 공통 footer 생성 문자열 1곳. 활성 등록부 기준 이 파일을 실제 불러오는42개 HTML의 script 캐시query만 갱신했다.
- 로컬 대시보드 검토본 `html/requirements-review/dashboard-tabs-20261002/app/_shared/nav.js` 및 소비HTML38개의 script 캐시query만 갱신했다.
- 로컬 공지 진입 검토 생성본 `html/requirements-review/notice-entry-20261023/fleet/nav.generated.js`의 같은 연도1곳만 수정했다. 이 검토본의 전체생성 --check는 수정전부터 index.html/nav.generated.js/source-manifest.js 3개가 불일치했다. 전체재생성으로 다른 대시보드/가입 누적변경을 섞지 않고 기존 검토본의 다른 바이트를 보존했다. 전체동기화 완료로 표시하지 않는다. 이후 `scripts/build-fleet-notice-entry-preview.cjs`는 변경된 canonical nav를 읽으므로 생성되는 푸터도2027이다.
- GitHub는 `web/_shared/nav.js`, 대시보드검토 `app/_shared/nav.js`와 `dashboard-i18n-nav.js` 3곳의 연도만 변경. 이를 불러오는HTML74개(현행37+검토35+다국어검토2)는 각 실제 Git 자산바이트 해시로 script 캐시query만 갱신한다. canonical/공개본의 다른 구현 차이는 복사하지 않는다.
- `scripts/package-machineiq-web.cjs`와 offline 패키징은 canonical nav를 읽고 자산rev를 계산한다. 현행 원본 및 한글게시 transform 결과에2027이 포함됨을 확인했다. 새ZIP을 만들지는 않았다.
- 백업·AS-IS·초기 static/prototypes 이력은 보존한다. 모바일 파일/게시checkout·AWS Vue Fleet/Portal·개발코드·약관원문·원격Figma/FigJam은 변경하지 않는다.

## 검증 및 게시 근거

- 기존 WEB 검사322/322 통과. 활성49페이지·런타임190파일 및 생성원본검사 일치.
- 로컬 canonical에서5개 사용자 구분과 대시보드검토3페이지, 영어/아랍어, 기존 약관팝업 열기/닫기를 확인했다. JS오류·자산404 없음.
- 격리 GitHub 게시본과 동일1440px 전후캡처에서 현행메인 및 검토3페이지의 푸터 DOM은 연도만 다르고 로고/링크/색상/폰트/자식요소 크기·배치가 같다. 푸터는1개만 생성된다.
- 비교용 이전 커밋의 2개 다국어 검토 화면에서는 `종합 대시보드` 번역객체 오류가 발견되어 baselineErrors로 별도 기록했다. 수정본 검증의 오류와 합산하지 않았으며 이번 연도 변경 범위에서 다른 번역 구현을 수정하지 않았다.
- 코드차이는 nav의2024→2027 및 해당 script 캐시query만 허용하여 검사한다. 공개모바일 등 다른경로는 커밋에서 제외한다. 증거 `.tmp/web-footer-2027-20261119/`의 changes.json, browser.json, canonical-browser.json, source-tests.log 및 전후캡처.
- [공개 메인](https://giry02.github.io/machineiq/web/Dashboard/group-dashboard-tobe-v2.html?role=customer_owner&lang=ko)
- [대시보드 검토 모음](https://giry02.github.io/machineiq/web/requirements-review/dashboard-tabs-20261002/)

실제 GitHub 게시 커밋·배포 및 공개확인 결과는 로컬 게시영수증 publication.json/public-browser.json에 기록한다.
