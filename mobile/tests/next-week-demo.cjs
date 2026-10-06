// Standalone fixture/renderer test. Prepared future rows must never bypass the clock cutoff.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const read=file=>fs.readFileSync(path.join(app,file),'utf8');
const harnessSource=fs.readFileSync(path.join(__dirname,'helpers/customer-mobile-harness.js'),'utf8');
function load(date,hour,withDemo=true){
  const stamp=date+'T'+String(hour).padStart(2,'0')+':37:00+09:00';
  class Clock extends Date{constructor(...args){super(...(args.length?args:[stamp]));}static now(){return new Date(stamp).getTime();}}
  const context=vm.createContext({window:{},Date:Clock,Intl,sessionStorage:{getItem:()=>null}});
  for(const file of ['web-contracts.generated.js',...(withDemo?['demo-data.generated.js']:[]),'model.js','home-view.js'])vm.runInContext(read(file),context);
  const M=context.window.CustomerPrototype,fleet=context.window.MIQ_MOCK_DATA.fleet;
  const harness=vm.runInNewContext('('+harnessSource.slice(harnessSource.indexOf('function harness('))+')',{vm,URL,URLSearchParams,M,fleet,read});
  return {context,M,rows:M.buildVehicles(fleet),home:context.window.CustomerHomeView,harness};
}
const seed=load('2026-10-02',8),demo=seed.context.window.CustomerDemoData;
assert.equal(demo.measuredTelemetry,false);assert.equal(demo.to,'2026-10-11');assert.equal(demo.days.length,143);assert.equal(demo.history.length,572);
assert.equal(new Set(demo.days.map(r=>r.vin+'|'+r.date)).size,143);
assert.equal(demo.positions.length,9);assert.equal(new Set(demo.positions.map(p=>p.vin)).size,9);
const sourcePositions=JSON.stringify(seed.M.web.positions);
for(const p of demo.positions){assert.equal(p.demo,true);assert.equal(p.measuredTelemetry,false);assert(!seed.M.web.positions.some(original=>original.vin===p.vin),'Captured WEB locations are never overwritten');}
for(const row of demo.days){
  const vehicle=seed.rows.find(v=>v.vin===row.vin);assert(vehicle);
  const total=seed.M.web.observations.aggregate(vehicle,row.date,row.date,{date:row.date,hours:24});
  assert.equal(total.workMinutes,row.workMinutes);assert.equal(total.idleMinutes,row.idleMinutes);assert.equal(total.capacityMinutes,1440);
  const service=demo.history.filter(r=>r.vin===row.vin&&r.date===row.date);
  assert.equal(service.length,4);assert.equal(service.filter(r=>r.kind==='maintenance').length,2);assert.equal(service.filter(r=>r.kind==='error').length,2);
  assert(service.some(r=>r.kind==='maintenance'&&r.completed));assert(service.some(r=>r.kind==='maintenance'&&!r.completed));
  assert(service.some(r=>r.errorState==='past'));assert(service.some(r=>r.errorState==='current'));
  assert(service.every(r=>r.demo&&r.measuredTelemetry===false&&r.dateTime&&r.vin));
}
let cases=0;
for(let day=2;day<=11;day++)for(const hour of [0,1,7,8,14,23]){
  const date='2026-10-'+String(day).padStart(2,'0'),{M,rows,home,harness}=load(date,hour);
  assert.equal(M.SNAPSHOT,date+' '+String(hour).padStart(2,'0')+':00');
  assert.equal(M.demoReferenceHours(date,date),'00:00~24:00');
  assert.equal(rows.length,13);
  for(const v of rows){
    const p=v.position;assert(p,'Every review vehicle has a map position');
    assert(Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lng)&&Math.abs(p.lng)<=180);
    assert(p.address?.trim());assert(p.lastDatetime&&p.lastDatetime<=M.SNAPSHOT+':00','No future position timestamp');
    const original=M.web.positions.find(p=>p.vin===v.vin);if(original)assert.deepEqual(JSON.parse(JSON.stringify(p)),JSON.parse(JSON.stringify(original)));
  }
  for(const role of ['customer_owner','customer_staff']){
    const data=home.build(M,rows,role),c=data.all,scoped=M.scope(rows,{role}),connected=scoped.filter(v=>v.conn===true);
    const total=M.web.observations.aggregate(connected,date,date);
    assert.equal(c.runTotal,c.metricKnown?c.work+c.idle:null);
    assert.equal(c.runPer,c.metricKnown?c.runTotal/c.metricKnown:null);
    assert.equal(c.work,total.workMinutes);assert.equal(c.idle,total.idleMinutes);
    assert.equal(c.running+c.idleCount+c.operationUnknown,connected.length);
    if(hour){assert(c.work>0);assert(c.runTotal>=c.work);assert.equal(c.operationUnknown,0);}else{assert.equal(c.runTotal,null);assert.equal(c.operationUnknown,connected.length);}
    const html=home.render(M,data,'work','main');
    const block=html.match(/<div class="od-work-kpis[^\n]*?<\/div>/)?.[0];assert(block);
    assert.equal((block.match(/<button /g)||[]).length,3);assert(block.indexOf('총 가동시간')<block.indexOf('총 작업시간'));assert(block.includes('대당 '+M.DISPLAY.duration(c.runPer,true)));
    const screen=harness('#summary?role='+role+'&period=d&from='+date+'&to='+date);
    assert(!screen.html().includes('위치 정보 없음'));
    for(const v of scoped){
      screen.click({map:v.equipmentId},'data-map');assert(screen.node('#location-dialog').open);
      const opened=screen.mapCalls.filter(([kind])=>kind==='open').at(-1)?.[1];assert.equal(opened?.equipmentNumber,v.equipmentNumber);
      assert.equal(opened.lat,v.position.lat);assert.equal(opened.lng,v.position.lng);
      assert.equal(screen.node('#location-dialog-address').textContent,v.position.address);
      assert.equal(screen.node('#location-map').hidden,false);
      assert(screen.node('#location-dialog-info').innerHTML.includes(v.position.lastDatetime));
      assert(!screen.node('#location-dialog-info').innerHTML.includes('시연 위치'),'r129 removes the popup notice, not GPS coordinates or source timestamps');
      screen.click({},'data-close-map');
    }
    for(const card of screen.html().matchAll(/<article class="vehicle-mobile-row[^>]*>[\s\S]*?<\/article>/g)){
      if(card[0].includes(' · 엔진 · ')){
        const slot=card[0].match(/<button[^>]*data-slot="engine"[^>]*>[\s\S]*?<\/button>/)?.[0];assert(slot);assert(slot.includes('L/H'));assert(!slot.includes('data-lucide'));assert(!slot.includes('battery'));
      }else assert(card[0].includes('data-slot="battery"'));
    }
    const future='2026-10-'+String(day+1).padStart(2,'0');
    assert.equal(M.metrics(scoped[0],future,future,'d').min,null);assert.equal(M.efficiencyPerformance(scoped,future,future,{period:'d'}).known,0);
    assert(M.serviceHistory(scoped).every(r=>!r.occurredAt||r.occurredAt<M.SNAPSHOT));
    const history=M.serviceHistory(scoped),push=M.recentNotifications(M.pushHistory(scoped));
    assert(history.every(r=>!r.resolvedAt||r.resolvedAt<M.SNAPSHOT),'No future completion shown');
    const previous='2026-10-'+String(day-1).padStart(2,'0');
    for(const v of scoped){
      const repairs=M.serviceRecords([v],{kind:'maintenance',from:previous,to:previous}),errors=M.serviceRecords([v],{kind:'error',from:previous,to:previous});
      assert.equal(repairs.length,2);assert(repairs.some(r=>r.resolved)&&repairs.some(r=>!r.resolved));
      assert.equal(errors.length,2);assert(errors.some(r=>r.resolved)&&errors.some(r=>!r.resolved));
      assert(push.some(p=>p.pushType==='shock'&&p.equipmentId===v.equipmentId&&p.pushDatetime.startsWith(previous)),'Every accessible vehicle has a completed-day shock notification');
    }
    for(const p of push.filter(p=>p.pushType==='shock')){
      const date=p.pushDatetime.slice(0,10),hour=Number(p.pushDatetime.slice(11,13)),v=scoped.find(v=>v.equipmentId===p.equipmentId);
      assert.equal(p.shockG,2.5);assert.equal(M.web.shocks([v],'d',date,date).series.s5[hour],M.shockEvents([v]).find(e=>e.id===p.shockEventId).count);
      assert(p.pushDatetime<M.SNAPSHOT);assert(p.message.includes(v.vin));
    }
    for(const kind of ['maintenance','error']){
      const list=harness('#services?role='+role+'&service='+kind+'&servicePeriod=d&serviceFrom='+previous+'&serviceTo='+previous);
      assert.equal((list.html().match(kind==='error'?/data-error-record=/g:/data-kind="maintenance" data-entry=/g)||[]).length,scoped.length*2);
    }
    const inbox=harness('#notifications?role='+role+'&notificationCategory=shock');
    const shockPush=push.find(p=>p.pushType==='shock');assert(inbox.html().includes('data-push-category="shock"'));
    inbox.click({notificationEntry:shockPush.id});assert(inbox.url().includes('#shock?'));assert(inbox.url().includes('equipmentId='+shockPush.equipmentId));
    assert(inbox.url().includes('from='+shockPush.pushDatetime.slice(0,10)));inbox.click({},'data-return');assert(inbox.url().includes('#notifications?'));
    cases++;
  }
  const rejected=M.createApprovalStore(rows).find('MOBILE-DEMO-REJECTED','customer_owner');assert.equal(rejected.status,'rejected');assert(rejected.reason);assert(rejected.processedAt<M.SNAPSHOT);
  assert.equal(M.createApprovalStore(rows).list('customer_staff').length,0);
}
const {M,rows,harness}=seed,engine=rows.find(v=>v.type==='엔진'),screen=harness('#summary?period=d&from=2026-10-02&to=2026-10-02');
screen.click({serviceVehicle:engine.equipmentId,kind:'engine'});assert(screen.url().includes('#engine?'));
const baseline=load('2026-09-30',14,false),configured=load('2026-09-30',14,true);
assert.equal(JSON.stringify(seed.M.web.positions),sourcePositions,'Mobile review does not mutate captured WEB locations');
assert.deepEqual(JSON.parse(JSON.stringify(configured.rows.map(v=>v.position))),JSON.parse(JSON.stringify(baseline.rows.map(v=>v.position))),'Prepared position examples are not displayed before the demo start date');
assert.deepEqual(JSON.parse(JSON.stringify(configured.M.metrics(configured.rows[0],'2026-09-30','2026-09-30','d'))),JSON.parse(JSON.stringify(baseline.M.metrics(baseline.rows[0],'2026-09-30','2026-09-30','d'))),'Outside prepared dates original WEB observations stay unchanged');
const saved=seed.M.web.approvalSeed();saved.push({id:'saved-row',name:'보존',email:'saved@example.invalid',role:'고객 직원',companyId:'1933',registered:'2026-10-01 09:00',status:'REQ',approverId:seed.M.web.principals.customer_owner});
seed.context.sessionStorage.getItem=()=>JSON.stringify(saved);
const store=seed.M.createApprovalStore(rows);assert(store.find('saved-row','customer_owner'));assert.equal(store.list('customer_owner').filter(r=>r.id==='MOBILE-DEMO-REJECTED').length,1);assert.equal(store.list('customer_owner').filter(r=>r.id==='MOBILE-DEMO-REJECTED').length,1);
console.log('PASS prepared mobile demo: '+cases+' day/hour/role cases through Oct 11; 572 repair/error examples, all-vehicle shock notifications and detail return, status/time cutoff, complete map positions, original work/idle totals, 3 KPIs, engine L/H and rejected customer example.');
