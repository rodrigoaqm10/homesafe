import Link from 'next/link';
import { LoginForm } from '@/components/login-form';
import { ThemeToggle } from '@/components/theme-toggle';
export const metadata = { title: 'Acceso privado' };
export default function Access() {
  return (
    <main className="access-page">
      <header className="access-header">
        <Link className="brand" href="/">
          HOME SAFE
        </Link>
        <ThemeToggle />
      </header>
      <section className="access-card">
        <span className="eyebrow">ESPACIO PRIVADO</span>
        <h1>
          Bienvenido
          <br />
          <em>a tu comunidad.</em>
        </h1>
        <p>
          Ingresa con tu cuenta de Home Safe. Los espacios de residente,
          conserjería y administración se habilitan según tus permisos.
        </p>
        <LoginForm />
        <Link className="text-link" href="/demo">
          Explorar la demostración
        </Link>
        <Link className="text-link" href="/">
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
