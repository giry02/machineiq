(function(){
  'use strict';
  var from=document.getElementById('smartFrom'),to=document.getElementById('smartTo'),sw=document.getElementById('smartSw'),save=document.getElementById('smartSave');
  if(!from||!to||!sw||!save)return;
  var host=document.getElementById('smartSchedule'),status=document.getElementById('smartFeedback');
  var feedbackTimer;
  function clearSaveFeedback(){
    clearTimeout(feedbackTimer);
    status.textContent='';
    status.classList.remove('smart-feedback-popup');
  }
  function showSaveFeedback(message,duration){
    clearSaveFeedback();
    status.classList.add('smart-feedback-popup');
    status.textContent=message;
    feedbackTimer=setTimeout(clearSaveFeedback,duration);
  }
  var role=document.body.dataset.managementRole||'internal';
  var vin=new URLSearchParams(location.search).get('veh')||'default';
  var key='linq.smartCharge.v1:'+role+':'+vin;
  [from,to].forEach(function(sel,i){sel.innerHTML=Array.from({length:24},function(_,h){return '<option value="'+h+'">'+String(h).padStart(2,'0')+'시</option>';}).join('');sel.value=i?'6':'22';});
  try{var stored=JSON.parse(localStorage.getItem(key));if(stored&&MIQMeeting.chargeWindow(stored.from,stored.to)){from.value=stored.from;to.value=stored.to;sw.classList.toggle('on',stored.on===true);}}catch(e){}
  function paint(){
    var available=!sw.disabled,on=available&&sw.classList.contains('on'),w=MIQMeeting.chargeWindow(from.value,to.value);
    from.disabled=to.disabled=!on;save.disabled=!available;sw.setAttribute('aria-pressed',String(on));
    if(!available)status.textContent='선택 차량의 스마트 충전 설정은 수집 전입니다.';
    var lastDay=w.overnight?'금일 ':'익일 ';
    host.innerHTML='<div class="smart-schedule__label"><strong>'+(on?w.startLabel+' → '+w.endLabel+' · '+w.duration+'시간':'스마트 충전 꺼짐')+'</strong><span>차량 시간 · Asia/Seoul</span></div>'
      +'<div class="smart-schedule__track" role="img" aria-label="24시간 중 '+(on?w.duration:0)+'시간 충전 설정"><span style="width:'+(on?w.fill:0)+'%"></span>'
      +(w.midnight!==null&&w.midnight<100?'<i style="left:'+w.midnight+'%" title="금일 00:00"><b>금일 00:00</b></i>':'')+'</div>'
      +'<div class="smart-schedule__axis"><span>'+w.startLabel+'</span><span>24시간 · '+lastDay+String(w.start).padStart(2,'0')+':00</span></div>';
  }
  from.addEventListener('change',function(){clearSaveFeedback();status.textContent='변경 후 저장해 주세요.';paint();});
  to.addEventListener('change',function(){clearSaveFeedback();status.textContent='변경 후 저장해 주세요.';paint();});
  sw.addEventListener('click',function(){clearSaveFeedback();status.textContent='변경 후 저장해 주세요.';paint();});
  save.addEventListener('click',function(){if(sw.disabled)return;try{localStorage.setItem(key,JSON.stringify({from:Number(from.value),to:Number(to.value),on:sw.classList.contains('on')}));showSaveFeedback('저장했습니다.',2000);}catch(e){showSaveFeedback('설정을 저장하지 못했습니다. 다시 시도해 주세요.',4000);}});
  document.addEventListener('keydown',function(event){if(event.key==='Escape'&&status.classList.contains('smart-feedback-popup'))clearSaveFeedback();});
  paint();
})();
