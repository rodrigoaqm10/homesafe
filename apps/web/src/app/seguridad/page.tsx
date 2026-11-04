import Link from 'next/link';
import { MfaForm } from '@/components/mfa-form';
import { requireIdentity } from '@/modules/identity/infrastructure/session';
export const metadata = { title: 'Verificación en dos pasos' };
export default async function Security() {
  const { client } = await requireIdentity();
  const { data, error } = await client.auth.mfa.listFactors();
  const { data: claims } = await client.auth.getClaims();
  const verified = claims?.claims.aal === 'aal2';
  return (
    <main className="access-page">
      <Link className="brand" href="/portal">
        HOME SAFE
      </Link>
      <section className="access-card">
        <span className="eyebrow">UNA CAPA ADICIONAL DE PROTECCIÓN</span>
        <h1>
          Tu acceso,
          <br />
          <em>mejor protegido.</em>
        </h1>
        {verified ? (
          <>
            <p>La verificación en dos pasos está activa para esta sesión.</p>
            <Link className="button primary" href="/portal">
              Continuar a mi comunidad
            </Link>
          </>
        ) : error ? (
          <p className="error-notice">
            No se pudo consultar tu autenticador. Inténtalo más tarde.
          </p>
        ) : (
          <>
            <p>
              La administración requiere un código adicional. Utiliza una
              aplicación de autenticación compatible con TOTP.
            </p>
            <MfaForm
              verifiedFactorId={
                data.totp.find((f) => f.status === 'verified')?.id ?? null
              }
            />
          </>
        )}
        <Link href="/portal" className="text-link">
          Volver a mis accesos
        </Link>
      </section>
    </main>
  );
}
