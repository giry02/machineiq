(function () {
  'use strict';
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char];
    });
  }
  function integer(value) { return MIQCommon.numbers.integer(value); }
  function time(value) {
    var minutes = Math.round(value * 60);
    return Math.floor(minutes / 60) + 'H ' + (minutes % 60) + '분';
  }
  function rate(value, total) { return total ? value / total * 100 : 0; }
  function metrics(item) {
    return [
      ['운영효율', integer(rate(item.work, item.capacity)) + '%'],
      ['작업시간', time(item.work)], ['대기시간', time(item.idle)],
      ['미사용시간', time(Math.max(0, item.capacity - item.work - item.idle))],
      ['기준시간', time(item.capacity)],
      ['가동 중 작업 비중', integer(rate(item.work, item.work + item.idle)) + '%']
    ];
  }
  function render(data, options) {
    var items = data.vehicles || [], chart = options.chart;
    var workTotal = 0, capacityTotal = 0;
    var pager=chart.__miqListPager||(chart.__miqListPager=MIQ.createListPager(chart,{pageSize:20,onChange:function(){render(chart.__miqPageData,chart.__miqPageOptions)}}));
    chart.__miqPageData=data;chart.__miqPageOptions=options;
    items.forEach(function(item){workTotal+=item.work;capacityTotal+=item.capacity});
    var visible=pager.slice(items,options.from+'|'+options.to);
    chart.innerHTML = visible.map(function (item) {
      var v = item.vehicle, unused = Math.max(0, item.capacity - item.work - item.idle);
      var workRate = rate(item.work, item.capacity), idleRate = rate(item.idle, item.capacity);
      var unusedRate = Math.max(0, 100 - workRate - idleRate);
      var label = '<span class="efficiency-vehicle-label"><strong>' + esc(v.vin) + '</strong><small>' + esc(v.model || '') + '</small></span>';

      if (!data.filled || !item.capacity) {
        return '<div class="efficiency-daily-row is-empty" data-efficiency-vehicle="' + esc(v.vin) + '">' + label
          + '<div class="efficiency-daily-track" aria-hidden="true"></div><span class="efficiency-daily-row__metrics">미집계</span><strong>-</strong></div>';
      }
      var summary = v.vin + ' 운영효율 ' + integer(workRate) + '%, 작업 ' + time(item.work) + ', 대기 ' + time(item.idle) + ', 상세 펼치기';
      return '<details class="efficiency-vehicle" data-efficiency-vehicle="' + esc(v.vin) + '">'
        + '<summary class="efficiency-daily-row" aria-label="' + esc(summary) + '">' + label
        + '<span class="efficiency-daily-track" aria-hidden="true">'
        + '<span class="efficiency-daily-segment is-work" style="width:' + workRate.toFixed(4) + '%"></span>'
        + '<span class="efficiency-daily-segment is-idle" style="width:' + idleRate.toFixed(4) + '%"></span>'
        + '<span class="efficiency-daily-segment is-unused" style="width:' + unusedRate.toFixed(4) + '%"></span></span>'
        + '<span class="efficiency-daily-row__metrics">'
        + [['작업', item.work], ['대기', item.idle], ['미사용', unused]].map(function (metric) {
          return '<span><em>' + metric[0] + '</em><strong>' + integer(metric[1]) + 'H</strong></span>';
        }).join('') + '</span>'
        + '<strong class="efficiency-daily-row__actual">' + integer(workRate) + '% <span class="efficiency-vehicle-chevron" aria-hidden="true">⌄</span></strong></summary>'
        + '<dl class="efficiency-vehicle-detail">' + metrics(item).map(function (metric) {
          return '<div><dt>' + metric[0] + '</dt><dd>' + metric[1] + '</dd></div>';
        }).join('') + '</dl></details>';
    }).join('') || '<p class="efficiency-vehicle-empty">조회 조건에 해당하는 차량이 없습니다.</p>';
    document.getElementById('efficiencyDailyPeriod').textContent = options.from + ' ~ ' + options.to;
    document.getElementById('efficiencyDailyAverage').textContent = capacityTotal ? integer(rate(workTotal, capacityTotal)) + '%' : '-';
    document.getElementById('efficiencyDailyWork').textContent = items.length && data.filled ? integer(workTotal / items.length) + 'H' : '-';
    var note = document.querySelector('.efficiency-daily-note');
    if (note) note.textContent = '※ 운영효율 = 작업시간 ÷ 기준시간. 기준시간은 ' + (options.period === 'd' ? '시간대별 1H' : '일별 10H')
      + '를 합산하며 작업·대기가 이를 넘는 구간은 가동시간을 적용합니다. 미사용시간은 기준시간에서 작업·대기시간을 제외한 시간입니다.';
    if (options.tableBody) {
      options.tableBody.innerHTML = visible.map(function (item) {
        return '<tr><th scope="row">' + esc(item.vehicle.vin) + '<br><small>' + esc(item.vehicle.model || '') + '</small></th>'
          + (!data.filled || !item.capacity ? '<td colspan="6">미집계</td>' : metrics(item).map(function (metric) {
            return '<td class="r">' + metric[1] + '</td>';
          }).join('')) + '</tr>';
      }).join('') || '<tr><td colspan="7">조회 조건에 해당하는 차량이 없습니다.</td></tr>';
    }
  }
  window.MIQVehicleEfficiency = { render: render };
})();
