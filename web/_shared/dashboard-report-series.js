/* Local preview adapter for Report Status's existing six metric fixtures.
 * This is NOT collected telemetry. The seed, limits, rounding and per-company
 * monthly generation are those of report-status-tobe.html/build(). No past
 * months are inferred from the dashboard's two comparison totals.
 * Calendar-month samples are cached and sliced, so range and annual charts
 * use the same observations. Future dates remain null. Production needs API.
 */
(function (root) {
  'use strict';
  var metrics = [
    { key:'eff', label:'운영효율', unit:'%', agg:'avg', lo:55, hi:88, dec:1 },
    { key:'shock', label:'충격횟수', unit:'건', agg:'sum', lo:18, hi:120, dec:0 },
    { key:'fuel', label:'시간당 연료소비량', unit:'L/H', agg:'avg', lo:3.1, hi:4.7, dec:1 },
    { key:'batt', label:'배터리 충전량', unit:'%', agg:'avg', lo:17, hi:33, dec:1 },
    { key:'dist', label:'운행거리', unit:'Km', agg:'sum', lo:70, hi:260, dec:1 },
    { key:'hour', label:'운행시간', unit:'H', agg:'sum', lo:150, hi:700, dec:0 }
  ];
  var cache = new Map();
  function seeded(key) {
    var s=0; for(var i=0;i<key.length;i++) s=(s*31+key.charCodeAt(i))>>>0;
    return function(){s=(s*1103515245+12345)&0x7fffffff;return s/0x7fffffff;};
  }
  function metric(key){return metrics.find(function(m){return m.key===key;});}
  function round(value, dec){var p=Math.pow(10,dec);return Math.round(value*p)/p;}
  function monthRows(entity, key, month, cutoff) {
    var m=metric(key),start=month+'-01',parts=month.split('-'),last=new Date(Date.UTC(+parts[0],+parts[1],0)).toISOString().slice(0,10);
    var end=last<cutoff?last:cutoff;
    if(start>end)return [];
    var id=entity+'|'+key+'|'+start+'|'+end;
    if(cache.has(id))return cache.get(id);
    var random=seeded(entity+key+'m'+start+end+'cur'),rows=[];
    for(var d=new Date(start+'T00:00:00Z');d.toISOString().slice(0,10)<=end;d=new Date(d.getTime()+86400000)){
      rows.push({date:d.toISOString().slice(0,10),value:round(m.lo+random()*(m.hi-m.lo),m.dec)});
    }
    cache.set(id,rows);return rows;
  }
  function aggregate(entities,key,from,to,cutoff){
    var m=metric(key),sum=0,weight=0;
    if(!m||!from||!to||from>to||!entities.length)return null;
    entities.forEach(function(entity){
      var samples=[], cursor=from.slice(0,7);
      while(cursor<=to.slice(0,7)){
        samples=samples.concat(monthRows(entity.name,key,cursor,cutoff).filter(function(r){return r.date>=from&&r.date<=to;}));
        var p=cursor.split('-');cursor=new Date(Date.UTC(+p[0],+p[1],1)).toISOString().slice(0,7);
      }
      var n=samples.length;if(!n)return;
      var total=samples.reduce(function(a,b){return a+b.value;},0);
      if(m.agg==='sum'){sum+=total;weight+=n;}
      else {var w=Math.max(1,Number(entity.count)||1);sum+=total*w;weight+=n*w;}
    });
    return weight? (m.agg==='sum'?sum:sum/weight):null;
  }
  function annual(entities,key,year,cutoff){
    return Array.from({length:12},function(_,i){var month=year+'-'+String(i+1).padStart(2,'0');return aggregate(entities,key,month+'-01',new Date(Date.UTC(year,i+1,0)).toISOString().slice(0,10),cutoff);});
  }
  root.MIQDashboardReportSeries={metrics:metrics,aggregate:aggregate,annual:annual};
  if(typeof module==='object'&&module.exports)module.exports=root.MIQDashboardReportSeries;
})(typeof window==='undefined'?globalThis:window);
