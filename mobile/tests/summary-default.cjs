// Portable regression for the local source and the published mobile folder.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.existsSync(path.resolve(__dirname,'../customer.js'))?path.resolve(__dirname,'..'):path.resolve(__dirname,'../html/customer/mobile-prototype');
const read=file=>fs.readFileSync(path.join(app,file),'utf8');
class Clock extends Date{constructor(...args){super(...(args.length?args:['2026-10-02T23:59:00+09:00']));}static now(){return new Date('2026-10-02T23:59:00+09:00').getTime();}}
const context=vm.createContext({window:{},Date:Clock,Intl});
for(const file of ['web-contracts.generated.js','demo-data.generated.js','model.js'])vm.runInContext(read(file),context);
const M=context.window.CustomerPrototype,fleet=context.window.MIQ_MOCK_DATA.fleet;
const helper=fs.readFileSync(path.join(__dirname,'helpers/customer-mobile-harness.js'),'utf8');
const harness=vm.runInNewContext('('+helper.slice(helper.indexOf('function harness('))+')',{vm,URL,URLSearchParams,M,fleet,read});
const selected=h=>h.html().match(/data-summary-sort="([^"]+)" aria-pressed="true"/)?.[1];
const params=h=>new URLSearchParams(new URL(h.url()).hash.split('?')[1]);
let checks=0;
for(const role of ['customer_owner','customer_staff'])for(const period of ['d','w','m']){
 const base={role,period,from:'2026-10-02',to:'2026-10-02'};
 for(const extra of [{},{summarySort:'invalid',summaryDirection:'asc'},{summaryDirection:'asc'}]){
  const h=harness('#summary?'+new URLSearchParams({...base,...extra}));
  assert.equal(selected(h),'min');assert(h.html().includes('aria-label="가동시간 내림차순, 오름차순으로 정렬"'));checks++;
 }
 for(const sort of ['min','work','efficiency','km'])for(const direction of ['asc','desc']){
  const h=harness('#summary?'+new URLSearchParams({...base,summarySort:sort,summaryDirection:direction}));
  assert.equal(selected(h),sort);
  const before=h.html();h.click({route:'home'});h.click({route:'summary'});
  assert.equal(selected(h),sort);assert.equal(params(h).get('summaryDirection'),direction);
  assert.equal(h.html(),before,'Home reentry preserves the chosen summary and query');
  const restored=harness(new URL(h.url()).hash);assert.equal(restored.html(),before,'Reload preserves explicit sort');checks++;
 }
 const fresh=harness('#home?role='+role);fresh.click({route:'summary'});
 assert.equal(selected(fresh),'min');assert.equal(params(fresh).get('summaryDirection'),'desc');checks++;
}
console.log('PASS summary default: '+checks+' role/period/default/invalid/explicit-sort cases; first-tab running descending and preserved navigation/reload choices.');
