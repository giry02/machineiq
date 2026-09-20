/* Web-backed prototype adapter: archived IMQ equipmentId is NOT the displayed VIN.
   Browser session/local settings only; no production API, authentication or device command. */
(function (root, factory) {
  const api = factory(typeof module === 'object' && module.exports ? require('./web-contracts.generated.js') : root.CustomerWebContracts);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CustomerPrototype = api;
})(typeof window === 'undefined' ? globalThis : window, function (W) {
  'use strict';
  // Local demo only: derive its cutoff from today's Korea time on page load.
  // This is generated fixture data, never an actual API collection timestamp.
  const koreaNow = new Date(Date.now()+9*60*60*1000).toISOString();
  const SNAPSHOT = koreaNow.slice(0,10)+' '+koreaNow.slice(11,13)+':00';
  const TODAY = SNAPSHOT.slice(0,10), DATA_START = '2026-07-01';
  const ENERGY_MONTH = Number(TODAY.slice(5,7))+'월';
  const STATUS = {
    due:{label:'교체 필요',icon:'refresh-cw',tone:'danger'},
    soon:{label:'교체 임박',icon:'clock-3',tone:'warning'},
    error:{label:'에러 발생',icon:'triangle-alert',tone:'danger'},
    normal:{label:'정상',icon:'circle-check',tone:'neutral'},
    resolved:{label:'처리완료',icon:'circle-check',tone:'neutral'},
    unknown:{label:'미수신',icon:'circle-help',tone:'neutral'}
  };
  // Presentation only: round once at the final boundary; retain raw metric precision.
  const wholeNumber = value => Math.round(value).toLocaleString('ko-KR', {maximumFractionDigits:0});
  const DISPLAY = {
    number:(value,unit='')=>Number.isFinite(value)?wholeNumber(value)+unit:'-',
    duration:(minutes,compact=false)=>Number.isFinite(minutes)&&minutes>=0?(minutes=Math.round(minutes),true)&&(compact?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${Math.floor(minutes/60)}시간 ${minutes%60}분`):'-',
    efficiency:value=>Number.isFinite(value)?wholeNumber(value)+'%':'-'
  };
  // Same default bands as web Shock/shock-tobe.html. These are not live sensor thresholds.
  if(!W)throw new Error('Web data contracts must load before the mobile model');
  const SHOCK_LEVELS=[
    {key:'s3',label:'민감',level:'Lv3',min:1.2,max:1.8,color:'#2b8a3e',description:'노면이 고르지 않거나 과속 방지턱을 넘을 때 발생할 수 있는 정도'},
    {key:'s4',label:'주의',level:'Lv4',min:1.8,max:2.5,color:'#f59f00',description:'충분히 감속하지 않은 상태에서 화물을 들 때 발생할 수 있는 정도'},
    {key:'s5',label:'경고',level:'Lv5',min:2.5,max:null,color:'#e03131',description:'운전자가 느낄 수 있을 정도의 강한 충격'}
  ];
  function shockLevel(g) {return Number.isFinite(g)?[...SHOCK_LEVELS].reverse().find(level=>g>=level.min)?.key||null:null;}
  // Match the web meeting-model charge window, including equal hours = 24 hours.
  function chargeWindow(start,end) { return W.meeting.chargeWindow(start,end); }
  // Dealer approval interaction adapted to customer-owned employee requests only.
  // Same web session records; no real user, login grant, SMS or server write.
  function createApprovalStore(vehicles,seed) {
    const storageKey='linq.management.userRequests.v2',groups=[...new Set(vehicles.map(v=>v.group).filter(Boolean))];
    let raw=seed?seed.map(r=>({...r,registered:r.createdAt,status:({pending:'REQ',approved:'APRV',rejected:'RJCT'})[r.status],role:!r.role||r.role==='customer_staff'?'고객 직원':r.role,approverId:r.approverId||W.principals.customer_owner})):W.approvalSeed();
    function refresh(){if(seed)return;try{const saved=JSON.parse(sessionStorage.getItem(storageKey));if(Array.isArray(saved)&&saved.length)raw=saved;}catch{}}
    function save(){if(seed)return;try{sessionStorage.setItem(storageKey,JSON.stringify(raw));}catch{}}
    const eligible=(r,role)=>role==='customer_owner'&&W.common.roles.hasCapability(role,'approveUserRequest')&&r?.approverId===W.principals[role]&&r.role==='고객 직원'&&(!r.companyId||String(r.companyId)===COMPANY);
    const copy=r=>({...r,status:({REQ:'pending',APRV:'approved',RJCT:'rejected'})[r.status],companyId:COMPANY,companyName:r.company,role:'customer_staff',createdAt:r.registered,processedAt:r.processed,processedBy:r.processor});
    function list(role){refresh();return raw.filter(r=>eligible(r,role)).sort((a,b)=>b.registered.localeCompare(a.registered)).map(copy);}
    function find(id,role){refresh();const r=raw.find(r=>r.id===id&&eligible(r,role));return r?copy(r):null;}
    function process(id,role,action,{group='',reason=''}={}){
      refresh();const r=raw.find(r=>r.id===id);
      if(!eligible(r,role))return {ok:false,message:'고객 대표의 승인 범위에 속한 직원 신청만 처리할 수 있습니다.'};
      if(r.status!=='REQ')return {ok:false,message:'이미 처리된 신청입니다. 목록을 다시 확인해 주세요.'};
      if(!['approve','reject'].includes(action))return {ok:false,message:'처리 방식을 확인해 주세요.'};
      if(r.email===W.principals[role])return {ok:false,message:'자기 계정 신청은 직접 승인할 수 없습니다.'};
      reason=String(reason).trim();
      if(action==='approve'&&!groups.includes(group))return {ok:false,message:'배정 그룹을 선택해 주세요.'};
      if(action==='reject'&&(!reason||reason.length>500))return {ok:false,message:'반려 사유를 1~500자로 입력해 주세요.'};
      if(action==='approve'&&(W.existingUsers.some(email=>email.toLowerCase()===r.email.toLowerCase())||raw.some(x=>x!==r&&x.status==='APRV'&&x.email.toLowerCase()===r.email.toLowerCase())))return {ok:false,message:'이미 등록되거나 승인된 계정입니다. 중복 신청을 확인해 주세요.'};
      Object.assign(r,{status:action==='approve'?'APRV':'RJCT',group:action==='approve'?group:'',reason:action==='reject'?reason:'',processed:W.approvalReference,processor:'윤태호',processorRole:'고객 대표',addedToUsers:action==='approve'});
      save();return {ok:true,request:copy(r),message:r.name+' 님의 신청을 '+(action==='approve'?'승인':'반려')+'했습니다.'};
    }
    return {list,find,process,groups:()=>groups.slice()};
  }
  function periodWindow(from,to) {
    const valid=Boolean(calendarDate(from)&&calendarDate(to)&&from<=to);
    const cutoff=SNAPSHOT.slice(0,10),through=valid?(to<cutoff?to:cutoff):null;
    if(!through||from>through)return {valid,from,to,through:null,label:'조회 기간 미집계 · 최종 수집 '+SNAPSHOT.slice(5).replace('-','.')};
    const end=through===cutoff?SNAPSHOT.slice(5).replace('-','.'):through.slice(5).replace('-','.')+' 24:00';
    return {valid,from,to,through,label:'집계 '+from.slice(5).replace('-','.')+' 00:00~'+end};
  }
  function hourlyWindow(dataThrough=SNAPSHOT) {
    if(typeof dataThrough!=='string'||!/^\d{4}-\d{2}-\d{2}[ T](?:[01]\d|2[0-3]):[0-5]\d/.test(dataThrough))return null;
    const date=dataThrough.slice(0,10),hour=dataThrough.slice(11,13);
    return {date,start:date+' 00:00',end:date+' '+hour+':00',label:date.slice(5).replace('-','.')+' 00:00~'+hour+':00 기준'};
  }
  const COMPANY = '1933';
  const TYPES = { '엔진':'DI', '납산':'LA', '리튬':'LI', '수소':'HI' };
  const ROLE_LABELS = {customer_owner:'고객 대표',customer_staff:'고객 직원'};
  // Original web supply records and VIN associations, without mobile-only examples.
  function sourceSupplies(v) {
    return W.service.supplyItems(v.vin).map((r,i)=>({itemId:'web-supply-'+i,name:r.name,cycleHours:r.cycle,usedHours:r.used,lastChangedAt:W.service.records.find(x=>x.kind==='supply'&&x.vin===v.vin)?.date||null}));
  }
  function supplyItems(v) {
    // Unknown lists are not confirmed empty lists; malformed entries remain unknown.
    return (Array.isArray(v.supplies)?v.supplies:[]).map((source,index)=>{
      const present=source!==null&&typeof source==='object'&&!Array.isArray(source);
      const item=present?{...source,itemId:source.itemId??'missing-'+index,name:source.name||'소모품 정보 없음'}:{itemId:'missing-'+index,name:'소모품 정보 없음'};
      const count=present?1:0;
      const valid=Number.isFinite(item.cycleHours)&&item.cycleHours>0&&Number.isFinite(item.usedHours)&&item.usedHours>=0;
      const status=valid?W.service.supplyStatus(item.cycleHours,item.usedHours):{state:'unknown',percent:null};
      // Dashboard handoff: ROUND(raw usage %, 0) determines the current state.
      // Keep the existing two-decimal usage display; do not round twice for classification.
      const percent=status.percent,decisionPercent=valid?Math.round(item.usedHours/item.cycleHours*100):null;
      const key=decisionPercent==null?'unknown':decisionPercent>=90?'due':decisionPercent>=80?'soon':'normal';
      return {...item,percent,decisionPercent,key,kind:'supplies',label:STATUS[key].label,count,id:v.equipmentId+'-supply-'+item.itemId,equipmentId:v.equipmentId,occurredAt:v.receivedAt||SNAPSHOT,resolved:false};
    });
  }
  function currentSupplies(rows) {
    const seen=new Set();
    return rows.flatMap(supplyItems).filter(item=>{
      if(seen.has(item.id))return false;
      seen.add(item.id);return true;
    });
  }
  function supplySummary(rows) {
    const items=currentSupplies(rows),hasUnknown=rows.some(v=>!Array.isArray(v.supplies))||items.some(i=>i.key==='unknown');
    // A partial snapshot cannot prove a complete zero; retain known rows, with a notice.
    return {hasUnknown,knownItems:items.filter(i=>i.key!=='unknown').length,
      due:hasUnknown?null:items.filter(i=>i.key==='due').length,
      soon:hasUnknown?null:items.filter(i=>i.key==='soon').length};
  }
  function fleetState(fleet) {
    const valid=Array.isArray(fleet?.vehicles)&&fleet.vehicles.every(v=>v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.vin==='string'&&v.vin.trim()&&typeof v.companyId==='string'&&v.companyId.trim());
    return {available:!!valid};
  }
  let sourceFleet=[];
  function rawHistory() {
    const day=W.common.dates.format(W.common.dates.yesterday(new Date()));
    const generated=W.demo.create(sourceFleet,day);
    // Keep the existing history; add today's completed occurrences using the same web fixture rules.
    const today=W.demo.create(sourceFleet,TODAY);
    const current=today.error.filter(r=>r.dateTime<SNAPSHOT);
    const maintenance=today.maintenance.filter(r=>r.dateTime<SNAPSHOT);
    return W.legacy.concat(generated.maintenance,generated.error,current,maintenance);
  }
  function buildVehicles(fleet) {
    sourceFleet=fleetState(fleet).available?fleet.vehicles.filter(v=>!v.catalogOnly):[];
    const history=rawHistory(),window=W.meeting.hourlyWindow(new Date());
    return sourceFleet.filter(v=>v.companyId===COMPANY).map((v,i)=>{
      const live=W.meeting.hourlyVehicle(v,window),supplies=sourceSupplies(v);
      return {...v,equipmentId:`demo-equipment-${String(i+1).padStart(2,'0')}`,equipmentNumber:v.vin,equipmentName:v.model,codeName:v.model,fuelTypeCode:TYPES[v.type],
        modelYear:v.modelYear??null,operating:live.connected?live.running:null,
        activeErrorCount:history.filter(r=>r.kind==='error'&&r.vin===v.vin&&r.errorState==='current').length,
        supplies,supplyDueCount:supplyItems({supplies}).filter(r=>r.key==='due').length,supplySoonCount:supplyItems({supplies}).filter(r=>r.key==='soon').length,
        receivedAt:live.dataTime,position:W.positions.find(p=>p.vin===v.vin)||null,batteryVoltage:v.batteryVoltage??null,batteryCapacity:v.batteryCapacity??null};
    });
  }
  function scope(rows,state) {
    if(!Object.hasOwn(ROLE_LABELS,state.role))return [];
    return W.common.roles.filterVehicles(state.role,rows)
      .filter(v=>state.role!=='customer_owner'||!state.group||v.group===state.group)
      .filter(v=>!state.type||v.type===state.type);
  }
  function assignedGroup(role) { return W.common.roles.targetPolicy(role).group; }
  // Prototype-only replacement transaction: no server/device writes.
  function resetSupplies(rows,state,ids) {
    if(state.role!=='customer_owner'||!Array.isArray(ids)||!ids.length)return [];
    const requested=new Set(ids),targets=[];
    for(const v of scope(rows,state))for(const item of supplyItems(v))if(requested.has(item.id)&&item.percent!=null&&item.usedHours>0)targets.push({v,item});
    if(targets.length!==requested.size)return [];
    const snapshots=targets.map(({v,item})=>({equipmentId:v.equipmentId,itemId:item.itemId,usedHours:item.usedHours,lastChangedAt:item.lastChangedAt}));
    for(const {v,item} of targets){const source=v.supplies.find(s=>s?.itemId===item.itemId);source.usedHours=0;source.lastChangedAt=SNAPSHOT;}
    refreshSupplyCounts(rows);return snapshots;
  }
  function refreshSupplyCounts(rows) {
    for(const v of rows){const items=supplyItems(v);v.supplyDueCount=items.filter(i=>i.key==='due').length;v.supplySoonCount=items.filter(i=>i.key==='soon').length;}
    const infos=W.service.supplyItems().map(item=>{
      const v=rows.find(v=>v.vin===item.vin),source=(Array.isArray(v?.supplies)?v.supplies:[]).find(r=>r?.name===item.name),record=W.service.records.find(r=>r.kind==='supply'&&r.vin===item.vin)||{};
      return {...record,supplyName:item.name,supplyCycle:source?.cycleHours??item.cycle,supplyUsed:source?.usedHours??item.used};
    });
    W.service.replace('supply',infos);
  }
  function undoSupplyReset(rows,state,snapshots) {
    if(state.role!=='customer_owner'||!Array.isArray(snapshots)||!snapshots.length)return false;
    const allowed=scope(rows,state),targets=snapshots.map(s=>{const supplies=allowed.find(v=>v.equipmentId===s.equipmentId)?.supplies;return {snapshot:s,item:(Array.isArray(supplies)?supplies:[]).find(i=>i?.itemId===s.itemId)};});
    if(targets.some(t=>!t.item||t.item.usedHours!==0))return false;
    targets.forEach(({item,snapshot})=>{item.usedHours=snapshot.usedHours;item.lastChangedAt=snapshot.lastChangedAt;});
    refreshSupplyCounts(rows);return true;
  }
  function attention(v) { return !v.conn || v.activeErrorCount > 0 || v.supplyDueCount > 0 || v.supplySoonCount > 0 || supplySummary([v]).hasUnknown; }
  // Reuse the existing confirmation fixtures, including the clearly labelled completed example.
  function serviceItems(v) {
    const maintenance=serviceHistory([v]).filter(r=>r.kind==='maintenance');
    return [
      ...(v.activeErrorCount?[{kind:'error',key:'error',label:'에러',count:v.activeErrorCount,status:'확인 필요'}]:[]),
      ...(v.supplyDueCount?[{kind:'supplies',key:'due',label:'교체 필요',count:v.supplyDueCount,status:'교체 필요'}]:[]),
      ...(v.supplySoonCount?[{kind:'supplies',key:'soon',label:'교체 임박',count:v.supplySoonCount,status:'교체 예정'}]:[]),
      ...(maintenance.length?[{kind:'maintenance',key:'maintenance',label:'정비',count:maintenance.length,status:maintenance[0].resolved?'처리완료':'진행중',date:maintenance[0].occurredAt.slice(0,10)}]:[])
    ];
  }
  function listed(rows, state) {
    const q = (state.q || '').toLowerCase().trim();
    return scope(rows,state).filter(v => !q || `${v.equipmentNumber} ${v.model} ${v.group}`.toLowerCase().includes(q))
      .filter(v => !state.live || (state.live === 'connected' ? v.conn : state.live === 'offline' ? !v.conn : state.live === 'running' ? v.operating === true : state.live === 'idle' ? v.operating === false : state.live === 'error' ? v.activeErrorCount > 0 : state.live === 'due' ? v.supplyDueCount > 0 : state.live === 'soon' ? v.supplySoonCount > 0 : true));
  }
  // Original web error/maintenance records restricted to accessible source VINs.
  function serviceHistory(rows) {
    const allowed=new Map(rows.map(v=>[v.vin,v]));
    return rawHistory().map((r,i)=>({...r,id:'web-'+r.kind+'-'+r.vin+'-'+(r.dateTime||r.date)+'-'+i})).filter(r=>allowed.has(r.vin)&&String(r.companyId)===String(COMPANY)).map(r=>{
      const v=allowed.get(r.vin),resolved=r.kind==='error'?r.errorState==='past':r.completed===true;
      return {...r,equipmentId:v.equipmentId,
        label:r.kind==='error'?'차량 에러':r.part||'정비',description:r.description||r.symptom||'',detail:r.detail||'',
        occurredAt:r.dateTime||r.date+' 00:00',resolvedAt:r.completedAt||null,resolved,count:1};
    }).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||a.id.localeCompare(b.id));
  }
  function dashboardWindow({from=TODAY,to=TODAY,through=SNAPSHOT}={}) {
    const cutoff=hourlyWindow(through),valid=Boolean(calendarDate(from)&&calendarDate(to)&&from<=to&&cutoff&&calendarDate(cutoff.date));
    if(!valid)return {valid:false,from,to,start:null,end:null,label:'집계 정보 없음'};
    const start=from+' 00:00',next=isoDay(shiftDay(calendarDate(to),1))+' 00:00';
    const end=[next,cutoff.end,SNAPSHOT].sort()[0];
    const endLabel=end===next?to.slice(5).replace('-','.')+' 24:00':end.slice(5).replace('-','.');
    return {valid:start<=end,from,to,start,end,label:'집계 '+from.slice(5).replace('-','.')+' 00:00~'+endLabel};
  }
  function dashboardErrors(rows,{records=serviceHistory(rows),...options}={}) {
    const range=dashboardWindow(options),allowed=new Set(rows.map(v=>v.equipmentId)),seen=new Set();
    if(!range.valid)return [];
    return records.filter(r=>{
      const at=String(r.occurredAt||'').replace('T',' '),code=String(r.code||'').toUpperCase();
      if(r.kind!=='error'||!allowed.has(r.equipmentId)||['EE','FL'].includes(code)||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(at)||at<range.start||at>=range.end)return false;
      // Distinct occurrences remain distinct, including multiple mapped battery error items.
      const key=[r.equipmentId,r.eventId||r.id,r.errorItemId||code,at].join('|');
      if(seen.has(key))return false;
      seen.add(key);return true; // Resolution does not remove an occurrence from this window.
    });
  }
  function serviceRecords(rows,{kind='maintenance',from,to,focus='',origin='',through=SNAPSHOT}={}) {
    if(kind==='supplies')return currentSupplies(rows).filter(i=>['due','soon','unknown'].includes(i.key)&&(!focus||i.key===focus));
    if(kind==='error'&&origin==='dashboard')return dashboardErrors(rows,{from,to,through});
    if(kind==='error'&&focus==='error')return serviceHistory(rows).filter(r=>r.kind==='error'&&!r.resolved);
    return serviceHistory(rows).filter(r=>r.kind===kind&&(!from||r.occurredAt.slice(0,10)>=from)&&(!to||r.occurredAt.slice(0,10)<=to)&&(!focus||focus!=='error'||!r.resolved));
  }
  // Adapt web history to the existing mobile pushType/message/pushDatetime fields.
  const PUSH_TYPES = {
    shock:{label:'실시간 충격',icon:'vibrate',view:'shock'},
    error:{label:'실시간 차량 에러',icon:'triangle-alert',view:'error'},
    'battery-li':{label:'실시간 배터리 경고',icon:'battery',view:'battery'},
    'battery-la':{label:'실시간 배터리 경고',icon:'battery',view:'battery'},
    supplies:{label:'소모품',icon:'refresh-cw',view:'supplies'},
    maintenance:{label:'정비',icon:'clipboard-list',view:'maintenance'},
    fuel:{label:'연료',icon:'fuel',view:'engine'},
    operation:{label:'운행정보',icon:'chart-no-axes-combined',view:'operation'}
  };
  function pushPresentation(item) {
    return Object.hasOwn(PUSH_TYPES,item.pushType)?PUSH_TYPES[item.pushType]:{label:'알림',icon:'bell',view:''};
  }
  // A warning notification represents the first nonzero warning bucket per VIN.
  // Its count already exists in the web series; never add it to the totals again.
  function shockEvents(rows) {
    const date=W.common.dates.format(W.common.dates.yesterday(new Date()));
    return rows.flatMap(v=>{
      const d=W.shocks([v],'d',date,date);
      const hour=d.series.s5.findIndex(n=>n>0);
      return hour<0?[]:[{id:'web-shock-'+v.vin+'-'+date,equipmentId:v.equipmentId,occurredAt:date+' '+String(hour).padStart(2,'0')+':00',g:2.5,count:d.series.s5[hour]}];
    });
  }
  function notificationWindow(now=SNAPSHOT) {
    const end=new Date(String(now).replace(' ','T')+':00Z');
    const start=new Date(end.getTime()-30*86400000);
    return {from:start.toISOString().slice(0,16).replace('T',' '),to:end.toISOString().slice(0,16).replace('T',' ')};
  }
  function recentNotifications(records,now=SNAPSHOT) {
    const range=notificationWindow(now);
    return records.filter(item=>typeof item.pushDatetime==='string'&&/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(item.pushDatetime)&&item.pushDatetime>range.from&&item.pushDatetime<=range.to)
      .slice().sort((a,b)=>b.pushDatetime.localeCompare(a.pushDatetime));
  }
  function pushHistory(rows,records) {
    if(!records){
      const errors=serviceHistory(rows).filter(r=>r.kind==='error').map(r=>({id:'push-'+r.id,equipmentId:r.equipmentId,pushType:'error',message:r.vin+ '\n'+r.code+' · '+r.description,pushDatetime:r.occurredAt,errorRecordId:r.id}));
      const shocks=shockEvents(rows).map(e=>({id:'push-'+e.id,equipmentId:e.equipmentId,pushType:'shock',message:rows.find(v=>v.equipmentId===e.equipmentId).vin+'\n경고 충격 '+e.count+'건이 발생했습니다.',pushDatetime:e.occurredAt,shockEventId:e.id,shockG:e.g}));
      const batteries=rows.flatMap(v=>{
        if(v.type!=='리튬'||!v.receivedAt||v.receivedAt>SNAPSHOT)return [];
        const info=W.lithium.snapshot(v);
        if(!info.known)return [];
        return [['temperature','온도'],['charge','충전'],['battery','배터리']].filter(([key])=>['주의','경고','이상'].includes(info[key])).map(([key,label])=>({
          id:'push-battery-'+v.vin+'-'+TODAY+'-'+key,equipmentId:v.equipmentId,pushType:'battery-li',
          message:v.vin+'\n'+label+' '+info[key]+' 상태가 확인되었습니다.',pushDatetime:v.receivedAt,batteryStateKey:key,batteryState:info[key]
        }));
      });
      records=errors.concat(shocks,batteries).sort((a,b)=>b.pushDatetime.localeCompare(a.pushDatetime));
    }
    
  // Preserve response order, as the source does; fixture order is newest first.
    return records.filter(item=>rows.some(v=>v.equipmentId===item.equipmentId))
      .map((item,i)=>({...item,id:item.id||'push-row-'+i}));
  }
  // Legacy dashboard unread fixture, retained as an original-source reference only.
  // r50: the mobile bell uses the scoped inbox total, not this unread value.
  function unreadPushCount(role) { return ({customer_owner:3,customer_staff:2})[role]??null; }
  function counts(rows,options={}) {
    const connected = rows.filter(v=>v.conn).length;
    const running = rows.filter(v=>v.operating === true).length;
    const supplies=supplySummary(rows);
    return {total:rows.length,connected,offline:rows.length-connected,running,idle:connected-running,
      error:dashboardErrors(rows,options).length,due:supplies.due,
      soon:supplies.soon,attention:rows.filter(attention).length,
      normal:rows.filter(v=>!attention(v)).length,operatingRate:connected ? Math.round(running/connected*100) : null};
  }
  function dates(period) {
    const date=calendarDate(TODAY);
    if(period==='d')return [TODAY,TODAY];
    if(period==='w'){const monday=shiftDay(date,-((date.getUTCDay()+6)%7));return [isoDay(monday),isoDay(shiftDay(monday,6))];}
    return [TODAY.slice(0,8)+'01',isoDay(new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)))];
  }
  // Match web common-logic.js operatingRange/linkedWeek/monthRange, using the
  // mobile collection cutoff instead of pretending the device clock is data.
  const isoDay=date=>date.toISOString().slice(0,10);
  function calendarDate(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return null;
    const date=new Date(value+'T00:00:00Z');
    return Number.isFinite(date.getTime())&&isoDay(date)===value?date:null;
  }
  function shiftDay(date,days) { const next=new Date(date);next.setUTCDate(next.getUTCDate()+days);return next; }
  function efficiencyRange(period,anchor=SNAPSHOT.slice(0,10),edge='start') {
    const mode=({d:'d',day:'d',daily:'d',w:'w',week:'w',weekly:'w',m:'m',month:'m',monthly:'m'})[period]||'m';
    const date=calendarDate(anchor)||calendarDate(SNAPSHOT.slice(0,10));
    let from=date,to=date;
    if(mode==='w'){from=edge==='end'?shiftDay(date,-6):date;to=edge==='end'?date:shiftDay(date,6);}
    if(mode==='m'){
      from=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),1));
      to=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0));
      const latest=calendarDate(SNAPSHOT.slice(0,10));
      if(from<=latest&&latest<to)to=latest;
    }
    return {period:mode,from:isoDay(from),to:isoDay(to)};
  }
  function efficiencyAvailableRange(from,to) {
    return {from:from<DATA_START?DATA_START:from,to:to>TODAY?TODAY:to};
  }
  function efficiencyPerformance(rows,from,to,options={}) {
    const result=webPerformance(rows,from,to,options);
    if(!result.web)return result;
    const period=resolvePeriod(from,to,options.period),base=period==='d'?1:10*(result.web.bucket||1);
    const capacity=result.web.columns.reduce((n,c)=>n+(c?Math.max(base,c.work+c.idle)*rows.length*60:0),0);
    return {...result,capacity,unused:Math.max(0,capacity-result.work-result.idle),rate:percent(result.work,capacity)};
  }
  function efficiencyWindow(from,to) {
    return {valid:Boolean(calendarDate(from)&&calendarDate(to)&&from<=to),from,to,through:to,label:'집계 '+from.slice(5).replace('-','.')+' 00:00~'+to.slice(5).replace('-','.')+' 24:00'};
  }
  function efficiencyCalendar(rows,period,from,to,options={}) {
    if(!calendarDate(from)||!calendarDate(to)||from>to)return [];
    const axis=W.charts.axis(period,from,to),whole=W.efficiency(rows,period,from,to),hourly=period==='d',base=hourly?60:600*(whole.bucket||1);
    return whole.columns.map((column,i)=>{
      const date=hourly?from:axis.dates[i],hour=hourly?String(i).padStart(2,'0')+'시':null;
      const entries=rows.map(v=>{
        const column=W.efficiency([v],period,from,to).columns[i],work=(column?.work||0)*60,idle=(column?.idle||0)*60;
        const m={...metrics(v,date,date,period),work,idle,min:work+idle,efficiency:percent(work,work+idle)};
        return {v,m,capacity:Math.max(base,work+idle),through:date,rate:percent(work,Math.max(base,work+idle)),idleRate:percent(idle,work+idle)};
      });
      const work=(column?.work||0)*rows.length*60,idle=(column?.idle||0)*rows.length*60,capacity=Math.max(rows.length*base,work+idle);
      return {date,hour,total:rows.length,known:rows.length,unknown:0,entries,work,idle,capacity,unused:Math.max(0,capacity-work-idle),workShare:percent(work,work+idle),rate:percent(work,capacity)};
    });
  }
  function resolvePeriod(from,to,period) {return ['d','w','m','c'].includes(period)?period:from===to?'d':'m';}
  function metrics(v,from,to,period) {
    if(!calendarDate(from)||!calendarDate(to)||from>to)return null;
    period=resolvePeriod(from,to,period);
    const value=W.summaryValue(v,period,from,to),time=W.times(v,value.min),shock=W.shocks([v],period,from,to);
    const shockBands=Object.fromEntries(Object.entries(shock.series).map(([key,values])=>[key,values.reduce((a,b)=>a+(b||0),0)]));
    return {min:time.running,work:time.working,idle:time.idle,km:value.km,shock:Object.values(shockBands).reduce((a,b)=>a+b,0),shockBands,efficiency:value.efficiency,fc:value.fuel,bc:value.battery};
  }
  function webPerformance(rows,from,to,options={}) {
    if(options.source==='dashboard')return dashboardPerformance(rows,from,to);
    const period=resolvePeriod(from,to,options.period),days=W.charts.axis(period,from,to).n;
    const result=W.efficiency(rows,period,from,to);
    const entries=rows.map(v=>{
      const values=W.efficiency([v],period,from,to),work=values.columns.reduce((n,c)=>n+(c?.work||0)*60,0),idle=values.columns.reduce((n,c)=>n+(c?.idle||0)*60,0);
      const m={...metrics(v,from,to,period),work,idle,min:work+idle,efficiency:percent(work,work+idle)};
      const capacity=Math.max(days*(period==='d'?60:600),m.min);
      return {v,m,through:to,capacity,rate:percent(work,capacity),idleRate:percent(idle,m.min)};
    });
    const work=entries.reduce((n,e)=>n+e.m.work,0),idle=entries.reduce((n,e)=>n+e.m.idle,0),capacity=entries.reduce((n,e)=>n+e.capacity,0);
    return {total:rows.length,known:entries.length,unknown:0,days,entries,work,idle,capacity,unused:Math.max(0,capacity-work-idle),rate:percent(work,capacity),workShare:percent(work,work+idle),waiting:entries.filter(e=>e.idleRate>=30&&e.m.idle>=30),web:result};
  }
  function dashboardPerformance(rows,from,to) {
    const window=W.meeting.hourlyWindow(new Date()),entries=rows.filter(v=>v.conn).map(v=>{
      const live=W.meeting.hourlyVehicle(v,window),time=W.times(v,live.runH*60),m={...metrics(v,from,to,'d'),min:time.running,work:time.working,idle:time.idle,km:live.km};
      m.efficiency=percent(m.work,m.min);
      return {v,m,through:window.date,capacity:window.hours*60,rate:percent(m.work,window.hours*60),idleRate:percent(m.idle,m.min)};
    }),work=entries.reduce((n,e)=>n+(e.m.work||0),0),idle=entries.reduce((n,e)=>n+(e.m.idle||0),0),capacity=entries.length*window.hours*60;
    return {total:rows.length,known:entries.length,unknown:rows.length-entries.length,days:1,entries,work,idle,capacity,unused:Math.max(0,capacity-work-idle),rate:percent(work,capacity),workShare:percent(work,work+idle),waiting:entries.filter(e=>e.idleRate>=30&&e.m.idle>=30)};
  }
  function reportValues(rows,from,to,period) {
    const groups=[...new Set(rows.map(v=>v.group))];
    const keys=['eff','shock','fuel','batt','dist','hour'];
    return Object.fromEntries(keys.map(key=>{
      const values=groups.map(group=>W.reportValue(group,key,resolvePeriod(from,to,period),from,to));
      return [key,values.length?(values[0].m.agg==='sum'?values.reduce((n,d)=>n+d.cur,0):values.reduce((n,d)=>n+d.cur,0)/values.length):null];
    }));
  }
  
  const percent=(part,total)=>total ? Math.round(part/total*1000)/10 : null;
  function performance(rows,from,to,options={}) {return webPerformance(rows,from,to,options);}
  function dailyEfficiency(rows,from,to,options={}) {
    const report=performance(rows,from,to,options);
    if(!report.days||report.days>366)return [];
    return Array.from({length:report.days},(_,i)=>{
      const date=isoDay(shiftDay(calendarDate(from),i));
      return {date,...performance(rows,date,date,options)};
    });
  }
  function requestContext(v,state) {
    return {equipmentId:v.equipmentId,companyId:COMPANY,group:v.group,startDate:state.from,endDate:state.to,
      periodType:state.period,date:state.from.replaceAll('-','')};
  }
  return {SNAPSHOT,TODAY,DATA_START,ENERGY_MONTH,STATUS,DISPLAY,SHOCK_LEVELS,shockLevel,chargeWindow,assignedGroup,reportValues,web:W,createApprovalStore,periodWindow,hourlyWindow,dashboardWindow,dashboardErrors,currentSupplies,supplySummary,fleetState,COMPANY,ROLE_LABELS,buildVehicles,scope,listed,attention,counts,dates,calendarDate,efficiencyRange,efficiencyPerformance,efficiencyWindow,efficiencyCalendar,metrics,performance,dailyEfficiency,serviceItems,supplyItems,resetSupplies,undoSupplyReset,serviceHistory,serviceRecords,pushHistory,pushPresentation,shockEvents,notificationWindow,recentNotifications,unreadPushCount,requestContext};
});
