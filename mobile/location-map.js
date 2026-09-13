/* Existing app's Maps JavaScript API and map ID; no vehicle/backend API calls. */
(() => {
  'use strict';
  const $=selector=>document.querySelector(selector);
  const canvas=$('#location-map'),dialog=$('#location-dialog');
  let map,marker,sdkPromise,active=null,epoch=0,authFailed=false;
  const valid=p=>p&&Number.isFinite(p.lat)&&Number.isFinite(p.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
  function status(message,error=false) {
    $('#location-map-status-text').textContent=message;
    $('#location-map-status').hidden=!message;
    $('#location-map-external').hidden=!error;
    canvas.setAttribute('aria-busy',String(Boolean(message)&&!error));
  }
  function fail() {
    if(active)status('지도를 불러오지 못했습니다. 연결 상태 또는 지도 키의 허용 주소를 확인해 주세요.',true);
  }
  function loadConfig() {
    if(window.CustomerMapConfig?.apiKey)return Promise.resolve(window.CustomerMapConfig);
    return new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      const timer=setTimeout(()=>finish(false),10000);
      let done=false;
      function finish(ok) {
        if(done)return;done=true;clearTimeout(timer);script.remove();
        if(ok&&window.CustomerMapConfig?.apiKey)resolve(window.CustomerMapConfig);
        else reject(new Error('Map configuration unavailable'));
      }
      script.src='./map-config.local.js';script.onload=()=>finish(true);script.onerror=()=>finish(false);
      document.head.appendChild(script);
    });
  }
  function loadSdk() {
    if(sdkPromise)return sdkPromise;
    sdkPromise=loadConfig().then(config=>{
      if(!config.mapId)throw new Error('Map ID unavailable');
      if(window.google?.maps?.importLibrary)return {config,maps:window.google.maps};
      return new Promise((resolve,reject)=>{
        const script=document.createElement('script');
        let done=false;
        const timer=setTimeout(()=>finish(false),20000);
        function finish(ok) {
          if(done)return;done=true;clearTimeout(timer);
          if(ok&&!authFailed)resolve({config,maps:window.google.maps});
          else {script.remove();reject(new Error('Map SDK unavailable'));}
        }
        window.__linqCustomerMapsReady=()=>finish(true);
        const previous=window.gm_authFailure;
        window.gm_authFailure=()=>{authFailed=true;finish(false);fail();if(typeof previous==='function')previous();};
        const params=new URLSearchParams({key:config.apiKey,v:'quarterly',loading:'async',callback:'__linqCustomerMapsReady',language:'ko',region:'KR'});
        script.src='https://maps.googleapis.com/maps/api/js?'+params;
        script.async=true;script.referrerPolicy='strict-origin-when-cross-origin';script.onerror=()=>finish(false);
        document.head.appendChild(script);
      });
    }).then(async ({config,maps})=>{
      const [mapLibrary,markerLibrary]=await Promise.all([maps.importLibrary('maps'),maps.importLibrary('marker')]);
      return {config,maps,Map:mapLibrary.Map,AdvancedMarkerElement:markerLibrary.AdvancedMarkerElement};
    }).catch(error=>{sdkPromise=null;throw error;});
    return sdkPromise;
  }
  function markerContent(vehicle) {
    const content=document.createElement('div');content.className='customer-map-marker';
    const title=document.createElement('strong');title.textContent=vehicle.equipmentNumber;
    const symbol=document.createElement('span');
    const truck=window.lucide?.icons?.Truck;
    if(truck)symbol.appendChild(window.lucide.createElement(truck,{'aria-hidden':'true','stroke-width':2}));
    content.append(title,symbol);return content;
  }
  async function open(vehicle) {
    if(!valid(vehicle))return;
    const ticket=++epoch;active={...vehicle};
    $('#location-map-external').href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(vehicle.lat+','+vehicle.lng);
    status('지도를 불러오는 중입니다.');
    if(authFailed){fail();return;}
    try {
      const sdk=await loadSdk();
      if(ticket!==epoch||!dialog.open||authFailed)return;
      const center={lat:vehicle.lat,lng:vehicle.lng};
      if(!map) {
        map=new sdk.Map(canvas,{
          center,zoom:16,minZoom:3,maxZoom:21,mapId:sdk.config.mapId,
          disableDefaultUI:true,fullscreenControl:false,mapTypeControl:false,streetViewControl:false,
          zoomControl:false,scaleControl:true,keyboardShortcuts:true,clickableIcons:false,
          gestureHandling:'greedy',scrollwheel:true,tilt:0,heading:0
        });
      } else {map.setCenter(center);map.setZoom(16);}
      if(marker)marker.map=null;
      marker=new sdk.AdvancedMarkerElement({map,position:center,title:vehicle.equipmentNumber,content:markerContent(vehicle)});
      status('');resize();
    } catch {if(ticket===epoch)fail();}
  }
  function resize() {
    if(!map||!active)return;
    const ticket=epoch,center=map.getCenter();
    requestAnimationFrame(()=>{
      if(ticket!==epoch||!dialog.open)return;
      window.google.maps.event.trigger(map,'resize');map.setCenter(center);
    });
  }
  function close() {
    ++epoch;active=null;if(marker)marker.map=null;
  }
  window.CustomerLocationMap={open,close,resize};
})();
