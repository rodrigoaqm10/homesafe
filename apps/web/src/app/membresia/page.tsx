import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { InquiryForm } from './inquiry-form';

export const metadata = { title: 'Consultar membresía' };

export default function MembershipInquiry() {
  return (
    <main className="profile-picker">
      <header className="picker-header">
        <Link className="brand" href="/">
          HOME SAFE
        </Link>
        <ThemeToggle />
      </header>
      <section className="picker-intro">
        <h1>Consulta tu membresía</h1>
        <p>Elige el plan que te interesa y cuéntanos sobre tu comunidad.</p>
      </section>
      <div className="portal-grid">
        <div>
          <article className="panel">
            <h2>Normal</h2>
            <p>
              Operación diaria, visitas, encomiendas, comunicados, bitácora y
              administración.
            </p>
          </article>
          <article className="panel">
            <h2>Pro</h2>
            <p>
              Incluye las funciones de Normal y el módulo de cámaras. La IA
              forma parte de Pro cuando esté disponible.
            </p>
            <p>Opciones de 6 y 12 meses.</p>
          </article>
        </div>
        <section className="panel">
          <h2>Solicitar información</h2>
          <InquiryForm />
        </section>
      </div>
    </main>
  );
}
