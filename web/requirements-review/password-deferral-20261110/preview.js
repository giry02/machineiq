(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory;
  else factory(root.document, root.MobileSecurityPreview.reminderDate, root.location.search);
})(globalThis, function bindPasswordDeferralPreview(document, reminderDate, search) {
  'use strict';
  const one = (id) => document.getElementById(id);
  const account = one('previewAccount');
  const selected = one('selectedDate');
  const status = one('deferralStatus');
  const defer = one('deferPreview');
  const policy = one('deferralPolicy');
  const originalPolicy = policy.textContent;
  const option = new URLSearchParams(search).get('account');
  account.value = option === 'admin' ? 'admin' : 'user';
  selected.value = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  function clearResult() {
    status.textContent = '';
    status.hidden = true;
  }
  function renderAccount() {
    const internal = account.value !== 'user';
    one('selectedDateField').hidden = internal;
    one('deferAction').hidden = internal;
    defer.disabled = internal;
    policy.textContent = internal
      ? '내부 관리자와 SERVICE는 90일마다 필수 변경하며 다음에 변경을 제공하지 않습니다.'
      : originalPolicy;
    clearResult();
  }
  one('passwordDeferralPreview').addEventListener('submit', function (event) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);
  account.addEventListener('change', renderAccount);
  selected.addEventListener('input', clearResult);
  selected.addEventListener('change', clearResult);
  defer.addEventListener('click', function () {
    if (account.value !== 'user') return;
    const next = reminderDate(selected.value);
    status.hidden = false;
    if (!next || !/^\d{4}-\d{2}-\d{2}$/.test(next)) {
      status.textContent = '올바른 미루기 선택일을 입력해 주세요.';
      return;
    }
    status.textContent = '선택일 ' + selected.value + ' · 다음 안내 ' + next + ' (90일 후). 화면 시안이며 서버 일정은 변경하지 않습니다.';
  });
  document.defaultView?.addEventListener('pagehide', function () {
    selected.value = '';
    clearResult();
  });
  renderAccount();
});
