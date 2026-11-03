'use server';
import { redirect } from 'next/navigation';
import {
  ownsTotpFactor,
  pendingHomeSafeFactors,
} from '@/modules/identity/domain/totp';
import { requireIdentity } from '@/modules/identity/infrastructure/session';
import { prepareTotpEnrollment } from '@/modules/identity/infrastructure/totp-qr';
export type MfaState = {
  error: string;
  factorId: string;
  qr: string;
  secret: string;
};
export async function enroll(
  _previous: MfaState,
  _form: FormData,
): Promise<MfaState> {
  const { client } = await requireIdentity();
  const { data: factors, error: listError } =
    await client.auth.mfa.listFactors();
  if (listError)
    return {
      error: 'No se pudo consultar tu configuración.',
      factorId: '',
      qr: '',
      secret: '',
    };
  if (factors.totp.some((f) => f.status === 'verified'))
    return {
      error: 'Ya tienes un autenticador verificado. Usa su código.',
      factorId: '',
      qr: '',
      secret: '',
    };
  // Replace only this account's unfinished HomeSafe setup. Verified factors stay intact.
  for (const factor of pendingHomeSafeFactors(factors.all)) {
    const { error: cleanupError } = await client.auth.mfa.unenroll({
      factorId: factor.id,
    });
    if (cleanupError)
      return {
        error:
          'No se pudo reemplazar la configuración pendiente. Inténtalo más tarde.',
        factorId: '',
        qr: '',
        secret: '',
      };
  }
  const { data, error } = await client.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `HomeSafe ${new Date().toISOString()}`,
  });
  if (error)
    return {
      error: 'No se pudo preparar el autenticador. Inténtalo más tarde.',
      factorId: '',
      qr: '',
      secret: '',
    };
  return prepareTotpEnrollment(data);
}
export async function verify(
  _previous: { error: string },
  form: FormData,
): Promise<{ error: string }> {
  const { client } = await requireIdentity();
  const factorId = String(form.get('factor_id') ?? '');
  const code = String(form.get('code') ?? '').trim();
  if (!/^[0-9]{6}$/.test(code))
    return { error: 'Ingresa los seis dígitos del autenticador.' };
  const { data: factors, error: listError } =
    await client.auth.mfa.listFactors();
  if (listError || !ownsTotpFactor(factors.all, factorId))
    return { error: 'No se pudo verificar el autenticador.' };
  const { error } = await client.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  if (error)
    return { error: 'El código no es válido o expiró. Inténtalo nuevamente.' };
  redirect('/portal');
}
