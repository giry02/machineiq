(function () {
  'use strict';

  var body = document.body;
  if (!body || body.dataset.gnb !== 'srvc') return;

  var page = body.dataset.sub || 'all';
  var roleRules = window.MIQCommon.roles;
  var accountRole = roleRules.resolve(window.MIQ && MIQ.MANAGEMENT_ROLE
    ? MIQ.MANAGEMENT_ROLE
    : new URLSearchParams(location.search).get('role'));
  var accountPolicy = roleRules.targetPolicy(accountRole);
  var table = document.querySelector('.main table');
  var tbody = table && table.tBodies[0];
  if (!table || !tbody) return;

  var detailHref = '../Vehicle%20Detail/vehicle-detail-tobe.html';
  var rows = [];
  var nextOrder = 0;
  var sortState = { index: -1, direction: 1 };
  var scopeContext = window.MIQ_TARGET_CONTEXT || null;
  var initialQuery = new URLSearchParams(location.search);
  var defaultPeriod = MIQCommon.dates.operatingRange(initialQuery.get('period') || 'm');
  var periodControlsReady = false;
  var filterState = {
    companyId: '',
    vehicle: '',
    group: '',
    type: '',
    from: initialQuery.get('from') || defaultPeriod.from,
    to: initialQuery.get('to') || defaultPeriod.to,
    supplyState: '',
    errorState: ''
  };
  var live = document.createElement('div');
  live.className = 'service-live';
  live.setAttribute('role', 'status');
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalize(value) {
    return String(value || '').toUpperCase().replace(/[^0-9A-Z가-힣]/g, '');
  }

  function numberFrom(value) {
    var match = String(value || '').replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : NaN;
  }

  function dateOnly(value) {
    var match = String(value || '').match(/\d{4}-\d{2}-\d{2}/);
    return match ? match[0] : '';
  }

  function selectedCompanyLabel() {
    var select = document.querySelector('[data-target-company]');
    if (!select || select.selectedIndex < 0) return '';
    return select.options[select.selectedIndex].getAttribute('data-label') || select.options[select.selectedIndex].textContent.trim();
  }

  function rowInfo(row) {
    var c = row.cells;
    var info = { row: row, company: '', group: '', model: '', vin: '', type: '', date: '', supplyState: '', errorState: '' };
    if (page === 'all') {
      info.company = c[0] ? c[0].textContent.trim() : '';
      info.group = c[1] ? c[1].textContent.trim() : '';
      info.model = c[2] ? c[2].textContent.trim() : '';
      info.vin = c[3] ? c[3].textContent.trim() : '';
    } else if (page === 'maintenance') {
      info.company = c[0] ? c[0].textContent.trim() : '';
      info.group = c[1] ? c[1].textContent.trim() : '';
      info.model = c[2] ? c[2].textContent.trim() : '';
      info.vin = c[3] ? c[3].textContent.trim() : '';
      info.date = c[4] ? dateOnly(c[4].textContent) : '';
    } else if (page === 'supply') {
      info.company = c[1] ? c[1].textContent.trim() : '';
      info.group = c[2] ? c[2].textContent.trim() : '';
      info.model = c[3] ? c[3].textContent.trim() : '';
      info.vin = c[4] ? c[4].textContent.trim() : '';
      info.date = c[6] ? dateOnly(c[6].textContent) : '';
      info.supplyState = row.dataset.supplyState || '';
      info.supplyName = row.dataset.name;
      info.supplyCycle = row.dataset.cycle;
      info.supplyUsed = row.dataset.used;
    } else if (page === 'error') {
      var affiliation = c[0];
      var vehicle = c[1];
      info.company = affiliation && affiliation.querySelector('strong') ? affiliation.querySelector('strong').textContent.trim() : '';
      info.group = affiliation && affiliation.querySelector('span') ? affiliation.querySelector('span').textContent.trim() : '';
      info.vin = vehicle && vehicle.querySelector('strong') ? vehicle.querySelector('strong').textContent.trim() : '';
      info.model = vehicle && vehicle.querySelector('span') ? vehicle.querySelector('span').textContent.trim() : '';
      info.date = c[6] ? dateOnly(c[6].textContent) : '';
      info.errorState = c[2] && normalize(c[2].textContent).indexOf(normalize('현재')) > -1 ? 'current' : 'past';
    }
    var catalogVehicle = catalogVehicleForVin(info.vin);
    info.companyId = row.dataset.companyId || (catalogVehicle && catalogVehicle.companyId)
      || (normalize(info.company).indexOf('세종물류') > -1 ? '1933' : '');
    info.type = row.dataset.vehicleType || vehicleTypeFor(info);
    return info;
  }

  function initializeDemoRows() {
    if (!window.MIQServiceDemo || body.dataset.serviceDemoReady === 'true') return;
    body.dataset.serviceDemoReady = 'true';
    var fleet = window.MIQ && (MIQ.FLEET_CATALOG || MIQ.FLEET) || [];
    var day = MIQCommon.dates.format(MIQCommon.dates.yesterday());
    var demo = MIQServiceDemo.create(fleet, day);
    MIQServiceRecords.records.push.apply(MIQServiceRecords.records, demo.maintenance.concat(demo.error));
    if (page === 'supply' || !rows.length) return;
    var template = rows[0];
    var existing = rows.map(function (row) { return normalize(rowInfo(row).vin); });
    var items = page === 'all' ? demo.maintenance : demo[page];
    (items || []).forEach(function (item) {
      if (page === 'all' && existing.indexOf(normalize(item.vin)) > -1) return;
      var row = template.cloneNode(true), c = row.cells;
      row.hidden = false;
      row.dataset.companyId = item.companyId;
      row.dataset.vehicleType = item.type;
      row.dataset.serviceDemo = 'true';
      row.title = '시연용 더미 데이터';
      if (page === 'all' || page === 'maintenance') {
        [item.company, item.group, item.model, item.vin].forEach(function (value, index) { c[index].textContent = value; });
        if (page === 'all') {
          [4, 5, 6, 7].forEach(function (index) { c[index].textContent = '0'; });
        } else {
          [item.dateTime, item.part, item.symptom, item.detail].forEach(function (value, index) { c[index + 4].textContent = value; });
          c[8].innerHTML = '<span class="done ' + (item.completed ? 'y' : 'n') + '">' + (item.completed ? '완료' : '진행중') + '</span>';
        }
      } else if (page === 'error') {
        c[0].querySelector('strong').textContent = item.company;
        c[0].querySelector('span').textContent = item.group;
        c[1].querySelector('strong').textContent = item.vin;
        c[1].querySelector('span').textContent = item.model;
        c[2].innerHTML = '<span class="state ' + (item.errorState === 'current' ? 'now' : 'past') + '">' + (item.errorState === 'current' ? '현재' : '과거') + '</span>';
        c[3].innerHTML = '<span class="type' + (item.category === '배터리' ? ' battery' : '') + '">' + esc(item.category) + '</span>';
        c[4].innerHTML = '<div class="errcode"><span class="errcode__main">' + esc(item.code) + ' <span class="level ' + esc(item.level) + '">' + esc(item.level.toUpperCase()) + '</span></span><span class="errcode__sub">' + esc(item.spn) + ' / ' + esc(item.fmi) + '</span></div>';
        c[5].textContent = item.description;
        c[6].querySelector('strong').textContent = item.dateTime;
        c[6].querySelector('span').textContent = '완료 ' + (item.completedAt || '-');
      }
      tbody.appendChild(row);
      existing.push(normalize(item.vin));
    });
  }

  function collectRows() {
    rows = Array.prototype.filter.call(tbody.rows, function (row) {
      return !row.classList.contains('service-empty-row');
    });
    rows.forEach(function (row) {
      if (typeof row._serviceOrder !== 'number') row._serviceOrder = nextOrder++;
    });
  }

  function applyMaintenanceRole() {
    if (page !== 'maintenance') return;
    var hideDetail = roleRules.hideMaintenanceDetails(accountRole);
    body.dataset.serviceRole = accountRole;
    if (roleRules.isDealer(accountRole)) {
      Array.prototype.forEach.call(tbody.closest('table').rows, function(row){if(row.cells[1])row.cells[1].hidden=true;});
    }
    Array.prototype.forEach.call(document.querySelectorAll('.detail-col'), function (cell) {
      cell.classList.toggle('is-hidden', hideDetail);
      cell.setAttribute('aria-hidden', hideDetail ? 'true' : 'false');
    });
  }

  function catalogVehicleForVin(vin) {
    if (!window.MIQ || !vin) return null;
    var fleet = Array.isArray(MIQ.FLEET_CATALOG) && MIQ.FLEET_CATALOG.length
      ? MIQ.FLEET_CATALOG
      : Array.isArray(MIQ.FLEET) ? MIQ.FLEET : [];
    return fleet.filter(function (item) {
      return normalize(item.vin) === normalize(vin);
    })[0] || null;
  }

  function vehicleTypeFor(info) {
    if (!window.MIQ) return '';
    var fleet = Array.isArray(MIQ.FLEET_CATALOG) && MIQ.FLEET_CATALOG.length ? MIQ.FLEET_CATALOG : Array.isArray(MIQ.FLEET) ? MIQ.FLEET : [];
    var exact = catalogVehicleForVin(info.vin);
    var sameModel = fleet.filter(function (item) { return normalize(item.model) === normalize(info.model); })[0];
    return (exact || sameModel || {}).type || '';
  }

  function vehicleDetailUrl(info) {
    var catalogVehicle = catalogVehicleForVin(info && info.vin);
    if (!catalogVehicle) return '';
    var currentCompany = document.querySelector('[data-target-company]');
    var query = new URLSearchParams(location.search);
    var companyId = currentCompany ? currentCompany.value : (query.get('companyId') || '');
    var params = new URLSearchParams();
    params.set('veh', catalogVehicle.vin);
    if (companyId) params.set('companyId', companyId);
    if (info.model) params.set('model', info.model);
    if (info.group) params.set('group', info.group);
    var type = vehicleTypeFor(info);
    if (type) params.set('type', type);
    if (query.get('period')) params.set('period', query.get('period'));
    return detailHref + '?' + params.toString();
  }

  function makeVinLink(cell, info, inner) {
    if (!cell || !info || !info.vin) return;
    var target = inner || cell;
    var href = vehicleDetailUrl(info);
    if (!href) {
      target.textContent = info.vin;
      target.classList.remove('text-link');
      cell.setAttribute('data-service-vin-unmapped', 'true');
      return;
    }
    var existingLink = cell.querySelector('.service-vin-link');
    if (existingLink) {
      existingLink.href = href;
      cell.removeAttribute('data-service-vin-unmapped');
      return;
    }
    var link = document.createElement('a');
    link.className = 'service-vin-link';
    link.href = href;
    link.textContent = info.vin;
    link.addEventListener('click', function (event) {
      var nextHref = vehicleDetailUrl(info);
      if (!nextHref) {
        event.preventDefault();
        link.replaceWith(document.createTextNode(info.vin));
        cell.setAttribute('data-service-vin-unmapped', 'true');
        return;
      }
      link.href = nextHref;
    });
    if (inner) {
      inner.textContent = '';
      inner.appendChild(link);
    } else {
      cell.textContent = '';
      cell.appendChild(link);
    }
    cell.removeAttribute('data-service-vin-unmapped');
  }

  function serviceItemUrl(info, sub) {
    var destinations = {
      maintenance: 'service-maintenance-tobe.html',
      supply: 'service-supply-tobe.html',
      error: 'service-error-tobe.html'
    };
    if (!destinations[sub] || !info.vin) return '';
    var catalogVehicle = catalogVehicleForVin(info.vin);
    var fleet = window.MIQ && (MIQ.FLEET_CATALOG || MIQ.FLEET) || [];
    var companyMatches = fleet.filter(function (item) {
      var name = normalize(item.companyName);
      var rowName = normalize(info.company);
      return name && rowName && (name.indexOf(rowName) > -1 || rowName.indexOf(name) > -1);
    });
    var companyIds = companyMatches.map(function (item) { return item.companyId; }).filter(function (id, index, ids) {
      return id && ids.indexOf(id) === index;
    });
    var current = new URLSearchParams(location.search);
    var params = new URLSearchParams();
    params.set('role', accountRole);
    params.set('veh', catalogVehicle ? catalogVehicle.vin : info.vin);
    var companyId = catalogVehicle && catalogVehicle.companyId
      || (companyIds.length === 1 ? companyIds[0] : filterState.companyId);
    if (companyId && companyId !== 'all') params.set('companyId', companyId);
    if (!roleRules.isDealer(accountRole) && info.group) params.set('group', info.group);
    var type = catalogVehicle ? catalogVehicle.type : filterState.type;
    if (type) params.set('type', type);
    var activePeriod = document.querySelector('.period-tabs button.active');
    var periods = { '일': 'd', '주': 'w', '월': 'm', '사용자설정': 'c' };
    var period = current.get('period') || (activePeriod && periods[activePeriod.textContent.replace(/\s+/g, '')]) || 'm';
    params.set('period', period);
    if (filterState.from) params.set('from', filterState.from);
    if (filterState.to) params.set('to', filterState.to);
    return destinations[sub] + '?' + params.toString();
  }

  function makeServiceItemLink(cell, info, sub, label) {
    if (!cell) return;
    var value = cell.textContent.trim();
    if (!(numberFrom(value) > 0)) {
      cell.textContent = value;
      return;
    }
    var link = cell.querySelector('.service-count-link');
    if (!link) {
      link = document.createElement('a');
      link.className = 'service-count-link';
      link.textContent = value;
      link.setAttribute('aria-label', info.vin + ' ' + label + ' ' + value + '건 보기');
      link.addEventListener('click', function () { link.href = serviceItemUrl(info, sub); });
      link.addEventListener('auxclick', function () { link.href = serviceItemUrl(info, sub); });
      cell.textContent = '';
      cell.appendChild(link);
    }
    link.href = serviceItemUrl(info, sub);
  }

  function enhanceVinLinks() {
    rows.forEach(function (row) {
      var info = rowInfo(row);
      if (!info.vin) return;
      if (page === 'all') {
        row.cells[3].textContent = info.vin;
        makeServiceItemLink(row.cells[4], info, 'maintenance', '수리이력');
        makeServiceItemLink(row.cells[5], info, 'supply', '소모품');
        makeServiceItemLink(row.cells[6], info, 'error', '에러');
      } else if (page === 'maintenance') {
        row.cells[3].textContent = info.vin;
      } else if (page === 'supply') {
        makeVinLink(row.cells[4], info);
      } else if (page === 'error') {
        makeVinLink(row.cells[1], info, row.cells[1] && row.cells[1].querySelector('strong'));
      }
    });
  }

  function supplyProgress(row) {
    var button = row;
    var progress = row.querySelector('.progress');
    if (!button || !progress) return;

    var cycle = Number(button.dataset.cycle || 0);
    var used = Number(button.dataset.used || 0);
    var state = MIQServiceRecords.supplyStatus(cycle, used);
    var pct = state.percent === null ? 0 : state.percent;
    var capped = state.width;
    var context = used > cycle ? '초과 ' + (used - cycle).toLocaleString('ko-KR') + 'H'
      : '교체까지 ' + Math.max(0, cycle - used).toLocaleString('ko-KR') + 'H';

    progress.classList.toggle('is-danger', state.state === 'need');
    progress.classList.toggle('is-warning', state.state === 'soon');
    progress.classList.toggle('is-safe', state.state === 'ok');
    progress.innerHTML =
      '<div class="progress__top"><span><b class="used">' + used.toLocaleString('ko-KR') + 'H</b> / '
      + cycle.toLocaleString('ko-KR') + 'H</span><span class="progress__value"><b class="percent">'
      + pct + '%</b></span></div><div class="progress__context">' + context
      + '</div><div class="progress__bar"><span class="progress__fill" style="width:' + capped + '%"></span></div>';
    row.dataset.supplyState = state.state;
  }

  function initializeSupplyRows() {
    if (page !== 'supply') return;
    rows.forEach(function (row) {
      var item = MIQServiceRecords.supplyItems(row.dataset.vin).filter(function (value) { return value.name === row.dataset.name; })[0];
      if (item) { row.dataset.cycle = item.cycle; row.dataset.used = item.used; }
      supplyProgress(row);
    });
  }

  function matchesCompany(info) {
    if (accountPolicy.companyIds && accountPolicy.companyIds.indexOf(info.companyId) < 0) return false;
    var id = filterState.companyId;
    if (!id || id === 'all') return true;
    if (info.companyId) return String(info.companyId) === String(id);
    var label = selectedCompanyLabel();
    if (id === '1933' && normalize(info.company).indexOf('세종물류') > -1) return true;
    return normalize(label).indexOf(normalize(info.company)) > -1
      || normalize(info.company).indexOf(normalize(label)) > -1
      || normalize(info.company) === normalize(id);
  }

  function isVisible(info) {
    if (!matchesCompany(info)) return false;
    if (page === 'supply' && info.supplyState !== 'need' && info.supplyState !== 'soon') return false;
    if (filterState.vehicle && normalize(info.vin) !== normalize(filterState.vehicle)) return false;
    if (filterState.group && normalize(info.group).indexOf(normalize(filterState.group)) < 0) return false;
    if (filterState.type && normalize(info.type) !== normalize(filterState.type)) return false;
    if (filterState.supplyState && info.supplyState !== filterState.supplyState) return false;
    if (filterState.errorState && info.errorState !== filterState.errorState) return false;
    if (page !== 'supply' && info.date && filterState.from && info.date < filterState.from) return false;
    if (page !== 'supply' && info.date && filterState.to && info.date > filterState.to) return false;
    return true;
  }

  function sortValue(row, index) {
    var text = row.cells[index] ? row.cells[index].textContent.replace(/\s+/g, ' ').trim() : '';
    var date = dateOnly(text);
    if (date) {
      var timeMatch = text.match(/\d{2}:\d{2}/);
      return Date.parse(date + 'T' + (timeMatch ? timeMatch[0] : '00:00'));
    }
    var numeric = numberFrom(text);
    if (!isNaN(numeric) && !/[A-Za-z가-힣]/.test(text.replace(/Km|SPN|FMI|PDF|H/g, ''))) return numeric;
    return text;
  }

  function sortRows() {
    if (sortState.index < 0) return;
    var index = sortState.index;
    var direction = sortState.direction;
    rows.sort(function (a, b) {
      var av = sortValue(a, index);
      var bv = sortValue(b, index);
      var result;
      if (typeof av === 'number' && typeof bv === 'number') result = av - bv;
      else result = String(av).localeCompare(String(bv), 'ko', { numeric: true, sensitivity: 'base' });
      return result === 0 ? a._serviceOrder - b._serviceOrder : result * direction;
    });
    rows.forEach(function (row) { tbody.appendChild(row); });
  }

  function enhanceSorting() {
    var skipLabels = ['수정', '조치'];
    Array.prototype.forEach.call(table.tHead.rows[0].cells, function (th, index) {
      var label = th.textContent.replace(/\s+/g, ' ').trim();
      if (!label || th.querySelector('input') || skipLabels.indexOf(label) > -1) return;
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'service-sort-button';
      button.setAttribute('aria-label', label + ' 기준 정렬');
      while (th.firstChild) button.appendChild(th.firstChild);
      th.appendChild(button);
      th.setAttribute('aria-sort', 'none');
      button.addEventListener('click', function () {
        if (sortState.index === index) sortState.direction *= -1;
        else {
          sortState.index = index;
          sortState.direction = 1;
        }
        Array.prototype.forEach.call(table.tHead.rows[0].cells, function (cell, ci) {
          cell.setAttribute('aria-sort', ci === index ? (sortState.direction > 0 ? 'ascending' : 'descending') : 'none');
        });
        sortRows();
        applyFilters(label + (sortState.direction > 0 ? ' 오름차순' : ' 내림차순') + '으로 정렬했습니다.');
      });
    });
  }

  var meta = document.createElement('div');
  meta.className = 'service-list-meta';
  meta.innerHTML =
    '<span data-service-scope-summary data-miq-scope-placement="title" aria-label="현재 조회 범위"></span>'
    + '<span class="service-list-meta__chips" data-service-filter-chips></span>'
    + '<button class="service-filter-reset" type="button" data-service-filter-reset hidden>필터 초기화</button>';
  var scopeHost = meta.querySelector('[data-service-scope-summary]');
  table.closest('.table-wrap').parentNode.insertBefore(meta, table.closest('.table-wrap'));

  function chipsHtml() {
    var chips = [];
    if (filterState.supplyState) {
      chips.push({ need: '교체필요', soon: '교체임박', ok: '정상' }[filterState.supplyState] || filterState.supplyState);
    }
    if (filterState.errorState) chips.push(filterState.errorState === 'current' ? '현재 에러' : '과거 에러');
    return chips.map(function (text) { return '<span class="service-filter-chip">' + esc(text) + '</span>'; }).join('');
  }

  function serviceScopeFilter() {
    return Object.assign({}, filterState, { companyIds: accountPolicy.companyIds, supplyState: '', errorState: '' });
  }

  function updateSummaryCounts() {
    if (page !== 'all') return;
    rows.forEach(function (row) {
      var info = rowInfo(row);
      var totals = MIQServiceRecords.totals({ vehicle: info.vin, from: filterState.from, to: filterState.to });
      row.cells[4].textContent = totals.maintenance;
      row.cells[5].textContent = totals.supply;
      row.cells[6].textContent = totals.error;
      row.cells[7].textContent = totals.maintenance + totals.supply + totals.error;
    });
    enhanceVinLinks();
  }

  function updateServiceLnb() {
    var totals = MIQServiceRecords.totals(serviceScopeFilter());
    window.MIQ_SERVICE_COUNTS = totals;
    var current = new URLSearchParams(location.search);
    var params = new URLSearchParams();
    params.set('role', accountRole);
    [['companyId', filterState.companyId], ['group', filterState.group], ['type', filterState.type],
      ['veh', filterState.vehicle], ['from', filterState.from], ['to', filterState.to]].forEach(function (pair) {
      if (pair[1]) params.set(pair[0], pair[1]);
    });
    params.set('period', current.get('period') || 'm');
    window.MIQ_SERVICE_QUERY = params.toString();
    Array.prototype.forEach.call(document.querySelectorAll('.miq-side-item'), function (item) {
      var key = item.getAttribute('data-miq-side-sub');
      var badge = item.querySelector('.miq-side-count');
      if (key === 'all') { if (badge) badge.remove(); return; }
      if (!Object.prototype.hasOwnProperty.call(totals, key)) return;
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'miq-side-count';
        item.appendChild(badge);
      }
      badge.textContent = totals[key];
    });
    document.dispatchEvent(new CustomEvent('miq:query-change', { detail: { query: window.MIQ_SERVICE_QUERY } }));
  }

  function resyncServiceLnbCounts() {
    if (!document.querySelector('.miq-side-menu')) return;
    collectRows();
    updateServiceLnb(rows.filter(function (row) { return !row.hidden; }));
  }

  function scheduleServiceLnbCountResync() {
    window.setTimeout(function () {
      // Shared date controls are mounted after this script's initial pass.
      if (!periodControlsReady) {
        var inputs = document.querySelectorAll('.miq-period-filter input[type="date"]');
        if (inputs.length) {
          periodControlsReady = true;
          filterState.from = inputs[0].value;
          filterState.to = inputs[1] ? inputs[1].value : inputs[0].value;
          enhanceVinLinks();
          applyFilters();
        }
      }
      resyncServiceLnbCounts();
    }, 0);
  }

  function applyFilters(message) {
    collectRows();
    if (page !== 'all') MIQServiceRecords.replace(page, rows.map(rowInfo));
    updateSummaryCounts();
    sortRows();
    var visible = [];
    rows.forEach(function (row) {
      var show = isVisible(rowInfo(row));
      row.hidden = !show;
      if (show) visible.push(row);
    });
    var oldEmpty = tbody.querySelector('.service-empty-row');
    if (oldEmpty) oldEmpty.remove();
    if (!visible.length) {
      var empty = document.createElement('tr');
      empty.className = 'service-empty-row';
      empty.innerHTML = '<td colspan="' + table.tHead.rows[0].cells.length
        + '"><strong>조회 조건에 맞는 결과가 없습니다.</strong>차량·기간·상태 필터를 변경해 주세요.</td>';
      tbody.appendChild(empty);
    }
    var displayCount = page === 'all'
      ? visible.reduce(function (sum, row) { return sum + (numberFrom(row.cells[row.cells.length - 1].textContent) || 0); }, 0)
      : visible.length;
    if (window.MIQ && typeof MIQ.renderScopeSummary === 'function') {
      var fallbackSegments = [
        { key: 'company', label: filterState.companyId && filterState.companyId !== 'all' ? (selectedCompanyLabel() || '선택 업체') : '전체 업체' },
        { key: 'group', label: filterState.group || '전체 그룹' },
        { key: 'type', label: filterState.type || '전체 분류' },
        { key: 'vehicle', label: filterState.vehicle || '전체 차량' }
      ];
      var targetContext = scopeContext || window.MIQ_TARGET_CONTEXT || { scopeSegments: fallbackSegments };
      var selectedVehicleCount = targetContext.selectedCount === 0 || targetContext.selectedCount
        ? targetContext.selectedCount
        : '';
      MIQ.renderScopeSummary(scopeHost, targetContext, { countLabel: '차량', count: selectedVehicleCount, countUnit: '대' });
    } else {
      scopeHost.textContent = '';
    }
    meta.querySelector('[data-service-filter-chips]').innerHTML = chipsHtml();
    var hasExtraFilter = !!(filterState.supplyState || filterState.errorState);
    meta.querySelector('[data-service-filter-reset]').hidden = !hasExtraFilter;
    meta.classList.toggle('is-empty', !hasExtraFilter);
    updateServiceLnb(visible);
    live.textContent = message || '조회 결과 ' + displayCount + '건입니다.';
  }

  meta.querySelector('[data-service-filter-reset]').addEventListener('click', function () {
    filterState.supplyState = '';
    filterState.errorState = '';
    applyFilters('추가 필터를 초기화했습니다.');
  });

  function ensureDialog() {
    var dialog = document.querySelector('.service-dialog');
    if (dialog) return dialog;
    dialog = document.createElement('dialog');
    dialog.className = 'service-dialog';
    document.body.appendChild(dialog);
    dialog.addEventListener('cancel', function () { body.classList.remove('is-printing-error'); });
    dialog.addEventListener('close', function () { body.classList.remove('is-printing-error'); });
    return dialog;
  }

  function closeDialog(dialog) {
    body.classList.remove('is-printing-error');
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else dialog.removeAttribute('open');
  }

  function openDialog(config) {
    var dialog = ensureDialog();
    dialog.className = 'service-dialog' + (config.dialogClass ? ' ' + config.dialogClass : '');
    dialog.innerHTML =
      '<form class="service-dialog__form" novalidate>'
      + '<header class="service-dialog__head"><h2>' + esc(config.title) + '</h2>'
      + '<button class="service-dialog__close" type="button" aria-label="닫기">×</button></header>'
      + '<div class="service-dialog__body">' + config.body + '</div>'
      + '<footer class="service-dialog__foot"><button class="service-dialog__button" type="button" data-dialog-cancel>취소</button>'
      + '<button class="service-dialog__button primary" type="submit">' + esc(config.confirmLabel || '저장') + '</button></footer></form>';
    var form = dialog.querySelector('form');
    dialog.querySelector('.service-dialog__close').addEventListener('click', function () { closeDialog(dialog); });
    dialog.querySelector('[data-dialog-cancel]').addEventListener('click', function () { closeDialog(dialog); });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var shouldClose = config.onConfirm ? config.onConfirm(form, dialog) !== false : true;
      if (shouldClose) closeDialog(dialog);
    });
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (config.onOpen) config.onOpen(form, dialog);
    var focusTarget = dialog.querySelector('input:not([readonly]), select, textarea, button');
    if (focusTarget) focusTarget.focus();
    return dialog;
  }

  function showToast(message, undo) {
    var old = document.querySelector('.service-toast');
    if (old) old.remove();
    var toast = document.createElement('div');
    toast.className = 'service-toast';
    toast.setAttribute('role', 'status');
    toast.innerHTML = '<span>' + esc(message) + '</span>' + (undo ? '<button type="button">실행 취소</button>' : '');
    if (undo) toast.querySelector('button').addEventListener('click', function () {
      undo();
      toast.remove();
    });
    document.body.appendChild(toast);
    window.setTimeout(function () { if (toast.isConnected) toast.remove(); }, 6000);
  }

  function uniqueVehicles() {
    var seen = {};
    return rows.map(rowInfo).filter(function (info) {
      if (!info.vin || seen[normalize(info.vin)]) return false;
      seen[normalize(info.vin)] = true;
      return true;
    });
  }

  function openMaintenanceRegistration() { return;
    var fleet = window.MIQ && Array.isArray(MIQ.FLEET_CATALOG) && MIQ.FLEET_CATALOG.length
      ? MIQ.FLEET_CATALOG.slice()
      : uniqueVehicles();
    if (filterState.companyId && filterState.companyId !== 'all') {
      fleet = fleet.filter(function (item) { return String(item.companyId || '') === String(filterState.companyId); });
    }
    var groupMap = {};
    fleet.forEach(function (item) {
      var companyId = String(item.companyId || '');
      var groupName = item.group || '미배정';
      var key = companyId + '::' + groupName;
      if (!groupMap[key]) {
        groupMap[key] = {
          key: key,
          companyId: companyId,
          companyName: item.companyName || item.company || '세종물류',
          group: groupName
        };
      }
    });
    var groups = Object.keys(groupMap).map(function (key) { return groupMap[key]; });
    var selectedVehicle = filterState.vehicle || (fleet[0] && fleet[0].vin) || '';
    var selectedVehicleInfo = fleet.filter(function (item) { return normalize(item.vin) === normalize(selectedVehicle); })[0] || fleet[0] || null;
    var selectedGroupKey = selectedVehicleInfo
      ? String(selectedVehicleInfo.companyId || '') + '::' + (selectedVehicleInfo.group || '미배정')
      : (groups[0] && groups[0].key) || '';
    var groupOptions = groups.map(function (item) {
      var label = item.group + (item.companyName ? ' - ' + item.companyName : '');
      return '<option value="' + esc(item.key) + '"' + (item.key === selectedGroupKey ? ' selected' : '') + '>' + esc(label) + '</option>';
    }).join('');
    var hours = [];
    for (var hour = 0; hour < 24; hour++) {
      var label = (hour < 10 ? '0' : '') + hour;
      hours.push('<option value="' + label + '"' + (hour === 9 ? ' selected' : '') + '>' + label + '</option>');
    }
    var baseDate = filterState.to || '2026-07-31';
    var dialog = openDialog({
      title: '등록',
      confirmLabel: '장비점검 등록',
      dialogClass: 'service-dialog--maintenance',
      body: '<div class="service-dialog__grid">'
        + '<label class="service-dialog__field full"><span>그룹명</span><select name="group" required>' + groupOptions + '</select></label>'
        + '<label class="service-dialog__field full"><span>차량 ID</span><select name="vin"><option value="">차량없음</option></select></label>'
        + '<label class="service-dialog__field"><span>고장부위</span><input name="part" required maxlength="40"></label>'
        + '<label class="service-dialog__field"><span>현상</span><input name="symptom" required maxlength="60"></label>'
        + '<label class="service-dialog__field"><span>접수일</span><span class="service-dialog__date-pair"><input name="receivedDate" type="date" value="' + esc(baseDate) + '" required><select name="receivedHour" aria-label="접수 시간">' + hours.join('') + '</select></span></label>'
        + '<label class="service-dialog__field"><span>완료일</span><span class="service-dialog__date-pair"><input name="completedDate" type="date"><select name="completedHour" aria-label="완료 시간">' + hours.join('').replace(' value="09" selected', ' value="09"') + '</select></span></label>'
        + '<label class="service-dialog__field full"><span>상세내용</span><textarea name="detail" required maxlength="300"></textarea></label>'
        + '</div>',
      onOpen: function (form) {
        var groupSelect = form.elements.group;
        var vehicleSelect = form.elements.vin;
        function renderVehicleOptions() {
          var selectedKey = groupSelect.value;
          var currentValue = vehicleSelect.value || selectedVehicle;
          var options = fleet.filter(function (item) {
            return String(item.companyId || '') + '::' + (item.group || '미배정') === selectedKey;
          }).map(function (item) {
            var label = item.vin + ' · ' + item.model;
            return '<option value="' + esc(item.vin) + '"' + (normalize(item.vin) === normalize(currentValue) ? ' selected' : '') + '>' + esc(label) + '</option>';
          }).join('');
          vehicleSelect.innerHTML = '<option value="">차량없음</option>' + options;
        }
        groupSelect.addEventListener('change', function () {
          selectedVehicle = '';
          renderVehicleOptions();
        });
        renderVehicleOptions();
      },
      onConfirm: function (form) {
        var data = new FormData(form);
        var vin = data.get('vin');
        var vehicle = fleet.filter(function (item) { return normalize(item.vin) === normalize(vin); })[0] || null;
        var selectedGroup = groupMap[data.get('group')] || { companyName: '세종물류', group: '미배정' };
        var stamp = String(data.get('receivedDate')) + ' ' + String(data.get('receivedHour')) + ':00';
        var completedDate = String(data.get('completedDate') || '');
        var completedStamp = completedDate ? completedDate + ' ' + String(data.get('completedHour') || '00') + ':00' : '';
        var done = completedDate ? 'y' : 'n';
        var row = document.createElement('tr');
        row.className = 'service-row-added';
        row.dataset.completedAt = completedStamp;
        row.innerHTML = '<td>' + esc((vehicle && (vehicle.companyName || vehicle.company)) || selectedGroup.companyName) + '</td><td>' + esc((vehicle && vehicle.group) || selectedGroup.group) + '</td><td>' + esc((vehicle && vehicle.model) || '-')
          + '</td><td>' + esc(vin || '차량없음') + '</td><td>' + esc(stamp) + '</td><td>' + esc(data.get('part'))
          + '</td><td>' + esc(data.get('symptom')) + '</td><td class="left detail-col">' + esc(data.get('detail'))
          + '</td><td><span class="done ' + done + '">' + (done === 'y' ? '완료' : '진행중') + '</span></td>';
        tbody.insertBefore(row, tbody.firstChild);
        applyMaintenanceRole();
        collectRows();
        enhanceVinLinks();
        applyFilters('수리이력 1건을 등록했습니다.');
        showToast('수리이력 1건을 등록했습니다.');
      }
    });
    return dialog;
  }

  function openSupplyEdit(button) { return;
    var row = button.closest('tr');
    var name = button.dataset.name || '소모품';
    var cycle = Number(button.dataset.cycle || 0);
    var used = Number(button.dataset.used || 0);
    openDialog({
      title: name + ' 교환 정보 수정',
      body: '<div class="service-dialog__grid">'
        + '<label class="service-dialog__field"><span>소모품</span><input value="' + esc(name) + '" readonly></label>'
        + '<label class="service-dialog__field"><span>차량</span><input value="' + esc(button.dataset.vin || '') + '" readonly></label>'
        + '<label class="service-dialog__field"><span>교환주기 (H)</span><input name="cycle" type="number" min="1" step="1" value="' + cycle + '" required></label>'
        + '<label class="service-dialog__field"><span>현재 사용시간 (H)</span><input value="' + used + '" readonly></label>'
        + '<label class="service-dialog__field"><span>마지막 교체일시</span><input name="lastDate" type="datetime-local" value="' + esc(String(button.dataset.lastDate || '').replace(' ', 'T')) + '" required></label>'
        + '<label class="service-dialog__field"><span>마지막 교체 누적시간 (H)</span><input name="lastCum" type="number" min="0" step="1" value="' + esc(String(button.dataset.lastCum || '0').replace(/,/g, '')) + '" required></label>'
        + '</div><p class="service-dialog__summary" style="margin-top:14px">저장하면 교환주기 대비 사용률과 교체필요·교체임박 상태가 즉시 다시 계산됩니다.</p>',
      onConfirm: function (form) {
        var data = new FormData(form);
        button.dataset.cycle = String(Number(data.get('cycle')));
        button.dataset.lastDate = String(data.get('lastDate')).replace('T', ' ');
        button.dataset.lastCum = Number(data.get('lastCum')).toLocaleString('ko-KR');
        supplyProgress(row);
        applyFilters(name + ' 교환 정보를 저장했습니다.');
        showToast(name + ' 교환 정보를 저장했습니다.');
      }
    });
  }

  function selectedSupplyRows() {
    return Array.prototype.filter.call(tbody.querySelectorAll('.item-check'), function (check) {
      return check.checked && !check.closest('tr').hidden;
    }).map(function (check) { return check.closest('tr'); });
  }

  function syncSupplySelection() {
    if (page !== 'supply') return;
    var selected = selectedSupplyRows();
    var count = document.getElementById('selection-count');
    var reset = document.getElementById('reset-selected');
    var all = document.getElementById('check-all');
    var visibleChecks = Array.prototype.filter.call(tbody.querySelectorAll('.item-check'), function (check) {
      return !check.closest('tr').hidden;
    });
    if (count) count.textContent = selected.length + '개 선택';
    if (reset) reset.disabled = selected.length === 0;
    if (all) {
      all.checked = visibleChecks.length > 0 && selected.length === visibleChecks.length;
      all.indeterminate = selected.length > 0 && selected.length < visibleChecks.length;
    }
  }

  function openSupplyBatch() {
    var selected = selectedSupplyRows();
    if (!selected.length) return;
    var names = selected.map(function (row) {
      return row.dataset.name + ' · ' + rowInfo(row).vin;
    });
    openDialog({
      title: '선택 항목 교체 완료',
      confirmLabel: selected.length + '개 항목 처리',
      body: '<div class="service-dialog__summary"><strong>처리 대상 ' + selected.length + '개</strong>'
        + '<ul>' + names.map(function (name) { return '<li>' + esc(name) + '</li>'; }).join('') + '</ul>'
        + '<p style="margin-top:8px">처리하면 사용시간이 0H로 초기화되고 상태가 정상으로 변경됩니다.</p></div>',
      onConfirm: function () {
        var snapshots = selected.map(function (row) {
          var button = row;
          var progress = row.querySelector('.progress');
          return { row: row, used: button.dataset.used, className: progress.className, html: progress.innerHTML, state: row.dataset.supplyState };
        });
        selected.forEach(function (row) {
          var button = row;
          button.dataset.used = '0';
          row.querySelector('.item-check').checked = false;
          row.classList.add('reset-row');
          supplyProgress(row);
        });
        syncSupplySelection();
        applyFilters(selected.length + '개 항목을 교체 완료로 처리했습니다.');
        showToast(selected.length + '개 항목을 교체 완료로 처리했습니다.', function () {
          snapshots.forEach(function (snap) {
            var button = snap.row;
            var progress = snap.row.querySelector('.progress');
            button.dataset.used = snap.used;
            progress.className = snap.className;
            progress.innerHTML = snap.html;
            snap.row.dataset.supplyState = snap.state;
            snap.row.classList.remove('reset-row');
          });
          applyFilters('교체 완료 처리를 취소했습니다.');
          showToast('교체 완료 처리를 취소했습니다.');
        });
      }
    });
  }

  function errorDetails(button) {
    var row = button.closest('tr');
    var info = rowInfo(row);
    var cells = row.cells;
    var code = cells[4].querySelector('.errcode__main').childNodes[0].nodeValue.trim();
    var level = cells[4].querySelector('.level') ? cells[4].querySelector('.level').textContent.trim() : '-';
    var sub = cells[4].querySelector('.errcode__sub') ? cells[4].querySelector('.errcode__sub').textContent.trim() : '-';
    return {
      info: info,
      state: cells[2].textContent.trim(),
      type: cells[3].textContent.trim(),
      code: code,
      level: level,
      sub: sub,
      description: cells[5].textContent.trim(),
      date: cells[6].textContent.replace(/\s+/g, ' ').trim()
    };
  }

  function openErrorPrint(button) {
    var d = errorDetails(button);
    openDialog({
      title: '에러 조치 정보',
      confirmLabel: '인쇄 / PDF 저장',
      body: '<div class="service-dialog__summary"><strong>' + esc(d.info.vin + ' · ' + d.info.model) + '</strong>'
        + '<dl style="display:grid;grid-template-columns:120px 1fr;gap:8px 14px;margin-top:14px">'
        + '<dt>구분</dt><dd>' + esc(d.type) + '</dd><dt>현재/과거</dt><dd>' + esc(d.state)
        + '</dd><dt>에러코드</dt><dd>' + esc(d.code + ' · ' + (d.level && d.level !== '-' ? d.level + '등급' : '-')) + '</dd><dt>SPN / FMI</dt><dd>'
        + esc(d.sub) + '</dd><dt>설명</dt><dd>' + esc(d.description) + '</dd><dt>발생 / 완료</dt><dd>' + esc(d.date)
        + '</dd></dl></div>',
      onConfirm: function (form, dialog) {
        body.classList.add('is-printing-error');
        window.print();
        window.setTimeout(function () { body.classList.remove('is-printing-error'); }, 0);
        return false;
      }
    });
  }

  function enhanceErrorActions() {
    if (page !== 'error') return;
    Array.prototype.forEach.call(tbody.querySelectorAll('span.pdf'), function (span) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = span.className;
      button.setAttribute('data-error-pdf', '');
      button.setAttribute('aria-label', rowInfo(span.closest('tr')).vin + ' 에러 조치 정보 열기');
      button.textContent = 'PDF';
      span.replaceWith(button);
    });
  }

  function applyUrlState() {
    var params = new URLSearchParams(location.search);
    filterState.companyId = params.get('companyId') || '';
    filterState.vehicle = params.get('veh') || params.get('vehicle') || '';
    filterState.group = params.get('group') || '';
    filterState.type = params.get('type') || '';
    filterState.supplyState = page === 'supply' ? (params.get('state') || '') : '';
    var requestedErrorState = page === 'error' ? String(params.get('state') || '').toLowerCase() : '';
    filterState.errorState = ({ current: 'current', now: 'current', active: 'current', '현재': 'current', past: 'past', history: 'past', resolved: 'past', '과거': 'past' })[requestedErrorState] || '';

    var company = document.querySelector('[data-target-company]');
    if (company && filterState.companyId) {
      var companyOption = Array.prototype.filter.call(company.options, function (option) {
        return option.value === filterState.companyId || normalize(option.textContent).indexOf(normalize(filterState.companyId)) > -1;
      })[0];
      if (companyOption) company.value = companyOption.value;
    }
    if (company && !filterState.companyId) filterState.companyId = company.value;

    var vehicle = document.querySelector('[data-target-vehicle]');
    if (vehicle && filterState.vehicle) {
      var option = Array.prototype.filter.call(vehicle.options, function (item) {
        return normalize(item.value) === normalize(filterState.vehicle);
      })[0];
      if (!option) {
        option = document.createElement('option');
        option.value = filterState.vehicle;
        option.textContent = filterState.vehicle;
        vehicle.appendChild(option);
      }
      vehicle.value = option.value;
      vehicle.dispatchEvent(new Event('change', { bubbles: true }));
    } else if (vehicle && vehicle.value) {
      filterState.vehicle = vehicle.value;
    }

    var period = (params.get('period') || '').toLowerCase();
    var periodWords = { day: '일', d: '일', week: '주', w: '주', month: '월', m: '월', custom: '사용자설정', c: '사용자설정' };
    if (periodWords[period]) {
      Array.prototype.forEach.call(document.querySelectorAll('.period-tabs button'), function (button) {
        button.classList.toggle('active', button.textContent.replace(/\s+/g, '') === periodWords[period]);
      });
    }

    var inputs = document.querySelectorAll('.miq-period-filter input[type="date"], .finder input[type="date"]');
    if (inputs.length) {
      periodControlsReady = true;
      if (params.get('from')) inputs[0].value = params.get('from');
      if (inputs[1] && params.get('to')) inputs[1].value = params.get('to');
      filterState.from = inputs[0].value;
      filterState.to = inputs[1] ? inputs[1].value : inputs[0].value;
    }
  }

  document.addEventListener('miq:target-change', function (event) {
    scopeContext = event.detail || scopeContext;
    filterState.companyId = event.detail && event.detail.companyId || '';
    filterState.vehicle = event.detail && event.detail.equipmentId || '';
    filterState.group = event.detail && event.detail.group || '';
    filterState.type = event.detail && event.detail.type || '';
    enhanceVinLinks();
    applyFilters();
  });
  document.addEventListener('miq:period-change', function (event) {
    periodControlsReady = true;
    filterState.from = event.detail && event.detail.startDate || '';
    filterState.to = event.detail && event.detail.endDate || '';
    var periodCodes = { D: 'd', W: 'w', M: 'm', C: 'c' };
    var periodCode = periodCodes[event.detail && event.detail.periodTypeCode] || 'm';
    var url = new URL(location.href);
    url.searchParams.set('period', periodCode);
    if (filterState.from && filterState.to) {
      url.searchParams.set('from', filterState.from);
      url.searchParams.set('to', filterState.to);
    } else {
      url.searchParams.delete('from');
      url.searchParams.delete('to');
    }
    history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString() + url.hash);
    document.dispatchEvent(new CustomEvent('miq:query-change', {
      detail: { query: url.searchParams.toString() }
    }));
    enhanceVinLinks();
    applyFilters();
  });
  document.addEventListener('change', function (event) {
    if (page === 'supply' && event.target.matches('.item-check, #check-all')) {
      if (event.target.id === 'check-all') {
        var checked=event.target.checked;
        Array.prototype.forEach.call(tbody.querySelectorAll('.item-check'),function(check){if(!check.closest('tr').hidden)check.checked=checked;});
      }
      syncSupplySelection();
    }
  });
  document.addEventListener('click', function (event) {
    var errorButton = event.target.closest('[data-error-pdf]');
    if (errorButton) {
      event.preventDefault();
      openErrorPrint(errorButton);
    }
  });
  document.addEventListener('click', function (event) {
    var edit = event.target.closest('[data-miq-modal="supply"], [data-service-edit="supply"]');
    if (edit && page === 'supply') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openSupplyEdit(edit);
      return;
    }
    var reset = event.target.closest('#reset-selected');
    if (reset && page === 'supply') {
      event.preventDefault();
      event.stopImmediatePropagation();
      openSupplyBatch();
    }
  }, true);

  collectRows();
  initializeDemoRows();
  collectRows();
  applyMaintenanceRole();
  initializeSupplyRows();
  collectRows();
  enhanceVinLinks();
  enhanceSorting();
  enhanceErrorActions();
  applyUrlState();
  enhanceVinLinks();
  sortRows();
  applyFilters();
  syncSupplySelection();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleServiceLnbCountResync);
  } else {
    scheduleServiceLnbCountResync();
  }
  window.addEventListener('load', scheduleServiceLnbCountResync);

  if (page === 'maintenance') {
    var add = document.querySelector('.btn-add');
    if (add) add.addEventListener('click', openMaintenanceRegistration);
  }
})();
