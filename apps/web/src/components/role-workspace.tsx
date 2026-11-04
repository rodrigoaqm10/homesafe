'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useDemo } from '@/app/demo/layout';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  demoUnit,
  type Role,
  roleNames,
  type VisitStatus,
  validateVisit,
  visibleRecords,
  visitTransition,
} from '@/modules/community/domain/demo-workflows';

const menus: Record<Role, string[]> = {
  residente: [
    'Mi hogar',
    'Visitas',
    'Encomiendas',
    'Solicitudes',
    'Comunicados',
  ],
  conserje: ['Recepción', 'Visitas', 'Encomiendas', 'Solicitudes', 'Bitácora'],
  administrador: [
    'Comunidad',
    'Visitas',
    'Encomiendas',
    'Solicitudes',
    'Bitácora',
  ],
};
export function RoleWorkspace({ role }: { role: Role }) {
  const { state, update, reset } = useDemo();
  const [tab, setTab] = useState(menus[role][0]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [modal, setModal] = useState<'visit' | 'parcel' | 'request' | 'entry'>(
    'visit',
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const resident = role === 'residente';
  const admin = role === 'administrador';
  const overview = tab === menus[role][0];
  const visits = visibleRecords(state.visits, role, demoUnit);
  const parcels = visibleRecords(state.parcels, role, demoUnit);
  const requests = visibleRecords(state.requests, role, demoUnit);
  function navigate(value: string) {
    setTab(value);
    setQuery('');
    setMessage('');
    setError('');
  }
  function openForm(kind: typeof modal) {
    setModal(kind);
    setFormError('');
    dialog.current?.showModal();
  }
  function log(text: string) {
    return {
      id: crypto.randomUUID(),
      text,
      role,
      at: new Date().toISOString(),
    };
  }
  function transition(id: string, next: VisitStatus) {
    try {
      update((previous) => {
        const visit = previous.visits.find((v) => v.id === id);
        if (!visit) return previous;
        const result = visitTransition(visit, next, role, demoUnit);
        return {
          ...previous,
          visits: previous.visits.map((v) => (v.id === id ? result : v)),
          entries: [
            log(`Visita ${visit.name}: ${next.toLowerCase()} · ${visit.unit}`),
            ...previous.entries,
          ],
        };
      });
      setMessage(`Visita actualizada: ${next.toLowerCase()}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo actualizar.');
    }
  }
  function submit(data: FormData) {
    try {
      const text = String(data.get('text') ?? '').trim();
      const unit = resident ? demoUnit : String(data.get('unit') ?? demoUnit);
      if (!['A-502', 'B-204'].includes(unit))
        throw new Error('Unidad de muestra no válida.');
      if (text.length < 3 || text.length > 160)
        throw new Error('Escribe entre 3 y 160 caracteres.');
      const id = crypto.randomUUID();
      if (modal === 'visit') {
        const date = String(data.get('date'));
        validateVisit(text, date);
        update((p) => ({
          ...p,
          visits: [
            { id, name: text, unit, date, status: 'Autorizada' },
            ...p.visits,
          ],
          entries: [log(`Visita autorizada · ${unit}`), ...p.entries],
        }));
        navigate('Visitas');
      } else if (modal === 'parcel') {
        if (resident)
          throw new Error(
            'Solo conserjería o administración registra encomiendas.',
          );
        update((p) => ({
          ...p,
          parcels: [
            { id, carrier: text, unit, status: 'Recibida' },
            ...p.parcels,
          ],
          entries: [log(`Encomienda recibida · ${unit}`), ...p.entries],
        }));
        navigate('Encomiendas');
      } else if (modal === 'request') {
        update((p) => ({
          ...p,
          requests: [
            { id, title: text, unit, status: 'Pendiente' },
            ...p.requests,
          ],
          entries: [log(`Nueva solicitud · ${unit}`), ...p.entries],
        }));
        navigate('Solicitudes');
      } else {
        if (resident) throw new Error('Bitácora reservada al personal.');
        update((p) => ({ ...p, entries: [log(text), ...p.entries] }));
        navigate('Bitácora');
      }
      dialog.current?.close();
      setMessage('Registro creado en la demostración.');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : 'Revisa el formulario.');
    }
  }
  const filter = (text: string) =>
    text.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es'));
  return (
    <div className="workspace role-workspace">
      <aside className="sidebar">
        <Link className="brand" href="/">
          <span className="brand-symbol">H</span>
          <span>HOME SAFE</span>
        </Link>
        <div className="community-box">
          <span className="community-icon">LO</span>
          <span>
            Los Olivos
            <small>
              {resident ? `Unidad ${demoUnit}` : 'Comunidad de muestra'}
            </small>
          </span>
        </div>
        <span className="sidebar-label">{roleNames[role].toUpperCase()}</span>
        <nav aria-label={`Módulos de ${roleNames[role].toLowerCase()}`}>
          {menus[role].map((item) => (
            <button
              type="button"
              key={item}
              aria-current={tab === item ? 'page' : undefined}
              onClick={() => navigate(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        {admin && (
          <Link className="finance-link" href="/demo/administrador/gestion">
            Finanzas y directorio
          </Link>
        )}
        <div className="sidebar-bottom">
          <span className="status-dot" /> Espacio de{' '}
          {roleNames[role].toLowerCase()}
          <p>
            La misma comunidad.
            <br />
            Una experiencia para tu función.
          </p>
          <Link href="/demo"> Elegir otra experiencia</Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <span>
            Los Olivos <span className="muted">/</span>
            <strong>{roleNames[role]}</strong>
          </span>
          <Link href="/demo" className="text-link">
            Cambiar perfil de muestra
          </Link>
          <ThemeToggle />
        </header>
        <main className="workspace-content">
          <div className="page-top">
            <div>
              <span className="eyebrow">
                {resident
                  ? 'EL CUIDADO DE TU HOGAR'
                  : admin
                    ? 'UNA COMUNIDAD BIEN ADMINISTRADA'
                    : 'CONTINUIDAD EN CADA TURNO'}
              </span>
              <h1>
                {overview
                  ? resident
                    ? 'Tu hogar, en buenas manos.'
                    : admin
                      ? 'Una perspectiva completa.'
                      : 'Todo listo para recibir.'
                  : tab}
              </h1>
              <p>
                {resident
                  ? 'Lo importante de tu comunidad, cerca de ti.'
                  : admin
                    ? 'Conecta la gestión con lo que ocurre cada día.'
                    : 'Visitas, entregas y pendientes. Cada detalle tiene su lugar.'}
              </p>
            </div>
            <button
              className="button primary"
              type="button"
              onClick={() =>
                openForm(
                  resident
                    ? 'visit'
                    : tab === 'Encomiendas'
                      ? 'parcel'
                      : tab === 'Bitácora'
                        ? 'entry'
                        : 'request',
                )
              }
            >
              {resident
                ? '＋ Autorizar visita'
                : tab === 'Encomiendas'
                  ? '＋ Registrar encomienda'
                  : tab === 'Bitácora'
                    ? '＋ Añadir anotación'
                    : '＋ Nueva solicitud'}
            </button>
          </div>
          <div className="demo-banner">
            Datos ficticios compartidos entre los tres perfiles. No introduzcas
            información personal. Cambiar el perfil no equivale a autenticarse.
          </div>
          {message && (
            <p className="success-notice" role="status">
              {message}
            </p>
          )}
          {error && (
            <p className="error-notice" role="alert">
              {error}
            </p>
          )}
          {overview && (
            <>
              <div className="role-welcome">
                <div>
                  <span className="small-label">
                    {resident ? 'MI RESIDENCIA' : 'CENTRO DE OPERACIONES'}
                  </span>
                  <h2>
                    {resident
                      ? 'Los Olivos · A-502'
                      : 'El valor de estar coordinados.'}
                  </h2>
                  <p>
                    {resident
                      ? 'Tu espacio para organizar visitas y mantenerte al día.'
                      : 'Cada movimiento deja una anotación en la bitácora de muestra.'}
                  </p>
                </div>
                <span className="welcome-monogram">
                  {resident ? '502' : 'LO'}
                </span>
              </div>
              <div className="metric-grid">
                <article className="metric">
                  <span>Visitas autorizadas</span>
                  <strong>
                    {visits
                      .filter((v) => v.status === 'Autorizada')
                      .length.toString()
                      .padStart(2, '0')}
                  </strong>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => navigate('Visitas')}
                  >
                    Revisar visitas
                  </button>
                </article>
                <article className="metric">
                  <span>Encomiendas pendientes</span>
                  <strong>
                    {parcels
                      .filter((p) => p.status === 'Recibida')
                      .length.toString()
                      .padStart(2, '0')}
                  </strong>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => navigate('Encomiendas')}
                  >
                    Ver recepción
                  </button>
                </article>
                <article className="metric">
                  <span>Solicitudes abiertas</span>
                  <strong>
                    {requests
                      .filter((r) => r.status !== 'Resuelta')
                      .length.toString()
                      .padStart(2, '0')}
                  </strong>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => navigate('Solicitudes')}
                  >
                    Ver seguimiento
                  </button>
                </article>
                <article className="metric">
                  <span>
                    {resident ? 'Mi unidad' : 'Visitas en el edificio'}
                  </span>
                  <strong>
                    {resident
                      ? demoUnit
                      : visits
                          .filter((v) => v.status === 'Ingresada')
                          .length.toString()
                          .padStart(2, '0')}
                  </strong>
                  <p>
                    {resident
                      ? 'Torre A · Piso 5'
                      : 'Ingresos registrados en la demo'}
                  </p>
                </article>
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <span className="small-label">
                    COMUNICACIÓN DE LA COMUNIDAD
                  </span>
                  <h2>Cuidamos nuestros espacios.</h2>
                  <p className="panel-note">
                    El jueves se realizará una revisión preventiva de
                    iluminación en jardines. Esta comunicación es un ejemplo de
                    muestra.
                  </p>
                  <span className="badge">
                    Administración · Comunicado de muestra
                  </span>
                </section>
                <section className="panel">
                  <span className="small-label">ACCIONES FRECUENTES</span>
                  <h2>Resuelve lo cotidiano.</h2>
                  <div className="quick-actions">
                    <button
                      type="button"
                      onClick={() => openForm(resident ? 'request' : 'visit')}
                    >
                      {resident
                        ? 'Reportar un detalle'
                        : 'Autorizar visita de muestra'}{' '}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        navigate(resident ? 'Comunicados' : 'Bitácora')
                      }
                    >
                      {resident ? 'Leer comunicados' : 'Consultar bitácora'}
                    </button>
                  </div>
                </section>
              </div>
            </>
          )}
          {!overview && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <span className="small-label">
                    {resident
                      ? `INFORMACIÓN DE MI UNIDAD · ${demoUnit}`
                      : 'SEGUIMIENTO DE LA COMUNIDAD'}
                  </span>
                  <h2>
                    {tab === 'Visitas'
                      ? 'Bienvenidas con orden.'
                      : tab === 'Encomiendas'
                        ? 'Cada entrega, registrada.'
                        : tab === 'Solicitudes'
                          ? 'Cada detalle, acompañado.'
                          : tab === 'Bitácora'
                            ? 'La memoria de cada turno.'
                            : 'Nos mantenemos cerca.'}
                  </h2>
                </div>
                {tab !== 'Comunicados' && (
                  <label className="search-field">
                    <span className="sr-only">
                      Buscar en {tab.toLowerCase()}
                    </span>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Buscar…"
                    />
                  </label>
                )}
              </div>
              {tab === 'Visitas' && (
                <>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => openForm('visit')}
                  >
                    ＋ Autorizar visita de muestra
                  </button>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Visita</th>
                          <th>Unidad</th>
                          <th>Fecha autorizada</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visits
                          .filter((v) =>
                            filter(`${v.name} ${v.unit} ${v.status}`),
                          )
                          .map((v) => (
                            <tr key={v.id}>
                              <td>
                                <strong>{v.name}</strong>
                              </td>
                              <td>{v.unit}</td>
                              <td>{v.date.split('-').reverse().join('/')}</td>
                              <td>
                                <span className="badge">{v.status}</span>
                              </td>
                              <td>
                                {resident ? (
                                  v.status === 'Autorizada' && (
                                    <button
                                      className="table-action"
                                      type="button"
                                      onClick={() =>
                                        transition(v.id, 'Cancelada')
                                      }
                                    >
                                      Cancelar
                                    </button>
                                  )
                                ) : v.status === 'Autorizada' ? (
                                  <button
                                    className="table-action"
                                    type="button"
                                    onClick={() =>
                                      transition(v.id, 'Ingresada')
                                    }
                                  >
                                    Registrar ingreso
                                  </button>
                                ) : v.status === 'Ingresada' ? (
                                  <button
                                    className="table-action"
                                    type="button"
                                    onClick={() =>
                                      transition(v.id, 'Finalizada')
                                    }
                                  >
                                    Registrar salida
                                  </button>
                                ) : (
                                  <span>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {!visits.some((v) =>
                    filter(`${v.name} ${v.unit} ${v.status}`),
                  ) && (
                    <p className="empty-state">
                      No hay visitas que coincidan con tu búsqueda.
                    </p>
                  )}
                  <p className="panel-note">
                    El recorrido demuestra los estados de una visita; todavía no
                    valida fecha de acceso, identidad ni credenciales QR. No
                    habilita accesos físicos.
                  </p>
                </>
              )}
              {tab === 'Encomiendas' && (
                <>
                  {!resident && (
                    <button
                      className="text-link"
                      type="button"
                      onClick={() => openForm('parcel')}
                    >
                      ＋ Registrar recepción
                    </button>
                  )}
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Transportista</th>
                          <th>Unidad</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parcels
                          .filter((p) =>
                            filter(`${p.carrier} ${p.unit} ${p.status}`),
                          )
                          .map((p) => (
                            <tr key={p.id}>
                              <td>
                                <strong>{p.carrier}</strong>
                              </td>
                              <td>{p.unit}</td>
                              <td>
                                <span className="badge">{p.status}</span>
                              </td>
                              <td>
                                {!resident && p.status === 'Recibida' ? (
                                  <button
                                    className="table-action"
                                    type="button"
                                    onClick={() => {
                                      update((previous) => ({
                                        ...previous,
                                        parcels: previous.parcels.map((x) =>
                                          x.id === p.id
                                            ? { ...x, status: 'Entregada' }
                                            : x,
                                        ),
                                        entries: [
                                          log(
                                            `Encomienda entregada · ${p.unit}`,
                                          ),
                                          ...previous.entries,
                                        ],
                                      }));
                                      setMessage(
                                        'Entrega registrada en la demostración.',
                                      );
                                    }}
                                  >
                                    Registrar entrega
                                  </button>
                                ) : resident && p.status === 'Recibida' ? (
                                  'Pendiente de retiro'
                                ) : (
                                  '—'
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  {!parcels.some((p) =>
                    filter(`${p.carrier} ${p.unit} ${p.status}`),
                  ) && (
                    <p className="empty-state">
                      No hay encomiendas para mostrar.
                    </p>
                  )}
                </>
              )}
              {tab === 'Solicitudes' && (
                <>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => openForm('request')}
                  >
                    ＋ Crear solicitud
                  </button>
                  <div className="request-list">
                    {requests
                      .filter((r) => filter(`${r.title} ${r.unit} ${r.status}`))
                      .map((r) => (
                        <article className="request-row" key={r.id}>
                          <div>
                            <span className="small-label">{r.unit}</span>
                            <h3>{r.title}</h3>
                            <span className="badge">{r.status}</span>
                          </div>
                          {!resident && r.status !== 'Resuelta' && (
                            <button
                              className="table-action"
                              type="button"
                              onClick={() => {
                                const next =
                                  r.status === 'Pendiente'
                                    ? 'En curso'
                                    : 'Resuelta';
                                update((previous) => ({
                                  ...previous,
                                  requests: previous.requests.map((x) =>
                                    x.id === r.id ? { ...x, status: next } : x,
                                  ),
                                  entries: [
                                    log(
                                      `Solicitud: ${next.toLowerCase()} · ${r.unit}`,
                                    ),
                                    ...previous.entries,
                                  ],
                                }));
                                setMessage(
                                  `Solicitud actualizada: ${next.toLowerCase()}.`,
                                );
                              }}
                            >
                              {r.status === 'Pendiente'
                                ? 'Tomar solicitud'
                                : 'Resolver solicitud'}{' '}
                            </button>
                          )}
                        </article>
                      ))}
                  </div>
                  {!requests.some((r) =>
                    filter(`${r.title} ${r.unit} ${r.status}`),
                  ) && (
                    <p className="empty-state">
                      No hay solicitudes para mostrar.
                    </p>
                  )}
                </>
              )}
              {tab === 'Bitácora' && !resident && (
                <>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => openForm('entry')}
                  >
                    ＋ Añadir anotación de turno
                  </button>
                  <ol className="log-timeline">
                    {state.entries
                      .filter((e) => filter(e.text))
                      .map((e) => (
                        <li key={e.id}>
                          <span className="small-label">
                            {roleNames[e.role]} ·{' '}
                            {new Intl.DateTimeFormat('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'America/Santiago',
                            }).format(new Date(e.at))}
                          </span>
                          <p>{e.text}</p>
                        </li>
                      ))}
                  </ol>
                  {!state.entries.some((e) => filter(e.text)) && (
                    <p className="empty-state">
                      Sin anotaciones todavía. Los movimientos de visitas,
                      encomiendas y solicitudes aparecerán aquí.
                    </p>
                  )}
                  <p className="panel-note">
                    Bitácora de demostración en memoria. El registro de
                    auditoría inmutable se implementará en servidor.
                  </p>
                </>
              )}
              {tab === 'Comunicados' && (
                <article className="announcement">
                  <span className="badge">Información de muestra</span>
                  <h3>Revisión preventiva de jardines</h3>
                  <p>
                    El equipo de mantenimiento revisará la iluminación exterior.
                    Ante cualquier detalle, puedes crear una solicitud desde tu
                    espacio.
                  </p>
                  <button
                    className="text-link"
                    type="button"
                    onClick={() => openForm('request')}
                  >
                    Crear solicitud relacionada
                  </button>
                </article>
              )}
            </section>
          )}
          <footer className="workspace-footer">
            <Link href="/demo"> Los tres perfiles</Link>
            <button
              type="button"
              className="reset-demo"
              onClick={() => {
                reset();
                setMessage('Se restablecieron todos los datos ficticios.');
                setQuery('');
              }}
            >
              Restablecer datos de muestra
            </button>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="incident-dialog"
        aria-labelledby="role-modal-title"
      >
        <form action={submit} key={modal}>
          <div className="panel-title">
            <span className="eyebrow">LOS OLIVOS · DEMOSTRACIÓN</span>
            <button
              type="button"
              className="close-button"
              aria-label="Cerrar formulario"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
          <h2 id="role-modal-title">
            {modal === 'visit'
              ? 'Una visita bienvenida.'
              : modal === 'parcel'
                ? 'Una nueva entrega.'
                : modal === 'request'
                  ? 'Un detalle por atender.'
                  : 'Continuidad de turno.'}
          </h2>
          <p>Usa únicamente datos ficticios.</p>
          {formError && (
            <p className="error-notice" role="alert">
              {formError}
            </p>
          )}
          <label>
            {modal === 'visit'
              ? 'Nombre de muestra'
              : modal === 'parcel'
                ? 'Transportista de muestra'
                : 'Descripción'}
            <input
              name="text"
              required
              minLength={3}
              maxLength={modal === 'visit' ? 80 : 160}
            />
          </label>
          {modal !== 'entry' && !resident && (
            <label>
              Unidad
              <select name="unit">
                <option>A-502</option>
                <option>B-204</option>
              </select>
            </label>
          )}
          {modal === 'visit' && (
            <label>
              Fecha autorizada
              <input type="date" name="date" required />
            </label>
          )}
          <button className="button primary" type="submit">
            {modal === 'visit'
              ? 'Autorizar visita de muestra'
              : 'Guardar registro de muestra'}{' '}
          </button>
        </form>
      </dialog>
    </div>
  );
}
