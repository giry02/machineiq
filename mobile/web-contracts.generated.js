/* GENERATED from current web sources. Run scripts/build-customer-web-contracts.cjs --check. */
(function(root){var module,globalThis=root,window=root;
/* DOM-free prototype rules. Keep business-specific forms and data in their pages.
   Classic-script + CommonJS entry points let the same rules run in browser/tests.
   Role policies below simulate QA visibility; they are NOT server authorization. */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIQCommon = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var roles = [
    { code: 'internal', label: '내부 사용자' },
    { code: 'dealer_owner', label: '딜러 대표' },
    { code: 'dealer_staff', label: '딜러 직원' },
    { code: 'customer_owner', label: '고객 대표' },
    { code: 'customer_staff', label: '고객 직원' }
  ];
  var codes = roles.map(function (role) { return role.code; });
  var capabilities = {
    internal: [],
    dealer_owner: ['approveUserRequest', 'approveVehicleRequest'],
    dealer_staff: [],
    customer_owner: ['approveUserRequest', 'assignUserGroup', 'deactivateCustomerStaff', 'manageGroup', 'assignGroupVehicle', 'editVehicle', 'requestVehicle'],
    customer_staff: []
  };
  var targetPolicies = {
    internal:       { hideCompany: false, hideGroup: true,  companyId: '', companyIds: null },
    dealer_owner:   { hideCompany: false, hideGroup: true,  companyId: '', companyIds: null },
    dealer_staff:   { hideCompany: false, hideGroup: true,  companyId: '', companyIds: null },
    customer_owner: { hideCompany: true,  hideGroup: false, companyId: '1933', companyIds: ['1933'] },
    customer_staff: { hideCompany: true,  hideGroup: true,  companyId: '1933', companyIds: ['1933'] }
  };
  function resolveRole(value) { return codes.indexOf(value) > -1 ? value : 'customer_owner'; }
  function isDealer(role) { return role === 'dealer_owner' || role === 'dealer_staff'; }
  function isCustomer(role) { return role === 'customer_owner' || role === 'customer_staff'; }
  function canUseFavorites(role) { return isDealer(role) || isCustomer(role); }
  function roleLabel(role) { return roles[codes.indexOf(resolveRole(role))].label; }
  function targetPolicy(role) {
    var policy = targetPolicies[resolveRole(role)];
    return { hideCompany: policy.hideCompany, hideGroup: policy.hideGroup, companyId: policy.companyId,
      companyIds: policy.companyIds ? policy.companyIds.slice() : null,
      group: resolveRole(role) === 'customer_staff' ? '물류1팀' : '' };
  }
  function filterVehicles(role, vehicles) {
    var policy = targetPolicy(role);
    return (Array.isArray(vehicles) ? vehicles : []).filter(function (vehicle) {
      return vehicle && (!policy.companyIds || policy.companyIds.indexOf(String(vehicle.companyId || '')) > -1)
        && (!policy.group || vehicle.group === policy.group);
    });
  }

  function formatDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function parseDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    var parts = value.split('-').map(Number);
    var date = new Date(parts[0], parts[1] - 1, parts[2]);
    return date.getFullYear() === parts[0] && date.getMonth() === parts[1] - 1 && date.getDate() === parts[2] ? date : null;
  }
  function addDays(date, days) {
    var result = new Date(date.getTime());
    result.setDate(result.getDate() + days);
    return result;
  }
  function today(reference) {
    var value = new Date((reference || new Date()).getTime());
    value.setHours(12, 0, 0, 0);
    return value;
  }
  function yesterday(reference) { return addDays(today(reference), -1); }
  function dayCount(from, to) {
    function day(date) { return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()); }
    return Math.round((day(to) - day(from)) / 86400000) + 1;
  }
  function range(from, to) { return { from: formatDate(from), to: formatDate(to) }; }
  function operatingRange(mode, anchor) {
    var end = anchor || yesterday();
    var start = mode === 'w' ? addDays(end, -6) : mode === 'm' ? new Date(end.getFullYear(), end.getMonth(), 1, 12) : end;
    return range(start, end);
  }
  function linkedWeek(date, edge) {
    return edge === 'start' ? range(date, addDays(date, 6)) : range(addDays(date, -6), date);
  }
  function monthRange(anchor, latest) {
    var start = new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12);
    var end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0, 12);
    if (latest && end > latest && start <= latest) end = latest;
    return range(start, end);
  }
  function requestRange(period, reference) {
    if (period === 'all') return { from: '', to: '' };
    var end = today(reference);
    var start;
    if (period === 'w') start = addDays(end, -6);
    else {
      var months = period === 'q' ? 3 : 1;
      var lastDay = new Date(end.getFullYear(), end.getMonth() - months + 1, 0).getDate();
      start = new Date(end.getFullYear(), end.getMonth() - months, Math.min(end.getDate(), lastDay), 12);
    }
    return range(start, end);
  }

  function normalizeSearch(value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase(); }
  function menuHref(path, role, base) {
    var url = new URL(path, base);
    url.search = '';
    url.hash = '';
    url.searchParams.set('role', resolveRole(role));
    return url.href;
  }
  function serviceMenuHref(path, role, base, committedQuery) {
    var url = new URL(menuHref(path, role, base));
    var current = new URL(base);
    if (typeof committedQuery === 'string') current.search = committedQuery;
    ['companyId', 'group', 'type', 'veh', 'period', 'from', 'to'].forEach(function (key) {
      var value = current.searchParams.get(key);
      if (value) url.searchParams.set(key, value);
    });
    return url.href;
  }
  function listReturnHref(saved, fallback, role, base) {
    var destination = new URL(fallback, base);
    var paths = ['../Vehicle%20Summary/vehicle-summary-tobe-option-a-expand.html',
      '../Vehicle%20Summary/vehicle-summary-tobe-2.html',
      '../Vehicle%20Summary/vehicle-summary-tobe-3.html',
      '../Vehicle%20Summary/vehicle-summary-tobe-v2.html',
      '../Vehicle%20Summary/vehicle-summary-tobe-option-b-sort.html',
      '../Vehicle%20Summary/vehicle-summary-tobe-option-c-reference-sort.html',
      '../Service/service-tobe-v2.html',
      '../Service/service-maintenance-tobe.html',
      '../Service/service-supply-tobe.html',
      '../Service/service-error-tobe.html'];
    if (canUseFavorites(role)) paths.push('../Interest%20Vehicles/interest-vehicles-status-tobe.html');
    try {
      var candidate = new URL(saved || '', base);
      if (saved && candidate.origin === destination.origin && paths.some(function (path) {
        return new URL(path, base).pathname === candidate.pathname;
      })) destination = candidate;
    } catch (error) { /* Invalid return context falls back to the summary list. */ }
    destination.searchParams.delete('returnTo');
    destination.searchParams.set('role', resolveRole(role));
    destination.hash = '';
    return destination.href;
  }
  function vehicleDetailReturnHref(savedQuery, role, base) {
    var destination = new URL('../Vehicle%20Detail/vehicle-detail-tobe.html', base);
    var saved = new URLSearchParams(savedQuery || '');
    ['companyId', 'group', 'type', 'veh', 'model', 'period', 'from', 'to', 'metric', 'sort', 'dir', 'source', 'returnTo'].forEach(function (key) {
      if (saved.has(key)) destination.searchParams.set(key, saved.get(key));
    });
    destination.searchParams.set('role', resolveRole(role));
    return destination.href;
  }
  function createSearch(initial) {
    var applied = String(initial == null ? '' : initial).trim();
    return {
      read: function () { return normalizeSearch(applied); },
      value: function () { return applied; },
      commit: function (value) { applied = String(value == null ? '' : value).trim(); return normalizeSearch(applied); }
    };
  }
  function bindSearch(input, submit, onApply) {
    var state = createSearch(input.value);
    function apply(event) {
      if (event) event.preventDefault();
      state.commit(input.value);
      onApply();
    }
    function keydown(event) {
      if (event.key === 'Enter' && !event.isComposing && event.keyCode !== 229) apply(event);
    }
    input.addEventListener('keydown', keydown);
    submit.addEventListener('click', apply);
    state.destroy = function () {
      input.removeEventListener('keydown', keydown);
      submit.removeEventListener('click', apply);
    };
    return state;
  }

  // Display only. Never feed rounded labels back into metrics, thresholds or coordinates.
  function integer(value, grouped) {
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') return '-';
    var numeric = Number(value);
    if (!Number.isFinite(numeric)) return '-';
    var rounded = Math.round(numeric);
    if (Object.is(rounded, -0)) rounded = 0;
    return grouped ? rounded.toLocaleString('ko-KR', { maximumFractionDigits: 0 }) : String(rounded);
  }

  return {
    numbers: { integer: integer },
    roles: {
      list: function () { return roles.map(function (role) { return { code: role.code, label: role.label }; }); },
      resolve: resolveRole, label: roleLabel, isDealer: isDealer, isCustomer: isCustomer, canUseFavorites: canUseFavorites,
      hasCapability: function (role, capability) { return codes.indexOf(role) > -1 && (!capability || capabilities[role].indexOf(capability) > -1); },
      targetPolicy: targetPolicy,
      filterVehicles: filterVehicles,
      scopeLabel: function (role) { return isCustomer(role) ? '전체 차량' : '전체 업체'; },
      dashboardDimension: function (role) { return role === 'internal' || isDealer(role) ? 'company' : 'group'; },
      hideDashboardComparison: function (role) { return role === 'customer_staff'; },
      hideMaintenanceDetails: isCustomer
    },
    dates: { format: formatDate, parse: parseDate, addDays: addDays, today: today, yesterday: yesterday,
      dayCount: dayCount, operatingRange: operatingRange, linkedWeek: linkedWeek, monthRange: monthRange, requestRange: requestRange },
    search: { normalize: normalizeSearch, create: createSearch, bind: bindSearch },
    navigation: { menuHref: menuHref, serviceMenuHref: serviceMenuHref, listReturnHref: listReturnHref, vehicleDetailReturnHref: vehicleDetailReturnHref }
  };
}));

