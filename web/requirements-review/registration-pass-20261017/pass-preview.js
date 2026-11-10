(function(){
  'use strict';
  var one=function(selector){return document.querySelector(selector);},all=function(selector){return Array.from(document.querySelectorAll(selector));};
  var allowedCases=['before','pending','success','underage','cancelled','failed','expired','reconfirm','nonko','language-reset','channel-switch','late-response','birth-invalid','birth-birthday','birth-underage'];
  var query=new URLSearchParams(location.search),viewCase=allowedCases.includes(query.get('case'))?query.get('case'):'before';
  var language=MIQPassPreviewModel.normalizeLanguage(query.get('lang')||(viewCase==='nonko'?'en':'ko'));
  var initialChannel=['pass-app','sms'].includes(query.get('channel'))?query.get('channel'):'pass-app';
  var initialCountry=query.get('country')||(['nonko','birth-invalid','birth-birthday','birth-underage'].includes(viewCase)?'US':'KR');
  var model=MIQPassPreviewModel.create(language,initialChannel,initialCountry),ticket=null,currentStep='agreement',interacted=false,timers=new Set();
  var terms=all('[data-term]'),required=all('[data-term-required="true"]'),agreeAll=one('#registrationAgreeAll');
  var today={year:2026,month:10,day:17},textSources=new WeakMap(),attributeSources=new WeakMap();
  function localize(){
    var common=MIQSignupCopy.common[language]||{},walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    for(var node=walker.nextNode();node;node=walker.nextNode()){
      if(node.parentElement.closest('script,style,template,[translate="no"],[data-custom-copy]'))continue;
      if(!textSources.has(node))textSources.set(node,node.nodeValue);
      var source=textSources.get(node),trimmed=source.trim();node.nodeValue=common[trimmed]?source.replace(trimmed,common[trimmed]):source;
    }
    all('[placeholder],[aria-label],[title]').forEach(function(element){
      if(element.closest('[translate="no"],[data-custom-copy]'))return;
      var values=attributeSources.get(element)||{};
      ['placeholder','aria-label','title'].forEach(function(name){if(element.hasAttribute(name)){if(!(name in values))values[name]=element.getAttribute(name);element.setAttribute(name,common[values[name]]||values[name]);}});
      attributeSources.set(element,values);
    });
  }
  function dateFields(){return [one('#birthYear'),one('#birthMonth'),one('#birthDay')].filter(Boolean);}
  function readDate(){var fields=dateFields();return {year:fields[0]?fields[0].value:'',month:fields[1]?fields[1].value:'',day:fields[2]?fields[2].value:''};}
  function age(){return MIQBirthdateRule.evaluate(readDate(),today);}
  function accepted(){return terms.length===6&&required.length===4&&required.every(function(term){return term.checked;});}
  function phone(){return model.snapshot().countryCode==='KR';}
  function available(){return model.canContinue(accepted(),!phone()&&age().eligible);}
  function clearTimers(){timers.forEach(clearTimeout);timers.clear();}
  function report(){if(window.parent===window)return;var state=model.snapshot();window.parent.postMessage({type:'miq:pass-review-state',case:viewCase,language:language,countryCode:state.countryCode,method:state.method,channel:state.channel,passState:state.passState,dateState:state.method==='birthdate'?age().state:'not-shown',canContinue:available(),step:currentStep},location.origin);}
  function renderIdentity(){
    var slot=one('#registrationIdentitySlot');slot.replaceChildren(one(phone()?'#passIdentityTemplate':'#birthdateIdentityTemplate').content.cloneNode(true));
    if(phone()){
      all('[name="phoneIdentityChannel"]').forEach(function(input){input.addEventListener('change',function(){changeChannel(input.value);});});
      one('#startPass').addEventListener('click',function(){ticket=model.start();update();});
      one('#cancelPass').addEventListener('click',function(){if(ticket)model.finish(ticket,'cancelled');ticket=null;clearTimers();update();});
    }else{
      var copy=MIQSignupCopy.age[language],fields=dateFields(),legend=one('.birthdate-block legend');
      legend.firstChild.nodeValue=copy.label+' ';fields[0].placeholder=copy.year;
      fields[1].options[0].textContent=copy.month;fields[2].options[0].textContent=copy.day;
      Array.from(fields[1].options).slice(1).forEach(function(option){option.textContent=option.value+(language==='ja'?'月':'');});
      Array.from(fields[2].options).slice(1).forEach(function(option){option.textContent=option.value+(language==='ja'?'日':'');});
      ['birthYear','birthMonth','birthDay'].forEach(function(id,index){one('label[for="'+id+'"]').textContent=[copy.year,copy.month,copy.day][index];});
      one('#birthdateNotice').textContent=copy.notice;
      fields.forEach(function(field){['input','change'].forEach(function(event){field.addEventListener(event,function(){interacted=true;update();});});});
    }
  }
  function showStep(step,focus){
    if(step==='details'&&!available()){interacted=true;update();var target=phone()?one('#startPass'):(dateFields().find(function(field){return !field.value;})||dateFields()[0]);if(target)target.focus();return;}
    currentStep=step;one('#registrationAgreement').hidden=step!=='agreement';one('#registrationDetails').hidden=step!=='details';
    all('[data-registration-step]').forEach(function(button){if(button.dataset.registrationStep===step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
    if(focus!==false){var target=step==='details'?one('#registrationDetailsTitle'):phone()?one('#startPass'):dateFields()[0];if(target)target.focus();}
    report();
  }
  function update(){
    var state=model.snapshot(),ready=available();one('#registrationContinue').disabled=!ready;one('[data-registration-step="details"]').disabled=!ready;
    agreeAll.checked=terms.length===6&&terms.every(function(term){return term.checked;});agreeAll.indeterminate=!agreeAll.checked&&terms.some(function(term){return term.checked;});
    if(phone()){
      var copy=MIQPhonePreviewCopy[language],status=one('#passStatus');status.textContent=copy.states[state.passState]||copy.states.before;status.className='signup-pass-status'+(state.passState==='success'?' is-success':['underage','failed','expired'].includes(state.passState)?' is-error':'');
      one('#signupPassTitle').firstChild.nodeValue=copy.title+' ';one('.signup-pass-description').textContent=copy.description;one('.signup-pass-guidance .birthdate-notice').textContent=MIQSignupCopy.age[language].notice;
      one('.signup-auth-methods legend').textContent=copy.title;one('#cancelPass').textContent=(MIQSignupCopy.common[language]||{})['취소']||'Cancel';
      all('.signup-auth-options label').forEach(function(label,index){label.lastChild.textContent=' '+(index===0?copy.pass:copy.sms);});
      all('[name="phoneIdentityChannel"]').forEach(function(input){input.checked=input.value===state.channel;});
      one('#phoneChannelHint').textContent=state.channel==='sms'?copy.smsHint:copy.passHint;
      var button=one('#startPass');button.disabled=['pending','success'].includes(state.passState);button.textContent=state.passState==='pending'?copy.states.pending:state.passState==='success'?copy.verified:state.channel==='sms'?copy.sms:copy.pass;one('#cancelPass').hidden=state.passState!=='pending';
    }else{
      var result=age(),copy=MIQSignupCopy.age[language],show=interacted||result.state!=='missing',status=one('#birthdateStatus');status.textContent=show?copy[result.state]:copy.initial;status.className='birthdate-status'+(result.eligible?' is-success':show?' is-error':'');one('.birthdate-block').dataset.state=result.state;dateFields().forEach(function(field){field.setAttribute('aria-invalid',String(show&&!result.eligible));});
    }
    var agreement=one('#agreementStatus');agreement.hidden=!ready;agreement.className='aae-alert is-success';agreement.textContent=ready?(phone()?MIQPhonePreviewCopy[language].complete:MIQSignupCopy.age[language].complete):'';
    // These disabled destination fields illustrate automatic result mapping, not re-entry.
    one('#registrationName').value=phone()&&state.verified?MIQPhonePreviewCopy[language].mapped:'';
    one('#registrationPhone').value=phone()&&state.verified?MIQPhonePreviewCopy[language].mapped:'';
    if(currentStep==='details'&&!ready)showStep('agreement',false);
    report();
  }
  function changeLanguage(next){
    if(!model.changeLanguage(next))return;
    clearTimers();ticket=null;dateFields().forEach(function(field){field.value='';});terms.forEach(function(term){term.checked=false;});language=model.snapshot().language;interacted=false;
    document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';one('#signupLanguage').value=language;
    renderIdentity();document.dispatchEvent(new CustomEvent('miq:languagechange'));localize();showStep('agreement',false);update();
    all('.miq-auth-brand,.miq-auth-login').forEach(function(link){link.href='../../Login/login-tobe.html?lang='+language;});
  }
  function changeChannel(next){
    if(!model.changeChannel(next))return;
    clearTimers();ticket=null;update();
  }
  function changeCountry(next){
    if(!model.changeCountry(next))return;
    clearTimers();ticket=null;interacted=false;renderIdentity();localize();showStep('agreement',false);update();
    one('#registrationCountry').value=next;
  }
  function complete(result,late){
    if(result==='expired'&&model.snapshot().verified){model.invalidate('expired');ticket=null;update();return;}
    var captured=ticket;if(!captured)return;
    function callback(){if(model.finish(captured,result)){ticket=null;update();}}
    if(late){var timer=setTimeout(function(){timers.delete(timer);callback();},900);timers.add(timer);}else callback();
  }
  function clearPersonal(){clearTimers();model.invalidate('before');ticket=null;dateFields().forEach(function(field){field.value='';});terms.forEach(function(term){term.checked=false;});interacted=false;showStep('agreement',false);update();}
  agreeAll.addEventListener('change',function(){terms.forEach(function(term){term.checked=agreeAll.checked;});update();});terms.forEach(function(term){term.addEventListener('change',update);});
  one('#registrationContinue').addEventListener('click',function(){showStep('details');});all('[data-registration-step]').forEach(function(button){button.addEventListener('click',function(){showStep(button.dataset.registrationStep);});});
  all('.aae-agreement-toggle').forEach(function(button){button.addEventListener('click',function(){var target=document.getElementById(button.getAttribute('aria-controls')),open=target.hidden;all('.aae-agreement__content').forEach(function(content){content.hidden=true;});all('.aae-agreement-toggle').forEach(function(item){item.setAttribute('aria-expanded','false');item.textContent=(MIQSignupCopy.common[language]||{})['열기']||'Open';});target.hidden=!open;button.setAttribute('aria-expanded',String(open));button.textContent=(MIQSignupCopy.common[language]||{})[open?'닫기':'열기']||(open?'Close':'Open');});});
  one('#signupLanguage').addEventListener('change',function(){changeLanguage(this.value);});one('#registrationForm').addEventListener('submit',function(event){event.preventDefault();});
  all('[data-registration-cancel]').forEach(function(button){button.addEventListener('click',function(){clearPersonal();window.location.href='../../Login/login-tobe.html?lang='+language;});});
  window.addEventListener('message',function(event){
    var data=event.data;if(window.parent===window||event.source!==window.parent||event.origin!==location.origin||!data)return;
    if(data.type==='miq:pass-review-request')report();
    if(data.type!=='miq:pass-review-command')return;
    if(data.command==='language')changeLanguage(data.language);
    else if(data.command==='channel')changeChannel(data.channel);
    else if(data.command==='result'&&['success','underage','cancelled','failed','expired'].includes(data.result))complete(data.result,false);
    else if(data.command==='late-success')complete('success',true);
    else if(data.command==='reconfirm'&&phone()){clearTimers();model.invalidate('reconfirm');ticket=null;update();}
  });
  window.addEventListener('pagehide',clearPersonal);window.addEventListener('pageshow',function(event){if(event.persisted)clearPersonal();});
  document.documentElement.lang=language;document.documentElement.dir=language==='ar'?'rtl':'ltr';one('#signupLanguage').value=language;renderIdentity();document.dispatchEvent(new CustomEvent('miq:languagechange'));localize();
  var countrySelect=one('#identityCountry');countrySelect.value=initialCountry;countrySelect.addEventListener('change',function(){changeCountry(this.value);});one('#registrationCountry').value=initialCountry;
  all('.miq-auth-brand,.miq-auth-login').forEach(function(link){link.href='../../Login/login-tobe.html?lang='+language;});
  if(viewCase!=='before')required.forEach(function(term){term.checked=true;});
  if(phone()&&viewCase==='pending')ticket=model.start();
  else if(phone()&&['success','underage','cancelled','failed','expired'].includes(viewCase)){ticket=model.start();model.finish(ticket,viewCase);ticket=null;}
  else if(phone()&&viewCase==='reconfirm'){ticket=model.start();model.finish(ticket,'success');model.invalidate('reconfirm');ticket=null;}
  else if(phone()&&['channel-switch','late-response'].includes(viewCase)){
    model.changeChannel(initialChannel==='sms'?'pass-app':'sms');var previous=model.start();
    if(viewCase==='channel-switch')model.finish(previous,'success');
    model.changeChannel(initialChannel);ticket=null;
    if(viewCase==='late-response'){var timer=setTimeout(function(){timers.delete(timer);if(model.finish(previous,'success'))update();},900);timers.add(timer);}
  }
  else if(viewCase==='language-reset'){changeLanguage('en');changeLanguage('ko');}
  else if(!phone()&&['birth-invalid','birth-birthday','birth-underage'].includes(viewCase)){var date=viewCase==='birth-invalid'?['2012','2','30']:['2012','10',viewCase==='birth-birthday'?'17':'18'];dateFields().forEach(function(field,index){field.value=date[index];});interacted=true;}
  update();
}());
