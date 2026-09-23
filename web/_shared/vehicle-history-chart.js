/* Vehicle-history prototype series. Allocations reproduce the displayed period
   totals; they are mock distributions, not collected hourly/daily telemetry. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.MIQVehicleHistory = api; api.mount(root); }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function validNumber(value) { return typeof value === 'number' && isFinite(value) && value >= 0; }
  function random(key) {
    var seed = 2166136261;
    for (var i = 0; i < key.length; i++) { seed ^= key.charCodeAt(i); seed = Math.imul(seed, 16777619); }
    return (seed >>> 0) / 4294967295;
  }
  function previousDate(date) {
    var parts = String(date).split('-').map(Number);
    var target = new Date(Date.UTC(parts[0], parts[1] - 2, parts[2]));
    return target.getUTCDate() === parts[2] ? target.toISOString().slice(0, 10) : null;
  }
  function factor(period, count) { return period === 'd' ? 1 / 22 : period === 'w' ? 1 / 4.3 : period === 'm' ? 1 : count / 30; }
  function allocate(total, weights) {
    if (total === null) return weights.map(function () { return null; });
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    if (!sum) return weights.map(function () { return null; });
    var exact = weights.map(function (weight) { return total * weight / sum; });
    var values = exact.map(Math.floor);
    var remainder = total - values.reduce(function (a, b) { return a + b; }, 0);
    exact.map(function (value, index) { return { index: index, fraction: value - values[index] }; })
      .filter(function (item) { return weights[item.index] > 0; })
      .sort(function (a, b) { return b.fraction - a.fraction || a.index - b.index; })
      .slice(0, remainder).forEach(function (item) { values[item.index]++; });
    return values;
  }
  function build(vehicle, period, axis) {
    var dates = axis.dates || [], count = dates.length;
    var prevDates = dates.map(previousDate);
    var known = !!vehicle && !vehicle.catalogOnly;
    var multiplier = factor(period, count);
    var minuteTotal = known && validNumber(vehicle.min) ? Math.round(vehicle.min * multiplier) : null;
    var shockTotal = known && validNumber(vehicle.shock) ? Math.round(vehicle.shock * multiplier) : null;
    var efficiency = known && validNumber(vehicle.efficiencyRate) ? vehicle.efficiencyRate
      : known && vehicle.type !== '엔진' && validNumber(vehicle.eff) ? vehicle.eff : null;
    var vin = vehicle && vehicle.vin || '';
    function make(isPrevious) {
      var sourceDates = isPrevious ? prevDates : dates;
      var weights = sourceDates.map(function (date, index) {
        if (!date) return 0;
        var value = .35 + random(vin + ':' + date + ':' + (period === 'd' ? index : 'day'));
        return period === 'd' && (index < 7 || index > 18) ? value * .08 : value;
      });
      var previousScale = .82 + random(vin + ':previous:' + (dates[0] || '')) * .3;
      var minutes = allocate(minuteTotal === null ? null : Math.round(minuteTotal * (isPrevious ? previousScale : 1)), weights);
      var shocks = allocate(shockTotal === null ? null : Math.round(shockTotal * (isPrevious ? previousScale : 1)), weights);
      return sourceDates.map(function (date, index) {
        var key = vin + ':' + date + ':' + (period === 'd' ? index : 'day');
        return {
          date: date,
          hour: period === 'd' ? index : null,
          minute: date ? minutes[index] : null,
          hourValue: date && minutes[index] !== null ? minutes[index] / 60 : null,
          shock: date ? shocks[index] : null,
          eff: date && efficiency !== null ? (efficiency === 0 ? 0 : Math.round(Math.max(0, Math.min(100, efficiency + (random(key + ':eff') - .5) * 12)) * 10) / 10) : null
        };
      });
    }
    return { current: make(false), previous: make(true), minuteTotal: minuteTotal, shockTotal: shockTotal, mock: true };
  }

  function mount(root) {
    var document = root.document;
    var wrap = document && document.getElementById('chartWrap');
    if (!wrap || !root.MIQCharts) return;
    var charts = root.MIQCharts, dates = root.MIQCommon.dates;
    var svg = document.getElementById('vehicleHistoryChart');
    var empty = document.getElementById('vehicleHistoryEmpty');
    var unit = document.getElementById('graphUnit');
    var currentLegend = document.getElementById('historyCurrentLabel');
    var key = 'eff', range = null, vehicle = null, resizeTimer;
    var METRICS = { eff: { label: '운영효율', unit: '%' }, shock: { label: '충격 횟수', unit: '건' }, hour: { label: '운행시간', unit: 'H' } };
    function normalize(value) { return String(value || '').replace(/[-_]/g, '').toLowerCase(); }
    function readVehicle() {
      var query = new URLSearchParams(root.location.search);
      var id = query.get('veh') || query.get('equipmentId') || document.body.dataset.currentVin;
      var fleet = root.MIQ && (root.MIQ.FLEET_CATALOG || root.MIQ.FLEET) || [];
      vehicle = fleet.filter(function (item) { return normalize(item.vin) === normalize(id); })[0] || null;
    }
    function readRange() {
      var query = new URLSearchParams(root.location.search);
      var mode = { day: 'd', daily: 'd', week: 'w', weekly: 'w', month: 'm', monthly: 'm', custom: 'c' }[query.get('period')] || query.get('period') || 'm';
      if (['d', 'w', 'm', 'c'].indexOf(mode) === -1) mode = 'm';
      var from = query.get('from'), to = query.get('to');
      var a = dates.parse(from), b = dates.parse(to);
      if (!a || !b || a > b || dates.dayCount(a, b) > 366) {
        var fallback = dates.operatingRange(mode === 'c' ? 'm' : mode, dates.yesterday());
        from = fallback.from; to = fallback.to;
      }
      range = { period: mode, from: from, to: mode === 'd' ? from : to };
    }
    function value(row) { return row[key === 'hour' ? 'hourValue' : key]; }
    function formatted(row) {
      if (!row.date) return '해당 일자 없음';
      if (value(row) === null) return '수집 전';
      if (key === 'hour') return Math.floor(row.minute / 60) + 'H ' + String(row.minute % 60).padStart(2, '0') + 'M';
      return value(row).toLocaleString('ko-KR', { maximumFractionDigits: 0 }) + METRICS[key].unit;
    }
    function actualDate(row) { return row.date ? row.date + (row.hour !== null ? ' ' + String(row.hour).padStart(2, '0') + '시' : '') : '해당 일자 없음'; }
    function draw() {
      if (!svg || !range) return;
      charts.hide();
      var axis = charts.axis(range.period, range.from, range.to);
      var data = build(vehicle, range.period, axis);
      var values = data.current.concat(data.previous).map(value).filter(function (v) { return v !== null; });
      var metric = METRICS[key];
      currentLegend.textContent = range.period === 'm' ? '선택 월' : '선택 기간';
      unit.textContent = '단위: ' + metric.unit;
      empty.hidden = values.length > 0;
      // SVGElement does not reflect a .hidden property into the hidden attribute.
      svg.toggleAttribute('hidden', !values.length);
      if (!values.length) { svg.innerHTML = ''; return; }
      var width = Math.max(640, Math.round(svg.getBoundingClientRect().width) || 960);
      var left = 48, right = width - 14, top = 20, bottom = 282, height = 330;
      svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
      svg.setAttribute('aria-label', metric.label + ', ' + range.from + '부터 ' + range.to + '까지 전월 같은 일자 비교');
      var maximum = key === 'eff' ? 100 : Math.max.apply(null, values);
      var step = key === 'eff' ? 20 : .1;
      if (key === 'hour') {
        var choices = [.1, .2, .5, 1, 2, 5, 10, 20, 50, 100];
        step = choices.filter(function (choice) { return choice * 5 >= maximum; })[0] || Math.ceil(maximum / 5);
      }
      maximum = key === 'eff' ? 100 : Math.max(step * 5, Math.ceil(maximum / step) * step);
      var countAxis = key === 'shock' ? charts.countsAxis(values) : null;
      if (countAxis) { maximum = countAxis.max; step = countAxis.step; }
      function x(i) { return left + (right - left) * (axis.n === 1 ? .5 : i / (axis.n - 1)); }
      function y(v) { return bottom - v / maximum * (bottom - top); }
      function number(v) { return Math.round(v * 10) / 10; }
      var html = '';
      for (var tick = 0; tick <= Math.round(maximum / step); tick++) {
        var amount = Math.round(tick * step * 100) / 100, yy = number(y(amount));
        html += '<line class="grid" x1="' + left + '" y1="' + yy + '" x2="' + right + '" y2="' + yy + '"/>'
          + '<text x="' + (left - 9) + '" y="' + (yy + 4) + '" text-anchor="end">' + amount + metric.unit + '</text>';
      }
      html += '<line class="axis" x1="' + left + '" y1="' + bottom + '" x2="' + right + '" y2="' + bottom + '"/>'
        + '<line class="axis" x1="' + left + '" y1="' + top + '" x2="' + left + '" y2="' + bottom + '"/>';
      [data.previous, data.current].forEach(function (rows, seriesIndex) {
        var color = seriesIndex ? '#ff3600' : '#c8c8c8', segments = [], points = [], dots = '';
        rows.forEach(function (row, index) {
          if (value(row) === null) { if (points.length) segments.push(points); points = []; return; }
          var xx = number(x(index)), yy = number(y(value(row)));
          points.push(xx + ',' + yy);
          dots += '<circle cx="' + xx + '" cy="' + yy + '" r="3" fill="' + color + '"/>';
        });
        if (points.length) segments.push(points);
        html += segments.map(function (segment) { return '<polyline class="ln" stroke="' + color + '" points="' + segment.join(' ') + '"/>'; }).join('') + dots;
      });
      axis.labels.forEach(function (label, index) {
        var xx = number(x(index)), band = axis.n === 1 ? right - left : (right - left) / (axis.n - 1);
        var hitStart = Math.max(left, xx - band / 2), hitEnd = Math.min(right, xx + band / 2);
        var tip = metric.label + '\n' + currentLegend.textContent + ' ' + actualDate(data.current[index]) + ': ' + formatted(data.current[index])
          + '\n전월 ' + actualDate(data.previous[index]) + ': ' + formatted(data.previous[index]);
        html += '<g class="col history-point" data-history-index="' + index + '" ' + charts.tipAttrs(tip) + '>'
          + '<line class="vline" x1="' + xx + '" y1="' + top + '" x2="' + xx + '" y2="' + bottom + '"/>'
          + '<rect class="hit" x="' + number(hitStart) + '" y="' + top + '" width="' + number(hitEnd - hitStart) + '" height="' + (bottom - top) + '"/></g>';
        var tickLabel = charts.tickLabel(axis.labels, index, right - left);
        if (tickLabel) html += '<text x="' + xx + '" y="' + (bottom + 23) + '" text-anchor="middle">' + charts.escape(tickLabel) + '</text>';
      });
      svg.innerHTML = html;
    }
    charts.bind(wrap);
    document.querySelector('.graph-radios').addEventListener('click', function (event) {
      var button = event.target.closest('[data-graph]');
      if (!button || !METRICS[button.dataset.graph]) return;
      key = button.dataset.graph;
      Array.prototype.forEach.call(button.parentNode.children, function (item) {
        var active = item === button; item.classList.toggle('active', active); item.setAttribute('aria-pressed', String(active));
      });
      draw();
    });
    document.addEventListener('miq:period-change', function (event) {
      var detail = event.detail || {}, mode = detail.period || { D: 'd', W: 'w', M: 'm', C: 'c' }[detail.periodTypeCode];
      if (!mode || !dates.parse(detail.startDate) || !dates.parse(detail.endDate)) return;
      range = { period: mode, from: detail.startDate, to: mode === 'd' ? detail.startDate : detail.endDate }; draw();
    });
    document.addEventListener('miq:target-change', function () { readVehicle(); draw(); });
    root.addEventListener('popstate', function () { readVehicle(); readRange(); draw(); });
    root.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(draw, 100); });
    charts.observeSize(svg, draw);
    readVehicle(); readRange(); draw();
  }
  return { build: build, previousDate: previousDate, mount: mount };
}));
