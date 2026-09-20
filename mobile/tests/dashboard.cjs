const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const app=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const read=file=>fs.readFileSync(path.join(app,file),'utf8');
class Clock extends Date {constructor(...args){super(...(args.length?args:['2026-09-20T09:37:00+09:00']));}static now(){return new Date('2026-09-20T09:37:00+09:00').getTime();}}
const ctx=vm.createContext({window:{},Date:Clock,Intl});
for(const file of ['data/fleet.generated.js','web-contracts.generated.js','model.js'])vm.runInContext(read(file),ctx);
const M=ctx.window.CustomerPrototype,rows=M.buildVehicles(ctx.window.MIQ_MOCK_DATA.fleet);
const apiContext={module:{exports:{}},URLSearchParams};
vm.runInNewContext(read('owner-dashboard-preview.js'),apiContext);
const api=apiContext.module.exports;
assert(read('index.html').includes('data-dashboard-mode="main"'));
assert(read('index.html').includes('owner-dashboard-preview.css?v=20260920-5'));
assert(read('index.html').includes('owner-dashboard-preview.js?v=20260920-5'));
assert(!read('dashboard-backup-20260919.html').includes('owner-dashboard-preview'));
for(const role of ['customer_owner','customer_staff']){
  const data=api.build(M,rows,role),scoped=M.scope(rows,{role}),counts=M.counts(scoped);
  for(const key of ['total','running','error','due','soon'])assert.equal(data.all[key],counts[key],role+' '+key);
  const html=api.render(M,data,'work','main');
  assert(!html.includes('프로토타입 데이터'));
  assert.equal((html.match(/class="od-issue[ "']/g)||[]).length,3);
  assert.equal(data.trend.length,7);
  for(const day of data.trend){
    const report=M.efficiencyPerformance(scoped,day.day,day.day,{period:'d'});
    assert.equal(day.work,report.work);assert.equal(day.idle,report.idle);
  }
  if(role==='customer_staff'){
    assert(data.groups.every(g=>g.group===M.assignedGroup(role)));
    assert(html.includes('내 그룹 작업 현황'));assert(!html.includes('data-owner-sort'));
  }else assert(html.includes('그룹별 운영 비교'));
}
assert(!fs.existsSync(path.join(app,'map-config.local.js')));
assert(read('owner-dashboard-preview.css').includes('button.od-text-link:hover:not(:active):not(:disabled) { background:transparent; border-color:transparent; color:var(--linq-color-brand); }'));
console.log('PASS public dashboard: adopted main, owner/staff data scope, seven-day report parity, backup, removed footer, text-only hover, no local map key.');
