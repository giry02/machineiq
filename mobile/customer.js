(() => {
  'use strict';
  const M = window.CustomerPrototype;
  const rows = M.buildVehicles(window.MIQ_MOCK_DATA.fleet);
  const $ = s => document.querySelector(s);
  const esc = x => String(x ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const fmt = M.DISPLAY.number;
  const hours = min => M.DISPLAY.duration(min);
  const shortHours = min => M.DISPLAY.duration(min,true);
  const rate = M.DISPLAY.efficiency;
  const issueStyle = key => M.STATUS[key]||M.STATUS.unknown;
  const metricCriteria = '운영효율 = 작업시간 ÷ (작업시간 + 대기시간) × 100. 운행시간이 0이면 산출하지 않습니다. 작업 활용률은 별도 가정 기준시간 대비 작업 비율입니다. 근무·배차 계획이 미연동되어 성과 판정용이 아닌 참고값입니다.';
  const missingCriteria = '숫자 -는 수신/집계 정보가 없거나 산출할 수 없다는 뜻입니다. 해당하지 않는 동력 항목도 -로 표시하며 실제 0은 0으로 표시합니다.';
  function periodCutoff() { const s=periodState(),current=state.view==='services'&&state.service==='supplies';const label=current?M.SNAPSHOT.slice(5).replace('-','.')+' 기준 · 현재 상태':(state.view==='services'?M.periodWindow(s.from,s.to):M.efficiencyWindow(s.from,s.to)).label;return `<span class="period-cutoff">${esc(label)}</span>`; }
  const labels = {home:'홈',summary:'요약정보',detail:'차량 상세',services:'서비스',reports:'리포트',efficiency:'운영효율',account:'설정',settings:'설정',shock:'충격',engine:'엔진',battery:'배터리',operation:'운행정보',supplies:'소모품',maintenance:'정비',error:'에러',notifications:'알림 내역'};
  const liveLabels = {connected:'통신 연결',offline:'통신 미연결',running:'가동 중',idle:'미가동',error:M.STATUS.error.label,due:M.STATUS.due.label,soon:M.STATUS.soon.label};
  let state, navigated = false, rangeOpen = false;
  const supplySelection=new Set();
  let supplyContext='',supplyPending=[],supplyUndo=[],supplyMessage='';
  // Per-role, in-memory UI preferences only. No OS permission, FCM or server write.
  const pushFields=[['shockWarningYn','실시간 충격'],['vehicleWarningYn','실시간 차량 에러'],['batteryWarningYn','실시간 배터리 경고'],['marketingYn','공지사항/마케팅 알림']];
  const pushPreferences=Object.fromEntries(Object.keys(M.ROLE_LABELS).map(role=>[role,{pushAlarmYn:false,...Object.fromEntries(pushFields.map(([key])=>[key,false]))}]));
  const notificationCategories=[['all','전체'],['shock','충격'],['error','차량 에러'],['battery','배터리'],['other','기타']];
  function notificationCategory(item) { const view=M.pushPresentation(item).view;return ['shock','error','battery'].includes(view)?view:'other'; }
  function readState() {
    const [requestedView, qs] = location.hash.slice(1).split('?');
    const view = Object.hasOwn(labels,requestedView) ? requestedView : 'home';
    const p = new URLSearchParams(location.search);
    new URLSearchParams(qs).forEach((v,k)=>p.set(k,v));
    const efficiencySelection=view==='efficiency'?M.efficiencyRange(p.get('period')||'m',p.get('from')||p.get('to')||M.SNAPSHOT.slice(0,10),p.get('from')?'start':'end'):null;
    const period = efficiencySelection?.period||(['d','w','m','c'].includes(p.get('period')) ? p.get('period') : 'm');
    const [from,to] = M.dates(period);
    return {view:Object.hasOwn(labels,view) ? view : 'home',role:Object.hasOwn(M.ROLE_LABELS,p.get('role')) ? p.get('role') : 'customer_owner',notificationCategory:notificationCategories.some(([key])=>key===p.get('notificationCategory'))?p.get('notificationCategory'):'all',serviceEquipmentId:view==='home'?'':p.get('serviceEquipmentId')||'',
      group:view==='home'?'':p.get('group')||'',type:'',q:['home','summary'].includes(view)?'':p.get('q')||'',listVehicle:view==='home'?'':p.get('listVehicle')||'',status:'all',live:view==='home'?'':p.get('live')||'',
      service:['maintenance','supplies','error'].includes(p.get('service'))?p.get('service'):'maintenance',serviceEntry:p.get('serviceEntry')||'',servicePeriod:p.get('servicePeriod')||'m',serviceFrom:p.get('serviceFrom')||M.dates('m')[0],serviceTo:p.get('serviceTo')||M.dates('m')[1],serviceFocus:['error','due','soon'].includes(p.get('serviceFocus'))?p.get('serviceFocus'):'',reportFocus:['all','waiting','unknown'].includes(p.get('reportFocus'))?p.get('reportFocus'):'all',equipmentId:p.get('equipmentId')||'',returnView:['summary','services','detail','notifications'].includes(p.get('returnView'))?p.get('returnView'):'detail',reportVehicle:view==='home'?'':p.get('reportVehicle')||'',period,from:efficiencySelection?.from||p.get('from')||from,to:efficiencySelection?.to||p.get('to')||to};
  }
  function go(view,patch={},replace=false) {
    const next = {...state,...patch,view};
    if(view==='efficiency')Object.assign(next,M.efficiencyRange(next.period,next.from||next.to||M.SNAPSHOT.slice(0,10)));
    if(view==='notifications')Object.assign(next,{group:'',q:'',live:''});
    if(!['error','maintenance','supplies'].includes(view))next.serviceEntry='';
    next.type = '';
    if (!['all','waiting','unknown'].includes(next.reportFocus)) next.reportFocus = 'all';
    if (view === 'home') Object.assign(next,{group:'',q:'',live:'',status:'all',equipmentId:'',listVehicle:'',reportVehicle:'',serviceEquipmentId:''});
    if (view === 'summary') next.q='';
    if (!replace) rangeOpen = false;
    if (next.role !== 'customer_owner') next.group = '';
    if (('role' in patch || 'group' in patch) && !M.scope(rows,next).some(v=>v.equipmentId===next.listVehicle)) next.listVehicle='';
    if (('role' in patch || 'group' in patch) && !M.scope(rows,next).some(v=>v.equipmentId===next.reportVehicle)) next.reportVehicle='';
    if (('role' in patch || 'group' in patch) && !M.scope(rows,next).some(v=>v.equipmentId===next.serviceEquipmentId)) next.serviceEquipmentId='';
    const p = new URLSearchParams();
    Object.entries(next).forEach(([k,v])=>{if(k!=='view' && v) p.set(k,v);});
    history[replace?'replaceState':'pushState']({},'',`${location.pathname}#${view}?${p}`);
    navigated = true; render();
    if (!replace) { window.scrollTo(0,0); $('#main').focus({preventScroll:true}); }
  }
  function scopeControls() {
    return state.role === 'customer_owner' ? `<label class="compact-group"><select data-control="group" aria-label="그룹"><option value="">전체 그룹</option>${[...new Set(rows.map(v=>v.group))].map(v=>`<option ${state.group===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label>` : '';
  }
  function periodState() {
    const prefix=state.view==='services'?'service':'';
    return prefix?{period:state[prefix+'Period'],from:state[prefix+'From'],to:state[prefix+'To']}:state;
  }
  function periodPatch(period,from,to) {
    const prefix=state.view==='services'?'service':'';
    return prefix?{[prefix+'Period']:period,[prefix+'From']:from,[prefix+'To']:to}:{period,from,to};
  }
  function periodControls({group=false,search=false,vehicle=false}={}) {
    const s=periodState(),linked=state.view==='efficiency',dayOnly=linked&&s.period==='d';
    const hasGroup=group&&state.role==='customer_owner';
    const shortDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.slice(5).replace('-','.'):value;
    const lookup=search?`<label class="vehicle-search compact-vehicle-search">${icon('search')}<input type="search" id="vehicle-search" value="${esc(state.q)}" placeholder="차량번호 · 기종 검색" aria-label="차량번호 · 기종 · 그룹 검색"></label>`:vehicle?vehicleControl(vehicle===true?'reportVehicle':vehicle):'';
    return `<section class="compact-filter-panel ${hasGroup?'has-group':'no-group'} ${search?'has-search':'no-search'}${vehicle?' has-report-vehicle':''}" aria-label="조회 조건">
      ${hasGroup?'<div class="compact-filter-top">'+scopeControls()+lookup+'</div>':lookup}
      <button class="compact-range-toggle" type="button" data-toggle-range aria-expanded="${rangeOpen}" aria-controls="range-form" aria-label="조회 기간 ${esc(s.from)} ~ ${esc(s.to)}, 날짜 변경">${icon('calendar-days')}<span>${esc(shortDate(s.from))}${dayOnly?'':' ~ '+esc(shortDate(s.to))}</span>${icon('chevron-down')}</button>
      <div class="period-tabs" role="group" aria-label="조회 기간">${[['d',linked?'일':'금일'],['w','주'],['m','월']].map(([key,text])=>`<button type="button" data-period="${key}" aria-pressed="${s.period===key}" class="${s.period===key?'is-active':''}">${text}</button>`).join('')}</div>
      <form class="date-range" id="range-form" ${rangeOpen?'':'hidden'}${linked?' data-linked-period="'+s.period+'"':''}><input name="from" type="date" value="${esc(s.from)}" aria-label="${dayOnly?'조회일':'조회 시작일'}" required><span ${dayOnly?'hidden':''}>~</span><input name="to" type="${dayOnly?'hidden':'date'}" value="${esc(s.to)}" aria-label="조회 종료일" required><button type="submit">조회</button></form></section>`;
  }
  const socLevel = v => v.type==='리튬'&&Number.isFinite(v.soc)&&v.soc>=0&&v.soc<=100 ? (v.soc>=60?'high':v.soc>=30?'medium':'low') : '';
  const batteryIcon = v => socLevel(v) ? `<svg class="battery-soc-icon" data-soc-level="${socLevel(v)}" xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect class="battery-soc-fill" x="4" y="9" width="12" height="6" rx="1" stroke="none"/><rect x="2" y="7" width="16" height="10" rx="2"/><path d="M22 11v2"/></svg>` : icon('battery');
  const definition = entries => `<dl class="detail-definition">${entries.map(([k,value,battery])=>`<div><dt>${esc(k)}</dt><dd>${battery&&socLevel(battery)?`<span class="battery-soc-reading">${batteryIcon(battery)}<span>${esc(value)}</span></span>`:esc(value)}</dd></div>`).join('')}</dl>`;
  function isToday() { return state.period==='d'&&state.from===M.TODAY&&state.to===state.from; }
  function periodMetrics(v) { return M.efficiencyPerformance([v],state.from,state.to,{today:isToday()}).entries[0]?.m||null; }
  function dataNote(text) { return `<details class="source-disclosure"><summary>집계 기준</summary><p class="source-note">${text}</p></details>`; }
  function shortcutRow(buttons,label,kind='status') {
    return `<div class="vehicle-card-shortcuts" style="--vehicle-shortcut-columns:${buttons.length}" role="group" aria-label="${label}" data-shortcut-kind="${kind}">${buttons.join('')}</div>`;
  }
  function alignNavigationIcons() {
    document.querySelectorAll('[data-shortcut-kind="navigation"] .vehicle-compact-shortcut').forEach(button=>{
      const label=button.querySelector('.vehicle-navigation-label');
      if(!label||!button.querySelector('.vehicle-navigation-icon > svg'))return;
      const leftGap=label.getBoundingClientRect().left-button.getBoundingClientRect().left;
      if(!Number.isFinite(leftGap)||leftGap<=0)return;
      // Absolute offsets start inside the border; keep the label's existing layout.
      button.style.setProperty('--vehicle-navigation-icon-center',Math.max(0,leftGap/2-button.clientLeft)+'px');
    });
  }
  function reportActions(v) {
    const content=(name,label)=>`<span class="vehicle-navigation-content"><span class="vehicle-navigation-icon" aria-hidden="true">${icon(name)}</span><span class="vehicle-navigation-label">${label}</span></span>`;
    return shortcutRow([
      `<button type="button" class="vehicle-compact-shortcut" data-vehicle-report="reports" data-equipment="${esc(v.equipmentId)}">${content('chart-no-axes-combined','업무 현황')}${icon('chevron-right')}</button>`,
      `<button type="button" class="vehicle-compact-shortcut" data-vehicle-report="efficiency" data-equipment="${esc(v.equipmentId)}">${content('chart-no-axes-gantt','운영효율')}${icon('chevron-right')}</button>`,
      `<button type="button" class="vehicle-compact-shortcut" data-route="shock">${content('zap','충격 상세')}${icon('chevron-right')}</button>`
    ],'차량 실적 바로가기','navigation');
  }
  function vehicleActions(v,{energy=true,shock=true,maintenance=false}={}) {
    const m=periodMetrics(v);
    const supplies=Array.isArray(v.supplies)?M.supplyItems(v):null;
    const supplyCount=supplies?.length??null;
    const dueCount=supplies?.filter(item=>item.key==='due').length||0;
    const soonCount=supplies?.filter(item=>item.key==='soon').length||0;
    const supplyState=dueCount?'due':soonCount?'soon':supplies==null||supplies.some(item=>item.key==='unknown')?'unknown':supplies.length?'normal':'empty';
    const errorCount=Number.isFinite(v.activeErrorCount)&&v.activeErrorCount>=0?v.activeErrorCount:null;
    const links=[['supplies','소모품',supplyCount,'refresh-cw'],['error','에러',errorCount,'triangle-alert']].map(([kind,label,count,iconName])=>{
      const needsAction=kind==='supplies'?dueCount>0:count>0;
      const description=label+' '+(count==null?'미수신':count+'건')+(kind==='supplies'?(dueCount?' · 교체 필요 '+dueCount+'건':'')+(soonCount?' · 교체 임박 '+soonCount+'건':''):'')+(count>0?' · 해당 차량 서비스 보기':'');
      return `<button type="button" class="vehicle-compact-shortcut is-${kind}${needsAction?' needs-action':''}${kind==='supplies'&&supplyState==='soon'?' is-soon':''}" data-slot="${kind}" ${kind==='supplies'?`data-supply-state="${supplyState}"`:''} data-service-menu="${esc(v.equipmentId)}" data-service-kind="${kind}" ${count>0?'':'disabled'} aria-label="${description}" title="${description}"><span class="vehicle-shortcut-icon">${icon(iconName)}${count>0?'<span class="vehicle-shortcut-alert" aria-hidden="true">!</span>':''}</span><span>${label}</span><strong>${count==null?'-':count}</strong></button>`;
    });
    if(maintenance)links.unshift(`<button type="button" class="vehicle-compact-shortcut" data-slot="maintenance" data-route="maintenance">${icon('clipboard-check')}<span>정비 기록</span></button>`);
    if(energy){
      const applicable=v.type!=='엔진',known=applicable&&Number.isFinite(v.soc)&&v.soc>=0&&v.soc<=100;
      const value=known?v.soc+'%':'-',label=!applicable?'배터리 잔량 · 해당 없음':(v.conn?'배터리':'마지막 잔량')+' '+(known?value:'미수신');
      links.push(`<button type="button" class="vehicle-compact-shortcut" data-slot="battery" ${applicable?`data-service-vehicle="${esc(v.equipmentId)}" data-kind="battery"`:'disabled'} aria-label="${label}" title="${label}">${batteryIcon(v)}<strong>${value}</strong></button>`);
    }
    if(shock)links.push(`<button type="button" class="vehicle-compact-shortcut" data-slot="shock" data-service-vehicle="${esc(v.equipmentId)}" data-kind="shock" aria-label="충격 ${m?fmt(m.shock,'건'):'미수신'}" title="충격">${icon('zap')}<strong>${m?fmt(m.shock,'건'):'-'}</strong></button>`);
    return shortcutRow(links,'차량 점검 및 정보');
  }
  function criteriaHeading(title,id,heading='h2') {
    return `<div class="panel-heading-with-tip"><${heading}>${title}</${heading}><button id="${id}-trigger" type="button" class="criteria-tip" data-criteria-tip="${id}" aria-label="${title} 기준 안내" aria-expanded="false" aria-controls="${id}">${icon('circle-help')}</button></div>`;
  }
  function criteriaPanel(id,content) {
    return `<div id="${id}" class="criteria-tip-panel" hidden>${content}<button type="button" class="criteria-tip-close" data-close-criteria="${id}">닫기${icon('x')}</button></div>`;
  }
  function rosterCriteria(p,{today=false,preview=false}={}) {
    return `<p class="source-note roster-criteria">${today?M.SNAPSHOT.slice(5).replace('-','.'):'조회 기간'} 기준 · 작업시간 적은 순${preview?' '+Math.min(3,p.known)+'대':''}<br>가동시간 = 작업 + 대기 · 미확인은 정렬에서 제외</p>`;
  }
  function reportRoster(scoped,p,{today=false,focus='all',limit=Infinity}={}) {
    const rowsToShow=scoped.map(v=>p.entries.find(e=>e.v.equipmentId===v.equipmentId)||{v,m:null,rate:null,idleRate:null})
      .filter(e=>focus==='unknown'?!e.m:focus==='waiting'?p.waiting.some(x=>x.v.equipmentId===e.v.equipmentId):true)
      .sort((a,b)=>(a.m?0:1)-(b.m?0:1)||(a.m?.work??0)-(b.m?.work??0)||a.v.equipmentNumber.localeCompare(b.v.equipmentNumber));
    return rowsToShow.slice(0,limit).map(({v,m})=>{
      return `<button type="button" class="performance-vehicle is-work-time" data-report-vehicle="${esc(v.equipmentId)}" ${today?'data-today="true"':''}><div><strong>${esc(v.equipmentNumber)}</strong><small>${esc(v.model)} · ${esc(v.group)}</small></div><b>${m?'<small>작업시간</small>'+shortHours(m.work):'-'}</b><p>${m?'대기 '+shortHours(m.idle)+' · 운영효율 '+rate(m.efficiency):today&&!v.conn?'통신 미연결 · 금일 작업 미확인':'선택 기간 실적 없음'}</p>${icon('chevron-right')}</button>`;
    }).join('')||'<p class="empty-state">표시 기준에 해당하는 차량이 없습니다.</p>';
  }
  function status(v) { return `<span class="status-pill ${!v.conn?'is-offline':v.operating?'':'is-idle-status'}">${!v.conn?'미연결':v.operating?'가동 중':'미가동'}</span>`; }
  function vehicleCard(v) {
    const metric=periodMetrics(v);
    return `<article class="vehicle-mobile-row ${M.attention(v)?'is-attention':''}"><button type="button" class="vehicle-card-main" data-vehicle="${esc(v.equipmentId)}"><div class="vehicle-mobile-row__head"><div><strong>${esc(v.equipmentNumber)}</strong><small>${esc(v.model)} · ${esc(v.type)} · ${esc(v.group)}</small></div>${status(v)}</div><div class="vehicle-mobile-row__meta"><span>작업시간<b>${metric?hours(metric.work):'-'}</b></span><span>대기시간<b>${metric?hours(metric.idle):'-'}</b></span><span>운행거리<b>${metric?fmt(metric.km,' km'):'-'}</b></span><span>운영효율<b>${rate(metric?.efficiency)}</b></span></div><div class="row-status"><span>${!v.conn?'마지막 수신 '+v.receivedAt.slice(5):'기간 실적 · 현재 상태는 별도'}</span><span>차량 상세 ›</span></div></button>${vehicleActions(v)}</article>`;
  }
  function home() {
    const scoped=M.scope(rows,state),c=M.counts(scoped),p=M.efficiencyPerformance(scoped,...M.dates('d'),{today:true}),owner=state.role==='customer_owner';
    return `<div data-screen-id="LQ-DASH-001"><div class="snapshot"><h1>금일 현황</h1><span title="1시간 단위 수집 · 마지막 수집 완료 구간 기준 · 한국시간">${M.hourlyWindow().label}</span></div>
      <section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('통신 · 가동 현황','connection-status-help')}<button class="panel-action" type="button" data-route="summary">요약정보${icon('chevron-right')}</button></div>${criteriaPanel('connection-status-help','<p class="source-note">통신은 전체 '+c.total+'대, 가동은 연결 '+c.connected+'대 기준입니다.</p>')}<div class="status-charts">${statusChart('통신 연결',c.connected,c.total,'connected','연결','offline','미연결','wifi')}${statusChart('차량 가동',c.running,c.connected,'running','가동','idle','미가동','activity')}</div></section>
      <section class="dashboard-kpis health-kpis" aria-label="점검 필요 차량">${['error','due','soon'].map(key=>{const {label:title,icon:ico,tone}=issueStyle(key),cls='is-'+tone;return `<button class="dashboard-kpi ${cls}" type="button" data-service-focus="${key}"><span class="dashboard-kpi__label">${icon(ico)}<span>${title}</span></span><strong>${c[key]}<span class="kpi-denominator"> / ${c.total}대</span></strong></button>`;}).join('')}</section>
      ${owner?`<section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('그룹별 작업 현황','group-work-help')}<button class="panel-action" type="button" data-today-report>리포트${icon('chevron-right')}</button></div>${criteriaPanel('group-work-help','<p class="source-note">'+metricCriteria+' 대당 시간은 실적 확인 차량의 평균입니다.</p>')}${groupPerformance(scoped,...M.dates('d'),true)}</section><section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('차량별 작업 현황','roster-help')}<button class="panel-action" type="button" data-today-report>전체보기${icon('chevron-right')}</button></div>${criteriaPanel('roster-help',rosterCriteria(p,{today:true,preview:true}))}${reportRoster(scoped.filter(v=>p.entries.some(e=>e.v.equipmentId===v.equipmentId)),p,{today:true,limit:3})}</section>`:`<section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('내 그룹 차량 현황','roster-help')}<button class="panel-action" type="button" data-today-report>업무 현황${icon('chevron-right')}</button></div>${criteriaPanel('roster-help',rosterCriteria(p,{today:true}))}${reportRoster(scoped,p,{today:true})}</section>`}
      ${dataNote('1시간 단위 수집 · 한국시간. 상단은 당일 00시부터 마지막 수집 완료 구간까지입니다. 09:59에도 완료 구간이 09시이면 09:00 기준으로 표시하며 수집 지연 시 기존 날짜와 시각을 유지합니다. 미연결 차량의 작업은 미확인으로 구분합니다.')}</div>`;
  }
  function statusChart(title,value,total,onKey,onLabel,offKey,offLabel,ico) {
    const rate=total?Math.round(value/total*100):null;
    return `<div class="status-chart"><div class="status-chart__head"><span>${icon(ico)}${title}</span><strong>${rate==null?'-':rate+'%'}</strong></div><div class="status-chart__track ${onKey==='running'?'is-running':''}" role="img" aria-label="${title} ${value}대 / ${total}대${rate==null?' · 집계 없음':''}"><span style="width:${rate||0}%"></span></div><div class="status-chart__legend"><button type="button" data-live="${onKey}"><i></i>${onLabel}<b>${value}</b></button><button type="button" data-live="${offKey}"><i class="is-muted"></i>${offLabel}<b>${total-value}</b></button></div></div>`;
  }
  function performanceBar(p) {
    return `<div class="work-track" role="img" aria-label="작업 ${hours(p.work)}, 대기 ${hours(p.idle)}, 기준시간 잔여(가정) ${hours(p.unused)}"><span class="is-work" style="width:${p.capacity?p.work/p.capacity*100:0}%"></span><span class="is-idle" style="width:${p.capacity?p.idle/p.capacity*100:0}%"></span><span class="is-unused" style="width:${p.capacity?p.unused/p.capacity*100:0}%"></span></div><div class="work-legend"><span><i class="is-work"></i>작업</span><span><i class="is-idle"></i>대기</span><span><i class="is-unused"></i>잔여(가정)</span></div>`;
  }
  function groupPerformance(scoped,from,to,today=false) {
    return [...new Set(scoped.map(v=>v.group))].map(group=>{
      const vehicles=scoped.filter(v=>v.group===group),p=M.efficiencyPerformance(vehicles,from,to,{today});
      return `<button class="group-row performance-group" type="button" data-report-group="${esc(group)}" ${today?'data-today="true"':''} aria-label="${esc(group)} 차량별 작업 현황 보기"><strong>${esc(group)}${icon('chevron-right')}</strong><b>운영효율 ${rate(p.workShare)}</b><div class="group-performance-metrics"><span>대당 작업<b>${shortHours(p.known?Math.round(p.work/p.known):null)}</b></span><span>대당 대기<b>${shortHours(p.known?Math.round(p.idle/p.known):null)}</b></span></div><small>집계 ${p.known} / ${p.total}대${p.unknown?' · 미확인 '+p.unknown+'대':''}</small></button>`;
    }).join('');
  }
  function referenceRateCriteria(today) {
    return `<p class="source-note">${metricCriteria}<br>작업 활용률 = 작업 ÷ 기준시간 × 100<br>기준시간: 수집된 과거 일자는 일 10시간, 금일은 08:00부터 마지막 수집 시각까지의 경과시간을 가정합니다. 차량별 마지막 수신 이후는 제외하며, 초과 운행은 실제 운행시간을 적용합니다.<br>근무·휴게·휴일 미반영 · 성과 판정용이 아닌 참고값</p>`;
  }
  function vehicleControl(control='reportVehicle') {
    const options=M.scope(rows,state);
    const selectedId=state[control],valid=options.some(v=>v.equipmentId===selectedId);
    return `<label class="compact-report-vehicle"><select data-control="${esc(control)}" aria-label="조회 차량"><option value="" ${!selectedId?'selected':''}>전체 차량</option>${selectedId&&!valid?'<option value="'+esc(selectedId)+'" selected disabled>조회할 수 없는 차량</option>':''}${options.map(v=>`<option value="${esc(v.equipmentId)}" ${v.equipmentId===selectedId?'selected':''}>${esc(v.equipmentNumber)} · ${esc(v.model)}</option>`).join('')}</select></label>`;
  }
  function reportScope() {
    const all=M.scope(rows,state);
    return state.reportVehicle?all.filter(v=>v.equipmentId===state.reportVehicle):all;
  }
  function reportVehicleLink(v) {
    return v?`<button type="button" class="daily-report-link report-vehicle-link" data-performance-vehicle="${esc(v.equipmentId)}" aria-label="${esc(v.equipmentNumber)} 차량 상세 보기"><span>${esc(v.equipmentNumber)} · ${esc(v.model)} · ${esc(v.group)}</span>${icon('chevron-right')}</button>`:'';
  }
  function reportScopeError() {
    return '<p class="error-note">차량을 찾을 수 없거나 조회 범위 밖의 차량입니다.</p><button type="button" class="detail-secondary-button" data-clear-report-vehicle>전체 차량으로</button>';
  }
  function individualReport(v,p,today) {
    const entry=p.entries[0],m=entry?.m;
    return `<section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('차량 운행정보','vehicle-operation-help')}<span>선택 차량 기준</span></div>${definition([['운행시간',m?hours(m.min):'-'],['운행거리',m?fmt(m.km,' km'):'-'],['충격',m?fmt(m.shock,'건'):'-'],['가동 중 대기 비중',entry?.idleRate==null?'-':entry.idleRate+'%']])}${criteriaPanel('vehicle-operation-help','<p class="source-note">대기 비중 = 대기 ÷ (작업 + 대기) × 100 · 저활용 판정 없음</p>')}${!entry?`<p class="source-note">${today&&!v.conn?'통신 미연결로 금일 작업을 확인할 수 없습니다. 과거 기간을 선택하면 이전 실적을 확인할 수 있습니다.':'선택 기간의 수신 정보가 없습니다.'}</p>`:''}</section>`;
  }
  function summary() {
    const visible=M.listed(rows,state).filter(v=>!state.listVehicle||v.equipmentId===state.listVehicle);
    return `<div data-screen-id="LQ-OPS-001"><div class="snapshot"><h1>요약정보</h1>${periodCutoff()}</div>${periodControls({group:true,vehicle:'listVehicle'})}${state.live?`<button class="clear-filter" type="button" data-clear-live>${esc(liveLabels[state.live]||state.live)} 차량${icon('x')}</button>`:''}<div class="vehicle-mobile-list">${visible.map(vehicleCard).join('')||'<p class="empty-state">조건에 맞는 차량이 없습니다.</p>'}</div>${dataNote('작업·대기·거리·운영효율·충격은 조회 기간 실적입니다. 운영효율 = 작업시간 ÷ (작업시간 + 대기시간) × 100이며, 운행시간이 0이거나 자료가 없으면 -로 표시합니다. 업무 현황의 작업 활용률과는 다른 지표입니다. 통신·가동·잔량·에러·교체 알림은 마지막 수신 기준이며, 미연결 차량의 금일 실적은 미확인으로 구분합니다. 소모품 숫자는 전체 조회 품목 수입니다. ! 표시는 교체주기 사용률 100% 이상인 교체 필요 품목이 있다는 뜻이며, 임박만 있으면 80% 이상~100% 미만 기준의 주의 색상으로 구분합니다. 품목별 상태는 소모품을 눌러 확인할 수 있습니다. 합계와 비교는 업무 현황에서 확인할 수 있습니다.')}</div>`;
  }
  function selected() { return M.scope(rows,{...state,group:'',type:''}).find(v=>v.equipmentId===state.equipmentId); }
  function vehicleHeader(v) { return `<section class="detail-hero"><div class="detail-icon">${icon('truck')}</div><div><small>${esc(v.group)} · ${esc(v.type)}</small><h1>${esc(v.equipmentNumber)}</h1><p>${esc(v.model)} · ${esc(v.companyName)}</p></div>${status(v)}</section>`; }
  function details() {
    const v=selected();
    if(!v) return '<p class="error-note">차량을 찾을 수 없거나 조회 범위 밖의 차량입니다.</p><button class="detail-secondary-button" data-route="summary">차량 목록으로</button>';
    const m=periodMetrics(v),energy=v.type==='엔진'?'엔진':'배터리';
    const latestMaintenance=M.serviceHistory([v]).find(r=>r.kind==='maintenance');
    return `<div data-screen-id="LQ-OPS-002">${vehicleHeader(v)}<section class="detail-card"><div class="dashboard-panel__head"><h2>현재 점검 상태</h2><span>${v.conn?'수신 '+v.receivedAt.slice(5):'마지막 수신 '+v.receivedAt.slice(5)}</span></div>${vehicleActions(v,{shock:false,energy:false})}</section>
      ${periodControls()}<section class="detail-card"><div class="dashboard-panel__head"><h2>조회 기간 운행</h2>${periodCutoff()}</div>${definition([['작업시간',m?hours(m.work):'-'],['대기시간',m?hours(m.idle):'-'],['운행시간',m?hours(m.min):'-'],['운행거리',m?fmt(m.km,' km'):'-'],['운영효율',rate(m?.efficiency)],['충격',m?fmt(m.shock,'건'):'-']])}${reportActions(v)}</section>
      <section class="detail-card"><div class="dashboard-panel__head"><h2>${energy} 정보</h2><span>${v.conn?'현재 수신':'마지막 수신'}</span></div>${v.type==='엔진'?definition([['평균 연료소비량',fmt(v.fc,' L/h')],['기준',M.ENERGY_MONTH+' 월간']]):definition([['종류',v.type],['잔량',rate(v.soc),v],['평균 전력소비량',fmt(v.bc,' kWh/h (월간)')],['배터리 전압',fmt(v.batteryVoltage,' V')],['배터리 용량',fmt(v.batteryCapacity,' Ah')],['수신시각',v.receivedAt]])}<p class="source-note">${energy==='엔진'?'회전수·냉각수 온도 이력 미수신':'시계열·충전 이력 미수신'}</p></section>
      <section class="detail-card"><div class="dashboard-panel__head"><h2>최근 정비</h2><button type="button" data-route="maintenance">정비 기록${icon('chevron-right')}</button></div><p class="source-note">${latestMaintenance?esc(latestMaintenance.occurredAt.slice(5,10).replace('-','.'))+' '+esc(latestMaintenance.label)+' · 처리완료':'정비 기록 없음'}</p></section>
      <section class="detail-card"><div class="dashboard-panel__head"><h2>최종 위치</h2>${v.position?'<button type="button" data-map>지도 보기 ›</button>':''}</div><p class="source-note">${v.position?esc(v.position.address)+'<br>('+v.position.lat+', '+v.position.lng+')':'위치 정보 없음'}</p></section>
      <details class="detail-card vehicle-basics"><summary>차량 기본정보 · 누적 실적${icon('chevron-down')}</summary>${definition([['기종',v.codeName],['동력',v.type],['연식',v.modelYear],['누적 운행시간',fmt(v.cumH)+' h'],['누적 운행거리',fmt(v.cumKm)+' km'],['업체',v.companyName]])}</details>
      ${dataNote(metricCriteria+' '+missingCriteria)}</div>`;
  }
  function child() {
    const v=selected(); if(!v) return details();
    const m=periodMetrics(v), kind=state.view;
    const ids={shock:'LQ-OPS-005',engine:'LQ-OPS-006',battery:'LQ-OPS-007',operation:'LQ-OPS-002-T01',supplies:'LQ-SVC-003',maintenance:'LQ-SVC-002',error:'LQ-SVC-004'};
    let content='';
    if(kind==='operation') content=definition([['운행시간',m?hours(m.min):'-'],['운행거리',m?fmt(m.km,' km'):'-'],['작업시간',m?hours(m.work):'-'],['대기시간',m?hours(m.idle):'-']]);
    if(kind==='shock') content=definition([['기간 내 충격',m?fmt(m.shock,'건'):'-']])+'<p class="source-note">충격 발생시각·강도 이력 미수신</p>';
    if(kind==='engine') content=v.type==='엔진'?definition([['평균 연료소비량 ('+M.ENERGY_MONTH+')',fmt(v.fc,' L/h')]])+'<p class="source-note">냉각수 온도·엔진 회전수 이력 미수신</p>':'<p class="empty-state">엔진 차량이 아닙니다.</p>';
    if(kind==='battery') content=v.type!=='엔진'?definition([['배터리 종류',v.type],['잔량'+(!v.conn?' (마지막 수신)':''),v.soc!=null?v.soc+'%':'-',v],['수신시각',v.receivedAt],['평균 전력소비량 ('+M.ENERGY_MONTH+')',v.bc!=null?v.bc+' kWh/h':'-'],['배터리 전압',fmt(v.batteryVoltage,' V')],['배터리 용량',fmt(v.batteryCapacity,' Ah')],['충전 예약','이용 불가']]):'<p class="empty-state">배터리 차량이 아닙니다.</p>';
    if(kind==='supplies') content=supplyToolbar()+(M.supplyItems(v).filter(r=>!state.serviceEntry||r.id===state.serviceEntry).map(supplyDetail).join('')||'<p class="empty-state">등록된 소모품이 없습니다.</p>');
    if(kind==='error') content=definition([['현재 에러',v.activeErrorCount+'건'],['에러코드 / 설명','세부 수신 데이터 없음']]);
    if(kind==='maintenance') content=M.serviceRecords([v],{kind,from:state.from,to:state.to}).map(r=>`<article class="service-record"><header><strong>${esc(r.label)}</strong><span class="status-pill">처리완료</span></header><p>유압 계통 및 소모품 점검</p><small>${esc(r.occurredAt)} · 정비 기록</small></article>`).join('')||'<p class="empty-state">해당 내역이 없습니다.</p>';
    if(state.serviceEntry&&['error','maintenance'].includes(kind)) {
      const records=kind==='supplies'?M.serviceRecords([v],{kind}):M.serviceHistory([v]);
      const entry=records.find(r=>r.id===state.serviceEntry&&r.kind===kind);
      if(!entry) content='<p class="empty-state">조회할 수 없는 내역입니다.</p>';
      else if(kind==='supplies') content=supplyDetail(entry);
      else content=definition([['차량번호',v.equipmentNumber],['항목',entry.label],['발생/정비 일시',entry.occurredAt],['상태',entry.resolved?(kind==='error'?'해제':'처리완료'):'미해제'],...(kind==='error'?[['에러코드',entry.code||'미수신'],['해제 일시',entry.resolvedAt||'미해제']]:[])])+'<p class="source-note">선택한 이력입니다.</p>';
    }
    return `<div data-screen-id="${ids[kind]}">${vehicleHeader(v)}<div class="section-heading"><h2>${labels[kind]}</h2>${['operation','shock'].includes(kind)?periodCutoff():`<small>${kind==='battery'&&!v.conn?'마지막 수신 정보':kind==='error'&&state.serviceEntry?'발생 이력':['battery','supplies','error'].includes(kind)?'현재 수신 상태':kind==='engine'?M.ENERGY_MONTH+' 월간':'기간별 정보'}</small>`}</div>${['operation','shock'].includes(kind)?periodControls():''}<section class="detail-card">${content}</section>${dataNote('운행·충격은 선택 기간 기준, 연료·전력소비량은 '+M.ENERGY_MONTH+' 현재 집계 기준입니다. 잔량·점검 알림은 마지막 수신 기준이며 수신되지 않은 숫자는 -로 표시합니다.')}<button class="detail-secondary-button" type="button" data-return>${state.returnView==='notifications'?'알림 목록으로 돌아가기':state.returnView==='summary'?'요약정보로 돌아가기':state.returnView==='services'?'서비스 목록으로 돌아가기':'차량 상세로 돌아가기'}</button></div>`;
  }
  function supplyUsage(r) {
    const valid=r.percent!=null;
    const context=!valid?'사용시간/교체주기 미수신':r.usedHours>r.cycleHours?'초과 '+fmt(r.usedHours-r.cycleHours)+' h':'교체까지 '+fmt(r.cycleHours-r.usedHours)+' h';
    return `<span class="supply-usage is-${r.key}"><span class="supply-usage-head"><span>${valid?'사용 '+fmt(r.usedHours)+' h / 주기 '+fmt(r.cycleHours)+' h':'미수신'}</span><strong>${valid?r.percent+'%':'-'}</strong></span><span class="supply-usage-track" aria-hidden="true"><span style="width:${valid?Math.min(100,Math.max(0,r.percent)):0}%"></span></span><span class="supply-usage-tail"><span>${r.label}</span><span>${context}</span></span></span>`;
  }
  function supplyDetail(r) {
    return `<article class="supply-detail">${state.role==='customer_owner'?supplyCheckbox(r):`<h3>${esc(r.name)}</h3>`}${supplyUsage(r)}${definition([['교체주기',r.cycleHours>0?fmt(r.cycleHours)+' h':'-'],['사용시간',r.usedHours!=null?fmt(r.usedHours)+' h':'-'],['최근 교체일',r.lastChangedAt||'미수신'],['수집 기준',r.occurredAt]])}</article>`;
  }
  function visibleSupplies() {
    if(state.role!=='customer_owner')return [];
    if(state.view==='services'&&state.service==='supplies'){
      const scoped=M.scope(rows,state).filter(v=>!state.serviceEquipmentId||v.equipmentId===state.serviceEquipmentId);
      return M.serviceRecords(scoped,{kind:'supplies',focus:state.serviceFocus});
    }
    if(state.view==='supplies'){const v=selected();return v?M.supplyItems(v).filter(r=>!state.serviceEntry||r.id===state.serviceEntry):[];}
    return [];
  }
  const resettable=r=>r.percent!=null&&r.usedHours>0;
  function supplyCheckbox(r) {
    const vehicle=rows.find(v=>v.equipmentId===r.equipmentId);
    return `<label class="supply-item-select"><input type="checkbox" data-supply-select="${esc(r.id)}" aria-label="${esc(r.name+' · '+vehicle.equipmentNumber+' 선택')}" ${supplySelection.has(r.id)?'checked':''} ${resettable(r)?'':'disabled'}><strong>${esc(r.name)}</strong></label>`;
  }
  function supplyToolbar() {
    if(state.role!=='customer_owner')return '';
    const items=visibleSupplies().filter(resettable),count=supplySelection.size;
    return `<div class="supply-selection-toolbar"><label class="supply-all-select"><input type="checkbox" data-supply-select-all aria-label="소모품 전체 선택" ${items.length&&count===items.length?'checked':''} ${items.length?'':'disabled'}><span>전체 선택</span></label><span id="supply-selection-count" aria-live="polite">${count}개 선택</span><button type="button" class="report-primary-action" data-open-supply-reset ${count?'':'disabled'}>교체 완료 · Reset</button></div><div class="supply-reset-result" ${supplyMessage?'':'hidden'}><p role="status">${esc(supplyMessage)}</p>${supplyUndo.length?'<button type="button" class="detail-secondary-button" data-undo-supply-reset>실행 취소</button>':''}</div>`;
  }
  function syncSupplySelection() {
    const items=visibleSupplies().filter(resettable),ids=new Set(items.map(r=>r.id));
    for(const id of supplySelection)if(!ids.has(id))supplySelection.delete(id);
    const all=$('[data-supply-select-all]'),count=$('#supply-selection-count'),button=$('[data-open-supply-reset]');
    if(all){all.checked=items.length>0&&supplySelection.size===items.length;all.indeterminate=supplySelection.size>0&&supplySelection.size<items.length;all.disabled=!items.length;}
    if(count)count.textContent=supplySelection.size+'개 선택';
    if(button)button.disabled=!supplySelection.size;
    document.querySelectorAll('[data-supply-select]').forEach(input=>{input.checked=supplySelection.has(input.dataset.supplySelect);});
  }
  function openSupplyReset() {
    syncSupplySelection();
    supplyPending=visibleSupplies().filter(r=>resettable(r)&&supplySelection.has(r.id)).map(r=>r.id);
    if(state.role!=='customer_owner'||!supplyPending.length)return;
    $('#supply-reset-count').textContent='처리 대상 '+supplyPending.length+'개';
    $('#supply-reset-items').innerHTML=visibleSupplies().filter(r=>supplyPending.includes(r.id)).map(r=>`<li>${esc(r.name)} · ${esc(rows.find(v=>v.equipmentId===r.equipmentId).equipmentNumber)}</li>`).join('');
    $('#supply-reset-confirm').textContent=supplyPending.length+'개 항목 처리';
    $('#supply-reset-dialog').showModal();$('[data-close-supply-reset]').focus();
  }
  function confirmSupplyReset() {
    const dialog=$('#supply-reset-dialog'),visible=new Set(visibleSupplies().filter(resettable).map(r=>r.id));
    if(!dialog.open||state.role!=='customer_owner'||!supplyPending.length||supplyPending.some(id=>!visible.has(id))){if(dialog.open)dialog.close();return;}
    const snapshot=M.resetSupplies(rows,state,supplyPending);
    if(!snapshot.length)return;
    supplyUndo=snapshot;supplyMessage=snapshot.length+'개 항목을 교체 완료로 처리했습니다. (시연)';
    supplySelection.clear();dialog.close();render();$('[data-open-supply-reset]')?.focus();
  }
  function services() {
    const available=M.scope(rows,state),selectedVehicle=available.find(v=>v.equipmentId===state.serviceEquipmentId);
    const scoped=state.serviceEquipmentId?available.filter(v=>v.equipmentId===state.serviceEquipmentId):available,s=periodState(),current=state.service==='supplies';
    const tabs=[['maintenance','정비','clipboard-check'],['supplies','소모품','refresh-cw'],['error','에러','triangle-alert']];
    const filtered=M.serviceRecords(scoped,{kind:state.service,from:s.from,to:s.to,focus:state.serviceFocus});
    const vehicles=scoped.filter(v=>filtered.some(r=>r.equipmentId===v.equipmentId));
    const tabCount=key=>M.serviceRecords(scoped,{kind:key,from:s.from,to:s.to,focus:key===state.service?state.serviceFocus:''}).reduce((n,r)=>n+r.count,0);
    const open=filtered.filter(r=>!r.resolved).reduce((n,r)=>n+r.count,0);
    const itemRow=r=>current?`<div class="service-item-line supply-service-item"><span class="supply-service-name">${state.role==='customer_owner'?supplyCheckbox(r):`<strong>${esc(r.name)}</strong>`}</span>${supplyUsage(r)}</div>`:`<button type="button" class="service-item-line is-state-${r.resolved?'neutral':'danger'}" data-service-vehicle="${esc(r.equipmentId)}" data-kind="${r.kind}" data-entry="${esc(r.id)}"><span>${icon(r.kind==='error'?'triangle-alert':r.kind==='supplies'?'refresh-cw':'clipboard-check')}${esc(r.label)}<small>${current?'':esc(r.occurredAt.slice(5).replace('-','.'))}</small></span><b>${current?r.count+'건':r.resolved?(r.kind==='error'?'해제':'처리완료'):'미해제'}</b>${icon('chevron-right')}</button>`;
    return `<div data-screen-id="LQ-SVC-001"><div class="snapshot">${criteriaHeading('서비스','service-help','h1')}${periodCutoff()}</div>${criteriaPanel('service-help','<p class="source-note">정비·에러 탭은 선택 기간의 발생 이력 건수, 소모품 탭은 마지막 수집 기준의 현재 품목 수입니다. 정비와 에러는 조회 기간을 공유하며 소모품에는 기간을 적용하지 않습니다. 소모품 사용률 = 사용시간 ÷ 교체주기 × 100 (정수 반올림). 100% 이상 교체 필요, 80% 이상 100% 미만 교체 임박입니다.</p>')}${scopeControls()}<div class="mobile-status-tabs service-category-tabs" role="group" aria-label="서비스 종류">${tabs.map(([key,title,ico])=>`<button type="button" data-service="${key}" aria-pressed="${state.service===key}" class="${state.service===key?'is-active':''}">${icon(ico)}<span>${title}</span><strong>${tabCount(key)}</strong></button>`).join('')}</div>
      ${current?supplyToolbar():periodControls()}
      ${state.serviceFocus||state.serviceEquipmentId?`<button type="button" class="clear-filter" data-clear-service-focus aria-label="서비스 조회 조건 해제">${state.serviceEquipmentId?esc(selectedVehicle?.equipmentNumber||'조회할 수 없는 차량'):''}${state.serviceEquipmentId&&state.serviceFocus?' · ':''}${state.serviceFocus?esc(liveLabels[state.serviceFocus])+(state.serviceEquipmentId?'':' 차량'):''}${icon('x')}</button>`:''}
      <p class="source-note service-scope-note">${current?'현재':'기간 내'} ${vehicles.length}대 · ${filtered.reduce((n,r)=>n+r.count,0)}${current?'품목':'건'}${state.service==='error'?' · 미해제 '+open+'건':current?' · 교체 필요 '+filtered.filter(r=>r.key==='due').reduce((n,r)=>n+r.count,0)+'건 · 임박 '+filtered.filter(r=>r.key==='soon').reduce((n,r)=>n+r.count,0)+'건':''}</p>
      <div class="vehicle-mobile-list">${vehicles.map(v=>`<article class="service-mobile-row" data-service-card="${esc(v.equipmentId)}"><div class="service-mobile-row__head"><button type="button" class="vehicle-card-main" data-vehicle="${esc(v.equipmentId)}"><strong>${esc(v.equipmentNumber)}</strong><small>${esc(v.model)} · ${esc(v.group)}</small></button>${current?status(v):''}</div>${filtered.filter(r=>r.equipmentId===v.equipmentId).map(itemRow).join('')}</article>`).join('')||'<p class="empty-state">해당 내역이 없습니다.</p>'}</div>
      ${dataNote(current?'소모품은 차량별 마지막 수신 시점의 상태입니다. 미연결 차량은 최신 상태가 아닐 수 있습니다.':'발생 건수와 해당 이력의 현재 처리 상태를 구분합니다. '+reportNote())}</div>`;
  }
  function notifications() {
    const items=M.pushHistory(M.scope(rows,{...state,group:''}));
    const counts=Object.fromEntries(notificationCategories.map(([key])=>[key,key==='all'?items.length:items.filter(item=>notificationCategory(item)===key).length]));
    const categories=notificationCategories.filter(([key])=>key!=='other'||counts.other||state.notificationCategory==='other');
    const selected=state.notificationCategory,filtered=selected==='all'?items:items.filter(item=>notificationCategory(item)===selected);
    const tabs=`<div class="mobile-status-tabs push-category-tabs" role="group" aria-label="알림 유형">${categories.map(([key,label])=>`<button type="button" data-notification-category="${key}" class="${selected===key?'is-active':''}" aria-pressed="${selected===key}" aria-controls="push-history-list" aria-label="${label} 알림 ${counts[key]}건"><span>${label}</span><strong>${counts[key]}</strong></button>`).join('')}</div>`;
    return `<div data-screen-id="LQ-COM-004"><div class="snapshot"><h1>알림 내역</h1></div>${tabs}<div id="push-history-list" class="notification-history-list push-history" aria-live="polite">${filtered.map(item=>{
      const type=M.pushPresentation(item),tag=type.view?'button':'article';
      return `<${tag} ${type.view?`type="button" data-notification-entry="${esc(item.id)}"`:''} class="notification-history-item push-history-item">${icon(type.icon)}<span class="notification-history-copy"><span class="push-history-heading"><strong>${esc(type.label)}</strong>${type.view?icon('chevron-right'):''}</span><span class="push-history-message">${esc(item.message)}</span><time class="push-history-date" datetime="${esc(String(item.pushDatetime).replace(' ','T'))}">${esc(item.pushDatetime)}</time></span></${tag}>`;
    }).join('')||(items.length?'<p class="empty-state">해당 유형의 알림이 없습니다.</p>':'<div class="push-history-empty"><p class="empty-state">PUSH 내역이 없습니다.</p><button class="detail-secondary-button" type="button" data-route="settings">PUSH 서비스 설정</button></div>')}</div></div>`;
  }
  function reportTabs() { return `<div class="mobile-status-tabs report-tabs" role="group" aria-label="리포트 메뉴"><button type="button" data-route="reports" class="${state.view==='reports'?'is-active':''}" aria-pressed="${state.view==='reports'}">${icon('chart-no-axes-combined')}<span>업무 현황</span></button><button type="button" data-route="efficiency" class="${state.view==='efficiency'?'is-active':''}" aria-pressed="${state.view==='efficiency'}">${icon('chart-no-axes-gantt')}<span>운영효율</span></button></div>`; }
  function reportNote(today) {return '조회 기간 중 차량별 마지막 수신일까지의 실적입니다. 미연결 차량의 과거 실적은 유지하며 미수집 날짜는 0이 아닌 미집계로 구분합니다.';}
  function reports() {
    const scoped=reportScope(),vehicle=state.reportVehicle?scoped[0]:null,today=isToday(),p=M.efficiencyPerformance(scoped,state.from,state.to,{today});
    if(state.reportVehicle&&!vehicle) return `<div data-screen-id="LQ-RPT-001"><div class="snapshot"><h1>업무 리포트</h1>${periodCutoff()}</div>${reportTabs()}${periodControls({group:true,vehicle:true})}${reportScopeError()}</div>`;
    const values=p.entries.map(e=>e.m),sum=k=>values.every(m=>Number.isFinite(m[k]))?values.reduce((n,m)=>n+m[k],0):null;
    const focusTabs=[['all','전체',p.total],['waiting','긴 대기',p.waiting.length],['unknown','미확인',p.unknown]];
    return `<div data-screen-id="LQ-RPT-001"><div class="snapshot"><h1>업무 리포트</h1>${periodCutoff()}</div>${reportTabs()}${periodControls({group:true,vehicle:true})}
      <section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading(vehicle?'차량 작업 현황':today?'오늘의 작업 현황':'기간 작업 현황','report-work-help')}<span>집계 ${p.known} / ${p.total}대</span></div>${criteriaPanel('report-work-help',referenceRateCriteria(today))}${reportVehicleLink(vehicle)}${p.known?`<div class="summary-totals report-key-metrics"><span>운영효율<strong>${rate(p.workShare)}</strong></span><span>작업시간<strong>${hours(p.work)}</strong></span><span>대기시간<strong>${hours(p.idle)}</strong></span></div>${performanceBar(p)}`: '<p class="empty-state">선택 범위의 집계 정보가 없습니다.</p>'}${today&&p.unknown?'<p class="source-note">통신 미연결 '+p.unknown+'대는 작업 미확인입니다.</p>':''}</section>
      ${!vehicle?`<details class="detail-card vehicle-basics"><summary>기간 합계 · 대당 평균${icon('chevron-down')}</summary>${definition([['운행시간',p.known?hours(sum('min')):'-'],['운행거리',p.known?fmt(sum('km')==null?null:Math.round(sum('km')*10)/10,' km'):'-'],['충격',p.known?fmt(sum('shock'),'건'):'-'],['대당 작업시간',p.known?hours(Math.round(p.work/p.known)):'-'],['운영효율',p.workShare==null?'-':p.workShare+'%'],['기준시간 잔여(가정)',p.known?hours(p.unused):'-']])}</details>`:''}
      ${!vehicle&&state.role==='customer_owner'&&new Set(scoped.map(v=>v.group)).size>1?`<section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('그룹별 작업 현황','report-group-help')}<span>대당 실적</span></div>${criteriaPanel('report-group-help','<p class="source-note">'+metricCriteria+' 대당 시간은 실적 확인 차량의 평균입니다.</p>')}${groupPerformance(scoped,state.from,state.to,today)}</section>`:''}
      ${vehicle?individualReport(vehicle,p,today):`<section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('차량별 작업 현황','roster-help')}<span>작업시간</span></div><div class="mobile-status-tabs report-focus-tabs" role="group" aria-label="차량 확인 기준">${focusTabs.map(([key,label,n])=>`<button type="button" data-report-focus="${key}" aria-pressed="${state.reportFocus===key}" class="${state.reportFocus===key?'is-active':''}"><span>${label}</span><strong>${n}</strong></button>`).join('')}</div>${criteriaPanel('roster-help',rosterCriteria(p,{today})+'<p class="source-note">긴 대기: 대기 비중 30% 이상이면서 대기 30분 이상 (임시 조회 조건)</p>')}${reportRoster(scoped,p,{today,focus:state.reportFocus})}</section>`}
      <button type="button" class="report-primary-action" data-efficiency>${icon('chart-no-axes-gantt')}월간 운영효율 보기${icon('chevron-right')}</button>
      ${dataNote(reportNote(today)+' 차량별 목록은 작업시간이 적은 순이며, 미확인은 뒤에 별도 표시합니다. 긴 대기는 표시된 임시 조회 조건이며 성과 판정이 아닙니다. 작업 활용률=작업÷기준시간, 운영효율=작업÷운행시간. 근무·휴게·휴무·배차는 현재 미연동이며 개인 근태/성과 평가가 아닙니다.')}</div>`;
  }
  function efficiency() {
    const scoped=reportScope(),vehicle=state.reportVehicle?scoped[0]:null,today=isToday(),days=M.efficiencyCalendar(scoped,state.period,state.from,state.to,{today}).filter(d=>d.date<=M.TODAY),p=M.efficiencyPerformance(scoped,state.from,state.to,{today});
    if(state.reportVehicle&&!vehicle) return `<div data-screen-id="LQ-REF-003"><div class="snapshot"><h1>운영효율</h1>${periodCutoff()}</div>${reportTabs()}${periodControls({group:true,vehicle:true})}${reportScopeError()}</div>`;
    const efficiencyScopeCriteria='선택한 전체·그룹·차량과 조회 기간의 정보입니다. 작업·대기·잔여 시간은 해당 범위에서 실적이 확인된 차량의 대당 평균이며, 차량 1대를 선택하면 그 차량의 시간입니다. 기간 값은 기간 누적 시간의 평균, 날짜별 값은 그날 실적의 평균입니다. 운영효율(%) = 선택 차량의 합산 작업시간 ÷ 합산 운행시간(작업+대기) × 100으로, 차량별 퍼센트의 단순 평균이 아닙니다. 미확인 차량은 평균 계산에서 제외합니다.';
    const weekday=date=>['일','월','화','수','목','금','토'][new Date(date+'T12:00:00+09:00').getUTCDay()];
    const daily=days.map(d=>{
      const date=`<span class="efficiency-date">${d.date.slice(-2)}<small>${weekday(d.date)}</small></span>`;
      if(!d.known)return `<div class="efficiency-day" data-date="${d.date}"><div class="efficiency-day-uncollected" aria-label="${d.date} 미집계">${date}<span>미집계</span><strong>-</strong></div></div>`;
      return `<details class="efficiency-day" data-date="${d.date}"><summary aria-label="${d.date} 운영효율 ${rate(d.workShare)}, 작업 ${hours(Math.round(d.work/d.known))}, 대기 ${hours(Math.round(d.idle/d.known))}, 상세 펼치기">${date}<div class="work-track" aria-hidden="true"><span class="is-work" style="width:${d.capacity?d.work/d.capacity*100:0}%"></span><span class="is-idle" style="width:${d.capacity?d.idle/d.capacity*100:0}%"></span><span class="is-unused" style="width:${d.capacity?d.unused/d.capacity*100:0}%"></span></div><strong><span>작업 ${shortHours(Math.round(d.work/d.known))}<small>대기 ${shortHours(Math.round(d.idle/d.known))}</small></span>${icon('chevron-down')}</strong></summary><div class="efficiency-day__detail">${definition([['운영효율',rate(d.workShare)],['작업시간',hours(Math.round(d.work/d.known))],['대기시간',hours(Math.round(d.idle/d.known))],['실적 확인',d.known+' / '+d.total+'대'],['작업 활용률 (가정)',rate(d.rate)],['기준시간 잔여 (가정)',hours(Math.round(d.unused/d.known))]])}<button type="button" class="daily-report-link" data-report-day="${d.date}">이 날짜 업무 리포트${icon('chevron-right')}</button></div></details>`;
    }).join('');
    return `<div data-screen-id="LQ-REF-003"><div class="snapshot"><h1>운영효율</h1>${periodCutoff()}</div>${reportTabs()}${periodControls({group:true,vehicle:true})}<section class="dashboard-panel"><div class="dashboard-panel__head">${criteriaHeading('기간 운영효율','efficiency-help')}<span>집계 ${p.known} / ${p.total}대</span></div>${criteriaPanel('efficiency-help',referenceRateCriteria(today)+'<p class="source-note">'+efficiencyScopeCriteria+'</p>')}${reportVehicleLink(vehicle)}${!p.known?'<p class="empty-state">집계 정보가 없습니다.</p>':''}<div class="summary-totals"><span>운영효율<strong>${rate(p.workShare)}</strong></span><span>작업시간<strong>${shortHours(p.known?Math.round(p.work/p.known):null)}</strong></span><span>대기시간<strong>${shortHours(p.known?Math.round(p.idle/p.known):null)}</strong></span></div></section>
      <section class="dashboard-panel efficiency-panel"><div class="dashboard-panel__head">${criteriaHeading('일별 운영 현황','daily-efficiency-help')}<span>${days.length}일</span></div>${criteriaPanel('daily-efficiency-help','<p class="source-note">'+efficiencyScopeCriteria+' 막대의 %는 가정 기준시간 대비 작업·대기·잔여 비중이며 운영효율과는 다릅니다. h는 시간, m은 분입니다. 날짜를 누르면 운영효율과 상세 시간을 확인합니다. 오늘 이후 날짜는 목록에 표시하지 않습니다.</p>')}<div class="work-legend"><span><i class="is-work"></i>작업</span><span><i class="is-idle"></i>대기</span><span><i class="is-unused"></i>잔여(가정)</span></div><div class="efficiency-axis" aria-hidden="true"><span>일자</span><span>0<span>50</span>100%</span><span>시간</span></div><div class="efficiency-daily-list">${daily||'<p class="empty-state">조회 기간에 표시할 날짜가 없습니다.</p>'}</div></section>${dataNote(reportNote(today)+' '+missingCriteria)}</div>`;
  }
  function account() {return `<section class="detail-card" data-screen-id="LQ-ACC-001"><h2>내 정보</h2>${definition([['이름','김사용'],['구분',M.ROLE_LABELS[state.role]],['소속 업체','(주)세종물류중부지점'],['조회 범위',state.role==='customer_owner'?'소속 업체 전체 차량':'기본그룹 배정 차량'],['이메일','customer@example.com']])}</section>`;}
  function settings() {
    const preferences=pushPreferences[state.role];
    const toggle=(key,label,disabled=false)=>`<label class="setting-row"><span><strong>${label}</strong></span><input type="checkbox" data-push-setting="${key}" ${preferences[key]?'checked':''} ${disabled?'disabled':''}><i aria-hidden="true"></i></label>`;
    return `<h1>설정</h1>${account()}<section class="settings-group"><h2>권한 화면 확인</h2><label class="select-row"><span><strong>조회 역할</strong><small>화면 확인용</small></span><select data-control="role" aria-label="조회 역할">${Object.entries(M.ROLE_LABELS).map(([key,label])=>`<option value="${key}" ${state.role===key?'selected':''}>${label}</option>`).join('')}</select></label></section>
      <section class="settings-group"><div class="dashboard-panel__head settings-panel-head">${criteriaHeading('PUSH 알림','push-settings-help')}</div>${criteriaPanel('push-settings-help','<p class="source-note">PUSH 전체를 끄면 하위 항목도 모두 꺼집니다. 다시 켠 뒤 받을 항목을 선택해 주세요. 공지사항/마케팅 알림은 별도 선택 항목입니다. 알림 내역은 발생 이력이며 PUSH 수신 설정과 구분됩니다. 현재 선택은 이 화면을 연 동안에만 유지되며 실제 기기 알림 권한이나 서버 수신 설정은 변경하지 않습니다.</p>')}${toggle('pushAlarmYn','PUSH 알림 받기')}${pushFields.map(([key,label])=>toggle(key,label,!preferences.pushAlarmYn)).join('')}</section>
      <section class="settings-group"><h2>계정 메뉴</h2><button type="button" class="settings-link-row settings-logout" data-logout><span><strong>로그아웃</strong></span>${icon('log-out')}</button></section>`;
  }
  function render() {
    state=readState();
    const nextSupplyContext=JSON.stringify([state.view,state.service,state.role,state.group,state.serviceEquipmentId,state.equipmentId,state.serviceEntry,state.serviceFocus]);
    if(supplyContext!==nextSupplyContext){supplySelection.clear();supplyPending=[];supplyUndo=[];supplyMessage='';supplyContext=nextSupplyContext;if($('#supply-reset-dialog')?.open)$('#supply-reset-dialog').close();}
    if(state.view==='efficiency'){
      const query=new URLSearchParams(location.hash.split('?')[1]||'');
      if(['period','from','to'].some(key=>query.get(key)!==state[key])){
        ['period','from','to'].forEach(key=>query.set(key,state[key]));
        history.replaceState({},'',location.pathname+location.search+'#efficiency?'+query);
      }
    }
    const fn={home,summary,detail:details,services,notifications,reports,efficiency,account:settings,settings}[state.view]||child;
    $('#main').innerHTML=fn();
    syncSupplySelection();
    const homeView=state.view==='home'; $('#brand').hidden=!homeView; $('#header-title').hidden=homeView;
    $('#header-title').textContent=labels[state.view]; $('[data-back]').hidden=homeView;
    const unread=M.unreadPushCount(state.role),hasUnread=Number.isInteger(unread)&&unread>0; $('#notification-count').textContent=hasUnread?unread:'';
    $('.header-button').setAttribute('aria-label',hasUnread?`읽지 않은 PUSH 알림 ${unread}건 열기`:'알림 내역 열기');
    $('#notification-count').hidden=!hasUnread;
    const activeRoute=state.view==='notifications'||state.returnView==='notifications'&&['error','supplies','shock','battery','maintenance','engine','operation'].includes(state.view)?'':['reports','efficiency'].includes(state.view)?'reports':['settings','account'].includes(state.view)?'settings':['home','summary','services'].includes(state.view)?state.view:state.view!=='detail'&&state.returnView==='services'?'services':'summary';
    document.querySelectorAll('.bottom-nav [data-route]').forEach(b=>{const active=b.dataset.route===activeRoute;b.classList.toggle('is-active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    document.title=`${labels[state.view]} · MACHINE IQ`;
    window.lucide?.createIcons({attrs:{'stroke-width':2}});
    alignNavigationIcons();
  }
  function setLocationMapExpanded(expanded) {
    $('#location-dialog').classList.toggle('is-map-expanded',expanded);
    const button=$('#location-map-expand'),label=expanded?'지도 원래 크기로':'지도 전체보기';
    button.setAttribute('aria-expanded',String(expanded));button.setAttribute('aria-label',label);button.title=label;
    $('#location-map-expand-label').textContent=expanded?'접기':'전체보기';
    window.CustomerLocationMap.resize();
  }
  function openLocationDialog() {
    const v=selected(),p=v?.position;
    if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng)||Math.abs(p.lat)>90||Math.abs(p.lng)>180)return;
    setLocationMapExpanded(false);
    $('#location-dialog-title').textContent=v.equipmentNumber;
    $('#location-dialog-address').textContent=p.address||'정보 없음';
    const cell=(label,value,wide=false)=>'<div'+(wide?' class="is-wide"':'')+'><dt>'+label+'</dt><dd>'+esc(value??'정보 없음')+'</dd></div>';
    const m=periodMetrics(v);
    $('#location-dialog-info').innerHTML=cell('기종',v.model)
      +'<div><dt>상태</dt><dd><span class="status-pill '+(M.attention(v)?'is-danger':'')+'">'+(M.attention(v)?'확인 필요':'정상')+'</span></dd></div>'
      +cell('소속 그룹',v.group)+cell('통신 상태',v.conn?'연결':'미연결')
      +cell('총 가동시간',Number.isFinite(v.cumH)?fmt(v.cumH)+'H':'정보 없음')
      +cell('자료일 가동시간',m?hours(m.min)+' ('+state.from+' ~ '+state.to+')':'정보 없음')
      +cell('위치 기준 시간',v.receivedAt,true);
    $('#location-dialog-coordinate').textContent='('+p.lat.toFixed(6)+', '+p.lng.toFixed(6)+')';
    $('#location-dialog').showModal();
    $('#location-dialog-body').scrollTop=0;
    window.CustomerLocationMap.open({lat:p.lat,lng:p.lng,equipmentNumber:v.equipmentNumber});
  }
  document.addEventListener('click',e=>{
    if(e.target===$('#supply-reset-dialog')){$('#supply-reset-dialog').close();return;}
    if(e.target===$('#location-dialog')){ $('#location-dialog').close();return; }
    const b=e.target.closest('button'); if(!b)return;
    if(b.hasAttribute('data-close-supply-reset'))return $('#supply-reset-dialog').close();
    if(b.hasAttribute('data-open-supply-reset'))return openSupplyReset();
    if(b.hasAttribute('data-confirm-supply-reset'))return confirmSupplyReset();
    if(b.hasAttribute('data-undo-supply-reset')){
      if(M.undoSupplyReset(rows,state,supplyUndo)){supplyUndo=[];supplyMessage='교체 완료 처리를 취소했습니다.';render();$('[data-open-supply-reset]')?.focus();}return;
    }
    if(b.hasAttribute('data-logout')) {
      sessionStorage.removeItem('linq-customer-prototype-authenticated-role');
      window.location.replace('./login.html?role='+(state.role==='customer_staff'?'customer_staff':'customer_owner'));
      return;
    }
    if(b.dataset.notificationCategory) {
      if(!notificationCategories.some(([key])=>key===b.dataset.notificationCategory))return;
      go('notifications',{notificationCategory:b.dataset.notificationCategory},true);
      $('[data-notification-category="'+state.notificationCategory+'"]').focus();return;
    }
    if(b.hasAttribute('data-criteria-tip')) {
      const panel=$('#'+b.dataset.criteriaTip); if(!panel)return; panel.hidden=!panel.hidden;
      b.setAttribute('aria-expanded',String(!panel.hidden)); return;
    }
    if(b.hasAttribute('data-close-criteria')) {
      const panel=$('#'+b.dataset.closeCriteria),trigger=$('#'+b.dataset.closeCriteria+'-trigger');
      if(panel)panel.hidden=true;
      if(trigger){trigger.setAttribute('aria-expanded','false'); trigger.focus();} return;
    }
    if(b.hasAttribute('data-back')) return navigated?history.back():go('home');
    if(b.hasAttribute('data-return')) return go(state.returnView);
    if(b.hasAttribute('data-toggle-range')) {rangeOpen=!rangeOpen;render();$('[data-toggle-range]').focus();return;}
    if(b.hasAttribute('data-efficiency')) return go('efficiency',M.efficiencyRange('m',state.from||M.SNAPSHOT.slice(0,10)));
    if(b.hasAttribute('data-clear-report-vehicle')) return go(state.view,{reportVehicle:''},true);
    if(b.hasAttribute('data-today-report')) return go('reports',{period:'d',from:M.TODAY,to:M.TODAY,reportFocus:b.dataset.focus||'all',reportVehicle:''});
    if(b.dataset.vehicleReport) return go(b.dataset.vehicleReport,{reportVehicle:b.dataset.equipment,group:state.role==='customer_owner'?(selected()?.group||state.group):'',q:'',live:''});
    if(b.dataset.reportVehicle) return go('reports',{reportVehicle:b.dataset.reportVehicle,...(b.dataset.today?{period:'d',from:M.TODAY,to:M.TODAY}:{})});
    if(b.dataset.serviceFocus) return go('services',{service:b.dataset.serviceFocus==='error'?'error':'supplies',serviceEquipmentId:'',serviceFocus:b.dataset.serviceFocus,q:'',live:'',...(b.dataset.serviceFocus==='error'?{servicePeriod:'d',serviceFrom:M.SNAPSHOT.slice(0,10),serviceTo:M.SNAPSHOT.slice(0,10)}:{})});
    if(b.hasAttribute('data-clear-service-focus')) return go('services',{serviceFocus:'',serviceEquipmentId:''},true);
    if(b.dataset.serviceMenu) {
      const vehicle=M.scope(rows,state).find(v=>v.equipmentId===b.dataset.serviceMenu);
      const kind=b.dataset.serviceKind;
      if(!vehicle||!['supplies','error'].includes(kind)||(kind==='error'?!vehicle.activeErrorCount:!M.supplyItems(vehicle).length))return;
      return go('services',{service:kind,serviceEquipmentId:vehicle.equipmentId,serviceFocus:kind==='error'?'error':'',q:'',live:'',...(kind==='error'?{servicePeriod:'d',serviceFrom:M.SNAPSHOT.slice(0,10),serviceTo:M.SNAPSHOT.slice(0,10)}:{})});
    }
    if(b.dataset.reportGroup) return go('reports',{group:b.dataset.reportGroup,reportVehicle:'',reportFocus:'all',...(b.dataset.today?{period:'d',from:M.TODAY,to:M.TODAY}:{})});
    if(b.dataset.reportDay) return go('reports',{period:'c',from:b.dataset.reportDay,to:b.dataset.reportDay});
    if(b.dataset.reportFocus) return go('reports',{reportFocus:b.dataset.reportFocus},true);
    if(b.dataset.performanceVehicle) return go('detail',{equipmentId:b.dataset.performanceVehicle,...(b.dataset.today?{period:'d',from:M.TODAY,to:M.TODAY}:{})});
    if(b.dataset.route) return go(b.dataset.route,b.dataset.route==='services'?{service:'maintenance',serviceFocus:'',serviceEquipmentId:''}:state.view==='detail'?{returnView:'detail'}:{});
    if(b.dataset.vehicle) return go('detail',{equipmentId:b.dataset.vehicle});
    if(b.dataset.serviceVehicle) return go(b.dataset.kind,{equipmentId:b.dataset.serviceVehicle,serviceEntry:b.dataset.entry||'',returnView:state.view==='summary'?'summary':state.view==='services'?'services':'detail'});
    if(b.dataset.live) return go('summary',{live:b.dataset.live,status:'all',q:''});
    if(b.dataset.group) return go('summary',{group:b.dataset.group,status:'all',q:'',live:''});
    if(b.hasAttribute('data-clear-live')) return go('summary',{live:''});
    if(b.dataset.notificationEntry) {
      const entry=M.pushHistory(M.scope(rows,{...state,group:''})).find(r=>r.id===b.dataset.notificationEntry);
      const view=entry&&M.pushPresentation(entry).view;
      if(view)return go(view,{equipmentId:entry.equipmentId,serviceEntry:'',returnView:'notifications',group:''});
      return;
      return;
    }
    if(b.dataset.service) return go('services',{service:b.dataset.service,serviceFocus:''},true);
    if(b.dataset.period) { rangeOpen=false;if(state.view==='efficiency')return go('efficiency',M.efficiencyRange(b.dataset.period,M.SNAPSHOT.slice(0,10),'end'),true);const [from,to]=M.dates(b.dataset.period);return go(state.view,periodPatch(b.dataset.period,from,to),true); }
    if(b.hasAttribute('data-map')) return openLocationDialog();
    if(b.hasAttribute('data-close-map')) return $('#location-dialog').close();
    if(b.hasAttribute('data-expand-map')) return setLocationMapExpanded(!$('#location-dialog').classList.contains('is-map-expanded'));
  });
  document.addEventListener('change',e=>{
    if(e.target.dataset.supplySelect||e.target.hasAttribute?.('data-supply-select-all')){
      const items=visibleSupplies().filter(resettable);
      if(state.role!=='customer_owner')return;
      if(e.target.hasAttribute?.('data-supply-select-all')){supplySelection.clear();if(e.target.checked)items.forEach(r=>supplySelection.add(r.id));}
      else if(items.some(r=>r.id===e.target.dataset.supplySelect)){if(e.target.checked)supplySelection.add(e.target.dataset.supplySelect);else supplySelection.delete(e.target.dataset.supplySelect);}
      syncSupplySelection();return;
    }
    if(['settings','account'].includes(state.view)&&e.target.dataset.pushSetting){
      const key=e.target.dataset.pushSetting,preferences=pushPreferences[state.role];
      if(!Object.hasOwn(preferences,key)||(key!=='pushAlarmYn'&&!preferences.pushAlarmYn))return;
      preferences[key]=Boolean(e.target.checked);
      if(key==='pushAlarmYn'&&!preferences.pushAlarmYn)pushFields.forEach(([field])=>{preferences[field]=false;});
      render();$('[data-push-setting="'+key+'"]').focus();return;
    }
    if(state.view==='efficiency'&&e.target.form?.id==='range-form'){
      if(!M.calendarDate(e.target.value))return;
      const range=M.efficiencyRange(state.period,e.target.value,e.target.name==='to'?'end':'start');
      e.target.form.querySelector('[name="from"]').value=range.from;
      e.target.form.querySelector('[name="to"]').value=range.to;
      return;
    }
    if(e.target.dataset.control)go(state.view,{[e.target.dataset.control]:e.target.value,status:'all',live:'',equipmentId:'',...(e.target.dataset.control==='role'?{serviceFocus:''}:{})},true);});
  document.addEventListener('input',e=>{if(e.target.closest('#range-form'))e.target.form.querySelectorAll('input').forEach(input=>input.setCustomValidity(''));if(e.target.id==='vehicle-search'&&!e.isComposing){const value=e.target.value;go('summary',{q:value},true);$('#vehicle-search').focus();}});
  document.addEventListener('compositionend',e=>{if(e.target.id==='vehicle-search'){go('summary',{q:e.target.value},true);$('#vehicle-search').focus();}});
  document.addEventListener('submit',e=>{if(e.target.id==='range-form'){e.preventDefault();const fd=new FormData(e.target);const from=fd.get('from'),to=fd.get('to');if(state.view==='efficiency'){if(!M.calendarDate(from)||!M.calendarDate(to)){e.target.querySelector('input').setCustomValidity('올바른 조회 날짜를 입력해 주세요.');e.target.reportValidity();return;}rangeOpen=false;go('efficiency',M.efficiencyRange(state.period,from),true);return;}if(from>to){e.target.querySelector('input').setCustomValidity('시작일은 종료일보다 늦을 수 없습니다.');e.target.reportValidity();return;}rangeOpen=false;go(state.view,periodPatch('c',from,to),true);}});
  document.addEventListener('cancel',event=>{
    if(event.target===$('#location-dialog')&&event.target.classList.contains('is-map-expanded')){
      event.preventDefault();setLocationMapExpanded(false);$('#location-map-expand').focus();
    }
  },true);
  document.addEventListener('close',event=>{
    if(event.target===$('#supply-reset-dialog')){supplyPending=[];$('[data-open-supply-reset]')?.focus();}
    if(event.target===$('#location-dialog')){window.CustomerLocationMap.close();setLocationMapExpanded(false);$('[data-map]')?.focus();}
  },true);
  window.addEventListener('popstate',()=>{rangeOpen=false;render();});
  window.addEventListener('resize',alignNavigationIcons);
  document.fonts?.ready.then(alignNavigationIcons);
  render();
})();
