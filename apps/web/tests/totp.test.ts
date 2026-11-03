import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ownsTotpFactor,
  pendingHomeSafeFactors,
} from '../src/modules/identity/domain/totp.ts';

const factors = [
  {
    id: 'pending',
    factor_type: 'totp',
    status: 'unverified',
    friendly_name: 'HomeSafe test',
  },
  {
    id: 'verified',
    factor_type: 'totp',
    status: 'verified',
    friendly_name: 'HomeSafe active',
  },
  {
    id: 'other',
    factor_type: 'totp',
    status: 'unverified',
    friendly_name: 'Other app',
  },
  {
    id: 'phone',
    factor_type: 'phone',
    status: 'unverified',
    friendly_name: 'HomeSafe phone',
  },
];
test('initial verification accepts an owned pending TOTP factor', () => {
  assert.equal(ownsTotpFactor(factors, 'pending'), true);
  assert.equal(ownsTotpFactor(factors, 'verified'), true);
  assert.equal(ownsTotpFactor(factors, 'unknown'), false);
  assert.equal(ownsTotpFactor(factors, 'phone'), false);
});
test('replacement selects only unfinished HomeSafe TOTP factors', () =>
  assert.deepEqual(
    pendingHomeSafeFactors(factors).map((f) => f.id),
    ['pending'],
  ));
