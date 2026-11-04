import Link from 'next/link';

function Architecture() {
  return (
    <svg
      className="architecture"
      viewBox="0 0 700 760"
      role="img"
      aria-label="Ilustración arquitectónica de una residencia contemporánea entre jardines"
    >
      <defs>
        <linearGradient id="sky" x2="0" y2="1">
          <stop stopColor="#bacacb" />
          <stop offset="1" stopColor="#e2ded2" />
        </linearGradient>
        <linearGradient id="wall">
          <stop stopColor="#ddd7c9" />
          <stop offset="1" stopColor="#aba99d" />
        </linearGradient>
        <linearGradient id="glass">
          <stop stopColor="#536b70" />
          <stop offset=".5" stopColor="#8da1a0" />
          <stop offset="1" stopColor="#344e55" />
        </linearGradient>
        <pattern
          id="windows"
          width="86"
          height="77"
          patternUnits="userSpaceOnUse"
        >
          <rect width="86" height="77" fill="url(#wall)" />
          <rect x="9" y="6" width="68" height="53" fill="url(#glass)" />
          <path d="M42 6v53M9 60h68" stroke="#c7c4b8" strokeWidth="3" />
          <path d="M0 70h86" stroke="#eeeadf" strokeWidth="9" />
        </pattern>
      </defs>
      <rect width="700" height="760" fill="url(#sky)" />
      <circle cx="540" cy="120" r="80" fill="#eeecdf" opacity=".4" />
      <path d="M130 168 420 105 590 165v510H130Z" fill="url(#wall)" />
      <path d="m420 105 170 60v510H420Z" fill="#93988f" />
      <path d="M144 184 408 130v470H144Z" fill="url(#windows)" />
      <path d="m437 142 137 44v433H437Z" fill="url(#windows)" opacity=".72" />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <path
          key={i}
          d={`M119 ${210 + i * 64} 420 ${163 + i * 64} 600 ${209 + i * 64}v13l-180-42-301 43Z`}
          fill="#e7e2d5"
        />
      ))}
      <path d="M105 647 420 598l194 48v91H105Z" fill="#b9b6a8" />
      <path d="M174 655h160v82H174Z" fill="#304a4b" />
      <path
        d="M186 659v78m67-78v78m68-78v78"
        stroke="#b2aa8f"
        strokeWidth="4"
      />
      <path d="M0 724 700 692v68H0Z" fill="#b9b7a8" />
      <g fill="#405b49">
        <ellipse cx="54" cy="596" rx="62" ry="125" />
        <ellipse cx="652" cy="568" rx="77" ry="147" />
        <ellipse cx="92" cy="684" rx="105" ry="35" />
        <ellipse cx="580" cy="696" rx="123" ry="33" />
      </g>
      <g stroke="#687460" strokeWidth="8">
        <path d="m56 760 2-184m597 184-4-210" />
      </g>
      <path d="m355 760 66-61 120 61" fill="#d6d0be" />
    </svg>
  );
}
export default function Home() {
  return (
    <main>
      <header className="site-header">
        <Link className="brand" href="/">
          <span className="brand-symbol">H</span>
          <span>HOME SAFE</span>
        </Link>
        <nav aria-label="Navegación principal">
          <a href="#experiencia">La experiencia</a>
          <a href="#plataforma">Plataforma</a>
          <a href="#confianza">Confianza</a>
        </nav>
        <Link className="header-access" href="/acceso">
          Acceso privado
        </Link>
      </header>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">
            <i /> UNA NUEVA FORMA DE HABITAR
          </span>
          <h1>
            La excelencia
            <br />
            también se
            <br />
            <em>administra.</em>
          </h1>
          <p>
            El cuidado de una gran residencia está en cada detalle. Su gestión,
            su comunidad y su tranquilidad, conectadas en un solo lugar.
          </p>
          <div className="hero-actions">
            <Link className="button primary" href="/demo">
              Explorar la plataforma
            </Link>
            <a className="text-link" href="#experiencia">
              Descubrir Home Safe ↓
            </a>
          </div>
          <div className="hero-footnote">
            <span>01 — ADMINISTRAR CON CRITERIO</span>
            <span>Diseñado alrededor de las personas.</span>
          </div>
        </div>
        <div className="hero-visual">
          <Architecture />
          <span className="visual-caption">ARQUITECTURA PARA VIVIR MEJOR.</span>
          <div className="floating-note">
            <span className="small-label">EL VALOR DE ESTAR AL DÍA</span>
            <strong>Todo en su lugar.</strong>
            <div>
              <span className="status-dot" /> Operación · Comunidad ·
              Tranquilidad
            </div>
          </div>
          <span className="vertical-label">
            THE ART OF RESIDENTIAL MANAGEMENT
          </span>
        </div>
      </section>
      <section className="principles" aria-label="Pilares">
        <span>
          UNA VISIÓN INTEGRAL.
          <br />
          <b>Un estándar superior.</b>
        </span>
        <p>
          01 <strong>Gestión transparente</strong>
        </p>
        <p>
          02 <strong>Operación precisa</strong>
        </p>
        <p>
          03 <strong>Comunidad conectada</strong>
        </p>
      </section>
      <section id="experiencia" className="experience section-space">
        <div className="section-heading">
          <span className="eyebrow">LA EXPERIENCIA HOME SAFE</span>
          <h2>
            Un edificio excepcional.
            <br />
            Una gestión a su altura.
          </h2>
          <p>
            La tecnología encuentra su propósito cuando hace más simple lo
            importante.
          </p>
        </div>
        <div className="editorial-grid">
          {[
            {
              n: '01',
              title: 'Claridad para decidir.',
              text: 'Finanzas, documentos y actividad de la comunidad, organizados para entender el presente y planificar lo que viene.',
              tag: 'ADMINISTRACIÓN',
            },
            {
              n: '02',
              title: 'Cuidado que se anticipa.',
              text: 'Incidencias, activos y mantenciones en un mismo flujo. Cada tarea tiene un responsable; cada decisión, una historia.',
              tag: 'OPERACIONES',
            },
            {
              n: '03',
              title: 'Vivir con tranquilidad.',
              text: 'Visitas, encomiendas y comunicaciones pensadas para acompañar el día a día de quienes llaman hogar a este lugar.',
              tag: 'COMUNIDAD',
            },
          ].map((x) => (
            <article key={x.n}>
              <span className="article-number">{x.n}</span>
              <span className="small-label">{x.tag}</span>
              <h3>{x.title}</h3>
              <p>{x.text}</p>
            </article>
          ))}
        </div>
      </section>
      <section id="plataforma" className="platform-section section-space">
        <div>
          <span className="eyebrow">HOME SAFE COMMAND</span>
          <h2>
            La perspectiva completa.
            <br />
            <em>La atención al detalle.</em>
          </h2>
          <p>
            Un espacio de trabajo sereno para administrar, coordinar y acompañar
            a tu comunidad.
          </p>
          <Link href="/demo" className="button light">
            Recorrer la demostración
          </Link>
          <small>Entorno de muestra · Sin datos personales reales</small>
        </div>
        <div className="mini-dashboard">
          <div className="mini-top">
            <span>RESIDENCIA LOS OLIVOS</span>
            <span className="status-dot" />
          </div>
          <p>
            Una buena mañana
            <br />
            comienza con claridad.
          </p>
          <div className="mini-metrics">
            <div>
              <small>RECAUDACIÓN</small>
              <strong>
                94,2<span>%</span>
              </strong>
            </div>
            <div>
              <small>POR RESOLVER</small>
              <strong>08</strong>
            </div>
          </div>
          <div className="mini-task">
            <div>
              Mantención de ascensor<small>Programada · Torre A</small>
            </div>
            <span>09:30</span>
          </div>
          <div className="mini-task">
            <span>✓</span>
            <div>
              Informe de gestión<small>Disponible para revisión</small>
            </div>
            <span>Hoy</span>
          </div>
        </div>
      </section>
      <section id="confianza" className="trust section-space">
        <span className="eyebrow">LA CONFIANZA SE CONSTRUYE</span>
        <h2>
          Privacidad y responsabilidad.
          <br />
          Desde el primer plano.
        </h2>
        <div className="trust-grid">
          <p>
            <strong>Acceso con propósito.</strong> Cada persona debe acceder
            únicamente a la información que necesita para su función.
          </p>
          <p>
            <strong>Decisiones con trazabilidad.</strong> Una gestión
            transparente requiere saber qué cambió, cuándo y quién lo hizo.
          </p>
          <p>
            <strong>Cuidado continuo.</strong> La seguridad se verifica y se
            mantiene durante toda la vida de la plataforma.
          </p>
        </div>
      </section>
      <footer className="site-footer">
        <Link className="brand" href="/">
          HOME SAFE
        </Link>
        <p>El cuidado de tu edificio, elevado.</p>
        <span>Plataforma en desarrollo · 2026</span>
      </footer>
    </main>
  );
}
