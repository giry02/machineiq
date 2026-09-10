/* ══════════════════════════════════════════════════════════════
   Bobcat MachineIQ '26 — 좌측 내비게이션 트리 (_shared/lnb-tree.js)

   운행이력 > 요약정보에서 확정한 LNB 형태를 다른 화면에도 그대로 쓰기 위한 공용 컴포넌트.
     · 그룹별 / 분류별 / 차량 세 리스트를 각각 expand · collapse
     · 그룹과 분류는 함께(AND) 적용, 차량을 고르면 그 차량만 선택
     · 검색어(그룹 · 모델 · 차대번호 · 분류)로 세 리스트가 동시에 좁혀짐
     · 각 항목의 대수는 반대 축 선택 · 검색어가 반영된 값

   사용법 (자동)
     <aside class="lnb" data-lnb-tree data-hint="…"></aside>
     <script src="../_shared/fleet.js"></script>
     <script src="../_shared/lnb-tree.js"></script>
     → DOMContentLoaded 시 자동 렌더. 선택이 바뀌면 [data-lnb-label] 의 텍스트를 갱신한다.
       data-vin / data-group / data-type 으로 초기 선택을 지정할 수 있다.

   사용법 (직접 제어 — 예: 요약정보 화면)
     var tree = MIQ.lnbTree(el, { vehicles: rows, onChange: function (s) { … } });
     tree.get();            → { group, type, vin }
     tree.set({ vin: … });  → 선택 지정 (onChange 호출)
     tree.render();         → 다시 그리기

   nav.js 는 문서 전역에서 .lnb__group-title(형제 숨김 방식 접기)과 .lnb__item(단일 active)을
   처리하므로, 이 컴포넌트는 자체 핸들러에서 전파를 막아 상태 기반 렌더링만 남긴다.
   ══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var MIQ = window.MIQ = window.MIQ || {};

  var CSS =
    '.lnb__company{font-size:14px;font-weight:700;padding:0 18px 14px;color:#1a1a1a}' +
    '.lnb__search{margin:0 14px 12px;display:flex;align-items:center;height:34px;border:1px solid #dfdfdf;border-radius:4px;padding:0 10px;gap:6px}' +
    '.lnb__search input{border:none;outline:none;flex:1;font-size:13px;background:transparent}' +
    '.lnb__sec{border-bottom:1px solid #f2f2f2}' +
    '.lnb__sec:last-of-type{border-bottom:none}' +
    '.lnb__group-title{padding:10px 18px;font-size:13px;font-weight:600;color:#333;display:flex;align-items:center;gap:6px;cursor:pointer;user-select:none}' +
    '.lnb__group-title:hover{background:#f8f8f8}' +
    '.lnb__group-title .arw{font-size:9px;color:#999;width:10px;flex-shrink:0}' +
    '.lnb__group-title .lnb__cnt{margin-left:auto}' +
    '.lnb__sec.collapsed .lnb__body{display:none}' +
    '.lnb__body{padding-bottom:6px}' +
    '.lnb__item{padding:8px 18px 8px 34px;font-size:13px;color:#666;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:6px}' +
    '.lnb__item:hover{background:#f8f8f8}' +
    '.lnb__item.active{color:#ff3600;font-weight:600;background:#fff5f3;box-shadow:inset 2px 0 0 #ff3600}' +
    '.lnb__item.is-disabled,.lnb__item.is-disabled:hover{color:#999;cursor:not-allowed;background:#fafafa;box-shadow:none;font-weight:400}' +
    '.lnb__cnt{font-size:11px;color:#aaa;font-weight:500}' +
    '.lnb__item.active .lnb__cnt{color:#ff3600}' +
    '.lnb__vlist{max-height:260px;overflow:auto}' +
    '.lnb__veh{padding:7px 18px 7px 34px;cursor:pointer;border-bottom:1px solid #fafafa}' +
    '.lnb__veh:hover{background:#f8f8f8}' +
    '.lnb__veh.active{background:#fff5f3;box-shadow:inset 2px 0 0 #ff3600}' +
    '.lnb__veh .m{font-size:12px;font-weight:700;color:#333;display:flex;align-items:center;gap:5px}' +
    '.lnb__veh.active .m{color:#ff3600}' +
    '.lnb__veh .t{font-size:11px;color:#999;margin-top:1px}' +
    '.lnb__veh .st{width:6px;height:6px;border-radius:50%;background:#2b8a3e;flex-shrink:0}' +
    '.lnb__veh .st.off{background:#ced4da}' +
    '.lnb__veh .st.unknown{box-sizing:border-box;background:#fff;border:1px solid #adb5bd}' +
    '.lnb__empty{padding:10px 18px 10px 34px;font-size:12px;color:#aaa}' +
    '.lnb__hint{margin:12px 14px 0;padding:9px 11px;background:#f8f9fa;border:1px dashed #dcdcdc;border-radius:6px;font-size:11px;color:#777;line-height:1.6}' +
    '.lnb__hint b{color:#555}';

  var styled = false;
  function injectCSS() {
    if (styled) return;
    styled = true;
    var st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);   /* 페이지 <style> 뒤에 붙어 LNB 형태를 통일 */
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

  MIQ.lnbTree = function (root, opts) {
    if (!root) return null;
    opts = opts || {};
    injectCSS();

    var allVehicles = (opts.vehicles || MIQ.FLEET_CATALOG || MIQ.FLEET || []).slice();
    var vehicles = allVehicles.slice();
    var types = opts.types || MIQ.TYPES || [];
    var groups = vehicles.map(function (v) { return v.group; })
      .filter(function (g, i, a) { return a.indexOf(g) === i; });
    var companyName = opts.company || MIQ.COMPANY || '';
    var currentCompanyId = opts.companyId || 'all';

    var st = {
      g: opts.group || null,
      t: opts.type || null,
      vin: opts.vin || null,
      q: '',
      open: { group: true, type: true, veh: true }
    };
    if (opts.open) {
      if (opts.open.group === false) st.open.group = false;
      if (opts.open.type === false) st.open.type = false;
      if (opts.open.veh === false) st.open.veh = false;
    }

    /* ── 정적 골격 : 회사명 · 검색 · 3개 섹션 · 안내문 ── */
    root.innerHTML =
      "<div class='lnb__company'>" + esc(companyName) + "</div>"
      + "<div class='lnb__search'><input aria-label='그룹 또는 차량 검색' placeholder='그룹 또는 차량'/></div>"
      + "<div class='lnb__sec' data-sec='group'>"
      + "<div class='lnb__group-title'><span class='arw'>▼</span>그룹별 <span class='lnb__cnt'></span></div>"
      + "<div class='lnb__body'></div></div>"
      + "<div class='lnb__sec' data-sec='type'>"
      + "<div class='lnb__group-title'><span class='arw'>▼</span>분류별 <span class='lnb__cnt'></span></div>"
      + "<div class='lnb__body'></div></div>"
      + "<div class='lnb__sec' data-sec='veh'>"
      + "<div class='lnb__group-title'><span class='arw'>▼</span>차량 <span class='lnb__cnt'></span></div>"
      + "<div class='lnb__body'><div class='lnb__vlist'></div></div></div>"
      + (opts.hint ? "<div class='lnb__hint'>" + opts.hint + "</div>" : '');

    var sec = {};
    Array.prototype.forEach.call(root.querySelectorAll('.lnb__sec'), function (el) {
      sec[el.getAttribute('data-sec')] = el;
    });
    var input = root.querySelector('.lnb__search input');

    function hit(v) {
      if (!st.q) return true;
      return (v.model + ' ' + v.vin + ' ' + v.group + ' ' + v.type).toLowerCase()
        .indexOf(st.q.toLowerCase()) >= 0;
    }
    /* 그룹 AND 분류 AND 검색어 */
    function scoped() {
      return vehicles.filter(function (v) {
        if (st.g && v.group !== st.g) return false;
        if (st.t && v.type !== st.t) return false;
        return hit(v);
      });
    }
    function selection() {
      var veh = st.vin ? vehicles.filter(function (v) { return v.vin === st.vin; })[0] || null : null;
      return {
        group: st.g, type: st.t, vin: st.vin, vehicle: veh,
        label: veh ? veh.model : ([st.g, st.t].filter(Boolean).join(' · ') || '전체'),
        vehicles: veh ? [veh] : scoped()
      };
    }

    /* ── 한 축(그룹/분류) 목록. 대수는 반대 축 · 검색어 반영 ── */
    function renderAxis(kind) {
      var keys = kind === 'group' ? groups : types;
      var cur = kind === 'group' ? st.g : st.t;
      var pool = vehicles.filter(function (v) {
        if (kind === 'group' && st.t && v.type !== st.t) return false;
        if (kind === 'type' && st.g && v.group !== st.g) return false;
        return hit(v);
      });
      var html = "<div class='lnb__item" + (cur === null ? ' active' : '') + "' data-key=''>"
        + "<span>전체</span><span class='lnb__cnt'>" + pool.length + "대</span></div>";
      html += keys.map(function (k) {
        var n = pool.filter(function (v) { return (kind === 'group' ? v.group : v.type) === k; }).length;
        return "<div class='lnb__item" + (cur === k ? ' active' : '') + "' data-key='" + esc(k) + "'>"
          + "<span>" + esc(k) + "</span><span class='lnb__cnt'>" + n + "대</span></div>";
      }).join('');

      var body = sec[kind].querySelector('.lnb__body');
      if (kind === 'group' && currentCompanyId === 'all') {
        body.innerHTML = "<div class='lnb__item active is-disabled' aria-disabled='true'>"
          + "<span>업체 선택 후 사용</span><span class='lnb__cnt'>-</span></div>";
        sec[kind].querySelector('.lnb__group-title .lnb__cnt').textContent = '0개';
        return;
      }
      body.innerHTML = html;
      sec[kind].querySelector('.lnb__group-title .lnb__cnt').textContent = keys.length + '개';

      Array.prototype.forEach.call(body.querySelectorAll('.lnb__item'), function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();                 /* nav.js 공용 .lnb__item 핸들러 회피 */
          var k = el.getAttribute('data-key') || null;
          if (kind === 'group') st.g = (st.g === k ? null : k);
          else st.t = (st.t === k ? null : k);
          st.vin = null;
          emit(true);
        });
      });
    }

    /* ── 차량 섹션 ── */
    function renderVehicles() {
      var rows = scoped();
      sec.veh.querySelector('.lnb__group-title .lnb__cnt').textContent = rows.length + '대';
      var box = sec.veh.querySelector('.lnb__vlist');
      box.innerHTML = rows.length
        ? rows.map(function (v) {
            var connClass = v.conn === true ? '' : v.conn === false ? ' off' : ' unknown';
            var connTitle = v.conn === true ? '연결됨' : v.conn === false ? '연결 끊김' : '통신 정보 미제공';
            return "<div class='lnb__veh" + (st.vin === v.vin ? ' active' : '') + "' data-vin='" + esc(v.vin) + "'>"
              + "<div class='m' title='" + connTitle + "'><span class='st" + connClass + "'></span>" + esc(v.model) + "</div>"
              + "<div class='t'>" + esc(v.type) + ' · ' + esc(v.group) + "</div></div>";
          }).join('')
        : "<div class='lnb__empty'>해당 차량 없음</div>";

      Array.prototype.forEach.call(box.querySelectorAll('.lnb__veh'), function (el) {
        el.addEventListener('click', function (e) {
          e.stopPropagation();
          var vin = el.getAttribute('data-vin');
          st.vin = (st.vin === vin) ? null : vin;
          emit(true);
        });
      });
    }

    /* ── 섹션 펼침/접힘 ── */
    function renderOpen() {
      ['group', 'type', 'veh'].forEach(function (k) {
        var on = st.open[k];
        sec[k].classList.toggle('collapsed', !on);
        sec[k].querySelector('.arw').textContent = on ? '▼' : '▶';
      });
    }

    function render() {
      /* nav.js가 현재 공통 240px 메뉴로 전환한 뒤에는 과거 트리 인스턴스가
         target-change 이벤트로 DOM을 되살리지 못하게 한다. 상태 계산과 onChange는
         그대로 유지하되 화면 렌더링의 소유권만 공통 메뉴에 넘긴다. */
      if (root.__miqLnbDisabled || root.getAttribute('data-miq-side-menu') === 'true') return;
      renderAxis('group');
      renderAxis('type');
      renderVehicles();
      renderOpen();
    }

    /* 상단 공통 조회의 업체 범위를 LNB에도 동일하게 적용한다.
       차량 상세형(profile=vehicle)은 업체·그룹을 잠근 채 차량만 바꾸므로 제외한다. */
    function companyLabel(companyId) {
      if (!companyId || companyId === 'all') return '전체 업체';
      var row = allVehicles.filter(function (v) { return String(v.companyId || '1933') === String(companyId); })[0];
      if (row && row.companyName) return row.companyName;
      var select = document.querySelector('[data-target-company]');
      var option = select && select.options[select.selectedIndex];
      return option ? option.text.replace(/\s*·\s*\d+대\s*$/, '') : '선택 업체';
    }
    function applyCompanyScope(companyId) {
      currentCompanyId = !companyId ? 'all' : String(companyId);
      vehicles = currentCompanyId === 'all' ? allVehicles.slice() : allVehicles.filter(function (v) {
        return String(v.companyId || '1933') === currentCompanyId;
      });
      groups = currentCompanyId === 'all' ? [] : vehicles.map(function (v) { return v.group; })
        .filter(function (g, i, a) { return a.indexOf(g) === i; });
      if (currentCompanyId === 'all') st.g = null;
      if (st.g && groups.indexOf(st.g) < 0) st.g = null;
      if (st.t && !vehicles.some(function (v) { return v.type === st.t; })) st.t = null;
      if (st.vin && !vehicles.some(function (v) { return v.vin === st.vin; })) st.vin = null;
      companyName = companyLabel(companyId);
      var company = root.querySelector('.lnb__company');
      if (company) company.textContent = companyName;
      render();
    }

    /* 선택 변경 : 다시 그리고 · [data-lnb-label] 갱신 · onChange 호출 */
    function emit(notifyTarget) {
      render();
      var sel = selection();
      if (opts.label !== false) {
        Array.prototype.forEach.call(document.querySelectorAll('[data-lnb-label]'), function (el) {
          el.textContent = '- ' + sel.label;
        });
      }
      if (typeof opts.onChange === 'function') opts.onChange(sel);
      if (notifyTarget) {
        document.dispatchEvent(new CustomEvent('miq:lnb-target-change', {
          detail: { group: sel.group, type: sel.type, equipmentId: sel.vin }
        }));
      }
    }

    /* 섹션 헤더 = expand / collapse (조회 조건은 그대로) */
    Array.prototype.forEach.call(root.querySelectorAll('.lnb__group-title'), function (h) {
      h.addEventListener('click', function (e) {
        e.stopPropagation();                   /* nav.js 공용 접기 핸들러 회피 */
        var k = h.parentNode.getAttribute('data-sec');
        st.open[k] = !st.open[k];
        renderOpen();
      });
    });

    input.addEventListener('input', function () {
      st.q = this.value.trim();
      st.vin = null;
      emit(false);
    });

    render();
    root.__miqLnb = true;

    document.addEventListener('miq:target-change', function (event) {
      var target = event.detail || {};
      if (target.profile === 'vehicle') return;
      applyCompanyScope(target.companyId || 'all');
    });
    if (window.MIQ_TARGET_CONTEXT && window.MIQ_TARGET_CONTEXT.profile !== 'vehicle') {
      applyCompanyScope(window.MIQ_TARGET_CONTEXT.companyId || 'all');
    }

    return {
      get: function () { return selection(); },
      set: function (s) {
        if (!s) return;
        if ('group' in s) {
          var nextGroup = s.group || null;
          st.g = currentCompanyId !== 'all' && (!nextGroup || groups.indexOf(nextGroup) > -1) ? nextGroup : null;
        }
        if ('type' in s) {
          var nextType = s.type || null;
          st.t = !nextType || vehicles.some(function (v) { return v.type === nextType; }) ? nextType : null;
        }
        if ('vin' in s) {
          var nextVin = s.vin || null;
          st.vin = !nextVin || vehicles.some(function (v) { return v.vin === nextVin; }) ? nextVin : null;
        }
        emit(false);
      },
      setCompany: function (companyId) { applyCompanyScope(companyId || 'all'); },
      render: render
    };
  };

  /* ── 자동 초기화 : data-lnb-tree 를 가진 LNB ── */
  function auto() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-lnb-tree]'), function (el) {
      if (el.__miqLnb) return;                 /* 페이지가 직접 초기화한 경우 건너뜀 */
      MIQ.lnbTree(el, {
        company: el.getAttribute('data-company') || undefined,
        group: el.getAttribute('data-group') || null,
        type: el.getAttribute('data-type') || null,
        vin: el.getAttribute('data-vin') || null,
        hint: el.getAttribute('data-hint') || null
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto);
  else auto();
})();