/* Pure prototype contracts. Values passed in by the caller; no server claims. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MIQMeeting=factory();})(typeof window==='undefined'?this:window,function(){
  'use strict';
  function pad(n){return String(n).padStart(2,'0');}
  function hourlyWindow(now,zone){
    zone=zone||'Asia/Seoul';
    var parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'}).formatToParts(now||new Date());
    var p={};parts.forEach(function(x){p[x.type]=x.value;});
    var hour=Number(p.hour),date=p.year+'-'+p.month+'-'+p.day;
    return {date:date,from:'00:00',to:pad(hour)+':00',hours:hour,timeZone:zone,slots:Array.from({length:hour},function(_,i){return {from:pad(i)+':00',to:pad(i+1)+':00'};})};
  }
  function chargeWindow(start,end){
    if(start===null||end===null||typeof start==='boolean'||typeof end==='boolean'||String(start).trim()===''||String(end).trim()==='')return null;
    start=Number(start);end=Number(end);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||start>23||end<0||end>23)return null;
    var overnight=start>=end, duration=(end-start+24)%24||24;
    // The 24-hour scale begins at the configured start, so every overnight
    // interval is continuous, including 23 -> 22 and a full 24 hours.
    return {start:start,end:end,duration:duration,overnight:overnight,startLabel:(overnight?'전일 ':'금일 ')+pad(start)+':00',endLabel:'금일 '+pad(end)+':00',midnight:overnight?(24-start)/24*100:null,fill:duration/24*100};
  }
  function watchHourly(callback,options){
    options=options||{};
    var now=options.now||function(){return new Date();},last='',stopped=false;
    function refresh(){
      if(stopped)return;
      var w=hourlyWindow(now(),options.timeZone),key=w.date+' '+w.to;
      if(key!==last){last=key;callback(w);}
    }
    var timer=(options.schedule||setInterval)(refresh,30000);
    refresh();
    return {refresh:refresh,stop:function(){stopped=true;(options.cancel||clearInterval)(timer);}};
  }
  function dailyEnergy(vin,from,to){
    function parse(value){
      if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
      var d=new Date(value+'T00:00:00Z');
      return !isNaN(d.getTime())&&d.toISOString().slice(0,10)===value?d:null;
    }
    var start=parse(from),end=parse(to),rows=[];
    if(!start||!end||start>end)return rows;
    for(var d=start;d<=end;d=new Date(d.getTime()+86400000)){
      var date=d.toISOString().slice(0,10),key=vin+':energy-kwh-v2:'+date,seed=0;
      for(var i=0;i<key.length;i++)seed=(seed*31+key.charCodeAt(i))>>>0;
      function next(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
      rows.push({date:date,x:(d.getUTCMonth()+1)+'/'+d.getUTCDate(),chargeKwh:Math.round((18+next()*22)*10)/10,consumeKwh:Math.round((12+next()*24)*10)/10});
    }
    return rows;
  }
  function temperatureHours(vin,date){
    var key=vin+':temperature:'+date,seed=0,rows=[];
    for(var j=0;j<key.length;j++)seed=(seed*31+key.charCodeAt(j))>>>0;
    function next(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;}
    var base=30+Math.round(next()*4);
    for(var h=0;h<24;h++){
      var peak=Math.exp(-Math.pow(h-17,2)/12)*(8+next()*3);
      rows.push({date:date,x:pad(h)+'시',v:Math.round(base+peak+next()*1.2)});
    }
    return rows;
  }
  function dailyTemperature(vin,from,to){
    // Use the same validated calendar range as energy, and derive extrema from hourly temperature.
    return dailyEnergy(vin,from,to).map(function(day){
      var values=temperatureHours(vin,day.date).map(function(hour){return hour.v;});
      return {date:day.date,x:day.x,minC:Math.min.apply(null,values),maxC:Math.max.apply(null,values)};
    });
  }
  function reportScope(role,companies,groups,assignedGroup){
    var staff=role==='customer_staff',customer=staff||role==='customer_owner';
    var items=customer?(staff?[assignedGroup||'내 그룹']:groups.filter(function(g){return g&&g!=='미배정';})):companies;
    items=items.filter(function(n,i,a){return a.indexOf(n)===i;});
    if(!items.length&&customer)items=['전체'];
    return {label:customer?'그룹':'업체',items:items,readOnly:staff,single:items.length<=1,customer:customer};
  }
  function favoriteIds(value,allowed){
    return Array.isArray(value)?value.filter(function(id,i,a){return typeof id==='string'&&allowed.indexOf(id)>=0&&a.indexOf(id)===i;}):[];
  }
  function hourlyVehicle(v,window){
    var known=v.conn===true||v.conn===false,connected=v.conn===true,total={minutes:0,km:0,fuel:0,battery:0};
    function random(key){var s=0;for(var i=0;i<key.length;i++)s=(s*31+key.charCodeAt(i))>>>0;return (s%1000)/1000;}
    window.slots.forEach(function(slot,i){
      var r=random(v.vin+window.date+':'+i),min=connected&&r>.25?Math.round(r*50):0;
      total.minutes+=min;total.km+=min/60*(v.type==='엔진'?4:2);
      if(v.type==='엔진')total.fuel+=min/60*3.8;else total.battery+=min/60*2.4;
    });
    var running=connected&&window.hours>0&&random(v.vin+window.date+':'+(window.hours-1))>.25;
    var fault=connected&&random(v.vin+'fault')>.86?1:0;
    // Explicit demonstration vehicles share their current fault count with summary/dashboard.
    var activeError=v.summaryDetail&&v.summaryDetail.activeErrorCount;
    if(v.demo===true&&typeof activeError==='number'&&Number.isFinite(activeError)&&activeError>=0)fault=activeError;
    return {known:known,connected:connected,running:running,idle:connected&&!running,fault:fault,runH:known?total.minutes/60:null,
      km:known?total.km:null,fuel:known?total.fuel:null,battery:known?total.battery:null,
      dataTime:connected?window.date+' '+window.to:null,
      status:!known?'unknown':!connected?'off':fault?'bad':'ok'};
  }
  return {hourlyWindow:hourlyWindow,watchHourly:watchHourly,dailyEnergy:dailyEnergy,temperatureHours:temperatureHours,dailyTemperature:dailyTemperature,chargeWindow:chargeWindow,reportScope:reportScope,favoriteIds:favoriteIds,hourlyVehicle:hourlyVehicle};
});

(function (root) {
  'use strict';
  function escape(value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function parse(value) {
    var match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
    if (!match) return null;
    var date = new Date(Date.UTC(+match[1], +match[2] - 1, +match[3]));
    return date.toISOString().slice(0, 10) === value ? date : null;
  }
  function axis(period, from, to) {
    var start = parse(from), end = parse(to), labels = [], dates = [], detailLabels = [];
    if (!start || !end || start > end) return { labels: labels, dates: dates, detailLabels: detailLabels, n: 0, bucket: 1, filled: 0 };
    var count = period === 'd' ? 24 : Math.min(366, Math.round((end - start) / 86400000) + 1);
    for (var index = 0; index < count; index++) {
      var date = new Date(start.getTime() + (period === 'd' ? 0 : index * 86400000));
      var iso = date.toISOString().slice(0, 10);
      var label = period === 'd' ? String(index).padStart(2, '0') + '시'
        : (index === 0 || date.getUTCDate() === 1 ? (date.getUTCMonth() + 1) + '월 ' : '') + date.getUTCDate() + '일';
      labels.push(label); dates.push(iso); detailLabels.push(iso + (period === 'd' ? ' ' + label : ''));
    }
    return { labels: labels, dates: dates, detailLabels: detailLabels, n: count, bucket: 1, filled: count };
  }
  function tickLabel(labels, index, width) {
    var every = Math.max(1, Math.ceil(labels.length / Math.max(2, Math.floor((width || 800) / 38))));
    return index === 0 || index === labels.length - 1 || /월/.test(labels[index]) || index % every === 0 ? labels[index] : '';
  }
  /* Count metrics share a zero baseline, 10% headroom and integer 1/2/5 steps.
     The caller supplies only visible series; null means uncollected, not zero. */
  function countsAxis(values) {
    var collected = (Array.isArray(values) ? values : []).filter(function (value) {
      return typeof value === 'number' && isFinite(value) && value >= 0;
    });
    var peak = collected.reduce(function (maximum, value) { return Math.max(maximum, value); }, 0);
    var target = peak > 0 ? peak * 1.1 : 1;
    var rawStep = Math.max(1, target / 5);
    var magnitude = Math.pow(10, Math.floor(Math.log(rawStep) / Math.LN10));
    var normalized = rawStep / magnitude;
    var step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
    var intervals = Math.max(1, Math.ceil(target / step));
    var ticks = Array.from({ length: intervals + 1 }, function (_, index) { return index * step; });
    return { min: 0, max: ticks[ticks.length - 1], step: step, ticks: ticks, hasData: collected.length > 0 };
  }
  function tipAttrs(text) {
    return 'tabindex="0" role="img" aria-label="' + escape(text) + '" data-chart-tip="' + escape(text) + '"';
  }
  var tip, active;
  function hide() {
    if (tip) tip.hidden = true;
    if (active) { active.removeAttribute('aria-describedby'); active.classList.remove('on'); }
    active = null;
  }
  function show(target, text, event) {
    if (!target || !text || !root.document) return;
    if (!tip) {
      tip = document.createElement('div'); tip.id = 'miqChartTip'; tip.className = 'miq-chart-tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
    }
    if (active !== target) hide();
    active = target; target.classList.add('on'); target.setAttribute('aria-describedby', tip.id);
    tip.textContent = text; tip.hidden = false;
    var rect = target.getBoundingClientRect();
    var x = event && typeof event.clientX === 'number' ? event.clientX : rect.left + rect.width / 2;
    var y = event && typeof event.clientY === 'number' ? event.clientY : rect.top;
    tip.style.left = Math.max(8, Math.min(x + 12, root.innerWidth - tip.offsetWidth - 8)) + 'px';
    var top = y - tip.offsetHeight - 12;
    tip.style.top = Math.max(8, Math.min(top < 8 ? y + 16 : top, root.innerHeight - tip.offsetHeight - 8)) + 'px';
  }
  function bind(host) {
    if (!host || host.__miqChartsBound) return;
    host.__miqChartsBound = true;
    function target(event) { return event.target.closest && event.target.closest('[data-chart-tip]'); }
    host.addEventListener('pointermove', function (event) { var node = target(event); if (node) show(node, node.getAttribute('data-chart-tip'), event); else hide(); });
    host.addEventListener('pointerleave', hide);
    host.addEventListener('focusin', function (event) { var node = target(event); if (node) show(node, node.getAttribute('data-chart-tip')); });
    host.addEventListener('focusout', hide);
    host.addEventListener('keydown', function (event) { if (event.key === 'Escape') hide(); });
    if (root.MutationObserver) new MutationObserver(hide).observe(host, { childList: true, subtree: true });
  }
  function observeSize(host, redraw) {
    if (!host || host.__miqChartSizeObserver || !root.ResizeObserver) return;
    var width = Math.round(host.getBoundingClientRect().width), frame = 0;
    var observer = new root.ResizeObserver(function () {
      var next = Math.round(host.getBoundingClientRect().width);
      if (next <= 0 || next === width) return;
      width = next;
      if (frame) root.cancelAnimationFrame(frame);
      frame = root.requestAnimationFrame(function () { frame = 0; hide(); redraw(); });
    });
    host.__miqChartSizeObserver = observer;
    observer.observe(host);
  }
  root.MIQCharts = { axis: axis, countsAxis: countsAxis, tickLabel: tickLabel, escape: escape, tipAttrs: tipAttrs, bind: bind, show: show, hide: hide, observeSize: observeSize };
  if (root.document) {
    root.addEventListener('scroll', hide, true); root.addEventListener('resize', hide);
    document.addEventListener('miq:period-change', hide); document.addEventListener('miq:target-change', hide);
  }
  if (typeof module === 'object' && module.exports) module.exports = root.MIQCharts;
})(typeof window !== 'undefined' ? window : globalThis);

