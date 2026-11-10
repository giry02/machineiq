// Local static-browser verification only; no account, approval, provider or password writes.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const server=require('../serve.cjs');
const baseline=process.argv.includes('--baseline'),phase=baseline?'before':'after';
const output=process.env.SECURITY_SCREENSHOT_DIR||path.join(os.tmpdir(),'machineiq-security-display-20261110');
const layouts={},baselineFile=path.join(output,'baseline-layout.json');
(async()=>{
  fs.mkdirSync(path.join(output,phase),{recursive:true});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true,channel:process.env.PLAYWRIGHT_CHANNEL||'msedge'});
  try{
    for(const width of [390,320]){
      const context=await browser.newContext({viewport:{width,height:844},deviceScaleFactor:1});
      await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
      await context.addInitScript(()=>sessionStorage.setItem('linq-customer-prototype-authenticated-role','customer_owner'));
      const page=await context.newPage(),errors=[],writes=[];
      page.on('pageerror',error=>errors.push(error.message));
      page.on('request',request=>{if(!['GET','HEAD'].includes(request.method()))writes.push(request.method()+' '+request.url());});
      for(const [name,url]of [
        ['home','/index.html#home?role=customer_owner'],
        ['summary','/index.html#summary?role=customer_owner'],
        ['approvals','/index.html#approvals?role=customer_owner'],
        ['login','/login.html'],['signup','/signup.html']
      ]){
        await page.goto(origin+url);await page.waitForTimeout(150);
        if(name==='signup'){await page.locator('#signup-agree-all').check();await page.locator('#signup-continue').click();}
        await page.screenshot({path:path.join(output,phase,name+'-'+width+'.png'),fullPage:true});
        const key=name+'-'+width;
        layouts[key]=await page.evaluate(()=>({width:document.documentElement.scrollWidth,boxes:[...document.querySelectorAll('main,nav,.mobile-header,.login-card,.signup-card,.dashboard-panel,.detail-card')].filter(node=>node.getClientRects().length).map(node=>{const box=node.getBoundingClientRect();return [node.tagName,node.className,...['x','y','width','height'].map(key=>Math.round(box[key]*100)/100)];})}));
        if(!baseline){
          assert.deepEqual(layouts[key],JSON.parse(fs.readFileSync(baselineFile,'utf8'))[key],name+' layout unchanged at '+width);
          if(name==='login'||name==='signup')assert(fs.readFileSync(path.join(output,'before',name+'-'+width+'.png')).equals(fs.readFileSync(path.join(output,'after',name+'-'+width+'.png'))),'Default '+name+' pixels unchanged at '+width);
        }
      }
      if(!baseline){
        await page.goto(origin+'/index.html#approvals?role=customer_owner');
        await page.locator('.customer-approval-card h2').first().waitFor();
        const rawName=await page.evaluate(()=>CustomerPrototype.createApprovalStore(CustomerPrototype.buildVehicles(MIQ_MOCK_DATA.fleet)).list('customer_owner').find(row=>row.status==='pending').name);
        const masked=await page.evaluate(value=>CustomerPrototype.web.common.privacy.maskPersonName(value),rawName);
        assert.equal(await page.locator('.customer-approval-card h2').first().innerText(),masked);
        await page.locator('[data-review-action="approve"]').first().click();
        assert((await page.locator('#customer-approval-target').innerText()).includes(rawName),'Detail keeps raw person name');
        await page.locator('[data-close-customer-approval]').first().click();
        await page.goto(origin+'/index.html#settings?role=customer_owner');
        assert((await page.locator('#main').innerText()).includes('윤태호'),'Own profile keeps raw person name');
        await page.goto(origin+'/index.html#approvals?role=customer_staff');
        assert.equal(await page.locator('.customer-approval-card').count(),0,'Staff cannot view approval list');
        await page.goto(origin+'/login.html?securityPreview=1');
        assert(await page.locator('#mobile-login-form').evaluate(form=>{const event=new Event('submit',{bubbles:true,cancelable:true});form.dispatchEvent(event);return event.defaultPrevented;}),'Review blocks local mock login');
        assert(await page.locator('#forced-password-form').evaluate(form=>{const event=new Event('submit',{bubbles:true,cancelable:true});form.dispatchEvent(event);return event.defaultPrevented;}),'Review blocks local password change');
        await page.locator('[data-password-later]').click();
        assert.match(await page.locator('[data-password-reminder-status]').innerText(),/90일/);
        assert.equal(await page.locator('[data-password-reminder-preview]').getAttribute('data-server-updated'),'false');
        await page.screenshot({path:path.join(output,phase,'password-reminder-'+width+'.png'),fullPage:true});
        await page.goto(origin+'/signup.html?securityPreview=1');
        await page.locator('#signup-agree-all').check();await page.locator('#signup-continue').click();
        assert(await page.locator('#signup-form').evaluate(form=>{const event=new Event('submit',{bubbles:true,cancelable:true});form.dispatchEvent(event);return event.defaultPrevented;}),'Review blocks local mock signup');
        for(const state of ['failed','cancelled','expired']){
          await page.locator('[data-mobile-pass-result="'+state+'"]').click();
          assert.equal(await page.locator('[data-mobile-pass-preview]').getAttribute('data-state'),state);
          assert.equal(await page.locator('[data-mobile-pass-preview]').getAttribute('data-verified'),'false');
        }
        await page.locator('#signup-country').selectOption('US');assert(await page.locator('[data-mobile-pass-preview]').isHidden());
        await page.locator('#signup-country').selectOption('KR');assert.equal(await page.locator('[data-mobile-pass-preview]').getAttribute('data-state'),'before');
        await page.locator('[data-mobile-pass-result="failed"]').click();
        await page.locator('#signup-phone').fill('01012345678');assert.equal(await page.locator('[data-mobile-pass-preview]').getAttribute('data-state'),'before');
        assert.equal(await page.locator('[data-mobile-pass-preview]').getAttribute('data-verified'),'false');
        await page.screenshot({path:path.join(output,phase,'pass-'+width+'.png'),fullPage:true});
      }
      assert.deepEqual(errors,[],'No uncaught browser errors');assert.deepEqual(writes,[],'No non-GET requests');
      await context.close();
    }
    if(baseline)fs.writeFileSync(baselineFile,JSON.stringify(layouts,null,2)+'\n');
    console.log('PASS mobile security '+phase+': 390/320px, 10 unchanged base layouts, '+(baseline?'baseline captured':'default auth pixels/role scopes/masking/90-day/KR failure-only checks')+', no writes. '+output);
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{console.error(error);process.exitCode=1;server.close();});
