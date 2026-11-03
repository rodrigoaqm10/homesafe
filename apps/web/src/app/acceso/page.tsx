import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
export const metadata = { title: 'Acceso privado' };
export default function Access() {
  return (
    <main className="access-page">
      <Link className="brand" href="/">
        HOMESAFE REAL
      </Link>
      <section className="access-card">
        <span className="eyebrow">ESPACIO PRIVADO</span>
        <h1>
          Bienvenido
          <br />
          <em>a tu comunidad.</em>
        </h1>
        <p>
          Ingresa con tu cuenta de HomeSafe. Los espacios de residente,
          conserjería y administración se habilitan según tus permisos.
        </p>
        <LoginForm />
        <Link className="text-link" href="/demo">
          Explorar la demostración ↗
        </Link>
        <Link className="text-link" href="/">
          ← Volver al inicio
        </Link>
      </section>
    </main>
  );
}
