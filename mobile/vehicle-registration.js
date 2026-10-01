// Local registration preview. No API request, fleet mutation, or persistent storage.
(function(root){
  'use strict';
  const fields={vehicle:'차량 시리얼번호',terminal:'터미널 ID'};
  const catalog=Object.freeze({
    vehicles:[{serial:'FBA32_LOCAL_001',model:'B30S-7',dealerId:'local-a'},{serial:'FBA32_LOCAL_002',model:'B30S-7',dealerId:'local-b'},{serial:'FBA32_LOCAL_USED',model:'B30S-7',dealerId:'local-a',registered:true}],
    terminals:[{id:'TML_LOCAL_001',dealerId:'local-a'},{id:'TML_LOCAL_002',dealerId:'local-b'},{id:'TML_LOCAL_USED',dealerId:'local-a',linked:true}],
    dealers:{'local-a':'로컬 확인 딜러 A','local-b':'로컬 확인 딜러 B'}
  });
  const normalize=value=>String(value??'').trim().toUpperCase();
  const valid=value=>/^[A-Z0-9][A-Z0-9_-]{2,63}$/.test(normalize(value));
  // Vue handoff: preserve strict validation. Replace this fixture catalog with
  // authoritative API data and revalidate at save; never use preview() in production.
  function lookup(vehicle,terminal,records=[]){
    vehicle=normalize(vehicle);terminal=normalize(terminal);
    if(!valid(vehicle)||!valid(terminal))return {error:'차량 시리얼번호와 터미널 ID를 모두 확인해 주세요. 영문·숫자·밑줄·하이픈 3~64자로 입력합니다.'};
    const v=catalog.vehicles.find(item=>item.serial===vehicle),t=catalog.terminals.find(item=>item.id===terminal);
    if(!v)return {error:'차량 정보를 찾을 수 없습니다. 시리얼번호를 확인해 주세요.'};
    if(!t)return {error:'터미널 정보를 찾을 수 없습니다. 터미널 ID를 확인해 주세요.'};
    if(v.registered||records.some(item=>item.vehicle===vehicle))return {error:'이미 등록된 차량입니다. 기존 등록 정보를 확인해 주세요.'};
    if(t.linked||records.some(item=>item.terminal===terminal))return {error:'이미 다른 차량에 연결된 터미널입니다.'};
    if(v.dealerId!==t.dealerId)return {error:'차량과 터미널의 담당 딜러가 다릅니다. 번호를 확인하거나 담당 딜러에 문의해 주세요.'};
    return {vehicle,terminal,model:v.model,dealer:catalog.dealers[v.dealerId],dealerId:v.dealerId};
  }
  // Explicit local walkthrough: only missing values block the success flow.
  function preview(vehicle,terminal){
    vehicle=String(vehicle??'').trim();terminal=String(terminal??'').trim();
    if(!vehicle&&!terminal)return {error:'차량 시리얼번호와 터미널 ID를 입력해 주세요.',field:'vehicle'};
    if(!vehicle)return {error:'차량 시리얼번호를 입력해 주세요.',field:'vehicle'};
    if(!terminal)return {error:'터미널 ID를 입력해 주세요.',field:'terminal'};
    return {vehicle,terminal,model:'B30S-7 (예시)',dealer:'로컬 확인 딜러 (예시)'};
  }
  const statuses={REQ:'대기',APRV:'승인',RJCT:'반려'};
  const roleName=role=>role==='customer_owner'?'고객 대표':'고객 직원';
  const dateText=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  function seedRequests(){
    return ['customer_owner','customer_staff'].flatMap(role=>['APRV','RJCT'].map((status,index)=>({
      ...preview('FBA32_DEMO_'+status,'TML_DEMO_'+status),id:role+'-example-'+status,role,status,
      requestedBy:roleName(role),registeredAt:dateText(new Date(Date.now()-(index+2)*86400000)),
      processedAt:dateText(new Date(Date.now()-(index+1)*86400000)),processedBy:'담당 딜러 (예시)',
      company:'(주)세종물류중부지점',reasonType:status==='RJCT'?'차량 정보 불일치':'',
      reason:status==='RJCT'?'차량 시리얼번호와 터미널 ID의 연결 정보를 확인할 수 없습니다.\n차량과 터미널에 부착된 번호를 확인한 후 다시 신청해 주세요.':''
    })));
  }
  function createRequestStore(seed=[]){
    const records=seed.map(record=>({...record}));let sequence=0;
    const allowed=role=>['customer_owner','customer_staff'].includes(role);
    return {
      list(role){return allowed(role)?records.filter(record=>record.role===role).map(record=>({...record})):[];},
      find(id,role){return this.list(role).find(record=>record.id===id);},
      submit(result,role){
        if(!allowed(role)||!result||result.error||!result.vehicle||!result.terminal)return null;
        const record={...result,id:'local-request-'+Date.now()+'-'+(++sequence),role,status:'REQ',requestedBy:roleName(role),registeredAt:dateText(new Date()),processedAt:'',processedBy:'',company:'(주)세종물류중부지점',reasonType:'',reason:''};
        records.unshift(record);return {...record};
      }
    };
  }
  if(typeof module==='object'&&module.exports)module.exports={normalize,valid,lookup,catalog,preview,statuses,seedRequests,createRequestStore};
  if(!root.document)return;
  const doc=root.document,$=s=>doc.querySelector(s),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let role='',draft={vehicle:'',terminal:''},result=null,navigate,filter='all',page=1,notice='',openedRequest='';
  const store=createRequestStore(seedRequests()),pageSize=20;
  const requests=()=>root.CustomerOnboarding?.requests()??store.list(role);
  const canRequest=()=>!root.CustomerOnboarding?.current()||role==='customer_owner';
  const active=()=>!!$('#vehicle-registration-form');
  const definition=rows=>'<dl class="detail-definition">'+rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'—')}</dd></div>`).join('')+'</dl>';
  const details=r=>definition([['차량 시리얼번호',r.vehicle],['기종',r.model],['터미널 ID',r.terminal],['담당 딜러',r.dealer]]);
  const badge=r=>`<span class="status-pill ${r.status==='REQ'?'is-warning':r.status==='RJCT'?'is-danger':''}">${statuses[r.status]||'확인 필요'}</span>`;
  function enter(context){
    if(role!==context.role){draft={vehicle:'',terminal:''};result=null;filter='all';page=1;notice='';role=context.role;}
    navigate=context.navigate;
  }
  function resultMarkup(){
    if(result?.error)return `<section class="detail-card registration-result"><p class="error-note" role="alert">${esc(result.error)}</p></section>`;
    if(!result)return '';
    return `<section class="detail-card registration-result" tabindex="-1"><h2>조회 결과</h2>${details(result)}<p class="source-note">다음을 누르면 담당 딜러에게 차량 등록을 신청합니다.</p><button type="button" class="report-primary-action" data-registration-next>다음</button></section>`;
  }
  function refresh(){
    if($('#vehicle-registration-result'))$('#vehicle-registration-result').innerHTML=resultMarkup();
  }
  function set(field,value,check=false){
    if(!active()||!Object.hasOwn(fields,field))return false;
    // QR values remain identifiers; never interpret a URL, JSON, or executable content.
    if(check&&!String(value??'').trim())return false;
    draft[field]=String(value??'');result=null;
    const input=$('#registration-'+field);if(input&&input.value!==draft[field])input.value=draft[field];
    refresh();return true;
  }
  function render(context){
    enter(context);
    const input=(key)=>`<label class="registration-field" for="registration-${key}"><strong>${fields[key]} <span aria-hidden="true">*</span></strong><span class="registration-input-row"><input id="registration-${key}" name="${key}" type="text" value="${esc(draft[key])}" placeholder="${fields[key]} 입력" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${fields[key]}" aria-required="true">${root.CustomerRegistrationScanner?.button(key)||''}</span></label>`;
    return `<div class="vehicle-registration" data-screen-id="LQ-MGT-008"><div class="snapshot"><h1>차량 등록</h1></div><form id="vehicle-registration-form" class="detail-card" novalidate><h2>차량 · 터미널 정보</h2><p class="source-note">차량 시리얼번호와 터미널 ID를 모두 입력해 주세요.</p>${input('vehicle')}${input('terminal')}<button type="submit" class="report-primary-action" data-registration-lookup>조회</button></form><div id="vehicle-registration-result" aria-live="polite">${resultMarkup()}</div></div>`;
  }
  function listMarkup(){
    const all=requests(),rows=all.filter(record=>filter==='all'||record.status===filter),pages=Math.max(1,Math.ceil(rows.length/pageSize));page=Math.min(Math.max(page,1),pages);
    const tabs=`<div class="mobile-status-tabs approval-status-tabs" role="group" aria-label="차량 신청 상태">${[['all','전체'],...Object.entries(statuses)].map(([key,label])=>`<button type="button" data-registration-filter="${key}" class="${filter===key?'is-active':''}" aria-pressed="${filter===key}"><span>${label}</span><strong>${key==='all'?all.length:all.filter(r=>r.status===key).length}</strong></button>`).join('')}</div>`;
    const cards=rows.slice((page-1)*pageSize,page*pageSize).map(r=>`<button type="button" class="detail-card registration-request-card" data-registration-detail="${esc(r.id)}" aria-label="${esc(r.vehicle)} ${statuses[r.status]} 상세"><span class="registration-request-head"><strong>${esc(r.vehicle)}</strong>${badge(r)}</span><span class="registration-request-meta">${esc(r.model)} · ${esc(r.terminal)}</span><span class="registration-request-meta">${esc(r.dealer)}</span><span class="registration-request-meta">신청 ${esc(r.registeredAt)}</span><span class="registration-request-more">상세 보기 ›</span></button>`).join('');
    return tabs+(cards||'<p class="empty-state">'+(all.length?'해당 상태의 신청이 없습니다.':'차량 신청 내역이 없습니다.')+'</p>')+(pages>1?`<div class="registration-pagination"><button type="button" class="detail-secondary-button" data-registration-page="-1" ${page===1?'disabled':''}>이전</button><span>${page} / ${pages}</span><button type="button" class="detail-secondary-button" data-registration-page="1" ${page===pages?'disabled':''}>다음</button></div>`:'');
  }
  function requestDetail(r){
    const processed=r.status!=='REQ';
    return `<div class="registration-request-head"><strong>${esc(r.vehicle)}</strong>${badge(r)}</div>${details(r)}${definition([['신청번호',r.id],['신청자',r.requestedBy],['신청일시',r.registeredAt],...(processed?[['처리 담당자',r.processedBy],['처리일시',r.processedAt]]:[])])}${r.status==='RJCT'?`<section class="registration-decision"><h3>반려 사유</h3><strong>${esc(r.reasonType||'반려')}</strong><p>${esc(r.reason||'등록된 반려 사유가 없습니다.')}</p></section>`:r.status==='APRV'?`<section class="registration-decision"><h3>승인 내용</h3><p>차량 등록 신청이 승인되었습니다.</p>${definition([['소속 업체',r.company],['그룹 배정','미배정']])}</section>`:'<p class="source-note">담당 딜러의 승인을 기다리고 있습니다.</p>'}`;
  }
  function renderList(context){
    enter(context);const message=notice;notice='';
    return `<div class="vehicle-registration" data-screen-id="LQ-MGT-004-T01"><div class="snapshot"><h1>차량 신청내역</h1></div>${message?`<p class="approval-message" role="status">${esc(message)}</p>`:''}${canRequest()?'<button type="button" class="detail-secondary-button" data-route="vehicleRegistration">차량 등록</button>':'<p class="source-note">차량 등록은 소속 업체 대표에게 요청해 주세요.</p>'}<div id="vehicle-request-list" class="registration-request-list">${listMarkup()}</div><dialog class="supply-reset-dialog registration-request-dialog" id="vehicle-request-detail" data-screen-id="LQ-MGT-004-P03" aria-labelledby="vehicle-request-detail-title"><header><h2 id="vehicle-request-detail-title">차량 신청 상세</h2><button type="button" data-registration-detail-close aria-label="신청 상세 닫기">닫기</button></header><div class="supply-reset-body" id="vehicle-request-detail-body"></div><footer><button type="button" class="detail-secondary-button" data-registration-detail-close>확인</button></footer></dialog></div>`;
  }
  function closeDetail(){const dialog=$('#vehicle-request-detail');if(dialog?.open)dialog.close();}
  doc.addEventListener('close',e=>{if(e.target.id==='vehicle-request-detail'&&openedRequest){$(`[data-registration-detail="${openedRequest}"]`)?.focus();openedRequest='';}},true);
  doc.addEventListener('input',e=>{if(e.isComposing)return;const key=e.target.name;if(e.target.form?.id==='vehicle-registration-form'&&Object.hasOwn(fields,key))set(key,e.target.value);});
  doc.addEventListener('compositionend',e=>{if(e.target.form?.id==='vehicle-registration-form')set(e.target.name,e.target.value);});
  doc.addEventListener('submit',e=>{
    if(e.target.id!=='vehicle-registration-form')return;e.preventDefault();
    result=preview(draft.vehicle,draft.terminal);refresh();
    if(result.error){$('#registration-'+result.field)?.focus();return;}
    $('.registration-result')?.focus();
  });
  doc.addEventListener('click',e=>{
    if(e.target===$('#vehicle-request-detail'))return closeDetail();
    const b=e.target.closest('button');if(!b)return;
    if(b.hasAttribute('data-registration-next')&&active()){
      if(!canRequest())return;
      if(!result||result.error||result.vehicle!==draft.vehicle.trim()||result.terminal!==draft.terminal.trim())return;
      const record=store.submit(result,role);if(!record)return;
      if(root.CustomerOnboarding?.current()&&!root.CustomerOnboarding.addRequest(record)){result={error:'신청을 저장하지 못했습니다. 저장소 설정을 확인하고 다시 조회해 주세요.'};refresh();return;}
      result=null;draft={vehicle:'',terminal:''};filter='all';page=1;
      notice='신청이 접수되었습니다. 담당 딜러 승인 대기 중입니다.';
      refresh();navigate?.('vehicleRequests');return;
    }
    if(!$('#vehicle-request-list'))return;
    if(b.hasAttribute('data-registration-detail-close'))return closeDetail();
    if(b.hasAttribute('data-registration-detail')){
      const record=requests().find(record=>record.id===b.dataset.registrationDetail);if(!record)return;
      openedRequest=record.id;$('#vehicle-request-detail-body').innerHTML=requestDetail(record);$('#vehicle-request-detail').showModal();
    }
    if(b.hasAttribute('data-registration-filter')){const key=b.dataset.registrationFilter;if(key!=='all'&&!Object.hasOwn(statuses,key))return;filter=key;page=1;$('#vehicle-request-list').innerHTML=listMarkup();$(`[data-registration-filter="${key}"]`)?.focus();}
    if(b.hasAttribute('data-registration-page')){page+=b.dataset.registrationPage==='-1'?-1:1;$('#vehicle-request-list').innerHTML=listMarkup();$('.registration-request-card')?.focus();}
  });
  root.CustomerVehicleRegistration={render,renderList,set,lookup,leave(){root.CustomerRegistrationScanner?.close();closeDetail();}};
})(typeof window==='undefined'?globalThis:window);