(function (root) {
  'use strict';
  /* Service 공용 이력과 소모품 목록. 목록과 배지는 같은 품목·상태를 사용한다.
     날짜·호기를 변경하지 않으며 실제 서버 데이터나 차량 카탈로그를 만들지 않는다. */
  var kinds = ['maintenance', 'supply', 'error'];
  var sourceVehicles = {
    FBA32_224250271: { model: 'B30S-7', group: '기본그룹', type: '리튬' },
    FBA32_224250383: { model: 'B30S-7', group: '기본그룹', type: '리튬' },
    FBA32_032068: { model: 'B30S-7', group: '기본그룹', type: '리튬' },
    FBA32_032042: { model: 'B18S-7', group: '테스트그룹', type: '납산' },
    FBA32_DEMO_CS01: { model: 'B30S-7', group: '물류1팀', type: '리튬' }
  };
  /* Existing Service HTML fixtures; full consumable values are shared with vehicle detail. */
  var supplies = [
    { vin: 'FBA32_224250271', name: '트랜스미션 오일', cycle: 100, used: 231 },
    { vin: 'FBA32_224250271', name: '작동유 필터', cycle: 250, used: 231 },
    { vin: 'FBA32_224250383', name: '트랜스미션 오일 필터', cycle: 100, used: 105 },
    { vin: 'FBA32_032068', name: '엔진오일', cycle: 500, used: 231 },
    { vin: 'FBA32_032068', name: '엔진오일 필터', cycle: 250, used: 231 },
    { vin: 'FBA32_032068', name: '에어클리너', cycle: 300, used: 251 },
    { vin: 'FBA32_224250271', name: '감속기 오일', cycle: 500, used: 425 },
    { vin: 'FBA32_DEMO_CS01', name: '작동유 필터', cycle: 250, used: 240 },
    { vin: 'FBA32_DEMO_CS01', name: '감속기 오일', cycle: 500, used: 425 }
  ];
  function supplyStatus(cycle, used) {
    cycle = Number(cycle); used = Number(used);
    if (!Number.isFinite(cycle) || cycle <= 0 || !Number.isFinite(used) || used < 0) return { state: 'unknown', percent: null, rawPercent: null, width: 0 };
    var rawPercent = used / cycle * 100;
    var percent = Math.round(rawPercent * 100) / 100;
    return { state: percent >= 90 ? 'need' : percent >= 80 ? 'soon' : 'ok', percent: percent, rawPercent: rawPercent, width: Math.min(100, percent) };
  }
  function supplyPreview(items, limit) {
    limit = limit === undefined ? 4 : Math.max(0, Math.floor(Number(limit) || 0));
    return (Array.isArray(items) ? items : []).map(function (item, index) {
      return Object.assign({}, item, supplyStatus(item.cycle, item.used), { sourceIndex: index });
    }).sort(function (a, b) { return (b.percent === null ? -1 : b.percent) - (a.percent === null ? -1 : a.percent) || a.sourceIndex - b.sourceIndex; }).slice(0, limit);
  }
  function supplyItems(vin) {
    return supplyPreview(supplies.filter(function (item) { return !vin || normalize(item.vin) === normalize(vin); }), supplies.length);
  }
  var sourceRows = [
    ['maintenance', 'FBA32_224250271', '2026-07-03'],
    ['maintenance', 'FBA32_224250271', '2026-07-08'],
    ['maintenance', 'FBA32_224250271', '2026-07-11'],
    ['maintenance', 'FBA32_224250383', '2026-07-14'],
    ['maintenance', 'FBA32_032042', '2026-07-18'],
    ['maintenance', 'FBA32_032042', '2026-07-22'],
    ['supply', 'FBA32_224250271', '2026-05-01'],
    ['supply', 'FBA32_224250271', '2026-05-01'],
    ['supply', 'FBA32_224250383', '2026-05-07'],
    ['supply', 'FBA32_032068', '2026-06-01'],
    ['supply', 'FBA32_032068', '2026-06-01'],
    ['supply', 'FBA32_032068', '2026-06-01'],
    ['error', 'FBA32_224250271', '2026-07-25', 'current'],
    ['error', 'FBA32_032068', '2026-07-20', 'past'],
    ['error', 'FBA32_224250271', '2026-07-24', 'current'],
    ['error', 'FBA32_032042', '2026-07-15', 'past'],
    ['error', 'FBA32_032068', '2026-07-12', 'past'],
    ['error', 'FBA32_224250383', '2026-07-26', 'current'],
    ['supply', 'FBA32_224250271', '2026-06-01'],
    ['supply', 'FBA32_DEMO_CS01', '2026-06-01'],
    ['supply', 'FBA32_DEMO_CS01', '2026-06-01']
  ];
  var supplyIndex = 0;
  var records = sourceRows.map(function (row) {
    var vehicle = sourceVehicles[row[1]];
    var supply = row[0] === 'supply' ? supplies[supplyIndex++] : null;
    return {
      kind: row[0], companyId: '1933', company: '세종물류', group: vehicle.group,
      model: vehicle.model, vin: row[1], type: vehicle.type, date: row[2],
      supplyName: supply ? supply.name : '',
      supplyCycle: supply ? supply.cycle : undefined,
      supplyUsed: supply ? supply.used : undefined,
      supplyState: supply ? supplyStatus(supply.cycle, supply.used).state : '',
      errorState: row[0] === 'error' ? row[3] : ''
    };
  });

  function text(value) { return String(value == null ? '' : value).trim(); }
  function normalize(value) { return text(value).toUpperCase().replace(/[^0-9A-Z가-힣]/g, ''); }
  function matches(record, filter) {
    var companyId = text(filter.companyId);
    if (Array.isArray(filter.companyIds) && filter.companyIds.indexOf(record.companyId) < 0) return false;
    var vehicle = filter.vehicle || filter.veh || '';
    if (companyId && companyId !== 'all' && companyId !== record.companyId) return false;
    if (vehicle && normalize(vehicle) !== normalize(record.vin)) return false;
    if (filter.group && normalize(record.group).indexOf(normalize(filter.group)) < 0) return false;
    if (filter.group && filter.exactGroup && record.group !== filter.group) return false;
    if (filter.type && normalize(record.type) !== normalize(filter.type)) return false;
    if (record.kind === 'supply' && record.supplyState !== 'need' && record.supplyState !== 'soon') return false;
    if (record.kind === 'supply' && filter.supplyState && record.supplyState !== filter.supplyState) return false;
    if (record.kind === 'error' && filter.errorState && record.errorState !== filter.errorState) return false;
    /* 소모품은 교체 필요·임박 상태만 조회한다. 등록일이나 이력 기간은 적용하지 않는다. */
    if (record.kind !== 'supply') {
      if (record.date && filter.from && record.date < filter.from) return false;
      if (record.date && filter.to && record.date > filter.to) return false;
    }
    return true;
  }
  function count(kind, filter) {
    return records.filter(function (record) { return record.kind === kind && matches(record, filter || {}); }).length;
  }
  function totals(filter) {
    return { maintenance: count('maintenance', filter), supply: count('supply', filter), error: count('error', filter) };
  }
  function replace(kind, infos) {
    if (kinds.indexOf(kind) < 0) throw new RangeError('Unknown service record kind: ' + kind);
    if (!Array.isArray(infos)) throw new TypeError('Service record infos must be an array');
    if (kind === 'supply') infos.forEach(function (info) {
      var item = supplies.filter(function (candidate) { return normalize(candidate.vin) === normalize(info.vin) && candidate.name === info.supplyName; })[0];
      if (item && info.supplyCycle !== undefined && info.supplyUsed !== undefined) { item.cycle = Number(info.supplyCycle); item.used = Number(info.supplyUsed); }
    });
    var updated = infos.map(function (info) {
      var company = text(info.company);
      var date = text(info.date).match(/\d{4}-\d{2}-\d{2}/);
      return {
        kind: kind,
        companyId: text(info.companyId) || (normalize(company).indexOf('세종물류') > -1 ? '1933' : ''),
        company: company, group: text(info.group), model: text(info.model), vin: text(info.vin),
        type: text(info.type), date: date ? date[0] : '',
        supplyName: kind === 'supply' ? text(info.supplyName) : '',
        supplyCycle: kind === 'supply' ? info.supplyCycle : undefined,
        supplyUsed: kind === 'supply' ? info.supplyUsed : undefined,
        supplyState: kind === 'supply' ? (info.supplyCycle !== undefined && info.supplyUsed !== undefined ? supplyStatus(info.supplyCycle, info.supplyUsed).state : text(info.supplyState)) : '',
        errorState: kind === 'error' ? text(info.errorState) : ''
      };
    });
    var retained = records.filter(function (record) { return record.kind !== kind; });
    records.splice.apply(records, [0, records.length].concat(retained, updated));
    return updated.length;
  }
  // Service-only identities can open detail without creating collected telemetry
  // or adding vehicles to the fleet/summary population.
  function vehicleIdentity(vin) {
    var key = Object.keys(sourceVehicles).find(function (value) { return normalize(value) === normalize(vin); });
    if (!key) return null;
    return Object.assign({ vin: key, companyId: '1933', companyName: '세종물류',
      serviceOnly: true, catalogOnly: true, conn: null, km: null, min: null, shock: null,
      cumKm: null, cumH: null, soc: null }, sourceVehicles[key]);
  }
  var api = { records: records, count: count, totals: totals, replace: replace, supplyStatus: supplyStatus, supplyPreview: supplyPreview, supplyItems: supplyItems, vehicleIdentity: vehicleIdentity };
  root.MIQServiceRecords = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);

/* Arbitrary demonstration records for the prototype only.
   These are not actual repairs, ECU/BMS codes, or collected vehicle telemetry.
   The caller supplies an ISO date/window; no clock, random values, or catalog mutations are used. */
(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.MIQServiceDemo=api;
})(typeof window!=='undefined'?window:globalThis,function(){
  'use strict';
  function text(value){return typeof value==='string'?value.trim():typeof value==='number'&&Number.isFinite(value)?String(value):'';}
  function validDay(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
    var date=new Date(value+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&date.toISOString().slice(0,10)===value;
  }
  function hash(value){var result=0;for(var index=0;index<value.length;index++)result=(result*31+value.charCodeAt(index))>>>0;return result;}
  function stamp(day,hour,minute){return day+' '+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0');}
  var examples={
    '엔진':{category:'차량',prefix:'ENG',items:[
      ['엔진 냉각 계통','냉각수 온도 신호 점검','엔진 냉각수 온도 센서 및 커넥터 확인'],
      ['엔진 윤활 계통','오일 압력 신호 점검','엔진 오일 압력 센서 및 연결부 확인'],
      ['엔진 흡기 계통','흡기 필터 점검 알림','흡기 필터 상태 확인 및 점검 기록']
    ]},
    '리튬':{category:'배터리',prefix:'LI',items:[
      ['리튬 배터리 팩','셀 온도 신호 점검','리튬 배터리 온도 센서 및 커넥터 확인'],
      ['리튬 배터리 충전 계통','충전 연결 상태 점검','리튬 배터리 충전 커넥터 상태 확인'],
      ['리튬 배터리 통신 계통','BMS 통신 점검 알림','리튬 배터리 BMS 연결 상태 확인']
    ]},
    '납산':{category:'배터리',prefix:'PB',items:[
      ['납산 배터리 단자','단자 연결 상태 점검','납산 배터리 단자 및 연결 케이블 상태 확인'],
      ['납산 배터리 충전 계통','충전 연결 상태 점검','납산 배터리 충전 커넥터 상태 확인'],
      ['납산 배터리 전압 계통','전압 신호 점검','납산 배터리 전압 측정 연결부 확인']
    ]},
    vehicle:{category:'차량',prefix:'VEH',items:[
      ['차량 제어 계통','제어 신호 점검','차량 제어기 연결 상태 확인'],
      ['차량 조작 계통','조작 신호 점검','차량 조작 레버 및 신호 연결부 확인'],
      ['차량 통신 계통','단말 통신 점검','차량 단말 및 통신 연결 상태 확인']
    ]}
  };
  function create(fleet,referenceDay){
    var result={maintenance:[],error:[]};
    if(!Array.isArray(fleet)||!validDay(referenceDay))return result;
    var seen=new Set();
    fleet.forEach(function(vehicle){
      if(!vehicle||typeof vehicle!=='object'||typeof vehicle.vin!=='string')return;
      var vin=vehicle.vin.trim();
      if(!/^[a-z0-9][a-z0-9_-]*$/i.test(vin))return;
      var key=vin.replace(/[-_]/g,'').toUpperCase();
      if(seen.has(key))return;
      seen.add(key);
      var seed=hash(key),type=text(vehicle.type),template=Object.prototype.hasOwnProperty.call(examples,type)?examples[type]:examples.vehicle;
      var variant=seed%template.items.length,item=template.items[variant];
      var metadata={companyId:text(vehicle.companyId),company:text(vehicle.companyName),group:text(vehicle.group),model:text(vehicle.model),vin:vin,type:type,date:referenceDay,demo:true};
      var minute=Math.floor(seed/7)%6*10,errorHour=7+seed%8;
      result.maintenance.push(Object.assign({},metadata,{kind:'maintenance',dateTime:stamp(referenceDay,9+seed%7,minute),
        part:item[0],symptom:item[1],detail:item[2],completed:seed%2===0}));
      var error=Object.assign({},metadata,{kind:'error',dateTime:stamp(referenceDay,errorHour,minute),errorState:seed%2===0?'current':'past',
        category:template.category,code:'DEMO-'+template.prefix+'-'+String(variant+1).padStart(2,'0'),level:['a','b','c'][seed%3],spn:'—',fmi:'—',
        description:item[2]});
      if(error.errorState==='past')error.completedAt=stamp(referenceDay,errorHour+2,minute);
      result.error.push(error);
    });
    return result;
  }
  // Explicit current-day review samples. Existing create() callers retain
  // their historical data. Dashboard links pass this same frozen cutoff.
  function createCurrent(fleet,window){
    if(!window||!validDay(window.date)||!/^([01]\d|2[0-3]):00$/.test(window.to||''))return [];
    var end=window.date+' '+window.to,rows=[];
    create(fleet,window.date).error.forEach(function(item){
      var seed=hash(item.vin.replace(/[-_]/g,'').toUpperCase());
      if(seed%4===0)return;
      [0].concat(seed%3===0?[30]:[]).forEach(function(offset,index){
        var parts=item.dateTime.slice(11).split(':'),minute=Number(parts[0])*60+Number(parts[1])+offset;
        var dateTime=stamp(window.date,Math.floor(minute/60),minute%60);
        if(dateTime>=end)return;
        var row=Object.assign({},item,{dateTime:dateTime,currentSample:true,sampleId:window.date+':'+item.vin+':'+index});
        if(row.completedAt&&row.completedAt>=end){row.errorState='current';delete row.completedAt;}
        rows.push(row);
      });
    });
    return rows;
  }
  return {create:create,createCurrent:createCurrent};
});

/* Shared summary row values. Dates are committed query dates; no DOM state is read. */
(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MIQSummaryRow = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  'use strict';
  function valid(value) { return typeof value === 'number' && Number.isFinite(value) && value >= 0; }
  function times(vehicle, periodMinutes) {
    var sample = vehicle.summaryDetail || {};
    var running = valid(periodMinutes) ? Math.round(periodMinutes) : null;
    var working = null, idle = null;
    if (running !== null && valid(sample.workMinutes) && valid(sample.idleMinutes)
      && valid(vehicle.min) && sample.workMinutes + sample.idleMinutes === vehicle.min) {
      working = vehicle.min > 0 ? Math.round(running * sample.workMinutes / vehicle.min) : 0;
      idle = running - working;
    }
    return {running: running, working: working, idle: idle};
  }
  // Communication has two UI states; only an explicit connection is shown as on.
  function connection(value) { return value === true ? 'on' : 'off'; }
  function historyCounts(service, vehicle, range) {
    var unavailable = {repair: null, fault: null};
    if (!service || typeof service.count !== 'function' || !Array.isArray(service.records)
      || !vehicle.vin || !range || !range[0] || !range[1]) return unavailable;
    var known = service.records.some(function(record) { return record.vin === vehicle.vin
      && (!vehicle.companyId || String(record.companyId) === String(vehicle.companyId)); });
    if (!known) return unavailable;
    var filter = {vehicle: vehicle.vin, companyId: vehicle.companyId, from: range[0], to: range[1]};
    return {repair: service.count('maintenance', filter), fault: service.count('error', filter)};
  }
  return {times: times, connection: connection, historyCounts: historyCounts};
});

(function(root){
  'use strict';
  var errors = {
    FBA32_DEMO_CS01: [
      { st: 'cur', code: 'BM-0x0104', msg: '충전 전류 이상', lv: '주의', days: 0, done: null, act: '충전기 커넥터 접점 및 충전 케이블 단선 점검' }
    ],
    FBA32_224250271: [
      { st: 'cur',  code: 'BM-0x0210', msg: '셀 과열 (43℃)',      lv: '주의', days: 0,  done: null,                 act: '차량 정지 후 30분 냉각, 배터리 팩 통풍구 이물 점검' },
      { st: 'past', code: 'BM-0x0308', msg: '셀 전압 편차 초과',   lv: '주의', days: 3,  done: '2026-08-09 15:22',   act: '밸런싱 모드로 완충 1회 실시 후 편차 재확인' },
      { st: 'past', code: 'BM-0x0402', msg: 'BMS 통신 지연',       lv: '정보', days: 12, done: '2026-07-31 09:14',   act: '단말 전원 재인입 후 통신 상태 확인' },
      { st: 'past', code: 'BM-0x0104', msg: '충전 전류 이상',       lv: '주의', days: 24, done: '2026-07-19 20:41',   act: '충전기 커넥터 접점 및 충전 케이블 단선 점검' }
    ],
    FBA20_224250312: [
      { st: 'cur',  code: 'BM-0x0210', msg: '셀 과열 (46℃)',      lv: '경고', days: 0,  done: null,                 act: '차량 정지 후 30분 냉각, 배터리 팩 통풍구 이물 점검' },
      { st: 'past', code: 'BM-0x0501', msg: '절연 저항 저하',       lv: '심각', days: 16, done: '2026-07-29 11:20',   act: '절연 저항 측정 후 서비스 센터 점검 요청' }
    ],
    FBA25_224250188: [
      { st: 'past', code: 'BM-0x0210', msg: '셀 과열 (44℃)',      lv: '경고', days: 11, done: '2026-08-01 16:02',   act: '차량 정지 후 30분 냉각, 배터리 팩 통풍구 이물 점검' },
      { st: 'past', code: 'BM-0x0402', msg: 'BMS 통신 지연',       lv: '정보', days: 27, done: '2026-07-16 10:51',   act: '단말 전원 재인입 후 통신 상태 확인' }
    ],
    FBA16_224250045: [
      { st: 'cur',  code: 'BM-0x0104', msg: '충전 전류 이상',       lv: '주의', days: 0,  done: null,                 act: '충전기 커넥터 접점 및 충전 케이블 단선 점검' },
      { st: 'cur',  code: 'BM-0x0308', msg: '셀 전압 편차 초과',    lv: '주의', days: 4,  done: null,                 act: '밸런싱 모드로 완충 1회 실시 후 편차 재확인' },
      { st: 'past', code: 'BM-0x0104', msg: '충전 전류 이상',       lv: '주의', days: 19, done: '2026-07-25 08:30',   act: '충전기 커넥터 접점 및 충전 케이블 단선 점검' }
    ],
    FBA35_224250403: [
      { st: 'past', code: 'BM-0x0402', msg: 'BMS 통신 지연',       lv: '정보', days: 2,  done: '2026-08-10 10:51',   act: '단말 전원 재인입 후 통신 상태 확인' },
      { st: 'past', code: 'BM-0x0308', msg: '셀 전압 편차 초과',    lv: '주의', days: 21, done: '2026-07-22 17:36',   act: '밸런싱 모드로 완충 1회 실시 후 편차 재확인' }
    ]
  };
  function hasNumber(value){return value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));}
  function seeded(key){var seed=0;for(var i=0;i<key.length;i++)seed=(seed*31+key.charCodeAt(i))>>>0;return function(){seed=(seed*1103515245+12345)&0x7fffffff;return seed/0x7fffffff;};}
  function snapshot(vehicle){
    var soc=hasNumber(vehicle.soc)?Number(vehicle.soc):null, known=!vehicle.catalogOnly&&soc!==null;
    var current=(errors[vehicle.vin]||[]).filter(function(error){return error.st==='cur';});
    function has(word){return current.some(function(error){return error.msg.indexOf(word)>=0;});}
    return {soc:soc,known:known,soh:known?88+Math.round(seeded(vehicle.vin+'stat')()*11):null,
      workMinutes:known?Math.round(soc/100*348):null,chargeMinutes:known?Math.round((100-soc)/100*120):null,
      temperature:known?(has('과열')?'경고':'정상'):'수집 전',charge:known?(has('충전')?'이상':'정상'):'수집 전',battery:known?(has('전압')?'주의':'정상'):'수집 전',abnormal:known&&current.length>0};
  }
  function allowed(rows,role,policy){
    return rows.filter(function(vehicle){return vehicle.type==='리튬'&&(!policy.companyIds||policy.companyIds.indexOf(String(vehicle.companyId||'1933'))>=0)&&(role!=='customer_staff'||vehicle.group==='물류1팀');});
  }
  function filter(rows,selection){return rows.filter(function(vehicle){
    return (!selection.companyId||selection.companyId==='all'||String(vehicle.companyId||'1933')===String(selection.companyId))
      &&(!selection.group||vehicle.group===selection.group)&&(!selection.veh||vehicle.vin===selection.veh)&&(!selection.abnormal||snapshot(vehicle).abnormal);
  });}
  var sortKeys=['vin','soc','soh','workMinutes','chargeMinutes','smartCharge'];
  function sort(rows,key,direction,readSmartCharge){
    if(sortKeys.indexOf(key)<0)return rows.slice();
    var factor=direction==='desc'?-1:1;
    function value(vehicle){
      if(key==='vin')return vehicle.vin||null;
      var info=snapshot(vehicle);
      if(key==='smartCharge'){
        if(!info.known)return null;
        var charge=readSmartCharge?readSmartCharge(vehicle,info.known):'켜짐';
        return charge==='켜짐'?1:charge==='꺼짐'?0:null;
      }
      return info[key];
    }
    return rows.map(function(vehicle,index){return {vehicle:vehicle,value:value(vehicle),index:index};}).sort(function(a,b){
      // Unavailable telemetry remains at the bottom in both directions; zero is a value.
      var aMissing=a.value===null||a.value===undefined,bMissing=b.value===null||b.value===undefined;
      if(aMissing!==bMissing)return aMissing?1:-1;
      if(aMissing)return a.index-b.index;
      var compared=typeof a.value==='number'?a.value-b.value:String(a.value).localeCompare(String(b.value),'ko',{numeric:true});
      return compared?compared*factor:a.index-b.index;
    }).map(function(item){return item.vehicle;});
  }
  root.MIQLithiumListModel={errors:errors,snapshot:snapshot,allowed:allowed,filter:filter,sortKeys:sortKeys,sort:sort};
  if(typeof module==='object'&&module.exports)module.exports=root.MIQLithiumListModel;
})(typeof window!=='undefined'?window:globalThis);

