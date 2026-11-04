import Link from 'next/link';
import { ThemeToggle } from '@/components/theme-toggle';
export const metadata = { title: 'Elige una experiencia' };
const roles = [
  {
    id: 'residente',
    number: '01',
    title: 'Mi hogar, conectado.',
    name: 'Residente',
    text: 'Autoriza visitas, revisa tus encomiendas y comunica lo que necesita atención.',
    modules: 'Mi unidad · Visitas · Encomiendas · Solicitudes',
  },
  {
    id: 'conserje',
    number: '02',
    title: 'Cada detalle, atendido.',
    name: 'Conserje',
    text: 'Coordina ingresos, registra entregas y da continuidad a cada turno.',
    modules: 'Recepción · Accesos · Encomiendas · Bitácora',
  },
  {
    id: 'administrador',
    number: '03',
    title: 'Una visión completa.',
    name: 'Administrador',
    text: 'Supervisa la comunidad y acompaña el trabajo de residentes y conserjería.',
    modules: 'Gestión · Operaciones · Finanzas · Seguimiento',
  },
];
export default function Demo() {
  return (
    <main className="profile-picker">
      <header className="picker-header">
        <Link className="brand" href="/">
          HOME SAFE
        </Link>
        <Link className="text-link" href="/">
          Volver al inicio
        </Link>
        <ThemeToggle />
      </header>
      <section className="picker-intro">
        <span className="eyebrow">TRES PERSPECTIVAS. UNA COMUNIDAD.</span>
        <h1>
          Un espacio pensado
          <br />
          para <em>cada persona.</em>
        </h1>
        <p>
          Recorre Home Safe desde cada perfil. Crea una visita como residente y
          cambia a conserjería para registrar su ingreso.
        </p>
      </section>
      <div className="profile-grid">
        {roles.map((role) => (
          <Link
            className="profile-card"
            href={`/demo/${role.id}`}
            key={role.id}
          >
            <div>
              <span className="small-label">{role.name.toUpperCase()}</span>
              <span className="profile-number">{role.number}</span>
            </div>
            <h2>{role.title}</h2>
            <p>{role.text}</p>
            <small>{role.modules}</small>
            <span className="profile-enter">
              Explorar como {role.name.toLowerCase()}
            </span>
          </Link>
        ))}
      </div>
      <p className="picker-disclaimer">
        Demostración con datos ficticios. Los cambios se comparten entre
        perfiles mientras recorres la demo y se reinician al recargar. No es un
        inicio de sesión.
      </p>
    </main>
  );
}
