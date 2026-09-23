/* Delivery-only clock. Every surface reads the same authored demo snapshot. */
(() => {
  const NativeDate = Date, instant = NativeDate.parse('2026-09-22T15:00:00+09:00');
  const DemoDate = new Proxy(NativeDate, {
    construct(target, args) { return Reflect.construct(target, args.length ? args : [instant]); },
    apply() { return new NativeDate(instant).toString(); },
    get(target, key) { return key === 'now' ? () => instant : Reflect.get(target, key); }
  });
  window.Date = DemoDate;
  window.MIQDemo = Object.freeze({ date: '2026-09-22', snapshot: '2026-09-22 15:00', version: '20260922-r1' });
  if (location.pathname.includes('/dealer/') && new URLSearchParams(location.search).has('role')) {
    const role = new URLSearchParams(location.search).get('role');
    if (['representative', 'staff'].includes(role)) localStorage.setItem('linqDealerMobileRole', role);
  }
})();
