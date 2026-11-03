import QRCode from 'qrcode';
export type EnrollmentSetup = {
  error: string;
  factorId: string;
  qr: string;
  secret: string;
};
/** Generate locally: no authenticator secret is sent to a QR image service. */
export async function prepareTotpEnrollment(input: {
  id: string;
  totp: { uri: string; secret: string };
}): Promise<EnrollmentSetup> {
  try {
    const { uri, secret } = input.totp;
    if (uri.length > 2048 || !input.id || !/^[A-Z2-7]{16,128}$/i.test(secret))
      throw new Error('INVALID_TOTP');
    const parsed = new URL(uri);
    if (
      parsed.protocol !== 'otpauth:' ||
      parsed.hostname !== 'totp' ||
      parsed.searchParams.get('secret') !== secret
    )
      throw new Error('INVALID_TOTP');
    const qr = await QRCode.toDataURL(uri, {
      type: 'image/png',
      width: 280,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#142d36', light: '#ffffff' },
    });
    return { error: '', factorId: input.id, qr, secret };
  } catch {
    return {
      error:
        'No se pudo generar el QR. Pulsa Configurar mi autenticador para intentarlo nuevamente.',
      factorId: '',
      qr: '',
      secret: '',
    };
  }
}
