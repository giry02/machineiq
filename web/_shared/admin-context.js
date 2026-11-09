/* WEB-only Admin portal policy. The canonical account role stays internal.
   Query parameters simulate preview routing; server authorization is separate. */
(function (root, factory) {
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIQAdminContext = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  var landing = 'Admin/customer-management.html';
  var menuKeys = ['admaccess', 'admstatus', 'ops'];
  var definitions = [
    { key: 'admaccess', label: '권한관리', dir: 'Admin', subs: [
      { key: 'customers', label: '고객정보관리', tobe: 'customer-management.html' },
      { key: 'dealers', label: '딜러정보관리', tobe: 'dealer-management.html' }
    ] },
    { key: 'admstatus', label: '현황관리', dir: 'Admin', subs: [
      { key: 'status', label: '기존 현황 화면', pending: true, disabled: true },
      { key: 'interfaces', label: '인터페이스 이력 조회', tobe: 'interfaces.html' },
      { key: 'alerts', label: '얼럿 조회', tobe: 'alerts.html' }
    ] },
    { key: 'ops', label: '운영관리', dir: 'Operations', subs: [
      { key: 'data', label: '차량 데이터 관리', tobe: 'operations-data.html' },
      { key: 'equipment', label: '장비 코드 관리', tobe: 'operations-equipment.html' },
      { key: 'codes', label: '공통 코드 관리', tobe: 'operations-codes.html' },
      { key: 'languages', label: '다국어 관리', tobe: 'operations-languages.html' },
      { key: 'notices', label: '공지사항 관리', tobe: 'operations-notices.html' },
      { key: 'accounts', label: '내부 계정 관리', tobe: 'operations-accounts.html' },
      { key: 'menus', label: '메뉴/접근권한 관리', tobe: 'operations-menus.html' },
      { key: 'history', label: '메뉴 접속 이력', tobe: 'operations-history.html' }
    ] }
  ];
  function query(search) {
    return new URLSearchParams(search == null ? (root.location ? root.location.search : '') : search);
  }
  function isActive(role, portal) { return role === 'internal' && portal === 'admin'; }
  function active(search) {
    var params = query(search);
    return isActive(params.get('role'), params.get('portal'));
  }
  function href(path, base, search) {
    var url = new URL(path, base || root.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('role', 'internal');
    url.searchParams.set('portal', 'admin');
    var language = query(search).get('lang');
    if (language) url.searchParams.set('lang', language);
    return url.href;
  }
  return {
    label: '어드민', landing: landing, active: active, isActive: isActive, href: href,
    isMenuKey: function (key) { return menuKeys.indexOf(key) !== -1; },
    menus: function () { return JSON.parse(JSON.stringify(definitions)); }
  };
}));
