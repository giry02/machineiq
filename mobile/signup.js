(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;
  // 데모 검수 중에는 단계 이동과 가입 신청을 막지 않습니다.
  // 운영 전환 시 false로 변경하면 아래에 보존한 약관·입력·인증 차단 조건이 다시 적용됩니다.
  const DEMO_UNLOCKED = false;
  const countryData = {
    KR:{prefix:'+82',region:'ALAO'}, US:{prefix:'+1',region:'ALAO'}, CN:{prefix:'+86',region:'ALAO'},
    JP:{prefix:'+81',region:'ALAO'}, AU:{prefix:'+61',region:'ALAO'},
    DE:{prefix:'+49',region:'EMEA'}, GB:{prefix:'+44',region:'EMEA'}, FR:{prefix:'+33',region:'EMEA'}
  };
  const dealerData = {
    ALAO:['밥캣코리아 중부딜러','두산밥캣코리아 서울남','두산밥캣코리아 경기','대영중기(주)','Bobcat of Los Angeles','Bobcat China - Beijing','Bobcat Japan - Tokyo','Bobcat Australia - Sydney'],
    EMEA:['Bobcat Germany - Munich','Bobcat Germany - Berlin','Bobcat UK - London','Bobcat France - Paris','Bobcat France - Lyon']
  };
  const companyData = [
    '(주)세종물류중부지점','두산지게차 경남중부판매 주식회사','온양지게차(호성건설중기)','중원건기','태형금속공업(주)',
    '대한물류 주식회사','한국지게차렌탈','서울종합물류','부산항만물류','인천국제물류센터','한진물류','Doosan Logistics'
  ];
  const roleMeta = {
    'customer-owner':{label:'고객 대표',approval:'선택한 소속 딜러의 딜러대표 승인 대기',copy:'선택한 딜러의 딜러대표가 고객 대표 가입 신청을 검토합니다.'},
    'customer-employee':{label:'고객 직원',approval:'소속 고객사의 고객 대표 승인 대기',copy:'소속 고객사의 고객 대표가 직원 가입 신청을 검토합니다. 딜러대표 승인함에는 표시되지 않습니다.'},
  };

  const stages = {
    agreement:$('#signup-agreement'),
    details:$('#signup-details'),
    complete:$('#signup-complete')
  };
  const stepButtons = $$('[data-signup-step]');
  const terms = $$('[data-signup-term]');
  const requiredTerms = $$('[data-required-term]');
  const agreeAll = $('#signup-agree-all');
  const continueButton = $('#signup-continue');
  const form = $('#signup-form');
  const country = $('#signup-country');
  const region = $('#signup-region');
  const dealer = $('#signup-dealer');
  const company = $('#signup-company');
  const companyList = $('#signup-company-list');
  const email = $('#signup-email');
  const emailCode = $('#signup-email-code');
  const sendEmail = $('#signup-send-email');
  const verifyEmail = $('#signup-verify-email');
  const resendEmail = $('#signup-resend-email');
  let currentStep = 'agreement';
  let verifiedUserId = '';
  let verifiedEmail = '';
  let selectedCompany = '';
  let emailRemaining = 0;
  let emailTimer = 0;

  function roleValue() {
    return $('input[name="signupRole"]:checked')?.value === 'customer-employee' ? 'customer-employee' : 'customer-owner';
  }

  function visible(element) {
    return !element.closest('[hidden]');
  }

  function setStatus(element, message, type = '') {
    element.textContent = message;
    element.className = element.className.replace(/\bis-(success|danger|info)\b/g, '').trim();
    if (type) element.classList.add(`is-${type}`);
  }

  function errorFor(control, message) {
    control.classList.toggle('is-invalid', Boolean(message));
    control.setAttribute('aria-invalid', String(Boolean(message)));
    const target = $(`[data-error-for="${control.id}"]`);
    if (target) target.textContent = message;
  }

  function clearErrors() {
    $$('[aria-invalid="true"]', form).forEach(control => errorFor(control, ''));
    $$('[data-error-for]', form).forEach(target => { target.textContent = ''; });
    setStatus($('#signup-form-status'), '');
  }

  function showStep(step) {
    currentStep = step;
    if (step === 'details') $('#signup-submit').disabled = false;
    Object.entries(stages).forEach(([name, section]) => { section.hidden = name !== step; });
    const order = ['agreement','details','complete'];
    const currentIndex = order.indexOf(step);
    stepButtons.forEach((button, index) => {
      const active = button.dataset.signupStep === step;
      button.classList.toggle('is-active', active);
      button.classList.toggle('is-complete', index < currentIndex);
      if (active) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
    });
    window.scrollTo({top:0,behavior:'instant'});
  }

  function updateAgreementState() {
    const requiredAccepted = requiredTerms.every(term => term.checked);
    const allAccepted = terms.every(term => term.checked);
    agreeAll.checked = allAccepted;
    agreeAll.indeterminate = !allAccepted && terms.some(term => term.checked);
    // 운영 전환 시 복원: 약관 필수 동의 전에는 다음 단계 이동을 차단합니다.
    continueButton.disabled = DEMO_UNLOCKED ? false : !requiredAccepted;
    stepButtons.find(button => button.dataset.signupStep === 'details').disabled = DEMO_UNLOCKED ? false : !requiredAccepted;
    setStatus($('#signup-agreement-status'), requiredAccepted ? '필수 약관에 모두 동의했습니다.' : '', requiredAccepted ? 'success' : '');
  }

  function populateDealers(regionValue) {
    dealer.replaceChildren(new Option('딜러를 선택하세요', ''));
    (dealerData[regionValue] || []).forEach(name => dealer.add(new Option(name, name)));
    $('#signup-dealer-help').textContent = regionValue
      ? `${regionValue} 지역 딜러 ${(dealerData[regionValue] || []).length}개`
      : '지역을 먼저 선택해 주세요.';
  }

  function applyCountry() {
    const mapped = countryData[country.value];
    $('#signup-phone-prefix').textContent = mapped?.prefix || '-';
    if (mapped) region.value = mapped.region;
    populateDealers(region.value);
  }

  function closeCompanyList() {
    companyList.hidden = true;
    company.setAttribute('aria-expanded', 'false');
  }

  function chooseCompany(name) {
    company.value = name;
    selectedCompany = name;
    $('#signup-company-help').textContent = `선택된 업체: ${name}`;
    errorFor(company, '');
    closeCompanyList();
  }

  function renderCompanies() {
    selectedCompany = selectedCompany === company.value.trim() ? selectedCompany : '';
    const query = company.value.trim();
    if (query.length < 2) {
      closeCompanyList();
      companyList.replaceChildren();
      return;
    }
    const matches = companyData.filter(name => name.toLowerCase().includes(query.toLowerCase()));
    companyList.replaceChildren();
    if (!matches.length) {
      const empty = document.createElement('p');
      empty.textContent = roleValue() === 'customer-owner'
        ? '기존 업체가 없습니다. 입력한 이름으로 신규 업체 신청을 진행합니다.'
        : '등록된 업체가 없습니다. 고객 직원은 기존 업체만 선택할 수 있습니다.';
      companyList.append(empty);
    } else {
      matches.forEach(name => {
        const button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('role', 'option');
        button.textContent = name;
        button.addEventListener('click', () => chooseCompany(name));
        companyList.append(button);
      });
    }
    companyList.hidden = false;
    company.setAttribute('aria-expanded', 'true');
  }

  function applyRole() {
    const role = roleValue();
    $$('[data-role-scope]').forEach(element => {
      element.hidden = !element.dataset.roleScope.split(' ').includes(role);
    });
    ['#signup-equipment-serial','#signup-terminal-serial'].forEach(selector => {
      $(selector).disabled = role !== 'customer-owner';
    });
    selectedCompany = '';
    company.value = '';
    closeCompanyList();
    if (role === 'customer-owner') {
      $('#signup-company-label').innerHTML = '업체명 <em>*</em>';
      company.placeholder = '기존 업체 선택 또는 신규 업체명 입력';
      $('#signup-company-help').textContent = '기존 업체를 선택하거나 신규 업체명을 입력할 수 있습니다.';
    } else if (role === 'customer-employee') {
      $('#signup-company-label').innerHTML = '소속 업체 <em>*</em>';
      company.placeholder = '업체명을 2글자 이상 입력 후 선택';
      $('#signup-company-help').textContent = '등록된 업체 목록에서 소속 업체를 선택해야 합니다.';
    }
    if (role !== 'customer-employee') applyCountry();
  }

  function drawTimer() {
    $('#signup-email-timer').textContent = `${String(Math.floor(emailRemaining / 60)).padStart(2,'0')}:${String(emailRemaining % 60).padStart(2,'0')}`;
  }

  function stopTimer() {
    if (emailTimer) window.clearInterval(emailTimer);
    emailTimer = 0;
  }

  function beginEmailVerification(resend = false) {
    errorFor(email, '');
    if (!EMAIL_RULE.test(email.value.trim())) {
      errorFor(email, '이메일 형식을 확인해 주세요.');
      email.focus();
      return;
    }
    verifiedEmail = '';
    emailCode.disabled = false;
    verifyEmail.disabled = false;
    resendEmail.disabled = false;
    sendEmail.disabled = true;
    stopTimer();
    emailRemaining = 180;
    drawTimer();
    emailTimer = window.setInterval(() => {
      emailRemaining -= 1;
      drawTimer();
      if (emailRemaining <= 0) {
        stopTimer();
        verifyEmail.disabled = true;
        setStatus($('#signup-email-status'), '인증 시간이 만료되었습니다. 재발송해 주세요.', 'danger');
      }
    }, 1000);
    setStatus($('#signup-email-status'), resend ? '인증 코드를 다시 발송했습니다.' : '인증 코드를 발송했습니다.', 'info');
    emailCode.focus();
  }

  function maskEmail(value) {
    const [local, domain = ''] = value.split('@');
    const visiblePart = local.slice(0, Math.min(2, local.length));
    return `${visiblePart}${'*'.repeat(Math.max(2, local.length - visiblePart.length))}@${domain}`;
  }

  function addSummaryRow(list, label, value) {
    if (!value) return;
    const term = document.createElement('dt');
    const description = document.createElement('dd');
    term.textContent = label;
    description.textContent = value;
    list.append(term, description);
  }

  // No local storage or dealer approval side effect in this separate preview.
  function renderCompletion({preview = false} = {}) {
    const role = roleValue();
    const meta = roleMeta[role];
    const requestNumber = preview
      ? 'REQ-20260904-00127'
      : `REQ-${new Date().toISOString().slice(0,10).replaceAll('-','')}-${String(Date.now()).slice(-5)}`;
    stopTimer();
    // Store only the pending identity in this tab; never password, phone, address or serials.
    if(!preview){try{sessionStorage.setItem('linq-customer-prototype-pending-signup',JSON.stringify({userId:$('#signup-user-id').value.trim(),email:email.value.trim(),role,status:'pending'}));}catch(error){}}
    $('#signup-password').value = '';
    $('#signup-password-confirm').value = '';
    $('#signup-request-number').textContent = requestNumber;
    $('#signup-complete-copy').textContent = meta.copy;
    $('#signup-approval-target').textContent = meta.approval;
    const summary = $('#signup-summary');
    summary.replaceChildren();
    addSummaryRow(summary, '신청 구분', meta.label);
    addSummaryRow(summary, '사용자 ID', $('#signup-user-id').value.trim());
    addSummaryRow(summary, '인증 이메일', maskEmail(email.value.trim()));
    addSummaryRow(summary, role === 'customer-employee' ? '소속 업체' : '업체명', company.value.trim());
    addSummaryRow(summary, '소속 딜러', dealer.value);
    if (role === 'customer-owner') addSummaryRow(summary, '장비 Serial', $('#signup-equipment-serial').value.trim());
    stepButtons.find(button => button.dataset.signupStep === 'complete').disabled = false;
    showStep('complete');
    window.lucide?.createIcons({attrs:{'stroke-width':2}});
  }

  function showCompletionPreview() {
    $('#signup-name').value = '박신규';
    $('#signup-user-id').value = 'customer.new1';
    email.value = 'new.customer@example.com';
    company.value = '(주)세종물류중부지점';
    dealer.value = dealer.options[1]?.value || '';
    $('#signup-equipment-serial').value = 'FBA99_260904001';
    $('#signup-terminal-serial').value = 'TERM-260904001';
    renderCompletion({preview:true});
  }

  agreeAll.addEventListener('change', () => {
    terms.forEach(term => { term.checked = agreeAll.checked; });
    updateAgreementState();
  });
  terms.forEach(term => term.addEventListener('change', updateAgreementState));
  $$('[data-term-toggle]').forEach(button => button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') === 'true';
    $$('[data-term-toggle]').forEach(other => {
      other.setAttribute('aria-expanded', 'false');
      $(`#${other.getAttribute('aria-controls')}`).hidden = true;
    });
    if (!open) {
      button.setAttribute('aria-expanded', 'true');
      $(`#${button.getAttribute('aria-controls')}`).hidden = false;
    }
  }));
  continueButton.addEventListener('click', () => showStep('details'));
  stepButtons.forEach(button => button.addEventListener('click', () => {
    if (button.disabled) return;
    if (button.dataset.signupStep === 'complete') showStep('complete');
    else showStep(button.dataset.signupStep);
  }));

  $$('input[name="signupRole"]').forEach(input => input.addEventListener('change', () => {
    if (!input.checked) return;
    clearErrors();
    applyRole();
  }));
  country.addEventListener('change', applyCountry);
  region.addEventListener('change', () => populateDealers(region.value));
  company.addEventListener('input', renderCompanies);
  document.addEventListener('click', event => { if (!event.target.closest('.company-autocomplete')) closeCompanyList(); });

  $('#signup-check-id').addEventListener('click', () => {
    const value = $('#signup-user-id').value.trim();
    errorFor($('#signup-user-id'), '');
    if (!/^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]{6,}$/.test(value)) {
      errorFor($('#signup-user-id'), '6자 이상의 영문·숫자와 . _ -만 사용할 수 있습니다.');
      return;
    }
    if (['admin','dealer','customer','test_user'].includes(value.toLowerCase())) {
      errorFor($('#signup-user-id'), '이미 사용 중인 사용자 ID입니다.');
      return;
    }
    verifiedUserId = value;
    setStatus($('#signup-user-id-status'), '사용할 수 있는 사용자 ID입니다.', 'success');
  });
  $('#signup-user-id').addEventListener('input', () => {
    if (verifiedUserId !== $('#signup-user-id').value.trim()) {
      verifiedUserId = '';
      setStatus($('#signup-user-id-status'), '');
    }
  });

  sendEmail.addEventListener('click', () => beginEmailVerification(false));
  resendEmail.addEventListener('click', () => beginEmailVerification(true));
  verifyEmail.addEventListener('click', () => {
    errorFor(emailCode, '');
    if (emailRemaining <= 0) return errorFor(emailCode, '인증 시간이 만료되었습니다.');
    if (emailCode.value.trim() !== '123456') return errorFor(emailCode, '인증 코드가 일치하지 않습니다.');
    verifiedEmail = email.value.trim();
    stopTimer();
    verifyEmail.disabled = true;
    setStatus($('#signup-email-status'), '이메일 인증이 완료되었습니다.', 'success');
  });
  email.addEventListener('input', () => {
    if (verifiedEmail !== email.value.trim()) {
      verifiedEmail = '';
      stopTimer();
      emailRemaining = 0;
      drawTimer();
      emailCode.value = '';
      emailCode.disabled = true;
      verifyEmail.disabled = true;
      resendEmail.disabled = true;
      sendEmail.disabled = false;
      setStatus($('#signup-email-status'), '');
    }
  });
  $$('[data-password-toggle]').forEach(button => button.addEventListener('click', () => {
    const input = $(`#${button.dataset.passwordToggle}`);
    const visiblePassword = input.type === 'text';
    input.type = visiblePassword ? 'password' : 'text';
    button.setAttribute('aria-label', visiblePassword ? '비밀번호 표시' : '비밀번호 숨기기');
    button.innerHTML = `<i data-lucide="${visiblePassword ? 'eye' : 'eye-off'}"></i>`;
    window.lucide?.createIcons({attrs:{'stroke-width':2}});
  }));

  form.addEventListener('submit', event => {
    event.preventDefault();
    clearErrors();
    let valid = true;
    $$('[data-required]', form).forEach(control => {
      if (visible(control) && !String(control.value || '').trim()) {
        errorFor(control, '필수 입력 항목입니다.');
        valid = false;
      }
    });
    const userId = $('#signup-user-id');
    if (verifiedUserId !== userId.value.trim()) { errorFor(userId, '사용자 ID 중복확인을 완료해 주세요.'); valid = false; }
    if (!EMAIL_RULE.test(email.value.trim())) { errorFor(email, '이메일 형식을 확인해 주세요.'); valid = false; }
    else if (verifiedEmail !== email.value.trim()) { errorFor(email, '이메일 인증을 완료해 주세요.'); valid = false; }
    const password = $('#signup-password');
    const confirmPassword = $('#signup-password-confirm');
    if (!PASSWORD_RULE.test(password.value)) { errorFor(password, '영문·숫자·특수문자를 포함해 12자 이상 입력해 주세요.'); valid = false; }
    if (confirmPassword.value !== password.value) { errorFor(confirmPassword, '비밀번호가 일치하지 않습니다.'); valid = false; }
    const phone = $('#signup-phone');
    if (!/^\d{6,15}$/.test(phone.value.replace(/[-\s]/g,''))) { errorFor(phone, '국가번호를 제외한 숫자 6~15자를 입력해 주세요.'); valid = false; }
    if (roleValue() === 'customer-employee' && selectedCompany !== company.value.trim()) {
      errorFor(company, '등록된 업체 목록에서 소속 업체를 선택해 주세요.'); valid = false;
    }
    // 운영 전환 시 복원: 필수 입력·중복 확인·이메일 인증 검증에 실패하면 신청을 차단합니다.
    if (!valid && !DEMO_UNLOCKED) {
      setStatus($('#signup-form-status'), '입력 내용을 확인해 주세요.', 'danger');
      const firstInvalid = $('[aria-invalid="true"]', form);
      firstInvalid?.focus();
      firstInvalid?.scrollIntoView({block:'center'});
      return;
    }
    $('#signup-submit').disabled = true;
    setStatus($('#signup-form-status'), '가입 신청이 완료되었습니다.', 'success');
    window.setTimeout(renderCompletion, 350);
  });

  $('#signup-back')?.addEventListener('click', () => {
    if (currentStep === 'details') showStep('agreement');
    else window.location.href = document.body.dataset.mobileLogin || './login.html';
  });
  $('#signup-cancel').addEventListener('click', () => { window.location.href = document.body.dataset.mobileLogin || './login.html'; });
  $('#signup-to-login').addEventListener('click', () => { window.location.href = document.body.dataset.mobileLogin || './login.html'; });
  $('#signup-language').addEventListener('change', event => {
    if (event.target.value !== 'ko') event.target.value = 'ko';
  });
  window.addEventListener('beforeunload', stopTimer);

  const initialRole = new URLSearchParams(window.location.search).get('role') === 'customer_staff' ? 'customer-employee' : 'customer-owner';
  $$('input[name="signupRole"]').forEach(input => { input.checked = input.value === initialRole; });
  applyCountry();
  applyRole();
  updateAgreementState();
  if (new URLSearchParams(window.location.search).get('preview') === 'complete') showCompletionPreview();
  else showStep('agreement');
  window.lucide?.createIcons({attrs:{'stroke-width':2}});
})();
