/* Deterministic DEMO intervals, never measured telemetry.
 * Profiles, vehicle master and UI translations are separate inputs. A query
 * selects existing VIN/date/hour samples; it must never seed their values.
 * Production must replace this provider with server-authorized interval data.
 */
(function(root, factory) {
  var commonJS = typeof module === 'object' && module.exports;
  var api = factory(commonJS ? require('../_mock-data/master/observation-profiles.json') : root.MIQ_MOCK_DATA.observationProfiles,
    commonJS ? require('../_mock-data/master/fleet.json') : root.MIQ_MOCK_DATA.fleet);
  if (commonJS) module.exports = api; else root.MIQObservations = api;
})(typeof window === 'undefined' ? globalThis : window, function(source, fleet) {
  'use strict';
  var profiles = new Map((source.profiles || []).map(function(p) { return [p.vin, p]; }));
  var catalog = fleet.vehicles || [];
  var vehiclesByVin = new Map(catalog.map(function(v) { return [v.vin,v]; }));
  var sampleCache = new Map();
  function numeric(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0; }
  function percent(v) { return numeric(v) && v <= 100; }
  function date(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v || '')) return null;
    var d = new Date(v + 'T00:00:00Z');
    return Number.isFinite(d.getTime()) && d.toISOString().slice(0,10) === v ? d : null;
  }
  function shift(v, days) { return new Date(date(v).getTime() + days * 86400000).toISOString().slice(0,10); }
  function windowAt(now) {
    var d = new Date((now || new Date()).getTime() + 9 * 3600000);
    return { date:d.toISOString().slice(0,10), hours:d.getUTCHours(), timeZone:'Asia/Seoul' };
  }
  function cutoff(value) {
    var current = windowAt();
    if (typeof value === 'string') return value < current.date ? {date:value, hours:24} : current;
    return value || current;
  }
  function random(key) {
    var s = 2166136261;
    for (var i=0; i<key.length; i++) { s ^= key.charCodeAt(i); s = Math.imul(s,16777619); }
    return (s >>> 0) / 4294967296;
  }
  function part(total, hour) { return Math.floor(total / 10) + (hour < total % 10 ? 1 : 0); }
  function sample(vehicle, day, hour, asOf) {
    var p = vehicle && profiles.get(vehicle.vin), limit = cutoff(asOf);
    if (!p || !date(day) || hour < 0 || hour > 23 || day > limit.date || day === limit.date && hour >= limit.hours) return null;
    var key = p.vin + '|' + day;
    var cacheKey=key+'|'+hour;
    if(sampleCache.has(cacheKey))return sampleCache.get(cacheKey);
    var running = Math.min(600, Math.round(p.dailyRunningMinutes * (.8 + random(key) * .4)));
    var working = Math.round(running * p.workingShare);
    var slot = hour - 8, scheduled = slot >= 0 && slot < 10;
    var work = scheduled ? part(working,slot) : 0;
    var idle = scheduled ? part(running-working,9-slot) : 0;
    var minutes = work + idle;
    var shocks = Math.floor(p.dailyShockCount) + (random(key+'|shock') < p.dailyShockCount % 1 ? 1 : 0);
    // Explicit fixed DEMO scenario only: reuse the existing master charge level.
    // This is not collected historical SOC and must not replace a server's
    // period batteryRate response. No kWh-to-percent conversion is performed.
    var masterVehicle=vehiclesByVin.get(p.vin), chargeSource=p.batteryGaugeSource;
    var chargeValue=chargeSource==='fleet.soc.fixed-demo' && masterVehicle && masterVehicle.type!=='엔진' && percent(masterVehicle.soc) ? masterVehicle.soc : null;
    var row={vin:p.vin, date:day, hour:hour, workMinutes:work, idleMinutes:idle,
      capacityMinutes:scheduled ? 60 : 0,
      distanceMetres:Math.round(minutes / 60 * p.kmPerRunningHour * 1000),
      shockCount:scheduled ? part(shocks,slot) : 0,
      fuelLitres:numeric(p.fuelLitresPerHour) ? minutes / 60 * p.fuelLitresPerHour : null,
      batteryKwh:numeric(p.batteryKwhPerHour) ? minutes / 60 * p.batteryKwhPerHour : null,
      batteryChargePercent:chargeValue, batteryChargeProvenance:chargeValue===null?null:'fixed-demo-from-existing-master-soc', mock:true};
    if(sampleCache.size>=150000)sampleCache.clear();
    sampleCache.set(cacheKey,row);return row;
  }
  function totals(samples) {
    var rows = samples.filter(Boolean), work=0, idle=0, capacity=0, metres=0, shock=0;
    var fuel=0, fuelMinutes=0, fuelKnown=0, battery=0, batteryMinutes=0, batteryKnown=0, charge=0, chargeKnown=0;
    rows.forEach(function(r) {
      work+=r.workMinutes; idle+=r.idleMinutes; capacity+=r.capacityMinutes; metres+=r.distanceMetres; shock+=r.shockCount;
      if (numeric(r.fuelLitres)) { fuel+=r.fuelLitres; fuelMinutes+=r.workMinutes+r.idleMinutes; fuelKnown++; }
      if (numeric(r.batteryKwh)) { battery+=r.batteryKwh; batteryMinutes+=r.workMinutes+r.idleMinutes; batteryKnown++; }
      if (percent(r.batteryChargePercent)) { charge+=r.batteryChargePercent; chargeKnown++; }
    });
    var known=rows.length, running=work+idle;
    return {known:known, workMinutes:known?work:null, idleMinutes:known?idle:null, runningMinutes:known?running:null,
      capacityMinutes:known?capacity:null, distanceKm:known?metres/1000:null, shockCount:known?shock:null,
      efficiency:running>0?work/running*100:null, utilization:capacity>0?running/capacity*100:null,
      fuelLitres:fuelKnown?fuel:null, fuelRate:fuelMinutes>0?fuel/(fuelMinutes/60):null,
      batteryKwh:batteryKnown?battery:null, batteryRate:batteryMinutes>0?battery/(batteryMinutes/60):null,
      batteryChargePercent:chargeKnown?charge/chargeKnown:null};
  }
  function select(entity) {
    if (!entity) return [];
    if (Array.isArray(entity)) return unique(entity);
    if (entity.vehicles) return unique(entity.vehicles);
    if (entity.vin) return [entity];
    if (typeof entity === 'string') {
      var company = (fleet.dashboardCompanies || []).find(function(c) { return c.companyName===entity || String(c.companyId)===entity; });
      if (!company) return []; // Group names need a company scope; never guess it.
      entity={companyId:company.companyId};
    }
    var id=entity.companyId || entity.id;
    if (!id && entity.name) return select(entity.name);
    return catalog.filter(function(v) { return String(v.companyId)===String(id) && (!entity.group || v.group===entity.group); });
  }
  function unique(rows) { var seen=new Set(); return rows.filter(function(v) { if(seen.has(v.vin))return false; seen.add(v.vin); return true; }); }
  function intervals(entity, from, to, asOf, hour) {
    if (!date(from) || !date(to) || from>to || (date(to)-date(from))/86400000>365) return [];
    var vehicles=select(entity).filter(function(v) { return profiles.has(v.vin); }), rows=[];
    var limit=cutoff(asOf); if(to>limit.date)to=limit.date;
    for(var day=from;day<=to;day=shift(day,1)) vehicles.forEach(function(v) {
      for(var h=hour==null?0:hour;h<(hour==null?24:hour+1);h++) {var r=sample(v,day,h,limit);if(r)rows.push(r);}
    });
    return rows;
  }
  function aggregate(entity, from, to, asOf, hour) {
    var selected=select(entity), data=totals(intervals(selected,from,to,asOf,hour));
    data.vehicleCount=selected.length;
    data.knownVehicleCount=data.known ? selected.filter(function(v){return profiles.has(v.vin);}).length : 0;
    data.complete=data.knownVehicleCount===data.vehicleCount && data.vehicleCount>0;
    return data;
  }
  function value(data,key) {
    return {eff:data.efficiency,shock:data.shockCount,fuel:data.fuelRate,batt:data.batteryChargePercent,
      dist:data.distanceKm,hour:data.runningMinutes===null?null:data.runningMinutes/60}[key];
  }
  return {sample:sample,totals:totals,select:select,unique:unique,intervals:intervals,aggregate:aggregate,value:value,
    windowAt:windowAt,cutoff:cutoff,hasProfile:function(v){return !!v&&profiles.has(v.vin);},mock:true};
});
