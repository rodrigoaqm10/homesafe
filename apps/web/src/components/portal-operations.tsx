import { operate } from '@/app/portal/actions';
import { SubmitButton } from '@/components/submit-button';
import type { Membership } from '@/modules/identity/infrastructure/session';
export type Unit = { id: string; label: string };
export type Visit = {
  id: string;
  unit_id: string;
  visitor_name: string;
  valid_from: string;
  valid_until: string;
  status: string;
};
export type Parcel = {
  id: string;
  unit_id: string;
  carrier: string;
  status: string;
  received_at: string;
};
export type Incident = {
  id: string;
  unit_id: string;
  title: string;
  status: string;
  created_at: string;
};
export type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};
export type Audit = {
  id: string;
  entity_type: string;
  action: string;
  created_at: string;
  old_status: string | null;
  new_status: string | null;
};
const names: Record<string, string> = {
  authorized: 'Autorizada',
  arrived: 'Dentro del edificio',
  departed: 'Salida registrada',
  cancelled: 'Cancelada',
  received: 'Pendiente de retiro',
  delivered: 'Entregada',
  open: 'Pendiente',
  in_progress: 'En curso',
  resolved: 'Resuelta',
};
export function dateLabel(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Santiago',
  }).format(new Date(value));
}
function Fields({
  member,
  kind,
  section,
}: {
  member: Membership;
  kind: string;
  section: string;
}) {
  return (
    <>
      <input type="hidden" name="membership_id" value={member.id} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="return_section" value={section} />
    </>
  );
}
function UnitField({ member, units }: { member: Membership; units: Unit[] }) {
  return member.role === 'residente' ? (
    <p className="private-label">
      Unidad: {units.find((u) => u.id === member.unit_id)?.label ?? 'Mi unidad'}
    </p>
  ) : (
    <label>
      Unidad
      <select name="unit_id" defaultValue="" required>
        <option value="" disabled>
          Selecciona una unidad
        </option>
        {units.map((u) => (
          <option key={u.id} value={u.id}>
            {u.label}
          </option>
        ))}
      </select>
    </label>
  );
}
function Mutation({
  member,
  id,
  kind,
  next,
  label,
  section,
}: {
  member: Membership;
  id: string;
  kind: string;
  next?: string;
  label: string;
  section: string;
}) {
  return (
    <form action={operate}>
      <Fields member={member} kind={kind} section={section} />
      <input type="hidden" name="record_id" value={id} />
      {next && <input type="hidden" name="next_status" value={next} />}
      <SubmitButton>{label} ↗</SubmitButton>
    </form>
  );
}
export function VisitSection({
  member,
  units,
  visits,
}: {
  member: Membership;
  units: Unit[];
  visits: Visit[];
}) {
  const resident = member.role === 'residente';
  const labels = Object.fromEntries(units.map((u) => [u.id, u.label]));
  const now = Date.now();
  return (
    <div className="portal-grid">
      <section className="panel">
        <span className="small-label">
          {resident ? 'AUTORIZACIONES DE MI UNIDAD' : 'RECEPCIÓN Y CONTROL'}
        </span>
        <h2>
          {resident ? 'Tus visitas, organizadas.' : 'Ingresos y salidas.'}
        </h2>
        <p className="panel-note">
          Se muestran hasta 100 visitas, de la más reciente a la más antigua.
        </p>
        {visits.map((v) => (
          <article className="private-record" key={v.id}>
            <span
              className={'badge ' + (v.status === 'arrived' ? 'green' : '')}
            >
              {v.status === 'authorized' && Date.parse(v.valid_until) < now
                ? 'Autorización vencida'
                : names[v.status]}
            </span>
            <h3>{v.visitor_name}</h3>
            <p>
              {labels[v.unit_id] ?? 'Unidad'} · {dateLabel(v.valid_from)} a{' '}
              {dateLabel(v.valid_until)}
            </p>
            <div className="record-actions">
              {resident && v.status === 'authorized' && (
                <Mutation
                  member={member}
                  id={v.id}
                  kind="visit_state"
                  next="cancelled"
                  label="Cancelar visita"
                  section="visitas"
                />
              )}
              {!resident &&
                v.status === 'authorized' &&
                now >= Date.parse(v.valid_from) &&
                now <= Date.parse(v.valid_until) && (
                  <Mutation
                    member={member}
                    id={v.id}
                    kind="visit_state"
                    next="arrived"
                    label="Registrar ingreso"
                    section="visitas"
                  />
                )}
              {!resident && v.status === 'arrived' && (
                <Mutation
                  member={member}
                  id={v.id}
                  kind="visit_state"
                  next="departed"
                  label="Registrar salida"
                  section="visitas"
                />
              )}
              {!resident && v.status === 'authorized' && (
                <Mutation
                  member={member}
                  id={v.id}
                  kind="visit_state"
                  next="cancelled"
                  label="Cancelar autorización"
                  section="visitas"
                />
              )}
            </div>
          </article>
        ))}
        {!visits.length && (
          <p className="empty-state">
            {resident
              ? 'Todavía no has autorizado visitas para tu unidad.'
              : 'No hay visitas registradas en la comunidad.'}
          </p>
        )}
      </section>
      <section className="panel">
        <span className="small-label">NUEVA AUTORIZACIÓN</span>
        <h2>
          {resident ? 'Recibe a quien esperas.' : 'Registrar una visita.'}
        </h2>
        <form action={operate} className="secure-form">
          <Fields member={member} kind="create_visit" section="visitas" />
          <UnitField member={member} units={units} />
          <label>
            Nombre de la visita
            <input name="text" required minLength={3} maxLength={80} />
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
            Máximo siete días. El personal registra el ingreso dentro de este
            horario. Esta autorización todavía no genera QR ni abre accesos
            físicos.
          </p>
          <SubmitButton>Autorizar visita ↗</SubmitButton>
        </form>
      </section>
    </div>
  );
}
export function PackageSection({
  member,
  units,
  parcels,
}: {
  member: Membership;
  units: Unit[];
  parcels: Parcel[];
}) {
  const resident = member.role === 'residente';
  const labels = Object.fromEntries(units.map((u) => [u.id, u.label]));
  return (
    <div className="portal-grid">
      <section className="panel">
        <span className="small-label">
          {resident ? 'MIS ENTREGAS' : 'CONTROL DE RECEPCIÓN'}
        </span>
        <h2>{resident ? 'Tus encomiendas.' : 'Recepción y entrega.'}</h2>
        {parcels.map((p) => (
          <article className="private-record" key={p.id}>
            <span className="badge">{names[p.status]}</span>
            <h3>{p.carrier}</h3>
            <p>
              {labels[p.unit_id] ?? 'Unidad'} · Recibida el{' '}
              {dateLabel(p.received_at)}
            </p>
            {!resident && p.status === 'received' && (
              <Mutation
                member={member}
                id={p.id}
                kind="deliver"
                label="Registrar entrega al destinatario"
                section="encomiendas"
              />
            )}
            {resident && p.status === 'received' && (
              <p>Disponible para retirar en conserjería.</p>
            )}
          </article>
        ))}
        {!parcels.length && (
          <p className="empty-state">No hay encomiendas registradas.</p>
        )}
        <p className="panel-note">Últimos 100 registros.</p>
      </section>
      {!resident ? (
        <section className="panel">
          <h2>Nueva recepción</h2>
          <form action={operate} className="secure-form">
            <Fields
              member={member}
              kind="receive_package"
              section="encomiendas"
            />
            <UnitField member={member} units={units} />
            <label>
              Empresa o transportista
              <input name="text" required minLength={2} maxLength={100} />
            </label>
            <SubmitButton>Registrar encomienda ↗</SubmitButton>
          </form>
        </section>
      ) : (
        <section className="panel">
          <h2>Un retiro coordinado.</h2>
          <p className="panel-note">
            Conserjería confirma la entrega cuando retiras tu encomienda. El
            residente puede consultar el estado, pero no marcarla como
            entregada.
          </p>
        </section>
      )}
    </div>
  );
}
export function IncidentSection({
  member,
  units,
  incidents,
}: {
  member: Membership;
  units: Unit[];
  incidents: Incident[];
}) {
  const staff = member.role !== 'residente';
  const labels = Object.fromEntries(units.map((u) => [u.id, u.label]));
  return (
    <div className="portal-grid">
      <section className="panel">
        <span className="small-label">SEGUIMIENTO</span>
        <h2>{staff ? 'Solicitudes de la comunidad.' : 'Tus solicitudes.'}</h2>
        {incidents.map((i) => (
          <article className="private-record" key={i.id}>
            <span className="badge">{names[i.status]}</span>
            <h3>{i.title}</h3>
            <p>
              {labels[i.unit_id] ?? 'Unidad'} · {dateLabel(i.created_at)}
            </p>
            {staff && i.status === 'open' && (
              <Mutation
                member={member}
                id={i.id}
                kind="incident_state"
                next="in_progress"
                label="Tomar solicitud"
                section="solicitudes"
              />
            )}
            {staff && i.status === 'in_progress' && (
              <Mutation
                member={member}
                id={i.id}
                kind="incident_state"
                next="resolved"
                label="Resolver solicitud"
                section="solicitudes"
              />
            )}
          </article>
        ))}
        {!incidents.length && (
          <p className="empty-state">No hay solicitudes registradas.</p>
        )}
        <p className="panel-note">
          Últimos 100 registros. El personal gestiona su resolución.
        </p>
      </section>
      <section className="panel">
        <h2>Un detalle por atender.</h2>
        <form action={operate} className="secure-form">
          <Fields
            member={member}
            kind="create_incident"
            section="solicitudes"
          />
          <UnitField member={member} units={units} />
          <label>
            Descripción breve
            <input name="text" minLength={5} maxLength={160} required />
          </label>
          <SubmitButton>Enviar solicitud ↗</SubmitButton>
        </form>
      </section>
    </div>
  );
}
export function Announcements({
  announcements,
}: {
  announcements: Announcement[];
}) {
  return (
    <section className="panel">
      <span className="small-label">COMUNICACIÓN DE LA COMUNIDAD</span>
      <h2>Nos mantenemos cerca.</h2>
      {announcements.map((a) => (
        <article className="private-record" key={a.id}>
          <span className="small-label">{dateLabel(a.created_at)}</span>
          <h3>{a.title}</h3>
          <p>{a.body}</p>
        </article>
      ))}
      {!announcements.length && (
        <p className="empty-state">
          La administración todavía no publicó comunicados.
        </p>
      )}
    </section>
  );
}
export function ActivityLog({ entries }: { entries: Audit[] }) {
  return (
    <section className="panel">
      <span className="small-label">ACTIVIDAD OPERACIONAL</span>
      <h2>La continuidad de cada turno.</h2>
      <ol className="log-timeline">
        {entries.map((e) => (
          <li key={e.id}>
            <span className="small-label">{dateLabel(e.created_at)}</span>
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
                ? 'Registro creado'
                : (names[e.old_status ?? ''] ?? 'Actualizado') +
                  ' → ' +
                  (names[e.new_status ?? ''] ?? 'actualizado')}
            </p>
          </li>
        ))}
      </ol>
      {!entries.length && (
        <p className="empty-state">Sin actividad registrada.</p>
      )}
      <p className="panel-note">
        Últimos 100 eventos operacionales. Las notas manuales y el cierre formal
        de turno aún no están implementados.
      </p>
    </section>
  );
}
