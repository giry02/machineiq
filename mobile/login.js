(() => {
  const form = document.querySelector('#mobile-login-form');
  const idInput = document.querySelector('#login-id');
  const passwordInput = document.querySelector('#login-password');
  const saveId = document.querySelector('#save-id');
  const toggle = document.querySelector('#password-toggle');
  const toast = document.querySelector('.login-toast');
  let toastTimer;
  const role=new URLSearchParams(window.location.search).get('role')==='customer_staff'?'customer_staff':'customer_owner';
  const key=name=>'linq-customer-prototype-'+name;
  const read=name=>sessionStorage.getItem(key(name));
  const remove=name=>sessionStorage.removeItem(key(name));
  const passwordRule=/^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
  let attempts=Number(read('login-attempts')||0);
  const temporary=read('temporary-password');
  const tempValid=()=>temporary&&Number(read('temporary-expires'))>Date.now();
  const submit=form.querySelector('[type="submit"]');
  function lock(){[idInput,passwordInput,saveId,submit].forEach(input=>input.disabled=attempts>=5);}
  lock();
  document.querySelectorAll('a[href="./find-password.html"], a[href="./signup.html"]').forEach(link=>{link.href+='?role='+role;});
  const forced=document.querySelector('#forced-password-panel');
  const forcedForm=document.querySelector('#forced-password-form');
  const goHome=()=>{sessionStorage.setItem(key('authenticated-role'),role);window.location.href='./index.html#home?role='+role;};
  function showForced(){form.hidden=true;document.querySelector('.login-card__head').hidden=true;forced.hidden=false;document.querySelector('#forced-password').focus();}
  forcedForm.addEventListener('submit',event=>{
    event.preventDefault();const next=document.querySelector('#forced-password'),confirm=document.querySelector('#forced-password-confirm');
    if(!passwordRule.test(next.value))return showToast('비밀번호는 영문·숫자·특수문자를 포함해 12자 이상 입력해 주세요.');
    if(next.value!==confirm.value)return showToast('새 비밀번호가 일치하지 않습니다.');
    if(next.value===temporary)return showToast('임시 비밀번호와 다른 비밀번호를 입력해 주세요.');
    ['temporary-password','temporary-expires','temporary-identifier','force-password-change'].forEach(remove);
    next.value='';confirm.value='';passwordInput.value='';goHome();
  });

  const savedId = localStorage.getItem('linq-customer-prototype-saved-identifier');
  if (savedId) idInput.value = savedId;
  if(tempValid()){idInput.value=read('temporary-identifier')||idInput.value;passwordInput.value=temporary;}
  if(tempValid()&&read('force-password-change')==='true')showForced();

  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 2200);
  }

  toggle.addEventListener('click', () => {
    const visible = passwordInput.type === 'text';
    passwordInput.type = visible ? 'password' : 'text';
    toggle.setAttribute('aria-label', visible ? '비밀번호 표시' : '비밀번호 숨기기');
    toggle.innerHTML = `<i data-lucide="${visible ? 'eye' : 'eye-off'}"></i>`;
    window.lucide?.createIcons({attrs:{'stroke-width':2}});
  });

  form.addEventListener('submit', event => {
    event.preventDefault();
    if(attempts>=5)return showToast('비밀번호를 5회 연속 잘못 입력하여 계정이 잠겼습니다.');
    const id=idInput.value.trim();let pending;
    try{pending=JSON.parse(read('pending-signup')||'null');}catch(error){}
    if(pending&&[pending.userId,pending.email].some(value=>String(value).toLowerCase()===id.toLowerCase()))return showToast('가입 승인 대기 중입니다. 승인 완료 후 로그인할 수 있습니다.');
    if(!form.reportValidity())return;
    if(!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(id)||/^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]{6,}$/.test(id)))return showToast('사용자 ID 또는 이메일을 확인해 주세요.');
    if(!passwordRule.test(passwordInput.value))return showToast('비밀번호는 영문·숫자·특수문자를 포함해 12자 이상 입력해 주세요.');
    const matching=tempValid()&&passwordInput.value===temporary&&id.toLowerCase()===String(read('temporary-identifier')).toLowerCase();
    if(passwordInput.value!=='password12!@'&&!matching){attempts++;sessionStorage.setItem(key('login-attempts'),String(attempts));lock();return showToast(attempts>=5?'계정이 잠겼습니다. 관리자에게 문의해 주세요.':'비밀번호가 일치하지 않습니다.');}
    remove('login-attempts');
    if (saveId.checked) localStorage.setItem('linq-customer-prototype-saved-identifier', idInput.value.trim());
    else localStorage.removeItem('linq-customer-prototype-saved-identifier');
    if(matching){sessionStorage.setItem(key('force-password-change'),'true');showForced();return;}
    goHome();
  });

  document.querySelector('#login-language').addEventListener('change', event => {
    showToast(event.target.value === 'ko' ? '한국어로 설정되었습니다.' : 'English 화면은 추후 연결됩니다.');
  });
  document.querySelectorAll('[data-demo-action]').forEach(button => button.addEventListener('click', () => showToast(`${button.dataset.demoAction} 기능은 실제 계정 서버 연결 시 제공됩니다.`)));
  window.lucide?.createIcons({attrs:{'stroke-width':2}});
})();
