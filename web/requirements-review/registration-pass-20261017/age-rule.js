/* Calendar-only prototype rule; no storage, network or personal-data logging. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MIQBirthdateRule = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function leap(year) { return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0); }
  function days(year, month) { return [31, leap(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1] || 0; }
  function evaluate(value, today) {
    var raw = [value.year, value.month, value.day].map(function (part) { return String(part == null ? '' : part).trim(); });
    if (raw.some(function (part) { return !part; })) return {state: 'missing', eligible: false};
    if (!/^\d{4}$/.test(raw[0]) || !/^\d{1,2}$/.test(raw[1]) || !/^\d{1,2}$/.test(raw[2])) return {state: 'invalid', eligible: false};
    var year = Number(raw[0]), month = Number(raw[1]), day = Number(raw[2]);
    if (year < 1 || month < 1 || month > 12 || day < 1 || day > days(year, month)) return {state: 'invalid', eligible: false};
    var number = year * 10000 + month * 100 + day;
    var now = today.year * 10000 + today.month * 100 + today.day;
    if (number > now) return {state: 'future', eligible: false};
    var age = today.year - year - ((today.month * 100 + today.day < month * 100 + day) ? 1 : 0);
    return {state: age >= 14 ? 'eligible' : 'underage', eligible: age >= 14};
  }
  return Object.freeze({evaluate: evaluate});
}));
