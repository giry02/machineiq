const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(app,'customer.js'),'utf8');
const declaration=source.match(/const socLevel = ([^\n]+);/)[1];
const level=vm.runInNewContext('('+declaration+')');
const battery=vm.runInNewContext('('+source.match(/const batteryIcon = ([^\n]+);/)[1]+')',{socLevel:level,icon:name=>'<i data-lucide="'+name+'"></i>'});
for(const [soc,expected] of [[0,'low'],[29.99,'low'],[30,'medium'],[59.99,'medium'],[60,'high'],[100,'high']]){
  assert.equal(level({type:'리튬',soc}),expected);
  const svg=battery({type:'리튬',soc});assert(svg.includes('data-soc-level="'+expected+'"'));
  assert(svg.includes('class="battery-soc-fill" x="4" y="9" width="12" height="6"'),'Constant interior size at every SOC');
  assert(!svg.includes('%')&&!svg.includes('style='),'No percent-proportional fill');
}
for(const soc of [null,undefined,NaN,-1,101,'80'])assert.equal(level({type:'리튬',soc}),'');
for(const type of ['엔진','납산','수소'])assert.equal(battery({type,soc:80}),'<i data-lucide="battery"></i>');
assert(source.includes('${batteryIcon(v)}<strong>${value}</strong>'),'Plain numeric text in summary');
assert(!source.includes('socAttributes')&&!source.includes('battery-soc-value'));
const css=fs.readFileSync(path.join(app,'customer.css'),'utf8');
for(const [band,color] of [['high','#37b24d'],['medium','#f59f00'],['low','#e03131']])assert(css.includes('.battery-soc-icon[data-soc-level="'+band+'"] .battery-soc-fill { fill:'+color+'; }'));
assert(!css.includes('battery-soc-value'));
console.log('PASS: fixed battery interior color bands; unchanged numeric color; no proportional gauge; invalid/non-lithium unchanged.');
