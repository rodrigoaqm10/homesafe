'use client';
import { useActionState, useState } from 'react';
import { enroll, verify } from '@/app/seguridad/actions';

function TotpQr({ source }: { source: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className="error-notice" role="alert">
      La imagen no pudo cargarse. Genera un nuevo QR o utiliza la clave manual
      que aparece debajo.
    </p>
  ) : (
    <img
      className="mfa-qr"
      src={source}
      onError={() => setFailed(true)}
      alt="Código QR privado para configurar tu autenticador HomeSafe"
      width={220}
      height={220}
    />
  );
}
export function MfaForm({
  verifiedFactorId,
}: {
  verifiedFactorId: string | null;
}) {
  const [setup, enrollAction, enrolling] = useActionState(enroll, {
    error: '',
    factorId: '',
    qr: '',
    secret: '',
  });
  const [verification, verifyAction, verifying] = useActionState(verify, {
    error: '',
  });
  const factorId = verifiedFactorId || setup.factorId;
  return (
    <>
      {!verifiedFactorId && !setup.factorId && (
        <>
          <p>
            Abre Google Authenticator o Microsoft Authenticator en tu teléfono.
            Añade una cuenta y elige escanear un código QR.
          </p>
          <form action={enrollAction}>
            <button
              className="button primary"
              disabled={enrolling}
              type="submit"
            >
              {enrolling ? 'Preparando…' : 'Configurar mi autenticador ↗'}
            </button>
          </form>
        </>
      )}
      {setup.error && (
        <p className="error-notice" role="alert">
          {setup.error}
        </p>
      )}
      {setup.qr && (
        <>
          <TotpQr key={setup.factorId} source={setup.qr} />
          <p>1. Escanea este QR desde tu aplicación de autenticación.</p>
          <p>
            2. Ingresa debajo el código de seis dígitos que genera la
            aplicación.
          </p>
          <details>
            <summary>No puedo escanear: usar clave manual</summary>
            <p>
              En tu autenticador selecciona ingresar una clave de configuración,
              usa el nombre HomeSafe y el tipo basado en tiempo.
            </p>
            <code className="mfa-secret">{setup.secret}</code>
          </details>
          <p>
            No compartas esta clave ni su QR. Esta configuración se realiza una
            sola vez.
          </p>
          <form action={enrollAction}>
            <button
              type="submit"
              className="text-link"
              disabled={enrolling || verifying}
            >
              {enrolling
                ? 'Reemplazando configuración…'
                : 'Generar un nuevo QR y reemplazar la configuración pendiente ↗'}
            </button>
          </form>
        </>
      )}
      {factorId && (
        <form action={verifyAction} className="secure-form" key={factorId}>
          <input type="hidden" name="factor_id" value={factorId} />
          <label>
            Código de seis dígitos
            <input
              name="code"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
            />
          </label>
          {verification.error && (
            <p className="error-notice" role="alert">
              {verification.error}
            </p>
          )}
          <button
            type="submit"
            className="button primary"
            disabled={verifying || enrolling}
          >
            {verifying ? 'Verificando…' : 'Verificar y continuar ↗'}
          </button>
        </form>
      )}
    </>
  );
}
