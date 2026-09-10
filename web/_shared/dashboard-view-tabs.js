(function(){
  'use strict';
  var role=MIQCommon.roles.resolve(document.body.dataset.managementRole||new URLSearchParams(location.search).get('role'));
  if(['internal','dealer_owner','dealer_staff'].indexOf(role)<0)return;
  var tabs=document.querySelector('.dashboard-view-tabs');
  var panels=[document.querySelector('.dashboard-live'),document.querySelector('.dashboard-period')];
  if(!tabs||panels.some(function(panel){return !panel;}))return;
  var buttons=Array.prototype.slice.call(tabs.querySelectorAll('[data-dashboard-view]'));
  if(buttons.length!==panels.length)return;
  panels.forEach(function(panel,index){
    panel.id=buttons[index].getAttribute('aria-controls');
    panel.setAttribute('role','tabpanel');
    panel.setAttribute('aria-labelledby',buttons[index].id);
    panel.setAttribute('data-dashboard-view-panel','');
    panel.tabIndex=0;
  });
  function select(index,focus){
    buttons.forEach(function(button,current){
      var selected=current===index;
      button.classList.toggle('active',selected);
      button.setAttribute('aria-selected',String(selected));
      button.tabIndex=selected?0:-1;
      panels[current].hidden=!selected;
    });
    // Keep each existing panel mounted, including its date inputs and role restrictions.
    if(window.MIQCharts)MIQCharts.hide();
    if(focus)buttons[index].focus();
  }
  buttons.forEach(function(button,index){
    button.addEventListener('click',function(){select(index,false);});
    button.addEventListener('keydown',function(event){
      var next;
      if(event.key==='ArrowRight')next=(index+1)%buttons.length;
      else if(event.key==='ArrowLeft')next=(index+buttons.length-1)%buttons.length;
      else if(event.key==='Home')next=0;
      else if(event.key==='End')next=buttons.length-1;
      else return;
      event.preventDefault();
      select(next,true);
    });
  });
  select(0,false);
  tabs.hidden=false;
})();
