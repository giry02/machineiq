(function () {
  'use strict';

  var body = document.body;
  if (!body || !body.classList.contains('miq-usage-time')) return;

  var QUERY = new URLSearchParams(location.search);
  var FLEET = window.MIQ && Array.isArray(MIQ.FLEET_CATALOG) && MIQ.FLEET_CATALOG.length ? MIQ.FLEET_CATALOG : window.MIQ && MIQ.FLEET ? MIQ.FLEET : [];
  var MIN_OPERATING_MINUTES = 30;
  var LATEST_DATE = new Date();
  LATEST_DATE.setHours(12, 0, 0, 0);
  LATEST_DATE.setDate(LATEST_DATE.getDate() - 1);
  var WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
  var feedback = document.getElementById('metricsFeedback');
  var scopeContext = window.MIQ_TARGET_CONTEXT || null;
  var context = {
    companyId: QUERY.get('companyId') || 'all',
    group: QUERY.get('group') || null,
    type: QUERY.get('type') || null,
    veh: QUERY.get('veh') || QUERY.get('equipmentId') || null
  };
  function inSelectedCompany(vehicle) {
    return !context.companyId || context.companyId === 'all' || String(vehicle.companyId || '1933') === String(context.companyId);
  }
  var defaultFrom = new Date(LATEST_DATE.getFullYear(), LATEST_DATE.getMonth(), 1, 12, 0, 0, 0);
  var requestedFrom = parseDate(QUERY.get('from'));
  var requestedTo = parseDate(QUERY.get('to'));
  var initialTo = requestedTo && requestedTo <= LATEST_DATE ? requestedTo : new Date(LATEST_DATE.getTime());
  var initialFrom = requestedFrom && requestedFrom <= initialTo ? requestedFrom : defaultFrom;
  var state = {
    year: initialTo.getFullYear(),
    month: initialTo.getMonth() + 1,
    period: normalizePeriod(QUERY.get('period')) || 'm',
    from: formatDateValue(initialFrom),
    to: formatDateValue(initialTo),
    rows: FLEET,
    label: '전체차량',
    selection: null
  };

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function pad(value) { return value < 10 ? '0' + value : String(value); }

  function isoDate(year, month, day) {
    return year + '-' + pad(month) + '-' + pad(day);
  }

  function formatDateValue(date) {
    return isoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
  }

  function normalizePeriod(value) {
    return { d: 'd', day: 'd', w: 'w', week: 'w', m: 'm', month: 'm', c: 'c', custom: 'c' }[String(value || '').toLowerCase()] || '';
  }

  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    var parts = value.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return null;
    return date;
  }

  function monthLastDay(year, month) { return new Date(year, month, 0).getDate(); }

  function addDays(date, amount) {
    var value = new Date(date.getTime());
    value.setDate(value.getDate() + amount);
    return value;
  }

  function inSelectedRange(year, month, day) {
    var value = isoDate(year, month, day);
    return value >= state.from && value <= state.to;
  }

  function setFeedback(message, isError) {
    if (!feedback) return;
    feedback.textContent = message || '';
    feedback.classList.toggle('is-error', !!isError);
  }

  function setQuery(values) {
    var url = new URL(location.href);
    Object.keys(values).forEach(function (key) {
      var value = values[key];
      if (value === null || value === undefined || value === '') url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    history.replaceState({}, '', url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash);
    document.dispatchEvent(new CustomEvent('miq:query-change', {
      detail: { query: url.searchParams.toString() }
    }));
  }

  function contextualHref(path, extra) {
    var url = new URL(path, location.href);
    var values = {
      role: body.dataset.managementRole || QUERY.get('role') || 'internal',
      companyId: context.companyId,
      group: context.group,
      type: context.type,
      veh: context.veh,
      period: state.period,
      from: state.from,
      to: state.to
    };
    Object.keys(extra || {}).forEach(function (key) { values[key] = extra[key]; });
    Object.keys(values).forEach(function (key) {
      var value = values[key];
      if (value === null || value === undefined || value === '') url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    });
    return url.pathname + (url.searchParams.toString() ? '?' + url.searchParams.toString() : '') + url.hash;
  }

  function syncContextLinks() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-context-link]'), function (link) {
      if (link.hasAttribute('data-miq-side-sub')) return;
      var source = link.getAttribute('href');
      if (!source || /^#|^javascript:/i.test(source)) return;
      link.href = contextualHref(source);
    });
  }

  function vehicleByVin(vin) {
    return FLEET.filter(function (vehicle) { return vehicle.vin === vin; })[0] || null;
  }

  function seeded(key) {
    var seed = 0;
    for (var index = 0; index < key.length; index++) seed = (seed * 31 + key.charCodeAt(index)) >>> 0;
    return function () {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed / 0x7fffffff;
    };
  }

  function isUncollected(year, month, day) {
    return new Date(year, month - 1, day, 12, 0, 0, 0) > LATEST_DATE;
  }

  function vehicleDay(vehicle, year, month, day) {
    var random = seeded(vehicle.vin + '|' + year + pad(month) + pad(day));
    var weekday = new Date(year, month - 1, day).getDay();
    var work;
    if (weekday === 0) {
      work = random() < .12 ? Math.round(random() * 45) : 0;
    } else if (weekday === 6) {
      work = random() < .55 ? Math.round(70 + random() * 190) : Math.round(random() * 22);
    } else {
      work = random() < .10 ? Math.round(random() * 27) : Math.round(300 + random() * 250);
    }
    var distancePerHour = vehicle.type === '엔진' ? 13 + random() * 11 : 5 + random() * 8;
    return {
      vehicle: vehicle,
      work: work,
      distance: Math.round(work / 60 * distancePerHour * 10) / 10
    };
  }

  function dayAggregate(year, month, day) {
    if (isUncollected(year, month, day)) return null;
    var rows = state.rows.map(function (vehicle) { return vehicleDay(vehicle, year, month, day); });
    var aggregate = { rows: rows, work: 0, distance: 0, operating: 0 };
    rows.forEach(function (row) {
      aggregate.work += row.work;
      aggregate.distance += row.distance;
      if (row.work >= MIN_OPERATING_MINUTES) aggregate.operating++;
    });
    return aggregate;
  }

  function formatMinutesHtml(minutes) {
    minutes = Math.max(0, Math.round(minutes || 0));
    return Math.floor(minutes / 60).toLocaleString() + '<small>H</small> ' + pad(minutes % 60) + '<small>M</small>';
  }

  function formatMinutesText(minutes) {
    minutes = Math.max(0, Math.round(minutes || 0));
    return Math.floor(minutes / 60).toLocaleString() + 'H ' + pad(minutes % 60) + 'M';
  }

  function formatDistanceHtml(distance) {
    return Math.round(distance || 0).toLocaleString() + '<small>km</small>';
  }

  function formatDistanceText(distance) {
    return Math.round(distance || 0).toLocaleString() + 'km';
  }

  function aggregateRange() {
    var totals = { work: 0, distance: 0, operating: 0, operatingDays: 0, collectedDays: 0, records: [] };
    var cursor = parseDate(state.from);
    var end = parseDate(state.to);
    if (!cursor || !end) return totals;
    while (cursor <= end) {
      var year = cursor.getFullYear();
      var month = cursor.getMonth() + 1;
      var day = cursor.getDate();
      var aggregate = dayAggregate(year, month, day);
      if (aggregate) {
        totals.work += aggregate.work;
        totals.distance += aggregate.distance;
        totals.operating += aggregate.operating;
        totals.collectedDays++;
        if (aggregate.operating > 0) totals.operatingDays++;
        totals.records.push({ year: year, month: month, day: day, aggregate: aggregate });
      }
      cursor = addDays(cursor, 1);
    }
    return totals;
  }

  function renderCalendar(totals) {
    var firstWeekday = new Date(state.year, state.month - 1, 1).getDay();
    var lastDay = monthLastDay(state.year, state.month);
    var html = '';

    WEEKDAYS.forEach(function (weekday, index) {
      html += '<div class="cal__dow' + (index === 0 ? ' sun' : index === 6 ? ' sat' : '') + '">' + weekday + '</div>';
    });
    for (var blank = 0; blank < firstWeekday; blank++) html += '<div class="cal__day void" aria-hidden="true"></div>';

    for (var day = 1; day <= lastDay; day++) {
      var weekdayIndex = new Date(state.year, state.month - 1, day).getDay();
      var selected = inSelectedRange(state.year, state.month, day);
      var aggregate = selected ? dayAggregate(state.year, state.month, day) : null;
      var dayClass = weekdayIndex === 0 ? ' sun' : weekdayIndex === 6 ? ' sat' : '';
      var cellClass = 'cal__day';
      if (!selected) cellClass += ' is-outside-range';
      if (selected && !aggregate) cellClass += ' void';
      if (state.year === LATEST_DATE.getFullYear() && state.month === LATEST_DATE.getMonth() + 1 && day === LATEST_DATE.getDate()) cellClass += ' today';
      html += '<div class="' + cellClass + '"' + (aggregate ? ' data-day="' + day + '" role="button" tabindex="0"' : '') + '>';
      html += '<div class="cal__d' + dayClass + '">' + day + '</div>';
      if (!aggregate) {
        html += '<div class="empty">' + (selected ? '집계 전' : '선택 범위 밖') + '</div>';
      } else {
        html += '<div class="ct' + (aggregate.work === 0 ? ' zero' : '') + '">';
        html += '<div class="ct__row work"><span class="ct__k">작업시간</span><span class="ct__v">' + formatMinutesHtml(aggregate.work) + '</span></div>';
        html += '<div class="ct__row"><span class="ct__k">이동거리</span><span class="ct__v">' + formatDistanceHtml(aggregate.distance) + '</span></div>';
        html += '<div class="ct__row"><span class="ct__k">운영 장비 수</span><span class="ct__v">' + aggregate.operating + '<small>대</small></span></div>';
        html += '</div>';
      }
      html += '</div>';
    }

    var trailing = (7 - (firstWeekday + lastDay) % 7) % 7;
    for (var tail = 0; tail < trailing; tail++) html += '<div class="cal__day void" aria-hidden="true"></div>';

    var calendar = document.getElementById('usageCalendar');
    calendar.innerHTML = html;
    Array.prototype.forEach.call(calendar.querySelectorAll('.cal__day[data-day]'), function (cell) {
      var day = Number(cell.getAttribute('data-day'));
      var record = totals.records.filter(function (item) {
        return item.year === state.year && item.month === state.month && item.day === day;
      })[0];
      if (!record) return;
      var label = isoDate(state.year, state.month, day) + ', 총 작업시간 ' + formatMinutesText(record.aggregate.work)
        + ', 총 이동거리 ' + formatDistanceText(record.aggregate.distance) + ', 운영 장비 ' + record.aggregate.operating + '대. 상세 보기';
      cell.setAttribute('aria-label', label);
      cell.setAttribute('data-chart-tip', label);
      cell.addEventListener('click', function () { openDay(day, record.aggregate); });
      cell.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDay(day, record.aggregate);
        }
      });
    });
    if (window.MIQCharts) MIQCharts.bind(calendar);
  }

  function renderSummary(totals) {
    var from = parseDate(state.from);
    var to = parseDate(state.to);
    var isSameMonth = from.getFullYear() === to.getFullYear() && from.getMonth() === to.getMonth();
    var title = state.from === state.to
      ? from.getFullYear() + '년 ' + (from.getMonth() + 1) + '월 ' + from.getDate() + '일 요약'
      : (state.period === 'm' && isSameMonth)
        ? to.getFullYear() + '년 ' + (to.getMonth() + 1) + '월 요약'
        : state.from.replace(/-/g, '.') + ' ~ ' + state.to.replace(/-/g, '.') + ' 요약';
    document.getElementById('usageSummaryTitle').textContent = title;
    document.getElementById('usageSumWork').innerHTML = formatMinutesHtml(totals.work);
    document.getElementById('usageSumDistance').innerHTML = formatDistanceHtml(totals.distance);
    var averageOperating = totals.operatingDays ? Math.round(totals.operating / totals.operatingDays * 10) / 10 : 0;
    document.getElementById('usageSumOperating').innerHTML = averageOperating.toLocaleString() + '<small>대</small>';
    var selectedDays = Math.round((to - from) / 86400000) + 1;
    var meta = '조회 기간 ' + selectedDays + '일 · 집계 완료 ' + totals.collectedDays + '일';
    document.getElementById('usageSummaryMeta').textContent = meta;
  }

  function vehicleDetailHref(vehicle, day) {
    return contextualHref('../Vehicle%20Detail/vehicle-detail-tobe.html', {
      veh: vehicle.vin,
      group: vehicle.group,
      type: vehicle.type,
      period: 'd',
      from: isoDate(state.year, state.month, day),
      to: isoDate(state.year, state.month, day)
    });
  }

  function openDay(day, aggregate) {
    var weekday = WEEKDAYS[new Date(state.year, state.month - 1, day).getDay()];
    document.getElementById('dayModalTitle').textContent = isoDate(state.year, state.month, day) + ' (' + weekday + ') 운행시간 상세';
    document.getElementById('usageDaySummary').innerHTML =
      '<div class="cell"><div class="cell__v">' + formatMinutesHtml(aggregate.work) + '</div><div class="cell__k">총 작업시간</div></div>'
      + '<div class="cell"><div class="cell__v">' + formatDistanceHtml(aggregate.distance) + '</div><div class="cell__k">총 이동거리</div></div>'
      + '<div class="cell hl"><div class="cell__v">' + aggregate.operating + '<small>대</small></div><div class="cell__k">운영 장비 수 (30분 이상)</div></div>';
    document.getElementById('usageDayMeta').textContent = state.rows.length + '대 중 운영 ' + aggregate.operating + '대 · 작업시간 내림차순';
    document.getElementById('usageDayRows').innerHTML = aggregate.rows.slice().sort(function (left, right) { return right.work - left.work; }).map(function (row) {
      var operating = row.work >= MIN_OPERATING_MINUTES;
      return '<tr><td class="strong"><a class="metrics-vehicle-link" href="' + escapeHtml(vehicleDetailHref(row.vehicle, day)) + '">' + escapeHtml(row.vehicle.model)
        + ' <span class="mute">' + escapeHtml(row.vehicle.vin) + '</span></a></td><td>' + escapeHtml(row.vehicle.type) + '</td><td class="mute">' + escapeHtml(row.vehicle.group) + '</td>'
        + '<td class="r ' + (operating ? 'strong' : 'mute') + '">' + formatMinutesText(row.work) + '</td><td class="r ' + (operating ? '' : 'mute') + '">' + formatDistanceText(row.distance) + '</td>'
        + '<td class="c"><span class="usage-status' + (operating ? ' is-operating' : '') + '">' + (operating ? '운영' : '미운영') + '</span></td></tr>';
    }).join('');
    document.getElementById('dayEfficiencyLink').href = contextualHref('../Operational%20Efficiency/operational-efficiency-tobe.html', {
      period: 'd',
      from: isoDate(state.year, state.month, day),
      to: isoDate(state.year, state.month, day)
    });
    document.getElementById('dayModal').classList.add('open');
  }

  function updateLocation() {
    setQuery({
      companyId: context.companyId,
      group: context.group,
      type: context.type,
      veh: context.veh,
      period: state.period,
      from: state.from,
      to: state.to
    });
    syncContextLinks();
  }

  function render() {
    var rangeEnd = parseDate(state.to) || LATEST_DATE;
    state.year = rangeEnd.getFullYear();
    state.month = rangeEnd.getMonth() + 1;
    var totals = aggregateRange();
    renderCalendar(totals);
    renderSummary(totals);
    var scopeHost = document.getElementById('usageScopeSummary');
    if (scopeHost && window.MIQ && typeof MIQ.renderScopeSummary === 'function') {
      var target = scopeContext || {
        scopeSegments: [
          { key: 'company', label: context.companyId === 'all' ? '전체 업체' : (state.rows[0] && state.rows[0].companyName || '선택 업체') },
          { key: 'group', label: context.group || '전체 그룹' },
          { key: 'type', label: context.type || '전체 분류' }
        ]
      };
      MIQ.renderScopeSummary(scopeHost, target, { countLabel: '차량', count: state.rows.length, countUnit: '대', includeVehicle: true });
    }
    updateLocation();
  }

  function applyContextSelection() {
    var selectedRows = FLEET.filter(function (vehicle) {
      if (!inSelectedCompany(vehicle)) return false;
      if (context.group && vehicle.group !== context.group) return false;
      if (context.type && vehicle.type !== context.type) return false;
      if (context.veh && vehicle.vin !== context.veh) return false;
      return true;
    });
    state.rows = selectedRows;
    state.label = ([context.group, context.type, context.veh].filter(Boolean).join(' · ') || '전체차량');
    render();
  }

  function exportCsv() {
    var rows = ['일자,총 작업시간,총 이동거리,운영 장비 수,수집 상태'];
    var cursor = parseDate(state.from);
    var end = parseDate(state.to);
    while (cursor && end && cursor <= end) {
      var year = cursor.getFullYear();
      var month = cursor.getMonth() + 1;
      var day = cursor.getDate();
      var aggregate = dayAggregate(year, month, day);
      if (!aggregate) {
        rows.push([isoDate(year, month, day), '', '', '', '집계 전'].join(','));
      } else {
        rows.push([isoDate(year, month, day), formatMinutesText(aggregate.work), Math.round(aggregate.distance) + 'km', aggregate.operating, '집계 완료'].join(','));
      }
      cursor = addDays(cursor, 1);
    }
    var blob = new Blob(['\ufeff' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var href = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = href;
    link.download = 'machine-iq-usage-time-' + state.from + '-' + state.to + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(href);
    setFeedback(state.from + '부터 ' + state.to + '까지의 운행시간 집계 결과를 CSV로 내보냈습니다.', false);
  }

  document.getElementById('usageFilter').addEventListener('miq:period-change', function (event) {
    var detail = event.detail || {};
    var from = parseDate(detail.startDate);
    var to = parseDate(detail.endDate);
    if (!from || !to || from > to) return;
    state.period = normalizePeriod(detail.period) || 'c';
    state.from = formatDateValue(from);
    state.to = formatDateValue(to > LATEST_DATE ? LATEST_DATE : to);
    render();
    setFeedback(state.from + '부터 ' + state.to + '까지 조회가 완료되었습니다.', false);
  });
  document.getElementById('usageExport').addEventListener('click', exportCsv);

  document.addEventListener('miq:target-change', function (event) {
    var target = event.detail || {};
    scopeContext = target;
    context.companyId = target.companyId || context.companyId;
    context.group = target.group || null;
    context.type = target.type || null;
    context.veh = target.equipmentId || null;
    applyContextSelection();
  });

  applyContextSelection();
})();
