const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(app,'customer.js'),'utf8');
const declaration=source.match(/const socAttributes = ([^\n]+);/)[1];
const attributes=vm.runInNewContext('('+declaration+')');
for(const [soc,level] of [[0,'low'],[29.99,'low'],[30,'medium'],[59.99,'medium'],[60,'high'],[100,'high']])assert(attributes({type:'리튬',soc}).includes('"'+level+'"'));
for(const soc of [null,undefined,NaN,-1,101,'80'])assert.equal(attributes({type:'리튬',soc}),'');
for(const type of ['엔진','납산','수소'])assert.equal(attributes({type,soc:80}),'');
assert.equal((source.match(/socAttributes\(v\)/g)||[]).length,3,'Summary, detail and battery page');
const css=fs.readFileSync(path.join(app,'customer.css'),'utf8');
for(const [level,color] of [['high','#37b24d'],['medium','#f59f00'],['low','#e03131']]){
  assert(css.includes('.battery-soc-value[data-soc-level="'+level+'"] { color:'+color+'; }'));
}
assert(!source.includes('battery-soc-gauge'));
console.log('PASS: Lithium SOC numeric colors only, web thresholds 30/60, invalid/non-lithium unchanged, all three screens.');
