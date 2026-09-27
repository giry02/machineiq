(function () {
  const host = document.querySelector('[data-miq-auth-header]');
  if (!host) return;

  const base = host.dataset.base || '../';
  const page = document.body.dataset.authPage || '';
  const loginHref = page === 'login' ? '#login-panel' : base + 'Login/login-tobe.html';

  host.className = 'miq-auth-header';
  MIQCommon.view.set(host,"innerHTML",`
    <a class="miq-auth-brand" href="${base}Login/login-tobe.html" aria-label="Bobcat MACHINE IQ 로그인">
      <img src="${base}_shared/bobcat-machine-iq.svg" alt="Bobcat MACHINE IQ"/>
    </a>
    <div class="miq-auth-actions">
      <a class="miq-auth-login" href="${loginHref}">로그인</a>
    </div>`);


})();
