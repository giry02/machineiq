// Extract the actual web contracts, not a second manually maintained mobile implementation.
// --patch emits an apply_patch payload; --write regenerates; --check checks the committed bridge.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),web=path.join(root,'web');
const sources={};
function fingerprint(file,...parts){sources[file]=crypto.createHash('sha256').update(parts.join('\n')).digest('hex');}
function read(file){const s=fs.readFileSync(path.join(web,file),'utf8').replaceAll('\r','');sources[file]=crypto.createHash('sha256').update(s).digest('hex');return s;}
function between(s,a,b){const start=s.indexOf(a),end=s.indexOf(b,start+a.length);if(start<0||end<0)throw Error('Web contract boundary changed: '+a);return s.slice(start,end).trim();}
// Only the original axis calculation is consumed on mobile. Do not ship WEB
// tooltip DOM, global event listeners or observers with this data contract.
function mobileShared(file){
  const source=read('_shared/'+file);
  if(file==='common-errors.js'){
    const messages=between(source,'var messages =','function failure(');
    fingerprint('_shared/'+file,messages);
    return '(function(root){\n'+messages+'\nroot.MIQErrors={describe:describe};\n})(window);';
  }
  if(file!=='chart-common.js')return source;
  const calculation=between(source,'function parse(value)','function tickLabel(');
  fingerprint('_shared/'+file,calculation);
  return '(function(root){\n'+calculation+'\nroot.MIQCharts={axis:axis};\n})(window);';
}
const dataFiles=['fleet','observation-profiles'];
const data=dataFiles.map(name=>{const value=JSON.parse(read('_mock-data/master/'+name+'.json'));return 'root.MIQ_MOCK_DATA.'+(name==='fleet'?'fleet':'observationProfiles')+'='+JSON.stringify(value)+';';}).join('\n');
const shared=['common-logic.js','common-errors.js','vehicle-observations.js','meeting-model.js','chart-common.js','report-series.js','service-records.js','service-demo-data.js','lithium-list-model.js','map-positions.js'].map(mobileShared);
const op=read('_shared/operation-metrics-enhancements.js'),shock=read('Shock/shock-tobe.html'),summary=read('_shared/vehicle-summary-options.js'),management=read('_shared/map-management-enhancements.js');
const summaryValue=between(summary,'function periodValue(vehicle)','function filtered(');
const effBuild=between(op,'function build()','function renderTop');
const shockBuild=between(shock,'function build()','/* ── 차트');


