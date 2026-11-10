const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const root = path.resolve(__dirname, '../web');
const context = { window: {}, Intl };
vm.runInNewContext(fs.readFileSync(path.join(root, '_shared/common-logic.js'), 'utf8'), context);
const integer = context.MIQCommon.numbers.integer;

test('WEB 표시만 정수 반올림하고 작은 값·음수·0·미수집을 구분한다', () => {
  for (const [value, text] of [[91.5,'92'], [91.499,'91'], [0.49,'0'], [0.5,'1'],
    [-0.49,'0'], [-0.5,'-1'], [-1.5,'-2'], [0,'0'], [1234.5,'1235']])
    assert.equal(integer(value), text);
  for (const value of [null, undefined, '', true, NaN, Infinity]) assert.equal(integer(value), '-');
  assert.equal(integer(1234.5, true), '1,235');
  const raw = { hours: 3.75, rate: 76.7441860465, latitude: 37.123456 };
  const snapshot = JSON.stringify(raw);
  assert.equal(integer(raw.hours), '4');
  assert.equal(integer(raw.rate), '77');
  assert.equal(JSON.stringify(raw), snapshot);
});

test('기존 대시보드·보조 대시보드는 공통 표시를 사용하고 좌표·임계 설정은 보존한다', () => {
  for (const file of ['dashboard-two-tab.js', 'dashboard-work-idle-compact.js']) {
    const source = fs.readFileSync(path.join(root, '_shared', file), 'utf8');
    assert.match(source, /function hours\(n\)\{return known\?MIQCommon\.numbers\.integer\(n,true\):'—';\}/);
    assert.doesNotMatch(source, /minimumFractionDigits:1,maximumFractionDigits:1/);
  }
  const route = fs.readFileSync(path.join(root, '_shared/map-route-preview.js'), 'utf8');
  assert.match(route, /MIQCommon\.numbers\.integer\(p\.speed\)/);
  assert.match(route, /p\.lat\.toFixed\(5\)/);
  const threshold = fs.readFileSync(path.join(root, '_shared/shock-range.js'), 'utf8');
  assert.match(threshold, /vals\[i\]\.toFixed\(1\)/);
});
