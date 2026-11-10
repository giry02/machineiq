const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const base = path.resolve(__dirname, '../web/requirements-review/password-deferral-20261110');
const mobile = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../mobile/security-preview.js'), 'utf8'), mobile);
const { reminderDate } = mobile.module.exports;
const context = { module: { exports: {} } };
vm.runInNewContext(fs.readFileSync(path.join(base, 'preview.js'), 'utf8'), context);
const bind = context.module.exports;

function harness(account = 'user') {
  const ids = ['previewAccount', 'selectedDate', 'deferralStatus', 'deferPreview', 'deferAction', 'deferralPolicy', 'selectedDateField', 'passwordDeferralPreview'];
  const elements = Object.fromEntries(ids.map(id => [id, { value: '', hidden: false, disabled: false, textContent: id === 'deferralPolicy' ? '선택일부터 90일' : '', listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } }]));
  const callbacks = {};
  const document = { getElementById: id => elements[id], defaultView: { addEventListener: (type, callback) => callbacks[type] = callback } };
  context.URLSearchParams = URLSearchParams;
  bind(document, reminderDate, '?account=' + account);
  return { elements, callbacks };
}

test('기존 모바일 순수 날짜 함수 하나로 월말·연도·윤년의 선택일+90일을 계산한다', () => {
  for (const [selected, expected] of [
    ['2026-11-10', '2027-02-08'], ['2023-11-30', '2024-02-28'],
    ['2023-12-01', '2024-02-29'], ['2024-02-29', '2024-05-29'],
    ['2026-01-31', '2026-05-01'],
  ]) assert.equal(reminderDate(selected), expected);
  for (const selected of ['', '2026-02-29', '2026-04-31', '2026-1-01', 'not-a-date']) assert.equal(reminderDate(selected), null);
});
test('날짜 선택은 입력만 바꾸고 명시적 다음에 변경 클릭 때만 예정일을 표시한다', () => {
  const { elements: e } = harness();
  e.selectedDate.value = '2023-12-01';
  e.selectedDate.listeners.input();
  assert.equal(e.deferralStatus.hidden, true);
  e.deferPreview.listeners.click();
  assert.match(e.deferralStatus.textContent, /2023-12-01.*2024-02-29.*90/);
  e.selectedDate.value = '2026-02-29';
  e.deferPreview.listeners.click();
  assert.match(e.deferralStatus.textContent, /올바른/);
});
test('Admin/SERVICE는 버튼 숨김·비활성이고 함수 직접 호출로도 유예되지 않는다', () => {
  const { elements: e } = harness('admin');
  assert.equal(e.deferAction.hidden, true, 'display가 있는 버튼이 아니라 plain wrapper를 숨긴다');
  assert.equal(e.deferPreview.disabled, true);
  assert.equal(e.selectedDateField.hidden, true);
  assert.match(e.deferralPolicy.textContent, /필수 변경/);
  e.deferPreview.listeners.click();
  assert.equal(e.deferralStatus.textContent, '');
  e.previewAccount.value = 'user';
  e.previewAccount.listeners.change();
  assert.equal(e.deferAction.hidden, false);
  const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
  assert.match(html, /<div id="deferAction">\s*<button[^>]*id="deferPreview"/);
});
test('검토 폼 제출과 페이지 복원 경계를 차단하고 네트워크·저장·계정 원본을 사용하지 않는다', () => {
  const { elements: e, callbacks } = harness();
  let prevented = 0;
  e.passwordDeferralPreview.listeners.submit({ preventDefault() { prevented++; }, stopImmediatePropagation() { prevented++; } });
  assert.equal(prevented, 2);
  callbacks.pagehide();
  assert.equal(e.selectedDate.value, '');
  const js = fs.readFileSync(path.join(base, 'preview.js'), 'utf8');
  const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|localStorage|sessionStorage|\.cookie|postMessage|setInterval/);
  assert.doesNotMatch(html, /auth-account-enhancements\.js|login-recovery-ui\.js|type="submit"/);
  assert.match(html, /MobileSecurityPreview|security-preview\.js/);
  assert.match(html, /MHMIQ-AUTH-003-T01/);
  assert.match(html, /180일/);
});
