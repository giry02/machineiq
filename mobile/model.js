/* Confirmation-only adapter: archived IMQ equipmentId is NOT the displayed VIN.
   No production API, authentication, native bridge or persistent write is used. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CustomerPrototype = api;
})(typeof window === 'undefined' ? globalThis : window, function () {
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
  const DISPLAY = {
    number:(value,unit='')=>Number.isFinite(value)?value.toLocaleString('ko-KR')+unit:'-',
    duration:(minutes,compact=false)=>Number.isFinite(minutes)&&minutes>=0?(compact?`${Math.floor(minutes/60)}h ${minutes%60}m`:`${Math.floor(minutes/60)}시간 ${minutes%60}분`):'-',
    efficiency:value=>Number.isFinite(value)?value.toLocaleString('ko-KR')+'%':'-'
  };
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
  const ROLE_LABELS = {customer_owner:'고객 대표',customer_staff:'고객 직원',customer_group_leader:'고객 그룹장'};
  // First vehicle's two records match web Service/service-supply-tobe.html.
  // The other two VINs retain the mobile due/soon scenario with explicit display fixtures (not an API join).
  const SUPPLY_ITEMS = {
    FBA32_224250271:[{itemId:'transmission-oil',name:'트랜스미션 오일',cycleHours:100,usedHours:231,lastChangedAt:'2026-03-18 10:20'},{itemId:'hydraulic-filter',name:'작동유 필터',cycleHours:250,usedHours:231,lastChangedAt:'2026-03-18 10:20'}],
    FBA20_224250312:[{itemId:'transmission-filter',name:'트랜스미션 오일 필터',cycleHours:100,usedHours:105,lastChangedAt:null}],
    FBA25_224250188:[{itemId:'air-cleaner',name:'에어클리너',cycleHours:300,usedHours:251,lastChangedAt:null}]
  };
  function supplyItems(v) {
    return (v.supplies||[]).map(item=>{
      const valid=Number.isFinite(item.cycleHours)&&item.cycleHours>0&&Number.isFinite(item.usedHours)&&item.usedHours>=0;
      const percent=valid?Math.round(item.usedHours/item.cycleHours*100):null;
      const key=percent==null?'unknown':percent>=100?'due':percent>=80?'soon':'normal';
      return {...item,percent,key,kind:'supplies',label:STATUS[key].label,count:1,id:v.equipmentId+'-supply-'+item.itemId,equipmentId:v.equipmentId,occurredAt:v.receivedAt||SNAPSHOT,resolved:false};
    });
  }
  function buildVehicles(fleet) {
    return fleet.vehicles.filter(v => v.companyId === COMPANY && !v.catalogOnly).map((v, i) => ({
      ...v, equipmentId:`demo-equipment-${String(i + 1).padStart(2,'0')}`,
      // Current-month energy averages are independently generated from source baselines.
      fc:demoEnergy(v.fc,TODAY),bc:demoEnergy(v.bc,TODAY),
      equipmentNumber:v.vin, equipmentName:v.model, codeName:v.model,
      fuelTypeCode:TYPES[v.type], modelYear:'2023',
      operating:v.conn ? [0,3,5,7].includes(i) : null,
      activeErrorCount:i === 0 ? 2 : i === 5 ? 1 : 0,
      supplies:(SUPPLY_ITEMS[v.vin]||[]).map(item=>({...item})),
      supplyDueCount:supplyItems({supplies:SUPPLY_ITEMS[v.vin]}).filter(r=>r.key==='due').length,
      supplySoonCount:supplyItems({supplies:SUPPLY_ITEMS[v.vin]}).filter(r=>r.key==='soon').length,
      receivedAt:v.conn ? SNAPSHOT : isoDay(shiftDay(calendarDate(TODAY),-1))+' 17:42',
      // Explicitly added demo records; never claim these are source API responses.
      position:i === 0 ? {lat:37.031991,lng:126.770275,address:'경기도 화성시 · 최종 수신 위치'} : null,
      batteryVoltage:v.type === '리튬' ? 80 : null,
      batteryCapacity:v.type === '리튬' ? 560 : null
    }));
  }
  function scope(rows, state) {
    return rows.filter(v => state.role === 'customer_owner' || v.group === '기본그룹')
      .filter(v => state.role !== 'customer_owner' || !state.group || v.group === state.group)
      .filter(v => !state.type || v.type === state.type);
  }
  function attention(v) { return !v.conn || v.activeErrorCount > 0 || v.supplyDueCount > 0 || v.supplySoonCount > 0; }
  // Reuse the existing confirmation fixtures, including the clearly labelled completed example.
  function serviceItems(v) {
    return [
      ...(v.activeErrorCount?[{kind:'error',key:'error',label:'에러',count:v.activeErrorCount,status:'확인 필요'}]:[]),
      ...(v.supplyDueCount?[{kind:'supplies',key:'due',label:'교체 필요',count:v.supplyDueCount,status:'교체 필요'}]:[]),
      ...(v.supplySoonCount?[{kind:'supplies',key:'soon',label:'교체 임박',count:v.supplySoonCount,status:'교체 예정'}]:[]),
      {kind:'maintenance',key:'maintenance',label:'정기 점검',count:1,status:'처리완료',date:isoDay(shiftDay(calendarDate(TODAY),-3)),example:true}
    ];
  }
  function listed(rows, state) {
    const q = (state.q || '').toLowerCase().trim();
    return scope(rows,state).filter(v => !q || `${v.equipmentNumber} ${v.model} ${v.group}`.toLowerCase().includes(q))
      .filter(v => !state.live || (state.live === 'connected' ? v.conn : state.live === 'offline' ? !v.conn : state.live === 'running' ? v.operating === true : state.live === 'idle' ? v.operating === false : state.live === 'error' ? v.activeErrorCount > 0 : state.live === 'due' ? v.supplyDueCount > 0 : state.live === 'soon' ? v.supplySoonCount > 0 : true));
  }
  // Explicit confirmation records. These dates are not inferred from active counters in a production API.
  function serviceHistory(rows) {
    const months=[];
    for(let date=calendarDate(DATA_START);isoDay(date).slice(0,7)<=TODAY.slice(0,7);date=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,1)))months.push(isoDay(date).slice(0,7));
    return months.flatMap(month=>{
      const current=month===TODAY.slice(0,7),anchor=calendarDate(current?TODAY:month+'-06');
      const day=offset=>isoDay(shiftDay(anchor,offset)),suffix=current?'':'-'+month;
      return rows.flatMap(v=>[
        {id:v.equipmentId+'-maintenance-1'+suffix,equipmentId:v.equipmentId,kind:'maintenance',label:'정기 점검',occurredAt:day(-3)+' 10:00',resolvedAt:day(-3)+' 11:00',resolved:true,count:1},
        ...Array.from({length:v.activeErrorCount},(_,i)=>({id:v.equipmentId+'-error-'+i+suffix,equipmentId:v.equipmentId,kind:'error',label:'차량 에러',code:null,occurredAt:day(0)+' '+(current?String(Math.max(0,Number(SNAPSHOT.slice(11,13))-(i?2:6))).padStart(2,'0'):(i?'13':'09'))+':00',resolvedAt:current?null:day(1)+' 09:00',resolved:!current,count:1})),
        ...(v.equipmentId==='demo-equipment-01'?[{id:v.equipmentId+'-error-resolved'+suffix,equipmentId:v.equipmentId,kind:'error',label:'차량 에러',code:null,occurredAt:day(-4)+' 11:00',resolvedAt:day(-3)+' 09:00',resolved:true,count:1}]:[])
      ]);
    }).sort((a,b)=>b.occurredAt.localeCompare(a.occurredAt)||a.id.localeCompare(b.id));
  }
  function serviceRecords(rows,{kind='maintenance',from,to,focus=''}={}) {
    if(kind==='supplies')return rows.flatMap(supplyItems).filter(i=>!focus||i.key===focus);
    return serviceHistory(rows).filter(r=>r.kind===kind&&(!from||r.occurredAt.slice(0,10)>=from)&&(!to||r.occurredAt.slice(0,10)<=to)&&(!focus||focus!=='error'||!r.resolved));
  }
  // Source push.vue uses pushType/message/pushDatetime and equipmentId. These
  // independent fixtures are not service counters or inferred warning thresholds.
  const PUSH_TYPES = {
    shock:{label:'실시간 충격',icon:'zap',view:'shock'},
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
  function pushHistory(rows,records) {
    if(!records){
      const ago=minutes=>new Date(calendarDate(TODAY).getTime()+Number(SNAPSHOT.slice(11,13))*3600000-minutes*60000).toISOString().slice(0,16).replace('T',' ');
      const fixtures=[
        ['demo-equipment-01','shock','차량에 충격이 발생했습니다.',20],
        ['demo-equipment-06','error','차량 에러가 발생했습니다.',65],
        ['demo-equipment-04','battery-li','배터리 경고가 발생했습니다.',100],
        ['demo-equipment-01','error','차량 에러가 발생했습니다.',160],
        ['demo-equipment-08','shock','차량에 충격이 발생했습니다.',1500]
      ];
      records=fixtures.map(([equipmentId,pushType,message,minutes],i)=>({id:'push-'+(i+1),equipmentId,pushType,message:(rows.find(v=>v.equipmentId===equipmentId)?.equipmentNumber||'')+'\n'+message,pushDatetime:ago(minutes)}));
    }
    // Preserve response order, as the source does; fixture order is newest first.
    return records.filter(item=>rows.some(v=>v.equipmentId===item.equipmentId))
      .map((item,i)=>({...item,id:item.id||'push-row-'+i}));
  }
  // Separate dashboard response fixture: unreadPushCnt is neither unresolved
  // service count nor history length. Source exposes no client read-update API.
  function unreadPushCount(role) { return ({customer_owner:3,customer_staff:2,customer_group_leader:2})[role]??null; }
  function counts(rows) {
    const connected = rows.filter(v=>v.conn).length;
    const running = rows.filter(v=>v.operating === true).length;
    return {total:rows.length,connected,offline:rows.length-connected,running,idle:connected-running,
      error:rows.filter(v=>v.activeErrorCount > 0).length,due:rows.filter(v=>v.supplyDueCount > 0).length,
      soon:rows.filter(v=>v.supplySoonCount > 0).length,attention:rows.filter(attention).length,
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
    const available=efficiencyAvailableRange(from,to);
    return performance(rows,available.from,available.to,options);
  }
  function efficiencyWindow(from,to) {
    const available=efficiencyAvailableRange(from,to);
    return periodWindow(available.from,available.to);
  }
  function efficiencyCalendar(rows,period,from,to,options={}) {
    let start=calendarDate(from),end=calendarDate(to);
    if(!start||!end||start>end)return [];
    if(period==='m')end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0));
    const count=Math.round((end-start)/86400000)+1;
    if(count>31)return [];
    return Array.from({length:count},(_,i)=>{const date=isoDay(shiftDay(start,i));return {date,...performance(rows,date,date,options)};});
  }
  // Deterministic monthly/daily fixtures, NOT telemetry. July source totals are preserved.
  // Later months vary by month and vehicle; today's row includes completed hours only.
  function demoFactor(month,v={equipmentId:'00'},offset=0) {
    if(month.slice(0,7)==='2026-07')return 1;
    return 0.86+((Number(month.slice(0,4))*12+Number(month.slice(5,7))+Number(v.equipmentId.slice(-2))+offset)%9)*0.04;
  }
  function demoEnergy(value,month) { return Number.isFinite(value)?Math.round(value*demoFactor(month)*10)/10:null; }
  function dailyAllocation(total, v, first, last, offset=0, length=31, month='2026-07') {
    const seed=Number(v.equipmentId.slice(-2));
    const weights=Array.from({length},(_,i)=>[10,14,8,12,3,5,16][(i+seed+offset)%7]);
    const sum=weights.reduce((a,b)=>a+b,0);
    const before=weights.slice(0,first-1).reduce((a,b)=>a+b,0);
    const through=weights.slice(0,last).reduce((a,b)=>a+b,0);
    let value=Math.floor(total*through/sum)-Math.floor(total*before/sum);
    if(month===TODAY.slice(0,7)&&last===Number(TODAY.slice(-2))){
      const untilYesterday=weights.slice(0,last-1).reduce((a,b)=>a+b,0);
      const fullDay=Math.floor(total*through/sum)-Math.floor(total*untilYesterday/sum);
      value-=fullDay-Math.floor(fullDay*Number(SNAPSHOT.slice(11,13))/24);
    }
    return value;
  }
  function metrics(v, from, to) {
    if(!calendarDate(from)||!calendarDate(to)||from>to)return null;
    const available=efficiencyAvailableRange(from,to);
    from=available.from;to=available.to;
    if(from>to||(from===TODAY&&SNAPSHOT.slice(11,13)==='00'))return null;
    if (!Number.isFinite(v.min)||v.min<0||!Number.isFinite(v.summaryDetail?.workMinutes)||v.summaryDetail.workMinutes<0) return null;
    let work=0,idle=0,distance=0,shock=0;
    for(let start=calendarDate(from);isoDay(start)<=to;){
      const month=isoDay(start).slice(0,7),end=new Date(Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,0));
      const first=start.getUTCDate(),last=month===to.slice(0,7)?Number(to.slice(-2)):end.getUTCDate();
      const allocate=(total,offset=0)=>dailyAllocation(Math.round(total*demoFactor(month,v,offset)),v,first,last,offset,end.getUTCDate(),month);
      const monthlyWork=Math.min(v.min,v.summaryDetail.workMinutes);
      work+=allocate(monthlyWork);idle+=allocate(v.min-monthlyWork,2);
      distance+=allocate(Math.round((v.km||0)*10));shock+=allocate(v.shock||0);
      start=shiftDay(end,1);
    }
    const min=work+idle;
    return {min,work,idle,km:Number.isFinite(v.km)&&v.km>=0?distance/10:null,shock:Number.isFinite(v.shock)&&v.shock>=0?shock:null,
      efficiency:min ? Math.round(work/min*1000)/10 : null,fc:v.fc ?? null,bc:v.bc ?? null};
  }
  const percent=(part,total)=>total ? Math.round(part/total*1000)/10 : null;
  function performance(rows, from, to, {today=false}={}) {
    const window=periodWindow(from,to),cutoff=SNAPSHOT.slice(0,10);
    const days=window.valid ? Math.round((calendarDate(to)-calendarDate(from))/86400000)+1 : 0;
    const all=rows.map(v=>{
      const receivedDate=v.receivedAt?.slice(0,10)||cutoff;
      const through=window.through&&receivedDate<window.through?receivedDate:window.through;
      const eligible=through&&from<=through&&(!today||v.conn);
      return {v,through,m:eligible?metrics(v,from,through):null};
    });
    const known=all.filter(x=>x.m);
    const entries=known.map(x=>{
      const observedDays=Math.round((calendarDate(x.through)-calendarDate(from))/86400000)+1;
      const elapsed=x.through===cutoff?(observedDays-1)*600+Math.max(0,Number(hourlyWindow().end.slice(11,13))-8)*60:observedDays*600;
      return {...x,capacity:Math.max(elapsed,x.m.min),rate:percent(x.m.work,Math.max(elapsed,x.m.min)),idleRate:percent(x.m.idle,x.m.min)};
    });
    const work=known.reduce((n,x)=>n+x.m.work,0),idle=known.reduce((n,x)=>n+x.m.idle,0);
    const capacity=entries.reduce((n,x)=>n+x.capacity,0);
    return {total:rows.length,known:known.length,unknown:rows.length-known.length,days,work,idle,
      unused:Math.max(0,capacity-work-idle),capacity,rate:percent(work,capacity),workShare:percent(work,work+idle),
      entries,
      waiting:entries.filter(x=>x.idleRate>=30&&x.m.idle>=30).sort((a,b)=>b.idleRate-a.idleRate)};
  }
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
  return {SNAPSHOT,TODAY,DATA_START,ENERGY_MONTH,STATUS,DISPLAY,periodWindow,hourlyWindow,COMPANY,ROLE_LABELS,buildVehicles,scope,listed,attention,counts,dates,calendarDate,efficiencyRange,efficiencyPerformance,efficiencyWindow,efficiencyCalendar,metrics,performance,dailyEfficiency,serviceItems,supplyItems,serviceHistory,serviceRecords,pushHistory,pushPresentation,unreadPushCount,requestContext};
});
