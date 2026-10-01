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
assert.equal(demo.measuredTelemetry,false);assert.equal(demo.to,'2026-10-11');assert.equal(demo.days.length,143);assert.equal(demo.history.length,286);
assert.equal(new Set(demo.days.map(r=>r.vin+'|'+r.date)).size,143);
for(const row of demo.days){
  const vehicle=seed.rows.find(v=>v.vin===row.vin);assert(vehicle);
  const total=seed.M.web.observations.aggregate(vehicle,row.date,row.date,{date:row.date,hours:24});
  assert.equal(total.workMinutes,row.workMinutes);assert.equal(total.idleMinutes,row.idleMinutes);assert.equal(total.capacityMinutes,1440);
}
let cases=0;
for(let day=2;day<=11;day++)for(const hour of [0,1,7,8,14,23]){
  const date='2026-10-'+String(day).padStart(2,'0'),{M,rows,home,harness}=load(date,hour);
  assert.equal(M.SNAPSHOT,date+' '+String(hour).padStart(2,'0')+':00');
  assert.equal(M.demoReferenceHours(date,date),'00:00~24:00');
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
    for(const card of screen.html().matchAll(/<article class="vehicle-mobile-row[^>]*>[\s\S]*?<\/article>/g)){
      if(card[0].includes(' · 엔진 · ')){
        const slot=card[0].match(/<button[^>]*data-slot="engine"[^>]*>[\s\S]*?<\/button>/)?.[0];assert(slot);assert(slot.includes('L/H'));assert(!slot.includes('data-lucide'));assert(!slot.includes('battery'));
      }else assert(card[0].includes('data-slot="battery"'));
    }
    const future='2026-10-'+String(day+1).padStart(2,'0');
    assert.equal(M.metrics(scoped[0],future,future,'d').min,null);assert.equal(M.efficiencyPerformance(scoped,future,future,{period:'d'}).known,0);
    assert(M.serviceHistory(scoped).every(r=>!r.occurredAt||r.occurredAt<M.SNAPSHOT));
    cases++;
  }
  const rejected=M.createApprovalStore(rows).find('MOBILE-DEMO-REJECTED','customer_owner');assert.equal(rejected.status,'rejected');assert(rejected.reason);assert(rejected.processedAt<M.SNAPSHOT);
  assert.equal(M.createApprovalStore(rows).list('customer_staff').length,0);
}
const {M,rows,harness}=seed,engine=rows.find(v=>v.type==='엔진'),screen=harness('#summary?period=d&from=2026-10-02&to=2026-10-02');
screen.click({serviceVehicle:engine.equipmentId,kind:'engine'});assert(screen.url().includes('#engine?'));
const baseline=load('2026-09-30',14,false),configured=load('2026-09-30',14,true);
assert.deepEqual(JSON.parse(JSON.stringify(configured.M.metrics(configured.rows[0],'2026-09-30','2026-09-30','d'))),JSON.parse(JSON.stringify(baseline.M.metrics(baseline.rows[0],'2026-09-30','2026-09-30','d'))),'Outside prepared dates original WEB observations stay unchanged');
const saved=seed.M.web.approvalSeed();saved.push({id:'saved-row',name:'보존',email:'saved@example.invalid',role:'고객 직원',companyId:'1933',registered:'2026-10-01 09:00',status:'REQ',approverId:seed.M.web.principals.customer_owner});
seed.context.sessionStorage.getItem=()=>JSON.stringify(saved);
const store=seed.M.createApprovalStore(rows);assert(store.find('saved-row','customer_owner'));assert.equal(store.list('customer_owner').filter(r=>r.id==='MOBILE-DEMO-REJECTED').length,1);assert.equal(store.list('customer_owner').filter(r=>r.id==='MOBILE-DEMO-REJECTED').length,1);
console.log('PASS prepared mobile demo: '+cases+' day/hour/role cases through Oct 11; original totals, 3 KPIs, engine L/H, missing/future cutoff and rejected customer example.');
