import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sessionCookieOptions } from '../src/lib/supabase/cookie-options.ts';
import { santiagoToIso } from '../src/modules/community/domain/time.ts';

test('cookies are HttpOnly, SameSite Lax and secure in production', () => {
  assert.deepEqual(sessionCookieOptions(undefined, true), {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
  });
  assert.equal(
    sessionCookieOptions('https://homesafe.example', true).secure,
    true,
  );
});
test('only loopback can use HTTP cookies', () => {
  assert.equal(
    sessionCookieOptions('http://127.0.0.1:3001', true).secure,
    false,
  );
  assert.throws(() => sessionCookieOptions('http://homesafe.example', true));
});
test('Santiago conversion respects winter and summer offsets', () => {
  assert.equal(santiagoToIso('2026-11-03T12:00'), '2026-11-03T15:00:00.000Z');
  assert.equal(santiagoToIso('2026-07-03T12:00'), '2026-07-03T16:00:00.000Z');
});
test('reject impossible and daylight-saving gap times', () => {
  assert.throws(() => santiagoToIso('2026-02-31T12:00'));
  assert.throws(() => santiagoToIso('2026-09-06T00:30'));
  assert.throws(() => santiagoToIso('bad'));
});
