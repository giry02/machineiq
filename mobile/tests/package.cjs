const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),read=file=>fs.readFileSync(path.join(root,file),'utf8');
const manifest=JSON.parse(read('manifest.json'));
for(const item of manifest.files){
  assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,item.path))).digest('hex'),item.sha256,item.path);
  if(item.path.endsWith('.js'))new vm.Script(read(item.path),{filename:item.path});
  if(!/\.(html|css)$/.test(item.path))continue;
  const refs=item.path.endsWith('.html')?Array.from(read(item.path).matchAll(/(?:href|src)="([^"]+)"/g),m=>m[1]):Array.from(read(item.path).matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g),m=>m[1]);
  for(const ref of refs){
    if(/^(https?:|#|data:|mailto:)/.test(ref))continue;
    const target=path.resolve(path.dirname(path.join(root,item.path)),ref.split(/[?#]/)[0]);
    assert(target.startsWith(root+path.sep),'Dependency leaves mobile: '+ref);
    assert(fs.existsSync(target),'Missing dependency: '+ref);
  }
}
const ctx=vm.createContext({window:{},Date});
vm.runInContext(read('data/fleet.generated.js'),ctx);vm.runInContext(read('model.js'),ctx);
const M=ctx.window.CustomerPrototype,rows=M.buildVehicles(ctx.window.MIQ_MOCK_DATA.fleet);
assert.equal(rows.length,10);
for(const role of Object.keys(M.ROLE_LABELS)){
  const scoped=M.scope(rows,{role}),messages=M.pushHistory(scoped);
  assert(messages.every(m=>scoped.some(v=>v.equipmentId===m.equipmentId)));
  assert(M.counts(scoped).total===scoped.length);
}
assert(!read('signup.html').includes('name="signupRole"'));
assert(read('customer.js').includes('data-logout')&&read('customer.js').includes('data-notification-category'));
assert(!read('customer.js').includes('localhost:'));
const server=require('../serve.cjs');
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  try{
    const start=await fetch(base+'/',{redirect:'manual'});assert.equal(start.status,302);assert.equal(start.headers.get('location'),'./login.html');
    for(const file of ['login.html','index.html','signup.html','find-password.html','customer.js','assets/local-fonts.css','shared/bobcat-machine-iq.svg','data/fleet.generated.js'])assert.equal((await fetch(base+'/'+file)).status,200,file);
    assert.equal((await fetch(base+'/manifest.json')).status,403);
    assert.equal((await fetch(base+'/login.html',{method:'POST'})).status,405);
    console.log('PASS: packaged checksums, syntax, all local assets, vehicle scopes and local HTTP routes.');
  }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
