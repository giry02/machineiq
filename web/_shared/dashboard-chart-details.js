(function () {
  'use strict';
  var host = document.getElementById('dashboardContent');
  if (!host || !window.MIQCharts) return;
  function text(node) { return node ? node.textContent.trim().replace(/\s+/g, ' ') : ''; }
  function set(node, detail) {
    if (!node || !detail) return;
    node.setAttribute('data-chart-tip', detail);
    if (!node.hasAttribute('tabindex')) node.tabIndex = 0;
    if (!node.hasAttribute('role')) node.setAttribute('role', 'img');
    if (!node.hasAttribute('data-dashboard-href')) node.setAttribute('aria-label', detail);
  }
  function enhance() {
    host.querySelectorAll('.status-metric__track').forEach(function (track) {
      var card = track.closest('.status-metric');
      set(track, text(card.querySelector('.status-metric__label')) + '\n' + text(card.querySelector('.status-metric__details')) + '\n' + text(card.querySelector('.status-metric__rate')));
    });
    host.querySelectorAll('.matrix-rate__track').forEach(function (track) {
      var row = track.closest('tr');
      set(track, text(row.querySelector('th')) + '\n가동률 ' + text(track.parentElement.querySelector('b')));
    });
    host.querySelectorAll('.compare-track').forEach(function (track) {
      var card = track.closest('.compare-metric');
      var unit = text(card.querySelector('.compare-metric__current small'));
      set(track, text(card.querySelector('.compare-metric__label')) + '\n' + text(track.querySelector('span')) + ' ' + text(track.querySelector('b')) + ' ' + unit);
    });
  }
  MIQCharts.bind(host);
  enhance();
  new MutationObserver(enhance).observe(host, {childList: true, subtree: true, characterData: true});
})();
