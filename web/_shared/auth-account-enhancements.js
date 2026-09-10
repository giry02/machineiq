(function () {
  'use strict';

  var doc = document;
  var body = doc.body;
  var PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9]).{12,}$/;
  var EMAIL_RULE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function one(selector, root) { return (root || doc).querySelector(selector); }
  function all(selector, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(selector)); }
  function storageGet(store, key) {
    try { return store.getItem(key); } catch (error) { return null; }
  }
  function storageSet(store, key, value) {
    try { store.setItem(key, value); } catch (error) { /* local prototype may block storage */ }
  }
  function storageRemove(store, key) {
    try { store.removeItem(key); } catch (error) { /* local prototype may block storage */ }
  }
  function visible(element) {
    if (!element || element.disabled) return false;
    return !element.closest('[hidden]');
  }
  function setAlert(element, message, kind) {
    if (!element) return;
    element.textContent = message || '';
    element.hidden = !message;
    element.className = 'aae-alert' + (kind ? ' is-' + kind : '');
  }
  function errorFor(input, message) {
    if (!input) return false;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    var error = input.id ? one('[data-error-for="' + input.id + '"]') : null;
    if (error) error.textContent = message || '';
    return !message;
  }
  function clearErrors(root) {
    all('[aria-invalid="true"]', root).forEach(function (element) { element.setAttribute('aria-invalid', 'false'); });
    all('[data-error-for]', root).forEach(function (element) { element.textContent = ''; });
  }
  function focusFirstInvalid(root) {
    var target = one('[aria-invalid="true"]', root);
    if (target) target.focus();
  }
  function setLanguageControls() {
    var saved = storageGet(localStorage, 'miq-language') || doc.documentElement.lang || 'ko';
    all('.miq-auth-language select, [data-language-select]').forEach(function (select) {
      if (one('option[value="' + saved + '"]', select)) select.value = saved;
      select.addEventListener('change', function () {
        doc.documentElement.lang = select.value;
        storageSet(localStorage, 'miq-language', select.value);
        all('.miq-auth-language select, [data-language-select]').forEach(function (other) {
          if (other !== select && one('option[value="' + select.value + '"]', other)) other.value = select.value;
        });
      });
    });
  }
  function bindPasswordToggles(root) {
    all('[data-password-toggle]', root).forEach(function (button) {
      button.addEventListener('click', function () {
        var input = doc.getElementById(button.getAttribute('data-password-toggle'));
        if (!input) return;
        var showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        button.textContent = showing ? '표시' : '숨김';
        button.setAttribute('aria-pressed', showing ? 'false' : 'true');
        input.focus();
      });
    });
  }

  function initLogin() {
    var form = one('#loginForm');
    if (!form) return;
    var identifier = one('#loginIdentifier');
    var password = one('#loginPassword');
    var remember = one('#rememberIdentifier');
    var status = one('#loginStatus');
    var retry = one('#loginRetry');
    var submit = one('#loginSubmit');
    var forced = one('#forcedPasswordPanel');
    var forcedForm = one('#forcedPasswordForm');
    var attempts = Number(storageGet(sessionStorage, 'miq-login-attempts') || 0);
    var savedIdentifier = storageGet(localStorage, 'miq-saved-identifier');
    var temporaryPassword = storageGet(sessionStorage, 'miq-temporary-password');

    if (savedIdentifier) {
      identifier.value = savedIdentifier;
      remember.checked = true;
    }
    if (temporaryPassword) password.value = temporaryPassword;

    function renderAttempts() {
      var remaining = Math.max(0, 5 - attempts);
      retry.innerHTML = attempts ? '<span>로그인 실패 <strong>' + attempts + '회</strong></span><span>남은 시도 ' + remaining + '회</span>' : '';
      retry.hidden = attempts === 0;
      var locked = attempts >= 5;
      identifier.disabled = locked;
      password.disabled = locked;
      remember.disabled = locked;
      submit.disabled = locked;
      one('#loginLocked').hidden = !locked;
      if (locked) setAlert(status, '비밀번호를 5회 연속 잘못 입력하여 계정이 잠겼습니다.', 'danger');
    }

    function openForcedChange() {
      form.hidden = true;
      one('#loginLinks').hidden = true;
      forced.hidden = false;
      one('#forcedPassword').focus();
    }

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      if (attempts >= 5) return;
      var idValue = identifier.value.trim();
      var passwordValue = password.value;
      var valid = true;
      if (!(EMAIL_RULE.test(idValue) || /^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]{6,}$/.test(idValue))) {
        errorFor(identifier, '사용자 ID 또는 이메일을 올바르게 입력해 주세요.');
        valid = false;
      }
      if (!PASSWORD_RULE.test(passwordValue)) {
        errorFor(password, '12자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.');
        valid = false;
      }
      if (!valid) { focusFirstInvalid(form); return; }

      var accepted = passwordValue === 'password12!@' || (temporaryPassword && passwordValue === temporaryPassword);
      if (!accepted) {
        attempts += 1;
        storageSet(sessionStorage, 'miq-login-attempts', String(attempts));
        renderAttempts();
        if (attempts < 5) setAlert(status, '비밀번호가 일치하지 않습니다. 다시 확인해 주세요.', 'danger');
        password.focus();
        password.select();
        return;
      }

      if (remember.checked) storageSet(localStorage, 'miq-saved-identifier', idValue);
      else storageRemove(localStorage, 'miq-saved-identifier');
      storageRemove(sessionStorage, 'miq-login-attempts');
      attempts = 0;
      renderAttempts();

      if (temporaryPassword && passwordValue === temporaryPassword) {
        storageSet(sessionStorage, 'miq-force-password-change', 'true');
        openForcedChange();
        return;
      }
      setAlert(status, '인증되었습니다. 대시보드로 이동합니다.', 'success');
      window.setTimeout(function () { location.href = '../Dashboard/group-dashboard-tobe-v2.html'; }, 350);
    });

    if (forcedForm) {
      forcedForm.addEventListener('submit', function (event) {
        event.preventDefault();
        clearErrors(forcedForm);
        var next = one('#forcedPassword');
        var confirm = one('#forcedPasswordConfirm');
        var ok = true;
        if (!PASSWORD_RULE.test(next.value)) {
          errorFor(next, '12자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.');
          ok = false;
        }
        if (confirm.value !== next.value) {
          errorFor(confirm, '새 비밀번호가 일치하지 않습니다.');
          ok = false;
        }
        if (temporaryPassword && next.value === temporaryPassword) {
          errorFor(next, '임시 비밀번호와 다른 비밀번호를 입력해 주세요.');
          ok = false;
        }
        if (!ok) { focusFirstInvalid(forcedForm); return; }
        storageRemove(sessionStorage, 'miq-temporary-password');
        storageRemove(sessionStorage, 'miq-force-password-change');
        setAlert(one('#forcedPasswordStatus'), '비밀번호가 변경되었습니다. 대시보드로 이동합니다.', 'success');
        window.setTimeout(function () { location.href = '../Dashboard/group-dashboard-tobe-v2.html'; }, 450);
      });
    }

    renderAttempts();
    if (storageGet(sessionStorage, 'miq-force-password-change') === 'true' && temporaryPassword) openForcedChange();
  }

  function initPasswordRecovery() {
    var root = one('[data-recovery-flow]');
    if (!root) return;
    var stepButtons = all('[data-recovery-step]', root);
    var stages = all('[data-recovery-stage]', root);
    var maxStep = 1;
    var currentStep = 1;
    var timerId = null;
    var remaining = 180;
    var recoveryIdentifier = '';

    function go(step) {
      if (step > maxStep) return;
      currentStep = step;
      stages.forEach(function (stage) { stage.hidden = Number(stage.dataset.recoveryStage) !== step; });
      stepButtons.forEach(function (button) {
        var number = Number(button.dataset.recoveryStep);
        button.removeAttribute('aria-current');
        button.classList.toggle('is-complete', number < currentStep);
        button.disabled = number > maxStep || number === currentStep;
        if (number === currentStep) button.setAttribute('aria-current', 'step');
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var first = one('input:not([disabled]), button:not([disabled])', stages[step - 1]);
      if (first) first.focus();
    }

    stepButtons.forEach(function (button) {
      button.addEventListener('click', function () { go(Number(button.dataset.recoveryStep)); });
    });

    one('#recoveryIdentifyForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var input = one('#recoveryIdentifier');
      errorFor(input, '');
      recoveryIdentifier = input.value.trim();
      if (!(EMAIL_RULE.test(recoveryIdentifier) || /^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]{6,}$/.test(recoveryIdentifier))) {
        errorFor(input, '등록한 사용자 ID 또는 이메일을 입력해 주세요.');
        input.focus();
        return;
      }
      var email = one('#recoveryEmail');
      if (EMAIL_RULE.test(recoveryIdentifier)) email.value = recoveryIdentifier;
      maxStep = Math.max(maxStep, 2);
      go(2);
    });

    function drawTimer() {
      var minute = String(Math.floor(remaining / 60)).padStart(2, '0');
      var second = String(remaining % 60).padStart(2, '0');
      one('#recoveryTimer').textContent = minute + ':' + second;
      one('#recoveryTimerBar').style.width = ((remaining / 180) * 100) + '%';
    }
    function stopTimer() {
      if (timerId) window.clearInterval(timerId);
      timerId = null;
    }
    function startTimer() {
      stopTimer();
      remaining = 180;
      drawTimer();
      timerId = window.setInterval(function () {
        remaining -= 1;
        drawTimer();
        if (remaining <= 0) {
          stopTimer();
          one('#recoveryVerify').disabled = true;
          setAlert(one('#recoveryMailStatus'), '인증 시간이 만료되었습니다. 재발송해 주세요.', 'danger');
        }
      }, 1000);
    }
    function sendCode(isResend) {
      var name = one('#recoveryName');
      var email = one('#recoveryEmail');
      errorFor(name, '');
      errorFor(email, '');
      var ok = true;
      if (!name.value.trim()) { errorFor(name, '이름을 입력해 주세요.'); ok = false; }
      if (!EMAIL_RULE.test(email.value.trim())) { errorFor(email, '이메일 형식을 확인해 주세요.'); ok = false; }
      if (!ok) { focusFirstInvalid(one('#recoveryVerifyForm')); return; }
      one('#recoveryCode').disabled = false;
      one('#recoveryVerify').disabled = false;
      one('#recoveryResend').disabled = false;
      one('#recoverySend').disabled = true;
      startTimer();
      setAlert(one('#recoveryMailStatus'), (isResend ? '인증 코드를 다시 발송했습니다.' : '인증 코드를 발송했습니다.') + ' 프로토타입 확인 코드는 123456입니다.', 'info');
      one('#recoveryCode').focus();
    }
    one('#recoverySend').addEventListener('click', function () { sendCode(false); });
    one('#recoveryResend').addEventListener('click', function () { sendCode(true); });
    one('#recoveryVerifyForm').addEventListener('submit', function (event) {
      event.preventDefault();
      var code = one('#recoveryCode');
      if (code.disabled) {
        sendCode(false);
        return;
      }
      errorFor(code, '');
      if (remaining <= 0) {
        errorFor(code, '인증 시간이 만료되었습니다. 재발송해 주세요.');
        return;
      }
      if (code.value.trim() !== '123456') {
        errorFor(code, '인증 코드가 일치하지 않습니다.');
        code.focus();
        return;
      }
      stopTimer();
      var random = Math.random().toString(36).slice(2, 6).toUpperCase();
      var temp = 'MIQ-' + (Math.floor(1000 + Math.random() * 9000)) + '-' + random + '!';
      one('#temporaryPassword').textContent = temp;
      storageSet(sessionStorage, 'miq-temporary-password', temp);
      storageSet(sessionStorage, 'miq-force-password-change', 'true');
      if (recoveryIdentifier) storageSet(localStorage, 'miq-saved-identifier', recoveryIdentifier);
      maxStep = 3;
      go(3);
    });
    one('#copyTemporaryPassword').addEventListener('click', function () {
      var value = one('#temporaryPassword').textContent;
      var copyStatus = one('#temporaryCopyStatus');
      function done() { setAlert(copyStatus, '임시 비밀번호를 복사했습니다.', 'success'); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(done).catch(function () {
          window.prompt('임시 비밀번호를 복사하세요.', value);
        });
      } else {
        window.prompt('임시 비밀번호를 복사하세요.', value);
      }
    });
    window.addEventListener('beforeunload', stopTimer);
    go(1);
  }

  var countryData = {
    KR: { code: '+82', region: 'ALAO' }, US: { code: '+1', region: 'ALAO' },
    CN: { code: '+86', region: 'ALAO' }, JP: { code: '+81', region: 'ALAO' },
    DE: { code: '+49', region: 'EMEA' }, AU: { code: '+61', region: 'ALAO' },
    GB: { code: '+44', region: 'EMEA' }, FR: { code: '+33', region: 'EMEA' }
  };
  var dealerData = {
    ALAO: ['두산밥캣코리아 서울남', '두산밥캣코리아 경기', 'Bobcat of Los Angeles', 'Bobcat of New York', 'Bobcat China - Beijing', 'Bobcat Japan - Tokyo', 'Bobcat Australia - Sydney'],
    EMEA: ['Bobcat Germany - Munich', 'Bobcat Germany - Berlin', 'Bobcat UK - London', 'Bobcat UK - Manchester', 'Bobcat France - Paris', 'Bobcat France - Lyon']
  };
  var companyData = [
    '대한물류 주식회사', '대한건설기계', '한국지게차렌탈', '서울종합물류', '경기중공업',
    '부산항만물류', '인천국제물류센터', '삼성SDS 물류', 'CJ대한통운', '한진물류',
    '롯데글로벌로지스', '쿠팡풀필먼트', 'Doosan Logistics', 'Bobcat Demo Company', 'Global Material Handling'
  ];

  function initRegistration() {
    var root = one('[data-registration-flow]');
    if (!root) return;
    var isApp = body.dataset.registrationMode === 'app';
    var agreeStep = one('#registrationAgreement');
    var formStep = one('#registrationDetails');
    var stepButtons = all('[data-registration-step]');
    var requiredTerms = all('[data-term-required="true"]');
    var allTerms = all('[data-term]');
    var continueButton = one('#registrationContinue');
    var allCheckbox = one('#registrationAgreeAll');
    var currentStep = 'agreement';
    var emailTimer = null;
    var emailRemaining = 0;

    function requiredTermsAccepted() { return requiredTerms.every(function (checkbox) { return checkbox.checked; }); }
    function updateAgreementState() {
      allCheckbox.checked = allTerms.every(function (checkbox) { return checkbox.checked; });
      allCheckbox.indeterminate = !allCheckbox.checked && allTerms.some(function (checkbox) { return checkbox.checked; });
      var accepted = requiredTermsAccepted();
      continueButton.disabled = !accepted;
      one('[data-registration-step="details"]').disabled = !accepted;
      setAlert(one('#agreementStatus'), accepted ? '필수 약관에 모두 동의했습니다.' : '', 'success');
    }
    function showRegistrationStep(step) {
      if (step === 'details' && !requiredTermsAccepted()) {
        setAlert(one('#agreementStatus'), '필수 약관 4개에 동의해야 정보 입력으로 이동할 수 있습니다.', 'danger');
        one('[data-term-required="true"]:not(:checked)').focus();
        return;
      }
      currentStep = step;
      agreeStep.hidden = step !== 'agreement';
      formStep.hidden = step !== 'details';
      stepButtons.forEach(function (button) {
        var active = button.dataset.registrationStep === step;
        if (active) button.setAttribute('aria-current', 'step');
        else button.removeAttribute('aria-current');
      });
      window.scrollTo({ top: 0, behavior: 'smooth' });
      var target = step === 'details' ? one('#registrationUserId') : allCheckbox;
      if (target) target.focus();
    }

    allCheckbox.addEventListener('change', function () {
      allTerms.forEach(function (checkbox) { checkbox.checked = allCheckbox.checked; });
      updateAgreementState();
    });
    allTerms.forEach(function (checkbox) { checkbox.addEventListener('change', updateAgreementState); });
    continueButton.addEventListener('click', function () { showRegistrationStep('details'); });
    stepButtons.forEach(function (button) {
      button.addEventListener('click', function () { showRegistrationStep(button.dataset.registrationStep); });
    });
    all('.aae-agreement-toggle').forEach(function (button) {
      button.addEventListener('click', function () {
        var target = doc.getElementById(button.getAttribute('aria-controls'));
        var willOpen = target.hidden;
        all('.aae-agreement__content').forEach(function (content) { content.hidden = true; });
        all('.aae-agreement-toggle').forEach(function (item) { item.setAttribute('aria-expanded', 'false'); item.textContent = '열기'; });
        target.hidden = !willOpen;
        button.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        button.textContent = willOpen ? '닫기' : '열기';
      });
    });

    var country = one('#registrationCountry');
    var region = one('#registrationRegion');
    var dealer = one('#registrationDealer');
    var prefix = one('#registrationTelPrefix');
    function populateDealers(regionValue) {
      dealer.innerHTML = '<option value="">딜러를 선택하세요</option>';
      (dealerData[regionValue] || []).forEach(function (name) {
        var option = doc.createElement('option');
        option.value = name;
        option.textContent = name;
        dealer.appendChild(option);
      });
      one('#registrationDealerHelp').textContent = regionValue ? regionValue + ' 지역 딜러 ' + ((dealerData[regionValue] || []).length) + '개' : '지역을 먼저 선택해 주세요.';
    }
    function applyCountry() {
      var value = countryData[country.value];
      prefix.textContent = value ? value.code : '+';
      region.value = value ? value.region : '';
      populateDealers(region.value);
      dealer.value = '';
    }
    country.addEventListener('change', applyCountry);
    region.addEventListener('change', function () { populateDealers(region.value); dealer.value = ''; });

    var companyInput = one('#registrationCompany');
    var companyList = one('#registrationCompanyList');
    var companyLabel = one('#registrationCompanyLabel');
    var companyHelp = one('#registrationCompanyHelp');
    var selectedCompany = '';
    var activeOption = -1;

    function roleValue() {
      var checked = one('input[name="registrationRole"]:checked');
      return checked ? checked.value : 'customer-owner';
    }
    function setRole(role, initializing) {
      all('[data-registration-roles]').forEach(function (field) {
        var enabled = field.dataset.registrationRoles.split(',').indexOf(role) > -1;
        field.hidden = !enabled;
        all('input, select, textarea', field).forEach(function (control) {
          control.disabled = !enabled;
          if (!enabled && !initializing) {
            if (control.type === 'checkbox' || control.type === 'radio') control.checked = false;
            else control.value = '';
          }
        });
      });
      selectedCompany = '';
      companyInput.value = '';
      companyList.hidden = true;
      if (role !== 'customer-employee') {
        var mappedCountry = countryData[country.value];
        region.value = mappedCountry ? mappedCountry.region : '';
        populateDealers(region.value);
        dealer.value = '';
      }
      if (role === 'customer-owner') {
        companyLabel.textContent = '신규 업체명';
        companyInput.placeholder = '신규 업체명을 입력하세요';
        companyHelp.textContent = '기존 업체와 중복되면 확인 메시지를 표시합니다.';
      } else if (role === 'customer-employee') {
        companyLabel.textContent = '소속 업체';
        companyInput.placeholder = '2글자 이상 입력 후 소속 업체를 선택하세요';
        companyHelp.textContent = '등록된 업체 목록에서 선택해야 합니다.';
      }
      all('.aae-role').forEach(function (label) {
        label.classList.toggle('is-selected', !!one('input:checked', label));
      });
    }
    all('input[name="registrationRole"]').forEach(function (radio) {
      radio.addEventListener('change', function () { setRole(radio.value, false); });
    });

    function closeCompanyList() {
      companyList.hidden = true;
      companyInput.setAttribute('aria-expanded', 'false');
      activeOption = -1;
    }
    function chooseCompany(name) {
      companyInput.value = name;
      selectedCompany = name;
      closeCompanyList();
      companyHelp.textContent = '선택된 업체: ' + name;
      errorFor(companyInput, '');
    }
    function renderCompanies() {
      selectedCompany = '';
      var query = companyInput.value.trim().toLowerCase();
      if (query.length < 2) { closeCompanyList(); return; }
      var matches = companyData.filter(function (name) { return name.toLowerCase().indexOf(query) > -1; });
      companyList.innerHTML = '';
      if (!matches.length) {
        var empty = doc.createElement('div');
        empty.className = 'aae-autocomplete-empty';
        empty.textContent = roleValue() === 'customer-owner' ? '기존 업체와 중복되지 않습니다. 신규 업체로 신청할 수 있습니다.' : '등록된 업체가 없습니다.';
        companyList.appendChild(empty);
      } else {
        matches.forEach(function (name) {
          var option = doc.createElement('button');
          option.type = 'button';
          option.className = 'aae-autocomplete-option';
          option.setAttribute('role', 'option');
          option.textContent = name;
          option.addEventListener('click', function () { chooseCompany(name); });
          companyList.appendChild(option);
        });
      }
      companyList.hidden = false;
      companyInput.setAttribute('aria-expanded', 'true');
    }
    companyInput.addEventListener('input', renderCompanies);
    companyInput.addEventListener('keydown', function (event) {
      var options = all('.aae-autocomplete-option', companyList);
      if (companyList.hidden || !options.length) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        activeOption = event.key === 'ArrowDown' ? Math.min(options.length - 1, activeOption + 1) : Math.max(0, activeOption - 1);
        options.forEach(function (option, index) { option.classList.toggle('is-active', index === activeOption); });
      } else if (event.key === 'Enter' && activeOption > -1) {
        event.preventDefault();
        chooseCompany(options[activeOption].textContent);
      } else if (event.key === 'Escape') {
        closeCompanyList();
      }
    });
    doc.addEventListener('click', function (event) { if (!event.target.closest('.aae-autocomplete')) closeCompanyList(); });

    var userId = one('#registrationUserId');
    var userIdStatus = one('#registrationUserIdStatus');
    one('#registrationCheckId').addEventListener('click', function () {
      var value = userId.value.trim();
      errorFor(userId, '');
      if (!/^(?=.*[A-Za-z0-9])[A-Za-z0-9._-]{6,}$/.test(value)) {
        errorFor(userId, '6자 이상의 영문·숫자와 . _ -만 사용할 수 있습니다.');
        userId.focus();
        return;
      }
      userId.dataset.verifiedValue = value;
      setAlert(userIdStatus, '사용할 수 있는 사용자 ID입니다.', 'success');
    });
    userId.addEventListener('input', function () {
      if (userId.dataset.verifiedValue !== userId.value.trim()) {
        delete userId.dataset.verifiedValue;
        setAlert(userIdStatus, '', '');
      }
    });

    var email = one('#registrationEmail');
    var emailCode = one('#registrationEmailCode');
    var sendEmail = one('#registrationSendEmail');
    var verifyEmail = one('#registrationVerifyEmail');
    var resendEmail = one('#registrationResendEmail');
    var emailStatus = one('#registrationEmailStatus');
    function stopEmailTimer() { if (emailTimer) window.clearInterval(emailTimer); emailTimer = null; }
    function drawEmailTimer() {
      var timer = one('#registrationEmailTimer');
      if (!timer) return;
      timer.textContent = String(Math.floor(emailRemaining / 60)).padStart(2, '0') + ':' + String(emailRemaining % 60).padStart(2, '0');
    }
    function beginEmailVerification(resend) {
      errorFor(email, '');
      if (!EMAIL_RULE.test(email.value.trim())) {
        errorFor(email, '이메일 형식을 확인해 주세요.');
        email.focus();
        return;
      }
      delete email.dataset.verifiedValue;
      emailCode.disabled = false;
      verifyEmail.disabled = false;
      resendEmail.disabled = false;
      sendEmail.disabled = true;
      stopEmailTimer();
      emailRemaining = 180;
      drawEmailTimer();
      emailTimer = window.setInterval(function () {
        emailRemaining -= 1;
        drawEmailTimer();
        if (emailRemaining <= 0) {
          stopEmailTimer();
          verifyEmail.disabled = true;
          setAlert(emailStatus, '인증 시간이 만료되었습니다. 재발송해 주세요.', 'danger');
        }
      }, 1000);
      setAlert(emailStatus, (resend ? '인증 코드를 다시 발송했습니다.' : '인증 코드를 발송했습니다.') + ' 프로토타입 확인 코드는 123456입니다.', 'info');
      emailCode.focus();
    }
    sendEmail.addEventListener('click', function () { beginEmailVerification(false); });
    resendEmail.addEventListener('click', function () { beginEmailVerification(true); });
    verifyEmail.addEventListener('click', function () {
      errorFor(emailCode, '');
      if (emailRemaining <= 0) { errorFor(emailCode, '인증 시간이 만료되었습니다.'); return; }
      if (emailCode.value.trim() !== '123456') { errorFor(emailCode, '인증 코드가 일치하지 않습니다.'); emailCode.focus(); return; }
      email.dataset.verifiedValue = email.value.trim();
      stopEmailTimer();
      verifyEmail.disabled = true;
      setAlert(emailStatus, '이메일 인증이 완료되었습니다.', 'success');
    });
    email.addEventListener('input', function () {
      if (email.dataset.verifiedValue !== email.value.trim()) {
        delete email.dataset.verifiedValue;
        stopEmailTimer();
        emailRemaining = 0;
        emailCode.value = '';
        emailCode.disabled = true;
        sendEmail.disabled = false;
        resendEmail.disabled = true;
        verifyEmail.disabled = true;
        setAlert(emailStatus, '', '');
      }
    });

    var form = one('#registrationForm');
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      var valid = true;
      all('[data-required="true"]', form).forEach(function (control) {
        if (!visible(control)) return;
        if (!String(control.value || '').trim()) { errorFor(control, '필수 입력 항목입니다.'); valid = false; }
      });
      if (!userId.dataset.verifiedValue || userId.dataset.verifiedValue !== userId.value.trim()) {
        errorFor(userId, '사용자 ID 중복확인을 완료해 주세요.'); valid = false;
      }
      if (!EMAIL_RULE.test(email.value.trim())) { errorFor(email, '이메일 형식을 확인해 주세요.'); valid = false; }
      else if (email.dataset.verifiedValue !== email.value.trim()) { errorFor(email, '이메일 인증을 완료해 주세요.'); valid = false; }
      var password = one('#registrationPassword');
      var confirm = one('#registrationPasswordConfirm');
      if (!PASSWORD_RULE.test(password.value)) { errorFor(password, '12자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.'); valid = false; }
      if (confirm.value !== password.value) { errorFor(confirm, '비밀번호가 일치하지 않습니다.'); valid = false; }
      var phone = one('#registrationPhone');
      if (!/^\d{6,15}$/.test(phone.value.replace(/[-\s]/g, ''))) { errorFor(phone, '국가번호를 제외한 전화번호 숫자 6~15자를 입력해 주세요.'); valid = false; }
      if (roleValue() === 'customer-employee' && selectedCompany !== companyInput.value.trim()) {
        errorFor(companyInput, '등록된 업체 목록에서 소속 업체를 선택해 주세요.'); valid = false;
      }
      if (!valid) {
        setAlert(one('#registrationStatus'), '입력 내용을 확인해 주세요.', 'danger');
        focusFirstInvalid(form);
        return;
      }
      var submit = one('#registrationSubmit');
      submit.disabled = true;
      form.setAttribute('aria-busy', 'true');
      setAlert(one('#registrationStatus'), '가입 신청 정보를 확인하고 있습니다.', 'info');
      window.setTimeout(function () {
        form.removeAttribute('aria-busy');
        setAlert(one('#registrationStatus'), '가입 신청이 완료되었습니다. 승인 결과는 인증한 이메일로 안내됩니다.', 'success');
      }, 450);
    });

    all('[data-registration-cancel]').forEach(function (button) {
      button.addEventListener('click', function () { location.href = '../Login/login-tobe.html'; });
    });
    var appBack = one('#registrationAppBack');
    if (appBack) appBack.addEventListener('click', function () {
      if (currentStep === 'details') showRegistrationStep('agreement');
      else location.href = '../Login/login-tobe.html';
    });
    window.addEventListener('beforeunload', stopEmailTimer);
    applyCountry();
    setRole(roleValue(), true);
    updateAgreementState();
    showRegistrationStep('agreement');
  }

  function initAccount() {
    var modalLayer = one('#myAccountModal');
    var form = one('#accountForm');
    if (!modalLayer || !form) return;
    if (modalLayer._miqAccountController) return modalLayer._miqAccountController;
    var modal = one('[role="dialog"]', modalLayer);
    var saveButton = one('#accountSave');
    var status = one('#accountStatus');
    var initialSnapshot = '';
    var dirty = false;
    var returnUrl = new URLSearchParams(location.search).get('return');
    var inline = modalLayer.dataset.accountInline === 'true';
    var returnFocus = null;

    function serialise() {
      return all('input, select', form).filter(function (control) {
        return control.type !== 'password';
      }).map(function (control) {
        return control.name + ':' + (control.type === 'checkbox' ? control.checked : control.value);
      }).join('|');
    }
    function restoreSaved() {
      var raw = storageGet(localStorage, 'miq-account-settings');
      if (!raw) return;
      try {
        var saved = JSON.parse(raw);
        all('[name]', form).forEach(function (control) {
          if (!Object.prototype.hasOwnProperty.call(saved, control.name)) return;
          if (control.type === 'checkbox') control.checked = !!saved[control.name];
          else if (control.type !== 'password') control.value = saved[control.name];
        });
      } catch (error) { /* ignore malformed prototype data */ }
    }
    function setDirtyState() {
      dirty = serialise() !== initialSnapshot || !!one('#accountPassword').value || !!one('#accountPasswordConfirm').value;
      saveButton.disabled = !dirty;
      if (dirty) setAlert(status, '저장하지 않은 변경사항이 있습니다.', 'warning');
      else setAlert(status, '', '');
    }
    function focusInitialControl() {
      window.setTimeout(function () {
        var first = one('[data-account-initial-focus]', modal);
        if (first) first.focus();
      }, 0);
    }
    function openAccount(trigger) {
      returnFocus = trigger || doc.activeElement;
      restoreSaved();
      clearErrors(form);
      var password = one('#accountPassword');
      var confirm = one('#accountPasswordConfirm');
      if (password) password.value = '';
      if (confirm) confirm.value = '';
      applySmsAvailability();
      initialSnapshot = serialise();
      dirty = false;
      saveButton.disabled = true;
      setAlert(status, '', '');
      modalLayer.classList.add('open');
      modalLayer.setAttribute('aria-hidden', 'false');
      body.classList.add('aae-account-open');
      focusInitialControl();
    }
    function leaveAccount() {
      if (dirty && !window.confirm('저장하지 않은 변경사항을 취소하시겠습니까?')) return;
      dirty = false;
      if (inline) {
        modalLayer.classList.remove('open');
        modalLayer.setAttribute('aria-hidden', 'true');
        body.classList.remove('aae-account-open');
        if (returnFocus && typeof returnFocus.focus === 'function') returnFocus.focus();
        return;
      }
      if (returnUrl && /^(\.\.\/|\.\/)/.test(returnUrl)) { location.href = returnUrl; return; }
      if (doc.referrer && doc.referrer !== location.href) { history.back(); return; }
      location.href = '../Vehicle%20Summary/vehicle-summary-tobe-3.html';
    }
    function applySmsAvailability() {
      var korean = body.dataset.accountCountry === 'KR';
      all('[data-sms-setting]').forEach(function (input) { input.disabled = !korean; });
      one('#smsAvailability').textContent = korean ? 'SMS · 한국 사용자' : 'SMS · 지원 국가 아님';
    }

    restoreSaved();
    var restoredLanguage = one('#accountLanguage');
    if (restoredLanguage) {
      doc.documentElement.lang = restoredLanguage.value;
      storageSet(localStorage, 'miq-language', restoredLanguage.value);
    }
    applySmsAvailability();
    initialSnapshot = serialise();
    saveButton.disabled = true;
    all('input, select', form).forEach(function (control) {
      control.addEventListener('input', setDirtyState);
      control.addEventListener('change', setDirtyState);
    });
    all('[data-account-close]').forEach(function (button) { button.addEventListener('click', leaveAccount); });
    modalLayer.addEventListener('mousedown', function (event) {
      if (event.target === modalLayer) {
        event.stopPropagation();
        event.preventDefault();
        leaveAccount();
      }
    });
    modal.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.stopPropagation();
        event.preventDefault();
        leaveAccount();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusables = all('button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]', modal).filter(visible);
      if (!focusables.length) return;
      var first = focusables[0];
      var last = focusables[focusables.length - 1];
      if (event.shiftKey && doc.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && doc.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      clearErrors(form);
      var password = one('#accountPassword');
      var confirm = one('#accountPasswordConfirm');
      var name = one('#accountName');
      var phone = one('#accountPhone');
      var email = one('#accountEmail');
      var valid = true;
      if (!name.value.trim()) { errorFor(name, '이름을 입력해 주세요.'); valid = false; }
      if (!/^\d{6,15}$/.test(phone.value.replace(/[-\s]/g, ''))) { errorFor(phone, '전화번호 숫자 6~15자를 입력해 주세요.'); valid = false; }
      if (!EMAIL_RULE.test(email.value.trim())) { errorFor(email, '이메일 형식을 확인해 주세요.'); valid = false; }
      if (password.value || confirm.value) {
        if (!PASSWORD_RULE.test(password.value)) { errorFor(password, '12자 이상이며 영문·숫자·특수문자를 모두 포함해야 합니다.'); valid = false; }
        if (confirm.value !== password.value) { errorFor(confirm, '비밀번호가 일치하지 않습니다.'); valid = false; }
      }
      if (!valid) { setAlert(status, '입력 내용을 확인해 주세요.', 'danger'); focusFirstInvalid(form); return; }
      var saved = {};
      // Preserve channels absent from this web form, including mobile PUSH.
      try { var prior = JSON.parse(storageGet(localStorage, 'miq-account-settings') || '{}');
        ['pushRealtimeShock','pushRealtimeVehicleError','pushRealtimeBattery','pushMarketing'].forEach(function(key){if(Object.prototype.hasOwnProperty.call(prior,key))saved[key]=prior[key];});
      } catch (error) {}
      all('[name]', form).forEach(function (control) {
        if (control.type === 'password') return;
        saved[control.name] = control.type === 'checkbox' ? control.checked : control.value;
      });
      storageSet(localStorage, 'miq-account-settings', JSON.stringify(saved));
      password.value = '';
      confirm.value = '';
      initialSnapshot = serialise();
      dirty = false;
      saveButton.disabled = true;
      setAlert(status, '내 계정 설정을 저장했습니다.', 'success');
    });
    modalLayer._miqAccountController = { open: openAccount, close: leaveAccount };
    if (inline) {
      modalLayer.classList.remove('open');
      modalLayer.setAttribute('aria-hidden', 'true');
    } else {
      body.classList.add('aae-account-open');
      focusInitialControl();
    }
    return modalLayer._miqAccountController;
  }

  function init() {
    setLanguageControls();
    bindPasswordToggles(doc);
    if (body.dataset.authPage === 'login') initLogin();
    if (body.dataset.authPage === 'find-password') initPasswordRecovery();
    if (body.dataset.authPage === 'registration') initRegistration();
    if (body.dataset.accountPage === 'true') initAccount();
  }

  window.MIQ_ACCOUNT_ENHANCEMENTS = window.MIQ_ACCOUNT_ENHANCEMENTS || {};
  window.MIQ_ACCOUNT_ENHANCEMENTS.initAccount = initAccount;

  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
  else init();
})();
