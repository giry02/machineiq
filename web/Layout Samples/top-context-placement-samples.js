(function () {
  'use strict';

  var body = document.body;
  if (!body.classList.contains('sample-preview')) return;

  var optionNames = {
    compact: '1안 현행 이동형',
    labels: '2안 라벨 상단 필드형',
    domains: '3안 소속·차량 2영역형'
  };
  var option = new URLSearchParams(location.search).get('option');
  if (!optionNames[option]) option = 'compact';
  body.dataset.option = option;
  document.title = 'MACHINE IQ 조회 대상 상시 노출 샘플 · ' + optionNames[option];

  Array.prototype.forEach.call(document.querySelectorAll('[data-option-link]'), function (link) {
    var active = link.dataset.optionLink === option;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  var company = document.getElementById('scopeCompany');
  var group = document.getElementById('scopeGroup');
  var type = document.getElementById('scopeType');
  var vehicle = document.getElementById('scopeVehicle');
  var status = document.getElementById('scopeStatus');
  var tableBody = document.getElementById('scopeVehicleRows');
  var dialog = document.getElementById('vehicleSearchDialog');
  var searchQuery = document.getElementById('vehicleSearchQuery');
  var searchResults = document.getElementById('vehicleSearchResults');
  var catalog = window.MIQ && Array.isArray(window.MIQ.FLEET_CATALOG) ? window.MIQ.FLEET_CATALOG.slice() : [];
  var typeKeys = { '엔진': 'engine', '리튬': 'lithium', '납산': 'lead', '수소': 'hydrogen' };
  var typeLabels = { all: '전체 분류', engine: '엔진', lithium: '리튬', lead: '납산', hydrogen: '수소' };

  Array.prototype.forEach.call(document.querySelectorAll('.demo-period [data-period]'), function (button) {
    button.addEventListener('click', function () {
      Array.prototype.forEach.call(document.querySelectorAll('.demo-period [data-period]'), function (candidate) {
        var active = candidate === button;
        candidate.classList.toggle('active', active);
        candidate.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      var custom = button.dataset.period === 'custom';
      Array.prototype.forEach.call(document.querySelectorAll('.demo-period input'), function (input) { input.disabled = !custom; });
    });
  });
  document.getElementById('periodSearch').addEventListener('click', function () {
    var active = document.querySelector('.demo-period [data-period].active');
    var label = active ? active.textContent.trim() : '월';
    status.textContent = label + ' 기준으로 조회 기간을 적용했습니다.';
  });

  function typeKey(item) { return typeKeys[item.type] || 'other'; }
  function isBattery(item) { return item.type === '리튬' || item.type === '납산'; }
  function companyKey(item) { return String(item.companyId || 'unknown'); }
  function vehicleKey(item) { return String(item.vin); }
  function unique(values) { return values.filter(function (value, index) { return values.indexOf(value) === index; }); }
  function formatNumber(value, digits) {
    if (value == null || Number.isNaN(Number(value))) return '-';
    return Number(value).toLocaleString('ko-KR', { maximumFractionDigits: digits == null ? 1 : digits });
  }
  function addOption(select, value, text) {
    var node = document.createElement('option');
    node.value = value;
    node.textContent = text;
    select.appendChild(node);
  }
  function baseMatches(item, ignore) {
    if (ignore !== 'company' && company.value !== 'all' && companyKey(item) !== company.value) return false;
    if (ignore !== 'group' && group.value !== 'all' && item.group !== group.value) return false;
    if (ignore !== 'type' && type.value !== 'all' && typeKey(item) !== type.value) return false;
    return true;
  }
  function matchingVehicles() {
    return catalog.filter(function (item) {
      return baseMatches(item) && (vehicle.value === 'all' || vehicleKey(item) === vehicle.value);
    });
  }
  function companyLabel(value) {
    if (value === 'all') return '전체 업체';
    var item = catalog.filter(function (row) { return companyKey(row) === value; })[0];
    return item ? item.companyName : value;
  }
  function selectedVehicle() {
    return catalog.filter(function (item) { return vehicleKey(item) === vehicle.value; })[0] || null;
  }
  function repopulateCompanies(preferred) {
    var companies = unique(catalog.map(companyKey));
    company.innerHTML = '';
    addOption(company, 'all', '전체 업체 · ' + catalog.length + '대');
    companies.forEach(function (value) {
      var rows = catalog.filter(function (item) { return companyKey(item) === value; });
      addOption(company, value, companyLabel(value) + ' · ' + rows.length + '대');
    });
    company.value = preferred && companies.indexOf(preferred) > -1 ? preferred : 'all';
  }
  function repopulateGroups(preferred) {
    var rows = catalog.filter(function (item) { return company.value === 'all' || companyKey(item) === company.value; });
    var groups = unique(rows.map(function (item) { return item.group; }));
    group.innerHTML = '';
    addOption(group, 'all', '전체 그룹 · ' + rows.length + '대');
    groups.forEach(function (value) {
      addOption(group, value, value + ' · ' + rows.filter(function (item) { return item.group === value; }).length + '대');
    });
    group.disabled = company.value === 'all';
    group.value = preferred && groups.indexOf(preferred) > -1 ? preferred : 'all';
  }
  function repopulateTypes(preferred) {
    var rows = catalog.filter(function (item) {
      return (company.value === 'all' || companyKey(item) === company.value) && (group.value === 'all' || item.group === group.value);
    });
    var available = unique(rows.map(typeKey));
    type.innerHTML = '';
    addOption(type, 'all', '전체 분류 · ' + rows.length + '대');
    ['engine', 'lithium', 'lead', 'hydrogen'].forEach(function (value) {
      var count = rows.filter(function (item) { return typeKey(item) === value; }).length;
      if (count) addOption(type, value, typeLabels[value] + ' · ' + count + '대');
    });
    type.value = preferred && available.indexOf(preferred) > -1 ? preferred : 'all';
  }
  function repopulateVehicles(preferred) {
    var rows = catalog.filter(function (item) { return baseMatches(item); });
    vehicle.innerHTML = '';
    addOption(vehicle, 'all', '전체 차량 · ' + rows.length + '대');
    rows.forEach(function (item) { addOption(vehicle, vehicleKey(item), item.model + ' · ' + item.vin); });
    vehicle.value = preferred && rows.some(function (item) { return vehicleKey(item) === preferred; }) ? preferred : 'all';
  }
  function currentPath() {
    var selected = selectedVehicle();
    if (selected) return [selected.companyName, selected.group, selected.type, selected.model + ' · ' + selected.vin].join(' › ');
    if (company.value === 'all' && type.value === 'all') return '전체 업체';
    var path = [];
    if (company.value !== 'all') path.push(companyLabel(company.value));
    if (group.value !== 'all') path.push(group.value);
    if (type.value !== 'all') path.push(typeLabels[type.value]);
    return path.length ? path.join(' › ') : '전체 업체';
  }
  function renderRows(rows) {
    tableBody.innerHTML = '';
    if (!rows.length) {
      var empty = document.createElement('tr');
      var cell = document.createElement('td');
      cell.colSpan = 6;
      cell.className = 'demo-table-empty';
      cell.textContent = '선택한 조건에 맞는 차량이 없습니다.';
      empty.appendChild(cell);
      tableBody.appendChild(empty);
      return;
    }
    rows.forEach(function (item) {
      var tr = document.createElement('tr');
      var identity = document.createElement('td');
      var vin = document.createElement('b');
      var model = document.createElement('small');
      vin.textContent = item.vin;
      model.textContent = item.model;
      identity.appendChild(vin);
      identity.appendChild(model);
      tr.appendChild(identity);
      [
        item.group + ' · ' + item.type,
        item.cumKm == null ? '-' : formatNumber(item.cumKm, 0) + ' Km',
        item.cumH == null ? '-' : formatNumber(item.cumH, 0) + ' H',
        item.efficiencyRate != null ? formatNumber(item.efficiencyRate, 1) + '%' : (isBattery(item) && item.eff != null ? formatNumber(item.eff, 1) + '%' : '-')
      ].forEach(function (text) {
        var td = document.createElement('td');
        td.textContent = text;
        tr.appendChild(td);
      });
      var connection = document.createElement('td');
      var dot = document.createElement('span');
      dot.className = 'status-dot' + (item.conn === true ? '' : ' is-off');
      connection.appendChild(dot);
      connection.appendChild(document.createTextNode(item.conn === true ? '연결됨' : item.conn === false ? '연결 끊김' : '수집 전'));
      tr.appendChild(connection);
      tableBody.appendChild(tr);
    });
  }
  function renderKpis(rows) {
    var typeCount = { engine: 0, lead: 0, lithium: 0, hydrogen: 0 };
    rows.forEach(function (item) { if (Object.prototype.hasOwnProperty.call(typeCount, typeKey(item))) typeCount[typeKey(item)] += 1; });
    document.getElementById('scopeKpiComposition').textContent = '엔진 ' + typeCount.engine + ' · 납산 ' + typeCount.lead + ' · 리튬 ' + typeCount.lithium + (typeCount.hydrogen ? ' · 수소 ' + typeCount.hydrogen : '');
    var efficiencies = rows.map(function (item) {
      if (item.efficiencyRate != null) return Number(item.efficiencyRate);
      return isBattery(item) && item.eff != null ? Number(item.eff) : null;
    }).filter(function (value) { return value != null && Number.isFinite(value); });
    var efficiency = efficiencies.length ? efficiencies.reduce(function (sum, value) { return sum + value; }, 0) / efficiencies.length : null;
    document.getElementById('scopeKpiEfficiency').textContent = efficiency == null ? '-' : formatNumber(efficiency, 1) + '%';
    document.getElementById('scopeKpiShock').textContent = formatNumber(rows.reduce(function (sum, item) { return sum + Number(item.shock || 0); }, 0), 0) + '회';
    document.getElementById('scopeKpiDistance').textContent = formatNumber(rows.reduce(function (sum, item) { return sum + Number(item.km || 0); }, 0), 0) + ' Km';
    document.getElementById('scopeKpiHours').textContent = formatNumber(rows.reduce(function (sum, item) { return sum + Number(item.min || 0); }, 0) / 60, 1) + ' H';
  }
  function paintScope(announce) {
    var rows = matchingVehicles();
    var path = currentPath();
    var count = rows.length + '대';
    Array.prototype.forEach.call(document.querySelectorAll('[data-current-path]'), function (node) { node.textContent = path; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-current-count]'), function (node) { node.textContent = count; });
    renderRows(rows);
    renderKpis(rows);
    status.textContent = (announce ? '조회 대상이 ' : '') + path + (announce ? ', 차량 ' : '의 차량 ') + count + (announce ? '로 변경되었습니다.' : '를 조회합니다.');
  }
  function chooseVehicle(vin) {
    var item = catalog.filter(function (candidate) { return vehicleKey(candidate) === vin; })[0];
    if (!item) return;
    company.value = companyKey(item);
    repopulateGroups(item.group);
    repopulateTypes(typeKey(item));
    repopulateVehicles(vehicleKey(item));
    paintScope(true);
  }

  company.addEventListener('change', function () {
    repopulateGroups('all');
    repopulateTypes('all');
    repopulateVehicles('all');
    paintScope(true);
  });
  group.addEventListener('change', function () {
    repopulateTypes('all');
    repopulateVehicles('all');
    paintScope(true);
  });
  type.addEventListener('change', function () {
    repopulateVehicles('all');
    paintScope(true);
  });
  vehicle.addEventListener('change', function () {
    var item = selectedVehicle();
    if (item) chooseVehicle(vehicleKey(item));
    else paintScope(true);
  });
  document.getElementById('scopeReset').addEventListener('click', function () {
    company.value = 'all';
    repopulateGroups('all');
    repopulateTypes('all');
    repopulateVehicles('all');
    paintScope(true);
  });

  function renderVehicleSearch() {
    var query = searchQuery.value.trim().toLowerCase();
    searchResults.innerHTML = '';
    var filtered = catalog.filter(function (item) {
      return !query || (item.model + ' ' + item.vin + ' ' + item.companyName + ' ' + item.group + ' ' + item.type).toLowerCase().indexOf(query) > -1;
    });
    if (!filtered.length) {
      var empty = document.createElement('div');
      empty.className = 'vehicle-search-empty';
      empty.textContent = '검색 결과가 없습니다.';
      searchResults.appendChild(empty);
      return;
    }
    filtered.forEach(function (item) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'vehicle-search-result';
      button.dataset.vehicleId = vehicleKey(item);
      var identity = document.createElement('b');
      identity.textContent = item.model + ' · ' + item.vin;
      var context = document.createElement('span');
      context.textContent = item.companyName + ' › ' + item.group + ' › ' + item.type;
      var action = document.createElement('em');
      action.textContent = '선택';
      button.appendChild(identity);
      button.appendChild(context);
      button.appendChild(action);
      searchResults.appendChild(button);
    });
  }
  function closeVehicleSearch() {
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }
  document.getElementById('vehicleSearchButton').addEventListener('click', function () {
    searchQuery.value = '';
    renderVehicleSearch();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    searchQuery.focus();
  });
  searchQuery.addEventListener('input', renderVehicleSearch);
  searchResults.addEventListener('click', function (event) {
    var button = event.target.closest('[data-vehicle-id]');
    if (!button) return;
    chooseVehicle(button.dataset.vehicleId);
    closeVehicleSearch();
  });
  Array.prototype.forEach.call(document.querySelectorAll('[data-search-close]'), function (button) {
    button.addEventListener('click', closeVehicleSearch);
  });
  dialog.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && typeof dialog.close !== 'function') closeVehicleSearch();
  });

  repopulateCompanies('all');
  repopulateGroups('all');
  repopulateTypes('all');
  repopulateVehicles('all');
  paintScope(false);
}());
