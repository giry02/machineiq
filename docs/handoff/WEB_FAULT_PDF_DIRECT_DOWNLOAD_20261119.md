# WEB 에러 조치 PDF 직접 다운로드

2026-11-19 사용자 요청: 서비스 차량 에러 목록과 차량 상세 에러의 기존 PDF 버튼은 ‘에러 조치 정보’ 팝업·브라우저 인쇄 없이 PDF 파일을 바로 내려받는다. 기존 메뉴·표·버튼 크기·역할별 조회·다국어 배치를 유지한다.

## 프로토타입 변경

- 기존 페이지 ID `MHMIQ-SVC-004` 차량 에러, `MHMIQ-OPS-002` 차량 상세 유지. 제거한 공통 팝업 `MHMIQ-SVC-004-P01`은 retired 기록으로 남기며 재사용하지 않는다.
- `_shared/service-error-view.js`: 공통 PDF 셀은 같은 출처의 상대 링크 `_shared/sample-documents/P02E0.pdf`와 `download="P02E0.pdf"`를 사용한다. 새 창·fetch·Blob 변환·인쇄 없이 브라우저의 파일 다운로드를 사용한다. `hasDocument === false` 행은 기존 `-` 그대로다. 옛 문서 팝업 HTML 생성과 상세 추출 함수를 제거했다.
- `Service/service-error-tobe.html`: 기존 고정 이력의 PDF 2개도 같은 다운로드 링크로 교체. 동적으로 추가되는 시연 행은 공통 PDF 셀을 그대로 사용한다.
- `_shared/service-enhancements.js`: 에러 팝업 생성/문서 추출, PDF 클릭 가로채기, print 호출과 print 상태 정리 이벤트 제거. 소모품 등 다른 업무의 공통 팝업은 유지한다.
- `Vehicle Detail/vehicle-detail-tobe.html`, `_shared/vehicle-detail-errors.js`, `.css`: 에러 팝업 DOM·열기/닫기/인쇄 이벤트·전용 print CSS와 이제 미사용인 상세 페이지의 service CSS 참조 제거. 에러 조회·정렬은 유지한다.
- `_shared/service-enhancements.css`: 에러 인쇄 규칙 제거. native 링크의 글꼴/줄 높이/밑줄을 기존 PDF 버튼과 같게 맞춘다. 서비스 4페이지와 상세의 변경된 공통 자산 캐시 참조를 갱신했다.

## 샘플과 실제 개발의 경계

원본 사용자 파일: `C:/Users/Giry/AppData/Local/Temp/BNZ.6afe529e6a6efe88/P02E0.pdf`.

- 파일명 **P02E0.pdf**, 크기 **724,454 bytes**, SHA-256 **3b6a19228823310daf867d3636e951676a8fdcfd6ceeb3271b830cbaece7579f**.
- 사용자 지시에 따라 로컬 WEB·GitHub 정적 프로토타입의 `_shared/sample-documents/P02E0.pdf`로 복사한다. 문서 버튼이 있는 행은 모두 이 **프로토타입 전용 샘플**을 내려받으며, 각 고장별 실제 백엔드 문서로 매핑한 것이 아니다. 원래 파일명을 유지하고 접근성 속성에도 sample 이름을 표시한다.
- **개발 코드/AWS에는 샘플을 넣지 않는다.** 실제 개발은 별도 개발 진행 대화에서 팝업·인쇄 제거까지만 진행한다. 백엔드 문서 경로는 완성 후 연결하며, DB solution 파일명과 서버가 반환하는 문서 URL을 사용한다. 미완성 `/faults/documents/{fileName}` 경로나 예시 파일을 실제 개발에 연결 완료했다고 표시하지 않는다.
- 이번 GitHub 반영은 WEB PDF 변경만이다. 가입/NICE 시안, 미게시 어드민 등 다른 로컬 변경·모바일·AWS·CodeCommit·원격 FigJam은 포함하지 않는다.

## 검증

- 기존 WEB 검사 322개 통과. 활성 49페이지·런타임 190파일 및 생성 원본 일치. 샘플 파일이 WEB 의존성 목록에 포함되는 것을 확인했다.
- 격리 게시본 Edge에서 고객 대표/직원·딜러 대표/직원·내부사용자 5구분 × 서비스 목록/차량 상세, 총 **10개 실제 다운로드** 성공. 파일명·크기·원본 SHA가 모두 같다. 문서 팝업·print 호출·애플리케이션 새 탭·페이지 이동 0, 자산 404·JS 오류·쓰기 요청 0.
- canonical 로컬의 영어·아랍어에서도 목록/상세 다운로드를 확인했다. 기존 한국어 고정 GitHub 게시 프로필은 변경하지 않는다.
- 동일 1440px·동일 기준시각에서 변경 전후 목록/상세 표의 내용·기하·PDF 버튼 스타일이 같고 **두 표 캡처가 픽셀 일치**한다. 구 팝업 실행/이벤트/전용 CSS 참조가 없는 것을 코드에서 검사했다.
- 근거: `.tmp/web-pdf-qa-20261119/`의 `sample.json`, `downloads.json`, `comparison.json`, `pixels.json`, `canonical-en-downloads.json`, `canonical-ar-downloads.json`, `source-tests.log`. 별도 ZIP은 생성하지 않았다.

## 확인 주소

- [로컬 서비스 차량 에러](http://localhost:8795/Service/service-error-tobe.html?role=customer_owner&lang=ko&period=c&from=2026-07-01&to=2026-11-18)
- [로컬 차량 상세](http://localhost:8795/Vehicle%20Detail/vehicle-detail-tobe.html?role=customer_owner&lang=ko&veh=FBA32_224250271&period=c&from=2026-07-01&to=2026-11-18)
- [게시 서비스 차량 에러](https://giry02.github.io/machineiq/web/Service/service-error-tobe.html?role=customer_owner&lang=ko&period=c&from=2026-07-01&to=2026-11-18)
- [게시 차량 상세](https://giry02.github.io/machineiq/web/Vehicle%20Detail/vehicle-detail-tobe.html?role=customer_owner&lang=ko&veh=FBA32_224250271&period=c&from=2026-07-01&to=2026-11-18)

정적 WEB의 `role=internal` 진입을 검증한 것이며 별도 실제 개발 Portal/AWS의 동작 완료를 뜻하지 않는다.