/* Original captured daily-equipment last positions are preserved below.
   The final three entries marked demo:true are separated demonstration locations
   for the customer staff fleet near company 1933's existing Hwaseong position.
   They are not collected GPS measurements. */
window.MIQMapPositions = [
  {
    "vin": "FBA36_225380008",
    "lat": 35.20914,
    "lng": 128.85083,
    "address": "대한민국 경상남도 김해시 칠산로413번길 20",
    "lastDatetime": "2026-08-13 19:29:37"
  },
  {
    "vin": "FBA32_224250271",
    "lat": 37.035446,
    "lng": 126.787238,
    "address": "대한민국 경기도 화성시 우정읍 이화리 1714",
    "lastDatetime": "2026-08-13 19:20:39"
  },
  {
    "vin": "FBA32-002415",
    "lat": 36.378733,
    "lng": 126.578765,
    "address": "대한민국 충청남도 보령시 주교면 관창리 1227-1번지",
    "lastDatetime": "2026-08-13 19:20:51"
  },
  {
    "vin": "FBA34-000619",
    "lat": 35.852396,
    "lng": 127.085745,
    "address": "대한민국 전북특별자치도 전주시 덕진구 팔복동3가 421",
    "lastDatetime": "2026-08-13 16:35:26"
  },
  {
    "vin": "FDB19_225060042",
    "lat": 35.245911,
    "lng": 128.843946,
    "address": "대한민국 경상남도 김해시 주촌면 서부로1701번안길 58-202",
    "lastDatetime": "2026-08-13 19:11:55"
  },
  {
    "vin": "FDB19_225060343",
    "lat": 35.201645,
    "lng": 128.608816,
    "address": "대한민국 경상남도 창원시 성산구 신촌동 501-8",
    "lastDatetime": "2026-08-13 16:41:56"
  },
  {
    "vin": "FDB19-000122",
    "lat": 35.962521,
    "lng": 126.595566,
    "address": "대한민국 전북특별자치도 군산시 소룡동 1597-2",
    "lastDatetime": "2026-08-13 10:27:13"
  },
  {
    "vin": "FDB21_224250226",
    "lat": 35.306725,
    "lng": 128.3319,
    "address": "대한민국 경상남도 함안군 법수면 강주리 820-4",
    "lastDatetime": "2026-08-13 07:58:09"
  },
  {
    "vin": "FDB21_224250275",
    "lat": 35.140811,
    "lng": 128.479441,
    "address": "대한민국 경상남도 창원시 마산합포구 진북면 신촌리 2-5",
    "lastDatetime": "2026-08-13 18:00:00"
  },
  {
    "vin": "FDB21_224250283",
    "lat": 35.181728,
    "lng": 128.607721,
    "address": "대한민국 경상남도 창원시 성산구 두산볼보로 22",
    "lastDatetime": "2026-08-13 08:44:02"
  },
  {
    "vin": "FDB21_224250294",
    "lat": 35.141885,
    "lng": 128.478358,
    "address": "대한민국 경상남도 창원시 마산합포구 진북면 농공단지로 26",
    "lastDatetime": "2026-08-13 16:53:48"
  },
  {
    "vin": "FDB21_224250305",
    "lat": 35.546105,
    "lng": 128.488616,
    "address": "대한민국 경상남도 창녕군 창녕읍 교리 968-37",
    "lastDatetime": "2026-08-13 13:31:03"
  },
  {
    "vin": "FDB21_224250307",
    "lat": 35.413458,
    "lng": 129.336558,
    "address": "대한민국 울산광역시 울주군 온산읍 원산리 714",
    "lastDatetime": "2026-08-06 10:55:19"
  },
  {
    "vin": "FDB21_224250363",
    "lat": 35.212495,
    "lng": 128.91052,
    "address": "대한민국 부산광역시 강서구 식만로 207-16",
    "lastDatetime": "2026-08-13 16:33:23"
  },
  {
    "vin": "FDB21-002985",
    "lat": 35.109806,
    "lng": 128.841013,
    "address": "대한민국 경상남도 창원시 진해구 가주동 15",
    "lastDatetime": "2026-08-13 16:58:54"
  },
  {
    "vin": "FDB21-002991",
    "lat": 35.109988,
    "lng": 128.841086,
    "address": "대한민국 경상남도 창원시 진해구 가주동 25",
    "lastDatetime": "2026-08-13 16:45:10"
  },
  {
    "vin": "FDB21-003185",
    "lat": 35.428196,
    "lng": 129.335678,
    "address": "대한민국 울산광역시 LG온산공장",
    "lastDatetime": "2026-08-13 16:38:59"
  },
  {
    "vin": "FDB21-003358",
    "lat": 35.213861,
    "lng": 128.659886,
    "address": "대한민국 경상남도 창원시 성산구 공단로 303",
    "lastDatetime": "2026-08-13 19:15:16"
  },
  {
    "vin": "FDB21_224250428",
    "lat": 35.301465,
    "lng": 128.833086,
    "address": "대한민국 경상남도 김해시 한림면 안하리 2002-5",
    "lastDatetime": "2026-08-13 17:20:33"
  },
  {
    "vin": "FDB21_224250450",
    "lat": 35.787685,
    "lng": 128.850281,
    "address": "대한민국 경상북도 경산시 남산면 경리 380-2",
    "lastDatetime": "2026-08-13 17:50:54"
  },
  {
    "vin": "FDB21_225060005",
    "lat": 37.035308,
    "lng": 126.763128,
    "address": "대한민국 경기도 화성시 우정읍 매향리 905-49",
    "lastDatetime": "2026-08-13 14:26:51"
  },
  {
    "vin": "FDB21_225060095",
    "lat": 35.516078,
    "lng": 129.384438,
    "address": "대한민국 울산광역시 남구 매암동 1-5",
    "lastDatetime": "2026-08-13 16:01:02"
  },
  {
    "vin": "FDB21_225060126",
    "lat": 35.089435,
    "lng": 128.778393,
    "address": "대한민국 경상남도 창원시 진해구 신항10로 133",
    "lastDatetime": "2026-08-07 16:45:23"
  },
  {
    "vin": "FDB21_225060182",
    "lat": 35.377693,
    "lng": 129.04759,
    "address": "대한민국 경상남도 양산시 상북면 소토리 479-66",
    "lastDatetime": "2026-08-13 08:27:01"
  },
  {
    "vin": "FDB21_225060407",
    "lat": 35.418911,
    "lng": 128.825551,
    "address": "대한민국 경상남도 밀양시 삼랑진읍 용전리 992-8",
    "lastDatetime": "2026-08-13 12:20:15"
  },
  {
    "vin": "FDB21_225380045",
    "lat": 35.28514,
    "lng": 128.401393,
    "address": "대한민국 경상남도 함안군 가야읍 도항리 254-114",
    "lastDatetime": "2026-08-12 16:02:46"
  },
  {
    "vin": "FDB21-001898",
    "lat": 35.282716,
    "lng": 128.31335,
    "address": "대한민국 경상남도 함안군 군북면 사도리 1017-2",
    "lastDatetime": "2026-08-13 16:53:37"
  },
  {
    "vin": "FDB21-001903",
    "lat": 35.231285,
    "lng": 128.641606,
    "address": "대한민국 경상남도 창원시 의창구 사화동 42-1",
    "lastDatetime": "2026-08-13 16:56:07"
  },
  {
    "vin": "FDB21_224030182",
    "lat": 35.200046,
    "lng": 128.59281,
    "address": "대한민국 경상남도 창원시 성산구 신촌동 62-5",
    "lastDatetime": "2026-08-09 09:21:06"
  },
  {
    "vin": "FDB21_224030105",
    "lat": 35.241323,
    "lng": 128.781561,
    "address": "대한민국 경상남도 김해시 진례면 송현리 1045-9",
    "lastDatetime": "2026-08-13 16:01:23"
  },
  {
    "vin": "FDB21_224030076",
    "lat": 37.484351,
    "lng": 126.612971,
    "address": "대한민국 인천광역시 동구 만석동 2-296",
    "lastDatetime": "2026-08-07 09:31:45"
  },
  {
    "vin": "FDB21-002887",
    "lat": 35.203171,
    "lng": 128.601116,
    "address": "대한민국 창원시 세아창원특수강후문",
    "lastDatetime": "2026-08-13 19:17:48"
  },
  {
    "vin": "FDB21-002888",
    "lat": 35.203525,
    "lng": 128.600818,
    "address": "대한민국 창원시 세아창원특수강후문",
    "lastDatetime": "2026-08-13 19:20:19"
  },
  {
    "vin": "FBA32_DEMO_CS01",
    "lat": 37.035646,
    "lng": 126.787038,
    "address": "경기도 화성시 우정읍 이화리",
    "lastDatetime": "2026-09-10 14:00:00",
    "demo": true
  },
  {
    "vin": "FBA18_DEMO_CS02",
    "lat": 37.035246,
    "lng": 126.787238,
    "address": "경기도 화성시 우정읍 이화리",
    "lastDatetime": "2026-09-10 14:00:00",
    "demo": true
  },
  {
    "vin": "FBD30_DEMO_CS03",
    "lat": 37.035446,
    "lng": 126.787538,
    "address": "경기도 화성시 우정읍 이화리",
    "lastDatetime": "2026-09-10 14:00:00",
    "demo": true
  }
];

