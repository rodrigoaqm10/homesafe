import assert from 'node:assert/strict';
import { test } from 'node:test';
import jsQR from 'jsqr';
import { PNG } from 'pngjs';
import { prepareTotpEnrollment } from '../src/modules/identity/infrastructure/totp-qr.ts';

// Public, synthetic fixture. Never use for an actual account.
const secret = 'JBSWY3DPEHPK3PXP';
const uri = `otpauth://totp/HomeSafe:fixture?secret=${secret}&issuer=HomeSafe&algorithm=SHA1&digits=6&period=30`;
test('generated PNG can be scanned back to the exact TOTP URI', async () => {
  const result = await prepareTotpEnrollment({
    id: 'fixture',
    totp: { uri, secret },
  });
  assert.equal(result.error, '');
  assert.match(result.qr, /^data:image\/png;base64,/);
  const png = PNG.sync.read(Buffer.from(result.qr.split(',')[1], 'base64'));
  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  assert.equal(decoded?.data, uri);
  assert.equal(result.factorId, 'fixture');
});
test('malformed provider response returns a recoverable error and no secret', async () => {
  for (const input of [
    { id: 'fixture', totp: { uri: 'bad', secret } },
    { id: 'fixture', totp: { uri: 'https://example.com', secret } },
    { id: 'fixture', totp: { uri, secret: 'DIFFERENTSECRET2' } },
    { id: '', totp: { uri, secret } },
  ]) {
    const result = await prepareTotpEnrollment(input);
    assert.ok(result.error);
    assert.equal(result.secret, '');
    assert.equal(result.factorId, '');
    assert.equal(result.qr, '');
  }
});
