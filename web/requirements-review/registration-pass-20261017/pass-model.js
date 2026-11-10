/* Design state only: no real proof, DOB, identity, token, storage or network. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.MIQPassPreviewModel=factory();}(globalThis,function(){
  'use strict';
  var languages=['ko','en','de','ar','es','fr','it','ja'];
  function locale(value){return languages.includes(value)?value:'ko';}
  var channels=['pass-app','sms'];
  var countries=['KR','US','CN','JP','DE','AU','GB','FR'];
  function create(language,initialChannel,initialCountry){
    var lang=locale(language),country=initialCountry===undefined?'KR':countries.includes(initialCountry)?initialCountry:'',channel=channels.includes(initialChannel)?initialChannel:'pass-app',revision=0,request=0,status=country==='KR'?'before':'not-required',active=null;
    function snapshot(){return Object.freeze({language:lang,countryCode:country,method:country==='KR'?'phone':'birthdate',channel:country==='KR'?channel:null,passState:status,revision:revision,verified:country==='KR'&&status==='success'});}
    function invalidate(next){revision++;active=null;status=country==='KR'?(next||'reconfirm'):'not-required';return snapshot();}
    function changeLanguage(next){var normalized=locale(next);if(normalized===lang)return false;lang=normalized;invalidate('reconfirm');return true;}
    function changeCountry(next){if(typeof next!=='string'||(!countries.includes(next)&&next!=='')||next===country)return false;country=next;invalidate('reconfirm');return true;}
    function changeChannel(next){if(country!=='KR'||!channels.includes(next)||next===channel)return false;channel=next;invalidate('reconfirm');return true;}
    function start(){if(country!=='KR'||status==='pending')return null;invalidate('pending');active=Object.freeze({revision:revision,request:++request,channel:channel});return active;}
    function finish(ticket,result){if(country!=='KR'||status!=='pending'||!active||!ticket||ticket.revision!==active.revision||ticket.request!==active.request||ticket.channel!==active.channel||ticket.channel!==channel||!['success','underage','cancelled','failed','expired'].includes(result))return false;status=result;active=null;return true;}
    function canContinue(requiredAccepted,manualEligible){return requiredAccepted===true&&!!country&&(country==='KR'?status==='success':manualEligible===true);}
    return Object.freeze({snapshot:snapshot,changeLanguage:changeLanguage,changeCountry:changeCountry,changeChannel:changeChannel,start:start,finish:finish,invalidate:invalidate,canContinue:canContinue});
  }
  return Object.freeze({create:create,normalizeLanguage:locale});
}));
