(function(){
  'use strict';
  var role=document.body.dataset.managementRole||MIQCommon.roles.resolve(new URLSearchParams(location.search).get('role'));
  var policy=MIQCommon.roles.targetPolicy(role);
  var source=window.MIQ_MOCK_DATA&&MIQ_MOCK_DATA.fleet;
  var companies=(source&&source.dashboardCompanies||[]).filter(function(c){return (!c.dashboardRoles||c.dashboardRoles.indexOf(role)>=0)&&(!policy.companyIds||policy.companyIds.indexOf(String(c.companyId))>=0);}).map(function(c){return c.companyName;});
  // These are the current customer management mock's three configured groups.
  // A server adapter must replace this with the authenticated company's group list.
  var groups=['기본그룹','테스트그룹','물류1팀'];
  var scope=window.MIQReportScope=MIQMeeting.reportScope(role,companies,groups,policy.group);
  function translate(s){return scope.customer?s.replace(/업체/g,'그룹').replace(scope.readOnly?/비교/g:/$^/g,'현황'):s;}
  function labels(){
    var main=document.querySelector('.main');if(!main)return;
    var walker=document.createTreeWalker(main,NodeFilter.SHOW_TEXT),node;
    while((node=walker.nextNode())){if(/^(SCRIPT|STYLE)$/.test(node.parentElement.tagName))continue;var next=translate(node.nodeValue);if(next!==node.nodeValue)node.nodeValue=next;}
    main.querySelectorAll('[aria-label],[title]').forEach(function(el){['aria-label','title'].forEach(function(a){var s=el.getAttribute(a);if(s&&translate(s)!==s)el.setAttribute(a,translate(s));});});
    if(scope.readOnly){
      main.querySelectorAll('.cmp-note,.compare-note,.tbl-note').forEach(function(el){el.hidden=true;});
      main.querySelectorAll('#coSel,#coWrap select').forEach(function(el){el.disabled=true;});
      main.querySelectorAll('#btnAdd,#btnDel').forEach(function(el){el.hidden=true;el.style.display='none';});
      var hint=document.getElementById('coHint');if(hint&&hint.textContent!=='내 그룹 조회')hint.textContent='내 그룹 조회';
    }
    document.title=translate(document.title);
  }
  document.addEventListener('DOMContentLoaded',function(){labels();new MutationObserver(labels).observe(document.querySelector('.main'),{childList:true,subtree:true,characterData:true});});
  scope.applyLabels=labels;
})();
