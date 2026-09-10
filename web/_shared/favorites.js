(function(){
  'use strict';
  var role=document.body.dataset.managementRole,main=document.querySelector('main');
  if(!MIQFavorites.isDealer(role)){main.textContent='딜러 전용 메뉴입니다.';return;}
  var pool=MIQFavorites.allowedPool(role,MIQ.FLEET_CATALOG||[]);
  var allowed=pool.map(function(v){return v.vin;});
  var stored=[],draft=[],status=document.getElementById('favoriteStatus');
  try{stored=MIQFavorites.read(role,pool);}catch(e){status.textContent='저장된 목록을 읽지 못했습니다. 차량을 다시 담아 주세요.';}
  draft=stored.slice();
  function esc(s){return String(s||'').replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  var source=document.getElementById('favoriteSource'),target=document.getElementById('favoriteTarget');
  var leftSearch=document.getElementById('favoriteSearchSource'),rightSearch=document.getElementById('favoriteSearchTarget');
  var company=document.getElementById('favoriteCompany');
  var companies=pool.map(function(v){return v.companyName;}).filter(function(v,i,a){return a.indexOf(v)===i;});
  company.innerHTML='<option value="">업체 전체</option>'+companies.map(function(c){return '<option>'+esc(c)+'</option>';}).join('');
  function filtered(side){var q=(side==='source'?leftSearch:rightSearch).value.trim().toLowerCase();return pool.filter(function(v){return (side==='target')===(draft.indexOf(v.vin)>=0)&&(!q||(v.companyName+' '+v.model+' '+v.vin+' '+v.type).toLowerCase().indexOf(q)>=0)&&(side==='target'||!company.value||company.value===v.companyName);});}
  function render(){
    ['source','target'].forEach(function(side){var rows=filtered(side),host=side==='source'?source:target;
      host.innerHTML=rows.map(function(v){return '<label class="xfer__it"><input type="checkbox" value="'+esc(v.vin)+'" aria-label="'+esc(v.vin)+' 선택"/><span><b>'+esc(v.model)+'</b> <span class="vin">'+esc(v.vin)+'</span><small>'+esc(v.companyName)+' · '+esc(v.type)+'</small></span></label>';}).join('')||'<p class="favorite-empty">'+(side==='target'?'담은 차량이 없습니다.':'조건에 해당하는 고객 차량이 없습니다.')+'</p>';
      document.getElementById(side==='source'?'favoriteSourceCount':'favoriteTargetCount').textContent=rows.length+'대';
    });
    var added=draft.filter(function(id){return stored.indexOf(id)<0;}).length,removed=stored.filter(function(id){return draft.indexOf(id)<0;}).length;
    document.getElementById('favoriteChanges').textContent=added||removed?'추가 '+added+'대 · 해제 '+removed+'대':'변경 없음';
    document.getElementById('favoriteSave').disabled=document.getElementById('favoriteCancel').disabled=!(added||removed);
    document.getElementById('favoriteTotal').textContent=draft.length;
  }
  document.getElementById('favoriteTransfer').addEventListener('click',function(e){
    var b=e.target.closest('[data-favorite-action]');if(!b)return;var action=b.dataset.favoriteAction,add=action.indexOf('add')===0,host=add?source:target;
    var ids=action.indexOf('all')>=0?filtered(add?'source':'target').map(function(v){return v.vin;}):Array.from(host.querySelectorAll('input:checked')).map(function(c){return c.value;});
    if(!ids.length){status.textContent='차량을 먼저 선택해 주세요.';return;}
    draft=add?MIQMeeting.favoriteIds(draft.concat(ids),allowed):draft.filter(function(id){return ids.indexOf(id)<0;});status.textContent='변경 후 저장해 주세요.';render();
  });
  [leftSearch,rightSearch].forEach(function(el){el.addEventListener('input',render);});company.addEventListener('change',render);
  document.getElementById('favoriteCancel').addEventListener('click',function(){draft=stored.slice();status.textContent='변경을 취소했습니다.';render();});
  document.getElementById('favoriteSave').addEventListener('click',function(){try{stored=MIQFavorites.save(role,draft,pool);draft=stored.slice();status.textContent='관심차량 '+stored.length+'대를 저장했습니다. (목업)';render();}catch(e){status.textContent='저장하지 못했습니다. 다시 시도해 주세요.';}});
  window.addEventListener('beforeunload',function(e){if(document.getElementById('favoriteSave').disabled)return;e.preventDefault();e.returnValue='';});
  render();
})();
