'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';

type Incident = {
  id: number;
  title: string;
  area: string;
  priority: string;
  status: string;
};
const initial: Incident[] = [
  {
    id: 1042,
    title: 'Revisión de iluminación del jardín',
    area: 'Áreas comunes',
    priority: 'Normal',
    status: 'En curso',
  },
  {
    id: 1041,
    title: 'Ajuste de cierre en puerta peatonal',
    area: 'Acceso principal',
    priority: 'Alta',
    status: 'Pendiente',
  },
  {
    id: 1040,
    title: 'Mantención preventiva del ascensor',
    area: 'Torre A',
    priority: 'Normal',
    status: 'Programada',
  },
];
const tabs = [
  'Resumen',
  'Incidencias',
  'Residentes',
  'Finanzas',
  'Documentos',
] as const;
type Tab = (typeof tabs)[number];
export function DemoWorkspace() {
  const [tab, setTab] = useState<Tab>('Resumen');
  const [search, setSearch] = useState('');
  const [incidents, setIncidents] = useState(initial);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  function changeTab(value: Tab) {
    setTab(value);
    setSearch('');
    setNotice('');
  }
  function submit(form: FormData) {
    const title = String(form.get('title') ?? '').trim();
    if (title.length < 5 || title.length > 120) return;
    setIncidents([
      ...incidents,
      {
        id: Math.max(...incidents.map((i) => i.id)) + 1,
        title,
        area: String(form.get('area')),
        priority: String(form.get('priority')),
        status: 'Pendiente',
      },
    ]);
    dialog.current?.close();
    setTab('Incidencias');
    setNotice(
      'Incidencia creada en esta demostración. Los cambios se borran al recargar.',
    );
  }
  const shown = incidents.filter((i) =>
    `${i.title} ${i.area} ${i.status}`
      .toLocaleLowerCase('es')
      .includes(search.toLocaleLowerCase('es')),
  );
  return (
    <div className="workspace">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-symbol">H</span>
          <span>HOME SAFE</span>
        </Link>
        <div className="community-box">
          <span className="community-icon">LO</span>
          <span>
            Los Olivos<small>Comunidad de muestra</small>
          </span>
        </div>
        <span className="sidebar-label">ESPACIO DE TRABAJO</span>
        <nav aria-label="Panel de demostración">
          {tabs.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => changeTab(t)}
              aria-current={tab === t ? 'page' : undefined}
            >
              {t}
              {t === 'Incidencias' && (
                <small>
                  {incidents.filter((i) => i.status !== 'Resuelta').length}
                </small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Demostración local
          <p>
            Explora con tranquilidad.
            <br />
            Todos los datos son ficticios.
          </p>
          <Link href="/"> Volver a Home Safe</Link>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="workspace-header">
          <span>
            Comunidad <span className="muted">/</span>{' '}
            <strong>Los Olivos</strong>
          </span>
          <div>
            <span className="demo-pill">VISTA DE DEMOSTRACIÓN</span>
            <button
              type="button"
              className="notification-button"
              onClick={() => setNotificationOpen(!notificationOpen)}
              aria-label="Avisos de la demostración"
              aria-expanded={notificationOpen}
            >
              ♧<i />
            </button>
            <span className="avatar">AD</span>
          </div>
        </header>
        {notificationOpen && (
          <div className="notification-panel">
            <strong>Tu centro de avisos</strong>
            <p>
              Hay{' '}
              {
                incidents.filter(
                  (i) => i.priority === 'Alta' && i.status !== 'Resuelta',
                ).length
              }{' '}
              incidencia prioritaria por revisar.
            </p>
            <button
              type="button"
              onClick={() => {
                changeTab('Incidencias');
                setNotificationOpen(false);
              }}
            >
              Revisar incidencias
            </button>
          </div>
        )}
        <main className="workspace-content">
          <div className="page-top">
            <div>
              <span className="eyebrow">ADMINISTRACIÓN RESIDENCIAL</span>
              <h1>{tab === 'Resumen' ? 'Todo comienza con claridad.' : tab}</h1>
              <p>
                {tab === 'Resumen'
                  ? 'Una mirada a lo que importa en Los Olivos.'
                  : 'Información organizada para una gestión cuidadosa.'}
              </p>
            </div>
            <button
              type="button"
              className="button primary"
              onClick={() => dialog.current?.showModal()}
            >
              ＋ Nueva incidencia
            </button>
          </div>
          <div className="demo-banner">
            Entorno de muestra. No procesa pagos ni almacena datos personales.
            Los cambios son temporales.
          </div>
          {notice && (
            <p className="success-notice" role="status">
              {notice}
            </p>
          )}
          {tab === 'Resumen' && (
            <>
              <div className="metric-grid">
                {[
                  {
                    label: 'Recaudación del período',
                    value: '$24.850.000',
                    detail: '94,2 % del total esperado',
                    trend: 'Período de muestra',
                  },
                  {
                    label: 'Unidades residenciales',
                    value: '128',
                    detail: '2 torres · 16 pisos',
                    trend: 'Comunidad Los Olivos',
                  },
                  {
                    label: 'Incidencias abiertas',
                    value: String(
                      incidents.filter((i) => i.status !== 'Resuelta').length,
                    ).padStart(2, '0'),
                    detail: `${incidents.filter((i) => i.priority === 'Alta' && i.status !== 'Resuelta').length} requiere atención prioritaria`,
                    trend: 'Seguimiento operacional',
                  },
                  {
                    label: 'Mantenciones del mes',
                    value: '06',
                    detail: '5 completadas · 1 programada',
                    trend: 'Plan preventivo',
                  },
                ].map((m) => (
                  <article className="metric" key={m.label}>
                    <span>{m.label}</span>
                    <strong>{m.value}</strong>
                    <p>{m.detail}</p>
                    <small>{m.trend}</small>
                  </article>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel chart-panel">
                  <div className="panel-title">
                    <div>
                      <span className="small-label">
                        FINANZAS EN PERSPECTIVA
                      </span>
                      <h2>Una comunidad al día.</h2>
                    </div>
                    <span className="neutral-tag">Últimos 6 meses</span>
                  </div>
                  <div className="chart-legend">
                    <span>
                      <i /> Recaudación
                    </span>
                    <span>
                      <i /> Monto esperado
                    </span>
                  </div>
                  <div
                    className="bar-chart"
                    role="img"
                    aria-label="Recaudación ficticia de junio a noviembre: 82, 88, 85, 93, 90 y 94 por ciento"
                  >
                    {[82, 88, 85, 93, 90, 94].map((v, i) => (
                      <div className="bar-column" key={v}>
                        <div className="bar-track">
                          <div className={`bar-fill bar-${i}`} />
                        </div>
                        <span>
                          {['JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV'][i]}
                        </span>
                        <small>{v}%</small>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel attention-panel">
                  <span className="small-label">ATENCIÓN AL DETALLE</span>
                  <h2>Lo próximo.</h2>
                  <div className="agenda-item">
                    <span className="date-square">
                      05<small>NOV</small>
                    </span>
                    <div>
                      <strong>Mantención de ascensor</strong>
                      <p>Torre A · 09:30 h</p>
                      <span className="badge">Programada</span>
                    </div>
                  </div>
                  <div className="agenda-item">
                    <span className="date-square">
                      10<small>NOV</small>
                    </span>
                    <div>
                      <strong>Revisión del jardín</strong>
                      <p>Áreas comunes · 10:00 h</p>
                      <span className="badge">Programada</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() => changeTab('Incidencias')}
                  >
                    Ver actividad operacional
                  </button>
                </section>
              </div>
            </>
          )}
          {(tab === 'Resumen' || tab === 'Incidencias') && (
            <section className="panel">
              <div className="panel-title">
                <div>
                  <span className="small-label">
                    CADA SOLICITUD, UN SEGUIMIENTO
                  </span>
                  <h2>
                    {tab === 'Resumen'
                      ? 'Actividad reciente'
                      : 'Gestión de incidencias'}
                  </h2>
                </div>
                <label className="search-field">
                  <span className="sr-only">Buscar incidencias</span>
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Buscar incidencia…"
                  />
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Solicitud</th>
                      <th>Ubicación</th>
                      <th>Prioridad</th>
                      <th>Estado</th>
                      <th>
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((i) => (
                      <tr key={i.id}>
                        <td>
                          <small className="record-id">HS-{i.id}</small>
                          <strong>{i.title}</strong>
                        </td>
                        <td>{i.area}</td>
                        <td>
                          <span
                            className={
                              i.priority === 'Alta' ? 'badge warm' : 'badge'
                            }
                          >
                            {i.priority}
                          </span>
                        </td>
                        <td>
                          <span
                            className={
                              i.status === 'Resuelta' ? 'badge green' : 'badge'
                            }
                          >
                            {i.status}
                          </span>
                        </td>
                        <td>
                          {i.status !== 'Resuelta' && (
                            <button
                              type="button"
                              className="table-action"
                              onClick={() => {
                                setIncidents(
                                  incidents.map((x) =>
                                    x.id === i.id
                                      ? { ...x, status: 'Resuelta' }
                                      : x,
                                  ),
                                );
                                setNotice(
                                  'Incidencia resuelta en la demostración.',
                                );
                              }}
                            >
                              Resolver
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {shown.length === 0 && (
                  <p className="empty-state">
                    No hay incidencias que coincidan con tu búsqueda.
                  </p>
                )}
              </div>
            </section>
          )}
          {tab === 'Residentes' && (
            <section className="panel">
              <div className="panel-title">
                <h2>Directorio de muestra</h2>
                <label className="search-field">
                  <span className="sr-only">Buscar unidad</span>
                  <input
                    placeholder="Buscar unidad o torre…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Unidad</th>
                      <th>Comunidad</th>
                      <th>Ocupación</th>
                      <th>Cuenta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {['A-101', 'A-102', 'A-201', 'B-101', 'B-301']
                      .filter((u) =>
                        u.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((u, i) => (
                        <tr key={u}>
                          <td>
                            <strong>{u}</strong>
                          </td>
                          <td>Los Olivos · Torre {u[0]}</td>
                          <td>{i === 2 ? 'Disponible' : 'Habitada'}</td>
                          <td>
                            <span className="badge green">Datos ficticios</span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <p className="panel-note">
                El directorio real estará disponible después de configurar
                autenticación y permisos por comunidad.
              </p>
            </section>
          )}
          {tab === 'Finanzas' && (
            <section className="panel finance-preview">
              <span className="small-label">
                PERÍODO DE MUESTRA · NOVIEMBRE 2026
              </span>
              <h2>Transparencia en cada cifra.</h2>
              <div className="metric-grid">
                <div className="metric">
                  <span>Total emitido</span>
                  <strong>$26.380.000</strong>
                </div>
                <div className="metric">
                  <span>Recaudado</span>
                  <strong>$24.850.000</strong>
                </div>
                <div className="metric">
                  <span>Saldo pendiente</span>
                  <strong>$1.530.000</strong>
                </div>
              </div>
              <p className="panel-note">
                Vista conceptual con cifras ficticias. Los cobros, pagos y
                conciliación se implementarán con transacciones verificadas y
                una pasarela de pagos.
              </p>
            </section>
          )}
          {tab === 'Documentos' && (
            <section className="panel">
              <span className="small-label">ARCHIVO DE LA COMUNIDAD</span>
              <h2>Todo tiene su lugar.</h2>
              <div className="document-grid">
                {[
                  'Reglamento de convivencia',
                  'Informe de gestión',
                  'Plan de mantenimiento',
                ].map((x) => (
                  <article className="document-card" key={x}>
                    <span>▤</span>
                    <h3>{x}</h3>
                    <p>Categoría de muestra</p>
                    <small>Sin archivos reales</small>
                  </article>
                ))}
              </div>
              <p className="panel-note">
                Los archivos privados se habilitarán con políticas de acceso y
                almacenamiento verificadas.
              </p>
            </section>
          )}
          <footer className="workspace-footer">
            <span>Home Safe</span>
            <span>Gestión con criterio. Cuidado en cada detalle.</span>
          </footer>
        </main>
      </div>
      <dialog
        ref={dialog}
        className="incident-dialog"
        aria-labelledby="incident-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') dialog.current?.close();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <form action={submit}>
          <div className="panel-title">
            <span className="eyebrow">NUEVA SOLICITUD</span>
            <button
              type="button"
              className="close-button"
              aria-label="Cerrar"
              onClick={() => dialog.current?.close()}
            >
              ×
            </button>
          </div>
          <h2 id="incident-title">Un detalle por atender.</h2>
          <p>Registro temporal en la demostración.</p>
          <label>
            Descripción breve
            <input
              autoFocus
              name="title"
              required
              minLength={5}
              maxLength={120}
              placeholder="¿Qué necesita atención?"
            />
          </label>
          <label>
            Ubicación
            <select name="area">
              <option>Áreas comunes</option>
              <option>Torre A</option>
              <option>Torre B</option>
              <option>Acceso principal</option>
            </select>
          </label>
          <label>
            Prioridad
            <select name="priority">
              <option>Normal</option>
              <option>Alta</option>
            </select>
          </label>
          <button className="button primary" type="submit">
            Crear incidencia
          </button>
        </form>
      </dialog>
    </div>
  );
}
