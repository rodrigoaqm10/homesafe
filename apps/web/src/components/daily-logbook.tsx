import Link from 'next/link';
import { addShiftNote } from '@/app/portal/logbook-actions';
import { createClient } from '@/lib/supabase/server';
import type { Membership } from '@/modules/identity/infrastructure/session';
import { dateLabel } from './portal-operations';
import { PortalShell } from './portal-shell';
import { SubmitButton } from './submit-button';

const labels: Record<string, string> = {
  shift_note: 'Anotación de conserjería',
  announcements: 'Comunicado de administración',
  incidents: 'Solicitud o novedad',
  visits: 'Visita',
  packages: 'Encomienda',
  security_cameras: 'Alta de cámara',
  security_camera_events: 'Observación de cámara',
};
const states: Record<string, string> = {
  authorized: 'Autorizada',
  arrived: 'Ingreso registrado',
  departed: 'Salida registrada',
  cancelled: 'Cancelada',
  received: 'Recibida',
  delivered: 'Entregada',
  open: 'Recibida',
  in_progress: 'En curso',
  resolved: 'Resuelta',
  operativa: 'Imagen verificada',
  sin_imagen: 'Sin imagen',
  en_revision: 'En revisión',
};
type LogEntry = {
  id: string;
  created_at: string;
  kind: string;
  state: string | null;
  detail: string | null;
  body: string | null;
  unit_label: string | null;
};
const pageSize = 50;
export async function DailyLogbook({
  member,
  status,
  day,
  page,
}: {
  member: Membership;
  status?: string;
  day?: string;
  page?: string;
}) {
  const today = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'America/Santiago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const selected =
    typeof day === 'string' &&
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(day) &&
    day >= '2000-01-01' &&
    day <= today &&
    Number.isFinite(Date.parse(day)) &&
    new Date(day).toISOString().slice(0, 10) === day
      ? day
      : today;
  const index =
    typeof page === 'string' && /^[1-9][0-9]{0,5}$/.test(page)
      ? Number(page) - 1
      : 0;
  const client = await createClient();
  const [community, log] = await Promise.all([
    client
      .from('communities')
      .select('name')
      .eq('id', member.community_id)
      .eq('organization_id', member.organization_id)
      .single(),
    client
      .rpc('daily_logbook', {
        org: member.organization_id,
        community: member.community_id,
        local_day: selected,
      })
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(index * pageSize, (index + 1) * pageSize),
  ]);
  const base =
    '/portal/' + member.id + '?seccion=bitacora&dia=' + selected + '&pagina=';
  return (
    <PortalShell
      member={member}
      community={community.data?.name ?? 'Mi comunidad'}
      section="bitacora"
      title="Bitácora del edificio"
      subtitle="Anotaciones, comunicados y movimientos del día. Horario de Chile."
      status={status}
    >
      {member.role === 'conserje' && (
        <section className="panel logbook-entry">
          <h2>Registrar una novedad</h2>
          <form action={addShiftNote} className="secure-form">
            <input type="hidden" name="membership_id" value={member.id} />
            <label>
              Anotación de turno
              <textarea
                name="body"
                required
                minLength={3}
                maxLength={2000}
                rows={4}
              />
            </label>
            <p>
              Se guarda con la fecha y hora actuales y queda disponible para
              administración.
            </p>
            <SubmitButton>Guardar anotación</SubmitButton>
          </form>
        </section>
      )}
      <section className="panel">
        <h2>Registro diario</h2>
        <form className="secure-form logbook-filter" method="get">
          <input type="hidden" name="seccion" value="bitacora" />
          <label>
            Fecha
            <input
              type="date"
              name="dia"
              required
              defaultValue={selected}
              min="2000-01-01"
              max={today}
            />
          </label>
          <button className="button button-primary" type="submit">
            Consultar día
          </button>
        </form>
        {log.error ? (
          <p role="alert" className="error-notice">
            No se pudo cargar la bitácora.
          </p>
        ) : (
          <>
            <ol className="log-timeline">
              {log.data?.slice(0, pageSize).map((entry: LogEntry) => (
                <li key={entry.kind + entry.id} className="private-record">
                  <span className="small-label">
                    {dateLabel(entry.created_at)} ·{' '}
                    {labels[entry.kind] ?? 'Movimiento'}
                    {entry.unit_label && ' · Unidad ' + entry.unit_label}
                  </span>
                  {entry.detail && <h3>{entry.detail}</h3>}
                  {entry.state && <p>{states[entry.state] ?? entry.state}</p>}
                  {entry.body && <p>{entry.body}</p>}
                </li>
              ))}
            </ol>
            {!log.data?.length && (
              <p className="empty-state">No hay registros en esta página.</p>
            )}
            <nav className="logbook-pages" aria-label="Páginas del registro">
              {index > 0 && <Link href={base + index}>Página anterior</Link>}
              {(log.data?.length ?? 0) > pageSize && (
                <Link href={base + (index + 2)}>Página siguiente</Link>
              )}
            </nav>
          </>
        )}
      </section>
    </PortalShell>
  );
}
