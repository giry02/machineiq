/* Reuses the current Map/map-tobe.html marker/popup classes and markup order.
   Mount each returned node once; the map adapter owns coordinates and selection.
   Callbacks receive (row, event). Keep role/scope-aware URLs in the map adapter. */
(function (root) {
  'use strict';

  var doc = root.document;
  var SVG_NS = 'http://www.w3.org/2000/svg';
  var DEFAULT_DETAIL = '../Vehicle%20Detail/vehicle-detail-tobe.html';
  var STATUS = {
    ok: { label: '정상', className: 'ok' },
    bad: { label: 'Fault', className: 'bad' },
    off: { label: '미연결', className: 'off' },
    unknown: { label: '통신 미수집', className: 'unknown' }
  };

  function text(value, fallback) {
    return value === null || value === undefined || String(value).trim() === ''
      ? (fallback === undefined ? '-' : fallback) : String(value);
  }

  function element(tag, className, value) {
    var node = doc.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = value;
    return node;
  }

  function statusFor(row) {
    return Object.prototype.hasOwnProperty.call(STATUS, row.st) ? STATUS[row.st] : STATUS.unknown;
  }

  function detailUrl(value) {
    try {
      var url = new URL(String(value || DEFAULT_DETAIL), doc.baseURI);
      if (url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'file:') return url.href;
    } catch (error) { /* Invalid or executable URLs never become link destinations. */ }
    return DEFAULT_DETAIL;
  }

  function valueRow(label, value) {
    var row = element('div', 'map-pop__r');
    row.appendChild(doc.createTextNode(label));
    row.appendChild(element('b', '', text(value)));
    return row;
  }

  function createVehicle(row, options) {
    row = row || {};
    options = options || {};
    var popup = element('div', 'map-pop');
    popup.dataset.vin = text(row.vin, '');
    /* Google InfoWindow content must occupy height; the adapter owns the anchor. */
    popup.style.position = 'relative';
    popup.style.left = 'auto';
    popup.style.top = 'auto';
    popup.style.transform = 'none';
    /* Native InfoWindow parents use their own Roboto typography. */
    popup.style.fontFamily = "'Noto Sans KR', sans-serif";
    popup.style.fontSize = '14px';
    popup.style.fontWeight = '400';
    popup.style.lineHeight = 'normal';

    var close = element('button', 'map-pop__x', '✕');
    close.type = 'button';
    close.setAttribute('aria-label', '차량 위치 팝업 닫기');
    close.style.border = '0';
    close.style.background = 'transparent';
    close.style.padding = '0';
    close.style.fontFamily = 'inherit';
    close.style.lineHeight = 'normal';
    close.addEventListener('click', function (event) {
      event.stopPropagation();
      if (typeof options.onClose === 'function') options.onClose(row, event);
    });
    popup.appendChild(close);

    var title = element('div', 'map-pop__t');
    title.appendChild(doc.createTextNode(text(row.model) + ' '));
    var vin = element('span', '', text(row.vin));
    vin.style.fontWeight = '400';
    vin.style.color = '#aaa';
    vin.style.fontSize = '11px';
    title.appendChild(vin);
    popup.appendChild(title);

    /* Older source rows omit hasPosition; only an explicit false is missing. */
    if (row.hasPosition === false) {
      popup.appendChild(valueRow('위치 정보', '수집 전'));
    } else {
      var status = statusFor(row);
      var stateRow = element('div', 'map-pop__r');
      stateRow.appendChild(doc.createTextNode('상태'));
      var stateValue = element('b');
      var pill = element('span', 'st-pill ' + status.className);
      var dot = element('i');
      dot.setAttribute('aria-hidden', 'true');
      pill.appendChild(dot);
      pill.appendChild(doc.createTextNode(status.label));
      stateValue.appendChild(pill);
      stateRow.appendChild(stateValue);
      popup.appendChild(stateRow);
      popup.appendChild(valueRow('소속 그룹', text(row.group)));
      popup.appendChild(valueRow('총 가동시간', row.runH === null || row.runH === undefined ? '-' : String(row.runH) + 'H'));
      popup.appendChild(valueRow('위치 기준 시간', text(row.posTime)));
      var address = element('div', 'map-pop__r', text(row.addr));
      address.style.display = 'block';
      address.style.color = '#555';
      address.style.paddingTop = '6px';
      popup.appendChild(address);
    }

    var detail = element('a', 'map-pop__go', '차량 상세 ›');
    detail.href = detailUrl(options.detailHref);
    popup.appendChild(detail);
    return popup;
  }

  function createMarker(row, options) {
    row = row || {};
    options = options || {};
    var marker = element('div', 'marker');
    marker.dataset.vin = text(row.vin, '');
    marker.title = text(row.model) + ' · ' + text(row.vin);
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', marker.title + ' 위치 정보 보기');
    marker.tabIndex = 0;
    marker.style.fontFamily = "'Noto Sans KR', sans-serif";

    var pin = element('div', 'marker__pin ' + statusFor(row).className);
    var svg = doc.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var path = doc.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', 'M4 17V9h9l3 3h4v5');
    svg.appendChild(path);
    ['7.5', '16.5'].forEach(function (x) {
      var wheel = doc.createElementNS(SVG_NS, 'circle');
      wheel.setAttribute('cx', x);
      wheel.setAttribute('cy', '18.5');
      wheel.setAttribute('r', '1.6');
      svg.appendChild(wheel);
    });
    pin.appendChild(svg);
    marker.appendChild(pin);
    marker.appendChild(element('span', 'marker__lb', text(row.model)));

    function select(event) {
      event.stopPropagation();
      if (typeof options.onSelect === 'function') options.onSelect(row, event);
    }
    marker.addEventListener('click', select);
    marker.addEventListener('keydown', function (event) {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      select(event);
    });
    return marker;
  }

  root.MIQMapPopup = { createVehicle: createVehicle, createMarker: createMarker };
})(window);
