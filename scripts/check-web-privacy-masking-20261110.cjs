const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { spawnSync } = require('node:child_process');

const root = path.resolve(__dirname, '../web');
const commonSource = fs.readFileSync(path.join(root, '_shared/common-logic.js'), 'utf8');
const common = { module: { exports: {} }, Intl };
vm.runInNewContext(commonSource, common);
const privacy = common.module.exports.privacy;
for (const [value, expected] of [['홍길동', '홍*동'], ['박민', '박*'], ['김', '*'], ['Jane Doe', 'J******e'], ['e\u0301수민', 'e\u0301*민'], ['—', '—'], [null, '—']]) {
  assert.equal(privacy.maskPersonName(value), expected);
  assert.equal(privacy.maskPersonName(privacy.maskPersonName(value)), expected);
}
for (const [value, expected] of [['010-1234-5678', '010-****-5678'], ['+82 10 1234 5678', '+82 10 **** 5678'], ['123456', '1****6'], ['12', '**'], ['010-****-5678', '010-****-5678'], [null, '—']]) {
  assert.equal(privacy.maskPhoneNumber(value), expected);
  assert.equal(privacy.maskPhoneNumber(privacy.maskPhoneNumber(value)), expected);
}

const source = fs.readFileSync(path.join(root, '_shared/map-management-enhancements.js'), 'utf8');
const start = source.indexOf('    function maskUserRow(row, original) {');
const end = source.indexOf('    userRows.forEach', start);
assert.ok(start >= 0 && end > start);
const group = { attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } };
const row = {
  children: [{ textContent: 'privacy@example.test' }, { textContent: '검증이름' }, { textContent: '고객 직원' }, { textContent: '검증업체' }, {}, { textContent: '010-1234-5678' }],
  dataset: { owner: 'privacy@example.test' },
  querySelector: () => group,
};
const context = {
  userPrivateValues: new WeakMap(),
  MIQCommon: { privacy, view: { get: (node, key) => node[key], set: (node, key, value) => { node[key] = value; } } },
  row,
};
vm.runInNewContext(source.slice(start, end) + '\nmaskUserRow(row); maskUserRow(row);', context);
assert.equal(row.children[1].textContent, '검**름');
assert.equal(row.children[5].textContent, '010-****-5678');
assert.equal(group.attributes['aria-label'], '검**름 그룹');
assert.equal(context.userPrivateValues.get(row).name, '검증이름');
assert.equal(context.userPrivateValues.get(row).phone, '010-1234-5678');
const searchStart = source.indexOf('    function searchableUserText(row) {');
const searchEnd = source.indexOf('    function applyFilters()', searchStart);
vm.runInNewContext(source.slice(searchStart, searchEnd) + '\nresult = searchableUserText(row);', context);
assert.ok(context.result.includes('검증이름'));
assert.ok(context.result.includes('010-1234-5678'));

for (const file of ['common-logic.js', 'map-management-enhancements.js', 'operations-data.js', 'admin-authority.js']) {
  const result = spawnSync(process.execPath, ['--check', path.join(root, '_shared', file)], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
}
console.log('WEB privacy masking: helper/Unicode/idempotency/DOM/aria/original search/syntax checks passed.');