const MIQCharts=root.MIQCharts;
function efficiency(rows,period,from,to){var state={rows,period},PERIOD={[period]:{from,to}};function seeded(key) {
      var seed = 0;
      for (var index = 0; index < key.length; index++) seed = (seed * 31 + key.charCodeAt(index)) >>> 0;
      return function () {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff;
        return seed / 0x7fffffff;
      };
    }
function build() {
      var axis = MIQCharts.axis(state.period, PERIOD[state.period].from, PERIOD[state.period].to);
      var labels = axis.labels, count = axis.n, bucket = axis.bucket, filled = axis.filled, index;

      var columns = [];
      var byVehicle = {};
      var totalWork = 0;
      var totalIdle = 0;
      for (index = 0; index < count; index++) columns.push(index < filled ? { work: 0, idle: 0 } : null);

      state.rows.forEach(function (vehicle) {
        var random = seeded(vehicle.vin + state.period + PERIOD[state.period].from + PERIOD[state.period].to);
        byVehicle[vehicle.vin] = { vehicle: vehicle, work: 0, idle: 0, capacity: 0 };
        for (var columnIndex = 0; columnIndex < filled; columnIndex++) {
          var work = 0;
          var idle = 0;
          for (var bucketIndex = 0; bucketIndex < bucket; bucketIndex++) {
            var running = state.period === 'd'
              ? (columnIndex >= 7 && columnIndex <= 18 ? .6 + random() * .4 : random() * .25)
              : 6 + random() * 3.5;
            var ratio = .6 + random() * .25;
            work += running * ratio;
            idle += running * (1 - ratio);
          }
          columns[columnIndex].work += work;
          columns[columnIndex].idle += idle;
          byVehicle[vehicle.vin].work += work;
          byVehicle[vehicle.vin].idle += idle;
          byVehicle[vehicle.vin].capacity += Math.max(state.period === 'd' ? 1 : 10 * bucket, work + idle);
          totalWork += work;
          totalIdle += idle;
        }
      });

      var divisor = state.rows.length || 1;
      columns.forEach(function (column) {
        if (!column) return;
        column.work /= divisor;
        column.idle /= divisor;
      });
      var top = Object.keys(byVehicle).map(function (vin) { return byVehicle[vin]; })
        .sort(function (left, right) { return right.work - left.work; }).slice(0, 5);
      return {
        labels: labels,
        detailLabels: axis.detailLabels,
        columns: columns,
        top: top,
        vehicles: Object.keys(byVehicle).map(function (vin) { return byVehicle[vin]; }),
        filled: filled,
        bucket: bucket,
        average: {
          work: filled ? totalWork / divisor / filled : 0,
          idle: filled ? totalIdle / divisor / filled : 0
        },
        averageVehicleWorkTotal: totalWork / divisor
      };
    }
return build();}
function shocks(rows,period,from,to){var state={rows,period},PERIOD={[period]:{from,to}};function seeded(key) {
    var s = 0;
    for (var i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
function build() {
    var p = state.period;
    var axis = MIQCharts.axis(p, PERIOD[p].from, PERIOD[p].to);
    var labels = axis.labels, n = axis.n, i, bucket = axis.bucket, filled = axis.filled;

    var series = { s3: [], s4: [], s5: [] }, byVeh = {};
    for (i = 0; i < n; i++) { series.s3.push(i < filled ? 0 : null); series.s4.push(i < filled ? 0 : null); series.s5.push(i < filled ? 0 : null); }

    state.rows.forEach(function (v) {
      var rnd = seeded(v.vin + p + PERIOD[p].from + PERIOD[p].to);
      byVeh[v.vin] = { model: v.model, vin: v.vin, total: 0 };
      for (i = 0; i < filled; i++) {
        var work = p === 'd' ? (i >= 7 && i <= 18 ? 1 : 0.15) : 1;     /* 일 조회는 근무시간에 집중 */
        for (var b = 0; b < bucket; b++) {                             /* 사용자설정은 7일치 합산 */
          var s3 = Math.round((1 + rnd() * 8 + v.shock * 0.6) * work);
          var s4 = Math.round(s3 * (0.45 + rnd() * 0.35));
          var s5 = rnd() < 0.1 ? 1 + Math.round(rnd()) : 0;
          series.s3[i] += s3; series.s4[i] += s4; series.s5[i] += s5;
          byVeh[v.vin].total += s3 + s4 + s5;
        }
      }
    });

    var top = Object.keys(byVeh).map(function (k) { return byVeh[k]; })
      .sort(function (a, b) { return b.total - a.total; }).slice(0, 5);
    return { labels: labels, detailLabels: axis.detailLabels, series: series, top: top, filled: filled };
  }
return build();}
function summaryValue(vehicle,period,from,to){var PERIOD={
    d:{label:'일',range:['2026-07-03','2026-07-03'],factor:1/22,eff:1.03},
    w:{label:'주',range:['2026-06-29','2026-07-05'],factor:1/4.3,eff:.985},
    m:{label:'월',range:['2026-07-01','2026-07-31'],factor:1,eff:1},
    c:{label:'설정 기간',range:['2026-05-01','2026-07-31'],factor:3.05,eff:.96}
  };
var state={period};var a=root.MIQCommon.dates.parse(from),b=root.MIQCommon.dates.parse(to),days=a&&b?root.MIQCommon.dates.dayCount(a,b):0;if(period==='c'&&days>0&&days<=366)PERIOD.c.factor=days/30;function hasNumber(value){return value!==null&&value!==undefined&&value!==''&&!isNaN(Number(value))}
function isBattery(v){return v.type==='리튬'||v.type==='납산';}function periodValue(vehicle){
    var period=PERIOD[state.period];
    var baseEfficiency=hasNumber(vehicle.efficiencyRate)
      ? Number(vehicle.efficiencyRate)
      : isBattery(vehicle)&&hasNumber(vehicle.eff)?Number(vehicle.eff):null;
    return{
      km:vehicle.km*period.factor,
      min:vehicle.min*period.factor,
      efficiency:baseEfficiency===null?null:Math.min(99.5,baseEfficiency*period.eff),
      shock:Math.round(vehicle.shock*period.factor),
      fuel:vehicle.fc?vehicle.fc*(2-period.eff):null,
      battery:vehicle.bc?vehicle.bc*period.eff:null
    }
  }
return periodValue(vehicle);}
function reportValue(label,key,period,from,to){var state={co:label,period},PERIOD={[period]:{from,to}};var METRICS = [
    { key: 'eff',   label: '운영효율',      unit: '%',   agg: 'avg', lo: 55,  hi: 88,  dec: 1, betterHigh: true },
    { key: 'shock', label: '충격횟수',      unit: '건',  agg: 'sum', lo: 18,  hi: 120, dec: 0, betterHigh: false },
    { key: 'fuel',  label: '연료소비량',    unit: 'L/H', agg: 'avg', lo: 3.1, hi: 4.7, dec: 1, betterHigh: false },
    { key: 'batt',  label: '배터리 충전량', unit: '%',   agg: 'avg', lo: 17,  hi: 33,  dec: 1, betterHigh: true },
    { key: 'dist',  label: '운행거리',      unit: 'Km',  agg: 'sum', lo: 70,  hi: 260, dec: 1, betterHigh: true },
    { key: 'hour',  label: '운행시간',      unit: 'H',   agg: 'sum', lo: 150, hi: 700, dec: 0, betterHigh: true }
  ];
function seeded(key) {
    var s = 0;
    for (var i = 0; i < key.length; i++) s = (s * 31 + key.charCodeAt(i)) >>> 0;
    return function () { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  }
  function rd(n, d) { var p = Math.pow(10, d); return Math.round(n * p) / p; }
  function fmt(n, m) {
    return window.MIQCommon.numbers.integer(n, true) + m.unit;
  }
  function metric(key) { return METRICS.filter(function (m) { return m.key === key; })[0]; }

  /* ── 구간 라벨 ── */
  function buckets() {
    return MIQCharts.axis(state.period, PERIOD[state.period].from, PERIOD[state.period].to);
  }

  /* ── 데모 데이터 : 업체 · 지표 · 기간 기준 ── */
  function build(key) {
    var m = metric(key), b = buckets();
    function gen(seed, count) {
      var rnd = seeded(state.co + key + state.period + PERIOD[state.period].from + PERIOD[state.period].to + seed), a = [];
      for (var i = 0; i < count; i++) {
        var v = 0;
        for (var k = 0; k < b.bucket; k++) v += m.lo + rnd() * (m.hi - m.lo);
        a.push(rd(m.agg === 'sum' ? v : v / b.bucket, m.dec));
      }
      return a;
    }
    var curA = gen('cur', b.filled), prevA = gen('prev', b.n);
    var cols = [];
    for (var i = 0; i < b.n; i++) cols.push({ prev: prevA[i], cur: i < b.filled ? curA[i] : null });
    var sum = function (a) { return a.reduce(function (s, x) { return s + x; }, 0); };
    var agg = function (a) { return rd(m.agg === 'sum' ? sum(a) : sum(a) / a.length, m.dec); };
    return { m: m, labels: b.labels, detailLabels: b.detailLabels, cols: cols, filled: b.filled, cur: agg(curA), prev: agg(prevA) };
  }
return build(key);}
const common=root.MIQCommon;
var principals = {
      dealer_owner: 'dealer.park@sejonglog.co.kr', dealer_staff: 'staff.jung@sejonglog.co.kr',
      customer_owner: 'leader.yoon@customer.co.kr', customer_staff: 'user.oh@customer.co.kr'
    };
function seedUserRequests() {
      return [
        { id:'UR-20260706-01', email:'kim.jh@sejong.co.kr', name:'김지훈', role:'고객 직원', company:'(주)세종물류중부지점', phone:'010-****-4821', registered:'2026-07-06 09:41', processed:'', status:'REQ', processor:'', processorRole:'', reason:'', approverId:principals.customer_owner, group:'' },
        { id:'UR-20260705-01', email:'park.sy@sejong.co.kr', name:'박서연', role:'딜러 직원', company:'세종모터스', phone:'010-****-5720', registered:'2026-07-05 16:22', processed:'', status:'REQ', processor:'', processorRole:'', reason:'', approverId:principals.dealer_owner, group:'전체' },
        { id:'UR-20260703-01', email:'ceo@daeyoung-eng.co.kr', name:'정대영', role:'딜러 대표', company:'대영엔지니어링(주)', phone:'010-****-3301', registered:'2026-07-03 11:08', processed:'', status:'REQ', processor:'', processorRole:'', reason:'', approverId:'internal', group:'전체' },
        { id:'UR-20260702-01', email:'lee.ms@minsoo-log.kr', name:'이민수', role:'고객 대표', company:'민수물류', phone:'010-****-6244', registered:'2026-07-02 14:55', processed:'', status:'REQ', processor:'', processorRole:'', reason:'', approverId:principals.dealer_owner, group:'전체' },
        { id:'UR-20260621-01', email:'cho.hj@sejong.co.kr', name:'조현지', role:'고객 직원', company:'(주)세종물류중부지점', phone:'010-****-9018', registered:'2026-06-21 13:20', processed:'2026-06-22 10:14', status:'APRV', processor:'윤태호', processorRole:'고객 대표', reason:'', approverId:principals.customer_owner, group:'테스트그룹' },
        { id:'UR-20260612-01', email:'leader.han@hanbit.co.kr', name:'한지민', role:'고객 대표', company:'한빛산업', phone:'010-****-1184', registered:'2026-06-12 08:44', processed:'2026-06-13 11:08', status:'APRV', processor:'박민아', processorRole:'딜러 대표', reason:'', approverId:principals.dealer_owner, group:'전체' },
        { id:'UR-20260530-01', email:'dealer.temp@sejonglog.co.kr', name:'강도윤', role:'딜러 직원', company:'세종모터스', phone:'010-****-7732', registered:'2026-05-30 16:12', processed:'2026-06-01 09:21', status:'RJCT', processor:'박민아', processorRole:'딜러 대표', reason:'재직 확인 서류가 첨부되지 않았습니다.', approverId:principals.dealer_owner, group:'전체' }
      ];
    }
function currentDemoRequests(legacy, ageDays) {
    return legacy.map(function (record, index) {
      var date = common.dates.addDays(common.dates.today(), -ageDays[index]);
      var registered = common.dates.format(date) + record.registered.slice(10);
      var processed = '';
      if (record.processed) {
        var elapsed = Date.parse(record.processed.replace(' ', 'T')) - Date.parse(record.registered.replace(' ', 'T'));
        var completed = new Date(Date.parse(registered.replace(' ', 'T')) + elapsed);
        processed = common.dates.format(completed) + ' ' + String(completed.getHours()).padStart(2, '0') + ':' + String(completed.getMinutes()).padStart(2, '0');
      }
      return Object.assign({}, record, { registered: registered, processed: processed, demoDateRevision: '20260915-current' });
    });
  }
function nowText() {
    var d = new Date();
    function p(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }
root.CustomerWebContracts={common:root.MIQCommon,meeting:root.MIQMeeting,charts:MIQCharts,service:root.MIQServiceRecords,demo:root.MIQServiceDemo,times:root.MIQSummaryRow.times,lithium:root.MIQLithiumListModel,positions:root.MIQMapPositions,efficiency,shocks,summaryValue,reportValue,approvalSeed:function(){return currentDemoRequests(seedUserRequests(),[1,2,3,4,10,16,22]);},existingUsers:["admin@sejonglog.co.kr","cs.lee@sejonglog.co.kr","dealer.park@sejonglog.co.kr","dealer.choi@sejonglog.co.kr","staff.jung@sejonglog.co.kr","staff.kang@sejonglog.co.kr","leader.yoon@customer.co.kr","leader.shin@customer.co.kr","user.oh@customer.co.kr","user.lim@customer.co.kr"],principals,get approvalReference(){return nowText();},legacy:[{"kind":"error","vin":"FBA32_224250271","companyId":"1933","code":"P0003","description":"연료량 조절 밸브 회로 이상","category":"차량","level":"a","spn":"523","fmi":"3","date":"2026-07-25","dateTime":"2026-07-25 08:12","completedAt":null,"errorState":"current","pdfKey":"p0003"},{"kind":"error","vin":"FBA32_032068","companyId":"1933","code":"P0191","description":"연료 레일 압력 센서 범위 이상","category":"차량","level":"b","spn":"157","fmi":"2","date":"2026-07-20","dateTime":"2026-07-20 13:40","completedAt":"2026-07-21 13:40","errorState":"past","pdfKey":null},{"kind":"error","vin":"FBA32_224250271","companyId":"1933","code":"A7","description":"주행 제어 시스템 경고","category":"차량","level":"b","spn":"-","fmi":"-","date":"2026-07-24","dateTime":"2026-07-24 10:30","completedAt":null,"errorState":"current","pdfKey":null},{"kind":"error","vin":"FBA32_032042","companyId":"1933","code":"51","description":"유압 온도 경고","category":"차량","level":"c","spn":"-","fmi":"-","date":"2026-07-15","dateTime":"2026-07-15 10:05","completedAt":"2026-07-16 10:05","errorState":"past","pdfKey":null},{"kind":"error","vin":"FBA32_032068","companyId":"1933","code":"A","description":"시트 안전벨트 미착용","category":"차량","level":"c","spn":"-","fmi":"-","date":"2026-07-12","dateTime":"2026-07-12 09:15","completedAt":"2026-07-13 09:15","errorState":"past","pdfKey":null},{"kind":"error","vin":"FBA32_224250383","companyId":"1933","code":"16","description":"셀 밸런싱 이상","category":"배터리","level":"a","spn":"-","fmi":"-","date":"2026-07-26","dateTime":"2026-07-26 09:30","completedAt":null,"errorState":"current","pdfKey":null},{"kind":"maintenance","vin":"FBA32_224250271","companyId":"1933","date":"2026-07-03","dateTime":"2026-07-03 09:20","part":"트랜스미션","symptom":"오일누유","detail":"변속기 오일 누유 발생, 실링 교체","completed":true},{"kind":"maintenance","vin":"FBA32_224250271","companyId":"1933","date":"2026-07-08","dateTime":"2026-07-08 13:45","part":"조향장치","symptom":"유격발생","detail":"스티어링 링크 조정 및 체결 토크 확인","completed":true},{"kind":"maintenance","vin":"FBA32_224250271","companyId":"1933","date":"2026-07-11","dateTime":"2026-07-11 16:10","part":"전장","symptom":"경고등","detail":"배선 커넥터 접촉 상태 점검","completed":false},{"kind":"maintenance","vin":"FBA32_224250383","companyId":"1933","date":"2026-07-14","dateTime":"2026-07-14 10:00","part":"냉각계통","symptom":"과열","detail":"냉각수 보충 및 호스 누수 점검","completed":true},{"kind":"maintenance","vin":"FBA32_032042","companyId":"1933","date":"2026-07-18","dateTime":"2026-07-18 14:30","part":"유압","symptom":"작동지연","detail":"유압 실린더 점검 및 작동유 보충","completed":false},{"kind":"maintenance","vin":"FBA32_032042","companyId":"1933","date":"2026-07-22","dateTime":"2026-07-22 11:20","part":"브레이크","symptom":"제동불량","detail":"브레이크 패드 마모 상태 확인 후 교체","completed":true}],sourceHashes:{"_shared/common-logic.js":"a6f64c8db74a20689cf109a5893881e42d48886fda80ea756e35db6373a41d52","_shared/meeting-model.js":"b9aef6dedaba7abbd5118fa9b90d903bb7149b000794b6250fbc0963010eaae5","_shared/chart-common.js":"15c74452f8053e50beb87992240eac4fef8547a4fab8fdb80282c43fc6e0bb1d","_shared/service-records.js":"4e2247047570df87d702fea2e11164e500e379592e60006858a849f3ce98372f","_shared/service-demo-data.js":"dcd01d3f4b3632d03a3fd4ff741a319008137185f5421a42b12885b693f2ed4d","_shared/summary-row-model.js":"8ec5759511a3cf6bc23319c79b3a71e76fbcaa3cd08819c1cae7b5fe089c5500","_shared/lithium-list-model.js":"7303031cad80131e220e3172e7e3d3f1ba0770a2923cc80fd92db1555545376a","_shared/map-positions.js":"f0538ed3d6b1d0ce5dd0ae424da3b0ca3ac2f9d446ca1e5fd614194110433d20","_shared/operation-metrics-enhancements.js":"c07771cadbf82364fe1297f04c09618a239a7df0e84420f0ab3e704e856aab4b","Shock/shock-tobe.html":"9a93d92c7ee0df8aff9541c64d6d6c9a57c54f5945f34b9ed339b85ee9ba9f31","_shared/vehicle-summary-option-c.js":"7b6e44d91c1d8ca108ce68b17a9de74199a0428601ad162a9882ce392e2d5cba","Report Status/report-status-tobe.html":"5b392d4b1601e1f14f5e059e4ec61ba0fa7b97f388e5e24a1161edf294e9212a","_shared/map-management-enhancements.js":"6d02a821f091bc01663fb46b4b712097f4d4121fb9ad8fcb527f40f8c48f8407","Mgmt User/mgmt-user-tobe.html":"42430c1e7d5b618b4c067ce397de90ca6c852b05971541bd467ef0a33c2efa6b","Service/service-error-tobe.html":"d80b254c3ad5f6c0f18fc3fe6289e34de01b28d19d39d20b70cf7fc53c4a1eeb","Service/service-maintenance-tobe.html":"14b3b440b76239c7df8799989d6f0edbf9b40e1687e11cb9c459ed63b75f8230"}};
})(typeof window==='undefined'?globalThis:window);
if(typeof module==='object'&&module.exports)module.exports=globalThis.CustomerWebContracts;
