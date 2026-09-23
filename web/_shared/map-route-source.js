/* IMQ GPS-history adapter. No fabricated coordinates and no calls until configured. */
(function (root) {
  'use strict';
  function unavailable() {
    var error = new Error('이동 경로 조회 연결이 설정되지 않았습니다.');
    error.code = 'ROUTE_NOT_CONFIGURED';
    return error;
  }
  async function load(input, options) {
    var query = root.MIQMapRouteModel.buildQuery(input);
    var config = root.MIQMapConfig || {};
    var result;
    if (typeof config.loadRoute === 'function') {
      result = await config.loadRoute(query, options || {});
    } else if (config.routeEndpoint || config.routeApiBaseUrl) {
      var endpoint=config.routeEndpoint||(String(config.routeApiBaseUrl).replace(/\/$/,'')+'/common/gps/find-gps-track');
      var url = new URL(endpoint, root.location.href);
      if (!/^https?:$/.test(url.protocol)) throw unavailable();
      Object.keys(query).forEach(function (key) { url.searchParams.set(key, query[key]); });
      var contextHeaders=typeof config.routeHeaders==='function'?await config.routeHeaders(query):{};
      var response = await fetch(url.href, {
        method: 'GET', credentials: 'include', signal: options && options.signal,
        headers: Object.assign({ Accept: 'application/json', 'X-Client-Site':'fleet' },contextHeaders)
      });
      if(response.status===401||response.status===403){var authError=new Error('차량 경로 조회 권한 또는 서버 로그인 상태를 확인해 주세요.');authError.code='ROUTE_AUTH_REQUIRED';throw authError;}
      if (!response.ok) throw new Error('이동 경로를 불러오지 못했습니다. 다시 조회해 주세요.');
      result = await response.json();
    } else {
      throw unavailable();
    }
    return root.MIQMapRouteModel.normalizeResponse(result, input.vin, input.from, input.to, {timeZone: config.timeZone || 'Asia/Seoul'});
  }
  root.MIQMapRouteSource = {load: load};
})(window);
