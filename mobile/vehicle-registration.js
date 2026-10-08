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
  const roleName=role=>role==='customer_owner'?'고객 대표':'고객 직원';
  const dateText=date=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
  let requestSequence=0;
  function createRequestRecord(result,role){
    if(!['customer_owner','customer_staff'].includes(role)||!result||result.error||!result.vehicle||!result.terminal)return null;
    return {...result,id:'local-request-'+Date.now()+'-'+(++requestSequence),role,status:'REQ',requestedBy:roleName(role),registeredAt:dateText(new Date()),processedAt:'',processedBy:'',company:'(주)세종물류중부지점',reasonType:'',reason:''};
  }
  if(typeof module==='object'&&module.exports)module.exports={normalize,valid,lookup,catalog,preview,createRequestRecord};
  if(!root.document)return;
  const doc=root.document,$=s=>doc.querySelector(s),esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let role='',draft={vehicle:'',terminal:''},result=null;
  const canRequest=()=>!root.CustomerOnboarding?.current()||role==='customer_owner';
  const active=()=>!!$('#vehicle-registration-form');
  const definition=rows=>'<dl class="detail-definition">'+rows.map(([label,value])=>`<div><dt>${esc(label)}</dt><dd>${esc(value||'—')}</dd></div>`).join('')+'</dl>';
  const details=r=>definition([['차량 시리얼번호',r.vehicle],['기종',r.model],['터미널 ID',r.terminal],['담당 딜러',r.dealer]]);
  function enter(context){
    if(role!==context.role){draft={vehicle:'',terminal:''};result=null;role=context.role;}
  }
  function resultMarkup(){
    if(result?.submitted)return `<section class="detail-card registration-result" tabindex="-1"><h2>신청 접수 완료</h2>${details(result)}<p class="source-note" role="status">신청이 접수되었습니다. 담당 딜러 승인 대기 중입니다.</p></section>`;
    if(result?.qrNotice)return `<section class="detail-card registration-result"><p class="source-note" role="status">${esc(result.qrNotice)}</p></section>`;
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
    const input=(key)=>`<label class="registration-field" for="registration-${key}"><strong>${fields[key]} <span aria-hidden="true">*</span></strong><span class="registration-input-row"><input id="registration-${key}" name="${key}" type="text" value="${esc(draft[key])}" placeholder="${fields[key]} 입력" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${fields[key]}" aria-required="true">${root.CustomerRegistrationScanner?.button(key)||`<button type="button" class="detail-secondary-button registration-scan-button" data-registration-scan="${key}" aria-label="${fields[key]} QR 촬영"><i data-lucide="scan-line" aria-hidden="true"></i>QR 촬영</button>`}</span></label>`;
    return `<div class="vehicle-registration" data-screen-id="LQ-MGT-008"><div class="snapshot"><h1>차량 등록</h1></div><form id="vehicle-registration-form" class="detail-card" novalidate><h2>차량 · 터미널 정보</h2><p class="source-note">차량 시리얼번호와 터미널 ID를 모두 입력해 주세요.</p>${input('vehicle')}${input('terminal')}<button type="submit" class="report-primary-action" data-registration-lookup>조회</button></form><div id="vehicle-registration-result" aria-live="polite">${resultMarkup()}</div></div>`;
  }
  doc.addEventListener('input',e=>{if(e.isComposing)return;const key=e.target.name;if(e.target.form?.id==='vehicle-registration-form'&&Object.hasOwn(fields,key))set(key,e.target.value);});
  doc.addEventListener('compositionend',e=>{if(e.target.form?.id==='vehicle-registration-form')set(e.target.name,e.target.value);});
  doc.addEventListener('submit',e=>{
    if(e.target.id!=='vehicle-registration-form')return;e.preventDefault();
    result=preview(draft.vehicle,draft.terminal);refresh();
    if(result.error){$('#registration-'+result.field)?.focus();return;}
    $('.registration-result')?.focus();
  });
  doc.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b)return;
    if(b.dataset.registrationScan&&!root.CustomerRegistrationScanner&&active()&&Object.hasOwn(fields,b.dataset.registrationScan)){
      result={qrNotice:'QR 촬영은 테스트 앱에서 사용할 수 있습니다. HTML 화면에서는 '+fields[b.dataset.registrationScan]+'를 직접 입력해 주세요.'};refresh();$('#registration-'+b.dataset.registrationScan)?.focus();return;
    }
    if(b.hasAttribute('data-registration-next')&&active()){
      if(!canRequest())return;
      if(!result||result.error||result.vehicle!==draft.vehicle.trim()||result.terminal!==draft.terminal.trim())return;
      const record=createRequestRecord(result,role);if(!record)return;
      if(root.CustomerOnboarding?.current()&&!root.CustomerOnboarding.addRequest(record)){result={error:'신청을 저장하지 못했습니다. 저장소 설정을 확인하고 다시 조회해 주세요.'};refresh();return;}
      result={...record,submitted:true};draft={vehicle:'',terminal:''};
      $('#registration-vehicle').value='';$('#registration-terminal').value='';
      refresh();$('.registration-result')?.focus();return;
    }
  });
  root.CustomerVehicleRegistration={render,set,lookup,leave(){root.CustomerRegistrationScanner?.close();}};
})(typeof window==='undefined'?globalThis:window);
