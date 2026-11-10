(function(){
  'use strict';
  var frame=document.getElementById('signupPreview'),tabs=Array.from(document.querySelectorAll('[data-case]')),selected='before';
  var channelControl=document.getElementById('reviewChannel');
  var passNames={before:'인증 전',pending:'인증 진행 중',success:'본인확인 완료 · 14세 이상',underage:'만 14세 미만 · 가입 불가',cancelled:'인증 취소',failed:'인증 실패',expired:'인증 만료',reconfirm:'재인증 필요'};
  var dateNames={missing:'생년월일 미입력',invalid:'잘못된 날짜',future:'미래 날짜',underage:'만 14세 미만 · 가입 불가',eligible:'만 14세 이상 · 가입 가능'};
  function command(data){frame.contentWindow.postMessage(Object.assign({type:'miq:pass-review-command'},data),location.origin);}
  function choose(name){selected=name;tabs.forEach(function(tab){var active=tab.dataset.case===name;tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});var url='index.html?case='+name+'&lang='+(name==='nonko'?'en':'ko')+'&channel='+channelControl.value;frame.src=url;document.getElementById('openStandalone').href=url;document.getElementById('reviewCurrent').textContent='화면을 불러오는 중';document.querySelectorAll('[data-result],#reviewReconfirm').forEach(function(button){button.disabled=true;});}
  tabs.forEach(function(tab,index){tab.addEventListener('click',function(){choose(tab.dataset.case);});tab.addEventListener('keydown',function(event){var next;if(event.key==='ArrowRight')next=(index+1)%tabs.length;else if(event.key==='ArrowLeft')next=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus();choose(tabs[next].dataset.case);});});
  channelControl.addEventListener('change',function(){command({command:'channel',channel:this.value});});
  document.getElementById('reviewLanguage').addEventListener('change',function(){command({command:'language',language:this.value});});
  document.querySelectorAll('[data-result]').forEach(function(button){button.addEventListener('click',function(){command({command:'result',result:button.dataset.result});});});
  document.getElementById('reviewReconfirm').addEventListener('click',function(){command({command:'reconfirm'});});
  function viewport(){document.getElementById('reviewViewport').textContent='WEB '+Math.round(frame.getBoundingClientRect().width)+'px · 축소 없이 표시';}
  frame.addEventListener('load',function(){viewport();frame.contentWindow.postMessage({type:'miq:pass-review-request'},location.origin);});window.addEventListener('resize',viewport);
  window.addEventListener('message',function(event){
    var data=event.data;
    if(event.source!==frame.contentWindow||event.origin!==location.origin||!data||data.type!=='miq:pass-review-state'||data.case!==selected||!['ko','en','de','ar','es','fr','it','ja'].includes(data.language)||!['phone','birthdate'].includes(data.method))return;
    var phone=data.method==='phone';
    if((data.countryCode==='KR')!==phone||phone&&(!['pass-app','sms'].includes(data.channel)||!Object.prototype.hasOwnProperty.call(passNames,data.passState))||!phone&&(data.channel!==null||!Object.prototype.hasOwnProperty.call(dateNames,data.dateState)))return;
    document.getElementById('reviewMethod').textContent=phone?'한국(KR) · '+(data.channel==='sms'?'문자(SMS)':'PASS 앱'):'한국 이외 · 기존 생년월일 시안';
    document.getElementById('reviewCurrent').textContent=phone?passNames[data.passState]:dateNames[data.dateState];
    document.getElementById('reviewProgress').textContent=data.step==='details'?'정보 입력 단계 · 도착 확인':data.canContinue?'다음 단계 활성':'다음 단계 비활성';
    document.querySelector('.review-status').dataset.eligible=String(data.canContinue===true);document.getElementById('reviewLanguage').value=data.language;
    channelControl.disabled=!phone;if(phone)channelControl.value=data.channel;
    document.getElementById('openStandalone').href='index.html?case='+selected+'&lang='+data.language+'&country='+data.countryCode+'&channel='+channelControl.value;
    document.querySelectorAll('[data-result]').forEach(function(button){button.disabled=!phone||!(data.passState==='pending'||button.dataset.result==='expired'&&data.passState==='success');});
    document.getElementById('reviewReconfirm').disabled=!phone||data.passState!=='success';
  });viewport();
}());
