/* Adopted customer home. Preserve shared routes, role scope, model and navigation. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.mount(root,document);
})(typeof window==='undefined'?null:window,()=>{
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const share=(part,total)=>total>0?part/total*100:null;
  const finite=value=>Number.isFinite(value)?Math.max(0,value):0;
  function current(M,vehicles,through=M.SNAPSHOT){
    const window=M.web.meeting.hourlyWindow(new Date(through.replace(' ','T')+':00+09:00'));
    const entries=vehicles.filter(v=>v.conn===true).map(v=>{
      const live=M.web.meeting.hourlyVehicle(v,window);
      return {v,live,time:M.web.times(v,live.runH*60)};
    });
    const work=entries.length?entries.reduce((n,e)=>n+e.time.working,0):null;
    const idle=entries.length?entries.reduce((n,e)=>n+e.time.idle,0):null;
    const running=entries.filter(e=>e.live.running).length;
    const supplies=M.supplySummary(vehicles);
    return {total:vehicles.length,known:entries.length,offline:vehicles.length-entries.length,running,idleCount:entries.length-running,
      work,idle,workPer:entries.length?work/entries.length:null,idlePer:entries.length?idle/entries.length:null,
      workShare:share(work,work+idle),idleShare:share(idle,work+idle),runningRate:share(running,entries.length),
      error:M.dashboardErrors(vehicles,{from:window.date,to:window.date,through}).length,
      due:supplies.due,soon:supplies.soon,supplyUnknown:supplies.hasUnknown};
  }
  function build(M,rows,role='customer_owner'){
    const vehicles=M.scope(rows,{role,group:'',type:''});
    const today=M.SNAPSHOT.slice(0,10),all=current(M,vehicles);
    const groups=[...new Set(vehicles.map(v=>v.group))].map(group=>({group,...current(M,vehicles.filter(v=>v.group===group))}));
    // Complete calendar days only. Do not compare today's partial interval to a full day.
    // Use each day report's actual adapter, so clicking a column reproduces its hours.
    const trend=Array.from({length:7},(_,i)=>{
      const date=M.calendarDate(today);date.setUTCDate(date.getUTCDate()-7+i);
      const day=date.toISOString().slice(0,10),available=day>=M.DATA_START;
      const p=available&&vehicles.length?M.efficiencyPerformance(vehicles,day,day,{period:'d'}):null;
      return {day,known:p?.known||0,work:p?.known?p.work:null,idle:p?.known?p.idle:null};
    });
    return {all,groups,trend,today,through:M.SNAPSHOT,role,assignedGroup:role==='customer_staff'?M.assignedGroup(role):''};
  }
  function sortGroups(groups,sort){
    const key=sort==='idle'?'idleShare':'workPer';
    return [...groups].sort((a,b)=>(Number.isFinite(b[key])?b[key]:-1)-(Number.isFinite(a[key])?a[key]:-1)||a.group.localeCompare(b.group,'ko'));
  }
  function render(M,data,sort='work',mode='preview'){
    const {all:c,groups,trend}=data,n=M.DISPLAY.number,h=v=>M.DISPLAY.duration(v,true),pct=v=>M.DISPLAY.efficiency(v);
    const staff=data.role==='customer_staff';
    const icon=name=>`<i data-lucide="${name}" aria-hidden="true"></i>`;
    const chevron=icon('chevron-right');
    const legend='<span class="od-legend"><span><i class="od-dot od-work"></i>작업</span><span><i class="od-dot od-idle"></i>대기</span></span>';
    const help=(id,title)=>`<button type="button" class="criteria-tip" id="${id}-trigger" data-criteria-tip="${id}" aria-label="${title} 기준 안내" aria-expanded="false" aria-controls="${id}">${icon('circle-help')}</button>`;
    const note=(id,text)=>`<div id="${id}" class="criteria-tip-panel" hidden><p class="source-note">${text}</p><button type="button" class="criteria-tip-close" data-close-criteria="${id}">닫기${icon('x')}</button></div>`;
    const heading=(title,id,action='')=>`<div class="dashboard-panel__head"><div class="panel-heading-with-tip"><h2>${title}</h2>${id?help(id,title):''}</div>${action}</div>`;
    const action=(label,attrs)=>`<button class="od-text-link" type="button" ${attrs}>${label}${chevron}</button>`;
    const meter=(work,idle,max,aria)=>`<span class="od-meter" role="img" aria-label="${esc(aria)}"><i class="od-work" style="width:${finite(share(work,max))}%"></i><i class="od-idle" style="width:${finite(share(idle,max))}%"></i></span>`;
    const supplyNote=unknown=>unknown?'<p class="od-footnote od-missing-data" role="status">소모품 정보 미수신 · 상태 확인 불가</p>':'';
    const issue=(key,label,ico)=>`<button type="button" class="od-issue${key==='soon'?' od-soon':''}${c[key]===0?' od-zero':''}" data-service-focus="${key}" aria-label="${label} ${n(c[key])}${key==='error'?'건':'개'} 보기"><span class="od-issue-label">${icon(ico)}${label}</span><span class="od-number">${n(c[key])}<small>${key==='error'?'건':'개'}</small></span></button>`;
    const live=(key,label,value,color)=>`<button type="button" class="od-state" data-live="${key}" aria-label="${label} 차량 ${value}대 보기"><span><i class="od-dot ${color}"></i>${label}</span><span><b>${n(value)}</b><small>대</small>${chevron}</span></button>`;
    const running=finite(share(c.running,c.total)),connected=finite(share(c.known,c.total));
    const maxGroup=Math.max(60,...groups.map(g=>finite(g.workPer)+finite(g.idlePer)));
    const groupRows=sortGroups(groups,sort).map(g=>{
      const report=`data-report-group="${esc(g.group)}" data-today="true"`;
      const service=(key,label)=>`<button type="button" data-service-focus="${key}" data-scope-group="${esc(g.group)}" aria-label="${esc(g.group)} ${label} ${n(g[key])}${key==='error'?'건':'개'} 보기" class="od-group-issue${g[key]?' has-value':''}${key==='soon'?' od-soon':''}"><span>${label}</span><span><b>${n(g[key])}</b><small>${key==='error'?'건':'개'}</small></span></button>`;
      return `<article class="od-group-row" aria-label="${esc(g.group)} 운영 비교"><button type="button" class="od-group-chart" ${report} aria-label="${esc(g.group)} 금일 업무 리포트 보기"><span class="od-group-title"><strong>${esc(g.group)}</strong><span><b>${h(g.workPer)}</b>${chevron}</span></span>${meter(g.workPer,g.idlePer,maxGroup,`대당 작업 ${h(g.workPer)}, 대기 ${h(g.idlePer)}`)}<span class="od-group-meta"><span>집계 ${g.known}/${g.total}대</span><span>대기 비율 <b>${pct(g.idleShare)}</b></span></span></button><div class="od-group-issues">${service('error','에러 발생')}${service('due','교체 필요')}${service('soon','교체 임박')}</div>${supplyNote(g.supplyUnknown)}</article>`;
    }).join('')||'<p class="empty-state">조회할 그룹이 없습니다.</p>';
    const maxTrend=Math.max(60,...trend.map(d=>finite(d.work)+finite(d.idle)));
    const available=trend.filter(d=>d.known),avg=available.length?available.reduce((n,d)=>n+d.work,0)/available.length:null;
    const bars=trend.map(d=>{
      const title=`${d.day} 작업 ${h(d.work)} · 대기 ${h(d.idle)}`;
      return `<span class="od-day" role="img" aria-label="${esc(title)}"><span class="od-day-value">${n(d.work==null?null:(d.work+d.idle)/60)}</span><span class="od-day-track"><span class="od-day-bar" style="height:${finite(share(finite(d.work)+finite(d.idle),maxTrend))}%"><i class="od-idle" style="flex:${finite(d.idle)}"></i><i class="od-work" style="flex:${finite(d.work)}"></i></span></span><span class="od-day-label">${d.day.slice(8)}</span></span>`;
    }).join('');
    const scope=staff?`내 그룹 차량 <b>${n(c.total)}대</b> · ${esc(data.assignedGroup||'미배정')}`:`전체 차량 <b>${n(c.total)}대</b> · ${groups.length}개 그룹`;
    const groupSort=staff?'':`<div class="od-sort" role="group" aria-label="그룹 비교 정렬"><button type="button" data-owner-sort="work" aria-pressed="${sort==='work'}">작업시간순</button><button type="button" data-owner-sort="idle" aria-pressed="${sort==='idle'}">대기비율순</button></div>`;
    const groupHelp=staff?'배정된 그룹의 대당 작업·대기시간과 현재 에러·소모품을 표시합니다. 숫자는 대당 작업시간입니다. 대기 비율 = 대기 ÷ (작업 + 대기). 그룹명을 누르면 내 그룹 금일 리포트, 에러·소모품은 내 그룹의 서비스 목록으로 이동합니다.':'차량 수가 다른 그룹을 비교할 수 있도록 대당 작업·대기시간을 같은 길이 척도로 표시합니다. 숫자는 대당 작업시간입니다. 대기비율순은 대기 ÷ (작업 + 대기)가 높은 순이며 비율을 산출할 수 없는 그룹은 마지막에 놓습니다. 배치·근무·기종 차이가 있으므로 성과 순위로 단정하지 않습니다. 그룹명을 누르면 금일 리포트, 에러·소모품은 해당 그룹의 서비스 목록으로 이동합니다.';
    return `<div class="od-content">
      <div class="od-scope"><span>${scope}</span>${mode==='main'?'':`<a href="./dashboard-backup-20260919.html#home?role=${staff?'customer_staff':'customer_owner'}">기존안 보기${chevron}</a>`}</div>
      <section class="dashboard-panel od-priority" aria-label="금일 에러 발생 건수와 현재 소모품 항목 수"><div class="od-issues">${issue('error','에러 발생','triangle-alert')}${issue('due','교체 필요','refresh-cw')}${issue('soon','교체 임박','clock')}</div>${supplyNote(c.supplyUnknown)}</section>
      <section class="dashboard-panel od-fleet">${heading('현재 차량 상태','od-fleet-help',action('차량 보기','data-route="summary"'))}<div class="od-fleet-body"><div class="od-ring" role="img" aria-label="전체 ${c.total}대 중 가동 ${c.running}대, 미가동 ${c.idleCount}대, 미연결 ${c.offline}대" style="--od-running:${running}%;--od-connected:${connected}%"><div class="od-ring-center"><span>가동 중</span><strong>${n(c.running)}<small>대</small></strong><span>전체 ${n(c.total)}대</span></div></div><div class="od-states">${live('running','가동',c.running,'od-work')}${live('idle','미가동',c.idleCount,'od-idle')}${live('offline','미연결',c.offline,'od-offline')}</div></div><div class="od-fleet-foot"><button type="button" data-live="connected"><span class="status-pill" title="통신연결">연결</span> ${c.known}/${c.total}대</button><span>연결 중 가동률 <b>${pct(c.runningRate)}</b></span></div>${note('od-fleet-help','도넛은 전체 보유 차량을 가동·미가동·미연결로 나눕니다. 연결 중 가동률 = 가동 차량 ÷ 통신 연결 차량. 미연결은 현재 가동 여부를 알 수 없어 미가동에 포함하지 않습니다. 작업시간의 운영효율과는 다른 지표입니다.')}</section>
      <section class="dashboard-panel od-today">${heading('오늘의 작업 효율','od-work-help',action('리포트','data-today-report'))}<div class="od-work-kpis"><button type="button" data-today-report><span>총 작업시간</span><strong>${h(c.work)}</strong><small>대당 ${h(c.workPer)}</small></button><button type="button" data-today-report><span>운영효율</span><strong>${pct(c.workShare)}</strong><small>작업시간 비율</small></button></div>${meter(c.work,c.idle,finite(c.work)+finite(c.idle),`작업 ${h(c.work)}, 대기 ${h(c.idle)}`)}<div class="od-work-breakdown"><span><i class="od-dot od-work"></i>작업 <b>${h(c.work)}</b></span><span><i class="od-dot od-idle"></i>대기 <b>${h(c.idle)}</b></span></div><p class="od-footnote">금일 연결 ${c.known}대 집계 · 미연결 ${c.offline}대 제외</p>${note('od-work-help','운영효율 = 작업시간 ÷ (작업시간 + 대기시간). 대당 작업시간은 연결되어 실적을 확인한 차량의 평균입니다. 금일 00시~상단 집계 시각 기준이며 미연결 차량은 실적 집계에서 제외합니다. 수신 대상이 없거나 운행시간이 0이면 비율은 -입니다. 목표치·절감 비용·저성과 판정은 임의로 만들지 않습니다.')}</section>
      ${staff?'':`<section class="dashboard-panel od-groups">${heading(staff?'내 그룹 작업 현황':'그룹별 운영 비교','od-groups-help')}${groupSort}<div class="od-chart-caption"><span>${staff?'대당 작업·대기시간':sort==='idle'?'대기 비율 높은 순':'대당 작업시간 많은 순'}</span>${legend}</div><div data-owner-groups>${groupRows}</div>${note('od-groups-help',groupHelp)}</section>`}
      <section class="dashboard-panel od-trend"><button type="button" class="od-trend-link" data-home-efficiency aria-label="이번 달 운영효율 보기"></button>${heading('최근 7일 작업 추이','od-trend-help')}<div class="od-trend-summary"><div><span>일평균 작업시간</span><strong>${h(avg)}</strong></div><span>${trend[0].day.slice(5).replace('-','.')}~${trend[6].day.slice(5).replace('-','.')}<br>오늘 제외</span></div><div class="od-chart-caption"><span>운행시간 · h</span>${legend}</div><div class="od-trend-bars" aria-label="최근 7일 일별 작업·대기시간 차트">${bars}</div><p class="od-footnote">영역을 누르면 이번 달 운영효율이 열립니다.</p>${note('od-trend-help','어제까지 완료된 7개 날짜의 기간별 리포트 실적입니다. 숫자는 일별 운행시간(작업 + 대기)을 시간 단위 정수로 반올림하며 막대의 회색 부분은 대기시간입니다. 오늘은 집계 중이므로 추이에서 제외합니다. 현재 미연결 차량도 해당 과거 날짜에 수집된 실적이 있으면 포함하므로, 연결 차량만 집계한 오늘 카드와 조회 대상이 다릅니다. 미수신 날짜는 0이 아닌 -입니다.')}</section>
    </div>`;
  }
  function mount(root,document){
    if(!document.body.classList.contains('owner-dashboard-preview'))return;
    const main=document.querySelector('#main'),M=root.CustomerPrototype,fleet=root.MIQ_MOCK_DATA?.fleet;
    if(!main||!M||!fleet)return;
    let sort='work';
    function enhance(){
      const home=main.querySelector('[data-screen-id="LQ-DASH-001"]');
      if(!home||home.dataset.ownerPreview==='ready')return;
      const p=new URLSearchParams(root.location.search);
      new URLSearchParams(root.location.hash.split('?')[1]||'').forEach((v,k)=>p.set(k,v));
      const requestedRole=p.has('role')?p.get('role'):'customer_owner';
      const role=Object.hasOwn(M.ROLE_LABELS,requestedRole)?requestedRole:'customer_staff';
      const snapshot=home.querySelector('.snapshot');
      if(!snapshot)return;
      const data=build(M,M.buildVehicles(fleet),role),mode=document.body.dataset.dashboardMode==='main'?'main':'preview';
      home.dataset.ownerPreview='ready';
      document.title=mode==='main'?'홈 · MACHINE IQ':`${role==='customer_staff'?'고객직원':'업체대표'} 대시보드 · 비교안 · MACHINE IQ`;
      // Keep the original title, refresh, collection cutoff, header and navigation.
      [...home.children].filter(child=>child!==snapshot).forEach(child=>child.remove());
      home.insertAdjacentHTML('beforeend',render(M,data,sort,mode));
      root.lucide?.createIcons({attrs:{'stroke-width':2}});
    }
    main.addEventListener('click',event=>{
      const button=event.target.closest('[data-owner-sort]');
      if(!button||!['work','idle'].includes(button.dataset.ownerSort))return;
      sort=button.dataset.ownerSort;
      const home=main.querySelector('[data-screen-id="LQ-DASH-001"]');
      delete home.dataset.ownerPreview;enhance();
      home.querySelector(`[data-owner-sort="${sort}"]`)?.focus({preventScroll:true});
    });
    enhance();new root.MutationObserver(enhance).observe(main,{childList:true,subtree:true});
  }
  return {build,current,sortGroups,render,mount};
});
