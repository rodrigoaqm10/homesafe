import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clpAmount, money } from '../src/modules/finance/domain/money.ts';

test('CLP accepts integer amounts only within database bounds', () => {
  assert.equal(clpAmount('100000'), '100000');
  for (const amount of ['0', '-1', '1.5', '1e3', '9000000000001', 'abc'])
    assert.throws(() => clpAmount(amount));
});
test('format uses exact integers for large values', () =>
  assert.ok(money(BigInt('9000000000000')).includes('9.000.000.000.000')));
