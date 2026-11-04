import Link from 'next/link';
import { operate } from '@/app/portal/actions';
import { emailReceipt } from '@/app/portal/receipt-actions';
import { createClient } from '@/lib/supabase/server';
import { money } from '@/modules/finance/domain/money';
import { portalSection } from '@/modules/identity/domain/portal-navigation';
import type { Membership } from '@/modules/identity/infrastructure/session';
import {
  Announcements,
  dateLabel,
  IncidentSection,
  PackageSection,
  VisitSection,
} from './portal-operations';
import { PortalShell, portalHref } from './portal-shell';
import { SubmitButton } from './submit-button';
export async function MemberPortal({
  hasPro = false,
  member,
  section,
  status,
}: {
  hasPro?: boolean;
  member: Membership;
  section?: string;
  status?: string;
}) {
  const client = await createClient();
  const resident = member.role === 'residente';
  const current = portalSection(member.role, section);
  const scope = (table: string) =>
    client
      .from(table)
      .select('*')
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id);
  const personal = (table: string) => {
    const q = scope(table);
    return resident
      ? q.eq(
          'unit_id',
          member.unit_id ?? '00000000-0000-0000-0000-000000000000',
        )
      : q;
  };
  const needsUnits =
    resident || ['visitas', 'encomiendas', 'solicitudes'].includes(current);
  const empty = { data: [], error: null };
  const [community, units, visits, packages, incidents, announcements] =
    await Promise.all([
      client
        .from('communities')
        .select('name')
        .eq('id', member.community_id)
        .eq('organization_id', member.organization_id)
        .single(),
      !needsUnits
        ? empty
        : resident
          ? scope('units').eq(
              'id',
              member.unit_id ?? '00000000-0000-0000-0000-000000000000',
            )
          : scope('units').order('label'),
      current === 'visitas'
        ? personal('visits')
            .order('created_at', { ascending: false })
            .limit(100)
        : empty,
      current === 'encomiendas'
        ? personal('packages')
            .order('received_at', { ascending: false })
            .limit(100)
        : empty,
      current === 'solicitudes'
        ? personal('incidents')
            .order('created_at', { ascending: false })
            .limit(100)
        : empty,
      ['comunicados', 'inicio', 'recepcion'].includes(current)
        ? scope('announcements')
            .order('created_at', { ascending: false })
            .limit(current === 'comunicados' ? 50 : 3)
        : empty,
    ]);
  const unit = units.data?.[0]?.label ?? 'Sin unidad asignada';
  const unavailable = [
    community,
    units,
    visits,
    packages,
    incidents,
    announcements,
  ].some((r) => r.error);
  const names: Record<string, string> = {
    inicio: 'Mi hogar',
    cuenta: 'Mi cuenta',
    recepcion: 'Recepción',
    visitas: resident ? 'Tus visitas.' : 'Visitas y accesos.',
    encomiendas: resident ? 'Tus encomiendas.' : 'Recepción de encomiendas.',
    solicitudes: resident ? 'Mis solicitudes' : 'Solicitudes por atender',
    comunicados: 'Comunicados',
    bitacora: 'Continuidad del servicio.',
  };
  let content: React.ReactNode;
  if (current === 'visitas')
    content = (
      <VisitSection
        member={member}
        units={units.data ?? []}
        visits={visits.data ?? []}
      />
    );
  else if (current === 'encomiendas')
    content = (
      <PackageSection
        member={member}
        units={units.data ?? []}
        parcels={packages.data ?? []}
      />
    );
  else if (current === 'solicitudes')
    content = (
      <IncidentSection
        member={member}
        units={units.data ?? []}
        incidents={incidents.data ?? []}
      />
    );
  else if (current === 'comunicados')
    content = (
      <>
        <Announcements announcements={announcements.data ?? []} />
        {member.role === 'administrador' && (
          <section className="panel">
            <h2>Publicar comunicado</h2>
            <form action={operate} className="secure-form">
              <input type="hidden" name="membership_id" value={member.id} />
              <input type="hidden" name="kind" value="publish" />
              <input type="hidden" name="return_section" value="comunicados" />
              <label>
                Título
                <input name="text" required minLength={5} maxLength={160} />
              </label>
              <label>
                Mensaje
                <textarea
                  name="body"
                  required
                  minLength={5}
                  maxLength={10000}
                />
              </label>
              <SubmitButton>Publicar comunicado</SubmitButton>
            </form>
          </section>
        )}
      </>
    );
  else if (resident) {
    const [summary, charges, history] = await Promise.all([
      client.rpc('resident_finance_summary', {
        org: member.organization_id,
        community: member.community_id,
        unit: member.unit_id,
      }),
      personal('finance_charge_balances')
        .order('created_at', { ascending: false })
        .limit(100),
      personal('finance_payment_history')
        .order('created_at', { ascending: false })
        .limit(100),
    ]);
    const balance = summary.data?.[0];
    const financialError =
      summary.error || charges.error || history.error || !balance;
    content = (
      <>
        {financialError ? (
          <section className="panel">
            <h2>Tu cuenta no está disponible.</h2>
            <p>
              Solicita a la administración que revise la vinculación de tu
              unidad. No podemos confirmar tu saldo en este momento.
            </p>
          </section>
        ) : (
          <>
            <section className="home-account">
              <span className="eyebrow">MI UNIDAD · {unit}</span>
              <h2>
                {BigInt(balance.outstanding_clp) > BigInt(0)
                  ? 'Saldo pendiente'
                  : 'Estás al día'}
              </h2>
              <span className="balance-amount">
                {money(balance.outstanding_clp)}
              </span>
              <p>Cuenta de tu unidad</p>
              <div className="account-totals">
                <span>
                  Total emitido<strong>{money(balance.billed_clp)}</strong>
                </span>
                <span>
                  Abonos netos<strong>{money(balance.paid_clp)}</strong>
                </span>
                <span>
                  Saldo vencido<strong>{money(balance.overdue_clp)}</strong>
                </span>
              </div>
              {current === 'inicio' && (
                <Link
                  className="button button-primary"
                  href={portalHref(member, 'cuenta')}
                >
                  Revisar mi cuenta
                </Link>
              )}
            </section>
            {current === 'cuenta' ? (
              <div className="portal-grid">
                <section className="panel">
                  <h2>Cobros de mi unidad</h2>
                  <p className="panel-note">
                    El pago en línea estará disponible cuando se habilite la
                    pasarela. Por ahora, solicita a administración las
                    instrucciones de pago.
                  </p>
                  {charges.data?.map((c) => (
                    <article className="private-record" key={c.id}>
                      <span className="badge">
                        {c.voided_at
                          ? 'Anulado'
                          : BigInt(c.balance_clp) === BigInt(0)
                            ? 'Pagado'
                            : 'Pendiente'}
                      </span>
                      <h3>{c.description}</h3>
                      <p>Vencimiento: {c.due_date}</p>
                      <p>
                        Emitido {money(c.amount_clp)} · Abonado{' '}
                        {money(c.paid_clp)}
                      </p>
                      <strong>Saldo {money(c.balance_clp)}</strong>
                      {!c.voided_at && BigInt(c.balance_clp) > BigInt(0) && (
                        <div className="record-actions">
                          <button
                            type="button"
                            className="button primary"
                            disabled
                          >
                            Pagar en línea
                          </button>
                        </div>
                      )}
                    </article>
                  ))}
                  {!charges.data?.length && (
                    <p className="empty-state">
                      La administración todavía no emitió cobros para esta
                      unidad.
                    </p>
                  )}
                  <p className="panel-note">
                    Últimos 100 cobros. Los totales superiores incluyen todo el
                    historial. Para pagar, solicita las instrucciones a la
                    administración.
                  </p>
                </section>
                <section className="panel">
                  <h2>Historial de pagos</h2>
                  {status === 'comprobante_enviado' && (
                    <p role="status" className="success-notice">
                      Comprobante enviado a tu correo.
                    </p>
                  )}
                  {status === 'comprobante_error' && (
                    <p role="alert" className="error-notice">
                      No se pudo enviar el comprobante. Revisa que tu correo
                      esté verificado o descárgalo aquí.
                    </p>
                  )}
                  {history.data?.map((p) => (
                    <article className="private-record" key={p.id}>
                      <span className="badge">
                        {p.kind === 'reversal' ? 'Reverso' : 'Abono registrado'}
                      </span>
                      <h3>{money(p.amount_clp)}</h3>
                      <p>
                        {p.charge_description} · {dateLabel(p.created_at)}
                      </p>
                      <p>Referencia: {p.reference}</p>
                      {p.kind === 'receipt' && (
                        <div className="record-actions">
                          <a
                            className="text-link"
                            href={
                              '/portal/' + member.id + '/comprobantes/' + p.id
                            }
                          >
                            Descargar comprobante
                          </a>
                          <form action={emailReceipt}>
                            <input
                              type="hidden"
                              name="membership_id"
                              value={member.id}
                            />
                            <input
                              type="hidden"
                              name="payment_id"
                              value={p.id}
                            />
                            <button className="text-link" type="submit">
                              Enviar a mi correo
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  ))}
                  {!history.data?.length && (
                    <p className="empty-state">
                      Todavía no hay pagos registrados.
                    </p>
                  )}
                  <p className="panel-note">
                    Últimos 100 movimientos. Los reversos corrigen abonos
                    anteriores.
                  </p>
                </section>
              </div>
            ) : (
              <div className="role-shortcuts">
                {[
                  [
                    'visitas',
                    'Autorizar una visita',
                    'Organiza tus próximas llegadas.',
                  ],
                  [
                    'encomiendas',
                    'Mis encomiendas',
                    'Consulta las entregas de tu unidad.',
                  ],
                  [
                    'solicitudes',
                    'Crear una solicitud',
                    'Cuéntanos qué necesitas.',
                  ],
                ].map(([id, title, description]) => (
                  <Link
                    className="panel"
                    key={id}
                    href={portalHref(member, id)}
                  >
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
        {current === 'inicio' && (
          <Announcements
            announcements={announcements.data?.slice(0, 3) ?? []}
          />
        )}
      </>
    );
  } else {
    const count = (table: string) =>
      client
        .from(table)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', member.organization_id)
        .eq('community_id', member.community_id);
    const now = new Date().toISOString();
    const counts = await Promise.all([
      count('visits')
        .eq('status', 'authorized')
        .lte('valid_from', now)
        .gte('valid_until', now),
      count('visits').eq('status', 'arrived'),
      count('packages').eq('status', 'received'),
      count('incidents').in('status', ['open', 'in_progress']),
    ]);
    content = (
      <>
        <h2 className="dashboard-section-title">Pendientes del turno</h2>
        <div className="role-shortcuts">
          {[
            ['visitas', 'Visitas vigentes'],
            ['visitas', 'Visitas dentro'],
            ['encomiendas', 'Encomiendas por retirar'],
            ['solicitudes', 'Solicitudes activas'],
          ].map(([id, label], i) => (
            <Link
              className="panel reception-stat"
              href={portalHref(member, id)}
              key={label}
            >
              <span>{label}</span>
              <strong>{counts[i].error ? '—' : (counts[i].count ?? 0)}</strong>
              <span>Gestionar</span>
            </Link>
          ))}
        </div>
        <Announcements announcements={announcements.data?.slice(0, 3) ?? []} />
      </>
    );
  }
  return (
    <PortalShell
      hasPro={hasPro}
      member={member}
      community={community.data?.name ?? 'Mi comunidad'}
      unit={unit}
      section={current}
      title={names[current] ?? 'Mi comunidad'}
      subtitle={
        resident
          ? 'Tu cuenta, tus visitas y la atención de tu hogar.'
          : 'Las herramientas de tu turno, en un solo lugar.'
      }
      status={status}
    >
      {unavailable ? (
        <p className="error-notice" role="alert">
          No se pudieron cargar todos los registros. Recarga para consultar
          información actualizada.
        </p>
      ) : (
        content
      )}
    </PortalShell>
  );
}
