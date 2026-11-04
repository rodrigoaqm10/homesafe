import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
import { InquiryForm } from './inquiry-form';
import { formatClp, membershipPlans } from './plans';

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
        <p>
          Precios de lanzamiento referenciales en pesos chilenos, por comunidad
          de hasta 50 unidades. Confirmamos la cotización al responder tu
          consulta.
        </p>
      </section>
      <div className="portal-grid">
        <div className="membership-plans">
          {(['Normal', 'Pro'] as const).map((tier) => (
            <article className="panel" key={tier}>
              <h2>{tier}</h2>
              <p>
                {tier === 'Normal'
                  ? 'Operación diaria, visitas, encomiendas, comunicados, bitácora y administración.'
                  : 'Incluye Normal y el registro de cámaras. Las funciones de IA se incorporarán a Pro cuando estén disponibles.'}
              </p>
              <ul>
                {membershipPlans
                  .filter((plan) => plan.tier === tier)
                  .map((plan) => (
                    <li key={plan.id}>
                      <strong>
                        {plan.months} meses ·{' '}
                        {formatClp.format(plan.months * plan.monthly)} total
                      </strong>
                      {' · Equivale a '}
                      {formatClp.format(plan.monthly)} al mes
                    </li>
                  ))}
              </ul>
            </article>
          ))}
          <p>Para más de 50 unidades, solicita una cotización.</p>
        </div>
        <section className="panel">
          <h2>Solicitar información</h2>
          <InquiryForm />
        </section>
      </div>
    </main>
  );
}