const approvalSeed=between(management,'function seedUserRequests()','function loadUserRequests()');
const currentRequests=between(management,'function currentDemoRequests(','function initRequestPeriod(');
const approvalNow=between(management,'function nowText()','function toast(');
const principals=between(management,'var principals =',';')+';';
const existingUsers=[...read('Mgmt User/mgmt-user-tobe.html').matchAll(/<tr\b[^>]*data-owner="([^"]+)"/g)].map(m=>m[1]);
function plain(s){return s.replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();}
function cells(row){return [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/g)].map(m=>m[1]);}
const legacy=[];
for(const kind of ['error','maintenance']){
 const html=read('Service/service-'+kind+'-tobe.html');
 for(const match of html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/g)){
  const c=cells(match[1]);if(kind==='error'&&c.length===8&&c[4].includes('errcode')){
   const strong=c[1].match(/<strong>(.*?)<\/strong>/)?.[1],code=c[4].match(/errcode__main">\s*([^<]+)/)?.[1]?.trim();
   const times=plain(c[6]).match(/\d{4}-\d{2}-\d{2} \d{2}:\d{2}/g)||[];
   legacy.push({kind,vin:strong,companyId:'1933',code,description:plain(c[5]),category:plain(c[3]),level:c[4].match(/class="level ([abc])"/)?.[1],spn:plain(c[4].match(/errcode__sub">(.*?)<\/span>/)?.[1]||'').split('/')[0]?.trim(),fmi:plain(c[4].match(/errcode__sub">(.*?)<\/span>/)?.[1]||'').split('/')[1]?.trim(),date:times[0]?.slice(0,10),dateTime:times[0],completedAt:times[1]||null,errorState:c[2].includes('past')?'past':'current',pdfKey:code==='P0003'?'p0003':null});
  }else if(kind==='maintenance'&&c.length===9&&/\d{4}-\d{2}-\d{2}/.test(c[4])){
   const dateTime=plain(c[4]);legacy.push({kind,vin:plain(c[3]),companyId:'1933',date:dateTime.slice(0,10),dateTime,part:plain(c[5]),symptom:plain(c[6]),detail:plain(c[7]),completed:/class="done y"/.test(c[8])});
  }
 }
}
if(legacy.filter(r=>r.kind==='error').length!==6||legacy.filter(r=>r.kind==='maintenance').length!==6)throw Error('Web service fixture extraction changed');
// For partially consumed files, track exactly the extracted mobile inputs.
// Unrelated WEB layout/i18n edits must not stale a byte-identical mobile contract;
// changing any consumed calculation, seed or record still changes the generated body.
fingerprint('_shared/operation-metrics-enhancements.js',effBuild);
fingerprint('Shock/shock-tobe.html',shockBuild);
fingerprint('_shared/vehicle-summary-options.js',summaryValue);
fingerprint('_shared/map-management-enhancements.js',principals,approvalSeed,currentRequests,approvalNow);
fingerprint('Mgmt User/mgmt-user-tobe.html',JSON.stringify(existingUsers));
for(const kind of ['error','maintenance'])fingerprint('Service/service-'+kind+'-tobe.html',JSON.stringify(legacy.filter(r=>r.kind===kind)));
const body=`/* GENERATED from current web sources. Run scripts/build-customer-web-contracts.cjs --check. */
(function(root){var module,globalThis=root,window=root;
root.MIQ_MOCK_DATA=root.MIQ_MOCK_DATA||{};
${data}
${shared.join('\n')}
const MIQCharts=root.MIQCharts;
function efficiency(rows,period,from,to){var state={rows,period},PERIOD={[period]:{from,to}};${effBuild}\nreturn build();}
function shocks(rows,period,from,to){var state={rows,period},PERIOD={[period]:{from,to}};${shockBuild}\nreturn build();}
function summaryValue(vehicle,period,from,to){var MIQObservations=root.MIQObservations,state={period},PERIOD={[period]:{range:[from,to]}};${summaryValue}\nvar value=periodValue(vehicle);return {...value,efficiency:value.eff,fuel:value.fc,battery:value.bc};}
function reportValue(label,key,period,from,to){return root.MIQReportSeries.status(label,key,period,from,to);}
const common=root.MIQCommon;
${principals}\n${approvalSeed}\n${currentRequests}\n${approvalNow}
root.CustomerWebContracts={errors:root.MIQErrors,common:root.MIQCommon,meeting:root.MIQMeeting,charts:MIQCharts,service:root.MIQServiceRecords,demo:root.MIQServiceDemo,observations:root.MIQObservations,reportSeries:root.MIQReportSeries,lithium:root.MIQLithiumListModel,positions:root.MIQMapPositions,efficiency,shocks,summaryValue,reportValue,approvalSeed:function(){return currentDemoRequests(seedUserRequests(),[1,2,3,4,10,16,22]);},existingUsers:${JSON.stringify(existingUsers)},principals,get approvalReference(){return nowText();},legacy:${JSON.stringify(legacy)},sourceHashes:${JSON.stringify(sources)}};
})(typeof window==='undefined'?globalThis:window);
if(typeof module==='object'&&module.exports)module.exports=globalThis.CustomerWebContracts;
`;
new vm.Script(body);
const target='mobile/web-contracts.generated.js';
if(process.argv.includes('--check')){if(fs.readFileSync(path.join(root,target),'utf8').replaceAll('\r','')!==body)throw Error('Web contract bridge is stale');console.log('PASS: generated contracts match '+Object.keys(sources).length+' web sources');}
else if(process.argv.includes('--patch')){console.log('*** Begin Patch\n*** Add File: '+target+'\n'+body.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch');}
else if(process.argv.includes('--write')){fs.writeFileSync(path.join(root,target),body);console.log('Generated mobile bridge from '+Object.keys(sources).length+' shared WEB sources');}
module.exports={body,sources};
