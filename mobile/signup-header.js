(() => {
  document.querySelectorAll('[data-mobile-preauth-header]').forEach(host => {
    const languageId = host.dataset.languageId || 'preauth-language';
    const brandHref = host.dataset.brandHref || './login.html';
    host.className = 'mobile-preauth-header';
    host.innerHTML = `
      <a class="mobile-preauth-header__brand" href="${brandHref}" aria-label="Bobcat MACHINE IQ 로그인">
        <img src="./shared/bobcat-machine-iq.svg" alt="Bobcat MACHINE IQ">
      </a>
      <label class="mobile-preauth-header__language">
        <span class="sr-only">언어 선택</span>
        <select id="${languageId}" aria-label="언어 선택">
          <option value="ko">한국어</option>
          <option value="en">English</option>
          <option value="fr">Français</option>
          <option value="es">Español</option>
          <option value="de">Deutsch</option>
          <option value="ja">日本語</option>
        </select>
      </label>`;
  });
})();
