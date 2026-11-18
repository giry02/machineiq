/* Explicit design review only. No provider, verified success, account update or persistence. */
(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {root.MobileSecurityPreview=api;if(root.document&&root.location)api.bind(root.document,root.location.search);}
})(typeof window==='undefined'?globalThis:window,function(){
  'use strict';
  function reminderDate(selectedDay){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(selectedDay))return null;
    const selected=new Date(selectedDay+'T00:00:00Z');
    if(!Number.isFinite(selected.getTime())||selected.toISOString().slice(0,10)!==selectedDay)return null;
    selected.setUTCDate(selected.getUTCDate()+90);
    return selected.toISOString().slice(0,10);
  }
  const passMessages=Object.freeze({
    before:'본인확인 전입니다. 실제 PASS 공급자와 연결되지 않은 검토 시안입니다.',
    failed:'본인확인에 실패했습니다. 잠시 후 다시 시도해 주세요. 인증되지 않았습니다.',
    cancelled:'본인확인을 취소했습니다. 인증되지 않았습니다.',
    expired:'본인확인 시간이 만료되었습니다. 다시 시도해 주세요. 인증되지 않았습니다.'
  });
  function passState(country,result='before'){
    return Object.freeze({required:country==='KR',state:country==='KR'&&Object.hasOwn(passMessages,result)?result:'before',verified:false});
  }
  function bind(document,search){
    if(new URLSearchParams(search).get('securityPreview')!=='1')return;
    // Keep review actions separate from the existing local mock login/signup handlers.
    for(const selector of ['#mobile-login-form','#forced-password-form','#signup-form'])document.querySelector(selector)?.addEventListener('submit',event=>{
      event.preventDefault();event.stopImmediatePropagation();
    },true);
    const reminder=document.querySelector('[data-password-reminder-preview]');
    if(reminder){
      reminder.hidden=false;
      const status=reminder.querySelector('[data-password-reminder-status]');
      reminder.querySelector('[data-password-later]').addEventListener('click',()=>{
        const selectedDay=new Date(Date.now()+9*60*60*1000).toISOString().slice(0,10);
        status.textContent='선택일 '+selectedDay+' · 다음 안내 '+reminderDate(selectedDay)+' (90일 후). 화면 시안이며 서버의 비밀번호 변경일·다음 안내일은 변경하지 않습니다.';
        reminder.dataset.serverUpdated='false';
      });
    }
    const panel=document.querySelector('[data-mobile-pass-preview]'),country=document.querySelector('#signup-country');
    if(!panel||!country)return;
    function render(result){
      const value=passState(country.value,result);
      panel.hidden=!value.required;panel.dataset.state=value.state;panel.dataset.verified='false';
      panel.querySelector('[data-mobile-pass-status]').textContent=passMessages[value.state];
    }
    panel.querySelectorAll('[data-mobile-pass-result]').forEach(button=>button.addEventListener('click',()=>render(button.dataset.mobilePassResult)));
    country.addEventListener('change',()=>render('before'));
    document.querySelector('#signup-phone')?.addEventListener('input',()=>render('before'));
    rootPageHide(document,()=>render('before'));
    render('before');
  }
  function rootPageHide(document,callback){document.defaultView?.addEventListener('pagehide',callback);}
  return Object.freeze({reminderDate,passState,bind});
});
