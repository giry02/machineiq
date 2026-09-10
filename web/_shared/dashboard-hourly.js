(function(){
  'use strict';
  var source=window.MIQ_MOCK_DATA&&MIQ_MOCK_DATA.fleet;if(!source)return;
  var role=document.body.dataset.managementRole,policy=MIQCommon.roles.targetPolicy(role),query=new URLSearchParams(location.search);
  var fleet=source.vehicles.filter(function(v){return (!policy.companyIds||policy.companyIds.indexOf(v.companyId)>=0)&&(!MIQCommon.roles.isCustomer(role)||v.companyId==='1933')&&(role!=='customer_staff'||v.group==='물류1팀');});
  var panel=document.createElement('div');panel.className='dashboard-panel';panel.innerHTML='<div class="panel-heading"><h3>금일 누적 현황</h3><p id="hourlyRange"></p></div><div class="usage-compare-grid" id="hourlyValues"></div>';
  document.querySelector('.dashboard-live .live-summary').insertAdjacentElement('afterend',panel);
  var selected={companyId:query.get('companyId'),group:query.get('group'),type:query.get('type')};
  var dashboardCompanyIds=null;
  function paint(w){
    w=w||MIQMeeting.hourlyWindow(new Date(),'Asia/Seoul');
    var rows=fleet.filter(function(v){return (!dashboardCompanyIds||dashboardCompanyIds.indexOf(v.companyId)>=0)&&(!selected.companyId||selected.companyId==='all'||v.companyId===selected.companyId)&&(!selected.group||v.group===selected.group)&&(!selected.type||v.type===selected.type);});
    var samples=rows.map(function(v){return MIQMeeting.hourlyVehicle(v,w);});
    var stamp=document.querySelector('.dashboard-updated');stamp.textContent=w.date+' '+w.to+' 기준 · 1시간 단위 · Asia/Seoul';
    document.querySelector('.live-chip').textContent='시간별';
    document.getElementById('hourlyRange').textContent=w.date+' 00:00 ~ '+w.to+' · 완료된 '+w.hours+'개 시간 구간 · 수집값 있는 '+samples.filter(function(v){return v.known;}).length+'대 · 목업 데이터';
    var metrics=[['가동시간','runH','H'],['운행거리','km','Km'],['연료소비량','fuel','ℓ'],['배터리소비량','battery','kWh']];
    document.getElementById('hourlyValues').innerHTML=metrics.map(function(m){var known=samples.filter(function(v){return v[m[1]]!==null;});var value=known.reduce(function(sum,v){return sum+v[m[1]];},0);return '<article class="compare-metric"><span class="compare-metric__label">'+m[0]+'</span><div class="compare-metric__current">'+(known.length?value.toLocaleString('ko-KR',{maximumFractionDigits:1}):'-')+'<small>'+m[2]+'</small></div></article>';}).join('');

  }
  document.addEventListener('miq:target-change',function(e){selected={companyId:e.detail.companyId,group:e.detail.group||e.detail.groupName,type:e.detail.type||e.detail.fuelType};paint();});
  window.addEventListener('miq:dashboard-company-filter',function(e){dashboardCompanyIds=e.detail.companyIds;paint();});
  var clock=MIQMeeting.watchHourly(paint);
  window.addEventListener('pageshow',clock.refresh);
  window.addEventListener('focus',clock.refresh);
  document.addEventListener('visibilitychange',function(){if(!document.hidden)clock.refresh();});
})();
