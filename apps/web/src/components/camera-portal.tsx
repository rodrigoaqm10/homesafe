import { redirect } from 'next/navigation';
import { cameraAction } from '@/app/portal/camera-actions';
import { createClient } from '@/lib/supabase/server';
import type { Membership } from '@/modules/identity/infrastructure/session';
import { dateLabel } from './portal-operations';
import { PortalShell } from './portal-shell';
import { SubmitButton } from './submit-button';

const states: Record<string, string> = {
  operativa: 'Imagen verificada',
  sin_imagen: 'Sin imagen',
  en_revision: 'En revisión',
};
export async function CameraPortal({
  member,
  status,
}: {
  member: Membership;
  status?: string;
}) {
  if (member.role === 'residente') redirect('/portal/' + member.id);
  const client = await createClient();
  const admin = member.role === 'administrador';
  const [community, cameras, events] = await Promise.all([
    client
      .from('communities')
      .select('name')
      .eq('id', member.community_id)
      .eq('organization_id', member.organization_id)
      .single(),
    client
      .from('security_camera_status')
      .select('id,label,location,state,observed_at')
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id)
      .order('label')
      .limit(100),
    client
      .from('security_camera_history')
      .select('id,camera_id,state,note,created_at,camera_label')
      .eq('organization_id', member.organization_id)
      .eq('community_id', member.community_id)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(50),
  ]);
  const unavailable = community.error || cameras.error || events.error;
  return (
    <PortalShell
      member={member}
      community={community.data?.name ?? 'Mi comunidad'}
      section="camaras"
      title={admin ? 'Supervisión de cámaras.' : 'Cámaras del edificio.'}
      subtitle={
        admin
          ? 'Inventario y seguimiento de observaciones de conserjería.'
          : 'Revisa el último estado registrado y deja constancia de lo observado en el grabador.'
      }
      status={status}
    >
      <section className="reception-banner">
        <span className="eyebrow">SEGURIDAD DEL EDIFICIO</span>
        <h2>Registro de cámaras y novedades</h2>
        <p>
          El estado se registra manualmente después de revisar el equipo del
          edificio. El video en vivo y las grabaciones todavía se consultan en
          el grabador.
        </p>
      </section>
      {unavailable ? (
        <p className="error-notice" role="alert">
          El registro de cámaras no está disponible en este momento.
        </p>
      ) : (
        <>
          <div className="portal-grid">
            <section className="panel">
              <h2>Inventario de cámaras</h2>
              {cameras.data?.map((c) => (
                <article className="private-record" key={c.id}>
                  <span className="badge">
                    {states[c.state] ?? 'Sin verificación'}
                  </span>
                  <h3>{c.label}</h3>
                  <p>{c.location}</p>
                  {c.observed_at && (
                    <p>Última revisión manual: {dateLabel(c.observed_at)}</p>
                  )}
                  <details>
                    <summary>Registrar observación</summary>
                    <form className="secure-form" action={cameraAction}>
                      <input
                        type="hidden"
                        name="membership_id"
                        value={member.id}
                      />
                      <input type="hidden" name="operation" value="observe" />
                      <input type="hidden" name="camera_id" value={c.id} />
                      <label>
                        Estado
                        <select name="state" required defaultValue="">
                          <option value="" disabled>
                            Selecciona un estado
                          </option>
                          {Object.entries(states).map(([id, label]) => (
                            <option key={id} value={id}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Nota de operación
                        <textarea
                          name="note"
                          maxLength={400}
                          placeholder="Ej.: El canal no muestra imagen en el grabador."
                        />
                      </label>
                      <p>
                        Registra solo la novedad. Evita datos personales,
                        credenciales o enlaces al video.
                      </p>
                      <SubmitButton>Guardar observación ↗</SubmitButton>
                    </form>
                  </details>
                </article>
              ))}
              {!cameras.data?.length && (
                <p className="empty-state">
                  La administración todavía no ha registrado cámaras.
                </p>
              )}
              <p className="panel-note">
                Hasta 100 cámaras por orden de nombre.
              </p>
            </section>
            {admin && (
              <section className="panel">
                <h2>Registrar cámara</h2>
                <form className="secure-form" action={cameraAction}>
                  <input type="hidden" name="membership_id" value={member.id} />
                  <input type="hidden" name="operation" value="register" />
                  <label>
                    Nombre de la cámara
                    <input
                      name="label"
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Acceso principal"
                    />
                  </label>
                  <label>
                    Ubicación común
                    <input
                      name="location"
                      required
                      minLength={2}
                      maxLength={120}
                      placeholder="Vestíbulo"
                    />
                  </label>
                  <SubmitButton>Agregar al inventario ↗</SubmitButton>
                </form>
              </section>
            )}
          </div>
          <section className="panel">
            <h2>Historial de observaciones</h2>
            {events.data?.map((e) => (
              <article className="private-record" key={e.id}>
                <span className="small-label">{dateLabel(e.created_at)}</span>
                <h3>
                  {e.camera_label ?? 'Cámara'} · {states[e.state]}
                </h3>
                {e.note && <p>{e.note}</p>}
              </article>
            ))}
            {!events.data?.length && (
              <p className="empty-state">
                Todavía no se han registrado observaciones.
              </p>
            )}
            <p className="panel-note">
              Últimas 50 observaciones. Las altas y observaciones quedan en
              auditoría.
            </p>
          </section>
        </>
      )}
    </PortalShell>
  );
}
