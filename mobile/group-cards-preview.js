/* r82: adopted home cards with separate, group-scoped metric destinations. */
(function (root, factory) {
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else api.mount(root,document);
})(typeof window==='undefined'?null:window,()=>{
  'use strict';
  function summarize(M,vehicles,through=M.SNAPSHOT) {
    const period=M.web.meeting.hourlyWindow(new Date(through.replace(' ','T')+':00+09:00'));
    const entries=vehicles.filter(v=>v.conn===true).map(v=>({v,live:M.web.meeting.hourlyVehicle(v,period)}));
    const times=entries.map(e=>M.web.times(e.v,e.live.runH*60));
    const work=times.length?times.reduce((n,t)=>n+t.working,0):null;
    const idle=times.length?times.reduce((n,t)=>n+t.idle,0):null;
    const count=entries.length;
    const running=entries.filter(e=>e.live.running).length;
    const supplies=M.currentSupplies(vehicles);
    // Use the same occurrence window and deduplication as the top dashboard KPI.
    // Include resolved occurrences and all scoped vehicles, including offline vehicles.
    const errors=M.dashboardErrors(vehicles,{from:period.date,to:period.date,through}).length;
    return {total:vehicles.length,known:count,offline:vehicles.length-count,running,stopped:count-running,
      work,idle,workPer:count&&work!=null?work/count:null,idlePer:count&&idle!=null?idle/count:null,
      idleRate:work+idle>0?idle/(work+idle)*100:null,errors,
      due:supplies.filter(i=>i.key==='due').length,soon:supplies.filter(i=>i.key==='soon').length};
  }
  function mount(root,document) {
    if(!document.body.classList.contains('customer-group-cards-preview'))return;
    const main=document.querySelector('#main'),M=root.CustomerPrototype,fleet=root.MIQ_MOCK_DATA?.fleet;
    if(!main||!M||!fleet)return;
    const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const number=M.DISPLAY.number;
    function enhanceGroupCards() {
      const pending=[...main.querySelectorAll('[data-screen-id="LQ-DASH-001"] .performance-group')].filter(card=>card.dataset.groupCardPreview!=='ready');
      if(!pending.length)return;
      // Reuse the shared adapter so current supply edits and error records remain in sync.
      const rows=M.buildVehicles(fleet);
      const params=new URLSearchParams(root.location.search);
      new URLSearchParams(root.location.hash.split('?')[1]||'').forEach((v,k)=>params.set(k,v));
      const requested=params.get('role'),role=Object.hasOwn(M.ROLE_LABELS,requested)?requested:params.has('role')?'customer_staff':'customer_owner';
      pending.forEach(original=>{
        const group=original.dataset.reportGroup;
        if(!group)return;
        // A card is a container, not a button: its actions must not nest or bubble
        // into the former whole-card report destination.
        const card=document.createElement('article');
        card.className=original.className;
        card.dataset.cardGroup=group;
        card.setAttribute('aria-label',group+' 작업 현황');
        const allowed=M.scope(rows,{role,group,type:params.get('type')||''});
        const values=summarize(M,allowed.filter(v=>v.group===group));
        const duration=value=>{
          const minutes=Number.isFinite(value)?Math.round(value):null;
          return minutes==null?'<b>-</b>':`<b>${Math.floor(minutes/60)}</b><small>h</small><b>${minutes%60}</b><small>m</small>`;
        };
        const groupAttr=`data-scope-group="${esc(group)}"`;
        const reportAttr=`data-report-group="${esc(group)}" data-today="true"`;
        const issue=(key,label,value,unit)=>`<button type="button" class="group-card-action group-card-issue${value===0?' is-zero':''}" data-group-metric="${key}" data-service-focus="${key}" ${groupAttr} aria-label="${esc(group)} ${label} ${number(value)}${unit} 보기"><span class="group-card-label">${label}</span><span class="group-card-number"><b>${number(value)}</b><small>${unit}</small></span></button>`;
        const status=(key,live,label,value)=>`<button type="button" class="group-card-action" data-group-status="${key}" data-live="${live}" ${groupAttr} aria-label="${esc(group)} ${label} 차량 ${number(value)}대 보기"><i aria-hidden="true"></i>${label} <b>${number(value)}</b></button>`;
        const coverage=`집계 ${values.known} / ${values.total}대 · 미연결 ${values.offline}대`;
        card.innerHTML=`<button type="button" class="group-card-action group-card-head" ${reportAttr} aria-label="${esc(group)} 금일 업무 현황 보기"><span class="group-card-identity"><strong>${esc(group)}</strong><small>보유 ${number(values.total)}대 · 집계 ${number(values.known)}대</small></span><span class="group-card-period">금일</span></button><span class="group-card-overview"><button type="button" class="group-card-action group-card-work" data-group-metric="workPer" ${reportAttr} aria-label="${esc(group)} 대당 작업시간 금일 리포트 보기"><span class="group-card-label">대당 작업시간</span><span class="group-card-number group-card-duration">${duration(values.workPer)}</span><small class="group-card-note">합계 ${M.DISPLAY.duration(values.work,true)}</small></button><button type="button" class="group-card-action group-card-wait" data-group-metric="idleRate" ${reportAttr} aria-label="${esc(group)} 대기 비율 금일 리포트 보기"><span class="group-card-label">대기 비율</span><span class="group-card-number"><b>${number(values.idleRate)}</b>${Number.isFinite(values.idleRate)?'<small>%</small>':''}</span><small class="group-card-note">대당 ${M.DISPLAY.duration(values.idlePer,true)}</small></button></span><span class="group-card-issues">${issue('error','에러 발생',values.errors,'건')}${issue('due','교체 필요',values.due,'개')}${issue('soon','교체 임박',values.soon,'개')}</span><span class="group-card-status">${status('running','running','가동',values.running)}${status('stopped','idle','미가동',values.stopped)}${status('offline','offline','미연결',values.offline)}</span>`;
        card.setAttribute('aria-description',coverage+' · 에러 발생은 금일 00시부터 집계 시각까지의 발생 건수이며 해제된 건을 포함합니다. 상단과 동일한 기준의 그룹별 집계입니다.');
        card.dataset.groupCardPreview='ready';
        original.replaceWith(card);
      });
      const help=main.querySelector('[data-screen-id="LQ-DASH-001"] #group-work-help .source-note');
      if(help)help.textContent='작업·대기시간은 금일 00시부터 상단 집계 시각까지 연결 차량 실적입니다. 대당 작업시간 = 작업시간 합계 ÷ 집계 차량 수. 대기 비율 = 대기시간 ÷ (작업시간 + 대기시간) × 100이며, 운행시간 0은 -로 표시합니다. 에러 발생은 상단과 동일하게 금일 00시부터 마지막 수집 완료 구간까지의 그룹별 발생 건수입니다. 해제된 건과 미연결 차량의 해당 기간 발생 건도 포함하며 EE·FL 코드는 제외합니다. 교체 필요·임박은 현재 소모품 관리 항목 수입니다. 가동·미가동은 현재 연결 차량 상태이며 미연결은 가동 여부를 알 수 없는 차량입니다. 평소 대비 값은 비교 기준이 확정되지 않아 표시하지 않습니다.';
    }
    enhanceGroupCards();
    new root.MutationObserver(enhanceGroupCards).observe(main,{childList:true,subtree:true});
  }
  return {summarize,mount};
});
