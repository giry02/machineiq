(function () {
  const host = document.querySelector('[data-miq-auth-header]');
  if (!host) return;

  const base = host.dataset.base || '../';
  const page = document.body.dataset.authPage || '';
  const loginHref = page === 'login' ? '#login-panel' : base + 'Login/login-tobe.html';
  const currentLanguage = document.documentElement.lang === 'en' ? 'en' : 'ko';

  host.className = 'miq-auth-header';
  host.innerHTML = `
    <a class="miq-auth-brand" href="${base}Login/login-tobe.html" aria-label="Bobcat MACHINE IQ 로그인">
      <img src="${base}_shared/bobcat-machine-iq.svg" alt="Bobcat MACHINE IQ"/>
    </a>
    <div class="miq-auth-actions">
      <label class="miq-auth-language">
        <select class="pre__lang" aria-label="언어 선택" title="화면 언어 선택">
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="fr">Fran&ccedil;ais</option>
          <option value="es">Espa&ntilde;ol</option>
          <option value="de">Deutsch</option>
          <option value="it">Italiano</option>
          <option value="ja">日本語</option>
        </select>
      </label>
      <a class="miq-auth-login" href="${loginHref}">로그인</a>
    </div>`;

  const language = host.querySelector('select');
  language.value = currentLanguage;
  language.addEventListener('change', function () {
    document.documentElement.lang = this.value;
  });
})();
