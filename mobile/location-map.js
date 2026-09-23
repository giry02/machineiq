/* Portable delivery deliberately contains no API key or SDK request. */
(() => {
  const $ = selector => document.querySelector(selector);
  window.CustomerLocationMap = {
    open(vehicle) {
      $('#location-map').setAttribute('aria-busy', 'false');
      $('#location-map-status').hidden = false;
      $('#location-map-status-text').textContent = 'Google 지도를 새 창으로 엽니다. 인터넷 연결이 필요합니다.';
      const link = $('#location-map-external');
      link.href = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(vehicle.lat + ',' + vehicle.lng);
      link.hidden = false;
    },
    close() {}, resize() {}
  };
})();
