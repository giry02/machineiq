/* LIN-Q account request, vehicle request and geofence interaction layer. */
(function () {
  'use strict';

  var body = document.body;
  var page = body.getAttribute('data-sub') || '';
  if (['acctreq', 'equipreq', 'geofence'].indexOf(page) < 0) return;

  var query = new URLSearchParams(window.location.search);
  var lastModalTrigger = null;
  var companyNames = {
    all: '전체 업체',
    '1933': '(주)세종물류중부지점',
    '20119': '김현종',
    '15857': '두산지게차 경남중부영업소',
    '33767': '두산지게차 경남중부판매 주식회사'
  };

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function norm(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function nowText() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
  function setUrl(values, remove) {
    var url = new URL(window.location.href);
    Object.keys(values || {}).forEach(function (key) {
      var value = values[key];
      if (value == null || value === '') url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    (remove || []).forEach(function (key) { url.searchParams.delete(key); });
    history.replaceState(null, '', url.href);
    query = url.searchParams;
  }
  function toast(message, tone) {
    var old = document.querySelector('.ms-toast');
    if (old) old.remove();
    var node = document.createElement('div');
    node.className = 'ms-toast' + (tone ? ' is-' + tone : '');
    node.setAttribute('role', 'status');
    node.setAttribute('aria-live', 'polite');
    node.textContent = message;
    document.body.appendChild(node);
    requestAnimationFrame(function () { node.classList.add('is-visible'); });
    window.setTimeout(function () {
      node.classList.remove('is-visible');
      window.setTimeout(function () { if (node.parentNode) node.remove(); }, 220);
    }, 2600);
  }
  function clearError(modal) {
    var error = modal && modal.querySelector('.ms-modal-error');
    if (error) error.remove();
  }
  function errorAfter(node, message) {
    var modal = node.closest('.modal');
    clearError(modal);
    var error = document.createElement('div');
    error.className = 'ms-modal-error';
    error.setAttribute('role', 'alert');
    error.textContent = message;
    node.insertAdjacentElement('afterend', error);
    if (node.focus) node.focus();
  }
  function openModal(id, trigger) {
    var dim = document.getElementById(id);
    if (!dim) return;
    lastModalTrigger = trigger || document.activeElement;
    dim.classList.add('open');
    window.setTimeout(function () {
      var focusable = dim.querySelector('input:not([readonly]):not([disabled]),select:not([disabled]),textarea:not([readonly]):not([disabled]),button:not([disabled])');
      if (focusable) focusable.focus();
    }, 0);
  }
  function closeModal(dim) {
    if (!dim) return;
    dim.classList.remove('open');
    clearError(dim);
    if (lastModalTrigger && lastModalTrigger.focus) lastModalTrigger.focus();
  }
  function makeModalsAccessible() {
    Array.prototype.forEach.call(document.querySelectorAll('.dim'), function (dim) {
      var modal = dim.querySelector('.modal');
      var title = dim.querySelector('.modal__title');
      if (!modal) return;
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.tabIndex = -1;
      if (title) {
        if (!title.id) title.id = dim.id + 'Title';
        modal.setAttribute('aria-labelledby', title.id);
      }
    });
    document.addEventListener('click', function (event) {
      if (event.target.closest('[data-modal-close]')) {
        var dim = event.target.closest('.dim');
        window.setTimeout(function () { if (dim && !dim.classList.contains('open')) closeModal(dim); }, 0);
      }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var dim = document.querySelector('.dim.open');
      if (!dim) return;
      var nodes = Array.prototype.filter.call(dim.querySelectorAll('button,input,select,textarea,[tabindex]'), function (node) {
        return !node.disabled && node.tabIndex !== -1 && node.offsetParent !== null;
      });
      if (!nodes.length) return;
      var first = nodes[0], last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
  }
  function addEmpty(tbody, colspan, message) {
    var old = tbody.querySelector('.ms-empty');
    if (old) old.remove();
    var row = document.createElement('tr');
    row.className = 'ms-empty';
    row.innerHTML = '<td colspan="' + colspan + '">' + esc(message) + '</td>';
    tbody.appendChild(row);
  }
  function clearEmpty(tbody) {
    var old = tbody.querySelector('.ms-empty');
    if (old) old.remove();
  }
  function selectedText(select) { return select.options[select.selectedIndex] ? select.options[select.selectedIndex].textContent.trim() : ''; }
  function setOptionByPrefix(select, value) {
    if (!select || !value) return;
    Array.prototype.some.call(select.options, function (option) {
      if (norm(option.value) === norm(value) || norm(option.textContent).indexOf(norm(value)) === 0) { option.selected = true; return true; }
      return false;
    });
  }
  function setStatValue(container, index, value, unit) {
    var cells = container ? container.querySelectorAll('.stat-cells .cell') : [];
    if (!cells[index]) return;
    var target = cells[index].querySelector('.cell__v');
    if (target) target.innerHTML = esc(value) + '<small>' + esc(unit || '건') + '</small>';
  }
  function setBadge(cell, code) {
    var map = {
      REQ: ['warn', 'REQ 신청'], APRV: ['ok', 'APRV 승인'], RJCT: ['bad', 'RJCT 반려']
    };
    var data = map[code] || ['gray', code];
    cell.innerHTML = '<span class="badge ' + data[0] + '">' + data[1] + '</span>';
  }
  function statusCode(text) {
    text = String(text || '').toUpperCase();
    if (text.indexOf('APRV') > -1 || text.indexOf('승인') > -1) return 'APRV';
    if (text.indexOf('RJCT') > -1 || text.indexOf('반려') > -1) return 'RJCT';
    return 'REQ';
  }
  function addContextBadge(filterBar) {
    if (!filterBar || filterBar.querySelector('.ms-context')) return;
    var id = query.get('companyId') || '1933';
    var badge = document.createElement('span');
    badge.className = 'ms-context';
    badge.setAttribute('data-ms-company-context', '');
    badge.innerHTML = '조회 범위 <strong>' + esc(companyNames[id] || '선택 업체') + '</strong>';
    var grow = filterBar.querySelector('.grow');
    if (grow) grow.insertAdjacentElement('afterend', badge);
    else filterBar.appendChild(badge);
  }
  function refreshContextBadge(companyId, label) {
    var badge = document.querySelector('[data-ms-company-context] strong');
    if (badge) badge.textContent = label || companyNames[companyId] || '선택 업체';
  }
  function exportRows(filename, table, onlyVisible) {
    if (!table) return;
    var lines = [];
    Array.prototype.forEach.call(table.querySelectorAll('tr'), function (row) {
      if (onlyVisible && row.classList.contains('ms-filter-hidden')) return;
      if (row.classList.contains('ms-empty')) return;
      var cells = Array.prototype.slice.call(row.children).map(function (cell) {
        return '"' + cell.textContent.replace(/\s+/g, ' ').trim().replace(/"/g, '""') + '"';
      });
      if (cells.length) lines.push(cells.join(','));
    });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(link.href); }, 0);
    toast('현재 조회 결과를 CSV로 내보냈습니다.', 'success');
  }

  /* ───────────────────────── Account request */
  function initAccountRequest() {
    var filterBar = document.querySelector('.filter-bar');
    var search = filterBar.querySelector('input.inp');
    var selects = filterBar.querySelectorAll('select.inp');
    var statusFilter = selects[0], roleFilter = selects[1];
    var searchButton = filterBar.querySelector('.btn-search');
    var exportButton = filterBar.querySelector('.btn:not(.btn-search)');
    var allBody = document.querySelector('#tabAll tbody');
    var waitBody = document.querySelector('#tabWait tbody');
    var modal = document.getElementById('procModal');
    var selectedEmail = '';

    search.id = 'accountRequestSearch';
    search.setAttribute('aria-label', '사용자명, 이메일 또는 업체명 검색');
    statusFilter.id = 'accountRequestStatus';
    statusFilter.setAttribute('aria-label', '처리 상태');
    roleFilter.id = 'accountRequestRole';
    roleFilter.setAttribute('aria-label', '신청 권한');
    Array.prototype.forEach.call(statusFilter.options, function (option, index) { option.value = index === 0 ? '' : ['REQ', 'APRV', 'RJCT'][index - 1]; });
    Array.prototype.forEach.call(roleFilter.options, function (option, index) { option.value = index === 0 ? '' : option.textContent.trim(); });
    setOptionByPrefix(statusFilter, query.get('status'));
    setOptionByPrefix(roleFilter, query.get('role'));
    if (query.get('q')) search.value = query.get('q');
    addContextBadge(filterBar);

    function rows(tbody) { return Array.prototype.slice.call(tbody.querySelectorAll('tr:not(.ms-empty)')); }
    function record(row) {
      var cells = row.children;
      return { row:row, email:cells[0].textContent.trim(), name:cells[1].textContent.trim(), role:cells[2].textContent.trim(), company:cells[3].textContent.trim(), registered:cells[4].textContent.trim(), processed:cells[5].textContent.trim(), status:statusCode(cells[6].textContent), processor:cells[7].textContent.trim() };
    }
    function decorate() {
      rows(allBody).concat(rows(waitBody)).forEach(function (row) {
        var data = record(row);
        row.dataset.accountId = data.email;
        row.dataset.status = data.status;
        if (!row.children[0].querySelector('.ms-cell-action')) {
          var button = document.createElement('button');
          button.type = 'button'; button.className = 'ms-cell-action'; button.textContent = data.email;
          button.setAttribute('aria-label', data.name + ' 계정 신청 상세');
          row.children[0].textContent = ''; row.children[0].appendChild(button);
        }
      });
    }
    function uniqueAll() { return rows(allBody).map(record); }
    function match(data, waitOnly) {
      var keyword = norm(search.value);
      var explicitCompany = query.get('company') || '';
      return (!keyword || norm(data.email + ' ' + data.name + ' ' + data.role + ' ' + data.company).indexOf(keyword) > -1) &&
        (!statusFilter.value || data.status === statusFilter.value) && (!roleFilter.value || data.role === roleFilter.value) &&
        (!explicitCompany || data.company === explicitCompany) && (!waitOnly || data.status === 'REQ');
    }
    function applyFilters() {
      decorate(); clearEmpty(allBody); clearEmpty(waitBody);
      var shownAll = 0, shownWait = 0;
      rows(allBody).forEach(function (row) { var show = match(record(row), false); row.classList.toggle('ms-filter-hidden', !show); if (show) shownAll++; });
      rows(waitBody).forEach(function (row) { var show = match(record(row), true); row.classList.toggle('ms-filter-hidden', !show); if (show) shownWait++; });
      if (!shownAll) addEmpty(allBody, 9, '조회 조건에 해당하는 계정 신청이 없습니다.');
      if (!shownWait) addEmpty(waitBody, 9, '조회 조건에 해당하는 대기 신청이 없습니다.');
      var allCount = document.querySelector('#tabAll .list-head__count');
      var waitCount = document.querySelector('#tabWait .list-head__count');
      if (allCount) allCount.innerHTML = '조회 결과 <b>' + shownAll + '</b>건';
      if (waitCount) waitCount.innerHTML = '대기 (REQ) <b>' + shownWait + '</b>건';
      setUrl({ q:search.value.trim() || null, status:statusFilter.value || null, role:roleFilter.value || null });
    }
    function updateSummary() {
      var data = uniqueAll();
      var req = data.filter(function (x) { return x.status === 'REQ'; }).length;
      var aprv = data.filter(function (x) { return x.status === 'APRV'; }).length;
      var rjct = data.filter(function (x) { return x.status === 'RJCT'; }).length;
      var box = document.querySelector('.box.total');
      setStatValue(box, 0, req); setStatValue(box, 1, aprv); setStatValue(box, 2, rjct); setStatValue(box, 3, data.length);
      var activeCount = document.querySelector('.lnb__item.active .cnt'); if (activeCount) activeCount.textContent = req;
      var tabButtons = document.querySelectorAll('.tabs button[data-tab]');
      if (tabButtons[0]) tabButtons[0].textContent = '전체 신청 (' + data.length + ')';
      if (tabButtons[1]) tabButtons[1].textContent = '대기 처리 (' + req + ')';
      var waitText = document.querySelector('.box.total .wait'); if (waitText) waitText.textContent = '● 대기 ' + req + '건';
    }
    var modalGrids = modal.querySelectorAll('.form-grid');
    var modalInputs = modalGrids[0].querySelectorAll('input');
    var processGrid = modalGrids[1];
    var processSelects = processGrid.querySelectorAll('select');
    var decision = processSelects[0], group = processSelects[1], reason = processGrid.querySelector('textarea');
    var footer = modal.querySelectorAll('.modal__foot .btn');
    var rejectButton = footer[1], approveButton = footer[2];
    rejectButton.removeAttribute('data-modal-close'); approveButton.removeAttribute('data-modal-close');
    rejectButton.dataset.msAccountAction = 'RJCT'; approveButton.dataset.msAccountAction = 'APRV';
    function syncDecision() {
      var reject = statusCode(decision.value) === 'RJCT';
      group.disabled = reject; group.closest('.fld').classList.toggle('ms-field-disabled', reject);
      reason.required = reject;
    }
    decision.addEventListener('change', syncDecision);
    function openDetail(row, trigger) {
      var data = record(row); selectedEmail = data.email; clearError(modal);
      modal.querySelector('.modal__title').textContent = (data.status === 'REQ' ? '계정 신청 처리' : '계정 신청 상세') + ' — ' + data.name + ' (' + data.email + ')';
      [data.email, data.name, data.role, data.company].forEach(function (value, index) { if (modalInputs[index]) modalInputs[index].value = value; });
      setOptionByPrefix(decision, data.status === 'RJCT' ? '반려' : '승인');
      reason.value = row.dataset.reason || '';
      var canProcess = data.status === 'REQ';
      decision.disabled = !canProcess; group.disabled = !canProcess; reason.disabled = !canProcess;
      rejectButton.disabled = !canProcess; approveButton.disabled = !canProcess;
      syncDecision();
      if (!canProcess) { group.disabled = true; reason.disabled = true; }
      setUrl({ account:data.email, action:canProcess ? 'process' : 'detail' });
      openModal('procModal', trigger);
    }
    function updateRecord(code) {
      if (!selectedEmail) return;
      if (code === 'RJCT' && !reason.value.trim()) { errorAfter(reason, '반려 사유를 입력해 주세요.'); return; }
      var label = code === 'APRV' ? '승인' : '반려';
      if (!window.confirm(selectedEmail + ' 신청을 ' + label + ' 처리하시겠습니까?')) return;
      rows(allBody).concat(rows(waitBody)).forEach(function (row) {
        if (row.dataset.accountId !== selectedEmail) return;
        row.dataset.status = code; row.dataset.reason = reason.value.trim();
        row.children[5].textContent = nowText(); setBadge(row.children[6], code); row.children[7].textContent = 'admin@sejong.co.kr';
        var button = row.children[8].querySelector('button');
        if (button) { button.disabled = true; button.classList.remove('btn--pri'); button.textContent = '처리완료'; }
        row.classList.add('ms-just-updated'); window.setTimeout(function () { row.classList.remove('ms-just-updated'); }, 1400);
      });
      closeModal(modal); setUrl({}, ['account', 'action']); updateSummary(); applyFilters();
      toast(selectedEmail + ' 신청을 ' + label + ' 처리했습니다.', code === 'APRV' ? 'success' : 'danger');
    }
    modal.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ms-account-action]');
      if (!button) return;
      decision.value = button.dataset.msAccountAction === 'APRV' ? decision.options[0].value : decision.options[1].value;
      syncDecision(); updateRecord(button.dataset.msAccountAction);
    });
    document.addEventListener('click', function (event) {
      var detail = event.target.closest('.ms-cell-action');
      if (detail && detail.closest('#tabAll, #tabWait')) { event.preventDefault(); openDetail(detail.closest('tr'), detail); return; }
      var process = event.target.closest('[data-modal-open="procModal"]');
      if (process && process.closest('#tabAll, #tabWait')) openDetail(process.closest('tr'), process);
    });
    searchButton.addEventListener('click', applyFilters); search.addEventListener('input', applyFilters);
    search.addEventListener('keydown', function (event) { if (event.key === 'Enter') applyFilters(); });
    statusFilter.addEventListener('change', applyFilters); roleFilter.addEventListener('change', applyFilters);
    if (exportButton) exportButton.addEventListener('click', function () { exportRows('account-requests.csv', document.querySelector('#tabAll table'), true); });
    document.addEventListener('miq:target-change', function (event) {
      var detail = event.detail || {}; refreshContextBadge(detail.companyId, companyNames[detail.companyId]);
      setUrl({ companyId:detail.companyId || null });
    });
    decorate(); updateSummary(); applyFilters();
    var deep = query.get('account');
    if (deep) {
      var deepRow = Array.prototype.filter.call(rows(allBody), function (row) { return row.dataset.accountId === deep; })[0];
      if (deepRow) window.setTimeout(function () { openDetail(deepRow, deepRow.querySelector('.ms-cell-action')); }, 0);
    }
  }

  /* ───────────────────────── Vehicle request */
  function initVehicleRequest() {
    var filterBar = document.querySelector('.filter-bar');
    var search = filterBar.querySelector('input.inp');
    var statusFilter = filterBar.querySelector('select.inp');
    var searchButton = filterBar.querySelector('.btn-search');
    var allBody = document.querySelector('#tabAll tbody');
    var waitBody = document.querySelector('#tabWait tbody');
    var modal = document.getElementById('procModal');
    var bulkModal = document.getElementById('bulkModal');
    var selectedVin = '';

    search.id = 'vehicleRequestSearch'; search.setAttribute('aria-label', '차대번호, 단말기 ID 또는 업체명 검색');
    statusFilter.id = 'vehicleRequestStatus'; statusFilter.setAttribute('aria-label', '처리 상태');
    Array.prototype.forEach.call(statusFilter.options, function (option, index) { option.value = index === 0 ? '' : ['REQ', 'APRV', 'RJCT'][index - 1]; });
    setOptionByPrefix(statusFilter, query.get('status'));
    if (query.get('q')) search.value = query.get('q');
    addContextBadge(filterBar);

    function allRows() { return Array.prototype.slice.call(allBody.querySelectorAll('tr:not(.ms-empty)')); }
    function waitRows() { return Array.prototype.slice.call(waitBody.querySelectorAll('tr:not(.ms-empty)')); }
    function allRecord(row) {
      var c = row.children;
      return { row:row, vin:c[0].textContent.trim(), terminal:c[1].textContent.trim(), company:c[2].textContent.trim(), registrar:c[3].textContent.trim(), registered:c[4].textContent.trim(), processed:c[5].textContent.trim(), status:statusCode(c[6].textContent), processor:c[7].textContent.trim() };
    }
    function inferVehicle(vin) {
      var code = String(vin).split('_')[0];
      var n = (code.match(/\d+/) || ['25'])[0];
      if (/^FBD/.test(code)) return { model:'D' + n + 'S-9', type:'엔진' };
      if (/^FBH/.test(code)) return { model:'B' + n + 'S-7', type:'리튬' };
      return { model:'B' + n + 'S-7', type:n === '18' || n === '16' ? '납산' : '리튬' };
    }
    function detailUrl(vin) {
      var info = inferVehicle(vin), p = new URLSearchParams();
      p.set('veh', vin); p.set('model', info.model); p.set('type', info.type); p.set('group', '미배정'); p.set('from', 'vehicle-request');
      p.set('companyId', query.get('companyId') || '1933');
      return '../Vehicle%20Detail/vehicle-detail-tobe.html?' + p.toString();
    }
    function byVin(vin) {
      var row = Array.prototype.filter.call(allRows(), function (item) { return item.dataset.vin === vin || allRecord(item).vin === vin; })[0];
      return row ? allRecord(row) : null;
    }
    function decorate() {
      allRows().forEach(function (row) {
        var data = allRecord(row); row.dataset.vin = data.vin; row.dataset.status = data.status;
        var cell = row.children[0], link = cell.querySelector('a');
        if (!link) cell.innerHTML = '<a class="ms-vin-link" href="' + detailUrl(data.vin) + '">' + esc(data.vin) + '</a>';
        else link.href = detailUrl(data.vin);
      });
      waitRows().forEach(function (row) {
        var vin = row.children[2].textContent.trim(); row.dataset.vin = vin; row.dataset.status = row.dataset.status || 'REQ';
        var cell = row.children[2], link = cell.querySelector('a'); if (!link) cell.innerHTML = '<a class="ms-vin-link" href="' + detailUrl(vin) + '">' + esc(vin) + '</a>'; else link.href = detailUrl(vin);
      });
    }
    function matches(data, waitOnly) {
      var keyword = norm(search.value), explicitCompany = query.get('company') || '';
      return (!keyword || norm(data.vin + ' ' + data.terminal + ' ' + data.company + ' ' + data.registrar).indexOf(keyword) > -1) &&
        (!statusFilter.value || data.status === statusFilter.value) && (!explicitCompany || data.company === explicitCompany) && (!waitOnly || data.status === 'REQ');
    }
    function applyFilters() {
      decorate(); clearEmpty(allBody); clearEmpty(waitBody);
      var shownAll = 0, shownWait = 0;
      allRows().forEach(function (row) { var show = matches(allRecord(row), false); row.classList.toggle('ms-filter-hidden', !show); if (show) shownAll++; });
      waitRows().forEach(function (row) {
        var base = byVin(row.dataset.vin) || { vin:row.dataset.vin, terminal:row.children[3].textContent.trim(), company:'(주)세종물류중부지점', registrar:'', status:row.dataset.status };
        base.status = row.dataset.status; var show = matches(base, true); row.classList.toggle('ms-filter-hidden', !show); if (show) shownWait++;
      });
      if (!shownAll) addEmpty(allBody, 9, '조회 조건에 해당하는 차량 신청이 없습니다.');
      if (!shownWait) addEmpty(waitBody, 9, '조회 조건에 해당하는 대기 신청이 없습니다.');
      var a = document.querySelector('#tabAll .list-head__count'), w = document.querySelector('#tabWait .list-head__count');
      if (a) a.innerHTML = '조회 결과 <b>' + shownAll + '</b>건';
      if (w) w.innerHTML = '대기 (REQ) <b>' + shownWait + '</b>건';
      setUrl({ q:search.value.trim() || null, status:statusFilter.value || null });
      updateBulkState();
    }
    function updateSummary() {
      var data = allRows().map(allRecord);
      var req = data.filter(function (x) { return x.status === 'REQ'; }).length;
      var aprv = data.filter(function (x) { return x.status === 'APRV'; }).length;
      var rjct = data.filter(function (x) { return x.status === 'RJCT'; }).length;
      var box = document.querySelector('.box.total');
      setStatValue(box, 0, req); setStatValue(box, 1, aprv); setStatValue(box, 2, rjct); setStatValue(box, 3, data.length);
      var lnb = document.querySelector('.lnb__item.active .cnt'); if (lnb) lnb.textContent = req;
      var tabs = document.querySelectorAll('.tabs button[data-tab]'); if (tabs[0]) tabs[0].textContent = '전체 신청 (' + data.length + ')'; if (tabs[1]) tabs[1].textContent = '대기 처리 · 일괄 승인 (' + req + ')';
      var waiting = document.querySelector('.box.total .wait'); if (waiting) waiting.textContent = '● 대기 ' + req + '건';
    }
    var requestInputs = modal.querySelectorAll('#requestDetail [data-request-field]');
    var processGrid = modal.querySelectorAll('.form-grid')[1];
    var decision = processGrid.querySelectorAll('select')[0], group = processGrid.querySelectorAll('select')[1], reason = processGrid.querySelector('textarea');
    var footer = modal.querySelectorAll('.modal__foot .btn'), reject = footer[1], approve = footer[2];
    reject.removeAttribute('data-modal-close'); approve.removeAttribute('data-modal-close');
    reject.dataset.msVehicleAction = 'RJCT'; approve.dataset.msVehicleAction = 'APRV';
    function setRequestField(name, value) { var field = modal.querySelector('[data-request-field="' + name + '"]'); if (field) field.value = value; }
    function syncDecision() {
      var isReject = statusCode(decision.value) === 'RJCT';
      group.disabled = isReject; group.closest('.fld').classList.toggle('ms-field-disabled', isReject); reason.required = isReject;
    }
    decision.addEventListener('change', syncDecision);
    function openDetail(vin, trigger) {
      var data = byVin(vin); if (!data) return;
      selectedVin = data.vin; clearError(modal);
      modal.querySelector('.modal__title').textContent = (data.status === 'REQ' ? '차량 신청 처리' : '차량 신청 상세') + ' — ' + data.vin;
      setRequestField('vin', data.vin); setRequestField('terminal', data.terminal); setRequestField('company', data.company);
      setRequestField('registrar', data.registrar); setRequestField('registered', data.registered); setRequestField('status', data.status + (data.status === 'REQ' ? ' 신청' : data.status === 'APRV' ? ' 승인' : ' 반려'));
      setRequestField('processor', data.processor + ' / ' + data.processed);
      var previewVin = modal.querySelector('[data-preview="vin"]'), previewCompany = modal.querySelector('[data-preview="company"]');
      if (previewVin) previewVin.textContent = data.vin; if (previewCompany) previewCompany.textContent = data.company;
      setOptionByPrefix(decision, data.status === 'RJCT' ? '반려' : '승인'); reason.value = data.row.dataset.reason || '';
      var canProcess = data.status === 'REQ'; decision.disabled = !canProcess; group.disabled = !canProcess; reason.disabled = !canProcess; reject.disabled = !canProcess; approve.disabled = !canProcess;
      syncDecision(); if (!canProcess) { group.disabled = true; reason.disabled = true; }
      setUrl({ vin:data.vin, action:canProcess ? 'process' : 'detail' }); openModal('procModal', trigger);
    }
    function processVin(vin, code, reasonText, silent) {
      allRows().forEach(function (row) {
        if (row.dataset.vin !== vin) return;
        row.dataset.status = code; row.dataset.reason = reasonText || ''; row.children[5].textContent = nowText(); setBadge(row.children[6], code); row.children[7].textContent = 'internal01@mhmiq.co.kr';
        var button = row.children[8].querySelector('button'); if (button) { button.disabled = true; button.classList.remove('btn--pri'); button.textContent = '처리완료'; }
        row.classList.add('ms-just-updated'); window.setTimeout(function () { row.classList.remove('ms-just-updated'); }, 1400);
      });
      waitRows().forEach(function (row) {
        if (row.dataset.vin !== vin) return;
        row.dataset.status = code; var check = row.querySelector('input[type="checkbox"]'); if (check) { check.checked = false; check.disabled = true; }
        var button = row.querySelector('[data-modal-open="procModal"]'); if (button) { button.disabled = true; button.classList.remove('btn--pri'); button.textContent = '처리완료'; }
      });
      if (!silent) { updateSummary(); applyFilters(); }
    }
    function runDecision(code) {
      if (!selectedVin) return;
      if (code === 'RJCT' && !reason.value.trim()) { errorAfter(reason, '반려 사유를 입력해 주세요.'); return; }
      var label = code === 'APRV' ? '승인' : '반려'; if (!window.confirm(selectedVin + ' 신청을 ' + label + ' 처리하시겠습니까?')) return;
      processVin(selectedVin, code, reason.value.trim(), false); closeModal(modal); setUrl({}, ['vin', 'action']); toast(selectedVin + ' 신청을 ' + label + ' 처리했습니다.', code === 'APRV' ? 'success' : 'danger');
    }
    modal.addEventListener('click', function (event) {
      var button = event.target.closest('[data-ms-vehicle-action]'); if (!button) return;
      runDecision(button.dataset.msVehicleAction);
    });
    document.addEventListener('click', function (event) {
      var trigger = event.target.closest('[data-modal-open="procModal"]'); if (!trigger || !trigger.closest('#tabAll, #tabWait')) return;
      var row = trigger.closest('tr'); var vin = row.closest('#tabAll') ? row.dataset.vin : row.dataset.vin; openDetail(vin, trigger);
    });
    var headerCheck = waitBody.closest('table').querySelector('thead input[type="checkbox"]');
    function selectedWaitRows() { return waitRows().filter(function (row) { var check = row.querySelector('input[type="checkbox"]'); return row.dataset.status === 'REQ' && check && check.checked && !row.classList.contains('ms-filter-hidden'); }); }
    function updateBulkState() {
      var selected = selectedWaitRows();
      var buttons = document.querySelectorAll('#tabWait .tools .btn');
      Array.prototype.forEach.call(buttons, function (button) { button.disabled = !selected.length; });
      var count = document.querySelector('#tabWait .ms-bulk-count');
      if (!count) { count = document.createElement('span'); count.className = 'ms-bulk-count'; document.querySelector('#tabWait .tools').insertBefore(count, document.querySelector('#tabWait .tools').firstChild); }
      count.textContent = selected.length + '건 선택';
      if (headerCheck) {
        var available = waitRows().filter(function (row) { return row.dataset.status === 'REQ' && !row.classList.contains('ms-filter-hidden'); });
        headerCheck.checked = available.length > 0 && selected.length === available.length; headerCheck.indeterminate = selected.length > 0 && selected.length < available.length;
      }
    }
    waitBody.closest('table').addEventListener('change', function (event) {
      if (!event.target.matches('input[type="checkbox"]')) return;
      if (event.target === headerCheck) waitRows().forEach(function (row) { var check = row.querySelector('input'); if (check && !check.disabled && !row.classList.contains('ms-filter-hidden')) check.checked = headerCheck.checked; });
      updateBulkState();
    });
    var bulkOpen = document.querySelector('[data-modal-open="bulkModal"]');
    if (bulkOpen) bulkOpen.addEventListener('click', function () {
      var selected = selectedWaitRows(), tbody = bulkModal.querySelector('tbody');
      bulkModal.querySelector('.modal__title').textContent = '일괄 승인 — ' + selected.length + '건';
      tbody.innerHTML = selected.map(function (row) { return '<tr><td class="strong">' + esc(row.children[1].textContent.trim()) + '</td><td>' + esc(row.dataset.vin) + '</td><td>' + esc(row.children[4].textContent.trim()) + '</td><td class="c"><span class="badge ok">APRV</span></td></tr>'; }).join('');
      var approveButton = bulkModal.querySelector('.modal__foot .btn--pri'); approveButton.textContent = selected.length + '건 일괄 승인'; approveButton.disabled = !selected.length;
      openModal('bulkModal', bulkOpen);
    });
    var bulkApprove = bulkModal.querySelector('.modal__foot .btn--pri'); bulkApprove.removeAttribute('data-modal-close');
    bulkApprove.addEventListener('click', function () {
      var selected = selectedWaitRows(); if (!selected.length) return;
      if (!window.confirm(selected.length + '건의 차량 신청을 일괄 승인하시겠습니까?')) return;
      selected.forEach(function (row) { processVin(row.dataset.vin, 'APRV', '', true); });
      closeModal(bulkModal); updateSummary(); applyFilters(); toast(selected.length + '건을 일괄 승인했습니다.', 'success');
    });
    var waitTools = document.querySelectorAll('#tabWait .tools .btn');
    if (waitTools[0]) waitTools[0].addEventListener('click', function () {
      var selected = selectedWaitRows(); if (!selected.length) return;
      var why = window.prompt('선택한 ' + selected.length + '건의 반려 사유를 입력해 주세요.'); if (!why || !why.trim()) return;
      if (!window.confirm(selected.length + '건을 반려 처리하시겠습니까?')) return;
      selected.forEach(function (row) { processVin(row.dataset.vin, 'RJCT', why.trim(), true); });
      updateSummary(); applyFilters(); toast(selected.length + '건을 반려 처리했습니다.', 'danger');
    });
    var exportButton = document.querySelector('#tabAll .list-head .tools .btn');
    if (exportButton) exportButton.addEventListener('click', function () { exportRows('vehicle-requests.csv', document.querySelector('#tabAll table'), true); });
    searchButton.addEventListener('click', applyFilters); search.addEventListener('input', applyFilters); search.addEventListener('keydown', function (event) { if (event.key === 'Enter') applyFilters(); }); statusFilter.addEventListener('change', applyFilters);
    document.addEventListener('miq:target-change', function (event) {
      var detail = event.detail || {}; refreshContextBadge(detail.companyId, companyNames[detail.companyId]);
      if (detail.equipmentId) search.value = detail.equipmentId;
      setUrl({ companyId:detail.companyId || null }); applyFilters();
    });
    decorate(); updateSummary(); applyFilters();
    var deepVin = query.get('vin') || query.get('veh');
    if (deepVin) {
      var deepRow = Array.prototype.filter.call(allRows(), function (row) { return row.dataset.vin === deepVin; })[0];
      if (deepRow) { deepRow.classList.add('sel'); if (query.get('action')) window.setTimeout(function () { openDetail(deepVin, deepRow.querySelector('[data-modal-open="procModal"]')); }, 0); }
    }
  }

  /* ───────────────────────── Geofence */
  function initGeofence() {
    var filterBar = document.querySelector('.filter-bar');
    var groupFilter = filterBar.querySelectorAll('select.inp')[0];
    var typeFilter = filterBar.querySelectorAll('select.inp')[1];
    var search = filterBar.querySelector('input.inp');
    var searchButton = filterBar.querySelector('.btn-search');
    var addTop = filterBar.querySelector('[data-modal-open="zoneModal"]');
    var table = document.querySelector('#tabMap > .tbl-wrap table');
    var tbody = table.querySelector('tbody');
    var listBox = document.querySelector('.geo-layout aside .box');
    var zoneListAnchor = listBox.querySelector('.hr');
    var map = document.querySelector('.map-mock');
    var zoneModal = document.getElementById('zoneModal');
    var delModal = document.getElementById('delModal');
    var records = [], selected = null, editMode = 'add', zoom = 100;

    groupFilter.id = 'geofenceGroup'; groupFilter.setAttribute('aria-label', '그룹');
    typeFilter.id = 'geofenceType'; typeFilter.setAttribute('aria-label', '구역 유형');
    search.id = 'geofenceSearch'; search.setAttribute('aria-label', '구역명 또는 연결 장비 검색');
    Array.prototype.forEach.call(typeFilter.options, function (option, index) { option.value = index ? option.textContent.trim() : ''; });
    var statusFilter = document.createElement('select'); statusFilter.className = 'inp'; statusFilter.id = 'geofenceStatus'; statusFilter.style.width = '130px'; statusFilter.setAttribute('aria-label', '사용 상태');
    statusFilter.innerHTML = '<option value="">상태 전체</option><option value="active">사용</option><option value="paused">중지</option>';
    typeFilter.insertAdjacentElement('afterend', statusFilter);
    setOptionByPrefix(groupFilter, query.get('group')); setOptionByPrefix(typeFilter, query.get('type')); setOptionByPrefix(statusFilter, query.get('status')); if (query.get('q')) search.value = query.get('q');
    addContextBadge(filterBar);

    var headRow = table.querySelector('thead tr');
    var statusHead = document.createElement('th'); statusHead.className = 'c'; statusHead.textContent = '상태'; headRow.insertBefore(statusHead, headRow.lastElementChild);
    Array.prototype.forEach.call(tbody.rows, function (row) {
      var status = document.createElement('td'); status.className = 'c ms-status-cell'; status.innerHTML = '<span class="ms-zone-status">사용</span>'; row.insertBefore(status, row.lastElementChild);
      row.dataset.status = 'active'; row.classList.add('ms-zone-row'); row.tabIndex = 0;
    });
    var statusField = document.createElement('div'); statusField.className = 'v-field'; statusField.innerHTML = '<span class="v-field__k">사용 상태</span><span class="v-field__v" data-ms-zone-status-detail>사용</span>';
    listBox.querySelector('.v-row3').appendChild(statusField);
    var actionWrap = listBox.querySelector('.v-row3 + div'); actionWrap.className = 'ms-zone-actions';
    var toggleStatus = document.createElement('button'); toggleStatus.type = 'button'; toggleStatus.className = 'btn btn--sm'; toggleStatus.textContent = '사용 중지'; actionWrap.insertBefore(toggleStatus, actionWrap.lastElementChild);
    var zoomBadge = document.createElement('span'); zoomBadge.className = 'ms-map-zoom'; zoomBadge.textContent = '100%'; map.appendChild(zoomBadge);

    var wkts = [
      'POLYGON((14139021.6 4508776.2, 14139241.8 4508776.2, 14139241.8 4508612.4, 14139138.5 4508540.9, 14138990.3 4508601.7, 14139021.6 4508776.2))',
      'POINT(14139412.7 4508705.4)',
      'POLYGON((14139070.2 4508420.1, 14139220.4 4508420.1, 14139220.4 4508310.6, 14139070.2 4508310.6, 14139070.2 4508420.1))',
      'POINT(14139510.4 4508328.9)'
    ];
    function readRecords() {
      var rows = Array.prototype.slice.call(tbody.querySelectorAll('tr:not(.ms-empty)'));
      var items = Array.prototype.slice.call(listBox.querySelectorAll('.zone-item'));
      var shapes = Array.prototype.slice.call(map.querySelectorAll('.geo-zone'));
      records = rows.map(function (row, index) {
        var c = row.children, type = c[1].textContent.trim().toLowerCase();
        row.dataset.zoneId = row.dataset.zoneId || 'zone-' + (index + 1);
        return { id:row.dataset.zoneId, row:row, item:items[index], shape:shapes[index], name:c[0].textContent.trim(), type:type, size:c[2].textContent.trim(), group:c[3].textContent.trim(), vehicle:c[4].textContent.trim(), eventType:c[5].textContent.trim(), events:parseInt(c[6].textContent, 10) || 0, owner:c[7].textContent.trim(), date:c[8].textContent.trim(), status:row.dataset.status || 'active', wkt:row.dataset.wkt || wkts[index] || (type === 'circle' ? 'POINT(14139412.7 4508705.4)' : 'POLYGON((14139021.6 4508776.2, 14139241.8 4508776.2, 14139241.8 4508612.4, 14139021.6 4508776.2))') };
      });
      records.forEach(function (data) {
        if (data.item) { data.item.dataset.zoneId = data.id; data.item.tabIndex = 0; data.item.setAttribute('role', 'button'); data.item.setAttribute('aria-label', data.name + ' 구역 선택'); }
        if (data.shape) { data.shape.dataset.zoneId = data.id; data.shape.tabIndex = 0; data.shape.setAttribute('role', 'button'); data.shape.setAttribute('aria-label', data.name + ' 구역 선택'); }
        data.row.setAttribute('aria-label', data.name + ' 구역 선택');
      });
    }
    function statusLabel(data) { return data.status === 'active' ? '사용' : '중지'; }
    function syncStatusCell(data) { var span = data.row.querySelector('.ms-zone-status'); if (span) { span.textContent = statusLabel(data); span.classList.toggle('is-paused', data.status !== 'active'); } data.row.dataset.status = data.status; }
    function selectZone(data, updateUrl) {
      if (!data) return; selected = data;
      records.forEach(function (record) {
        record.row.classList.toggle('sel', record === data); if (record.item) record.item.classList.toggle('on', record === data); if (record.shape) record.shape.classList.toggle('ms-zone-selected', record === data);
        record.row.setAttribute('aria-selected', record === data ? 'true' : 'false');
      });
      var wkt = listBox.querySelector('.wkt'); if (wkt) wkt.textContent = data.wkt;
      var fields = listBox.querySelectorAll('.v-field__v');
      if (fields[0]) fields[0].textContent = data.vehicle; if (fields[1]) fields[1].textContent = data.eventType; if (fields[2]) fields[2].textContent = data.owner; if (fields[3]) fields[3].textContent = statusLabel(data);
      toggleStatus.textContent = data.status === 'active' ? '사용 중지' : '사용 재개';
      if (updateUrl !== false) setUrl({ zone:data.id });
    }
    function matches(data) {
      var group = selectedText(groupFilter).replace(/\s*\(.*/, '');
      var keyword = norm(search.value);
      return (!group || data.group === group) && (!typeFilter.value || data.type === typeFilter.value) && (!statusFilter.value || data.status === statusFilter.value) && (!keyword || norm(data.name + ' ' + data.vehicle).indexOf(keyword) > -1);
    }
    function updateSummary() {
      var active = records.filter(function (x) { return x.status === 'active'; });
      var polygons = active.filter(function (x) { return x.type === 'polygon'; }).length, circles = active.filter(function (x) { return x.type === 'circle'; }).length;
      var events = active.reduce(function (sum, x) { return sum + x.events; }, 0);
      var box = document.querySelector('.box.total'); setStatValue(box, 0, active.length, '개'); setStatValue(box, 1, polygons, '개'); setStatValue(box, 2, circles, '개'); setStatValue(box, 3, active.length, '대'); setStatValue(box, 4, events, '건');
      var count = document.querySelector('#tabMap .list-head__count'); if (count) count.innerHTML = '지오펜스 <b>' + active.length + '</b>건 <span style="color:#777">(사용 상태)</span>';
      var lnb = document.querySelector('.lnb__item.active .cnt'); if (lnb) lnb.textContent = active.length;
    }
    function applyFilters() {
      clearEmpty(tbody); var shown = 0, first = null;
      records.forEach(function (data) {
        var show = matches(data); data.row.classList.toggle('ms-filter-hidden', !show); if (data.item) data.item.classList.toggle('ms-filter-hidden', !show); if (data.shape) data.shape.classList.toggle('ms-filter-hidden', !show);
        if (show) { shown++; if (!first) first = data; }
      });
      if (!shown) addEmpty(tbody, 11, '조회 조건에 해당하는 지오펜스가 없습니다.');
      if (!selected || !matches(selected)) { if (first) selectZone(first, false); }
      var result = document.querySelector('[data-ms-geo-result]');
      if (!result) { result = document.createElement('div'); result.className = 'ms-result'; result.dataset.msGeoResult = ''; table.closest('.tbl-wrap').insertAdjacentElement('beforebegin', result); }
      result.innerHTML = '조회 결과 <strong>' + shown + '</strong>건 <span class="grow"></span>목록·지도·상세 선택 연동';
      setUrl({ group:selectedText(groupFilter).replace(/\s*\(.*/, '') || null, type:typeFilter.value || null, status:statusFilter.value || null, q:search.value.trim() || null });
    }
    function activateByElement(element) {
      var id = element && (element.dataset.zoneId || (element.closest('[data-zone-id]') && element.closest('[data-zone-id]').dataset.zoneId));
      var data = records.filter(function (x) { return x.id === id; })[0]; if (data) selectZone(data, true);
    }
    document.addEventListener('click', function (event) {
      var zoneTarget = event.target.closest('.ms-zone-row, .zone-item, .geo-zone');
      if (zoneTarget && !event.target.closest('button,a,input,select')) activateByElement(zoneTarget);
    });
    document.addEventListener('keydown', function (event) {
      var target = event.target.closest('.ms-zone-row, .zone-item, .geo-zone'); if (!target || (event.key !== 'Enter' && event.key !== ' ')) return;
      event.preventDefault(); activateByElement(target);
    });

    var modalFields = zoneModal.querySelector('.form-grid');
    var nameInput = modalFields.querySelectorAll('input.inp')[0], radiusInput = modalFields.querySelectorAll('input.inp')[1];
    var modalSelects = modalFields.querySelectorAll('select.inp'), modalGroup = modalSelects[0], modalType = modalSelects[1], equipment = modalSelects[2], eventType = modalSelects[3];
    var statusWrap = document.createElement('div'); statusWrap.className = 'fld'; statusWrap.innerHTML = '<span class="fld__k">사용 상태<span class="req">*</span></span><select class="inp" data-ms-zone-status><option value="active">사용</option><option value="paused">중지</option></select>';
    modalFields.insertBefore(statusWrap, modalFields.children[6]);
    var modalStatus = statusWrap.querySelector('select');
    var wktBlocks = modalFields.querySelectorAll('.wkt');
    Array.prototype.forEach.call(wktBlocks, function (block, index) {
      var textarea = document.createElement('textarea'); textarea.className = 'inp ms-wkt-input'; textarea.dataset.msWkt = index ? 'circle' : 'polygon'; textarea.value = block.textContent.replace(/\s+/g, ' ').trim(); block.replaceWith(textarea);
    });
    var polygonWkt = modalFields.querySelector('[data-ms-wkt="polygon"]'), circleWkt = modalFields.querySelector('[data-ms-wkt="circle"]');
    function syncTypeFields() {
      var isCircle = modalType.value.toLowerCase().indexOf('circle') > -1;
      radiusInput.disabled = !isCircle; radiusInput.closest('.fld').classList.toggle('ms-field-disabled', !isCircle);
      polygonWkt.disabled = isCircle; circleWkt.disabled = !isCircle;
      polygonWkt.closest('.fld').classList.toggle('ms-field-disabled', isCircle); circleWkt.closest('.fld').classList.toggle('ms-field-disabled', !isCircle);
    }
    modalType.addEventListener('change', syncTypeFields);
    function prepareZone(mode, data, trigger) {
      editMode = mode; selected = data || selected; clearError(zoneModal);
      zoneModal.querySelector('.modal__title').textContent = mode === 'add' ? '지오펜스 등록' : '지오펜스 수정 — ' + selected.name;
      nameInput.value = mode === 'add' ? '' : selected.name;
      setOptionByPrefix(modalGroup, mode === 'add' ? selectedText(groupFilter).replace(/\s*\(.*/, '') : selected.group);
      setOptionByPrefix(modalType, mode === 'add' ? 'polygon' : selected.type);
      radiusInput.value = mode === 'add' ? '' : (selected.size.match(/\d+/) || [''])[0];
      if (mode === 'add') { equipment.selectedIndex = 0; eventType.selectedIndex = 0; modalStatus.value = 'active'; polygonWkt.value = 'POLYGON((14139021.6 4508776.2, 14139241.8 4508776.2, 14139241.8 4508612.4, 14139021.6 4508776.2))'; circleWkt.value = 'POINT(14139412.7 4508705.4)'; }
      else {
        setOptionByPrefix(equipment, selected.vehicle.split(' ')[0]); setOptionByPrefix(eventType, selected.eventType.split(' ')[0]); modalStatus.value = selected.status;
        if (selected.type === 'circle') circleWkt.value = selected.wkt; else polygonWkt.value = selected.wkt;
      }
      syncTypeFields(); openModal('zoneModal', trigger);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-modal-open="zoneModal"]'), function (button) {
      button.addEventListener('click', function () {
        var row = button.closest('.ms-zone-row');
        if (row) activateByElement(row);
        prepareZone(button.textContent.indexOf('등록') > -1 ? 'add' : 'edit', selected, button);
      });
    });
    var zoneSave = zoneModal.querySelector('.modal__foot .btn--pri'); zoneSave.removeAttribute('data-modal-close');
    function rowHtml(data) {
      return '<td class="strong">' + esc(data.name) + '</td><td class="c"><span class="badge ' + (data.type === 'circle' ? 'pri' : 'info') + '">' + esc(data.type) + '</span></td><td class="c">' + esc(data.size) + '</td><td>' + esc(data.group) + '</td><td>' + esc(data.vehicle) + '</td><td class="c"><span class="badge gray">' + esc(data.eventType) + '</span></td><td class="r strong">' + data.events + '</td><td>' + esc(data.owner) + '</td><td>' + esc(data.date) + '</td><td class="c ms-status-cell"><span class="ms-zone-status' + (data.status === 'active' ? '' : ' is-paused') + '">' + statusLabel(data) + '</span></td><td class="c"><button class="btn btn--sm" data-modal-open="zoneModal">수정</button> <button class="btn btn--sm btn--danger" data-modal-open="delModal">삭제</button></td>';
    }
    function attachNewButtonHandlers(row) {
      var edit = row.querySelector('[data-modal-open="zoneModal"]'), del = row.querySelector('[data-modal-open="delModal"]');
      edit.addEventListener('click', function () { activateByElement(row); prepareZone('edit', selected, edit); });
      del.addEventListener('click', function () { activateByElement(row); prepareDelete(selected, del); });
    }
    zoneSave.addEventListener('click', function () {
      clearError(zoneModal); var name = nameInput.value.trim(), type = modalType.value.toLowerCase().indexOf('circle') > -1 ? 'circle' : 'polygon';
      if (!name) { errorAfter(nameInput, '구역명을 입력해 주세요.'); return; }
      var duplicate = records.some(function (x) { return x !== selected && norm(x.name) === norm(name); }); if (duplicate) { errorAfter(nameInput, '같은 이름의 구역이 이미 있습니다.'); return; }
      if (type === 'circle' && (!(parseFloat(radiusInput.value) > 0) || circleWkt.value.trim().toUpperCase().indexOf('POINT(') !== 0)) { errorAfter(radiusInput, '원형 구역의 반경과 POINT 좌표를 확인해 주세요.'); return; }
      if (type === 'polygon' && polygonWkt.value.trim().toUpperCase().indexOf('POLYGON((') !== 0) { errorAfter(polygonWkt, 'POLYGON 형식의 WKT 좌표를 입력해 주세요.'); return; }
      var base = editMode === 'add' ? { id:'zone-' + Date.now(), events:0, owner:'admin@sejong.co.kr', date:nowText() } : selected;
      var eventCode = selectedText(eventType).split(' — ')[0];
      var eventLabels = { OUT:'OUT 진출', IN:'IN 진입', INOUT:'INOUT 진입·진출' };
      base.name = name; base.type = type; base.group = selectedText(modalGroup); base.vehicle = selectedText(equipment); base.eventType = eventLabels[eventCode] || eventCode; base.status = modalStatus.value;
      base.size = type === 'circle' ? '반경 ' + parseFloat(radiusInput.value) + 'm' : '정점 ' + Math.max(3, (polygonWkt.value.match(/,/g) || []).length + 1) ; base.wkt = (type === 'circle' ? circleWkt.value : polygonWkt.value).trim();
      if (editMode === 'add') {
        var row = document.createElement('tr'); row.dataset.zoneId = base.id; row.dataset.status = base.status; row.dataset.wkt = base.wkt; row.className = 'ms-zone-row'; row.tabIndex = 0; row.innerHTML = rowHtml(base); tbody.appendChild(row);
        var item = document.createElement('div'); item.className = 'zone-item'; item.innerHTML = '<span class="nm">' + esc(base.name) + '</span><span class="badge ' + (type === 'circle' ? 'pri' : 'info') + '">' + type + '</span><span class="ev">0건</span>'; listBox.insertBefore(item, zoneListAnchor);
        var shape = document.createElement('div'); shape.className = 'geo-zone' + (type === 'circle' ? ' circle' : ''); var offset = records.length * 31; shape.style.cssText = 'left:' + (70 + offset % 470) + 'px;top:' + (70 + offset % 270) + 'px;width:' + (type === 'circle' ? 108 : 168) + 'px;height:' + (type === 'circle' ? 108 : 92) + 'px'; shape.innerHTML = '<span class="geo-zone__label">' + esc(base.name) + ' · ' + type + '</span>'; map.appendChild(shape);
        attachNewButtonHandlers(row);
      } else {
        base.row.dataset.status = base.status; base.row.dataset.wkt = base.wkt; base.row.innerHTML = rowHtml(base); base.item.querySelector('.nm').textContent = base.name; base.item.querySelector('.badge').className = 'badge ' + (type === 'circle' ? 'pri' : 'info'); base.item.querySelector('.badge').textContent = type;
        base.shape.classList.toggle('circle', type === 'circle'); base.shape.querySelector('.geo-zone__label').textContent = base.name + ' · ' + type + ' · ' + base.size; attachNewButtonHandlers(base.row);
      }
      closeModal(zoneModal); readRecords(); selected = records.filter(function (x) { return x.id === base.id; })[0]; selectZone(selected, true); updateSummary(); applyFilters(); toast(base.name + ' 구역을 ' + (editMode === 'add' ? '등록' : '저장') + '했습니다.', 'success');
    });

    var deleteName = delModal.querySelector('input.inp'); var deleteDescription = delModal.querySelector('.fld .inp[readonly]'); var deleteButton = delModal.querySelector('.modal__foot .btn--pri'); deleteButton.removeAttribute('data-modal-close'); deleteButton.disabled = true;
    function prepareDelete(data, trigger) {
      selected = data; clearError(delModal); deleteName.value = ''; deleteName.placeholder = data.name; deleteDescription.textContent = data.name + ' · ' + data.type + ' · ' + data.size + ' · ' + data.group; delModal.querySelector('.modal__title').textContent = '구역 삭제 — ' + data.name; deleteButton.disabled = true; openModal('delModal', trigger);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-modal-open="delModal"]'), function (button) { button.addEventListener('click', function () { var row = button.closest('.ms-zone-row'); if (row) activateByElement(row); prepareDelete(selected, button); }); });
    deleteName.addEventListener('input', function () { deleteButton.disabled = !selected || deleteName.value.trim() !== selected.name; });
    deleteButton.addEventListener('click', function () {
      if (!selected || deleteName.value.trim() !== selected.name) { errorAfter(deleteName, '삭제할 구역명을 정확히 입력해 주세요.'); return; }
      var name = selected.name; selected.row.remove(); if (selected.item) selected.item.remove(); if (selected.shape) selected.shape.remove(); closeModal(delModal); readRecords(); selected = records[0] || null; if (selected) selectZone(selected, true); updateSummary(); applyFilters(); toast(name + ' 구역을 삭제했습니다.', 'danger');
    });
    toggleStatus.addEventListener('click', function () {
      if (!selected) return; selected.status = selected.status === 'active' ? 'paused' : 'active'; syncStatusCell(selected); selected.row.dataset.status = selected.status; selected.row.dataset.wkt = selected.wkt; updateSummary(); selectZone(selected, false); applyFilters(); toast(selected.name + ' 구역을 ' + statusLabel(selected) + ' 상태로 변경했습니다.', 'success');
    });

    var mapControls = map.querySelectorAll('.map-ctl button');
    Array.prototype.forEach.call(mapControls, function (button, index) {
      button.addEventListener('click', function () {
        if (index === 0) zoom = Math.min(160, zoom + 10); else if (index === 1) zoom = Math.max(60, zoom - 10); else { zoom = 100; if (selected && selected.shape) selected.shape.focus(); }
        zoomBadge.textContent = zoom + '%'; var grid = map.querySelector('.map-mock__grid'); if (grid) grid.style.backgroundSize = (24 * zoom / 100) + 'px ' + (24 * zoom / 100) + 'px';
      });
    });
    var mapTypes = map.querySelectorAll('.map-type button'); Array.prototype.forEach.call(mapTypes, function (button) { button.addEventListener('click', function () { Array.prototype.forEach.call(mapTypes, function (x) { x.classList.toggle('active', x === button); }); toast(button.textContent.trim() + ' 지도 보기로 전환했습니다.'); }); });

    var exports = document.querySelectorAll('#tabMap .list-head .tools .btn'); if (exports[0]) exports[0].addEventListener('click', function () { exportRows('geofences.csv', table, true); });
    searchButton.addEventListener('click', applyFilters); search.addEventListener('input', applyFilters); search.addEventListener('keydown', function (event) { if (event.key === 'Enter') applyFilters(); });
    groupFilter.addEventListener('change', applyFilters); typeFilter.addEventListener('change', applyFilters); statusFilter.addEventListener('change', applyFilters);
    document.addEventListener('miq:target-change', function (event) {
      var detail = event.detail || {}; refreshContextBadge(detail.companyId, companyNames[detail.companyId]); if (detail.equipmentId) search.value = detail.equipmentId; setUrl({ companyId:detail.companyId || null }); applyFilters();
    });
    readRecords(); records.forEach(syncStatusCell); updateSummary(); applyFilters();
    var deepZone = query.get('zone'); var initial = records.filter(function (x) { return x.id === deepZone || x.name === deepZone; })[0] || records.filter(matches)[0] || records[0]; if (initial) selectZone(initial, false);
  }

  makeModalsAccessible();
  if (page === 'acctreq') initAccountRequest();
  if (page === 'equipreq') initVehicleRequest();
  if (page === 'geofence') initGeofence();
})();
