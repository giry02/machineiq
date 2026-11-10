const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const base=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(base,file),'utf8');
const previewContext=vm.createContext({module:{exports:{}}});vm.runInContext(read('security-preview.js'),previewContext);
const preview=previewContext.module.exports;
for(const [day,expected]of [['2026-11-10','2027-02-08'],['2024-01-31','2024-04-30'],['2026-12-31','2027-03-31'],['2026-02-30',null],['',null]])assert.equal(preview.reminderDate(day),expected);
for(const country of ['KR','US','','kr'])for(const result of ['before','failed','cancelled','expired','success','underage']){
  const value=preview.passState(country,result);assert.equal(value.required,country==='KR');assert.equal(value.verified,false);
  assert.equal(value.state,country==='KR'&&['failed','cancelled','expired'].includes(result)?result:'before');
}
class Clock extends Date{constructor(...args){super(...(args.length?args:['2026-11-10T12:00:00+09:00']));}static now(){return new Date('2026-11-10T12:00:00+09:00').getTime();}}
function load(previous=false){
  const context=vm.createContext({window:{},Date:Clock,Intl});
  for(const file of ['web-contracts.generated.js','demo-data.generated.js','model.js','data/fleet.generated.js']){
    let source=read(file);
    if(previous&&file==='model.js'){
      assert(source.includes('const wholeNumber = value => W.common.numbers.integer(value,true);'));
      source=source.replace('const wholeNumber = value => W.common.numbers.integer(value,true);',"const wholeNumber = value => Math.round(value).toLocaleString('ko-KR', {maximumFractionDigits:0});");
    }
    vm.runInContext(source,context);
  }
  return context.window;
}
const current=load(),previous=load(true),M=current.CustomerPrototype,fleet=current.MIQ_MOCK_DATA.fleet,common=M.web.common;
for(const [value,expected]of [['김지훈','김*훈'],['김수','김*'],['김','*'],[null,'—'],['','—']])assert.equal(common.privacy.maskPersonName(value),expected);
for(const [value,expected]of [['010-1234-5678','010-****-5678'],['+82 10 1234 5678','+82 10 **** 5678'],[null,'—'],['','—']])assert.equal(common.privacy.maskPhoneNumber(value),expected);
for(const [value,expected]of [[91.5,'92'],[91.499,'91'],[0.5,'1'],[-1.5,'-2'],[-0.1,'0'],[1234.5,'1,235'],[0,'0']]){
  assert.equal(M.DISPLAY.number(value),expected);assert.equal(M.DISPLAY.efficiency(value),expected+'%');assert.equal(M.DISPLAY.number(value,' km'),expected+' km');
}
for(const missing of [null,undefined,NaN,Infinity])assert.equal(M.DISPLAY.number(missing),'-');
const rows=M.buildVehicles(fleet);assert.equal(JSON.stringify(rows),JSON.stringify(previous.CustomerPrototype.buildVehicles(fleet)),'Raw rows, identities, coordinates and dates are unchanged by formatter');
assert.equal(JSON.stringify(M.SHOCK_LEVELS),JSON.stringify(previous.CustomerPrototype.SHOCK_LEVELS),'Thresholds unchanged');
for(const period of ['d','w','m']){
  const [from,to]=M.dates(period);
  for(const row of rows){
    const raw=M.web.observations.aggregate(row,from,period==='d'?from:to),value=M.metrics(row,from,to,period);
    assert.equal(value.work,raw.workMinutes);assert.equal(value.idle,raw.idleMinutes);assert.equal(value.km,raw.distanceKm);assert.equal(value.efficiency,raw.efficiency,'Raw ratios are not pre-rounded');
  }
}
const harnessSource=read('tests/helpers/customer-mobile-harness.js');
const harness=vm.runInNewContext('('+harnessSource.slice(harnessSource.indexOf('function harness('))+')',{vm,URL,URLSearchParams,M,fleet,read});
const routes=['home','summary','services','services?service=supplies','services?service=error','reports','efficiency','notifications','settings','approvals','detail','operation','shock','engine','battery','supplies','maintenance'];
let count=0;
for(const role of ['customer_owner','customer_staff'])for(const route of routes){
  const equipment=M.scope(rows,{role})[0].equipmentId;
  const page=harness('#'+route+(route.includes('?')?'&':'?')+'role='+role+'&equipmentId='+equipment);
  assert(!/\d+\.\d+\s*(?:%|km\b|kWh\b|L\/h|L\/H|V\b|Ah\b|h\b)/.test(page.html().replace(/<[^>]*>/g,' ')),role+' '+route+' integer metrics');
  assert(!/NaN|undefined/.test(page.html()));count++;
}
assert(!/fetch\s*\(|XMLHttpRequest|(?:local|session)Storage|MutationObserver|\.submit\s*\(/.test(read('security-preview.js')),'Review cannot transport, persist, submit or replace the screen');
for(const file of ['login.html','signup.html'])assert.equal((read(file).match(/src="\.\/security-preview\.js(?:\?[^"\n]*)?"/g)||[]).length,1,'One review binder per auth page');
assert(!read('find-password.html').includes('security-preview.js'),'Recovery is unchanged');
console.log('PASS mobile security: common name/phone masks, 90-day dates, KR failure-only states, half-away integer display, '+count+' role/routes, raw values/ratios/thresholds and transport isolation.');
