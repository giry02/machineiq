(function () {
  'use strict';
  // Localize only the selected preview's presentation. Source data, IDs and
  // date-controller values stay Korean/unchanged so language never runs a query.
  var copy = {
    '관심차량':'Favorites','상세 보기':'View details',
    '오늘 고장':'Today’s faults','오늘 수집 없음':'No data today',
    '가동시간 대비':'Of run time','작업시간':'Working time','대기시간':'Idle time','전체 가동시간':'Total running time','운영효율 = 작업시간 ÷ 가동시간':'Efficiency = working / running','운영효율 보기':'View efficiency',
    '대시보드':'Dashboard','대시보드 현황':'Dashboard status','선택안':'Selected layout','차량 연결 · 가동':'Fleet status',
    '정비 확인':'Maintenance','오늘 운행 실적':"Today's activity",'기간 운영 실적':'Period summary',
    '업체별 차량 현황':'Vehicle status by company','그룹별 차량 현황':'Vehicle status by group',
    '업체별 사용량 · 효율':'Usage & efficiency by company','그룹별 사용량 · 효율':'Usage & efficiency by group',
    '업체별 사용량':'Company usage','그룹별 사용량':'Group usage',
    '업체명 검색':'Search companies','그룹명 검색':'Search groups',
    '업체명 2글자 이상 입력':'Company name (2+ chars)','그룹명 2글자 이상 입력':'Group name (2+ chars)',
    '업체 검색 후보':'Company suggestions','그룹 검색 후보':'Group suggestions',
    '일치하는 업체가 없습니다.':'No matching companies.','일치하는 그룹이 없습니다.':'No matching groups.',
    '전체 업체':'All companies','전체 그룹':'All groups','조회 업체':'Company scope','조회 그룹':'Group scope',
    '현황 정렬':'Sort vehicle status','사용량 정렬':'Sort usage','이름순':'Name',
    '보유 차량순':'Fleet size','교체 필요순':'Due now','운영효율순':'Efficiency',
    '운행거리순':'Distance','운행시간순':'Hours','펼치기':'Expand','접기':'Collapse',
    '한 줄로 접기':'Collapse to one row','기본 목록으로 접기':'Collapse to one row',
    '전체 표시':'Show all','이전 페이지':'Previous page','다음 페이지':'Next page',
    '통신 연결':'Connectivity','차량 가동':'Utilization','연결 중 가동':'Of online fleet',
    '연결 차량 중 가동률':'Utilization of online fleet','산출 대상 없음':'No eligible vehicles',
    '차량·소모품':'Vehicles / consumables','고장 수집일':'Fault data date','최근 수집일':'Latest data date',
    '소모품 · 현재 상태':'Consumables · Current','고장 발생 건수 · 소모품 관리 항목 수':'Fault events · Consumable items',
    '교체 필요':'Due now','교체 임박':'Due soon','고장':'Faults','보유':'Fleet',
    '연결':'Online','미연결':'Offline','가동':'Running','유휴':'Idle','전체':'Total',
    '현재':'Current','오늘':'Today','지도 보기':'View map','가동시간':'Operating hours',
    '운행거리':'Distance','연료소비량':'Fuel used','배터리소비량':'Battery used',
    '월별 추이':'Monthly trends','추이 연도':'Trend year','연도 조회':'Apply year',
    '운영효율':'Operating efficiency','시간당 연료소비량':'Hourly fuel use',
    '배터리 충전량':'Battery charge','운행시간':'Operating hours','충격횟수':'Impacts',
    '엔진 차량 · 시간당 소비량':'Engine vehicles · Per hour',
    '월별 평균 충전량':'Monthly average charge','최근 월':'Latest month',
    '표시할 월별 기록이 없습니다.':'No monthly records available.',
    '집계 전':'Not yet available','이후 기록 없음':'No later records','평균':'Average','합계':'Total','발생':'Events',
    '기간 실적 조회':'Period performance','아래 운영 실적 · 고장 · 업체별 사용량에 적용':'Applies to the performance, faults and company usage below',
    '조회 기간 단위':'Period unit','조회 시작일':'Start date','조회 종료일':'End date','조회일':'Date',
    '일':'Day','주':'Week','월':'Month','조회':'Apply','기간':'Period','선택 기간 평균':'Period average',
    '기간 발생 건수':'Events in this period','시간당 소비량 · 평균':'Average per hour',
    '충전량 비율 · 평균':'Average charge percentage','기간 고장':'Period faults',
    '조회 기간의 전체 · 대당 값 / 비율은 평균':'Period totals · Per vehicle · Average rates',
    '운영효율 · 평균':'Average efficiency','운행 합계와 대당 값':'Totals and per-vehicle values',
    '충격횟수와 에너지 평균':'Impacts and energy averages','연료 / H':'Fuel / h','충전량':'Charge',
    '업체':'Company','그룹':'Group','검색':'Search','카드':'Cards','페이지':'Pages','단위':'Unit',
    '대':'','건':'','개':'','시간별':'Hourly',
    '운행이력':'History','서비스':'Service','리포트':'Reports','지도':'Map','관리기능':'Admin','운영관리':'Operations',
    '권한 설정':'Role','화면 권한 설정':'Account role','언어 선택':'Language',
    '내부 사용자':'Internal user','딜러 대표':'Dealer owner','딜러 직원':'Dealer staff',
    '고객 대표':'Customer owner','고객 직원':'Customer staff',
    '밥캣 운영 - 내부':'Bobcat Operations','로그아웃':'Log out',
    '이용약관':'Terms of use','위치정보 및 위치기반서비스 이용약관':'Location service terms',
    '개인(위치)정보 처리방침':'Privacy policy','오픈소스 고지':'Open-source notices','최종접속':'Last login',
    '조회 시작일과 종료일을 모두 입력해 주세요.':'Enter both a start date and an end date.',
    '조회 시작일은 종료일보다 늦을 수 없습니다.':'The start date must not be after the end date.',
    '사용자설정 기간은 최대 366일까지 조회할 수 있습니다.':'Select a range of no more than 366 days.'
  };
  var months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var phrases=Object.keys(copy).filter(function(k){return k.length>1;}).sort(function(a,b){return b.length-a.length;});
  var pattern=new RegExp('(?<![가-힣])('+phrases.map(function(k){return k.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}).join('|')+')(?![가-힣])','g');
  function translate(value){
    var text=String(value),trim=text.trim();
    if(Object.prototype.hasOwnProperty.call(copy,trim))return text.replace(trim,copy[trim]);
    text=text.replace(/검색 조건에 맞는 (업체|그룹)가 없습니다\./g,function(_,d){return 'No matching '+(d==='업체'?'companies':'groups')+'.';})
      .replace(/수집값 있는 ([\d,]+)대/g,'Data from $1 vehicles')
      .replace(/([\d,]+)개 (업체|그룹)/g,function(_,n,d){return n+' '+(d==='업체'?'companies':'groups');})
      .replace(/([\d,]+)개씩/g,'$1 per page').replace(/총 ([\d,]+)/g,'Total $1')
      .replace(/검색된 ([\d,]+) (companies|groups)/g,'$1 matching $2')
      .replace(/대당 ([\d,]+)(건)?/g,'Per vehicle $1')
      .replace(/월평균 범위 ([\d,]+[–\-][\d,]+)%/g,'Monthly range $1%')
      .replace(/월평균 ([\d,]+)% 수준/g,'Monthly average $1%')
      .replace(/(\d{1,2})월 (\d{1,2})일까지 집계/g,function(_,m,d){return 'Through '+months[+m-1]+' '+d;})
      .replace(/(\d{1,2})월 · (\d{1,2})일까지/g,function(_,m,d){return months[+m-1]+' 1–'+d;})
      .replace(/1–12월 집계/g,'January–December')
      .replace(/(\d{4})년 월별/g,'Monthly · $1').replace(/(\d{4})년/g,'$1')
      .replace(/(\d{1,2})월/g,function(_,m){return months[+m-1]||m;})
      .replace(/(\d{1,2})일까지/g,'through day $1')
      .replace(/(\d+)페이지/g,'Page $1').replace(/([\d,]+)대/g,'$1 vehicles')
      .replace(/([\d,]+)건/g,'$1 events').replace(/([\d,]+)개/g,'$1 items')
      .replace(/기준 · 1시간 단위/g,'as of · Hourly').replace(/ - 대표$/,' — Owner').replace(/ - 직원$/,' — Staff');
    text=text.replace(pattern,function(k){return copy[k];});
    text=text.replace(/(?<![가-힣])건(?![가-힣])/g,'events');
    if(/ 보기$/.test(text))text='View '+text.replace(/ 보기$/,'');
    return text;
  }
  var textRecords=new WeakMap(),attributeRecords=new WeakMap(),observer,roots=[],language='ko';
  var attributeNames=['aria-label','title','placeholder','data-chart-tip'];
  function excluded(el){return el.closest('.dc-source,script,style,.dc-entity-name,[translate="no"]')||(el.matches('#dcScope option')&&el.value!=='');}
  function localizeText(node){
    var record=textRecords.get(node),current=node.nodeValue;
    if(!record||current!==record.last)record={original:current,last:current};
    var next=language==='en'?translate(record.original):record.original;
    if(current!==next)node.nodeValue=next;
    record.last=next;textRecords.set(node,record);
  }
  function localizeElement(el){
    if(excluded(el))return;
    var records=attributeRecords.get(el)||{};
    attributeNames.forEach(function(name){
      if(!el.hasAttribute(name))return;
      var current=el.getAttribute(name),record=records[name];
      if(!record||record.last!==current)record={original:current,last:current};
      var next=language==='en'?translate(record.original):record.original;
      if(current!==next)el.setAttribute(name,next);
      record.last=next;records[name]=record;
    });
    attributeRecords.set(el,records);
    Array.from(el.childNodes).forEach(function(node){if(node.nodeType===3)localizeText(node);else if(node.nodeType===1)localizeElement(node);});
  }
  function observe(){roots.forEach(function(root){observer.observe(root,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:attributeNames});});}
  function apply(){
    observer.disconnect();
    roots.forEach(localizeElement);
    document.documentElement.lang=language;
    document.title=document.body.dataset.screenId==='LQ-DASH-001'
      ?(language==='en'?'Dashboard | MACHINE IQ':'대시보드 | MACHINE IQ')
      :(language==='en'?'Dashboard · Operating efficiency | MACHINE IQ':'대시보드 · 운영효율 비교안 | MACHINE IQ');
    var select=document.querySelector('.gnb__language select');if(select)select.value=language;
    observe();
  }
  function init(){
    var dashboard=document.getElementById('dashboardContent'),select=document.querySelector('.gnb__language select');
    if(!dashboard||!select)return;
    var requested=new URLSearchParams(location.search).get('lang'),saved;
    try{saved=localStorage.getItem('miq-language');}catch(error){}
    language=requested==='en'||requested!=='ko'&&saved==='en'?'en':'ko';
    roots=[dashboard,document.querySelector('.gnb'),document.querySelector('.miq-page-foot')].filter(Boolean);
    observer=new MutationObserver(apply);
    select.addEventListener('change',function(){
      language=select.value==='en'?'en':'ko';
      try{localStorage.setItem('miq-language',language);}catch(error){}
      var url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(history.state,'',url.href);
      if(window.MIQCharts)MIQCharts.hide();
      apply();
    });
    dashboard.addEventListener('invalid',function(event){
      if(language==='en'&&event.target.validity.customError)event.target.setCustomValidity(translate(event.target.validationMessage));
    },true);
    apply();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
