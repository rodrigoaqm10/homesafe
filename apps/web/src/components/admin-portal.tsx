import Link from 'next/link';
import { logout } from '@/app/acceso/actions';
import { administer } from '@/app/portal/admin-actions';
import { SubmitButton } from '@/components/submit-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { createClient } from '@/lib/supabase/server';
import { money } from '@/modules/finance/domain/money';
import type { Membership } from '@/modules/identity/infrastructure/session';
export async function AdminPortal({
  member,
  section,
  status,
}: {
  member: Membership;
  section: string;
  status?: string;
}) {
  const client = await createClient();
  const base = `/portal/${member.id}`;
  const current = ['inicio', 'finanzas', 'registros', 'auditoria'].includes(
    section,
  )
    ? section
    : 'inicio';
  const scope = (table: string) =>
    client
      .from(table)
      .select('*')
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id);
  const [community, units, residents, links, charges, ledger, expenses, logs] =
    await Promise.all([
      client
        .from('communities')
        .select('name')
        .eq('id', member.community_id)
        .maybeSingle(),
      scope('units').order('label'),
      scope('residents').order('full_name').limit(100),
      scope('unit_residents').limit(100),
      scope('finance_charge_balances')
        .order('created_at', { ascending: false })
        .limit(200),
      scope('payment_ledger')
        .order('created_at', { ascending: false })
        .limit(500),
      scope('expenses').order('expense_date', { ascending: false }).limit(200),
      scope('audit_logs').order('created_at', { ascending: false }).limit(100),
    ]);
  const ready = ![residents, links, charges, ledger, expenses].some(
    (r) => r.error,
  );
  const unitList = (units.data ?? []) as { id: string; label: string }[];
  const labels = Object.fromEntries(unitList.map((u) => [u.id, u.label]));
  const paymentRows = ledger.data ?? [];
  const chargeRows = charges.data ?? [];
  const expenseRows = expenses.data ?? [];
  const { data: summaryRows, error: summaryError } = await client.rpc(
    'admin_finance_summary',
    { org: member.organization_id, community: member.community_id },
  );
  const summary = summaryRows?.[0];
  const paid = (id: string) =>
    BigInt(chargeRows.find((c) => c.id === id)?.paid_clp ?? 0);
  const billed = BigInt(summary?.billed_clp ?? 0);
  const collected = BigInt(summary?.collected_clp ?? 0);
  const spent = BigInt(summary?.expenses_clp ?? 0);
  const financialReady = ready && !summaryError && Boolean(summary);
  function fields(operation: string, recordId?: string) {
    return (
      <>
        <input type="hidden" name="membership_id" value={member.id} />
        <input type="hidden" name="section" value={current} />
        <input type="hidden" name="operation" value={operation} />
        {recordId && <input type="hidden" name="record_id" value={recordId} />}
      </>
    );
  }
  function unitField() {
    return (
      <label>
        Unidad
        <select name="unit_id" required defaultValue="">
          <option value="" disabled>
            Selecciona una unidad
          </option>
          {unitList.map((u) => (
            <option key={u.id} value={u.id}>
              {u.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  function amountField() {
    return (
      <label>
        Monto en pesos chilenos
        <input
          name="amount"
          type="number"
          min="1"
          max="9000000000000"
          step="1"
          required
        />
      </label>
    );
  }
  function description(max = 200) {
    return (
      <label>
        Descripción
        <input name="description" required minLength={3} maxLength={max} />
      </label>
    );
  }
  function voidForm(operation: string, id: string) {
    return (
      <form action={administer}>
        {fields(operation, id)}
        <SubmitButton>Anular registro</SubmitButton>
      </form>
    );
  }
  const modules = [
    ['inicio', 'Visión general'],
    ['finanzas', 'Finanzas'],
    ['registros', 'Unidades y residentes'],
    ['auditoria', 'Auditoría'],
    ['operaciones', 'Supervisión operativa'],
    ['camaras', 'Cámaras'],
    ['bitacora', 'Bitácora diaria'],
  ];
  return (
    <div className="workspace admin-workspace">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-symbol">H</span>
          <span>HOME SAFE</span>
        </Link>
        <div className="community-box">
          <span className="community-icon">LO</span>
          <span>
            {community.data?.name ?? 'Mi comunidad'}
            <small>Administración privada</small>
          </span>
        </div>
        <span className="sidebar-label">GESTIÓN DE LA COMUNIDAD</span>
        <nav aria-label="Módulos administrativos">
          {modules.map(([id, title]) => (
            <Link
              href={`${base}?seccion=${id}`}
              key={id}
              aria-current={current === id ? 'page' : undefined}
            >
              {title}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Administrador · MFA verificado
          <p>
            Decisiones, registros
            <br />y transparencia financiera.
          </p>
          <Link href="/portal"> Mis comunidades</Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <span>
            Administración <span className="muted">/</span>
            {community.data?.name}
          </span>
          <form action={logout}>
            <button className="text-link" type="submit">
              Cerrar sesión
            </button>
          </form>
          <ThemeToggle />
        </header>
        <main className="workspace-content">
          <div className="page-top">
            <div>
              <span className="eyebrow">GESTIÓN CON CRITERIO</span>
              <h1>
                {
                  (
                    {
                      inicio: 'Una comunidad bien administrada.',
                      finanzas: 'Claridad en cada movimiento.',
                      registros: 'El registro de tu comunidad.',
                      auditoria: 'Cada decisión deja su historia.',
                    } as Record<string, string>
                  )[current]
                }
              </h1>
              <p>
                Finanzas, registros y seguimiento desde tu espacio de
                administración.
              </p>
            </div>
            <Link href="/seguridad" className="text-link">
              Seguridad de mi cuenta
            </Link>
          </div>
          {status === 'conflicto' && (
            <p className="error-notice" role="alert">
              Otra persona modificó este registro. Revisa los datos actuales y
              vuelve a editar.
            </p>
          )}{' '}
          {status === 'guardado' && (
            <p className="success-notice" role="status">
              El registro se guardó en tu comunidad.
            </p>
          )}
          {status === 'no_disponible' && (
            <p className="error-notice" role="alert">
              No se pudo guardar. Revisa datos y saldos. Revierte los abonos
              antes de anular un cobro con pagos.
            </p>
          )}
          {!financialReady && (
            <section className="panel">
              <h2>No se pudieron cargar finanzas y registros.</h2>
              <p className="panel-note">
                Comprueba que la migración administrativa esté aplicada y vuelve
                a intentar.
              </p>
            </section>
          )}
          {current === 'inicio' && (
            <>
              <div className="role-welcome">
                <div>
                  <span className="small-label">
                    ADMINISTRACIÓN RESIDENCIAL
                  </span>
                  <h2>La perspectiva que necesitas.</h2>
                  <p>
                    Tu centro de gestión financiera y de registros. La recepción
                    tiene su propio espacio.
                  </p>
                </div>
              </div>
              <div className="metric-grid">
                <article className="metric">
                  <span>Cobros vigentes</span>
                  <strong>{financialReady ? money(billed) : '—'}</strong>
                </article>
                <article className="metric">
                  <span>Pagos netos registrados</span>
                  <strong>{financialReady ? money(collected) : '—'}</strong>
                </article>
                <article className="metric">
                  <span>Gastos vigentes</span>
                  <strong>{financialReady ? money(spent) : '—'}</strong>
                </article>
                <article className="metric">
                  <span>Unidades registradas</span>
                  <strong>{unitList.length}</strong>
                </article>
              </div>
              <div className="editorial-grid admin-shortcuts">
                {modules.slice(1, 4).map(([id, title]) => (
                  <Link href={`${base}?seccion=${id}`} key={id}>
                    <span className="small-label">GESTIÓN</span>
                    <h2>{title}</h2>
                    <span className="text-link">Abrir módulo</span>
                  </Link>
                ))}
              </div>
              <section className="panel">
                <h2>Gestión financiera por etapas</h2>
                <p className="panel-note">
                  Esta versión permite cobros por unidad, gastos y registro
                  manual de abonos y reversiones. Contabilidad completa,
                  prorrateos, presupuestos, conciliación bancaria y pasarela de
                  pagos siguen pendientes. No ejecuta transferencias ni cobros
                  bancarios.
                </p>
              </section>
            </>
          )}
          {current === 'registros' && ready && (
            <div className="portal-grid">
              <div>
                <section className="panel">
                  <span className="small-label">ESTRUCTURA RESIDENCIAL</span>
                  <h2>Unidades</h2>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Unidad</th>
                          <th>Personas vinculadas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {unitList.map((u) => (
                          <tr key={u.id}>
                            <td>
                              <strong>{u.label}</strong>
                              <details>
                                <summary>Editar unidad</summary>
                                <form
                                  action={administer}
                                  className="secure-form"
                                >
                                  {fields('edit_unit', u.id)}
                                  <input
                                    type="hidden"
                                    name="expected_label"
                                    value={u.label}
                                  />
                                  <label>
                                    Identificador de unidad
                                    <input
                                      name="description"
                                      defaultValue={u.label}
                                      required
                                      maxLength={60}
                                    />
                                  </label>
                                  <SubmitButton>Guardar unidad</SubmitButton>
                                </form>
                              </details>
                            </td>
                            <td>
                              {
                                (links.data ?? []).filter(
                                  (l) => l.unit_id === u.id,
                                ).length
                              }
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!unitList.length && (
                    <p className="panel-note">
                      Registra tu primera unidad para comenzar.
                    </p>
                  )}
                  <details className="private-record">
                    <summary>Registrar unidad</summary>
                    <form action={administer} className="secure-form">
                      {fields('unit')}
                      <label>
                        Número o identificador
                        <input name="description" required maxLength={60} />
                      </label>
                      <SubmitButton>Registrar unidad</SubmitButton>
                    </form>
                  </details>
                </section>
                <section className="panel">
                  <h2>Personas residentes</h2>
                  <p className="panel-note">
                    Se muestran hasta 100 personas y 100 vínculos residenciales.
                  </p>
                  {(residents.data ?? []).map((r) => (
                    <article className="private-record" key={r.id}>
                      <h3>{r.full_name}</h3>
                      <p>
                        {(links.data ?? [])
                          .filter((l) => l.resident_id === r.id)
                          .map(
                            (l) =>
                              `${labels[l.unit_id] ?? 'Unidad'} · ${({ owner: 'Propietario', tenant: 'Arrendatario', resident: 'Residente' } as Record<string, string>)[l.relationship]}`,
                          )
                          .join(' / ')}
                      </p>
                      <p>
                        {r.email || 'Sin correo'} · {r.phone || 'Sin teléfono'}
                      </p>
                      <details>
                        <summary>Editar datos de contacto</summary>
                        <form action={administer} className="secure-form">
                          {fields('edit_resident', r.id)}
                          <input
                            type="hidden"
                            name="expected_updated_at"
                            value={r.updated_at ?? ''}
                          />
                          <label>
                            Nombre completo
                            <input
                              name="description"
                              defaultValue={r.full_name}
                              required
                              minLength={3}
                              maxLength={160}
                            />
                          </label>
                          <label>
                            Correo de contacto
                            <input
                              type="email"
                              name="email"
                              defaultValue={r.email ?? ''}
                              maxLength={254}
                            />
                          </label>
                          <label>
                            Teléfono
                            <input
                              type="tel"
                              name="phone"
                              defaultValue={r.phone ?? ''}
                              maxLength={40}
                            />
                          </label>
                          <p>
                            Este correo es de contacto. No modifica el correo de
                            inicio de sesión.
                          </p>
                          <SubmitButton>Guardar cambios</SubmitButton>
                        </form>
                      </details>
                      {(links.data ?? [])
                        .filter((l) => l.resident_id === r.id)
                        .map((l) => (
                          <details key={l.id}>
                            <summary>
                              Editar relación con{' '}
                              {labels[l.unit_id] ?? 'unidad'}
                            </summary>
                            <form action={administer} className="secure-form">
                              {fields('edit_relationship', l.id)}
                              <input
                                type="hidden"
                                name="expected_relationship"
                                value={l.relationship}
                              />
                              <label>
                                Relación
                                <select
                                  name="relationship"
                                  defaultValue={l.relationship}
                                >
                                  <option value="owner">Propietario</option>
                                  <option value="tenant">Arrendatario</option>
                                  <option value="resident">Residente</option>
                                </select>
                              </label>
                              <SubmitButton>Guardar relación</SubmitButton>
                            </form>
                          </details>
                        ))}
                    </article>
                  ))}
                  {!residents.data?.length && (
                    <p className="panel-note">
                      Todavía no hay personas registradas.
                    </p>
                  )}
                </section>
              </div>
              <section className="panel">
                <span className="small-label">REGISTRO RESIDENCIAL</span>
                <h2>Vincular una persona</h2>
                <form action={administer} className="secure-form">
                  {fields('resident')}
                  {unitField()}
                  <label>
                    Nombre completo
                    <input
                      name="description"
                      required
                      minLength={3}
                      maxLength={160}
                    />
                  </label>
                  <label>
                    Correo de contacto
                    <input type="email" name="email" maxLength={254} />
                  </label>
                  <label>
                    Teléfono
                    <input name="phone" type="tel" maxLength={40} />
                  </label>
                  <label>
                    Relación con la unidad
                    <select name="relationship">
                      <option value="owner">Propietario</option>
                      <option value="tenant">Arrendatario</option>
                      <option value="resident">Residente</option>
                    </select>
                  </label>
                  <SubmitButton>Guardar registro</SubmitButton>
                </form>
                <p className="panel-note">
                  Registrar una persona no crea una cuenta ni le concede
                  permisos. Las membresías se asignan por separado.
                </p>
              </section>
            </div>
          )}
          {current === 'finanzas' && financialReady && (
            <>
              <div className="metric-grid">
                <article className="metric">
                  <span>Cobros vigentes</span>
                  <strong>{money(billed)}</strong>
                </article>
                <article className="metric">
                  <span>Pagos netos registrados</span>
                  <strong>{money(collected)}</strong>
                </article>
                <article className="metric">
                  <span>Saldo de cobros vigentes</span>
                  <strong>{money(summary.outstanding_clp)}</strong>
                </article>
                <article className="metric">
                  <span>Gastos vigentes</span>
                  <strong>{money(spent)}</strong>
                </article>
              </div>
              <p className="panel-note">
                Listados limitados a 200 cobros, 500 movimientos y 200 gastos.
                Los indicadores se calculan sobre todo el historial; las cifras
                no representan un balance bancario ni contabilidad completa.
              </p>
              <div className="portal-grid">
                <div>
                  <section className="panel">
                    <span className="small-label">COBRANZA</span>
                    <h2>Gastos comunes y cargos</h2>
                    {chargeRows.map((c) => (
                      <article className="private-record" key={c.id}>
                        <span className="badge">
                          {c.voided_at
                            ? 'Anulado'
                            : paid(c.id) >= BigInt(c.amount_clp)
                              ? 'Pagado'
                              : 'Pendiente'}
                        </span>
                        <h3>
                          {labels[c.unit_id] ?? 'Unidad'} · {c.description}
                        </h3>
                        <p>
                          Total {money(c.amount_clp)} · Abonado{' '}
                          {money(paid(c.id))} · Saldo{' '}
                          {money(BigInt(c.amount_clp) - paid(c.id))}
                        </p>
                        <p>Vencimiento: {c.due_date}</p>
                        {!c.voided_at && paid(c.id) < BigInt(c.amount_clp) && (
                          <details>
                            <summary>Registrar abono recibido</summary>
                            <form action={administer} className="secure-form">
                              {fields('payment', c.id)}
                              {amountField()}
                              <label>
                                Método
                                <select name="method">
                                  <option value="transfer">
                                    Transferencia
                                  </option>
                                  <option value="cash">Efectivo</option>
                                  <option value="other">Otro</option>
                                </select>
                              </label>
                              <label>
                                Referencia única del pago recibido
                                <input
                                  name="reference"
                                  required
                                  minLength={3}
                                  maxLength={120}
                                />
                              </label>
                              <SubmitButton>
                                Contabilizar abono manual
                              </SubmitButton>
                            </form>
                          </details>
                        )}
                        {!c.voided_at &&
                          paid(c.id) === BigInt(0) &&
                          voidForm('void_charge', c.id)}
                      </article>
                    ))}
                    {!chargeRows.length && (
                      <p className="panel-note">No hay cobros emitidos.</p>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Movimientos de pago</h2>
                    {paymentRows.map((p) => (
                      <article className="private-record" key={p.id}>
                        <span className="badge">
                          {p.kind === 'reversal' ? 'Reversión' : 'Abono manual'}
                        </span>
                        <h3>{money(p.amount_clp)}</h3>
                        <p>
                          {p.reference} · {p.method}
                        </p>
                        {p.kind === 'receipt' &&
                          !paymentRows.some((r) => r.reversal_of === p.id) && (
                            <details>
                              <summary>Revertir este registro</summary>
                              <form action={administer} className="secure-form">
                                {fields('reverse', p.id)}
                                <label>
                                  Motivo
                                  <input
                                    name="reference"
                                    required
                                    minLength={3}
                                    maxLength={120}
                                  />
                                </label>
                                <SubmitButton>Registrar reversión</SubmitButton>
                              </form>
                            </details>
                          )}
                      </article>
                    ))}
                    {!paymentRows.length && (
                      <p className="panel-note">No hay movimientos de pago.</p>
                    )}
                  </section>
                  <section className="panel">
                    <h2>Registro de gastos</h2>
                    {expenseRows.map((e) => (
                      <article className="private-record" key={e.id}>
                        <span className="badge">
                          {e.voided_at ? 'Anulado' : 'Vigente'}
                        </span>
                        <h3>{e.description}</h3>
                        <p>
                          {money(e.amount_clp)} · {e.expense_date}
                        </p>
                        {!e.voided_at && voidForm('void_expense', e.id)}
                      </article>
                    ))}
                    {!expenseRows.length && (
                      <p className="panel-note">No hay gastos registrados.</p>
                    )}
                  </section>
                </div>
                <div>
                  <section className="panel">
                    <h2>Emitir un cobro</h2>
                    <form action={administer} className="secure-form">
                      {fields('charge')}
                      {unitField()}
                      <label>
                        Período
                        <input type="month" name="period" required />
                      </label>
                      {description()}
                      {amountField()}
                      <label>
                        Vencimiento
                        <input type="date" name="date" required />
                      </label>
                      <SubmitButton>Emitir cobro</SubmitButton>
                    </form>
                  </section>
                  <section className="panel">
                    <h2>Registrar un gasto</h2>
                    <form action={administer} className="secure-form">
                      {fields('expense')}
                      {description()}
                      <label>
                        Categoría
                        <select name="category">
                          <option value="maintenance">Mantención</option>
                          <option value="utilities">Servicios</option>
                          <option value="staff">Personal</option>
                          <option value="administration">Administración</option>
                          <option value="other">Otro</option>
                        </select>
                      </label>
                      {amountField()}
                      <label>
                        Fecha
                        <input type="date" name="date" required />
                      </label>
                      <SubmitButton>Guardar gasto</SubmitButton>
                    </form>
                  </section>
                  <section className="panel">
                    <h2>Integridad financiera</h2>
                    <p className="panel-note">
                      Los pagos no se editan ni se borran. Una corrección genera
                      un movimiento inverso. El servidor bloquea abonos
                      superiores al saldo. Cada registro conserva autor y fecha.
                    </p>
                  </section>
                </div>
              </div>
            </>
          )}
          {current === 'auditoria' && (
            <section className="panel">
              <span className="small-label">ÚLTIMOS 100 EVENTOS</span>
              <h2>Trazabilidad de la comunidad</h2>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Registro</th>
                      <th>Acción</th>
                      <th>Fecha de Chile</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(logs.data ?? []).map((l) => (
                      <tr key={l.id}>
                        <td>
                          <strong>{l.entity_type}</strong>
                          <small>{l.entity_id}</small>
                        </td>
                        <td>
                          {l.action}
                          {l.changed_fields?.length > 0 && (
                            <small>Campos: {l.changed_fields.join(', ')}</small>
                          )}
                        </td>
                        <td>
                          {new Intl.DateTimeFormat('es-CL', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                            timeZone: 'America/Santiago',
                          }).format(new Date(l.created_at))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!logs.data?.length && (
                <p className="panel-note">Sin actividad registrada todavía.</p>
              )}
            </section>
          )}
          <footer className="workspace-footer">
            <span>Home Safe · Administración</span>
            <Link href={`${base}?seccion=operaciones`}>
              Supervisar conserjería
            </Link>
          </footer>
        </main>
      </div>
    </div>
  );
}
