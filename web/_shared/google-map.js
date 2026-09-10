(function () {
  'use strict';
  var host = document.getElementById('map'), canvas = document.getElementById('googleMapCanvas');
  if (!host || !canvas) return;
  var frame = document.createElement('iframe');
  frame.title = 'Google 지도'; frame.allowFullscreen = true; frame.referrerPolicy = 'no-referrer-when-downgrade';
  frame.setAttribute('loading', 'eager'); canvas.appendChild(frame);
  host.dataset.mapProvider = 'google-embed';
  var status = document.createElement('div'); status.className = 'miq-map-status'; status.setAttribute('role', 'status');
  host.appendChild(status);
  var current = {}, scopeKey = '', selected = '', center = { lat: 36.5, lng: 127.5 }, point = null, zoom = 7, type = 'map', lastSrc = '';
  function message(text) { status.textContent = text || ''; status.hidden = !text; }
  function view() {
    var url = new URL('https://maps.google.com/maps');
    url.search = new URLSearchParams({ output: 'embed', hl: 'ko', ll: center.lat + ',' + center.lng, z: String(zoom), t: type === 'sat' ? 'k' : 'm' }).toString();
    if (point) url.searchParams.set('q', point.lat + ',' + point.lng);
    if (url.href !== lastSrc) { lastSrc = url.href; frame.src = lastSrc; canvas.dataset.mapState = 'loading'; }
    canvas.dataset.mapType = type === 'sat' ? 'satellite' : 'roadmap'; canvas.dataset.mapZoom = String(zoom);
    canvas.dataset.selectedVin = selected; canvas.dataset.positionCount = String(current.positionCount || 0);
    var label = host.querySelector('.mm-zoom-level'); if (label) label.textContent = String(zoom);
  }
  function sync(value) {
    current = value || current;
    var data = window.MIQMapData ? MIQMapData.rows : [];
    var visible = new Set(current.visibleVins || []);
    var rows = data.filter(function (row) { return visible.has(row.vin) && row.hasPosition; });
    var scope = rows.map(function (row) { return row.vin; }).sort().join('|');
    var selectedRow = data.find(function (row) { return visible.has(row.vin) && row.vin === current.selectedVin; });
    if (scope !== scopeKey || selected !== (current.selectedVin || '')) {
      scopeKey = scope; selected = current.selectedVin || ''; point = null;
      if (selectedRow && selectedRow.hasPosition) {
        center = point = { lat: selectedRow.lat, lng: selectedRow.lng }; zoom = 16;
      } else if (rows.length === 1) {
        center = point = { lat: rows[0].lat, lng: rows[0].lng }; zoom = 16;
      } else if (rows.length) {
        var lats = rows.map(function (row) { return row.lat; }), lngs = rows.map(function (row) { return row.lng; });
        var minLat = Math.min.apply(null, lats), maxLat = Math.max.apply(null, lats), minLng = Math.min.apply(null, lngs), maxLng = Math.max.apply(null, lngs);
        center = { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 };
        zoom = Math.max(3, Math.min(15, Math.floor(Math.log2(360 / Math.max(maxLat - minLat, maxLng - minLng, .005))) - 1));
      }
    }
    current.positionCount = rows.length;
    message(!visible.size ? '조회 조건에 해당하는 장비가 없습니다.'
      : selectedRow && !selectedRow.hasPosition ? '선택 차량의 위치 정보가 수집되지 않았습니다.'
      : !rows.length ? '조회 차량의 위치 정보가 수집되지 않았습니다.' : '');
    if (current.routeMode) message(selected ? '선택한 운행일의 이동 경로 기록이 없습니다.' : '장비목록에서 차량 1대를 선택해 주세요.');
    view();
  }
  frame.addEventListener('load', function () { canvas.dataset.mapState = 'ready'; canvas.dataset.embedLoaded = 'true'; });
  frame.addEventListener('error', function () { canvas.dataset.mapState = 'error'; message('지도를 불러오지 못했습니다. 네트워크 연결을 확인해 주세요.'); });
  window.MIQGoogleMap = {
    sync: sync,
    zoomBy: function (amount) { zoom = Math.max(2, Math.min(21, zoom + amount)); view(); },
    setType: function (value) { type = value === 'sat' ? 'sat' : 'map'; view(); },
    getZoom: function () { return zoom; }
  };
  message('지도를 불러오는 중입니다.'); view();
})();
