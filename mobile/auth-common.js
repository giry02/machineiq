// Shared customer-mobile form policy. Local UI validation, not server authentication.
(function(root){
  'use strict';
  const email=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const password=/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
  const username=/^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]{6,}$/;
  const api=Object.freeze({
    email,password,
    userId:value=>email.test(value)||username.test(value),
    role:search=>new URLSearchParams(search).get('role')==='customer_staff'?'customer_staff':'customer_owner',
    key:name=>'linq-customer-prototype-'+name
  });
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.CustomerAuthCommon=api;
})(typeof window==='undefined'?globalThis:window);
