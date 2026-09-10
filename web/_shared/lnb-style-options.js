(function () {
  'use strict';

  var COPY = {
    anlz: {
      ko: { title: '운행이력', items: ['요약정보', '사용시간', '운영효율'] },
      en: { title: 'Operation History', items: ['Vehicle Summary', 'Usage Time', 'Operational Efficiency'] }
    },
    srvc: {
      ko: { title: '서비스', items: ['전체', '수리이력', '소모품관리', '차량 에러'] },
      en: { title: 'Service', items: ['All', 'Maintenance', 'Consumables', 'Vehicle Errors'] }
    },
    rpt: {
      ko: { title: '리포트', items: ['업체별 현황', '업체별 비교', '업체별 히트맵'] },
      en: { title: 'Reports', items: ['Company Status', 'Company Comparison', 'Company Heatmap'] }
    },
    mgmt: {
      ko: { title: '관리기능', items: ['사용자', '업체', '그룹', '차량'] },
      en: { title: 'Administration', items: ['Users', 'Companies', 'Groups', 'Vehicles'] }
    }
  };
  var params = new URLSearchParams(window.location.search);
  var currentLanguage = params.get('lnbLang') === 'en' ? 'en' : 'ko';
  var requestedVariant = params.get('lnbVariant');
  var allowedVariants = ['current-standard', 'compact-rail', 'segment-card'];
  var bodyVariant = document.body.getAttribute('data-lnb-variant');
  if (allowedVariants.indexOf(requestedVariant) > -1) {
    document.body.setAttribute('data-lnb-variant', requestedVariant);
  } else if (allowedVariants.indexOf(bodyVariant) === -1) {
    return;
  }

  function applyLanguage() {
    var side = document.querySelector('.layout > aside.lnb');
    var config = COPY[document.body.getAttribute('data-gnb')];
    if (!side || !config) return;
    var copy = config[currentLanguage];
    document.body.setAttribute('data-lnb-language', currentLanguage);

    var title = side.querySelector('.miq-side-title');
    if (title && title.textContent !== copy.title) title.textContent = copy.title;
    Array.prototype.forEach.call(side.querySelectorAll('.miq-side-item'), function (item, index) {
      var label = item.querySelector('span:first-child');
      if (label && copy.items[index] && label.textContent !== copy.items[index]) label.textContent = copy.items[index];
    });

    var languageSelect = document.querySelector('.gnb__language select');
    if (languageSelect && languageSelect.value !== currentLanguage) languageSelect.value = currentLanguage;
  }

  function syncAccessibility() {
    var layout = document.querySelector('.layout');
    var side = layout && layout.querySelector('aside.lnb');
    var toggle = layout && layout.querySelector('.miq-side-toggle');
    if (!side || !toggle) return;

    Array.prototype.forEach.call(side.querySelectorAll('.miq-side-item'), function (item) {
      if (item.classList.contains('active')) item.setAttribute('aria-current', 'page');
      else item.removeAttribute('aria-current');
    });
    toggle.setAttribute('aria-expanded', layout.classList.contains('miq-side-collapsed') ? 'false' : 'true');
  }

  function refresh() {
    applyLanguage();
    syncAccessibility();
  }

  document.addEventListener('DOMContentLoaded', function () {
    window.requestAnimationFrame(refresh);
    var side = document.querySelector('.layout > aside.lnb');
    if (side) {
      new MutationObserver(function () { window.requestAnimationFrame(refresh); })
        .observe(side, { childList: true, subtree: true });
    }
    document.addEventListener('change', function (event) {
      if (!event.target.matches('.gnb__language select')) return;
      currentLanguage = event.target.value === 'en' ? 'en' : 'ko';
      var url = new URL(window.location.href);
      if (currentLanguage === 'en') url.searchParams.set('lnbLang', 'en');
      else url.searchParams.delete('lnbLang');
      history.replaceState(null, '', url.href);
      refresh();
    });
    document.addEventListener('click', function (event) {
      if (event.target.closest('.miq-side-toggle')) window.requestAnimationFrame(refresh);
    });
  });
  window.addEventListener('load', function () {
    window.setTimeout(refresh, 0);
  });
})();
