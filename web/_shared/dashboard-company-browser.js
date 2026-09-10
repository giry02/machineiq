(function () {
  'use strict';
  var view = window.MIQDashboardCompanyView, model = window.MIQDashboardCompanies;
  if (!view || !model || ['internal', 'dealer_owner', 'dealer_staff'].indexOf(view.role) < 0) return;
  var host = document.getElementById('dashboardContent');
  var state = { companyId: '', pages: { live: 1, period: 1 } };
  var pendingCompanyId = '', candidates = [], activeCandidate = -1;
  var companies = view.companies, filtered = [], tables = [];
  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function field(label, control) {
    var node = element('label', 'dashboard-company-field');
    node.appendChild(element('span', '', label)); node.appendChild(control); return node;
  }
  var form = element('form', 'dashboard-company-filters');
  form.setAttribute('role', 'search'); form.setAttribute('aria-label', '대시보드 업체 검색');
  var query = element('input'); query.type = 'text'; query.placeholder = '업체명 2글자 이상 입력'; query.autocomplete = 'off'; query.setAttribute('aria-label', '업체명 검색');
  query.setAttribute('role', 'combobox'); query.setAttribute('aria-autocomplete', 'list'); query.setAttribute('aria-expanded', 'false');
  query.setAttribute('aria-controls', 'dashboardCompanySuggestions');
  var inputBox = element('div', 'dashboard-company-input'); inputBox.appendChild(query);
  var suggestions = element('div', 'dashboard-company-suggestions'); suggestions.id = 'dashboardCompanySuggestions';
  suggestions.setAttribute('role', 'listbox'); suggestions.setAttribute('aria-label', '업체 검색 후보'); suggestions.hidden = true; inputBox.appendChild(suggestions);
  form.appendChild(field('업체', inputBox));
  var search = element('button', 'dashboard-company-search', '검색'); search.type = 'submit'; form.appendChild(search);
  var reset = element('button', '', '초기화'); reset.type = 'button'; form.appendChild(reset);
  var tabs = host.querySelector('.dashboard-view-tabs'), heading = element('div', 'dashboard-company-heading');
  tabs.parentNode.insertBefore(heading, tabs); heading.appendChild(tabs); heading.appendChild(form);
  var scope = element('span', 'dashboard-company-scope'); scope.setAttribute('role', 'status'); scope.setAttribute('aria-live', 'polite'); form.appendChild(scope);
  host.querySelectorAll('.group-matrix, .performance-table').forEach(function (table) {
    var body = table.tBodies[0], rows = new Map();
    Array.prototype.forEach.call(body.rows, function (row) { rows.set(row.dataset.companyId, row); });
    var wrap = element('div', 'dashboard-company-table');
    table.parentNode.insertBefore(wrap, table); wrap.appendChild(table);
    table.closest('.dashboard-panel').classList.add('dashboard-company-panel');
    var footer = element('div', 'dashboard-company-footer'), count = element('span', 'dashboard-company-count');
    footer.appendChild(count);
    var pager = element('nav', 'dashboard-company-pager'); pager.setAttribute('aria-label', table.getAttribute('aria-label') + ' 페이지'); footer.appendChild(pager);
    wrap.insertAdjacentElement('afterend', footer);
    var pageGroup = table.classList.contains('group-matrix') ? 'live' : 'period';
    tables.push({ table: table, body: body, rows: rows, wrap: wrap, count: count, pager: pager, pageGroup: pageGroup, pageSize: pageGroup === 'live' ? 15 : 10 });
  });
  function pageButton(table, text, page, disabled, active) {
    var button = element('button', active ? 'on' : '', text); button.type = 'button'; button.disabled = disabled;
    button.setAttribute('aria-label', /^\d+$/.test(text) ? text + '페이지' : text + ' 페이지');
    if (active) button.setAttribute('aria-current', 'page');
    button.addEventListener('click', function () {
      state.pages[table.pageGroup] = page; paint(false);
      table.pager.querySelector('[aria-current="page"]')?.focus({ preventScroll: true });
    });
    table.pager.appendChild(button);
  }
  function paint(updateScope) {
    filtered = model.select(companies, state);
    if (updateScope) {
      view.updateSummary(filtered);
      window.dispatchEvent(new CustomEvent('miq:dashboard-company-filter', { detail: { companyIds: filtered.map(function (company) { return company.companyId; }) } }));
    }
    var totals = model.totals(filtered);
    scope.textContent = '조회 업체 ' + filtered.length.toLocaleString('ko-KR') + '개 · 차량 ' + totals.vehicleCount.toLocaleString('ko-KR') + '대 · 전체 조회 결과 기준';
    tables.forEach(function (table) {
      var page = model.pages(filtered, state.pages[table.pageGroup], table.pageSize); state.pages[table.pageGroup] = page.page;
      table.body.replaceChildren();
      page.rows.forEach(function (company) { var row = table.rows.get(company.companyId); if (row) table.body.appendChild(row); });
      if (!page.total) {
        var row = element('tr'), cell = element('td', 'dashboard-company-empty', '조회 조건에 맞는 업체가 없습니다.');
        cell.colSpan = table.table.classList.contains('group-matrix') ? 10 : table.table.classList.contains('efficiency-table') ? 6 : 5;
        row.appendChild(cell); table.body.appendChild(row);
      }
      table.count.textContent = page.from + '–' + page.to + ' / ' + page.total + '개 업체 · ' + table.pageSize + '개씩 표시';
      table.pager.replaceChildren();
      pageButton(table, '이전', Math.max(1, page.page - 1), page.page <= 1, false);
      var start = Math.max(1, Math.min(page.page - 2, page.pageCount - 4));
      for (var n = start; n <= Math.min(page.pageCount, start + 4); n++) pageButton(table, String(n), n, false, n === page.page);
      pageButton(table, '다음', page.page + 1, page.page >= page.pageCount, false);
    });
  }
  function closeSuggestions() {
    suggestions.hidden = true; query.setAttribute('aria-expanded', 'false'); query.removeAttribute('aria-activedescendant'); activeCandidate = -1;
  }
  function syncSearchButton() { search.disabled = !!query.value.trim() && !pendingCompanyId; }
  function choose(company) {
    pendingCompanyId = company.companyId; query.value = company.companyName; closeSuggestions(); syncSearchButton(); query.focus();
  }
  function highlight(index) {
    activeCandidate = index;
    Array.prototype.forEach.call(suggestions.querySelectorAll('[role="option"]'), function (option, i) {
      option.setAttribute('aria-selected', String(i === index));
      if (i === index) { query.setAttribute('aria-activedescendant', option.id); option.scrollIntoView({ block: 'nearest' }); }
    });
  }
  function showSuggestions() {
    candidates = model.suggest(companies, query.value); activeCandidate = -1; suggestions.replaceChildren();
    query.removeAttribute('aria-activedescendant');
    if (Array.from(query.value.trim().replace(/\s/g, '')).length < 2) { closeSuggestions(); return; }
    candidates.forEach(function (company, index) {
      var option = element('button', 'dashboard-company-option', company.companyName); option.type = 'button'; option.tabIndex = -1;
      option.id = 'dashboardCompanyOption' + index; option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false');
      option.addEventListener('mousedown', function (event) { event.preventDefault(); });
      option.addEventListener('click', function () { choose(company); }); suggestions.appendChild(option);
    });
    if (!candidates.length) suggestions.appendChild(element('div', 'dashboard-company-no-match', '일치하는 업체가 없습니다.'));
    suggestions.hidden = false; query.setAttribute('aria-expanded', 'true');
  }
  query.addEventListener('input', function () { pendingCompanyId = ''; syncSearchButton(); showSuggestions(); });
  query.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') { closeSuggestions(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); if (suggestions.hidden) showSuggestions();
      if (candidates.length) highlight(event.key === 'ArrowDown' ? (activeCandidate + 1) % candidates.length : activeCandidate < 0 ? candidates.length - 1 : (activeCandidate - 1 + candidates.length) % candidates.length);
    } else if (event.key === 'Enter' && !suggestions.hidden) {
      event.preventDefault(); if (activeCandidate >= 0) choose(candidates[activeCandidate]);
    }
  });
  document.addEventListener('click', function (event) { if (!inputBox.contains(event.target)) closeSuggestions(); });
  form.addEventListener('focusout', function (event) { if (!inputBox.contains(event.relatedTarget)) closeSuggestions(); });
  function apply() {
    if (query.value.trim() && !pendingCompanyId) { showSuggestions(); return; }
    state.companyId = query.value.trim() ? pendingCompanyId : ''; state.pages.live = 1; state.pages.period = 1; closeSuggestions(); paint(true);
  }
  form.addEventListener('submit', function (event) { event.preventDefault(); apply(); });
  reset.addEventListener('click', function () { query.value = ''; pendingCompanyId = ''; syncSearchButton(); apply(); });
  paint(true);
})();
