/* Isolated internal operations prototype. No existing management stores or
   server endpoints are changed. Role query is a preview gate, not server auth. */
(function (root) {
  'use strict';
  var registry = Object.create(null), prefix = 'linq.operations.v1.', modalSequence = 0;
  var memory = Object.create(null);
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c];
    });
  }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function internal() { return new URLSearchParams(root.location.search).get('role') === 'internal'; }
  function read(key, seed) {
    try {
      var stored = root.localStorage.getItem(prefix + key);
      if (stored !== null) return JSON.parse(stored);
    } catch (error) { /* Browsers with storage disabled still support the session. */ }
    return clone(Object.prototype.hasOwnProperty.call(memory, key) ? memory[key] : seed);
  }
  function write(key, value) {
    if (!internal()) throw new Error('내부 사용자 전용 기능입니다.');
    memory[key] = clone(value);
    try { root.localStorage.setItem(prefix + key, JSON.stringify(value)); }
    catch (error) { notify('브라우저 저장 공간을 사용할 수 없어 현재 화면에서만 유지됩니다.'); }
    return value;
  }
  function notify(text) {
    var node = document.getElementById('opsToast');
    if (!node) {
      node = document.createElement('div'); node.id = 'opsToast'; node.className = 'ops-toast';
      node.setAttribute('role', 'status'); node.setAttribute('aria-live', 'polite'); document.body.appendChild(node);
    }
    node.textContent = text; node.hidden = false;
    clearTimeout(node._timer); node._timer = setTimeout(function () { node.hidden = true; }, 4000);
  }
  function csvCell(value) {
    var text = String(value == null ? '' : value);
    if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }
  function csvText(headers, rows) {
    return '\ufeff' + [headers].concat(rows).map(function (row) { return row.map(csvCell).join(','); }).join('\r\n');
  }
  function exportCsv(name, headers, rows) {
    var blob = new Blob([csvText(headers, rows)], {type:'text/csv;charset=utf-8;'});
    var url = URL.createObjectURL(blob), anchor = document.createElement('a');
    anchor.href = url; anchor.download = name.replace(/\.csv$/i, '') + '.csv';
    document.body.appendChild(anchor); anchor.click(); anchor.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    notify('조회 결과 ' + rows.length + '건을 내보냈습니다.');
  }
  function modal(options) {
    if (!internal()) return;
    var previous = document.activeElement, id = 'opsModal' + (++modalSequence);
    var dim = document.createElement('div'); dim.className = 'dim open ops-modal';
    dim.style.zIndex = String(250 + modalSequence); dim.setAttribute('data-ops-modal', 'true');
    dim.innerHTML = '<form class="modal' + (options.wide ? ' lg' : '') + '" role="dialog" aria-modal="true" aria-labelledby="' + id + 'Title">' +
      '<div class="modal__head"><h2 class="modal__title" id="' + id + 'Title">' + esc(options.title) + '</h2><button class="modal__x" type="button" data-ops-close aria-label="닫기">✕</button></div>' +
      '<div class="modal__body">' + options.body + '<p class="ops-modal-error" role="alert" hidden></p></div>' +
      '<div class="modal__foot"><button class="btn" type="button" data-ops-close>' + (options.submitLabel === '닫기' ? '닫기' : '취소') + '</button>' +
      (options.submitLabel === '닫기' ? '' : '<button class="btn btn--pri" type="submit">' + esc(options.submitLabel || '저장') + '</button>') + '</div></form>';
    document.body.appendChild(dim); var form = dim.querySelector('form');
    function close() {
      dim.remove(); document.removeEventListener('keydown', keyHandler);
      if (previous && previous.isConnected) previous.focus();
    }
    function keyHandler(event) {
      var dialogs = document.querySelectorAll('[data-ops-modal]');
      if (dialogs[dialogs.length - 1] !== dim) return;
      if (event.key === 'Escape') { event.preventDefault(); close(); }
      if (event.key === 'Tab') {
        var nodes = Array.from(form.querySelectorAll('button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href]')).filter(function (node) { return node.getClientRects().length; });
        var first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', keyHandler);
    dim.addEventListener('click', function (event) { if (event.target === dim || event.target.closest('[data-ops-close]')) close(); });
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); if (!form.reportValidity()) return;
      var button = form.querySelector('[type="submit"]'); if (button) button.disabled = true;
      var errorNode = form.querySelector('.ops-modal-error'); errorNode.hidden = true;
      try { if (options.onSubmit) await options.onSubmit(form, close); else close(); }
      catch (error) { errorNode.textContent = error.message || '입력 내용을 확인해 주세요.'; errorNode.hidden = false; }
      finally { if (button) button.disabled = false; }
    });
    var focus = form.querySelector('input:not([readonly]), select, textarea, button'); if (focus) focus.focus();
    if (options.onOpen) options.onOpen(form, close);
    return {form:form, el:dim, close:close};
  }
  function confirm(options) {
    return modal({title:options.title || '변경 확인', body:options.body,
      submitLabel:options.submitLabel || '확인', onSubmit:function (form, close) {
        var result = options.onConfirm();
        if (result && typeof result.then === 'function') return result.then(function () { close(); });
        close();
      }});
  }
  function grid(host, options) {
    var rows = (options.rows || []).slice(), columns = options.columns || [], page = 1;
    var pageSize = options.pageSize || 15, sort = options.defaultSort || {key:'',dir:'asc'};
    host.classList.add('ops-table-host');
    host.innerHTML = '<div class="list-head ops-list-head"><span class="list-head__count" role="status">총 <b>' + rows.length + '</b>건</span>' +
      '<div class="ops-actions">' + (options.toolbar || '') + (options.export === false ? '' : '<button class="btn btn--sm" type="button" data-ops-export title="현재 조건에 맞는 모든 페이지의 조회 결과를 내보냅니다.">내보내기</button>') + '</div></div>' +
      '<div class="tbl-wrap ops-grid-body"></div><div class="ops-grid-footer"></div>';
    function ordered() {
      var col = columns.find(function (item) { return item.key === sort.key; });
      if (!col) return rows.slice();
      return rows.slice().sort(function (a, b) {
        var av = col.sortValue ? col.sortValue(a) : a[col.key], bv = col.sortValue ? col.sortValue(b) : b[col.key];
        var diff = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av == null ? '' : av).localeCompare(String(bv == null ? '' : bv), 'ko', {numeric:true});
        return sort.dir === 'desc' ? -diff : diff;
      });
    }
    var currentRows = [];
    function draw() {
      var orderedRows = ordered(), pages = Math.max(1, Math.ceil(rows.length / pageSize));
      page = Math.min(page, pages); currentRows = orderedRows.slice((page - 1) * pageSize, page * pageSize);
      host.querySelector('.ops-grid-body').innerHTML = '<table class="tbl ops-table"><caption class="ops-sr-only">' + esc(options.caption || '조회 결과') + '</caption><thead><tr>' + columns.map(function (col) {
        var sortable = col.sortable !== false && col.key && col.key !== 'actions';
        return '<th scope="col" class="' + esc(col.className || '') + '"' + (sortable ? ' aria-sort="' + (sort.key === col.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none') + '"' : '') + '>' +
          (sortable ? '<button class="ops-sort" type="button" data-ops-sort="' + esc(col.key) + '">' + esc(col.label) + ' <span aria-hidden="true">' + (sort.key === col.key ? (sort.dir === 'asc' ? '↑' : '↓') : '↕') + '</span></button>' : esc(col.label)) + '</th>';
      }).join('') + '</tr></thead><tbody>' + (currentRows.length ? currentRows.map(function (row, index) {
        return '<tr data-ops-row="' + index + '">' + columns.map(function (col) {
          return '<td class="' + esc(col.className || '') + '">' + (col.render ? col.render(row) : esc(row[col.key] == null ? '—' : row[col.key])) + '</td>';
        }).join('') + '</tr>';
      }).join('') : '<tr><td class="ops-empty" colspan="' + columns.length + '">' + esc(options.emptyText || '조회 결과가 없습니다. 검색 조건을 확인해 주세요.') + '</td></tr>') + '</tbody></table>';
      var start = Math.max(1, Math.min(page - 2, pages - 4)), end = Math.min(pages, start + 4), buttons = '';
      for (var i = start; i <= end; i++) buttons += '<button class="btn btn--sm' + (i === page ? ' btn--pri' : '') + '" type="button" data-ops-page="' + i + '" aria-label="' + i + '페이지"' + (i === page ? ' aria-current="page"' : '') + '>' + i + '</button>';
      host.querySelector('.ops-grid-footer').innerHTML = '<span>' + (rows.length ? ((page - 1) * pageSize + 1) + '–' + Math.min(page * pageSize, rows.length) : '0') + ' / ' + rows.length + '건</span><nav class="ops-pagination" aria-label="목록 페이지">' +
        '<button class="btn btn--sm" type="button" data-ops-page="' + (page - 1) + '" aria-label="이전 페이지"' + (page === 1 ? ' disabled' : '') + '>‹</button>' + buttons +
        '<button class="btn btn--sm" type="button" data-ops-page="' + (page + 1) + '" aria-label="다음 페이지"' + (page === pages ? ' disabled' : '') + '>›</button></nav>';
    }
    host.onclick = function (event) {
      var sortButton = event.target.closest('[data-ops-sort]');
      if (sortButton) { var key = sortButton.dataset.opsSort; sort = {key:key, dir:sort.key === key && sort.dir === 'asc' ? 'desc' : 'asc'}; page = 1; draw(); return; }
      var pageButton = event.target.closest('button[data-ops-page]');
      if (pageButton && !pageButton.disabled) { page = Number(pageButton.dataset.opsPage); draw(); return; }
      if (event.target.closest('[data-ops-export]')) {
        var exportCols = columns.filter(function (col) { return col.export !== false && col.key !== 'actions'; });
        exportCsv(options.exportName || document.title.split(' · ')[0], exportCols.map(function (col) { return col.label; }), ordered().map(function (row) {
          return exportCols.map(function (col) { return col.exportValue ? col.exportValue(row) : row[col.key]; });
        })); return;
      }
      var action = event.target.closest('[data-action]'), tr = event.target.closest('[data-ops-row]');
      if (action && tr && options.onAction) { event.preventDefault(); options.onAction(action.dataset.action, currentRows[Number(tr.dataset.opsRow)]); }
    };
    draw();
    return {refresh:draw};
  }
  function register(key, render) { registry[key] = render; }
  function start() {
    var el = document.getElementById('opsContent');
    if (!el || document.body.dataset.gnb !== 'ops') return;
    if (!internal()) { el.innerHTML = ''; return; }
    var render = registry[document.body.dataset.opsPage];
    if (render) { render({el:el}); el.removeAttribute('aria-busy'); }
  }
  root.MIQOps = {register:register,esc:esc,read:read,write:write,notify:notify,exportCsv:exportCsv,modal:modal,confirm:confirm,grid:grid};
  if (typeof module === 'object' && module.exports) module.exports = {esc:esc,csvText:csvText};
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else setTimeout(start, 0);
  }
}(typeof window !== 'undefined' ? window : globalThis));
