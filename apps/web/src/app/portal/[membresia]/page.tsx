import Link from 'next/link';
import { logout } from '@/app/acceso/actions';
import { operate } from '@/app/portal/actions';
import { AdminPortal } from '@/components/admin-portal';
import { roleNames } from '@/modules/community/domain/demo-workflows';
import { requireMembership } from '@/modules/identity/infrastructure/session';
export const metadata = { title: 'Mi comunidad' };
const states: Record<string, string> = {
  authorized: 'Autorizada',
  arrived: 'Ingresada',
  departed: 'Finalizada',
  cancelled: 'Cancelada',
  received: 'Recibida',
  delivered: 'Entregada',
  open: 'Pendiente',
  in_progress: 'En curso',
  resolved: 'Resuelta',
};
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ membresia: string }>;
  searchParams: Promise<{ estado?: string; seccion?: string }>;
}) {
  const { membresia } = await params;
  const { client, member } = await requireMembership(membresia);
  const { estado, seccion } = await searchParams;
  if (member.role === 'administrador' && seccion !== 'operaciones')
    return (
      <AdminPortal
        member={member}
        section={seccion ?? 'inicio'}
        status={estado}
      />
    );
  const resident = member.role === 'residente';
  const staff = !resident;
  const scope = (table: string) =>
    client
      .from(table)
      .select('*')
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id);
  const [community, units, visits, packages, incidents, announcements, audit] =
    await Promise.all([
      client
        .from('communities')
        .select('name')
        .eq('id', member.community_id)
        .maybeSingle(),
      scope('units').order('label'),
      scope('visits').order('created_at', { ascending: false }).limit(50),
      scope('packages').order('received_at', { ascending: false }).limit(50),
      scope('incidents').order('created_at', { ascending: false }).limit(50),
      scope('announcements')
        .order('created_at', { ascending: false })
        .limit(20),
      staff
        ? scope('audit_logs')
            .order('created_at', { ascending: false })
            .limit(30)
        : Promise.resolve({ data: [], error: null }),
    ]);
  const unitList = (units.data ?? []) as { id: string; label: string }[];
  const unitNames = Object.fromEntries(unitList.map((u) => [u.id, u.label]));
  const failures = [
    community,
    units,
    visits,
    packages,
    incidents,
    announcements,
    audit,
  ].some((r) => r.error);
  function fields(kind: string) {
    return (
      <>
        <input type="hidden" name="membership_id" value={member.id} />
        <input type="hidden" name="kind" value={kind} />
      </>
    );
  }
  function unitField() {
    return resident ? (
      <p className="private-label">
        Unidad: {unitNames[member.unit_id ?? ''] ?? 'asignada a tu cuenta'}
      </p>
    ) : (
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
  function mutation(kind: string, id: string, label: string, next?: string) {
    return (
      <form action={operate}>
        {fields(kind)}
        <input type="hidden" name="record_id" value={id} />
        {next && <input type="hidden" name="next_status" value={next} />}
        <button type="submit" className="text-link">
          {label} ↗
        </button>
      </form>
    );
  }
  return (
    <main className="profile-picker">
      <header className="picker-header">
        <Link className="brand" href="/portal">
          HOMESAFE REAL
        </Link>
        <div className="private-topnav">
          {member.role === 'administrador' && (
            <Link className="text-link" href={`/portal/${member.id}`}>
              ← Administración
            </Link>
          )}
          <Link className="text-link" href="/portal">
            Mis accesos
          </Link>
          <Link className="text-link" href="/seguridad">
            Verificación en dos pasos
          </Link>
          <form action={logout}>
            <button className="text-link" type="submit">
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>
      <section className="picker-intro portal-heading">
        <span className="eyebrow">
          {roleNames[member.role].toUpperCase()} · ACCESO PRIVADO
        </span>
        <h1>{community.data?.name ?? 'Mi comunidad'}</h1>
        <p>
          {resident
            ? 'Tu hogar, conectado con quienes lo cuidan.'
            : 'Cada detalle, acompañado con una gestión responsable.'}
        </p>
      </section>
      {estado === 'guardado' && (
        <p className="success-notice" role="status">
          El cambio se guardó en tu comunidad.
        </p>
      )}
      {estado === 'no_disponible' && (
        <p className="error-notice" role="alert">
          No se pudo completar la operación. Revisa los datos, horarios y
          permisos; el registro puede haber cambiado.
        </p>
      )}
      {failures ? (
        <section className="panel">
          <h2>No pudimos cargar la comunidad.</h2>
          <p className="panel-note">
            Inténtalo más tarde. Ningún permiso se amplía para resolver un error
            de conexión.
          </p>
        </section>
      ) : (
        <>
          <div className="metric-grid">
            <article className="metric">
              <span>Visitas autorizadas · últimas 50</span>
              <strong>
                {
                  (visits.data ?? []).filter((v) => v.status === 'authorized')
                    .length
                }
              </strong>
            </article>
            <article className="metric">
              <span>Encomiendas pendientes · últimas 50</span>
              <strong>
                {
                  (packages.data ?? []).filter((p) => p.status === 'received')
                    .length
                }
              </strong>
            </article>
            <article className="metric">
              <span>Solicitudes abiertas · últimas 50</span>
              <strong>
                {
                  (incidents.data ?? []).filter((i) => i.status !== 'resolved')
                    .length
                }
              </strong>
            </article>
            <article className="metric">
              <span>Mi función</span>
              <strong>{roleNames[member.role]}</strong>
            </article>
          </div>
          <div className="portal-grid">
            <div>
              <section className="panel">
                <span className="small-label">VISITAS</span>
                <h2>Bienvenidas con orden.</h2>
                {(visits.data ?? []).map((v) => (
                  <article className="private-record" key={v.id}>
                    <span className="badge">{states[v.status]}</span>
                    <h3>{v.visitor_name}</h3>
                    <p>
                      {unitNames[v.unit_id] ?? 'Unidad'} ·{' '}
                      {new Intl.DateTimeFormat('es-CL', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'America/Santiago',
                      }).format(new Date(v.valid_from))}{' '}
                      —{' '}
                      {new Intl.DateTimeFormat('es-CL', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                        timeZone: 'America/Santiago',
                      }).format(new Date(v.valid_until))}
                    </p>
                    {v.status === 'authorized' &&
                      mutation('visit_state', v.id, 'Cancelar', 'cancelled')}
                    {staff &&
                      v.status === 'authorized' &&
                      mutation(
                        'visit_state',
                        v.id,
                        'Registrar ingreso',
                        'arrived',
                      )}
                    {staff &&
                      v.status === 'arrived' &&
                      mutation(
                        'visit_state',
                        v.id,
                        'Registrar salida',
                        'departed',
                      )}
                  </article>
                ))}
                {!visits.data?.length && (
                  <p className="panel-note">
                    Todavía no hay visitas autorizadas.
                  </p>
                )}
                <details className="private-record">
                  <summary>Autorizar una visita</summary>
                  <form action={operate} className="secure-form">
                    {fields('create_visit')}
                    {unitField()}
                    <label>
                      Nombre de la visita
                      <input
                        name="text"
                        required
                        minLength={3}
                        maxLength={80}
                      />
                    </label>
                    <label>
                      Desde · hora de Chile
                      <input type="datetime-local" name="from" required />
                    </label>
                    <label>
                      Hasta · hora de Chile
                      <input type="datetime-local" name="until" required />
                    </label>
                    <p>
                      Vigencia máxima: siete días. Los ingresos se permiten
                      dentro del horario autorizado.
                    </p>
                    <button type="submit" className="button primary">
                      Autorizar visita ↗
                    </button>
                  </form>
                </details>
              </section>
              <section className="panel">
                <span className="small-label">ENCOMIENDAS</span>
                <h2>Cada entrega, registrada.</h2>
                {(packages.data ?? []).map((p) => (
                  <article className="private-record" key={p.id}>
                    <span className="badge">{states[p.status]}</span>
                    <h3>{p.carrier}</h3>
                    <p>{unitNames[p.unit_id] ?? 'Unidad'}</p>
                    {staff &&
                      p.status === 'received' &&
                      mutation('deliver', p.id, 'Registrar entrega')}
                  </article>
                ))}
                {!packages.data?.length && (
                  <p className="panel-note">Sin encomiendas registradas.</p>
                )}
                {staff && (
                  <details className="private-record">
                    <summary>Registrar recepción</summary>
                    <form action={operate} className="secure-form">
                      {fields('receive_package')}
                      {unitField()}
                      <label>
                        Transportista
                        <input
                          name="text"
                          required
                          minLength={2}
                          maxLength={100}
                        />
                      </label>
                      <button className="button primary" type="submit">
                        Registrar encomienda ↗
                      </button>
                    </form>
                  </details>
                )}
              </section>
              <section className="panel">
                <span className="small-label">SOLICITUDES</span>
                <h2>El cuidado comienza aquí.</h2>
                {(incidents.data ?? []).map((i) => (
                  <article className="private-record" key={i.id}>
                    <span className="badge">{states[i.status]}</span>
                    <h3>{i.title}</h3>
                    <p>{unitNames[i.unit_id] ?? 'Unidad'}</p>
                    {staff &&
                      i.status === 'open' &&
                      mutation(
                        'incident_state',
                        i.id,
                        'Tomar solicitud',
                        'in_progress',
                      )}
                    {staff &&
                      i.status === 'in_progress' &&
                      mutation(
                        'incident_state',
                        i.id,
                        'Resolver solicitud',
                        'resolved',
                      )}
                  </article>
                ))}
                {!incidents.data?.length && (
                  <p className="panel-note">Sin solicitudes por ahora.</p>
                )}
                <details className="private-record">
                  <summary>Crear solicitud</summary>
                  <form action={operate} className="secure-form">
                    {fields('create_incident')}
                    {unitField()}
                    <label>
                      Descripción breve
                      <input
                        name="text"
                        required
                        minLength={5}
                        maxLength={160}
                      />
                    </label>
                    <button className="button primary" type="submit">
                      Crear solicitud ↗
                    </button>
                  </form>
                </details>
              </section>
            </div>
            <div>
              <section className="panel">
                <span className="small-label">COMUNICADOS</span>
                <h2>Una comunidad informada.</h2>
                {(announcements.data ?? []).map((a) => (
                  <article className="private-record" key={a.id}>
                    <h3>{a.title}</h3>
                    <p>{a.body}</p>
                  </article>
                ))}
                {!announcements.data?.length && (
                  <p className="panel-note">
                    La administración todavía no publicó comunicados.
                  </p>
                )}
                {member.role === 'administrador' && (
                  <details className="private-record">
                    <summary>Publicar comunicado</summary>
                    <form action={operate} className="secure-form">
                      {fields('publish')}
                      <label>
                        Título
                        <input
                          name="text"
                          required
                          minLength={5}
                          maxLength={160}
                        />
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
                      <button className="button primary" type="submit">
                        Publicar en mi comunidad ↗
                      </button>
                    </form>
                  </details>
                )}
              </section>
              {staff && (
                <section className="panel">
                  <span className="small-label">TRAZABILIDAD</span>
                  <h2>Actividad de la comunidad.</h2>
                  <ol className="log-timeline">
                    {(audit.data ?? []).map((e) => (
                      <li key={e.id}>
                        <span className="small-label">
                          {new Intl.DateTimeFormat('es-CL', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                            timeZone: 'America/Santiago',
                          }).format(new Date(e.created_at))}
                        </span>
                        <p>
                          {(
                            {
                              visits: 'Visita',
                              packages: 'Encomienda',
                              incidents: 'Solicitud',
                              announcements: 'Comunicado',
                            } as Record<string, string>
                          )[e.entity_type] ?? 'Registro'}{' '}
                          ·{' '}
                          {e.action === 'INSERT'
                            ? 'Creado'
                            : `${states[e.old_status] ?? e.old_status} → ${states[e.new_status] ?? e.new_status}`}
                        </p>
                      </li>
                    ))}
                  </ol>
                  {!audit.data?.length && (
                    <p className="panel-note">
                      Las operaciones aparecerán aquí.
                    </p>
                  )}
                </section>
              )}
              <section className="panel">
                <span className="small-label">DESARROLLO POR ETAPAS</span>
                <p className="panel-note">
                  Pagos, documentos privados y los siguientes módulos se
                  habilitarán al completar sus controles e integraciones. Este
                  espacio no procesa pagos.
                </p>
              </section>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
