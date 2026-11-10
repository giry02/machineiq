# 2026-11-10 보안·숫자 표시 검토본

## 확인 링크

- [WEB 현재 화면](https://giry02.github.io/machineiq/web/)
- [WEB PASS 앱·공식 문자(SMS) 상태별 검토](https://giry02.github.io/machineiq/web/requirements-review/registration-pass-20261017/review.html)
- [WEB 가입 본인확인 단독 시안](https://giry02.github.io/machineiq/web/requirements-review/registration-pass-20261017/index.html)
- [WEB 비밀번호 다음에 변경·90일 안내 시안](https://giry02.github.io/machineiq/web/requirements-review/password-deferral-20261110/)
- [고객 모바일 현재 화면](https://giry02.github.io/machineiq/mobile/login.html)
- [고객 모바일 비밀번호 90일 안내 검토](https://giry02.github.io/machineiq/mobile/login.html?securityPreview=1)
- [고객 모바일 본인확인 실패·취소·만료 검토](https://giry02.github.io/machineiq/mobile/signup.html?securityPreview=1)

이 문서는 GitHub 정적 프로토타입 전달 기록이다. 링크의 반영 여부는 게시 커밋과 Pages 갱신 후 확인한다. 서버 인증·실제 메일 발송·개인정보 삭제·실제 계정 정책 적용 완료를 의미하지 않는다.

## 이번 변경

| 구분 | 적용 내용 | 보존한 사항 |
| --- | --- | --- |
| WEB 목록 | 사용자·담당자 성명/연락처 표시 마스킹. 같은 공통 함수 사용 | 원본 데이터·검색·정렬·선택 대상·상세 확인·내 정보 원문 |
| WEB 업무수치 | 공통 숫자 표시의 소수 0자리 반올림. 양·음수 .5는 절댓값 기준 반올림 | 원시값·계산·분류 임계값·차트 기하·위경도·ID·날짜·누락값 |
| 고객 모바일 | 승인 목록/처리 메시지 성명 마스킹, 기존 업무수치 표시를 WEB 공통 정수 함수로 연결 | 현행 r147 화면·CSS·메뉴·데이터·권한·상세 연락처·전화/문자 링크 |
| PASS/공식 SMS | 가입 국가 KR 기준의 격리된 상태별 검토 시안. 실패·취소·만료·재시도·전환 후 결과 폐기 | 기존 가입 화면과 목업 가입 동작. 실제 공급자 인증 또는 증명 없음 |
| 비밀번호 미루기 | 선택일+90일의 다음 안내일 검토. 예: 2026-11-10 → 2027-02-08 | 실제 서버 유예 정책·기한·비밀번호 변경·로그인 상태 미변경 |

WEB 기존 44개 HTML의 수정은 변경된 공통 JavaScript의 캐시 참조만 갱신한 것이다. 기존 GNB/LNB·레이아웃·폰트·색상·버튼을 재설계하지 않았다. 모바일의 목록에는 연락처 열을 새로 만들지 않았다.

### 인증·유예 시안의 한계

- WEB PASS 갤러리는 성공을 포함한 **디자인 상태 비교**다. 실제 인증 토큰이나 연령 증명을 발급하지 않으며, 서버에 가입을 제출하지 않는다. 실제 성공 인증으로 사용하면 안 된다.
- 고객 모바일은 `securityPreview=1`에서만 검토 영역이 나타난다. 기본 로그인·가입 화면에는 보이지 않는다. 검토 모드에서 로그인·가입·비밀번호 변경 제출을 차단한다.
- 모바일 PASS 검토는 선택 국가 KR일 때만 실패/취소/만료 상태를 보여주며 모든 결과는 미인증이다. 언어를 국가로 대신 판단하지 않는다.
- WEB 90일 시안에서 Admin/SERVICE는 미루기를 숨기고 직접 호출도 차단한다. 임시 비밀번호의 필수 변경도 미룰 수 없다.
- 날짜 입력은 초안이다. 명시적인 ‘다음에 변경 · 시안’ 동작 때만 예정일을 계산한다. 저장·메일 발송·실제 계정 일정 변경은 없다.
- 실제 본인확인은 공급자 계약, 서버 검증, 인증 결과 수명·재사용 방지 및 가입 API 연계가 별도로 필요하다. 실제 90일 유예도 서버 정책 계약과 연계 후 별도 검증해야 한다.

## 소스와 변경 경계

- 기준: GitHub `main`의 `873a050`에 이번 요청 부분만 이식. 기존 Admin 권한 선택 진입점은 유지했다.
- WEB 실행 원본: `web/_shared/common-logic.js`, `map-management-enhancements.js`, `operations-data.js`, `admin-authority.js`, `dashboard-two-tab.js`, `dashboard-work-idle-compact.js`, `map-route-preview.js`.
- 고객 모바일: `mobile/model.js`, `customer.js`, `login.html`, `signup.html`, `security-preview.js` 및 참조/manifest/release 갱신.
- 공통 생성물: `scripts/build-customer-web-contracts.cjs`로 **이 저장소의 WEB 19개 원본**에서 생성한다. 변경 전후 19개 원본 해시 중 공통 표시 모듈 1개만 변경되고 나머지 18개는 동일하다. 다른 로컬 데이터·집계 버전을 복사하지 않았다.
- 별도 검토 원본: `web/requirements-review/registration-pass-20261017/`, `web/requirements-review/password-deferral-20261110/`.
- 기존 화면 목적 ID를 유지한다. 가입은 `MHMIQ-AUTH-001`, 비밀번호 변경 안내는 `MHMIQ-AUTH-003-T01`의 비교 시안이다. 별도 운영 화면·권한·API를 신설한 것이 아니다.
- 이번에 게시하지 않은 항목: 저장소에 없던 딜러 모바일 전체, 별도 고객대표 인사이트 화면, 과거 차량 시리얼 단독 등록 변경, 로컬 전용 다국어 실행 정책. 기존 고정 비교 이력은 일괄 덮어쓰지 않았다.
- 내장형 APK/HTML ZIP은 새로 만들지 않았다. 현재 정적 웹과 해당 시안 링크가 이번 전달 대상이다.

## 검증 기록

| 검사 | 결과 |
| --- | --- |
| WEB PASS/90일/정수 표시 단위 검사 | 18/18 PASS |
| WEB 목록 마스킹 검사 | Unicode·반복 처리·DOM/aria·원본 검색·문법 PASS |
| 공통 생성물 `--check` | 19개 WEB 원본 일치 PASS |
| 고객 모바일 package 검사 | checksum·문법·로컬 자산·차량 범위·HTTP 경로 PASS |
| 고객 모바일 신규 보안·숫자 검사 | 34개 권한/화면, 원시값·NULL·0·음수 .5·기하·임계값 보존 PASS |
| 고객 모바일 390px/320px 브라우저 전후 | 기본 10개 화면 배치 동일. 기본 로그인/가입 4개 캡처 픽셀 동일. 검토 모드 상태/90일/쓰기 요청 0 확인 |
| 신규 WEB 시안 실제 브라우저 | 13개 확인 PASS. 상대 자산 125개 요청의 HTTP 오류·실행 오류 0, 8언어/KR 조건·앱/SMS 실패/취소/만료·11/10→2/8·Admin/SERVICE 유예 금지 확인. 전송/저장 쓰기 0 |

일부 과거 모바일 검사는 현행 r147과 기대가 다르며 **전체 과거 회귀 통과로 보고하지 않는다**. 아래 네 실패는 변경 전 `873a050` 소스로도 같은 지점에서 재현했다.

| 기존 검사 | 동일 실패 원인 |
| --- | --- |
| `mobile/tests/auth.cjs` | 기존 검사 하니스가 휴면 로그인 모듈을 불러오지 않아 `createPreview`가 없음 |
| `mobile/tests/dashboard.cjs` | 현재 미해제 13건과 과거 오늘 발생 7건의 기대 차이 |
| `mobile/tests/error.cjs` | 기존 서비스센터 버튼의 chevron도 금지하는 과거 전체 HTML 기대 |
| `mobile/tests/lithium-shock.cjs` | 과거 dt 구조와 현행 h2/help 구조의 기대 차이 |

위 실패를 숨기기 위해 실제 화면·집계·권한을 변경하지 않았다. 대시보드 검사의 release 태그 기대 두 곳만 이번 revision에 맞추고 기존 r147 CSS 조건은 보존했다. 장시간 옛 next-week 전체 검사는 이번 게시 확인 범위가 아니다.

새로 게시하는 변경에는 인증 비밀값·내부 접속 정보·실제 사용자 원장을 추가하지 않았다. 기존 공개 브라우저 지도 설정은 수정하지 않았다. 정적 예제 데이터와 실제 서비스 데이터의 보안 처리는 구분해야 한다.
