/* Public configuration contract. Do not put server credentials in this file.
   Supply a website-restricted Maps browser key to enable the interactive map.
   routeEndpoint must point to the authenticated IMQ backend, not Google Directions.
   A host may inject loadRoute(query, {signal}) instead of routeEndpoint. */
window.MIQMapConfig = Object.assign({
  apiKey: '',
  routeEndpoint: '',
  timeZone: 'Asia/Seoul'
}, window.MIQMapConfig || {});
