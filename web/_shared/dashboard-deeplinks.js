(function () {
  'use strict';

  var roleRules = window.MIQCommon.roles;
  var role = roleRules.resolve(document.body.dataset.managementRole || new URLSearchParams(location.search).get('role'));
  var companyDimension = roleRules.dashboardDimension(role) === 'company';
  var dealerStaffScope = roleRules.hideDashboardComparison(role);
  var mockFleet = window.MIQ_MOCK_DATA && window.MIQ_MOCK_DATA.fleet;
  var companies = mockFleet && Array.isArray(mockFleet.dashboardCompanies)
    ? mockFleet.dashboardCompanies.filter(function (company) {
      return !Array.isArray(company.dashboardRoles) || company.dashboardRoles.indexOf(role) > -1;
    }) : [];
  var lastCatalogCompany = companies.filter(function (company) { return !company.demo; }).slice(-1)[0];
  var SUMMARY = '../Vehicle%20Summary/vehicle-summary-tobe-option-a-expand.html';
  var MAP = '../Map/map-tobe.html';
  var ERROR = '../Service/service-error-tobe.html';
  var SUPPLY = '../Service/service-supply-tobe.html';
  var REPORT = '../Report%20Status/report-status-tobe.html';
  var reportLinks = [];
  var navigationLinks = [];
  var summaryLinks = null;
  var committedReportPeriod = initialReportPeriod();

  function initialReportPeriod() {
    var query = new URLSearchParams(location.search);
    var aliases = { d: 'd', day: 'd', w: 'w', week: 'w', m: 'm', month: 'm' };
    var requested = aliases[query.get('period')], period = requested || 'm';
    var dates = MIQCommon.dates, from = query.get('from'), to = query.get('to');
    var range = requested && dates.parse(from) && dates.parse(to) && from <= to
      ? { from: from, to: period === 'd' ? from : to } : dates.operatingRange(period);
    return { period: period, from: range.from, to: range.to };
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character];
    });
  }

  function format(value) { return Math.round(Number(value) || 0).toLocaleString('ko-KR'); }
  function sum(key) {
    return companies.reduce(function (total, company) { return total + (Number(company[key]) || 0); }, 0);
  }
  function percent(value, total) { return total ? Math.round(value / total * 100) : 0; }

  function href(base, values) {
    values = values || {};
    var params = new URLSearchParams();
    params.set('companyId', values.companyId || (companyDimension ? 'all' : '1933'));
    params.set('role', role);
    params.set('source', 'dashboard');
    Object.keys(values).forEach(function (key) {
      if (key === 'companyId') return;
      if (values[key] !== null && values[key] !== undefined && values[key] !== '') params.set(key, values[key]);
    });
    return base + '?' + params.toString();
  }

  function link(node, url, label) {
    if (!node) return;
    node.classList.add('miq-dashboard-link');
    node.setAttribute('role', 'link');
    node.setAttribute('tabindex', '0');
    node.setAttribute('aria-label', label);
    node.setAttribute('title', label);
    node.dataset.dashboardHref = url;
    node.dataset.dashboardBaseHref = url;
    navigationLinks.push(node);
    node.addEventListener('click', function (event) {
      if (!node.dataset.dashboardHref) return;
      if (event.target.closest('a,button,input,select')) return;
      location.href = node.dataset.dashboardHref;
    });
    node.addEventListener('keydown', function (event) {
      if (!node.dataset.dashboardHref) return;
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      location.href = node.dataset.dashboardHref;
    });
  }

  function metricSignal(className, count, warning) {
    return '<span class="matrix-number ' + className + '">' +
      (count ? '<i class="matrix-signal' + (warning ? ' warning' : '') + '"></i>' : '') +
      '<b class="miq-number">' + format(count) + '</b></span>';
  }

  function renderCompanyMatrix() {
    if (!companyDimension || !companies.length) return;
    document.body.dataset.dashboardDimension = 'company';
    var table = document.querySelector('.group-matrix');
    if (!table) return;
    table.setAttribute('aria-label', '업체별 실시간 차량 현황');
    var firstHeading = table.querySelector('thead tr:first-child th:first-child');
    if (firstHeading) firstHeading.textContent = '업체';
    table.tBodies[0].innerHTML = companies.map(function (company) {
      var rate = percent(company.running, company.connected);
      return '<tr data-company-id="' + esc(company.companyId) + '" data-scope-name="' + esc(company.companyName) + '"' + (company.demo ? ' data-dashboard-demo="true"' : '') + '>' +
        '<th scope="row"><span class="group-name">' + esc(company.companyName) + '<small>보유 ' + format(company.vehicleCount) + '대</small></span></th>' +
        '<td><span class="matrix-number miq-number">' + format(company.vehicleCount) + '</span></td>' +
        '<td><span class="matrix-number on miq-number">' + format(company.connected) + '</span></td>' +
        '<td><span class="matrix-number off miq-number">' + format(company.disconnected) + '</span></td>' +
        '<td><span class="matrix-number run miq-number">' + format(company.running) + '</span></td>' +
        '<td><span class="matrix-number idle miq-number">' + format(company.idle) + '</span></td>' +
        '<td><span class="matrix-rate rate"><b class="miq-number">' + rate + '%</b><span class="matrix-rate__track"><i style="--value:' + (rate / 100).toFixed(2) + '"></i></span></span></td>' +
        '<td>' + metricSignal('fault', company.fault, false) + '</td>' +
        '<td>' + metricSignal('need', company.replacementNeeded, false) + '</td>' +
        '<td>' + metricSignal('soon', company.replacementSoon, true) + '</td></tr>';
    }).join('');
  }

  function deltaMeta(previous, current, higherIsBetter, suffix) {
    var raw = previous ? (current - previous) / previous * 100 : 0;
    var flat = Math.abs(raw) < 0.05;
    var direction = flat ? 'flat' : raw > 0 ? 'up' : 'down';
    var improved = flat ? 'is-flat' : ((raw > 0) === higherIsBetter ? 'is-improved' : 'is-worsened');
    var text = flat ? '동일 0.0' : (raw > 0 ? '+' : '−') + Math.abs(raw).toFixed(1);
    return { className: direction + ' ' + improved, text: text + (suffix || '%') };
  }

  function pairCell(previous, current, unit, higherIsBetter) {
    var delta = deltaMeta(previous, current, higherIsBetter, '%');
    var max = Math.max(previous, current, 1);
    return '<td><div class="pair-value"><span>' + format(previous) + '</span><i>→</i><strong>' + format(current) + '</strong><small>' + unit + '</small><em class="' + delta.className + '">' + delta.text + '</em></div>' +
      '<div class="micro-compare"><span class="prev"><i style="--value:' + (previous / max * .88).toFixed(2) + '"></i></span><span class="cur"><i style="--value:' + (current / max * .88).toFixed(2) + '"></i></span></div></td>';
  }

  function efficiencyCell(previous, current, unit, higherIsBetter, pointUnit) {
    var delta = deltaMeta(previous, current, higherIsBetter, pointUnit ? '%p' : '%');
    return '<td><div class="eff-pair"><span>' + previous + '</span><i>→</i><strong>' + current + '</strong><small>' + unit + '</small></div><div class="eff-delta ' + delta.className + '">' + delta.text + '</div></td>';
  }

  function companyMetricSeed(company, index) {
    if (company.demo) index %= 5;
    var count = Number(company.vehicleCount) || 0;
    var distance = Math.round(count * 81.4 + index * 9);
    var time = Math.round(count * 51.7 + index * 3);
    var fuel = Math.round(count * 25.7 + index * 4);
    var battery = Math.round(count * 17.1 + index * 3);
    return {
      distance: [Math.round(distance / 1.14), distance],
      time: [Math.round(time / 1.04), time],
      fuel: [Math.round(fuel / .89), fuel],
      battery: (company.demo ? index === 4 : lastCatalogCompany && company.companyId === lastCatalogCompany.companyId) ? [battery, battery] : [Math.round(battery / 1.12), battery]
    };
  }

  function companyEfficiencySeed(company, index) {
    if (company.demo) index %= 5;
    var rate = percent(company.running, company.connected);
    var flatBattery = company.demo ? index === 4 : lastCatalogCompany && company.companyId === lastCatalogCompany.companyId;
    return [[76 + index, 80 + index], [49 + index * .4, 50 + index * .5], [44 - index, 42 - index],
      [42 + index, flatBattery ? 42 + index : 43 + index], [Math.max(0, rate - 2), rate]];
  }

  function renderCompanyPerformance() {
    if (!companyDimension || !companies.length) return;
    var tables = document.querySelectorAll('.performance-table');
    Array.prototype.forEach.call(tables, function (table) {
      var head = table.querySelector('thead th:first-child');
      if (head) head.textContent = '업체';
      table.setAttribute('aria-label', table.classList.contains('efficiency-table') ? '업체별 대당 효율' : '업체별 누적 사용량');
    });
    if (!tables[0] || !tables[1]) return;

    tables[0].tBodies[0].innerHTML = companies.map(function (company, index) {
      var metric = companyMetricSeed(company, index);
      return '<tr data-company-id="' + esc(company.companyId) + '" data-scope-name="' + esc(company.companyName) + '"' + (company.demo ? ' data-dashboard-demo="true"' : '') + '>' +
        '<th scope="row"><span class="group-name">' + esc(company.companyName) + '<small>보유 ' + format(company.vehicleCount) + '대</small></span></th>' +
        pairCell(metric.distance[0], metric.distance[1], 'Km', true) +
        pairCell(metric.time[0], metric.time[1], 'H', true) +
        pairCell(metric.fuel[0], metric.fuel[1], 'ℓ', false) +
        pairCell(metric.battery[0], metric.battery[1], 'kWh', false) + '</tr>';
    }).join('');

    tables[1].tBodies[0].innerHTML = companies.map(function (company, index) {
      if (company.demo) index %= 5;
      var rate = percent(company.running, company.connected);
      var flatBattery = company.demo ? index === 4 : company === lastCatalogCompany;
      return '<tr data-company-id="' + esc(company.companyId) + '" data-scope-name="' + esc(company.companyName) + '"' + (company.demo ? ' data-dashboard-demo="true"' : '') + '>' +
        '<th scope="row"><span class="group-name">' + esc(company.companyName) + '<small>보유 ' + format(company.vehicleCount) + '대</small></span></th>' +
        efficiencyCell(76 + index, 80 + index, 'Km', true, false) +
        efficiencyCell((49 + index * .4).toFixed(1), (50 + index * .5).toFixed(1), 'H', true, false) +
        efficiencyCell(44 - index, 42 - index, 'ℓ', false, false) +
        efficiencyCell(42 + index, flatBattery ? 42 + index : 43 + index, 'kWh', false, false) +
        efficiencyCell(Math.max(0, rate - 2), rate, '%', true, true).replace('<td>', '<td class="hl">') + '</tr>';
    }).join('');
  }

  function renderCompanyTotals(selected) {
    if (!companyDimension || !companies.length) return;
    var scoped = selected || companies;
    function sum(key) { return scoped.reduce(function (total, company) { return total + (Number(company[key]) || 0); }, 0); }
    var total = sum('vehicleCount');
    var connected = sum('connected');
    var disconnected = sum('disconnected');
    var running = sum('running');
    var idle = sum('idle');
    var periodTitle = document.querySelector('.dashboard-period .dashboard-panel .panel-heading h3');
    if (periodTitle) periodTitle.textContent = scoped.length === companies.length ? '전체 보유 차량' : '조회 대상 차량';
    var liveDescription = document.querySelector('.dashboard-live .section-heading p');
    if (liveDescription) liveDescription.textContent = (scoped.length === companies.length ? '전체 보유' : '조회 대상') + ' 차량의 연결·가동·정비 상태';
    var fleetTotal = document.querySelector('.fleet-total');
    if (fleetTotal) {
      fleetTotal.querySelector('strong').textContent = format(total);
      fleetTotal.querySelector('.fleet-total__meta').textContent = scoped.length + '개 업체 합계';
      fleetTotal.querySelector('.fleet-total__label').textContent = scoped.length === companies.length ? '전체 보유 차량' : '조회 대상 차량';
    }
    var status = document.querySelectorAll('.live-summary .status-metric');
    if (status[0]) {
      var connectionRate = percent(connected, total);
      status[0].querySelector('.status-metric__rate').textContent = connectionRate + '%';
      status[0].querySelector('.status-metric__track').setAttribute('aria-label', total + '대 중 ' + connected + '대 연결');
      status[0].querySelector('.status-metric__track i').style.setProperty('--value', (connectionRate / 100).toFixed(2));
      var connectionValues = status[0].querySelectorAll('.status-metric__details b');
      connectionValues[0].textContent = format(connected);
      connectionValues[1].textContent = format(disconnected);
    }
    if (status[1]) {
      var operationRate = percent(running, connected);
      status[1].querySelector('.status-metric__rate').textContent = operationRate + '%';
      status[1].querySelector('.status-metric__track').setAttribute('aria-label', connected + '대 중 ' + running + '대 정상 가동');
      status[1].querySelector('.status-metric__track i').style.setProperty('--value', (operationRate / 100).toFixed(2));
      var operationValues = status[1].querySelectorAll('.status-metric__details b');
      operationValues[0].textContent = format(running);
      operationValues[1].textContent = format(idle);
    }
    var maintenanceValues = document.querySelectorAll('.maintenance-item strong');
    if (maintenanceValues[0]) maintenanceValues[0].textContent = format(sum('fault'));
    if (maintenanceValues[1]) maintenanceValues[1].textContent = format(sum('replacementNeeded'));
    if (maintenanceValues[2]) maintenanceValues[2].textContent = format(sum('replacementSoon'));

    var compareValues = [[0, 0, 'Km'], [0, 0, 'H'], [0, 0, 'ℓ'], [0, 0, 'kWh']];
    var efficiencyValues = [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0]];
    scoped.forEach(function (company) {
      var index = companies.findIndex(function (item) { return item.companyId === company.companyId; });
      var metric = companyMetricSeed(company, index), efficiency = companyEfficiencySeed(company, index);
      ['distance', 'time', 'fuel', 'battery'].forEach(function (key, i) { compareValues[i][0] += metric[key][0]; compareValues[i][1] += metric[key][1]; });
      efficiency.forEach(function (pair, i) { efficiencyValues[i][0] += pair[0] * company.vehicleCount; efficiencyValues[i][1] += pair[1] * company.vehicleCount; });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.dashboard-period .usage-compare-grid .compare-metric'), function (card, index) {
      var values = compareValues[index];
      if (!values) return;
      card.querySelector('.compare-metric__current').innerHTML = format(values[1]) + '<small>' + values[2] + '</small>';
      var trackValues = card.querySelectorAll('.compare-track b');
      if (trackValues[0]) trackValues[0].textContent = format(values[0]);
      if (trackValues[1]) trackValues[1].textContent = format(values[1]);
      var delta = deltaMeta(values[0], values[1], index < 2), badge = card.querySelector('.compare-metric__delta');
      if (badge) { badge.className = 'compare-metric__delta ' + delta.className; badge.textContent = delta.text; }
      Array.prototype.forEach.call(card.querySelectorAll('.compare-track__rail i'), function (rail, i) { rail.style.setProperty('--value', (values[i] / Math.max(values[0], values[1], 1)).toFixed(2)); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.efficiency-band .efficiency-item'), function (item, index) {
      var values = efficiencyValues[index].map(function (value) { return total ? value / total : 0; });
      var pair = item.querySelector('.efficiency-item__pair');
      pair.querySelector('span').textContent = values[0].toLocaleString('ko-KR', { maximumFractionDigits: 1 });
      pair.querySelector('strong').textContent = values[1].toLocaleString('ko-KR', { maximumFractionDigits: 1 });
      var delta = deltaMeta(values[0], values[1], index < 2 || index === 4), badge = item.querySelector('.efficiency-item__delta');
      if (index === 4) delta.text = (values[1] >= values[0] ? '+' : '−') + Math.abs(values[1] - values[0]).toFixed(1) + '%p';
      badge.className = 'efficiency-item__delta ' + delta.className; badge.textContent = delta.text;
    });
    if (selected) syncSummaryScope(scoped, total);
  }

  function syncSummaryScope(scoped, total) {
    if (!summaryLinks) summaryLinks = navigationLinks.filter(function (node) { return !!node.closest('.live-summary, .dashboard-period .usage-compare-grid, .efficiency-band'); }).map(function (node) {
      return { node: node, label: node.getAttribute('aria-label') };
    });
    var all = scoped.length === companies.length;
    var single = scoped.length === 1;
    summaryLinks.forEach(function (item) {
      var node = item.node, enabled = all || single;
      if (!enabled) {
        delete node.dataset.dashboardHref; node.classList.remove('miq-dashboard-link');
        ['role', 'tabindex', 'aria-label', 'title'].forEach(function (key) { node.removeAttribute(key); });
        return;
      }
      var url = new URL(node.dataset.dashboardBaseHref, location.href);
      url.searchParams.set('companyId', single ? scoped[0].companyId : 'all');
      if (url.searchParams.has('period')) {
        url.searchParams.set('period', committedReportPeriod.period);
        url.searchParams.set('from', committedReportPeriod.from); url.searchParams.set('to', committedReportPeriod.to);
      }
      node.dataset.dashboardHref = url.pathname + '?' + url.searchParams.toString();
      var label = node.classList.contains('fleet-total') ? (all ? '전체 보유 차량 ' : '조회 대상 차량 ') + format(total) + '대 요약정보 보기' : item.label;
      node.classList.add('miq-dashboard-link'); node.setAttribute('role', 'link'); node.setAttribute('tabindex', '0');
      node.setAttribute('aria-label', label); node.setAttribute('title', label);
    });
  }

  function applyDealerStaffScope() {
    if (!dealerStaffScope) return;
    document.body.dataset.dashboardDimension = 'assigned-group';

    var matrix = document.querySelector('.group-matrix');
    var matrixPanel = matrix && matrix.closest('.dashboard-panel');
    var performance = document.querySelector('.performance-table');
    var performancePanel = performance && performance.closest('.dashboard-panel');
    [matrixPanel, performancePanel].forEach(function (panel) {
      if (!panel) return;
      panel.hidden = true;
      panel.setAttribute('aria-hidden', 'true');
      panel.setAttribute('data-role-hidden', 'dealer_staff');
    });

    var liveDescription = document.querySelector('.dashboard-live .section-heading p');
    if (liveDescription) liveDescription.textContent = '담당 그룹 전체 차량의 연결·가동·정비 상태';
    var totalLabel = document.querySelector('.fleet-total__label');
    if (totalLabel) totalLabel.textContent = '담당 그룹 보유 차량';
    var totalMeta = document.querySelector('.fleet-total__meta');
    if (totalMeta) totalMeta.textContent = '담당 그룹 전체';
  }

  function entityForRow(row) {
    if (row.dataset.companyId) {
      return { companyId: row.dataset.companyId, label: row.dataset.scopeName || '업체' };
    }
    var groupNode = row.querySelector('.group-name small');
    var group = groupNode ? groupNode.textContent.trim() : '';
    return { companyId: '1933', group: group, label: group };
  }

  function reportHref(entity) {
    return href(REPORT, Object.assign({ companyId: entity.companyId, company: entity.label, group: entity.group }, committedReportPeriod));
  }

  function linkReportName(row) {
    var entity = entityForRow(row);
    // The existing customer-staff report only permits the assigned group.
    if (role === 'customer_staff' && entity.group !== '물류1팀') return;
    var name = row.querySelector('th .group-name');
    if (!name) return;
    var anchor = document.createElement('a');
    anchor.className = 'dashboard-report-link';
    anchor.setAttribute('data-dashboard-report-link', '');
    anchor.setAttribute('title', '현황 리포트 보기');
    anchor.setAttribute('aria-label', entity.label + ' 현황 리포트 보기');
    anchor.href = reportHref(entity);
    name.parentNode.insertBefore(anchor, name);
    anchor.appendChild(name);
    reportLinks.push({ anchor: anchor, entity: entity });
  }

  function syncReportPeriod(detail) {
    var period = detail.period || { D: 'd', W: 'w', M: 'm' }[detail.periodTypeCode];
    var dates = MIQCommon.dates;
    if (['d', 'w', 'm'].indexOf(period) < 0 || !dates.parse(detail.startDate) || !dates.parse(detail.endDate) || detail.startDate > detail.endDate) return;
    committedReportPeriod = { period: period, from: detail.startDate, to: period === 'd' ? detail.startDate : detail.endDate };
    reportLinks.forEach(function (item) { item.anchor.href = reportHref(item.entity); });
  }

  function syncPeriodLinks(detail) {
    var codes = { D: 'd', W: 'w', M: 'm', C: 'c' };
    var period = codes[detail && detail.periodTypeCode] || 'm';
    navigationLinks.forEach(function (node) {
      ['dashboardHref', 'dashboardBaseHref'].forEach(function (key) {
      if (!node.dataset[key]) return;
      var url = new URL(node.dataset[key], location.href);
      if (!url.searchParams.has('period')) return;
      url.searchParams.set('period', period);
      if (detail && detail.startDate && detail.endDate) {
        url.searchParams.set('from', detail.startDate);
        url.searchParams.set('to', detail.endDate);
      } else {
        url.searchParams.delete('from');
        url.searchParams.delete('to');
      }
      node.dataset[key] = url.pathname + '?' + url.searchParams.toString();
      });
    });
  }

  renderCompanyTotals();
  renderCompanyMatrix();
  renderCompanyPerformance();
  applyDealerStaffScope();
  window.MIQDashboardCompanyView = { role: role, companies: companies, updateSummary: renderCompanyTotals };
  Array.prototype.forEach.call(document.querySelectorAll('.group-matrix tbody tr, .performance-table tbody tr'), linkReportName);

  var totalNode = document.querySelector('.fleet-total');
  var totalCount = totalNode && totalNode.querySelector('strong') ? totalNode.querySelector('strong').textContent.trim() : '42';
  link(totalNode, href(SUMMARY, { period: 'm' }), '전체 보유 차량 ' + totalCount + '대 요약정보 보기');

  var status = document.querySelectorAll('.live-summary .status-metric');
  if (status[0]) {
    link(status[0].querySelector('.status-metric__rate'), href(MAP, { connection: 'connected' }), '통신 연결 차량 지도에서 보기');
    var connectionDetails = status[0].querySelectorAll('.status-metric__details span');
    link(connectionDetails[0], href(MAP, { connection: 'connected' }), '연결 차량 지도에서 보기');
    link(connectionDetails[1], href(MAP, { connection: 'disconnected' }), '미연결 차량 지도에서 보기');
  }
  if (status[1]) {
    link(status[1].querySelector('.status-metric__rate'), href(MAP, { operation: 'running' }), '가동 차량 지도에서 보기');
    var operationDetails = status[1].querySelectorAll('.status-metric__details span');
    link(operationDetails[0], href(MAP, { operation: 'running' }), '정상 가동 차량 지도에서 보기');
    link(operationDetails[1], href(MAP, { operation: 'idle' }), '유휴 차량 지도에서 보기');
  }

  var maintenance = document.querySelectorAll('.maintenance-item');
  link(maintenance[0], href(ERROR, { state: 'current' }), '현재 고장 차량 에러에서 보기');
  link(maintenance[1], href(SUPPLY, { state: 'need' }), '교체 필요 소모품 보기');
  link(maintenance[2], href(SUPPLY, { state: 'soon' }), '교체 임박 소모품 보기');

  Array.prototype.forEach.call(document.querySelectorAll('.group-matrix tbody tr'), function (row) {
    var entity = entityForRow(row);
    var cells = row.querySelectorAll('td');
    var targets = [
      [SUMMARY, { period: 'm' }, '보유 차량 요약정보'],
      [MAP, { connection: 'connected' }, '연결 차량 지도'],
      [MAP, { connection: 'disconnected' }, '미연결 차량 지도'],
      [MAP, { operation: 'running' }, '가동 차량 지도'],
      [MAP, { operation: 'idle' }, '유휴 차량 지도'],
      [MAP, { operation: 'running' }, '가동률 기준 차량 지도'],
      [ERROR, { state: 'current' }, '고장 차량 에러'],
      [SUPPLY, { state: 'need' }, '교체 필요 소모품'],
      [SUPPLY, { state: 'soon' }, '교체 임박 소모품']
    ];
    targets.forEach(function (target, index) {
      var values = Object.assign({}, target[1], { companyId: entity.companyId });
      if (entity.group) values.group = entity.group;
      link(cells[index], href(target[0], values), entity.label + ' ' + target[2]);
    });
  });

  var metricKeys = ['distance', 'time', 'fuel', 'battery'];
  Array.prototype.forEach.call(document.querySelectorAll('.usage-compare-grid .compare-metric'), function (card, index) {
    link(card, href(SUMMARY, { period: 'm', metric: metricKeys[index], dir: 'desc' }), card.querySelector('.compare-metric__label').textContent.trim() + ' 높은 순 차량 보기');
  });

  var efficiencyKeys = ['distance', 'time', 'fuel', 'battery', 'efficiency'];
  Array.prototype.forEach.call(document.querySelectorAll('.efficiency-band .efficiency-item'), function (item, index) {
    link(item, href(SUMMARY, { period: 'm', metric: efficiencyKeys[index], dir: 'desc' }), item.querySelector('.efficiency-item__label').textContent.trim() + ' 기준 차량 보기');
  });

  Array.prototype.forEach.call(document.querySelectorAll('.performance-table'), function (table, tableIndex) {
    Array.prototype.forEach.call(table.querySelectorAll('tbody tr'), function (row) {
      var entity = entityForRow(row);
      var keys = tableIndex === 0 ? metricKeys : efficiencyKeys;
      Array.prototype.forEach.call(row.querySelectorAll('td'), function (cell, cellIndex) {
        var heading = table.querySelectorAll('thead th')[cellIndex + 1];
        var values = { companyId: entity.companyId, period: 'm', metric: keys[cellIndex], dir: 'desc' };
        if (entity.group) values.group = entity.group;
        link(cell, href(SUMMARY, values), entity.label + ' ' + (heading ? heading.textContent.trim() : '성과') + ' 기준 차량');
      });
    });
  });

  window.addEventListener('miq:period-change', function (event) {
    syncReportPeriod(event.detail || {});
    syncPeriodLinks(event.detail || {});
  });
})();
